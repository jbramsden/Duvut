# Change Log

All notable changes to the "duvut-assistant" extension will be documented in this file.

## [1.0.0] - 2025-01-26

### Added
- Initial release of Duvut Assistant
- Chat interface in VS Code sidebar
- Integration with local Ollama instance
- Context menu actions for code explanation, improvement, and fixing
- Support for multiple Ollama models
- File operations and workspace integration
- Settings configuration for Ollama connection
- Real-time connection status monitoring

### Features
- Explain selected code
- Improve code suggestions
- Fix code issues
- Chat with AI assistant
- Local AI processing for privacy
- Multiple model support

### Commands
- `Duvut Assistant: New Task`
- `Duvut Assistant: Explain Code`
- `Duvut Assistant: Improve Code`
- `Duvut Assistant: Fix Code`
- `Duvut Assistant: Settings`

---

## What Could Still Be Wrong

1. **Request Payload Difference**
   - The extension may be sending a different payload than your curl command (e.g., wrong model, missing/extra fields, or incorrect JSON structure).

2. **Headers**
   - The extension may be missing the `Content-Type: application/json` header (though axios usually sets this).

3. **Base URL or Endpoint**
   - The extension may be using a different base URL or endpoint due to a misconfiguration.

4. **Request Method**
   - The extension must use `POST`, not `GET`.

5. **Trailing Slashes**
   - Sometimes, a trailing slash in the endpoint (e.g., `/api/chat/`) can cause a 404 if the server is strict.

---

## How to Debug Further

### 1. **Log the Full Request in the Extension**

Add a debug log in `OllamaClient.ts` before the axios call in `chatStream`:
```ts
console.log('[DEBUG] POST', this.baseUrl + '/api/chat', JSON.stringify(request));
```

### 2. **Compare the Request from the Extension to Your Curl Command**

- Check the model name, messages array, and all fields.
- Make sure `stream: true` is present.

### 3. **Check for Trailing Slashes**

- Ensure the endpoint is exactly `/api/chat` (not `/api/chat/`).

### 4. **Check the Axios Error Object**

- Log `error.response?.data` in the catch block to see the server's error message.

---

## Example: Add Debug Logging

In `OllamaClient.ts`, in `chatStream`:
```ts
console.log('[DEBUG] POST', this.baseUrl + '/api/chat', JSON.stringify(request));
try {
    const response = await this.client.post('/api/chat', request, {
        responseType: 'stream',
    });
    // ... rest of code ...
} catch (error) {
    console.error('Error in chat stream request:', error.response?.data || error);
    throw error;
}
```

---

## Next Steps

1. Add the debug log to print the full request and error details.
2. Try the extension again and compare the logged request to your working curl command.
3. Share the debug output if the problem persists.

Would you like me to add this debug logging for you?
