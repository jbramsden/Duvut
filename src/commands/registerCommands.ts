import * as vscode from 'vscode';
import { OllamaProvider } from '../providers/OllamaProvider';

export function registerCommands(context: vscode.ExtensionContext, provider: OllamaProvider) {
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
}

