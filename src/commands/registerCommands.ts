import * as vscode from 'vscode';
import { OllamaProvider } from '../providers/OllamaProvider';
import { DebugService } from '../services/DebugService';
import { TestService } from '../services/TestService';

export function registerCommands(context: vscode.ExtensionContext, provider: OllamaProvider, outputChannel: vscode.OutputChannel) {
    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.newTask', () => {
            // Focus the sidebar to start a new conversation
            vscode.commands.executeCommand('workbench.view.extension.duvut-assistant-ActivityBar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.explainCode', async (...args) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const selection = activeEditor.selection;
            const selectedText = activeEditor.document.getText(selection);
            
            if (!selectedText.trim()) {
                vscode.window.showWarningMessage('Please select some code to explain');
                return;
            }

            const model = args && args.length > 0 ? args[0] : undefined;
            await provider.explainCode(selectedText, model);
            // Focus the sidebar to see the response
            vscode.commands.executeCommand('workbench.view.extension.duvut-assistant-ActivityBar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.improveCode', async (...args) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const selection = activeEditor.selection;
            const selectedText = activeEditor.document.getText(selection);
            
            if (!selectedText.trim()) {
                vscode.window.showWarningMessage('Please select some code to improve');
                return;
            }

            const model = args && args.length > 0 ? args[0] : undefined;
            await provider.improveCode(selectedText, model);
            // Focus the sidebar to see the response
            vscode.commands.executeCommand('workbench.view.extension.duvut-assistant-ActivityBar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.fixCode', async (...args) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const selection = activeEditor.selection;
            const selectedText = activeEditor.document.getText(selection);
            
            if (!selectedText.trim()) {
                vscode.window.showWarningMessage('Please select some code to fix');
                return;
            }

            const model = args && args.length > 0 ? args[0] : undefined;
            await provider.fixCode(selectedText, model);
            // Focus the sidebar to see the response
            vscode.commands.executeCommand('workbench.view.extension.duvut-assistant-ActivityBar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.settings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'duvut-assistant');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.testCodeDetection', () => {
            provider.testCodeRecommendationDetection();
            vscode.window.showInformationMessage('Code recommendation detection test completed. Check the output channel for results.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.showPendingRecommendations', () => {
            provider.getPendingRecommendations();
            vscode.window.showInformationMessage('Pending recommendations displayed in output channel.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.clearPendingRecommendations', () => {
            provider.clearPendingRecommendations();
            vscode.window.showInformationMessage('All pending recommendations cleared.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.testToolCallValidation', () => {
            // Test various tool call formats
            const testCases = [
                { toolCall: '<read_file>valid_file.py</read_file>', type: 'read_file', expected: true },
                { toolCall: '<open_file>_hello_server.py<', type: 'open_file', expected: false },
                { toolCall: '<read_file>curl http:/localhost:8000<', type: 'read_file', expected: false },
                { toolCall: '<write_file>test.py\nprint("hello")</write_file>', type: 'write_file', expected: true },
                { toolCall: '<open_file></open_file>', type: 'open_file', expected: false },
                { toolCall: 'just some text', type: 'read_file', expected: false }
            ];
            
            testCases.forEach(testCase => {
                const result = (provider as any)._isValidToolCall(testCase.toolCall, testCase.type);
                const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
                console.log(`${status} - ${testCase.type}: ${testCase.toolCall.substring(0, 50)}...`);
            });
            
            vscode.window.showInformationMessage('Tool call validation test completed. Check the console for results.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.checkOllamaConnection', () => {
            // Access the private method through bracket notation
            (provider as any)._checkOllamaConnection();
            vscode.window.showInformationMessage('Ollama connection check triggered. Check the output channel for results.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.testWebview', () => {
            // Test webview functionality
            vscode.window.showInformationMessage('Testing webview functionality...');
            
            // Try to send a test message to the webview
            try {
                (provider as any)._view?.webview.postMessage({
                    type: 'testMessage',
                    content: 'This is a test message from the extension'
                });
                vscode.window.showInformationMessage('Test message sent to webview successfully.');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to send test message: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.simulateLLMResponse', async () => {
            // Simulate a real LLM response with code recommendations
            const simulatedResponse = `
I'll help you create a simple Go web server. Here are the files you'll need:

\`\`\`go main.go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })
    
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
\`\`\`

And here's a configuration file:

\`\`\`yaml config.yaml
server:
  port: 8080
  host: localhost
\`\`\`
            `;
            
            // Process this response as if it came from the LLM
            const recommendations = provider['_detectCodeRecommendations'](simulatedResponse);
            vscode.window.showInformationMessage(`Found ${recommendations.length} code recommendations. Check the output channel for details.`);
            
            if (recommendations.length > 0) {
                await provider['_promptForCodeApplication'](recommendations, 'simulated_req_id');
                vscode.window.showInformationMessage('Code recommendation prompt should appear in the chat.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.toggleCodeCompletion', () => {
            const config = vscode.workspace.getConfiguration('duvut-assistant.codeCompletion');
            const currentEnabled = config.get('enabled', true);
            const newEnabled = !currentEnabled;
            
            config.update('enabled', newEnabled, vscode.ConfigurationTarget.Global);
            
            const status = newEnabled ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Duvut Assistant code completion ${status}`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.debugFileDetection', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                vscode.window.showInformationMessage(`Active editor: ${activeEditor.document.fileName}`);
                console.log(`Active editor: ${activeEditor.document.fileName}`);
                console.log(`Content length: ${activeEditor.document.getText().length}`);
            } else {
                vscode.window.showWarningMessage('No active editor found');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.toggleDebugMode', () => {
            const config = vscode.workspace.getConfiguration('duvut-assistant.debug');
            const currentEnabled = config.get('enabled', false);
            const newEnabled = !currentEnabled;
            
            config.update('enabled', newEnabled, vscode.ConfigurationTarget.Global);
            
            const status = newEnabled ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Duvut Assistant debug mode ${status}`);
            
            // Show the output channel when debug is enabled
            if (newEnabled) {
                outputChannel.show();
            }
        })
    );

    // Testing Facility Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.openToolTesting', () => {
            vscode.commands.executeCommand('workbench.view.extension.duvut-assistant-TestProvider');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.runAllToolTests', async () => {
            const testService = TestService.getInstance(outputChannel, context);
            try {
                vscode.window.showInformationMessage('Running all tool tests... This may take a while.');
                const summaries = await testService.runAllTests();
                
                const totalModels = summaries.size;
                let totalTests = 0;
                let totalPassed = 0;
                
                for (const [modelName, summary] of summaries) {
                    totalTests += summary.totalTests;
                    totalPassed += summary.passedTests;
                }
                
                const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
                
                vscode.window.showInformationMessage(
                    `Tool testing completed! ${totalPassed}/${totalTests} tests passed (${successRate}%) across ${totalModels} models. Check the Tool Testing panel for detailed results.`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to run tool tests: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.runQuickToolTest', async () => {
            const testService = TestService.getInstance(outputChannel, context);
            try {
                const models = await testService.getAvailableModels();
                if (models.length === 0) {
                    vscode.window.showWarningMessage('No models available. Make sure Ollama is running.');
                    return;
                }

                // Run a quick test with the first available model
                const firstModel = models[0];
                const testSuites = testService.getTestSuites();
                if (testSuites.length === 0) {
                    vscode.window.showWarningMessage('No test suites available.');
                    return;
                }

                vscode.window.showInformationMessage(`Running quick test with ${firstModel.name}...`);
                const results = await testService.runTestSuite(testSuites[0].id, firstModel.name);
                
                const passed = results.filter(r => r.success).length;
                const total = results.length;
                
                vscode.window.showInformationMessage(
                    `Quick test completed! ${passed}/${total} tests passed with ${firstModel.name}. Check the Tool Testing panel for details.`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to run quick test: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.showTestResults', async () => {
            const testService = TestService.getInstance(outputChannel, context);
            const results = testService.getAllTestResults();
            
            if (results.size === 0) {
                vscode.window.showInformationMessage('No test results available. Run some tests first.');
                return;
            }

            // Show a summary of results
            let summary = 'Tool Test Results Summary:\n\n';
            for (const [key, testResults] of results) {
                const [suiteId, modelName] = key.split('-');
                const passed = testResults.filter(r => r.success).length;
                const total = testResults.length;
                summary += `${modelName} (${suiteId}): ${passed}/${total} passed\n`;
            }
            
            vscode.window.showInformationMessage(summary);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.exportTestResults', async () => {
            const testService = TestService.getInstance(outputChannel, context);
            try {
                const format = await vscode.window.showQuickPick(['JSON', 'CSV', 'HTML'], {
                    placeHolder: 'Select export format'
                });
                
                if (!format) return;
                
                const formatLower = format.toLowerCase() as 'json' | 'csv' | 'html';
                const includeHistory = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'Include test history?'
                });
                
                if (includeHistory === undefined) return;
                
                vscode.window.showInformationMessage('Exporting test results...');
                const exportPath = await testService.exportResults(formatLower, includeHistory === 'Yes');
                
                vscode.window.showInformationMessage(`Test results exported to: ${exportPath}`);
                
                // Open the exported file
                const document = await vscode.workspace.openTextDocument(exportPath);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to export test results: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.showTestStatistics', async () => {
            const testService = TestService.getInstance(outputChannel, context);
            const stats = testService.getTestStatistics();
            
            if (!stats) {
                vscode.window.showInformationMessage('No test statistics available. Run some tests first.');
                return;
            }
            
            const message = `Test Statistics:
• Total Test Runs: ${stats.totalTestRuns}
• Total Tests: ${stats.totalTests}
• Average Success Rate: ${Math.round(stats.averageSuccessRate)}%
• Most Tested Model: ${stats.mostTestedModel}
• Least Tested Model: ${stats.leastTestedModel}
• Average Execution Time: ${Math.round(stats.averageExecutionTime)}ms`;
            
            vscode.window.showInformationMessage(message);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('duvut-assistant.debugToolExecution', async () => {
            const testService = TestService.getInstance(outputChannel, context);
            try {
                // Test the readFile tool directly
                const testPrompt = 'Please read the file "package.json" and tell me what the main entry point is.';
                const toolResult = await (testService as any).executeToolFunction('readFile', testPrompt);
                
                const message = `Tool Execution Debug:
• Tool: readFile
• Success: ${toolResult.success}
• Path: ${toolResult.path}
• Content Length: ${toolResult.content?.length || 0}
• Content Preview: ${toolResult.content?.substring(0, 200) || 'No content'}...`;
                
                vscode.window.showInformationMessage(message);
                outputChannel.appendLine('=== TOOL EXECUTION DEBUG ===');
                outputChannel.appendLine(JSON.stringify(toolResult, null, 2));
                outputChannel.show();
            } catch (error) {
                vscode.window.showErrorMessage(`Tool execution debug failed: ${error}`);
            }
        })
    );
}

