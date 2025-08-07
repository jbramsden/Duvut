import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export interface OllamaModel {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    options?: {
        temperature?: number;
        num_predict?: number;
        top_p?: number;
        top_k?: number;
    };
}

export class OllamaClient {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    private getBaseUrl(): string {
        const config = vscode.workspace.getConfiguration('duvut-assistant');
        return config.get('ollamaBaseUrl', 'http://localhost:11434');
    }

    private getModelId(): string {
        const config = vscode.workspace.getConfiguration('duvut-assistant');
        return config.get('modelId', 'llama3.2');
    }

    private getTemperature(): number {
        const config = vscode.workspace.getConfiguration('duvut-assistant');
        return config.get('temperature', 0.1);
    }

    private getMaxTokens(): number {
        const config = vscode.workspace.getConfiguration('duvut-assistant');
        return config.get('maxTokens', 4000);
    }

    async listModels(): Promise<OllamaModel[]> {
        try {
            const response = await this.client.get('/api/tags');
            return response.data.models || [];
        } catch (error) {
            console.error('Error listing models:', error);
            throw new Error('Failed to connect to Ollama. Make sure Ollama is running.');
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            await this.listModels();
            console.info('Connected to Ollama')
            return true;
        } catch (error) {
            console.error('Failed to connect to Ollama', error)
            return false;
        }
    }

    async chat(messages: ChatMessage[], model: string): Promise<string> {
        const request: ChatRequest = {
            model: model,
            messages,
            stream: false,
            options: {
                temperature: this.getTemperature(),
                num_predict: this.getMaxTokens(),
            },
        };

        try {
            const response = await this.client.post('/api/chat', request);
            return response.data.message?.content || 'No response received';
        } catch (error) {
            console.error('Error in chat request:', error);
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    throw new Error('Cannot connect to Ollama. Make sure Ollama is running on ' + this.baseUrl);
                }
                throw new Error(`Ollama API error: ${error.response?.data?.error || error.message}`);
            }
            throw error;
        }
    }

    async *chatStream(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
        const request: ChatRequest = {
            model: this.getModelId(),
            messages,
            stream: true,
            options: {
                temperature: this.getTemperature(),
                num_predict: this.getMaxTokens(),
            },
        };

        try {
            const response = await this.client.post('/api/chat', request, {
                responseType: 'stream',
            });

            let buffer = '';
            
            for await (const chunk of response.data) {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content) {
                                yield data.message.content;
                            }
                            if (data.done) {
                                return;
                            }
                        } catch (parseError) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in chat stream request:', error);
            throw error;
        }
    }

    async generateCompletion(prompt: string): Promise<string> {
        try {
            const response = await this.client.post('/api/generate', {
                model: this.getModelId(),
                prompt,
                stream: false,
                options: {
                    temperature: this.getTemperature(),
                    num_predict: this.getMaxTokens(),
                },
            });
            return response.data.response || 'No response received';
        } catch (error) {
            console.error('Error in generate request:', error);
            throw error;
        }
    }
}
