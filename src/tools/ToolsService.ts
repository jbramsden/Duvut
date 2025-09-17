import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    /**
     * Execute a terminal command
     */
    async executeCommand(command: string, options?: { cwd?: string; timeout?: number }): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const workingDirectory = options?.cwd || (workspaceFolders ? workspaceFolders[0].uri.fsPath : process.cwd());
            
            this.outputChannel.appendLine(`Executing command: ${command}`);
            this.outputChannel.appendLine(`Working directory: ${workingDirectory}`);

            const execOptions = {
                cwd: workingDirectory,
                timeout: options?.timeout || 30000, // 30 second default timeout
                maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                encoding: 'utf8' as BufferEncoding
            };

            const { stdout, stderr } = await execAsync(command, execOptions);
            
            this.outputChannel.appendLine(`Command completed successfully`);
            this.outputChannel.appendLine(`STDOUT: ${stdout.substring(0, 500)}${stdout.length > 500 ? '...' : ''}`);
            if (stderr) {
                this.outputChannel.appendLine(`STDERR: ${stderr.substring(0, 500)}${stderr.length > 500 ? '...' : ''}`);
            }

            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0
            };
        } catch (error: any) {
            this.outputChannel.appendLine(`Command failed: ${error.message}`);
            
            // Handle timeout and other exec errors
            if (error.code === 'TIMEOUT') {
                throw new Error(`Command timed out after ${options?.timeout || 30000}ms`);
            }
            
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || error.message,
                exitCode: error.code || 1
            };
        }
    }

    /**
     * Execute a terminal command with real-time output
     */
    async executeCommandWithOutput(command: string, options?: { cwd?: string; timeout?: number }): Promise<{ output: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const workingDirectory = options?.cwd || (workspaceFolders ? workspaceFolders[0].uri.fsPath : process.cwd());
            
            this.outputChannel.appendLine(`Executing command with output: ${command}`);
            this.outputChannel.appendLine(`Working directory: ${workingDirectory}`);

            const { spawn } = require('child_process');
            const child = spawn(command, [], {
                cwd: workingDirectory,
                shell: true,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data: Buffer) => {
                const text = data.toString();
                output += text;
                this.outputChannel.append(text);
            });

            child.stderr.on('data', (data: Buffer) => {
                const text = data.toString();
                errorOutput += text;
                this.outputChannel.append(text);
            });

            child.on('close', (code: number) => {
                this.outputChannel.appendLine(`\nCommand completed with exit code: ${code}`);
                resolve({
                    output: output.trim(),
                    exitCode: code || 0
                });
            });

            child.on('error', (error: Error) => {
                this.outputChannel.appendLine(`Command error: ${error.message}`);
                reject(error);
            });

            // Set timeout
            const timeout = options?.timeout || 30000;
            setTimeout(() => {
                child.kill();
                reject(new Error(`Command timed out after ${timeout}ms`));
            }, timeout);
        });
    }

    // ==================== GIT TOOLS ====================

    /**
     * Get Git repository status
     */
    async getGitStatus(): Promise<{ status: string; isRepository: boolean; branch?: string; hasChanges: boolean }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const result = await this.executeCommand('git status --porcelain', { cwd: workspaceFolders[0].uri.fsPath });
            
            if (result.exitCode !== 0) {
                return {
                    status: result.stderr,
                    isRepository: false,
                    hasChanges: false
                };
            }

            // Get current branch
            const branchResult = await this.executeCommand('git branch --show-current', { cwd: workspaceFolders[0].uri.fsPath });
            const currentBranch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : 'unknown';

            const hasChanges = result.stdout.trim().length > 0;
            const status = hasChanges ? result.stdout : 'Working tree clean';

            return {
                status,
                isRepository: true,
                branch: currentBranch,
                hasChanges
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error getting Git status: ${error}`);
            return {
                status: `Error: ${error}`,
                isRepository: false,
                hasChanges: false
            };
        }
    }

    /**
     * Add files to Git staging area
     */
    async gitAdd(files: string = '.'): Promise<{ success: boolean; message: string; filesAdded: string[] }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const result = await this.executeCommand(`git add ${files}`, { cwd: workspaceFolders[0].uri.fsPath });
            
            if (result.exitCode !== 0) {
                return {
                    success: false,
                    message: result.stderr,
                    filesAdded: []
                };
            }

            // Get list of staged files
            const stagedResult = await this.executeCommand('git diff --cached --name-only', { cwd: workspaceFolders[0].uri.fsPath });
            const filesAdded = stagedResult.exitCode === 0 ? stagedResult.stdout.trim().split('\n').filter(f => f) : [];

            return {
                success: true,
                message: `Successfully added ${files === '.' ? 'all changes' : files} to staging area`,
                filesAdded
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error adding files to Git: ${error}`);
            return {
                success: false,
                message: `Error: ${error}`,
                filesAdded: []
            };
        }
    }

    /**
     * Commit changes to Git
     */
    async gitCommit(message: string, options?: { amend?: boolean; noVerify?: boolean }): Promise<{ success: boolean; message: string; commitHash?: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            let command = 'git commit';
            if (options?.amend) command += ' --amend';
            if (options?.noVerify) command += ' --no-verify';
            command += ` -m "${message}"`;

            const result = await this.executeCommand(command, { cwd: workspaceFolders[0].uri.fsPath });
            
            if (result.exitCode !== 0) {
                return {
                    success: false,
                    message: result.stderr
                };
            }

            // Get the commit hash
            const hashResult = await this.executeCommand('git rev-parse HEAD', { cwd: workspaceFolders[0].uri.fsPath });
            const commitHash = hashResult.exitCode === 0 ? hashResult.stdout.trim() : undefined;

            return {
                success: true,
                message: `Successfully committed: ${message}`,
                commitHash
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error committing to Git: ${error}`);
            return {
                success: false,
                message: `Error: ${error}`
            };
        }
    }

    /**
     * Push changes to remote repository
     */
    async gitPush(options?: { remote?: string; branch?: string; force?: boolean }): Promise<{ success: boolean; message: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            let command = 'git push';
            if (options?.force) command += ' --force';
            if (options?.remote) command += ` ${options.remote}`;
            if (options?.branch) command += ` ${options.branch}`;

            const result = await this.executeCommand(command, { cwd: workspaceFolders[0].uri.fsPath });
            
            if (result.exitCode !== 0) {
                return {
                    success: false,
                    message: result.stderr
                };
            }

            return {
                success: true,
                message: `Successfully pushed to ${options?.remote || 'origin'}/${options?.branch || 'current branch'}`
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error pushing to Git: ${error}`);
            return {
                success: false,
                message: `Error: ${error}`
            };
        }
    }

    /**
     * Pull changes from remote repository
     */
    async gitPull(options?: { remote?: string; branch?: string; rebase?: boolean }): Promise<{ success: boolean; message: string; changes: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            let command = 'git pull';
            if (options?.rebase) command += ' --rebase';
            if (options?.remote) command += ` ${options.remote}`;
            if (options?.branch) command += ` ${options.branch}`;

            const result = await this.executeCommand(command, { cwd: workspaceFolders[0].uri.fsPath });
            
            return {
                success: result.exitCode === 0,
                message: result.exitCode === 0 ? 'Successfully pulled changes' : result.stderr,
                changes: result.stdout
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error pulling from Git: ${error}`);
            return {
                success: false,
                message: `Error: ${error}`,
                changes: ''
            };
        }
    }

    /**
     * Create a new Git branch
     */
    async gitCreateBranch(branchName: string, options?: { checkout?: boolean }): Promise<{ success: boolean; message: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            let command = options?.checkout ? `git checkout -b ${branchName}` : `git branch ${branchName}`;
            const result = await this.executeCommand(command, { cwd: workspaceFolders[0].uri.fsPath });
            
            return {
                success: result.exitCode === 0,
                message: result.exitCode === 0 ? `Successfully created branch: ${branchName}` : result.stderr
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error creating Git branch: ${error}`);
            return {
                success: false,
                message: `Error: ${error}`
            };
        }
    }

    /**
     * Switch to a Git branch
     */
    async gitCheckout(branchName: string): Promise<{ success: boolean; message: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const result = await this.executeCommand(`git checkout ${branchName}`, { cwd: workspaceFolders[0].uri.fsPath });
            
            return {
                success: result.exitCode === 0,
                message: result.exitCode === 0 ? `Successfully switched to branch: ${branchName}` : result.stderr
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error switching Git branch: ${error}`);
            return {
                success: false,
                message: `Error: ${error}`
            };
        }
    }

    /**
     * Get Git log information
     */
    async gitLog(options?: { limit?: number; oneline?: boolean; author?: string }): Promise<{ success: boolean; log: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            let command = 'git log';
            if (options?.oneline) command += ' --oneline';
            if (options?.limit) command += ` -${options.limit}`;
            if (options?.author) command += ` --author="${options.author}"`;

            const result = await this.executeCommand(command, { cwd: workspaceFolders[0].uri.fsPath });
            
            return {
                success: result.exitCode === 0,
                log: result.stdout
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error getting Git log: ${error}`);
            return {
                success: false,
                log: `Error: ${error}`
            };
        }
    }

    /**
     * Get Git diff information
     */
    async gitDiff(options?: { staged?: boolean; file?: string }): Promise<{ success: boolean; diff: string }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            let command = 'git diff';
            if (options?.staged) command += ' --cached';
            if (options?.file) command += ` ${options.file}`;

            const result = await this.executeCommand(command, { cwd: workspaceFolders[0].uri.fsPath });
            
            return {
                success: result.exitCode === 0,
                diff: result.stdout
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error getting Git diff: ${error}`);
            return {
                success: false,
                diff: `Error: ${error}`
            };
        }
    }

    /**
     * Get Git remote information
     */
    async gitRemote(): Promise<{ success: boolean; remotes: { name: string; url: string }[] }> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const result = await this.executeCommand('git remote -v', { cwd: workspaceFolders[0].uri.fsPath });
            
            if (result.exitCode !== 0) {
                return {
                    success: false,
                    remotes: []
                };
            }

            const remotes = result.stdout
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [name, url] = line.split('\t');
                    return { name: name.trim(), url: url.split(' ')[0].trim() };
                })
                .filter(remote => remote.name && remote.url);

            return {
                success: true,
                remotes
            };
        } catch (error) {
            this.outputChannel.appendLine(`Error getting Git remotes: ${error}`);
            return {
                success: false,
                remotes: []
            };
        }
    }
}
