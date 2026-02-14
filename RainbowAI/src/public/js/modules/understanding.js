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
  // Reuse the existing intent manager loader
  if (typeof loadIntentManagerData === 'function') {
    await loadIntentManagerData();
  }
}
