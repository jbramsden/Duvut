import * as vscode from 'vscode';
import { OllamaClient } from '../api/OllamaClient';
import { DebugService } from './DebugService';

export interface CompletionSuggestion {
    text: string;
    range: vscode.Range;
    kind: vscode.CompletionItemKind;
    detail?: string;
    documentation?: string;
}

export class CodeCompletionService {
    private ollamaClient: OllamaClient;
    private outputChannel: vscode.OutputChannel;
    private debugService: DebugService;
    private isProcessing: boolean = false;
    private lastRequestTime: number = 0;

    private get debounceDelay(): number {
        return vscode.workspace.getConfiguration('duvut-assistant.codeCompletion').get('debounceDelay', 500);
    }

    private get isEnabled(): boolean {
        return vscode.workspace.getConfiguration('duvut-assistant.codeCompletion').get('enabled', true);
    }

    private get maxSuggestionLength(): number {
        return vscode.workspace.getConfiguration('duvut-assistant.codeCompletion').get('maxSuggestionLength', 200);
    }

    private get triggerCharacters(): string[] {
        return vscode.workspace.getConfiguration('duvut-assistant.codeCompletion').get('triggerCharacters', ['.', '(', ' ', '\n', ';', '{', '=']);
    }

    private get selectedModel(): string {
        // First check if there's a specific model for code completion
        const codeCompletionModel = vscode.workspace.getConfiguration('duvut-assistant.codeCompletion').get('modelId', '') as string;
        
        // If code completion model is configured, use it; otherwise use the main model
        if (codeCompletionModel && codeCompletionModel.trim()) {
            return codeCompletionModel;
        }
        
        return vscode.workspace.getConfiguration('duvut-assistant').get('modelId', 'llama3.2:latest');
    }

    constructor(outputChannel: vscode.OutputChannel) {
        this.ollamaClient = new OllamaClient(outputChannel);
        this.outputChannel = outputChannel;
        this.debugService = DebugService.getInstance(outputChannel);
    }

    /**
     * Get intelligent code completion suggestions
     */
    async getSuggestions(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        try {
            this.debugService.log('getSuggestions', 'Starting code completion request', {
                fileName: document.fileName,
                language: document.languageId,
                position: { line: position.line, character: position.character },
                triggerKind: context.triggerKind
            });

            // Check if code completion is enabled
            if (!this.isEnabled) {
                this.debugService.log('getSuggestions', 'Code completion disabled');
                return [];
            }

            // Debounce requests to avoid overwhelming the LLM
            const now = Date.now();
            if (this.isProcessing || (now - this.lastRequestTime) < this.debounceDelay) {
                this.debugService.log('getSuggestions', 'Request debounced or already processing', {
                    isProcessing: this.isProcessing,
                    timeSinceLastRequest: now - this.lastRequestTime,
                    debounceDelay: this.debounceDelay
                });
                return [];
            }

            this.isProcessing = true;
            this.lastRequestTime = now;

            // Get context around the current position
            const contextRange = this.getContextRange(document, position);
            const contextText = document.getText(contextRange);
            
            // Get workspace context
            const workspaceContext = await this.getWorkspaceContext(document);
            
            // Get the current expression being typed
            const currentExpression = this.getCurrentExpression(document, position);
            this.debugService.log('getSuggestions', 'Context analysis complete', {
                contextTextLength: contextText.length,
                workspaceContextLength: workspaceContext.length,
                currentExpression: currentExpression
            });
            
            // Create prompt for code completion
            const prompt = this.createCompletionPrompt(contextText, position, document.languageId, workspaceContext, currentExpression);
            this.debugService.log('getSuggestions', 'Created completion prompt', {
                promptLength: prompt.length,
                model: this.selectedModel
            });
            
            // Get suggestion from Ollama
            const suggestion = await this.getSuggestionFromOllama(prompt, document.languageId, currentExpression);
            
            if (suggestion && suggestion.trim()) {
                this.debugService.log('getSuggestions', 'Received suggestion from Ollama', {
                    suggestion: suggestion.substring(0, 100) + (suggestion.length > 100 ? '...' : ''),
                    suggestionLength: suggestion.length
                });
                const completionItem = this.createCompletionItem(suggestion, position, currentExpression);
                this.isProcessing = false;
                return [completionItem];
            }

            this.debugService.log('getSuggestions', 'No suggestion received from Ollama');
            this.isProcessing = false;
            return [];

        } catch (error) {
            this.debugService.log('getSuggestions', 'Error occurred during code completion', error);
            this.outputChannel.appendLine(`[CodeCompletion] Error: ${error}`);
            this.isProcessing = false;
            return [];
        }
    }

