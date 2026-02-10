/**
 * Ollama API Helper
 *
 * TypeScript utility for interacting with Ollama's REST API.
 * Supports both local models (DeepSeek 6.7B) and cloud models (GPT-OSS, Minimax, etc.)
 *
 * Performance: ~6x faster than CLI (0.5s vs 3s for simple queries)
 *
 * @example
 * ```ts
 * import { OllamaAPI } from './lib/ollama-api';
 *
 * const ollama = new OllamaAPI();
 *
 * // Quick query
 * const result = await ollama.generate('gpt-oss:20b-cloud', 'What is TypeScript?');
 * console.log(result.response);
 * console.log(result.thinking); // Chain-of-thought visible!
 *
 * // Streaming
 * for await (const chunk of ollama.generateStream('deepseek-coder:6.7b', 'Write a function')) {
 *   process.stdout.write(chunk.response);
 * }
 * ```
 */

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  system?: string;
  template?: string;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  remote_model?: string;
  remote_host?: string;
  created_at: string;
  response: string;
  thinking?: string;  // Chain-of-thought reasoning (cloud models)
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  context?: number[];
}

export interface OllamaModel {
  name: string;
  model: string;
  remote_model?: string;
  remote_host?: string;
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

export interface OllamaListResponse {
  models: OllamaModel[];
}

export class OllamaAPI {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a response from an Ollama model (non-streaming)
   *
   * @param model - Model name (e.g., 'gpt-oss:20b-cloud', 'deepseek-coder:6.7b')
   * @param prompt - The prompt to send to the model
   * @param options - Optional generation parameters
   * @returns Promise with the complete response
   *
   * @example
   * ```ts
   * const result = await ollama.generate('gpt-oss:20b-cloud', 'Explain async/await');
   * console.log(result.response);
   * console.log(`Thinking: ${result.thinking}`);
   * console.log(`Duration: ${result.total_duration / 1e9}s`);
   * console.log(`Tokens: ${result.eval_count}`);
   * ```
   */
  async generate(
    model: string,
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): Promise<OllamaGenerateResponse> {
    const request: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      ...options,
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Generate a streaming response from an Ollama model
   *
   * @param model - Model name
   * @param prompt - The prompt to send
   * @param options - Optional generation parameters
   * @returns AsyncGenerator yielding response chunks
   *
   * @example
   * ```ts
   * for await (const chunk of ollama.generateStream('minimax-m2:cloud', 'Teach me React')) {
   *   process.stdout.write(chunk.response);
   *   if (chunk.thinking) {
   *     console.log(`\n[Thinking: ${chunk.thinking}]`);
   *   }
   *   if (chunk.done) {
   *     console.log(`\n\nTotal tokens: ${chunk.eval_count}`);
   *   }
   * }
   * ```
   */
  async *generateStream(
    model: string,
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): AsyncGenerator<OllamaGenerateResponse> {
    const request: OllamaGenerateRequest = {
      model,
      prompt,
      stream: true,
      ...options,
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const chunk: OllamaGenerateResponse = JSON.parse(line);
            yield chunk;
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const chunk: OllamaGenerateResponse = JSON.parse(buffer);
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List all available models (local + cloud)
   *
   * @returns Promise with array of models
   *
   * @example
   * ```ts
   * const { models } = await ollama.listModels();
   *
   * const cloudModels = models.filter(m => m.remote_host);
   * const localModels = models.filter(m => !m.remote_host);
   *
   * console.log('Cloud models:', cloudModels.map(m => m.name));
   * console.log('Local models:', localModels.map(m => m.name));
   * ```
   */
  async listModels(): Promise<OllamaListResponse> {
    const response = await fetch(`${this.baseUrl}/api/tags`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Get models filtered by type
   *
   * @param type - 'cloud' or 'local'
   * @returns Promise with filtered models
   */
  async getModelsByType(type: 'cloud' | 'local'): Promise<OllamaModel[]> {
    const { models } = await this.listModels();

    if (type === 'cloud') {
      return models.filter(m => m.remote_host);
    } else {
      return models.filter(m => !m.remote_host);
    }
  }

  /**
   * Check if Ollama service is running
   *
   * @returns Promise<boolean>
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Convenience exports for common models
export const CloudModels = {
  GPT_OSS_20B: 'gpt-oss:20b-cloud',       // Fastest (3s)
  GPT_OSS_120B: 'gpt-oss:120b-cloud',     // Balanced (6s)
  MINIMAX_M2: 'minimax-m2:cloud',         // Tutorials (7s)
  DEEPSEEK_V3_671B: 'deepseek-v3.1:671b-cloud', // Deepest (8s)
  QWEN3_CODER_480B: 'qwen3-coder:480b-cloud',   // Code (17s)
} as const;

export const LocalModels = {
  DEEPSEEK_CODER_6_7B: 'deepseek-coder:6.7b', // Local unlimited
  DEEPSEEK_R1_7B: 'deepseek-r1:7b',           // Reasoning (if installed)
  GEMMA3_4B: 'gemma3:4b',                     // Fast local
} as const;

// Default instance
export const ollama = new OllamaAPI();

/**
 * Quick helper functions
 */

/**
 * Generate a quick response from the fastest cloud model (3s)
 */
export async function quickQuery(prompt: string): Promise<string> {
  const result = await ollama.generate(CloudModels.GPT_OSS_20B, prompt);
  return result.response;
}

/**
 * Generate code with the specialized code model (17s)
 */
export async function generateCode(prompt: string): Promise<string> {
  const result = await ollama.generate(CloudModels.QWEN3_CODER_480B, prompt);
  return result.response;
}

/**
 * Get a comprehensive tutorial/explanation (7s)
 */
export async function getTutorial(prompt: string): Promise<{ response: string; thinking?: string }> {
  const result = await ollama.generate(CloudModels.MINIMAX_M2, prompt);
  return {
    response: result.response,
    thinking: result.thinking,
  };
}

/**
 * Deep analysis with visible reasoning (8s)
 */
export async function deepAnalysis(prompt: string): Promise<{ response: string; thinking?: string }> {
  const result = await ollama.generate(CloudModels.DEEPSEEK_V3_671B, prompt);
  return {
    response: result.response,
    thinking: result.thinking,
  };
}

/**
 * Local unlimited query (privacy-focused, ~8-10s warm)
 */
export async function localQuery(prompt: string): Promise<string> {
  const result = await ollama.generate(LocalModels.DEEPSEEK_CODER_6_7B, prompt);
  return result.response;
}
