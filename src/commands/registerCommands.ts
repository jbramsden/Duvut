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
}

