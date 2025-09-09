# Duvut Assistant Tool Testing Facility

## Overview

The Tool Testing Facility is a comprehensive testing system built into the Duvut Assistant extension that allows you to test each tool against all available LLMs in Ollama. This helps identify which LLMs need specific system prompting to work correctly with different tools.

## Features

### 🔧 **Comprehensive Tool Testing**
- Test all available tools against every LLM in your Ollama installation
- Identify which models work best with specific tools
- Discover which models need custom system prompts

### 📊 **Detailed Reporting**
- Real-time test execution with progress tracking
- Comprehensive test results with pass/fail status
- Execution time analysis for performance optimization
- Model-specific recommendations for system prompts

### 💾 **Persistent Storage**
- Automatic storage of all test results
- Test history tracking over time
- Export capabilities (JSON, CSV, HTML formats)
- Statistical analysis and trends

### 🎯 **Flexible Testing**
- Run individual test suites
- Test specific models
- Quick test runs for rapid feedback
- Comprehensive test runs across all models

## Getting Started

### 1. Access the Testing Facility

The Tool Testing panel is available in the Duvut Assistant sidebar. You can access it by:

- Opening the Duvut Assistant sidebar
- Clicking on the "Tool Testing" tab
- Or using the command palette: `Duvut Assistant: Open Tool Testing`

### 2. Available Commands

| Command | Description |
|---------|-------------|
| `Duvut Assistant: Open Tool Testing` | Opens the Tool Testing panel |
| `Duvut Assistant: Run All Tool Tests` | Runs all test suites against all models |
| `Duvut Assistant: Run Quick Tool Test` | Runs a quick test with the first available model |
| `Duvut Assistant: Show Test Results` | Displays a summary of test results |
| `Duvut Assistant: Export Test Results` | Exports test results to file |
| `Duvut Assistant: Show Test Statistics` | Shows comprehensive test statistics |

## Test Suites

The testing facility includes several pre-built test suites:

### 📁 **File Operations**
- **Read File Test**: Tests reading files from the workspace
- **Write File Test**: Tests creating and writing files
- **List Files Test**: Tests listing directory contents

### 🔍 **Code Analysis**
- **Validate Code Test**: Tests code validation and linting
- **Get Diagnostics Test**: Tests getting linting diagnostics

### 🏢 **Workspace Operations**
- **Workspace Info Test**: Tests getting workspace information
- **Search Workspace Test**: Tests searching for text in files

## Understanding Test Results

### Test Result Structure

Each test result includes:
- **Test ID**: Unique identifier for the test
- **Model Name**: The LLM that was tested
- **Success Status**: Whether the test passed or failed
- **Response**: The actual response from the LLM
- **Execution Time**: How long the test took to run
- **Validation Details**: Why the test passed or failed

### Success Criteria

Tests are validated based on:
- **Response Quality**: Does the LLM provide a relevant response?
- **Tool Usage**: Does the LLM attempt to use the appropriate tool?
- **Content Analysis**: Does the response contain expected keywords or patterns?

## System Prompt Recommendations

The testing facility analyzes successful test runs to recommend optimal system prompts for each model. These recommendations help improve tool usage across different LLMs.

### Example System Prompt

```
You are a helpful assistant that can use various tools to help users. You have access to a readFile tool that can read files from the workspace. Use it when asked to read or examine file contents.

When using tools, be direct and efficient. Focus on the task at hand and provide clear, actionable responses.
```

## Adding New Tests

### Creating Custom Test Suites

You can extend the testing facility by adding new test suites:

```typescript
const customSuite: TestSuite = {
    id: 'custom-suite',
    name: 'Custom Tests',
    description: 'Custom test suite for specific tools',
    tests: [
        {
            id: 'custom-test',
            name: 'Custom Test',
            description: 'Test description',
            toolFunction: 'toolName',
            testPrompt: 'Test prompt for the LLM',
            expectedBehavior: 'What should happen',
            validationCriteria: (response: string) => {
                return response.includes('expected content');
            },
            systemPrompt: 'Custom system prompt for this test',
            timeout: 10000
        }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
};
```

### Validation Criteria

Validation criteria are functions that determine if a test passes:

```typescript
validationCriteria: (response: string, toolResult?: any) => {
    // Check if response contains expected content
    const hasExpectedContent = response.toLowerCase().includes('expected');
    
    // Check if tool was used successfully
    const toolUsedSuccessfully = toolResult && toolResult.success;
    
    return hasExpectedContent && toolUsedSuccessfully;
}
```

## Exporting Results

### Available Formats

1. **JSON**: Machine-readable format for further analysis
2. **CSV**: Spreadsheet-compatible format for data analysis
3. **HTML**: Human-readable report with charts and statistics

### Export Contents

- Test execution history
- Model performance statistics
- Success rates and trends
- Recommended system prompts
- Environment information

## Best Practices

### 1. Regular Testing
- Run tests after adding new tools
- Test when adding new LLM models
- Re-test after updating system prompts

### 2. Model Selection
- Test with models you plan to use in production
- Include both fast and high-quality models
- Test edge cases with different model sizes

### 3. System Prompt Optimization
- Use recommended system prompts as starting points
- Customize prompts based on specific use cases
- Test prompt variations to find optimal configurations

### 4. Performance Monitoring
- Monitor execution times for performance optimization
- Track success rates over time
- Identify models that consistently perform well

## Troubleshooting

### Common Issues

**No Models Available**
- Ensure Ollama is running
- Check that models are installed (`ollama list`)
- Verify Ollama connection settings

**Tests Failing**
- Check if tools are properly implemented
- Verify system prompts are appropriate
- Review validation criteria

**Slow Test Execution**
- Use faster models for quick testing
- Reduce test timeout values
- Run tests in smaller batches

### Debug Mode

Enable debug mode to get detailed logging:
1. Open VS Code settings
2. Search for "Duvut Assistant"
3. Enable "Debug Mode"
4. Check the Output panel for detailed logs

## Architecture

### Core Components

- **TestService**: Manages test execution and results
- **TestProvider**: Webview interface for the testing panel
- **TestResultsStorage**: Persistent storage and export functionality
- **OllamaClient**: Communication with Ollama API

### Data Flow

1. User initiates test via UI or command
2. TestService discovers available models
3. Tests are executed against each model
4. Results are validated and stored
5. UI is updated with results
6. Data is persisted for future reference

## Future Enhancements

- **Automated Testing**: Scheduled test runs
- **CI/CD Integration**: Automated testing in development workflows
- **Advanced Analytics**: Machine learning-based model recommendations
- **Custom Test Creation**: UI for creating tests without code
- **Performance Benchmarking**: Detailed performance analysis

## Contributing

To contribute to the testing facility:

1. Add new test suites in `TestService.ts`
2. Extend validation criteria as needed
3. Improve the UI in `TestProvider.ts`
4. Add new export formats in `TestResultsStorage.ts`

## Support

For issues or questions about the testing facility:
- Check the Output panel for detailed logs
- Review the test validation criteria
- Ensure Ollama is properly configured
- Verify all required models are installed

