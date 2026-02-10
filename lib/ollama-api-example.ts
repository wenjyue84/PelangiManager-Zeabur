/**
 * Ollama API Usage Examples
 *
 * Run with: tsx lib/ollama-api-example.ts
 */

import {
  ollama,
  CloudModels,
  LocalModels,
  quickQuery,
  generateCode,
  getTutorial,
  deepAnalysis,
  localQuery,
} from './ollama-api';

async function main() {
  console.log('=== Ollama API Examples ===\n');

  // Example 1: Quick query (fastest, 3s)
  console.log('1. Quick Query (GPT-OSS 20B):');
  const quick = await quickQuery('What is 2+2?');
  console.log(`   Response: ${quick}\n`);

  // Example 2: Code generation (17s)
  console.log('2. Code Generation (Qwen3-Coder 480B):');
  const code = await generateCode('Write a TypeScript function to debounce input');
  console.log(`   Code:\n${code}\n`);

  // Example 3: Tutorial with thinking (7s)
  console.log('3. Tutorial (Minimax-M2):');
  const tutorial = await getTutorial('Explain async/await in JavaScript');
  console.log(`   Thinking: ${tutorial.thinking}`);
  console.log(`   Response: ${tutorial.response}\n`);

  // Example 4: Deep analysis (8s)
  console.log('4. Deep Analysis (DeepSeek-v3.1 671B):');
  const analysis = await deepAnalysis('Compare REST vs GraphQL');
  console.log(`   Thinking: ${analysis.thinking}`);
  console.log(`   Response: ${analysis.response}\n`);

  // Example 5: Streaming response
  console.log('5. Streaming (GPT-OSS 120B):');
  process.stdout.write('   ');
  for await (const chunk of ollama.generateStream(
    CloudModels.GPT_OSS_120B,
    'Count from 1 to 5'
  )) {
    process.stdout.write(chunk.response);
    if (chunk.done) {
      console.log(`\n   [Done in ${(chunk.total_duration! / 1e9).toFixed(2)}s, ${chunk.eval_count} tokens]\n`);
    }
  }

  // Example 6: List all models
  console.log('6. Available Models:');
  const cloudModels = await ollama.getModelsByType('cloud');
  const localModels = await ollama.getModelsByType('local');
  console.log(`   Cloud: ${cloudModels.map(m => m.name).join(', ')}`);
  console.log(`   Local: ${localModels.map(m => m.name).join(', ')}\n`);

  // Example 7: Advanced usage with options
  console.log('7. Advanced Options:');
  const result = await ollama.generate(CloudModels.GPT_OSS_20B, 'Be creative!', {
    options: {
      temperature: 0.9,
      top_p: 0.95,
      num_predict: 50,
    },
  });
  console.log(`   Response: ${result.response}`);
  console.log(`   Tokens: ${result.eval_count}`);
  console.log(`   Duration: ${(result.total_duration! / 1e9).toFixed(2)}s\n`);

  // Example 8: Error handling
  console.log('8. Error Handling:');
  try {
    await ollama.generate('non-existent-model', 'test');
  } catch (error) {
    console.log(`   Caught error: ${(error as Error).message}\n`);
  }

  // Example 9: Check if Ollama is running
  console.log('9. Health Check:');
  const isRunning = await ollama.isRunning();
  console.log(`   Ollama is ${isRunning ? 'running ✅' : 'not running ❌'}\n`);

  // Example 10: Local unlimited (privacy)
  console.log('10. Local Unlimited Query (DeepSeek 6.7B):');
  const local = await localQuery('What is the capital of France?');
  console.log(`   Response: ${local}\n`);

  console.log('=== All examples complete! ===');
}

main().catch(console.error);
