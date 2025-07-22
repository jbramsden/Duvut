import * as vscode from 'vscode';
import { OllamaProvider } from './providers/OllamaProvider';
import { registerCommands } from './commands/registerCommands';

let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Duvut Assistant');
    context.subscriptions.push(outputChannel);
    
    outputChannel.appendLine('Duvut Assistant extension activated');

    vscode.window.showInformationMessage('Duvut Assistant extension activated!');

    // Create and register the sidebar provider
    const provider = new OllamaProvider(context, outputChannel);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'duvut-assistant.SidebarProvider',
            provider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Register all commands
    registerCommands(context, provider);

    outputChannel.appendLine('Duvut Assistant initialization complete');
}

export function deactivate() {
    outputChannel?.appendLine('Duvut Assistant extension deactivated');
}
