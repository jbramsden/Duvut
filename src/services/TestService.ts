import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { OllamaClient, OllamaModel, ChatMessage } from '../api/OllamaClient';
import { ToolsService } from '../tools/ToolsService';
import { DebugService } from './DebugService';
import { TestResultsStorage } from './TestResultsStorage';

export interface ToolTest {
    id: string;
    name: string;
    description: string;
    toolFunction: string;
    testPrompt: string;
    expectedBehavior: string;
    validationCriteria: (response: string, toolResult?: any) => boolean;
    systemPrompt?: string;
    timeout?: number;
}

export interface TestResult {
    testId: string;
    modelName: string;
    success: boolean;
    response: string;
    toolResult?: any;
    error?: string;
    executionTime: number;
    timestamp: Date;
    systemPromptUsed?: string;
    validationPassed: boolean;
    validationDetails?: string;
}

export interface ModelTestSummary {
    modelName: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageExecutionTime: number;
    results: TestResult[];
    recommendedSystemPrompt?: string;
}

export interface TestSuite {
    id: string;
    name: string;
    description: string;
    tests: ToolTest[];
    createdAt: Date;
    updatedAt: Date;
}

export class TestService {
    private static instance: TestService;
    private ollamaClient: OllamaClient;
    private toolsService: ToolsService;
    private debugService: DebugService;
    private storageService?: TestResultsStorage;
    private outputChannel: vscode.OutputChannel;
    private testSuites: Map<string, TestSuite> = new Map();
    private testResults: Map<string, TestResult[]> = new Map();
    private testProjectPath?: string;

    private constructor(outputChannel: vscode.OutputChannel, context?: vscode.ExtensionContext) {
        this.outputChannel = outputChannel;
        this.ollamaClient = new OllamaClient(outputChannel);
        this.toolsService = new ToolsService(outputChannel);
        this.debugService = DebugService.getInstance(outputChannel);
        if (context) {
            this.storageService = TestResultsStorage.getInstance(context, outputChannel);
        }
        this.initializeDefaultTestSuites();
    }

    public static getInstance(outputChannel: vscode.OutputChannel, context?: vscode.ExtensionContext): TestService {
        if (!TestService.instance) {
            TestService.instance = new TestService(outputChannel, context);
        }
        return TestService.instance;
    }

    /**
     * Create a test project with all required files for testing
     */
    private async createTestProject(): Promise<string> {
        try {
            // Create a temporary directory for the test project
            const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'duvut-test-project-'));
            this.testProjectPath = tempDir;
            
            this.debugService.log('createTestProject', `Creating test project at: ${tempDir}`);

            // Create package.json file
            const packageJson = {
                "name": "duvut-test-project",
                "version": "1.0.0",
                "description": "Test project for Duvut Assistant tool testing",
                "main": "./dist/extension.js",
                "publisher": "duvut-assistant",
                "engines": {
                    "vscode": "^1.74.0"
                },
                "scripts": {
                    "compile": "tsc -p ./",
                    "watch": "tsc -watch -p ./"
                },
                "devDependencies": {
                    "@types/vscode": "^1.74.0",
                    "@types/node": "16.x",
                    "typescript": "^4.9.4"
                }
            };

