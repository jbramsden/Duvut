import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TestResult, ModelTestSummary } from './TestService';

export interface TestReport {
    id: string;
    timestamp: Date;
    totalModels: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    overallSuccessRate: number;
    modelSummaries: ModelTestSummary[];
    duration: number;
    environment: {
        extensionVersion: string;
        vscodeVersion: string;
        platform: string;
        ollamaBaseUrl: string;
    };
}

export interface TestHistoryEntry {
    id: string;
    timestamp: Date;
    testType: 'single' | 'suite' | 'all';
    modelName?: string;
    suiteId?: string;
    results: TestResult[];
    summary?: string;
}

export class TestResultsStorage {
    private static instance: TestResultsStorage;
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private testHistory: TestHistoryEntry[] = [];
    private reports: TestReport[] = [];

    private constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.loadStoredData();
    }

    public static getInstance(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): TestResultsStorage {
        if (!TestResultsStorage.instance) {
            TestResultsStorage.instance = new TestResultsStorage(context, outputChannel);
        }
        return TestResultsStorage.instance;
    }

    /**
     * Store test results from a single test run
     */
    public async storeTestResults(
        testType: 'single' | 'suite' | 'all',
        results: TestResult[],
        modelName?: string,
        suiteId?: string
    ): Promise<string> {
        const entry: TestHistoryEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            testType,
            modelName,
            suiteId,
            results,
            summary: this.generateSummary(results, modelName, suiteId)
        };

        this.testHistory.push(entry);
        await this.saveTestHistory();

        this.outputChannel.appendLine(`Stored ${results.length} test results (${entry.id})`);
        return entry.id;
    }

    /**
     * Store a comprehensive test report
     */
    public async storeTestReport(summaries: Map<string, ModelTestSummary>, duration: number): Promise<string> {
        const totalTests = Array.from(summaries.values()).reduce((sum, s) => sum + s.totalTests, 0);
        const totalPassed = Array.from(summaries.values()).reduce((sum, s) => sum + s.passedTests, 0);
        const totalFailed = totalTests - totalPassed;
        const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

        const report: TestReport = {
            id: this.generateId(),
            timestamp: new Date(),
            totalModels: summaries.size,
            totalTests,
            totalPassed,
            totalFailed,
            overallSuccessRate,
            modelSummaries: Array.from(summaries.values()),
            duration,
            environment: await this.getEnvironmentInfo()
        };

        this.reports.push(report);
        await this.saveReports();

        this.outputChannel.appendLine(`Stored comprehensive test report (${report.id})`);
        return report.id;
    }

    /**
     * Get test history
     */
    public getTestHistory(): TestHistoryEntry[] {
        return [...this.testHistory];
    }

    /**
     * Get test reports
     */
    public getTestReports(): TestReport[] {
        return [...this.reports];
    }

    /**
     * Get the latest test report
     */
    public getLatestReport(): TestReport | undefined {
        return this.reports.length > 0 ? this.reports[this.reports.length - 1] : undefined;
    }

    /**
     * Get test results for a specific model
     */
    public getModelResults(modelName: string): TestResult[] {
        const allResults: TestResult[] = [];
        for (const entry of this.testHistory) {
            if (entry.modelName === modelName) {
                allResults.push(...entry.results);
            }
        }
        return allResults;
    }

    /**
     * Get test results for a specific suite
     */
    public getSuiteResults(suiteId: string): TestResult[] {
        const allResults: TestResult[] = [];
        for (const entry of this.testHistory) {
            if (entry.suiteId === suiteId) {
                allResults.push(...entry.results);
            }
        }
        return allResults;
    }

    /**
     * Export test results to a file
     */
    public async exportResults(format: 'json' | 'csv' | 'html', includeHistory: boolean = true): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `duvut-test-results-${timestamp}.${format}`;
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }

        const exportPath = path.join(workspaceFolders[0].uri.fsPath, filename);

        let content: string;
        switch (format) {
            case 'json':
                content = this.exportToJson(includeHistory);
                break;
            case 'csv':
                content = this.exportToCsv(includeHistory);
                break;
            case 'html':
                content = this.exportToHtml(includeHistory);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        await fs.writeFile(exportPath, content, 'utf-8');
        this.outputChannel.appendLine(`Exported test results to: ${exportPath}`);
        
        return exportPath;
    }

    /**
     * Clear all stored data
     */
    public async clearAllData(): Promise<void> {
        this.testHistory = [];
        this.reports = [];
        await this.saveTestHistory();
        await this.saveReports();
        this.outputChannel.appendLine('All test data cleared');
    }

    /**
     * Get statistics about test performance
     */
    public getTestStatistics(): {
        totalTestRuns: number;
        totalTests: number;
        averageSuccessRate: number;
        mostTestedModel: string;
        leastTestedModel: string;
        averageExecutionTime: number;
        testTrends: Array<{ date: string; successRate: number; testCount: number }>;
    } {
        const totalTestRuns = this.testHistory.length;
        const allResults = this.testHistory.flatMap(entry => entry.results);
        const totalTests = allResults.length;
        
        const successRate = totalTests > 0 ? (allResults.filter(r => r.success).length / totalTests) * 100 : 0;
        
        // Model usage statistics
        const modelUsage = new Map<string, number>();
        for (const entry of this.testHistory) {
            if (entry.modelName) {
                modelUsage.set(entry.modelName, (modelUsage.get(entry.modelName) || 0) + entry.results.length);
            }
        }
        
        const mostTestedModel = modelUsage.size > 0 
            ? Array.from(modelUsage.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : 'N/A';
        const leastTestedModel = modelUsage.size > 0 
            ? Array.from(modelUsage.entries()).reduce((a, b) => a[1] < b[1] ? a : b)[0]
            : 'N/A';
        
        const averageExecutionTime = allResults.length > 0 
            ? allResults.reduce((sum, r) => sum + r.executionTime, 0) / allResults.length
            : 0;
        
        // Test trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentEntries = this.testHistory.filter(entry => entry.timestamp >= thirtyDaysAgo);
        const trends = this.calculateTrends(recentEntries);
        
        return {
            totalTestRuns,
            totalTests,
            averageSuccessRate: successRate,
            mostTestedModel,
            leastTestedModel,
            averageExecutionTime,
            testTrends: trends
        };
    }

    /**
     * Load stored data from extension storage
     */
    private async loadStoredData(): Promise<void> {
        try {
            // Load test history
            const historyData = this.context.globalState.get<TestHistoryEntry[]>('duvut.testHistory', []);
            this.testHistory = historyData.map(entry => ({
                ...entry,
                timestamp: new Date(entry.timestamp)
            }));

            // Load reports
            const reportsData = this.context.globalState.get<TestReport[]>('duvut.testReports', []);
            this.reports = reportsData.map(report => ({
                ...report,
                timestamp: new Date(report.timestamp),
                modelSummaries: report.modelSummaries.map(summary => ({
                    ...summary,
                    results: summary.results.map(result => ({
                        ...result,
                        timestamp: new Date(result.timestamp)
                    }))
                }))
            }));

            this.outputChannel.appendLine(`Loaded ${this.testHistory.length} test history entries and ${this.reports.length} reports`);
        } catch (error) {
            this.outputChannel.appendLine(`Error loading stored test data: ${error}`);
        }
    }

    /**
     * Save test history to extension storage
     */
    private async saveTestHistory(): Promise<void> {
        try {
            await this.context.globalState.update('duvut.testHistory', this.testHistory);
        } catch (error) {
            this.outputChannel.appendLine(`Error saving test history: ${error}`);
        }
    }

    /**
     * Save reports to extension storage
     */
    private async saveReports(): Promise<void> {
        try {
            await this.context.globalState.update('duvut.testReports', this.reports);
        } catch (error) {
            this.outputChannel.appendLine(`Error saving test reports: ${error}`);
        }
    }

    /**
     * Generate a unique ID
     */
    private generateId(): string {
        return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate a summary for test results
     */
    private generateSummary(results: TestResult[], modelName?: string, suiteId?: string): string {
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        
        let summary = `${passed}/${total} tests passed (${successRate}%)`;
        if (modelName) summary += ` with ${modelName}`;
        if (suiteId) summary += ` in ${suiteId}`;
        
        return summary;
    }

    /**
     * Get environment information
     */
    private async getEnvironmentInfo(): Promise<TestReport['environment']> {
        const config = vscode.workspace.getConfiguration('duvut-assistant');
        return {
            extensionVersion: this.context.extension.packageJSON.version,
            vscodeVersion: vscode.version,
            platform: process.platform,
            ollamaBaseUrl: config.get('ollamaBaseUrl', 'http://localhost:11434')
        };
    }

    /**
     * Export data to JSON format
     */
    private exportToJson(includeHistory: boolean): string {
        const data = {
            exportTimestamp: new Date().toISOString(),
            reports: this.reports,
            ...(includeHistory && { history: this.testHistory }),
            statistics: this.getTestStatistics()
        };
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * Export data to CSV format
     */
    private exportToCsv(includeHistory: boolean): string {
        let csv = 'Test ID,Model,Suite,Test Name,Success,Execution Time (ms),Timestamp,Response\n';
        
        for (const entry of this.testHistory) {
            for (const result of entry.results) {
                const row = [
                    result.testId,
                    result.modelName,
                    entry.suiteId || '',
                    result.testId,
                    result.success ? 'PASS' : 'FAIL',
                    result.executionTime,
                    result.timestamp.toISOString(),
                    `"${result.response.replace(/"/g, '""')}"`
                ].join(',');
                csv += row + '\n';
            }
        }
        
        return csv;
    }

    /**
     * Export data to HTML format
     */
    private exportToHtml(includeHistory: boolean): string {
        const stats = this.getTestStatistics();
        const latestReport = this.getLatestReport();
        
        return `<!DOCTYPE html>
<html>
<head>
    <title>Duvut Assistant Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .stat-label { color: #666; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .results-table th { background-color: #f2f2f2; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Duvut Assistant Test Results</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${stats.totalTestRuns}</div>
            <div class="stat-label">Total Test Runs</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.totalTests}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${Math.round(stats.averageSuccessRate)}%</div>
            <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${Math.round(stats.averageExecutionTime)}ms</div>
            <div class="stat-label">Avg Execution Time</div>
        </div>
    </div>
    
    ${latestReport ? `
    <h2>Latest Test Report</h2>
    <p><strong>Date:</strong> ${latestReport.timestamp.toLocaleString()}</p>
    <p><strong>Models Tested:</strong> ${latestReport.totalModels}</p>
    <p><strong>Overall Success Rate:</strong> ${Math.round(latestReport.overallSuccessRate)}%</p>
    ` : ''}
    
    ${includeHistory ? `
    <h2>Test History</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Model</th>
                <th>Suite</th>
                <th>Results</th>
                <th>Summary</th>
            </tr>
        </thead>
        <tbody>
            ${this.testHistory.map(entry => `
                <tr>
                    <td>${entry.timestamp.toLocaleString()}</td>
                    <td>${entry.testType}</td>
                    <td>${entry.modelName || 'N/A'}</td>
                    <td>${entry.suiteId || 'N/A'}</td>
                    <td>${entry.results.length}</td>
                    <td>${entry.summary || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}
</body>
</html>`;
    }

    /**
     * Calculate test trends
     */
    private calculateTrends(entries: TestHistoryEntry[]): Array<{ date: string; successRate: number; testCount: number }> {
        const trends = new Map<string, { total: number; passed: number; count: number }>();
        
        for (const entry of entries) {
            const date = entry.timestamp.toISOString().split('T')[0];
            const current = trends.get(date) || { total: 0, passed: 0, count: 0 };
            
            current.total += entry.results.length;
            current.passed += entry.results.filter(r => r.success).length;
            current.count += 1;
            
            trends.set(date, current);
        }
        
        return Array.from(trends.entries())
            .map(([date, data]) => ({
                date,
                successRate: data.total > 0 ? (data.passed / data.total) * 100 : 0,
                testCount: data.total
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
}

