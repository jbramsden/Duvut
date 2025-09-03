import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ToolsService {
    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * Read a file from the workspace
     */
    async readFile(filePath: string): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            const content = await fs.readFile(absolutePath, 'utf-8');
            this.outputChannel.appendLine(`Read file: ${absolutePath}`);
            return content;
        } catch (error) {
            this.outputChannel.appendLine(`Error reading file ${filePath}: ${error}`);
            throw error;
        }
    }

    /**
     * Write content to a file
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            // Ensure directory exists
            const dir = path.dirname(absolutePath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(absolutePath, content, 'utf-8');
            this.outputChannel.appendLine(`Wrote file: ${absolutePath}`);

            // Show file in VS Code
            const document = await vscode.workspace.openTextDocument(absolutePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            this.outputChannel.appendLine(`Error writing file ${filePath}: ${error}`);
            throw error;
        }
    }

    /**
     * List files in a directory
     */
    async listFiles(dirPath: string = ''): Promise<string[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = dirPath 
                ? path.join(workspaceFolders[0].uri.fsPath, dirPath)
                : workspaceFolders[0].uri.fsPath;

            const items = await fs.readdir(absolutePath, { withFileTypes: true });
            const files = items
                .filter(item => item.isFile())
                .map(item => path.join(dirPath, item.name));

            this.outputChannel.appendLine(`Listed ${files.length} files in: ${absolutePath}`);
            return files;
        } catch (error) {
            this.outputChannel.appendLine(`Error listing files in ${dirPath}: ${error}`);
            throw error;
        }
    }

    /**
     * Get the current active file content
     */
    async getCurrentFile(): Promise<{ path: string; content: string } | null> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            this.outputChannel.appendLine(`[DEBUG] No active editor found in getCurrentFile`);
            return null;
        }

        const document = activeEditor.document;
        const result = {
            path: document.fileName,
            content: document.getText()
        };
        
        this.outputChannel.appendLine(`[DEBUG] getCurrentFile returning: ${result.path} (${result.content.length} chars)`);
        return result;
    }

    /**
     * Get selected text from the active editor
     */
    getSelectedText(): string | null {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return null;
        }

        const selection = activeEditor.selection;
        if (selection.isEmpty) {
            return null;
        }

        return activeEditor.document.getText(selection);
    }

    /**
     * Replace selected text in the active editor
     */
    async replaceSelectedText(newText: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('No active editor');
        }

        const selection = activeEditor.selection;
        await activeEditor.edit(editBuilder => {
            editBuilder.replace(selection, newText);
        });
    }

    /**
     * Insert text at cursor position
     */
    async insertText(text: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            throw new Error('No active editor');
        }

        const position = activeEditor.selection.active;
        await activeEditor.edit(editBuilder => {
            editBuilder.insert(position, text);
        });
    }

    /**
     * Execute a shell command in the integrated terminal
     */
    async executeCommand(command: string): Promise<void> {
        const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Duvut Assistant');
        terminal.show();
        terminal.sendText(command);
        this.outputChannel.appendLine(`Executed command: ${command}`);
    }

    /**
     * Search for text in workspace files
     */
    async searchInWorkspace(query: string): Promise<vscode.Uri[]> {
        const results = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
        const matchingFiles: vscode.Uri[] = [];

        for (const file of results) {
            try {
                const content = await fs.readFile(file.fsPath, 'utf-8');
                if (content.toLowerCase().includes(query.toLowerCase())) {
                    matchingFiles.push(file);
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        this.outputChannel.appendLine(`Found ${matchingFiles.length} files matching "${query}"`);
        return matchingFiles;
    }

    /**
     * Get workspace information
     */
    getWorkspaceInfo(): { name?: string; folders: string[] } {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceName = vscode.workspace.name;

        return {
            name: workspaceName,
            folders: workspaceFolders ? workspaceFolders.map(f => f.uri.fsPath) : []
        };
    }

    /**
     * Show an informational message
     */
    showInfo(message: string): void {
        vscode.window.showInformationMessage(message);
        this.outputChannel.appendLine(`Info: ${message}`);
    }

    /**
     * Show an error message
     */
    showError(message: string): void {
        vscode.window.showErrorMessage(message);
        this.outputChannel.appendLine(`Error: ${message}`);
    }

    /**
     * Open a file in VS Code
     */
    async openFile(filePath: string): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            const document = await vscode.workspace.openTextDocument(absolutePath);
            await vscode.window.showTextDocument(document);
            this.outputChannel.appendLine(`Opened file: ${absolutePath}`);
        } catch (error) {
            this.outputChannel.appendLine(`Error opening file ${filePath}: ${error}`);
            throw error;
        }
    }

    /**
     * Write file temporarily for linting validation
     */
    async writeFileTemporary(filePath: string, content: string): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            // Ensure directory exists
            const dir = path.dirname(absolutePath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(absolutePath, content, 'utf-8');
            this.outputChannel.appendLine(`Wrote temporary file for linting: ${absolutePath}`);
            
            return absolutePath;
        } catch (error) {
            this.outputChannel.appendLine(`Error writing temporary file ${filePath}: ${error}`);
            throw error;
        }
    }

    /**
     * Get diagnostics (linting errors) for a file
     */
    async getDiagnostics(filePath: string): Promise<vscode.Diagnostic[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            const uri = vscode.Uri.file(absolutePath);
            
            // Open the document to trigger diagnostics
            const document = await vscode.workspace.openTextDocument(uri);
            
            // Wait a moment for language servers to analyze the file
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const diagnostics = vscode.languages.getDiagnostics(uri);
            this.outputChannel.appendLine(`Found ${diagnostics.length} diagnostics for: ${absolutePath}`);
            
            return diagnostics;
        } catch (error) {
            this.outputChannel.appendLine(`Error getting diagnostics for ${filePath}: ${error}`);
            throw error;
        }
    }

    /**
     * Validate code by writing it temporarily and checking for linting errors
     */
    async validateCode(filePath: string, content: string): Promise<{
        isValid: boolean;
        errors: Array<{
            message: string;
            line: number;
            character: number;
            severity: string;
            source?: string;
        }>;
    }> {
        try {
            // Write the file temporarily
            const absolutePath = await this.writeFileTemporary(filePath, content);
            
            // Get diagnostics
            const diagnostics = await this.getDiagnostics(absolutePath);
            
            // Filter for errors and warnings (ignore hints and info)
            const significantDiagnostics = diagnostics.filter(d => 
                d.severity === vscode.DiagnosticSeverity.Error || 
                d.severity === vscode.DiagnosticSeverity.Warning
            );
            
            const errors = significantDiagnostics.map(d => ({
                message: d.message,
                line: d.range.start.line + 1, // Convert to 1-based line numbers
                character: d.range.start.character + 1,
                severity: d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning',
                source: d.source
            }));
            
            this.outputChannel.appendLine(`Validation result for ${filePath}: ${errors.length === 0 ? 'VALID' : 'INVALID'}`);
            if (errors.length > 0) {
                errors.forEach(error => {
                    this.outputChannel.appendLine(`  ${error.severity} at line ${error.line}: ${error.message}`);
                });
            }
            
            return {
                isValid: errors.length === 0,
                errors
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error validating code for ${filePath}: ${error}`);
            throw error;
        }
    }

    /**
     * Delete a temporary file
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            await fs.unlink(absolutePath);
            this.outputChannel.appendLine(`Deleted file: ${absolutePath}`);
        } catch (error) {
            this.outputChannel.appendLine(`Error deleting file ${filePath}: ${error}`);
            // Don't throw - deletion failures shouldn't break the flow
        }
    }
}
