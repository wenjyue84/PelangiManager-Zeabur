/**
 * Understanding Tab Loader
 *
 * Displays intent classification data (keywords, examples, patterns)
 * Reuses the existing intent manager loader from intent-classifier.js
 */

/**
 * Load Understanding tab (renamed from Intent Manager)
 */
export async function loadUnderstanding() {
  // Reuse the existing intent manager loader (must use window. in ES module scope)
  if (typeof window.loadIntentManagerData === 'function') {
    await window.loadIntentManagerData();
  }
}
