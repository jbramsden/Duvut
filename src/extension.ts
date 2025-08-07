import * as vscode from 'vscode';
import { OllamaProvider } from './providers/OllamaProvider';
import { CodeCompletionProvider } from './providers/CodeCompletionProvider';
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

    // Register code completion provider
    const completionProvider = new CodeCompletionProvider(outputChannel);
    const completionDisposable = vscode.languages.registerCompletionItemProvider(
        [
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'python' },
            { scheme: 'file', language: 'go' },
            { scheme: 'file', language: 'java' },
            { scheme: 'file', language: 'cpp' },
            { scheme: 'file', language: 'csharp' },
            { scheme: 'file', language: 'php' },
            { scheme: 'file', language: 'ruby' },
            { scheme: 'file', language: 'rust' },
            { scheme: 'file', language: 'swift' },
            { scheme: 'file', language: 'kotlin' },
            { scheme: 'file', language: 'scala' },
            { scheme: 'file', language: 'dart' },
            { scheme: 'file', language: 'html' },
            { scheme: 'file', language: 'css' },
            { scheme: 'file', language: 'json' },
            { scheme: 'file', language: 'yaml' },
            { scheme: 'file', language: 'markdown' },
            { scheme: 'file', language: 'shellscript' },
            { scheme: 'file', language: 'sql' }
        ],
        completionProvider,
        '.', '(', ' ', '\n', ';', '{', '=' // Trigger characters
    );
    context.subscriptions.push(completionDisposable);

    outputChannel.appendLine('Duvut Assistant initialization complete');
}

export function deactivate() {
    outputChannel?.appendLine('Duvut Assistant extension deactivated');
}
