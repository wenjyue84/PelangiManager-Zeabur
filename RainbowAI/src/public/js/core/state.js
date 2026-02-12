// ═══════════════════════════════════════════════════════════════════
// Global State Variables
// Using var/window for cross-scope accessibility (regular scripts + ES6 modules)
// ═══════════════════════════════════════════════════════════════════

var API = '/api/rainbow';

// Cached data (shared between legacy-functions.js and inline handlers)
var cachedRouting = {};
var cachedKnowledge = { static: [], dynamic: {} };
var cachedWorkflows = { workflows: [] };
var cachedSettings = null;
var cachedIntentNames = [];
var currentWorkflowId = null;
