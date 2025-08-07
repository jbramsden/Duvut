
const vscode = acquireVsCodeApi();

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const connectionStatus = document.getElementById('connectionStatus');
const modelSelect = document.getElementById('modelSelect');
const instructionsDiv = document.getElementById('ollamaInstructions');

let selectedModel = null;
let streamingAssistantDiv = null;

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderMarkdown(text) {
    if (!text) return '';
    const codeBlocks = [];
    let html = text.replace(/```([\\s\\S]*?)```/g, (match, code) => {
        const placeholder = '___CODE_BLOCK_' + codeBlocks.length + '___';
        codeBlocks.push('<pre><code>' + escapeHtml(code) + '</code></pre>');
        return placeholder;
    });
    html = html.replace(/\\n/g, '<br>');
    codeBlocks.forEach((block, index) => {
        html = html.replace('___CODE_BLOCK_' + index + '___', block);
    });
    return html;
}

function addMessage(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (isUser ? 'user-message' : 'assistant-message');
    messageDiv.innerHTML = isUser ? escapeHtml(content) : renderMarkdown(content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function sendMessage() {
    if (chatInput.value.trim()) {
        vscode.postMessage({ type: 'sendMessage', content: chatInput.value, model: selectedModel });
        chatInput.value = '';
        streamingAssistantDiv = null;
    }
}

sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', () => {
    vscode.postMessage({ type: 'clearChat' });
    chatMessages.innerHTML = '';
    streamingAssistantDiv = null;
});
chatInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());

if (modelSelect) {
    modelSelect.addEventListener('change', () => selectedModel = modelSelect.value);
}

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'userMessage':
            addMessage(message.content, true);
            break;
        case 'assistantMessageStream':
            if (!streamingAssistantDiv) streamingAssistantDiv = addMessage("");
            streamingAssistantDiv.innerHTML = renderMarkdown(message.content);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            break;
        case 'assistantMessageStreamDone':
            streamingAssistantDiv = null;
            break;
        case 'error':
            addMessage('<strong>Error:</strong> ' + escapeHtml(message.message), false);
            break;
        case 'connectionStatus':
            if (message.connected) {
                connectionStatus.className = 'connection-status connected';
                connectionStatus.textContent = 'Connected to Ollama (' + message.models.length + ' models)';
                instructionsDiv.style.display = 'none';
                modelSelect.innerHTML = '';
                if (message.models) {
                    message.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        modelSelect.appendChild(option);
                    });
                    selectedModel = message.models[0];
                    modelSelect.value = selectedModel;
                }
            } else {
                connectionStatus.className = 'connection-status disconnected';
                connectionStatus.textContent = 'Disconnected from Ollama';
                instructionsDiv.innerHTML = '<strong>Connection Failed:</strong><br>1. Ensure Ollama is running.<br>2. Check the server address in settings.';
                instructionsDiv.style.display = 'block';
            }
            break;
        case 'clearChat':
            chatMessages.innerHTML = '';
            break;
    }
});

// Initial connection check
vscode.postMessage({ type: 'checkConnection' }); 