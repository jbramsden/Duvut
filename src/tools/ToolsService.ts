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
            return null;
        }

        const document = activeEditor.document;
        return {
            path: document.fileName,
            content: document.getText()
        };
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
}