    /**
     * Get context range around the current position
     */
    private getContextRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
        const lineCount = document.lineCount;
        const startLine = Math.max(0, position.line - 10);
        const endLine = Math.min(lineCount - 1, position.line + 5);
        
        return new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        );
    }

    /**
     * Get the current expression being typed at the cursor position
     */
    private getCurrentExpression(document: vscode.TextDocument, position: vscode.Position): string {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const char = position.character;
        
        // Get everything from the start of the line up to the cursor position
        const lineUpToCursor = lineText.substring(0, char);
        
        // Find the last meaningful token boundary
        // Look for common patterns that indicate the start of a new expression
        const patterns = [
            /\s+$/,           // Whitespace at end
            /[;{}]\s*$/,      // Semicolon, brace at end
            /^\s*$/,          // Empty or whitespace only
            /^$/,             // Completely empty
        ];
        
        // If we're at the start of a new expression, return empty
        for (const pattern of patterns) {
            if (pattern.test(lineUpToCursor)) {
                return '';
            }
        }
        
        // Find the start of the current expression by looking backwards
        let start = char;
        let parenCount = 0;
        let bracketCount = 0;
        let braceCount = 0;
        
        while (start > 0) {
            const prevChar = lineText[start - 1];
            
            // Track bracket/brace/paren counts
            if (prevChar === ')') parenCount++;
            else if (prevChar === '(') parenCount--;
            else if (prevChar === ']') bracketCount++;
            else if (prevChar === '[') bracketCount--;
            else if (prevChar === '}') braceCount++;
            else if (prevChar === '{') braceCount--;
            
            // Stop at whitespace or line start if we're not in brackets
            if (parenCount === 0 && bracketCount === 0 && braceCount === 0) {
                if (/\s/.test(prevChar) || start === 1) {
                    break;
                }
            }
            
            start--;
        }
        
        return lineText.substring(start, char);
    }

    /**
     * Get workspace context for better suggestions
     */
    private async getWorkspaceContext(document: vscode.TextDocument): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return '';

            const workspaceInfo = {
                name: vscode.workspace.name || 'Unnamed',
                folders: workspaceFolders.map(f => f.uri.fsPath)
            };

            // Get current file info
            const currentFile = {
                path: document.fileName,
                language: document.languageId,
                content: document.getText()
            };

            return `Workspace: ${workspaceInfo.name}
Current file: ${currentFile.path} (${currentFile.language})
File content: ${currentFile.content.substring(0, 1000)}...`;
        } catch (error) {
            return '';
        }
    }

    /**
     * Create completion prompt for the LLM
     */
    private createCompletionPrompt(
        contextText: string, 
        position: vscode.Position, 
        language: string, 
        workspaceContext: string,
        currentExpression: string
    ): string {
        return `Complete this ${language} code with just the next line:

\`\`\`${language}
${contextText}
\`\`\`

Next line after "${currentExpression}":`;
    }

    /**
     * Get suggestion from Ollama
     */
    private async getSuggestionFromOllama(prompt: string, language: string, currentExpression: string): Promise<string> {
        try {
            const messages = [
                {
                    role: 'system' as const,
                    content: `You are a code completion tool. Return ONLY raw code. NO text, NO explanations, NO descriptions, NO comments about what the code does.`
                },
                {
                    role: 'user' as const,
                    content: prompt
                }
            ];

            const response = await this.ollamaClient.chat(messages, this.selectedModel, 10000); // 10 second timeout for code completion
            
            this.outputChannel.appendLine(`[CodeCompletion] Raw AI response: "${response}"`);
            
            // Clean up the response
            let suggestion = response.trim();
            
            // Remove markdown code blocks if present
            suggestion = suggestion.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '');
            
            // Remove explanatory text and descriptions
            suggestion = suggestion.replace(/^(Based on|It seems like|Looking at|Given the context|Here's what|This would|Let me|To complete this|Here is|Here's)/i, '');
            
            // Remove sentences that are clearly explanations (contain "is a" or end with periods)
            const lines = suggestion.split('\n');
            const filteredLines = lines.filter(line => {
                const trimmed = line.trim();
                if (!trimmed) return false;
                
                // Skip lines that are clearly explanations
                if (trimmed.match(/^(Here|This|The|It|You|We)\s/i)) return false;
                if (trimmed.includes('is a complete') || trimmed.includes('snippet')) return false;
                if (trimmed.match(/\.\s*$/)) return false; // ends with period
                if (trimmed.includes('variable will be') || trimmed.includes('will be set')) return false;
                
                return true;
            });
            
            suggestion = filteredLines.join('\n').trim();
            
            // Remove leading/trailing whitespace and newlines
            suggestion = suggestion.trim();
            
            // If suggestion is too long (likely an explanation), reject it
            if (suggestion.length > 300) {
                this.outputChannel.appendLine(`[CodeCompletion] Suggestion too long (${suggestion.length} chars), likely explanation - rejecting`);
                return '';
            }
            
            // Remove the current expression if it appears at the beginning of the suggestion
            if (currentExpression && suggestion.toLowerCase().startsWith(currentExpression.toLowerCase())) {
                suggestion = suggestion.substring(currentExpression.length).trim();
            }
            
            // Limit to reasonable length
            if (suggestion.length > this.maxSuggestionLength) {
                suggestion = suggestion.substring(0, this.maxSuggestionLength) + '...';
            }

            this.outputChannel.appendLine(`[CodeCompletion] Filtered suggestion: "${suggestion}"`);
            this.outputChannel.appendLine(`[CodeCompletion] Suggestion length: ${suggestion.length}`);
            
            return suggestion;

        } catch (error) {
            this.outputChannel.appendLine(`[CodeCompletion] Ollama error: ${error}`);
            return '';
        }
    }

    /**
     * Create a completion item that can be accepted with TAB
     */
    private createCompletionItem(suggestion: string, position: vscode.Position, currentExpression: string): vscode.CompletionItem {
        const completionItem = new vscode.CompletionItem(
            suggestion,
            vscode.CompletionItemKind.Snippet
        );

        completionItem.insertText = suggestion;
        completionItem.detail = 'AI Suggestion';
        completionItem.documentation = 'Press TAB to accept this AI-generated suggestion';
        completionItem.sortText = '0'; // Prioritize AI suggestions
        completionItem.preselect = true; // Auto-select the suggestion
        
        // Set the range to replace the current expression
        if (currentExpression) {
            const expressionStart = new vscode.Position(position.line, position.character - currentExpression.length);
            completionItem.range = new vscode.Range(expressionStart, position);
            this.outputChannel.appendLine(`[CodeCompletion] Range: ${expressionStart.line}:${expressionStart.character} to ${position.line}:${position.character} (replacing "${currentExpression}")`);
        } else {
            completionItem.range = new vscode.Range(position, position);
            this.outputChannel.appendLine(`[CodeCompletion] Range: ${position.line}:${position.character} to ${position.line}:${position.character} (inserting at cursor)`);
        }

        return completionItem;
    }

    /**
     * Check if code completion should be triggered
     */
    shouldTriggerCompletion(context: vscode.CompletionContext): boolean {
        // Trigger on typing, but not on special characters that might be part of existing code
        if (context.triggerKind === vscode.CompletionTriggerKind.Invoke) {
            return true;
        }

        if (context.triggerKind === vscode.CompletionTriggerKind.TriggerCharacter) {
            const triggerChar = context.triggerCharacter;
            
            // Trigger on configured characters
            return triggerChar ? this.triggerCharacters.includes(triggerChar) : false;
        }

        return false;
    }
} 