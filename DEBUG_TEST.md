# Debug Functionality Test Guide

## Overview
The Duvut Assistant extension now includes comprehensive debugging functionality that logs all Ollama communications and internal operations to the Output window.

## Features Added

### 1. Debug Configuration
- Added `duvut-assistant.debug.enabled` setting in package.json
- Can be toggled via VS Code settings or the command palette

### 2. Centralized Debug Service
- Created `DebugService` class in `src/services/DebugService.ts`
- Singleton pattern ensures consistent logging across all components
- Automatically listens for configuration changes

### 3. Comprehensive Logging
- **Ollama Communications**: All requests and responses to/from Ollama API
- **System Prompts**: All system prompts sent to Ollama
- **Chat Messages**: All user and assistant messages
- **Code Completion**: Detailed logging of AI-powered code completion
- **Webview Operations**: Webview lifecycle and message handling
- **Error Handling**: Detailed error logging with stack traces

### 4. Debug Command
- Added "Toggle Debug Mode" command accessible via Command Palette
- Automatically shows Output window when debug is enabled

## How to Test

### Step 1: Enable Debug Mode
1. Open VS Code Command Palette (`Cmd+Shift+P`)
2. Type "Duvut Assistant: Toggle Debug Mode"
3. Select the command to enable debug mode
4. The Output window should open showing "Duvut Assistant" channel

### Step 2: Test Ollama Communications
1. Open the Duvut Assistant sidebar
2. Send a message to the assistant
3. Check the Output window for detailed logs showing:
   - Function names (e.g., `[_handleChatMessage]`, `[chat]`, `[chatStream]`)
   - System prompts being sent
   - Request/response data to/from Ollama
   - Webview message handling

### Step 3: Test Code Completion
1. Open a code file (JavaScript, TypeScript, Python, etc.)
2. Start typing code
3. Check the Output window for code completion debug logs showing:
   - Context analysis
   - Prompt creation
   - Ollama API calls for completions
   - Suggestion processing

### Step 4: Test Error Scenarios
1. Try using the extension when Ollama is not running
2. Check the Output window for detailed error logging
3. Enable/disable debug mode to see the difference

## Debug Log Format

Each debug message includes:
- **Timestamp**: ISO format timestamp
- **Function Name**: Which function generated the log
- **Message**: Human-readable description
- **Data**: Optional structured data (objects, arrays, etc.)

Example:
```
[2024-01-15T10:30:45.123Z] [_handleChatMessage] Starting new request: req_1705312245123_abc123
[2024-01-15T10:30:45.124Z] [_handleChatMessage] Workspace context retrieved
[2024-01-15T10:30:45.125Z] [chat] System Prompt
[2024-01-15T10:30:45.126Z] [chat] Ollama Request to /api/chat
[2024-01-15T10:30:45.127Z] [chat] Ollama Response from /api/chat
```

## Key Benefits

1. **Complete Visibility**: See exactly what's being sent to and received from Ollama
2. **Function Attribution**: Know which part of the code generated each log message
3. **System Prompt Tracking**: Monitor all system prompts for debugging AI behavior
4. **Error Diagnosis**: Detailed error information for troubleshooting
5. **Performance Monitoring**: Track request/response times and data sizes
6. **Easy Toggle**: Can be enabled/disabled without restarting VS Code

## Files Modified

- `package.json`: Added debug configuration
- `src/services/DebugService.ts`: New centralized debug service
- `src/api/OllamaClient.ts`: Added debug logging to all Ollama API calls
- `src/providers/OllamaProvider.ts`: Added debug logging to webview and chat handling
- `src/services/CodeCompletionService.ts`: Added debug logging to code completion
- `src/commands/registerCommands.ts`: Added toggle debug mode command
- `src/extension.ts`: Initialize debug service

The debugging system is now fully integrated and ready for use!
