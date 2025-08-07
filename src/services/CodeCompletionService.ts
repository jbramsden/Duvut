import * as vscode from 'vscode';
import { OllamaClient } from '../api/OllamaClient';

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
        this.ollamaClient = new OllamaClient();
        this.outputChannel = outputChannel;
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
            // Check if code completion is enabled
            if (!this.isEnabled) {
                return [];
            }

            // Debounce requests to avoid overwhelming the LLM
            const now = Date.now();
            if (this.isProcessing || (now - this.lastRequestTime) < this.debounceDelay) {
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
            this.outputChannel.appendLine(`[CodeCompletion] Current expression: "${currentExpression}"`);
            
            // Create prompt for code completion
            const prompt = this.createCompletionPrompt(contextText, position, document.languageId, workspaceContext, currentExpression);
            
            // Get suggestion from Ollama
            this.outputChannel.appendLine(`[CodeCompletion] Using model: ${this.selectedModel}`);
            const suggestion = await this.getSuggestionFromOllama(prompt, document.languageId, currentExpression);
            
            if (suggestion && suggestion.trim()) {
                this.outputChannel.appendLine(`[CodeCompletion] Creating completion item for: "${suggestion}"`);
                const completionItem = this.createCompletionItem(suggestion, position, currentExpression);
                this.isProcessing = false;
                return [completionItem];
            }

            this.isProcessing = false;
            return [];

        } catch (error) {
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
        return `You are an intelligent code completion assistant. Based on the context, suggest what should come next.

Language: ${language}
Workspace Context:
${workspaceContext}

Current code context:
\`\`\`${language}
${contextText}
\`\`\`

Cursor position: Line ${position.line + 1}, Column ${position.character + 1}
Current expression: "${currentExpression}"

IMPORTANT: The user has already typed "${currentExpression}". Provide ONLY what should come AFTER this.
- Do NOT repeat "${currentExpression}" in your suggestion
- Do NOT include the current expression in your suggestion
- Keep it concise (1-3 lines max)
- Don't include explanations
- Focus on the most likely next step

Examples:
- If user typed "func" → return " testHandler(w http.ResponseWriter, r *http.Request) {"
- If user typed "http.HandleFunc(" → return '"/hello", func(w http.ResponseWriter, r *http.Request) {'
- If user typed "const user = " → return "{ name: '', email: '' }"

Suggestion:`;
    }

    /**
     * Get suggestion from Ollama
     */
    private async getSuggestionFromOllama(prompt: string, language: string, currentExpression: string): Promise<string> {
        try {
            const messages = [
                {
                    role: 'system' as const,
                    content: `You are a code completion assistant. Provide concise, accurate code suggestions based on context. Only return the code snippet, no explanations. IMPORTANT: Do NOT include the current expression in your suggestion.`
                },
                {
                    role: 'user' as const,
                    content: prompt
                }
            ];

            const response = await this.ollamaClient.chat(messages, this.selectedModel);
            
            // Clean up the response
            let suggestion = response.trim();
            
            // Remove markdown code blocks if present
            suggestion = suggestion.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '');
            
            // Remove leading/trailing whitespace and newlines
            suggestion = suggestion.trim();
            
            // Remove the current expression if it appears at the beginning of the suggestion
            if (currentExpression && suggestion.toLowerCase().startsWith(currentExpression.toLowerCase())) {
                suggestion = suggestion.substring(currentExpression.length).trim();
            }
            
            // Limit to reasonable length
            if (suggestion.length > this.maxSuggestionLength) {
                suggestion = suggestion.substring(0, this.maxSuggestionLength) + '...';
            }

            this.outputChannel.appendLine(`[CodeCompletion] Generated suggestion: "${suggestion}"`);
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