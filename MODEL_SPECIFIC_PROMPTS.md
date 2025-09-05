# Model-Specific System Prompts

## Overview
The Duvut Assistant extension now uses model-specific system prompts to optimize performance with different LLMs. This approach addresses the issue where some models (like `qwen2.5-coder:1.5b`) respond as if they don't have access to workspace context, while others (like `llama3.2` and `Deepseek`) work correctly.

## Architecture

### Common Core Prompt
All models receive the same base system prompt containing:
- Company branding and role definition
- Core communication guidelines
- Workspace context structure
- Code recommendation formatting
- File type support
- Debugging guidelines

### Model-Specific Adaptations
Different models receive tailored instructions based on their characteristics:

#### 1. Qwen Models (`qwen`, `coder`)
**Issue**: Tend to respond as if they don't have access to workspace files
**Solution**: Extra explicit instructions about workspace access
```text
**WORKSPACE ACCESS FOR QWEN MODELS**: You have full access to the current workspace and file content. The workspace context provided in the user message contains the actual file content that you can analyze and work with. When a user asks you to review, analyze, or work with code, the code is already available to you in the workspace context. You do NOT need to ask the user to provide the code - it's already there for you to analyze.

**IMPORTANT FOR QWEN**: The workspace context includes the current file content. You can see and analyze the code that is currently open in the editor. Work directly with the code provided in the context.
```

#### 2. Llama Models (`llama`, `meta`)
**Characteristic**: Generally understand context well
**Solution**: Standard workspace access instructions
```text
**WORKSPACE ACCESS**: You have access to the current workspace context, which includes the current file content provided in the user message. When analyzing code, work with the content provided in the workspace context.
```

#### 3. Deepseek Models (`deepseek`, `deep`)
**Characteristic**: Good at following instructions
**Solution**: Concise workspace context instructions
```text
**WORKSPACE CONTEXT**: You can access the current file content through the workspace context provided in the user message. Analyze and work with the code that is available in the context.
```

#### 4. CodeLlama Models (`codellama`, `code`)
**Characteristic**: Code-specific models
**Solution**: Focused on code analysis
```text
**CODE ANALYSIS**: You have access to the current file content through the workspace context. The code you need to analyze is provided in the user message. Work directly with this code.
```

#### 5. Unknown Models
**Fallback**: Default workspace access instructions
```text
**WORKSPACE ACCESS**: You have access to the current file content through the workspace context provided in the user message. When a user asks you to review or analyze code, the code is already available to you in the workspace context.
```

## Implementation Details

### Model Detection
The system detects the model type by checking the model name (case-insensitive) for keywords:
- `qwen` or `coder` → Qwen-specific prompt
- `llama` or `meta` → Llama-specific prompt  
- `deepseek` or `deep` → Deepseek-specific prompt
- `codellama` or `code` → CodeLlama-specific prompt
- Default → Generic prompt

### Debug Logging
Enhanced debug logging shows:
- Which model is being used
- Which model-specific prompt was selected
- System prompt generation process

### Example Debug Output
```
[2025-09-05T15:06:32.318Z] [_getSystemPrompt] Generating system prompt for model
[2025-09-05T15:06:32.318Z] [_getSystemPrompt] Data: {
  "model": "qwen2.5-coder:1.5b",
  "modelLower": "qwen2.5-coder:1.5b"
}
[2025-09-05T15:06:32.319Z] [_getSystemPrompt] Using Qwen-specific prompt
```

## Benefits

1. **Model Optimization**: Each model gets instructions tailored to its behavior patterns
2. **Consistent Experience**: All models should now properly recognize workspace context
3. **Maintainability**: Easy to add new model types or adjust existing ones
4. **Debugging**: Clear visibility into which prompt is being used
5. **Fallback Safety**: Unknown models get a safe default prompt

## Testing

To test the model-specific prompts:

1. **Enable Debug Mode**: Use "Duvut Assistant: Toggle Debug Mode" command
2. **Switch Models**: Change between different models in the extension
3. **Test Code Review**: Ask "Review the code" with a file open
4. **Check Debug Logs**: Verify the correct model-specific prompt is being used

## Future Enhancements

- Add more model-specific optimizations based on user feedback
- Implement model-specific temperature and parameter adjustments
- Add model-specific code completion strategies
- Create model performance analytics

## Files Modified

- `src/providers/OllamaProvider.ts`: Updated `_getSystemPrompt()` method with model-specific logic
- Enhanced debug logging throughout the system prompt generation process

This approach ensures that each LLM gets the most effective instructions for working with the Duvut Assistant extension, providing a consistent and reliable experience regardless of the model chosen.
