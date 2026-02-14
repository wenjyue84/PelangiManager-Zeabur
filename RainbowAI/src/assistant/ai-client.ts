/**
 * ai-client.ts — Barrel re-export (backwards compatible)
 *
 * All 13+ files that import from './ai-client' continue to work unchanged.
 * Implementation split into:
 *   - ai-provider-manager.ts: Provider lifecycle + execution infrastructure
 *   - ai-classification.ts:   Intent classification + system prompt generation
 *   - ai-response-generator.ts: Response generation + parsing
 *   - ai-utilities.ts:        Translation, testing, workflow evaluation
 */
export * from './ai-provider-manager.js';
export * from './ai-classification.js';
export * from './ai-response-generator.js';
export * from './ai-utilities.js';