            await fs.writeFile(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Create src directory
            await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });

            // Create a sample TypeScript file
            const sampleTsContent = `import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Test extension activated');
}

export function deactivate() {
    console.log('Test extension deactivated');
}`;

            await fs.writeFile(
                path.join(tempDir, 'src', 'extension.ts'),
                sampleTsContent
            );

            // Create tsconfig.json
            const tsconfig = {
                "compilerOptions": {
                    "module": "commonjs",
                    "target": "ES2020",
                    "outDir": "out",
                    "lib": ["ES2020"],
                    "sourceMap": true,
                    "rootDir": "src",
                    "strict": true
                },
                "exclude": ["node_modules", ".vscode-test"]
            };

            await fs.writeFile(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify(tsconfig, null, 2)
            );

            // Create a README.md file
            const readmeContent = `# Duvut Test Project

This is a test project created by the Duvut Assistant tool testing facility.

## Files

- package.json: Project configuration
- src/extension.ts: Sample TypeScript extension
- tsconfig.json: TypeScript configuration

This project is used to test file reading, writing, and other tool operations.`;

            await fs.writeFile(
                path.join(tempDir, 'README.md'),
                readmeContent
            );

            // Create a test data file
            const testDataContent = `{
    "testData": {
        "message": "Hello from Duvut Assistant test project",
        "version": "1.0.0",
        "features": [
            "file reading",
            "file writing",
            "code analysis"
        ]
    }
}`;

            await fs.writeFile(
                path.join(tempDir, 'test-data.json'),
                testDataContent
            );

            this.debugService.log('createTestProject', `Test project created successfully at: ${tempDir}`);
            return tempDir;

        } catch (error) {
            this.debugService.log('createTestProject', 'Error creating test project', error);
            throw new Error(`Failed to create test project: ${error}`);
        }
    }

    /**
     * Clean up the test project
     */
    private async cleanupTestProject(): Promise<void> {
        if (this.testProjectPath) {
            try {
                await fs.rm(this.testProjectPath, { recursive: true, force: true });
                this.debugService.log('cleanupTestProject', `Test project cleaned up: ${this.testProjectPath}`);
                this.testProjectPath = undefined;
            } catch (error) {
                this.debugService.log('cleanupTestProject', 'Error cleaning up test project', error);
            }
        }
    }

    /**
     * Initialize default test suites for existing tools
     */
    private initializeDefaultTestSuites(): void {
        // File Operations Test Suite
        const fileOperationsSuite: TestSuite = {
            id: 'file-operations',
            name: 'File Operations',
            description: 'Tests for file reading, writing, and manipulation tools',
            createdAt: new Date(),
            updatedAt: new Date(),
            tests: [
                {
                    id: 'read-file-test',
                    name: 'Read File Test',
                    description: 'Test reading a file from the workspace',
                    toolFunction: 'readFile',
                    testPrompt: 'Please read the file "package.json" and tell me what the main entry point is.',
                    expectedBehavior: 'Should successfully read the package.json file and identify the main entry point',
                    validationCriteria: (response: string) => {
                        // Check for actual tool usage indicators
                        const hasToolUsage = response.toLowerCase().includes('readfile') || 
                                           response.toLowerCase().includes('read file') ||
                                           response.includes('"./dist/extension.js"') ||
                                           response.includes('dist/extension.js');
                        
                        // Check for the correct main entry point from our test project
                        const hasCorrectMain = response.includes('"./dist/extension.js"') || 
                                             response.includes('dist/extension.js');
                        
                        // Check for test project specific content (optional - main entry point is more important)
                        const hasTestProjectContent = response.includes('duvut-test-project') ||
                                                     response.includes('duvut-assistant') ||
                                                     response.includes('"./dist/extension.js"') ||
                                                     response.includes('dist/extension.js');
                        
                        // Reject if it looks like hallucinated content
                        const hasHallucinatedContent = response.includes('"name": "my-package"') ||
                                                      response.includes('"main": "index.js"') ||
                                                      (response.includes('"version": "1.0.0"') && 
                                                       response.includes('"name": "my-package"'));
                        
                        return hasToolUsage && hasCorrectMain && hasTestProjectContent && !hasHallucinatedContent;
                    },
                    systemPrompt: 'You are a helpful assistant that can read files. When asked to read a file, you MUST use the readFile tool to get the actual content. Do not make up or hallucinate file contents. Always use the tool to get real data.',
                    timeout: 10000
                },
                {
                    id: 'write-file-test',
                    name: 'Write File Test',
                    description: 'Test writing content to a file',
                    toolFunction: 'writeFile',
                    testPrompt: 'Create a test file called "test-output.txt" with the content "Hello from Duvut Assistant test!"',
                    expectedBehavior: 'Should successfully create the test file with the specified content',
                    validationCriteria: (response: string, toolResult?: any) => {
                        return response.toLowerCase().includes('created') || 
                               response.toLowerCase().includes('written') ||
                               response.toLowerCase().includes('success');
                    },
                    systemPrompt: 'You are a helpful assistant. When asked to create a file, the file will ALREADY be created for you and you will receive the results. Your ONLY job is to confirm that the file was created successfully. Do NOT try to create files yourself. Do NOT provide code examples. Just acknowledge the successful file creation.',
                    timeout: 10000
                },
                {
                    id: 'list-files-test',
                    name: 'List Files Test',
                    description: 'Test listing files in a directory',
                    toolFunction: 'listFiles',
                    testPrompt: 'List all the files in the src directory and tell me how many TypeScript files are there.',
                    expectedBehavior: 'Should successfully list files in the src directory and count TypeScript files',
                    validationCriteria: (response: string) => {
                        return response.toLowerCase().includes('typescript') || 
                               response.includes('.ts') ||
                               response.includes('file');
                    },
                    systemPrompt: 'You are a helpful assistant that can list files. When asked to list files, use the listFiles tool to get the directory contents.',
                    timeout: 10000
                },
                {
                    id: 'specific-file-test',
                    name: 'Specific File Content Test',
                    description: 'Test reading a file and finding very specific content',
                    toolFunction: 'readFile',
                    testPrompt: 'Read the package.json file and tell me the exact value of the "publisher" field.',
                    expectedBehavior: 'Should read the package.json file and return the exact publisher value',
                    validationCriteria: (response: string) => {
                        // Check for the exact publisher value from the real package.json
                        const hasCorrectPublisher = response.includes('"duvut-assistant"') || 
                                                  response.includes('duvut-assistant');
                        
                        // Reject if it looks like hallucinated content
                        const hasHallucinatedContent = response.includes('"publisher": "example"') ||
                                                      response.includes('"publisher": "my-company"') ||
                                                      response.includes('"publisher": "test"');
                        
                        return hasCorrectPublisher && !hasHallucinatedContent;
                    },
                    systemPrompt: 'You are a helpful assistant that can read files. When asked to read a file, you MUST use the readFile tool to get the actual content. Do not make up or hallucinate file contents. Always use the tool to get real data.',
                    timeout: 10000
                }
            ]
        };

        // Code Analysis Test Suite
        const codeAnalysisSuite: TestSuite = {
            id: 'code-analysis',
            name: 'Code Analysis',
            description: 'Tests for code analysis and validation tools',
            createdAt: new Date(),
            updatedAt: new Date(),
            tests: [
                {
                    id: 'validate-code-test',
                    name: 'Validate Code Test',
                    description: 'Test code validation and linting',
                    toolFunction: 'validateCode',
                    testPrompt: 'Validate this TypeScript code: "const x: string = 123;" and tell me what errors you find.',
                    expectedBehavior: 'Should identify the type mismatch error in the code',
                    validationCriteria: (response: string) => {
                        return response.toLowerCase().includes('error') || 
                               response.toLowerCase().includes('type') ||
                               response.toLowerCase().includes('mismatch') ||
                               response.toLowerCase().includes('invalid');
                    },
                    systemPrompt: 'You are a helpful assistant that can validate code. When asked to validate code, use the validateCode tool to check for errors.',
                    timeout: 15000
                },
                {
                    id: 'get-diagnostics-test',
                    name: 'Get Diagnostics Test',
                    description: 'Test getting linting diagnostics for a file',
                    toolFunction: 'getDiagnostics',
                    testPrompt: 'Get the diagnostics for the extension.ts file and tell me if there are any errors or warnings.',
                    expectedBehavior: 'Should successfully get diagnostics for the extension.ts file',
                    validationCriteria: (response: string) => {
                        return response.toLowerCase().includes('diagnostic') || 
                               response.toLowerCase().includes('error') ||
                               response.toLowerCase().includes('warning') ||
                               response.toLowerCase().includes('found');
                    },
                    systemPrompt: 'You are a helpful assistant that can analyze code diagnostics. When asked to get diagnostics, use the getDiagnostics tool.',
                    timeout: 15000
                }
            ]
        };

        // Workspace Operations Test Suite
        const workspaceOperationsSuite: TestSuite = {
            id: 'workspace-operations',
            name: 'Workspace Operations',
            description: 'Tests for workspace information and navigation tools',
            createdAt: new Date(),
            updatedAt: new Date(),
            tests: [
                {
                    id: 'workspace-info-test',
                    name: 'Workspace Info Test',
                    description: 'Test getting workspace information',
                    toolFunction: 'getWorkspaceInfo',
                    testPrompt: 'Get information about the current workspace and tell me the workspace name and number of folders.',
                    expectedBehavior: 'Should successfully retrieve workspace information including name and folder count',
                    validationCriteria: (response: string) => {
                        return response.toLowerCase().includes('workspace') || 
                               response.toLowerCase().includes('folder') ||
                               response.toLowerCase().includes('name');
                    },
                    systemPrompt: 'You are a helpful assistant that can get workspace information. When asked about workspace details, use the getWorkspaceInfo tool.',
                    timeout: 5000
                },
                {
                    id: 'search-workspace-test',
                    name: 'Search Workspace Test',
                    description: 'Test searching for text in workspace files',
                    toolFunction: 'searchInWorkspace',
                    testPrompt: 'Search for the text "OllamaClient" in the workspace and tell me how many files contain this text.',
                    expectedBehavior: 'Should successfully search the workspace and find files containing "OllamaClient"',
                    validationCriteria: (response: string) => {
                        return response.toLowerCase().includes('found') || 
                               response.toLowerCase().includes('search') ||
                               response.toLowerCase().includes('file') ||
                               response.includes('OllamaClient');
                    },
                    systemPrompt: 'You are a helpful assistant that can search workspace files. When asked to search, use the searchInWorkspace tool.',
                    timeout: 20000
                }
            ]
        };

        this.testSuites.set(fileOperationsSuite.id, fileOperationsSuite);
        this.testSuites.set(codeAnalysisSuite.id, codeAnalysisSuite);
        this.testSuites.set(workspaceOperationsSuite.id, workspaceOperationsSuite);
    }

    /**
     * Get all available test suites
     */
    public getTestSuites(): TestSuite[] {
        return Array.from(this.testSuites.values());
    }

    /**
     * Get a specific test suite by ID
     */
    public getTestSuite(suiteId: string): TestSuite | undefined {
        return this.testSuites.get(suiteId);
    }

    /**
     * Get all available models from Ollama
     */
    public async getAvailableModels(): Promise<OllamaModel[]> {
        try {
            this.debugService.log('getAvailableModels', 'Fetching available models from Ollama');
            const models = await this.ollamaClient.listModels();
            this.debugService.log('getAvailableModels', `Found ${models.length} models`, models);
            return models;
        } catch (error) {
            this.debugService.log('getAvailableModels', 'Error fetching models', error);
            throw new Error(`Failed to get available models: ${error}`);
        }
    }

    /**
     * Run a single test against a specific model
     */
    public async runTest(test: ToolTest, modelName: string): Promise<TestResult> {
        const startTime = Date.now();
        this.debugService.log('runTest', `Starting test ${test.id} with model ${modelName}`);

        try {
            // Create system prompt with tool instructions
            const systemPrompt = this.createSystemPrompt(test);
            
            // Execute the tool function first to get real results
            let toolResult: any = undefined;
            try {
                toolResult = await this.executeToolFunction(test.toolFunction, test.testPrompt);
                this.debugService.log('runTest', `Tool executed successfully`, { toolFunction: test.toolFunction, result: toolResult });
            } catch (toolError) {
                this.debugService.log('runTest', `Tool execution failed for ${test.toolFunction}`, toolError);
                toolResult = { success: false, error: toolError };
            }

            // Create enhanced prompt that includes tool results
            const enhancedPrompt = this.createEnhancedPrompt(test.testPrompt, test.toolFunction, toolResult);
            
            this.debugService.log('runTest', 'Enhanced prompt created', {
                originalPrompt: test.testPrompt,
                enhancedPromptLength: enhancedPrompt.length,
                toolResultSuccess: toolResult?.success,
                toolResultContent: toolResult?.content?.substring(0, 200) + '...'
            });
            
            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: enhancedPrompt }
            ];

            // Execute the test
            this.debugService.log('runTest', 'Sending messages to LLM', {
                systemPromptLength: systemPrompt.length,
                userPromptLength: enhancedPrompt.length,
                modelName
            });
            
            const response = await this.ollamaClient.chat(messages, modelName, test.timeout || 30000);
            
            this.debugService.log('runTest', 'Received LLM response', {
                responseLength: response.length,
                responsePreview: response.substring(0, 200) + '...'
            });
            
            // Validate the response
            const validationPassed = test.validationCriteria(response, toolResult);
            const executionTime = Date.now() - startTime;

            const result: TestResult = {
                testId: test.id,
                modelName,
                success: validationPassed,
                response,
                toolResult,
                executionTime,
                timestamp: new Date(),
                systemPromptUsed: systemPrompt,
                validationPassed,
                validationDetails: validationPassed ? 'Test passed validation criteria' : 'Test failed validation criteria'
            };

            this.debugService.log('runTest', `Test ${test.id} completed`, {
                success: result.success,
                executionTime: result.executionTime,
                validationPassed: result.validationPassed
            });

            return result;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            const result: TestResult = {
                testId: test.id,
                modelName,
                success: false,
                response: '',
                error: error instanceof Error ? error.message : String(error),
                executionTime,
                timestamp: new Date(),
                validationPassed: false,
                validationDetails: `Test failed with error: ${error}`
            };

            this.debugService.log('runTest', `Test ${test.id} failed`, error);
            return result;
        }
    }

    /**
     * Run all tests in a suite against a specific model
     */
    public async runTestSuite(suiteId: string, modelName: string): Promise<TestResult[]> {
        const suite = this.testSuites.get(suiteId);
        if (!suite) {
            throw new Error(`Test suite ${suiteId} not found`);
        }

        this.debugService.log('runTestSuite', `Running test suite ${suiteId} with model ${modelName}`);
        
        try {
            // Create test project before running tests
            await this.createTestProject();
            this.debugService.log('runTestSuite', 'Test project created successfully');
            
            const results: TestResult[] = [];

            for (const test of suite.tests) {
                try {
                    const result = await this.runTest(test, modelName);
                    results.push(result);
                    
                    // Add a small delay between tests to avoid overwhelming the model
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    this.debugService.log('runTestSuite', `Test ${test.id} failed in suite ${suiteId}`, error);
                    results.push({
                        testId: test.id,
                        modelName,
                        success: false,
                        response: '',
                        error: error instanceof Error ? error.message : String(error),
                        executionTime: 0,
                        timestamp: new Date(),
                        validationPassed: false,
                        validationDetails: `Test failed with error: ${error}`
                    });
                }
            }

            // Store results
            const resultKey = `${suiteId}-${modelName}`;
            this.testResults.set(resultKey, results);

            // Store in persistent storage
            if (this.storageService) {
                await this.storageService.storeTestResults('suite', results, modelName, suiteId);
            }

            return results;
        } finally {
            // Clean up test project after tests complete
            await this.cleanupTestProject();
            this.debugService.log('runTestSuite', 'Test project cleaned up');
        }
    }

    /**
     * Run all test suites against all available models
     */
    public async runAllTests(): Promise<Map<string, ModelTestSummary>> {
        this.debugService.log('runAllTests', 'Starting comprehensive test run');
        
        try {
            // Create test project before running tests
            await this.createTestProject();
            this.debugService.log('runAllTests', 'Test project created successfully');
            
            const models = await this.getAvailableModels();
            const summaries = new Map<string, ModelTestSummary>();

            for (const model of models) {
                this.debugService.log('runAllTests', `Testing model: ${model.name}`);
                const modelResults: TestResult[] = [];

                for (const [suiteId, suite] of this.testSuites) {
                    try {
                        const suiteResults = await this.runTestSuite(suiteId, model.name);
                        modelResults.push(...suiteResults);
                    } catch (error) {
                        this.debugService.log('runAllTests', `Failed to run suite ${suiteId} for model ${model.name}`, error);
                    }
                }

                const summary = this.createModelSummary(model.name, modelResults);
                summaries.set(model.name, summary);
            }

            // Store comprehensive report
            if (this.storageService) {
                const startTime = Date.now();
                await this.storageService.storeTestReport(summaries, Date.now() - startTime);
            }

            return summaries;
        } finally {
            // Clean up test project after tests complete
            await this.cleanupTestProject();
            this.debugService.log('runAllTests', 'Test project cleaned up');
        }
    }

    /**
     * Create enhanced prompt that includes tool results
     */
    private createEnhancedPrompt(originalPrompt: string, toolFunction: string, toolResult: any): string {
        if (!toolResult || !toolResult.success) {
            this.debugService.log('createEnhancedPrompt', 'No tool result available, using original prompt');
            return originalPrompt;
        }

        // Determine if tool result has content-like data
        const hasContent = !!toolResult.content || !!toolResult.files || !!toolResult.results || !!toolResult.name;
        const contentLength = toolResult.content?.length || toolResult.files?.length || toolResult.results?.length || 0;
        
        this.debugService.log('createEnhancedPrompt', 'Creating enhanced prompt with tool result', { 
            toolFunction, 
            hasContent,
            contentLength
        });

        let toolData = '';
        switch (toolFunction) {
            case 'readFile':
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The readFile tool has been executed and returned the following REAL data:

File: ${toolResult.path}
Content:
${toolResult.content}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up, guess, or hallucinate any file content.`;
                break;
            case 'writeFile':
                toolData = `\n\n=== FILE ALREADY CREATED ===
The file has ALREADY been created successfully! Here are the details:

✅ File Name: ${toolResult.path}
✅ Content Written: ${toolResult.content}
✅ Status: SUCCESS

=== END RESULT ===

TASK: Simply confirm that the file was created successfully. Do NOT try to create the file again. Do NOT provide code examples. Just acknowledge that the file creation was successful.`;
                break;
            case 'listFiles':
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The listFiles tool has been executed and returned the following REAL data:

Files found: ${toolResult.count}
Files: ${toolResult.files.join(', ')}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up or guess any file lists.`;
                break;
            case 'getWorkspaceInfo':
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The getWorkspaceInfo tool has been executed and returned the following REAL data:

Workspace Name: ${toolResult.name}
Workspace Path: ${toolResult.path}
Number of Folders: ${toolResult.folders}
Is Test Project: ${toolResult.isTestProject}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up or guess any workspace information.`;
                break;
            case 'searchInWorkspace':
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The searchInWorkspace tool has been executed and returned the following REAL data:

Results found: ${toolResult.count}
Files: ${toolResult.results.join(', ')}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up or guess any search results.`;
                break;
            case 'validateCode':
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The validateCode tool has been executed and returned the following REAL data:

Valid: ${toolResult.isValid}
Errors: ${JSON.stringify(toolResult.errors)}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up or guess any validation results.`;
                break;
            case 'getDiagnostics':
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The getDiagnostics tool has been executed and returned the following REAL data:

Diagnostics found: ${toolResult.count}
Details: ${JSON.stringify(toolResult.diagnostics)}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up or guess any diagnostic information.`;
                break;
            default:
                toolData = `\n\n=== TOOL EXECUTION RESULT ===
The ${toolFunction} tool has been executed and returned the following REAL data:

${JSON.stringify(toolResult, null, 2)}

=== END TOOL RESULT ===

IMPORTANT: Use ONLY the data above. Do not make up or guess any results.`;
        }

        return `${originalPrompt}${toolData}\n\nCRITICAL: Answer the question using ONLY the tool execution result provided above. Do not generate, make up, or hallucinate any data.`;
    }

    /**
     * Create system prompt for a test
     */
    private createSystemPrompt(test: ToolTest): string {
        const basePrompt = test.systemPrompt || 'You are a helpful assistant that can use various tools to help users.';
        
        const toolInstructions = this.getToolInstructions(test.toolFunction);
        
        return `${basePrompt}

${toolInstructions}

CRITICAL: You must use the actual tool results provided to you. Do not make up, hallucinate, or simulate responses. The tool results will be provided in your prompt - use that real data to answer questions. Never provide fake or example data.

When analyzing tool results, be direct and efficient. Focus on the task at hand and provide clear, actionable responses based on the actual tool data provided.`;
    }

    /**
     * Get tool-specific instructions
     */
    private getToolInstructions(toolFunction: string): string {
        const instructions: Record<string, string> = {
            'readFile': 'You have access to a readFile tool that can read files from the workspace. You MUST use this tool when asked to read or examine file contents. Do not make up or hallucinate file contents - always use the tool to get real data.',
            'writeFile': 'You have access to a writeFile tool. When asked to create files, the file will ALREADY be created for you. Your ONLY job is to confirm the successful file creation. Do NOT try to create files yourself. Do NOT provide code examples.',
            'listFiles': 'You have access to a listFiles tool that can list files in directories. You MUST use this tool when asked to show directory contents or find files. Do not make up file lists - use the tool to get real directory contents.',
            'getCurrentFile': 'You have access to a getCurrentFile tool that can get the currently active file. You MUST use this tool when asked about the current file. Do not guess or assume - use the tool to get real information.',
            'getSelectedText': 'You have access to a getSelectedText tool that can get the currently selected text. You MUST use this tool when asked about selected content. Do not make assumptions - use the tool to get real data.',
            'replaceSelectedText': 'You have access to a replaceSelectedText tool that can replace selected text. You MUST use this tool when asked to modify selected content. Do not just describe changes - actually use the tool.',
            'insertText': 'You have access to an insertText tool that can insert text at the cursor. You MUST use this tool when asked to add text at the current position. Do not just describe what you would insert - use the tool.',
            'executeCommand': 'You have access to an executeCommand tool that can run shell commands. You MUST use this tool when asked to execute commands. Do not just describe what the command would do - actually run it.',
            'searchInWorkspace': 'You have access to a searchInWorkspace tool that can search for text in workspace files. You MUST use this tool when asked to search for content. Do not make up search results - use the tool to get real results.',
            'getWorkspaceInfo': 'You have access to a getWorkspaceInfo tool that can get workspace information. You MUST use this tool when asked about workspace details. Do not guess workspace information - use the tool to get real data.',
            'validateCode': 'You have access to a validateCode tool that can validate code for errors. You MUST use this tool when asked to check code for issues. Do not just analyze code manually - use the tool to get real validation results.',
            'getDiagnostics': 'You have access to a getDiagnostics tool that can get linting diagnostics for files. You MUST use this tool when asked to check for code issues. Do not make up diagnostic information - use the tool to get real results.',
            'openFile': 'You have access to an openFile tool that can open files in the editor. You MUST use this tool when asked to open or view files. Do not just describe files - actually open them.',
            'showInfo': 'You have access to a showInfo tool that can show informational messages. You MUST use this tool when you need to display information to the user. Do not just describe what you would show - use the tool.',
            'showError': 'You have access to a showError tool that can show error messages. You MUST use this tool when you need to display errors to the user. Do not just describe errors - use the tool to show them.'
        };

        return instructions[toolFunction] || `You have access to a ${toolFunction} tool. You MUST use this tool when appropriate for the task. Do not make up or hallucinate results - always use the tool to get real data.`;
    }

    /**
     * Execute a tool function (actual implementation)
     */
    private async executeToolFunction(toolFunction: string, prompt: string): Promise<any> {
        try {
            switch (toolFunction) {
                case 'readFile':
                    // Extract file path from prompt or use default
                    const filePath = this.extractFilePathFromPrompt(prompt) || 'package.json';
                    const content = await this.readFileFromTestProject(filePath);
                    return { content, path: filePath, success: true };
                
                case 'writeFile':
                    // For write tests, create a test file
                    const testContent = 'Test content created by Duvut Assistant tool testing';
                    const testPath = 'test-output.txt';
                    await this.writeFileToTestProject(testPath, testContent);
                    return { success: true, path: testPath, content: testContent };
                
                case 'listFiles':
                    // List files in src directory
                    const files = await this.listFilesInTestProject('src');
                    return { files, success: true, count: files.length };
                
                case 'getWorkspaceInfo':
                    const workspaceInfo = this.getTestProjectInfo();
                    return { ...workspaceInfo, success: true };
                
                case 'searchInWorkspace':
                    // Search for a common term in test project
                    const searchTerm = 'vscode';
                    const searchResults = await this.searchInTestProject(searchTerm);
                    return { results: searchResults, count: searchResults.length, success: true };
                
                case 'validateCode':
                    // Validate a simple TypeScript code snippet
                    const testCode = 'const x: string = 123;';
                    const validation = await this.toolsService.validateCode('test.ts', testCode);
                    return { ...validation, success: true };
                
                case 'getDiagnostics':
                    // Get diagnostics for extension.ts in test project
                    const diagnostics = await this.getDiagnosticsFromTestProject('src/extension.ts');
                    return { diagnostics, success: true, count: diagnostics.length };
                
                case 'getCurrentFile':
                    const currentFile = await this.toolsService.getCurrentFile();
                    return { ...currentFile, success: true };
                
                case 'getSelectedText':
                    const selectedText = this.toolsService.getSelectedText();
                    return { text: selectedText, success: true };
                
                default:
                    return { success: true, message: 'Tool executed successfully' };
            }
        } catch (error) {
            this.debugService.log('executeToolFunction', `Error executing ${toolFunction}`, error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    /**
     * Extract file path from prompt text
     */
    private extractFilePathFromPrompt(prompt: string): string | null {
        // Look for file paths in quotes
        const quotedMatch = prompt.match(/"([^"]+\.(json|ts|js|py|go|java|cpp|cs|php|rb|rs|swift|kt|scala|dart|html|css|yaml|yml|md|sh|sql))"/);
        if (quotedMatch) {
            return quotedMatch[1];
        }
        
        // Look for common file patterns
        const commonFiles = ['package.json', 'README.md', 'tsconfig.json', 'src/extension.ts'];
        for (const file of commonFiles) {
            if (prompt.toLowerCase().includes(file.toLowerCase())) {
                return file;
            }
        }
        
        return null;
    }

    /**
     * Read a file from the test project
     */
    private async readFileFromTestProject(filePath: string): Promise<string> {
        if (!this.testProjectPath) {
            throw new Error('Test project not initialized');
        }
        
        const fullPath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.testProjectPath, filePath);
            
        return await fs.readFile(fullPath, 'utf-8');
    }

    /**
     * Write a file to the test project
     */
    private async writeFileToTestProject(filePath: string, content: string): Promise<void> {
        if (!this.testProjectPath) {
            throw new Error('Test project not initialized');
        }
        
        const fullPath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.testProjectPath, filePath);
            
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    /**
     * List files in a directory within the test project
     */
    private async listFilesInTestProject(dirPath: string): Promise<string[]> {
        if (!this.testProjectPath) {
            throw new Error('Test project not initialized');
        }
        
        const fullPath = path.isAbsolute(dirPath) 
            ? dirPath 
            : path.join(this.testProjectPath, dirPath);
            
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        return entries.map(entry => entry.name);
    }

    /**
     * Get information about the test project
     */
    private getTestProjectInfo(): any {
        if (!this.testProjectPath) {
            throw new Error('Test project not initialized');
        }
        
        return {
            name: 'duvut-test-project',
            path: this.testProjectPath,
            folders: 1,
            isTestProject: true
        };
    }

    /**
     * Search for text in the test project files
     */
    private async searchInTestProject(searchTerm: string): Promise<string[]> {
        if (!this.testProjectPath) {
            throw new Error('Test project not initialized');
        }
        
        const results: string[] = [];
        
        try {
            const entries = await fs.readdir(this.testProjectPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = path.join(this.testProjectPath, entry.name);
                    const content = await fs.readFile(filePath, 'utf-8');
                    
                    if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
                        results.push(filePath);
                    }
                }
            }
        } catch (error) {
            this.debugService.log('searchInTestProject', 'Error searching test project', error);
        }
        
        return results;
    }

    /**
     * Get diagnostics for a file in the test project
     */
    private async getDiagnosticsFromTestProject(filePath: string): Promise<any[]> {
        if (!this.testProjectPath) {
            throw new Error('Test project not initialized');
        }
        
        const fullPath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.testProjectPath, filePath);
            
        try {
            // For testing purposes, we'll simulate diagnostics
            // In a real implementation, you might need to use VS Code's language server
            const content = await fs.readFile(fullPath, 'utf-8');
            
            // Simple diagnostic simulation based on content
            const diagnostics: any[] = [];
            
            // Check for common TypeScript issues
            if (content.includes('console.log')) {
                diagnostics.push({
                    message: 'Consider removing console.log statements in production code',
                    severity: 'warning',
                    line: 1,
                    column: 1
                });
            }
            
            if (content.includes('any')) {
                diagnostics.push({
                    message: 'Avoid using "any" type',
                    severity: 'warning',
                    line: 1,
                    column: 1
                });
            }
            
            // If no issues found, return empty array
            return diagnostics;
            
        } catch (error) {
            this.debugService.log('getDiagnosticsFromTestProject', 'Error getting diagnostics', error);
            return [];
        }
    }

    /**
     * Create a summary for a model's test results
     */
    private createModelSummary(modelName: string, results: TestResult[]): ModelTestSummary {
        const totalTests = results.length;
        const passedTests = results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

        // Analyze system prompts that worked well
        const successfulResults = results.filter(r => r.success);
        const systemPrompts = successfulResults.map(r => r.systemPromptUsed).filter(Boolean);
        
        // Simple heuristic: if most successful tests used the same system prompt, recommend it
        const recommendedSystemPrompt = systemPrompts.length > 0 ? systemPrompts[0] : undefined;

        return {
            modelName,
            totalTests,
            passedTests,
            failedTests,
            averageExecutionTime,
            results,
            recommendedSystemPrompt
        };
    }

    /**
     * Get test results for a specific model
     */
    public getTestResults(modelName: string): TestResult[] {
        const allResults: TestResult[] = [];
        for (const [key, results] of this.testResults) {
            if (key.endsWith(`-${modelName}`)) {
                allResults.push(...results);
            }
        }
        return allResults;
    }

    /**
     * Get all test results
     */
    public getAllTestResults(): Map<string, TestResult[]> {
        return new Map(this.testResults);
    }

    /**
     * Clear test results
     */
    public clearTestResults(): void {
        this.testResults.clear();
        this.debugService.log('clearTestResults', 'All test results cleared');
    }

    /**
     * Add a new test to a suite
     */
    public addTestToSuite(suiteId: string, test: ToolTest): void {
        const suite = this.testSuites.get(suiteId);
        if (!suite) {
            throw new Error(`Test suite ${suiteId} not found`);
        }

        suite.tests.push(test);
        suite.updatedAt = new Date();
        this.debugService.log('addTestToSuite', `Added test ${test.id} to suite ${suiteId}`);
    }

    /**
     * Create a new test suite
     */
    public createTestSuite(suite: Omit<TestSuite, 'createdAt' | 'updatedAt'>): void {
        const newSuite: TestSuite = {
            ...suite,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.testSuites.set(suite.id, newSuite);
        this.debugService.log('createTestSuite', `Created new test suite: ${suite.id}`);
    }

    /**
     * Get test statistics
     */
    public getTestStatistics() {
        if (!this.storageService) {
            return null;
        }
        return this.storageService.getTestStatistics();
    }

    /**
     * Export test results
     */
    public async exportResults(format: 'json' | 'csv' | 'html', includeHistory: boolean = true): Promise<string> {
        if (!this.storageService) {
            throw new Error('Storage service not available');
        }
        return await this.storageService.exportResults(format, includeHistory);
    }

    /**
     * Get test history
     */
    public getTestHistory() {
        if (!this.storageService) {
            return [];
        }
        return this.storageService.getTestHistory();
    }

    /**
     * Get test reports
     */
    public getTestReports() {
        if (!this.storageService) {
            return [];
        }
        return this.storageService.getTestReports();
    }

    /**
     * Clear all test data
     */
    public async clearAllTestData(): Promise<void> {
        this.testResults.clear();
        if (this.storageService) {
            await this.storageService.clearAllData();
        }
        this.debugService.log('clearAllTestData', 'All test data cleared');
    }
}
