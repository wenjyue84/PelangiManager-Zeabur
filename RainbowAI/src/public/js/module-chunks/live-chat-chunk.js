/**
 * live-chat-chunk.js — Lazy-loaded modules for the Live Chat tab
 *
 * live-chat.js is a self-registering orchestrator — it imports its own
 * sub-modules and wires window.* exports. We just need to import it.
 */

// The orchestrator self-registers all window.* exports on import
import '/public/js/modules/live-chat.js';

console.log('[LazyChunk] Live Chat modules registered');
