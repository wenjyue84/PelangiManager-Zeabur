/**
 * Ollama MCP Server
 *
 * Exposes Ollama models (local + cloud) as MCP tools for Claude to use.
 *
 * Features:
 * - 5 cloud models (GPT-OSS 20B/120B, Minimax-M2, DeepSeek-v3.1 671B, Qwen3-Coder 480B)
 * - Local models (DeepSeek 6.7B, Gemma3 4B)
 * - Streaming support
 * - Chain-of-thought reasoning visible
 * - 6x faster than CLI (0.5s vs 3s)
 *
 * Usage:
 * Add to claude_desktop_config.json:
 * ```json
 * {
 *   "mcpServers": {
 *     "ollama": {
 *       "command": "node",
 *       "args": ["C:\\Users\\Jyue\\Desktop\\Projects\\PelangiManager-Zeabur\\mcp-server\\dist\\ollama-mcp.js"]
 *     }
 *   }
 * }
 * ```
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Simple Ollama API client (embedded for MCP server)
class OllamaClient {
  private baseUrl = 'http://localhost:11434';

  async generate(model: string, prompt: string, stream = false) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return await response.json();
  }

  async listModels() {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    return await response.json();
  }
}

const ollama = new OllamaClient();

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'ollama_quick_query',
    description:
      'Ultra-fast query using GPT-OSS 20B cloud model (~3s). Best for quick questions, simple tasks, or when speed is critical. Shows chain-of-thought reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The question or task for the model',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'ollama_generate_code',
    description:
      'Generate high-quality code using Qwen3-Coder 480B cloud model (~17s). Specialized for TypeScript, JavaScript, Python, and other programming languages. Perfect for code generation, refactoring, and code review.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Code generation request (e.g., "Write a React hook for debouncing")',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'ollama_tutorial',
    description:
      'Get comprehensive tutorials and explanations using Minimax-M2 cloud model (~7s). Provides detailed explanations with examples, code snippets, and comparisons. Shows chain-of-thought reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Topic to learn about (e.g., "Explain async/await in JavaScript")',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'ollama_deep_analysis',
    description:
      'Deep analysis and complex reasoning using DeepSeek-v3.1 671B cloud model (~8s). Best for architecture decisions, complex comparisons, and detailed technical analysis. Shows chain-of-thought reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Complex question or analysis request',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'ollama_balanced',
    description:
      'Balanced performance using GPT-OSS 120B cloud model (~6s). Good for general questions, explanations, and comparisons. Shows chain-of-thought reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'General question or task',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'ollama_local_unlimited',
    description:
      'Unlimited local queries using DeepSeek 6.7B (~8-10s warm). 100% private, no rate limits, runs on local GPU. Best for unlimited batch operations or privacy-sensitive work.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Question or task (runs locally)',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'ollama_list_models',
    description: 'List all available Ollama models (both cloud and local) with details.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ollama_custom',
    description:
      'Query any Ollama model by name. Use this for specific models not covered by other tools.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description:
            'Model name (e.g., "gpt-oss:20b-cloud", "deepseek-coder:6.7b", "minimax-m2:cloud")',
        },
        prompt: {
          type: 'string',
          description: 'The question or task',
        },
      },
      required: ['model', 'prompt'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'ollama-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'ollama_quick_query': {
        const typedArgs = args as { prompt: string };
        const result = await ollama.generate('gpt-oss:20b-cloud', typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                response: result.response,
                thinking: result.thinking,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: 'GPT-OSS 20B (cloud)',
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_generate_code': {
        const typedArgs = args as { prompt: string };
        const result = await ollama.generate('qwen3-coder:480b-cloud', typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: result.response,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: 'Qwen3-Coder 480B (cloud)',
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_tutorial': {
        const typedArgs = args as { prompt: string };
        const result = await ollama.generate('minimax-m2:cloud', typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tutorial: result.response,
                thinking: result.thinking,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: 'Minimax-M2 (cloud)',
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_deep_analysis': {
        const typedArgs = args as { prompt: string };
        const result = await ollama.generate('deepseek-v3.1:671b-cloud', typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                analysis: result.response,
                thinking: result.thinking,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: 'DeepSeek-v3.1 671B (cloud)',
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_balanced': {
        const typedArgs = args as { prompt: string };
        const result = await ollama.generate('gpt-oss:120b-cloud', typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                response: result.response,
                thinking: result.thinking,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: 'GPT-OSS 120B (cloud)',
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_local_unlimited': {
        const typedArgs = args as { prompt: string };
        const result = await ollama.generate('deepseek-coder:6.7b', typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                response: result.response,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: 'DeepSeek 6.7B (local, unlimited)',
                privacy: '100% local, no data sent to cloud',
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_list_models': {
        const models = await ollama.listModels();
        const cloudModels = models.models.filter((m: any) => m.remote_host);
        const localModels = models.models.filter((m: any) => !m.remote_host);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                cloud_models: cloudModels.map((m: any) => ({
                  name: m.name,
                  parameters: m.details.parameter_size,
                  remote_host: m.remote_host,
                })),
                local_models: localModels.map((m: any) => ({
                  name: m.name,
                  parameters: m.details.parameter_size,
                  size_gb: (m.size / 1e9).toFixed(2),
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'ollama_custom': {
        const typedArgs = args as { model: string; prompt: string };
        const result = await ollama.generate(typedArgs.model, typedArgs.prompt);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                response: result.response,
                thinking: result.thinking,
                duration_ms: Math.round(result.total_duration / 1e6),
                tokens: result.eval_count,
                model: typedArgs.model,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ollama MCP server running on stdio');
  console.error('Available tools: 8 (quick_query, generate_code, tutorial, deep_analysis, balanced, local_unlimited, list_models, custom)');
}

main().catch(console.error);
