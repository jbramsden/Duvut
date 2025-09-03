# Bug Fixes for Duvut Assistant

## Issues Fixed

### 1. Code Recommendation State Management Issue

**Problem**: When multiple code recommendations were generated in sequence without accepting/rejecting the first one, only the first recommendation was applied instead of the intended one.

**Root Cause**: The system didn't properly track which recommendations belonged to which request, causing confusion when multiple requests were made.

**Solution**: 
- Added unique request ID generation for each chat message
- Implemented a `pendingRecommendations` Map to track recommendations per request
- Updated the webview to pass request IDs when applying/rejecting changes
- Added cleanup methods to prevent memory leaks

**Code Changes**:
- Added `pendingRecommendations: Map<string, Array<{filePath: string, code: string, language?: string}>>` to OllamaProvider
- Added `currentRequestId: string` to track the current request
- Updated `_handleChatMessage` to generate unique request IDs
- Modified `_promptForCodeApplication` to accept and store request IDs
- Updated webview message handling to include request IDs

### 2. Invalid File Path Creation Issue

**Problem**: The system was incorrectly parsing malformed tool calls like `<open_file>_hello_server.py<` and `<read_file>curl http:/localhost:8000<` as file paths, creating directories and files with these invalid names.

**Root Cause**: Insufficient validation of tool call formats and file paths before processing them.

**Solution**:
- Enhanced file path validation to reject paths containing tool call markers
- Added tool call format validation before processing
- Improved detection of URLs, commands, and other invalid content in file paths
- Added validation in tool call processing methods

**Code Changes**:
- Enhanced `_isValidFilePath` method to detect tool call markers, URLs, and commands
- Added `_isValidToolCall` method to validate tool call format
- Updated `_processToolCall` to validate tool calls before processing
- Added validation in file handling methods

### 3. Memory Leak Prevention

**Problem**: Pending recommendations could accumulate indefinitely, potentially causing memory issues.

**Solution**:
- Added automatic cleanup of old recommendations (30+ minutes old)
- Added manual cleanup commands for debugging
- Clear recommendations when chat is cleared

**Code Changes**:
- Added `_cleanupOldRecommendations` method
- Added `clearPendingRecommendations` public method
- Updated `_clearChat` to clean up recommendations
- Added debug commands for managing recommendations

## New Commands Added

- `duvut-assistant.showPendingRecommendations` - Display current pending recommendations in output channel
- `duvut-assistant.clearPendingRecommendations` - Clear all pending recommendations
- `duvut-assistant.testToolCallValidation` - Test tool call validation logic

## Testing

To test the fixes:

1. **Test Code Recommendation Tracking**:
   - Make multiple requests that generate code recommendations
   - Accept/reject recommendations in different orders
   - Verify that the correct recommendations are applied

2. **Test File Path Validation**:
   - Try to create files with invalid names (containing tool call markers, URLs, etc.)
   - Verify that invalid paths are rejected

3. **Test Memory Management**:
   - Use the new debug commands to monitor pending recommendations
   - Verify that old recommendations are cleaned up automatically

## Technical Details

### Request ID Format
Request IDs follow the format: `req_timestamp_randomstring`
- `timestamp`: Unix timestamp in milliseconds
- `randomstring`: 9-character random string for uniqueness

### Validation Rules
- File paths must not contain `<`, `>`, or tool call markers
- File paths must not contain URLs or commands
- Tool calls must have proper opening and closing tags
- Tool call content must not be empty

### Cleanup Strategy
- Automatic cleanup runs every 30 minutes
- Manual cleanup available through commands
- Cleanup on chat clear
- Cleanup after applying/rejecting recommendations
