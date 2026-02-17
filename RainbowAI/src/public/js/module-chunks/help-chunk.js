/**
 * help-chunk.js — Lazy-loaded modules for the Help & Docs tab
 * Extracted from main.js
 */

import { initHelp } from '/public/js/modules/help.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadHelp = initHelp;

console.log('[LazyChunk] Help modules registered');
