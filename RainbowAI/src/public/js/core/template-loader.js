/**
 * Template Loader
 * Loads HTML templates dynamically from the server
 */

/**
 * Template cache to avoid repeated network requests
 */
const templateCache = new Map();

/**
 * Load an HTML template from the server
 * @param {string} name - Template name (without .html extension)
 * @returns {Promise<string>} Template HTML content
 */
export async function loadTemplate(name) {
  // Check cache first
  if (templateCache.has(name)) {
    return templateCache.get(name);
  }

  try {
    const response = await fetch(`/api/rainbow/templates/${name}`);
    if (!response.ok) {
      throw new Error(`Template ${name} not found`);
    }

    const html = await response.text();
    templateCache.set(name, html);
    return html;
  } catch (err) {
    console.error(`[TemplateLoader] Failed to load template ${name}:`, err);
    throw err;
  }
}

/**
 * Load and inject template into a container element
 * @param {string} name - Template name
 * @param {string} containerId - Container element ID
 * @returns {Promise<void>}
 */
export async function loadTemplateInto(name, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container ${containerId} not found`);
  }

  const html = await loadTemplate(name);
  container.innerHTML = html;
}

/**
 * Preload templates in the background
 * @param {string[]} names - Array of template names to preload
 */
export function preloadTemplates(names) {
  names.forEach(name => {
    loadTemplate(name).catch(err => {
      console.warn(`[TemplateLoader] Failed to preload ${name}:`, err);
    });
  });
}

// Export to global scope for inline usage
window.loadTemplate = loadTemplate;
window.loadTemplateInto = loadTemplateInto;
window.preloadTemplates = preloadTemplates;
