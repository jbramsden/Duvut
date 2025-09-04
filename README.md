![Duvut logo <.>](https://github.com/jbramsden/duvut/assets/icon.png?raw=true)
# Duvut Assistant

An AI-powered autonomous coding assistant for VS Code that uses Duvut for local AI inference. Developed by [DVT](https://www.dvtsoftware.com) 


## Features

- **Local AI Processing**: Uses Ollama for completely local AI inference, keeping your code private
- **Chat Interface**: Interactive chat interface in the VS Code sidebar
- **Code Analysis**: Explain, improve, and fix selected code
- **File Operations**: Read and write files in your workspace
- **Multiple Models**: Support for various Ollama models (Llama, CodeLlama, etc.)
- **Smart Tools**: Integrated file operations and workspace interactions

## Prerequisites

1. **Install Ollama**: Download and install Ollama from [ollama.ai](https://ollama.ai/)
2. **Pull a model**: Run `ollama pull llama3.2` (or any other model you prefer)
3. **Start Ollama**: Ensure Ollama is running (`ollama serve`)

## Installation

1. Install the extension from the VS Code marketplace
2. Configure the Ollama settings in VS Code preferences
3. Start chatting with your AI assistant!

## Configuration

Open VS Code settings and configure:

- `ollama-assistant.ollamaBaseUrl`: Base URL for Ollama API (default: `http://localhost:11434`)
- `ollama-assistant.modelId`: Model to use (default: `llama3.2`)
- `ollama-assistant.temperature`: Response creativity (0-2, default: 0.1)
- `ollama-assistant.maxTokens`: Maximum response length (default: 4000)

## Usage

### Chat Interface

1. Open the Ollama Assistant sidebar
2. Type your questions or requests in the chat input
3. Get AI-powered responses for coding help

### Context Menu Actions

Right-click on selected code to:
- **Explain Code**: Get detailed explanations of what the code does
- **Improve Code**: Get suggestions for code improvements
- **Fix Code**: Get help fixing bugs or issues

### Commands

- `Ollama Assistant: New Task` - Start a new conversation
- `Ollama Assistant: Explain Code` - Explain selected code
- `Ollama Assistant: Improve Code` - Get improvement suggestions
- `Ollama Assistant: Fix Code` - Get help fixing code issues

## Available Models

The extension works with any Ollama model. Popular choices include:

- `llama3.2` - General purpose model
- `codellama` - Specialized for code
- `deepseek-coder` - Advanced coding model
- `mistral` - Fast and efficient model

Pull models using: `ollama pull <model-name>`

## Troubleshooting

### Connection Issues

1. **Ensure Ollama is running**: Check if Ollama is started (`ollama serve`)
2. **Verify URL**: Make sure the base URL in settings matches your Ollama instance
3. **Check model**: Ensure the configured model is pulled (`ollama list`)

### Performance

1. **Use appropriate models**: Smaller models respond faster
2. **Adjust temperature**: Lower values (0.1) for more focused responses
3. **Limit token count**: Reduce max tokens for faster responses

## Contributing

This extension is based on the architecture of Roo Code and focuses specifically on Ollama integration.

## License

MIT License
