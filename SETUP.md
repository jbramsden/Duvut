# Setup Instructions

## Development Setup

1. **Clone or create the project**:
   ```bash
   # Navigate to the project directory
   cd duvut-assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile TypeScript**:
   ```bash
   npm run compile
   ```

4. **Open in VS Code**:
   ```bash
   code .
   ```

5. **Debug the extension**:
   - Press `F5` to open a new Extension Development Host window
   - The extension will be automatically loaded

## Building for Distribution

1. **Bundle the extension**:
   ```bash
   npm run bundle
   ```

2. **Package the extension**:
   ```bash
   npx vsce package --allow-star-activation
   ```

This will create a `.vsix` file that can be installed in VS Code.

## Installing the .vsix File

```bash
code --install-extension duvut-assistant-1.0.0.vsix
```

## Prerequisites

Make sure you have:
1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Ollama** installed and running
4. **VS Code** for development

## Testing

1. Start Ollama: `ollama serve`
2. Pull a model: `ollama pull llama3.2`
3. Open the extension in VS Code
4. Test the chat interface and commands

## Troubleshooting

- If compilation fails, check TypeScript version compatibility
- If Ollama connection fails, verify Ollama is running on the correct port
- Check the VS Code Developer Console for error messages
