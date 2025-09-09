import * as vscode from 'vscode';
import { TestService, TestSuite, TestResult, ModelTestSummary } from '../services/TestService';
import { OllamaClient, OllamaModel } from '../api/OllamaClient';

export class TestProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'duvut-assistant.TestProvider';
    private _view?: vscode.WebviewView;
    private testService: TestService;
    private ollamaClient: OllamaClient;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel
    ) {
        this.testService = TestService.getInstance(outputChannel);
        this.ollamaClient = new OllamaClient(outputChannel);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'getTestSuites':
                        this.sendTestSuites();
                        break;
                    case 'getAvailableModels':
                        this.sendAvailableModels();
                        break;
                    case 'runTestSuite':
                        this.runTestSuite(message.suiteId, message.modelName);
                        break;
                    case 'runAllTests':
                        this.runAllTests();
                        break;
                    case 'getTestResults':
                        this.sendTestResults(message.modelName);
                        break;
                    case 'clearResults':
                        this.clearTestResults();
                        break;
                    case 'showOutput':
                        this.outputChannel.show();
                        break;
                }
            }
        );

        // Send initial data
        this.sendTestSuites();
        this.sendAvailableModels();
    }

    private async sendTestSuites() {
        if (!this._view) return;

        const testSuites = this.testService.getTestSuites();
        this._view.webview.postMessage({
            command: 'testSuites',
            data: testSuites
        });
    }

    private async sendAvailableModels() {
        if (!this._view) return;

        try {
            const models = await this.testService.getAvailableModels();
            this._view.webview.postMessage({
                command: 'availableModels',
                data: models
            });
        } catch (error) {
            this._view.webview.postMessage({
                command: 'error',
                message: `Failed to get available models: ${error}`
            });
        }
    }

    private async runTestSuite(suiteId: string, modelName: string) {
        if (!this._view) return;

        this._view.webview.postMessage({
            command: 'testStarted',
            suiteId,
            modelName
        });

        try {
            const results = await this.testService.runTestSuite(suiteId, modelName);
            this._view.webview.postMessage({
                command: 'testSuiteCompleted',
                suiteId,
                modelName,
                results
            });
        } catch (error) {
            this._view.webview.postMessage({
                command: 'error',
                message: `Failed to run test suite: ${error}`
            });
        }
    }

    private async runAllTests() {
        if (!this._view) return;

        this._view.webview.postMessage({
            command: 'allTestsStarted'
        });

        try {
            const summaries = await this.testService.runAllTests();
            this._view.webview.postMessage({
                command: 'allTestsCompleted',
                summaries: Array.from(summaries.entries())
            });
        } catch (error) {
            this._view.webview.postMessage({
                command: 'error',
                message: `Failed to run all tests: ${error}`
            });
        }
    }

    private async sendTestResults(modelName?: string) {
        if (!this._view) return;

        try {
            const results = modelName 
                ? this.testService.getTestResults(modelName)
                : Array.from(this.testService.getAllTestResults().values()).flat();
            
            this._view.webview.postMessage({
                command: 'testResults',
                data: results
            });
        } catch (error) {
            this._view.webview.postMessage({
                command: 'error',
                message: `Failed to get test results: ${error}`
            });
        }
    }

    private clearTestResults() {
        if (!this._view) return;

        this.testService.clearTestResults();
        this._view.webview.postMessage({
            command: 'resultsCleared'
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Duvut Assistant - Tool Testing</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
            line-height: 1.4;
        }

        .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header h2 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
        }

        .section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .section h3 {
            margin: 0 0 15px 0;
            color: var(--vscode-textLink-foreground);
        }

        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
            font-size: var(--vscode-font-size);
        }

        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }

        .button.danger {
            background-color: var(--vscode-errorForeground);
        }

        .button.danger:hover {
            background-color: var(--vscode-errorForeground);
            opacity: 0.8;
        }

        .select {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 6px 10px;
            margin: 5px;
            border-radius: 4px;
            font-size: var(--vscode-font-size);
        }

        .test-suite {
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .test-suite h4 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
        }

        .test-suite p {
            margin: 0 0 10px 0;
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }

        .test-list {
            margin-left: 20px;
        }

        .test-item {
            margin: 5px 0;
            padding: 5px;
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-panel-border);
        }

        .test-item h5 {
            margin: 0 0 5px 0;
            color: var(--vscode-foreground);
        }

        .test-item p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 0.85em;
        }

        .model-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 10px 0;
        }

        .model-item {
            padding: 8px 12px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 0.9em;
        }

        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-weight: bold;
        }

        .status.loading {
            background-color: var(--vscode-progressBar-background);
            color: var(--vscode-progressBar-foreground);
        }

        .status.success {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-foreground);
        }

        .status.error {
            background-color: var(--vscode-testing-iconFailed);
            color: var(--vscode-foreground);
        }

        .results {
            margin-top: 20px;
        }

        .result-item {
            margin: 10px 0;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .result-item.success {
            border-left: 4px solid var(--vscode-testing-iconPassed);
        }

        .result-item.failed {
            border-left: 4px solid var(--vscode-testing-iconFailed);
        }

        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .result-title {
            font-weight: bold;
            color: var(--vscode-foreground);
        }

        .result-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }

        .result-status.passed {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-foreground);
        }

        .result-status.failed {
            background-color: var(--vscode-testing-iconFailed);
            color: var(--vscode-foreground);
        }

        .result-details {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        .result-response {
            margin-top: 10px;
            padding: 10px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.85em;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }

        .summary {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .summary h3 {
            margin: 0 0 15px 0;
            color: var(--vscode-textLink-foreground);
        }

        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .stat-item {
            text-align: center;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }

        .stat-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        .hidden {
            display: none;
        }

        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-panel-border);
            border-radius: 50%;
            border-top-color: var(--vscode-progressBar-foreground);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🔧 Tool Testing Facility</h2>
        <p>Test tool compatibility across different LLMs in Ollama</p>
    </div>

    <div class="section">
        <h3>Available Models</h3>
        <div id="modelList" class="model-list">
            <div class="loading-spinner"></div>
            <span>Loading models...</span>
        </div>
    </div>

    <div class="section">
        <h3>Test Suites</h3>
        <div id="testSuites">
            <div class="loading-spinner"></div>
            <span>Loading test suites...</span>
        </div>
    </div>

    <div class="section">
        <h3>Test Controls</h3>
        <div>
            <button class="button" id="runAllTests">Run All Tests</button>
            <button class="button" id="clearResults">Clear Results</button>
            <button class="button" id="showOutput">Show Output</button>
        </div>
        <div id="status" class="status hidden"></div>
    </div>

    <div id="results" class="results hidden">
        <div class="section">
            <h3>Test Results</h3>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        let testSuites = [];
        let availableModels = [];
        let currentResults = [];

        // Message handling
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'testSuites':
                    testSuites = message.data;
                    renderTestSuites();
                    break;
                case 'availableModels':
                    availableModels = message.data;
                    renderModels();
                    break;
                case 'testStarted':
                    showStatus('Running tests...', 'loading');
                    break;
                case 'testSuiteCompleted':
                    showStatus('Test suite completed', 'success');
                    break;
                case 'allTestsStarted':
                    showStatus('Running all tests...', 'loading');
                    break;
                case 'allTestsCompleted':
                    showStatus('All tests completed', 'success');
                    currentResults = message.summaries;
                    renderResults();
                    break;
                case 'testResults':
                    currentResults = message.data;
                    renderResults();
                    break;
                case 'resultsCleared':
                    currentResults = [];
                    hideResults();
                    showStatus('Results cleared', 'success');
                    break;
                case 'error':
                    showStatus(message.message, 'error');
                    break;
            }
        });

        function renderModels() {
            const modelList = document.getElementById('modelList');
            if (availableModels.length === 0) {
                modelList.innerHTML = '<span style="color: var(--vscode-errorForeground);">No models available. Make sure Ollama is running.</span>';
                return;
            }

            modelList.innerHTML = availableModels.map(model => 
                \`<div class="model-item">\${model.name}</div>\`
            ).join('');
        }

        function renderTestSuites() {
            const testSuitesDiv = document.getElementById('testSuites');
            testSuitesDiv.innerHTML = testSuites.map(suite => \`
                <div class="test-suite">
                    <h4>\${suite.name}</h4>
                    <p>\${suite.description}</p>
                    <div class="test-list">
                        \${suite.tests.map(test => \`
                            <div class="test-item">
                                <h5>\${test.name}</h5>
                                <p>\${test.description}</p>
                            </div>
                        \`).join('')}
                    </div>
                    <div>
                        \${availableModels.map(model => \`
                            <button class="button" onclick="runTestSuite('\${suite.id}', '\${model.name}')">
                                Test with \${model.name}
                            </button>
                        \`).join('')}
                    </div>
                </div>
            \`).join('');
        }

        function renderResults() {
            const resultsDiv = document.getElementById('results');
            const resultsContent = document.getElementById('resultsContent');
            
            if (currentResults.length === 0) {
                resultsContent.innerHTML = '<p>No test results available.</p>';
                resultsDiv.classList.remove('hidden');
                return;
            }

            // Check if we have summaries (from runAllTests) or individual results
            if (currentResults[0] && currentResults[0][1] && currentResults[0][1].totalTests !== undefined) {
                // This is a summary format
                resultsContent.innerHTML = currentResults.map(([modelName, summary]) => \`
                    <div class="summary">
                        <h3>\${modelName}</h3>
                        <div class="summary-stats">
                            <div class="stat-item">
                                <div class="stat-value">\${summary.totalTests}</div>
                                <div class="stat-label">Total Tests</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" style="color: var(--vscode-testing-iconPassed);">\${summary.passedTests}</div>
                                <div class="stat-label">Passed</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" style="color: var(--vscode-testing-iconFailed);">\${summary.failedTests}</div>
                                <div class="stat-label">Failed</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">\${Math.round(summary.averageExecutionTime)}ms</div>
                                <div class="stat-label">Avg Time</div>
                            </div>
                        </div>
                        \${summary.recommendedSystemPrompt ? \`
                            <div style="margin-top: 15px; padding: 10px; background-color: var(--vscode-textCodeBlock-background); border-radius: 4px;">
                                <strong>Recommended System Prompt:</strong><br>
                                <code>\${summary.recommendedSystemPrompt}</code>
                            </div>
                        \` : ''}
                        <div style="margin-top: 15px;">
                            \${summary.results.map(result => \`
                                <div class="result-item \${result.success ? 'success' : 'failed'}">
                                    <div class="result-header">
                                        <div class="result-title">\${result.testId}</div>
                                        <div class="result-status \${result.success ? 'passed' : 'failed'}">
                                            \${result.success ? 'PASSED' : 'FAILED'}
                                        </div>
                                    </div>
                                    <div class="result-details">
                                        <strong>Execution Time:</strong> \${result.executionTime}ms<br>
                                        <strong>Timestamp:</strong> \${new Date(result.timestamp).toLocaleString()}
                                        \${result.error ? \`<br><strong>Error:</strong> \${result.error}\` : ''}
                                    </div>
                                    <div class="result-response">\${result.response}</div>
                                </div>
                            \`).join('')}
                        </div>
                    </div>
                \`).join('');
            } else {
                // This is individual results format
                resultsContent.innerHTML = currentResults.map(result => \`
                    <div class="result-item \${result.success ? 'success' : 'failed'}">
                        <div class="result-header">
                            <div class="result-title">\${result.testId} (\${result.modelName})</div>
                            <div class="result-status \${result.success ? 'passed' : 'failed'}">
                                \${result.success ? 'PASSED' : 'FAILED'}
                            </div>
                        </div>
                        <div class="result-details">
                            <strong>Execution Time:</strong> \${result.executionTime}ms<br>
                            <strong>Timestamp:</strong> \${new Date(result.timestamp).toLocaleString()}
                            \${result.error ? \`<br><strong>Error:</strong> \${result.error}\` : ''}
                        </div>
                        <div class="result-response">\${result.response}</div>
                    </div>
                \`).join('');
            }
            
            resultsDiv.classList.remove('hidden');
        }

        function showStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.textContent = message;
            statusDiv.className = \`status \${type}\`;
            statusDiv.classList.remove('hidden');
            
            if (type === 'success') {
                setTimeout(() => {
                    statusDiv.classList.add('hidden');
                }, 3000);
            }
        }

        function hideResults() {
            document.getElementById('results').classList.add('hidden');
        }

        function runTestSuite(suiteId, modelName) {
            vscode.postMessage({
                command: 'runTestSuite',
                suiteId: suiteId,
                modelName: modelName
            });
        }

        // Event listeners
        document.getElementById('runAllTests').addEventListener('click', () => {
            vscode.postMessage({ command: 'runAllTests' });
        });

        document.getElementById('clearResults').addEventListener('click', () => {
            vscode.postMessage({ command: 'clearResults' });
        });

        document.getElementById('showOutput').addEventListener('click', () => {
            vscode.postMessage({ command: 'showOutput' });
        });

        // Initialize
        vscode.postMessage({ command: 'getTestSuites' });
        vscode.postMessage({ command: 'getAvailableModels' });
    </script>
</body>
</html>`;
    }
}
