import * as vscode from 'vscode';

export interface DebugMessage {
    functionName: string;
    message: string;
    data?: any;
    timestamp?: Date;
}

export class DebugService {
    private static instance: DebugService;
    private outputChannel: vscode.OutputChannel;
    private isEnabled: boolean = false;

    private constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.updateDebugState();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('duvut-assistant.debug.enabled')) {
                this.updateDebugState();
            }
        });
    }

    public static getInstance(outputChannel: vscode.OutputChannel): DebugService {
        if (!DebugService.instance) {
            DebugService.instance = new DebugService(outputChannel);
        }
        return DebugService.instance;
    }

    private updateDebugState(): void {
        const config = vscode.workspace.getConfiguration('duvut-assistant');
        this.isEnabled = config.get('debug.enabled', false);
        
        if (this.isEnabled) {
            this.log('DebugService', 'Debug logging enabled');
        }
    }

    public log(functionName: string, message: string, data?: any): void {
        if (!this.isEnabled) {
            return;
        }

        const timestamp = new Date().toISOString();
        const debugMessage: DebugMessage = {
            functionName,
            message,
            data,
            timestamp: new Date()
        };

        const logLine = `[${timestamp}] [${functionName}] ${message}`;
        this.outputChannel.appendLine(logLine);

        if (data) {
            // Pretty print data if it's an object
            if (typeof data === 'object') {
                this.outputChannel.appendLine(`[${timestamp}] [${functionName}] Data: ${JSON.stringify(data, null, 2)}`);
            } else {
                this.outputChannel.appendLine(`[${timestamp}] [${functionName}] Data: ${data}`);
            }
        }
    }

    public logOllamaRequest(functionName: string, request: any, endpoint: string): void {
        if (!this.isEnabled) {
            return;
        }

        this.log(functionName, `Ollama Request to ${endpoint}`, {
            endpoint,
            request
        });
    }

    public logOllamaResponse(functionName: string, response: any, endpoint: string): void {
        if (!this.isEnabled) {
            return;
        }

        this.log(functionName, `Ollama Response from ${endpoint}`, {
            endpoint,
            response
        });
    }

    public logOllamaError(functionName: string, error: any, endpoint: string): void {
        if (!this.isEnabled) {
            return;
        }

        this.log(functionName, `Ollama Error from ${endpoint}`, {
            endpoint,
            error: error.message || error,
            stack: error.stack
        });
    }

    public logSystemPrompt(functionName: string, systemPrompt: string): void {
        if (!this.isEnabled) {
            return;
        }

        this.log(functionName, 'System Prompt', {
            systemPrompt
        });
    }

    public logChatMessage(functionName: string, message: any, direction: 'sent' | 'received'): void {
        if (!this.isEnabled) {
            return;
        }

        this.log(functionName, `Chat Message ${direction}`, {
            direction,
            message
        });
    }

    public isDebugEnabled(): boolean {
        return this.isEnabled;
    }

    public showOutputChannel(): void {
        this.outputChannel.show();
    }
}
