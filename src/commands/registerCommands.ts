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
                await provider['_promptForCodeApplication'](recommendations);
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
}

