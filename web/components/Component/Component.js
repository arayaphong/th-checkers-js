/**
 * Minimal base class for UI components.
 * Each component owns its HTML template and mounts into a container element.
 */
export class Component {
  constructor(container) {
    if (!container) {
      throw new Error('Component requires a container element');
    }
    this.container = container;
  }

  /**
   * Fetch an HTML page/template and replace the container contents.
   * If a selector is provided, only the matching element's innerHTML is used.
   * @param {string|URL} url
   * @param {string} [selector]
   */
  async loadTemplate(url, selector) {
    const resolved = new URL(url, typeof location !== 'undefined' ? location.href : 'file:///');
    let html;

    // In Node-based test environments file:// URLs must be read from disk.
    // In the browser fetch handles them (and http/https URLs) natively.
    const isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
    if (resolved.protocol === 'file:' && isNode) {
      const { readFile } = await import('node:fs/promises');
      html = await readFile(resolved.pathname, 'utf-8');
    } else {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load template ${url}: ${response.status}`);
      }
      html = await response.text();
    }

    let content = html;
    if (selector) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const element = doc.querySelector(selector);
      if (!element) {
        throw new Error(`Template ${url} missing selector: ${selector}`);
      }
      content = element.innerHTML;
    }
    this.container.innerHTML = content;
  }
}
