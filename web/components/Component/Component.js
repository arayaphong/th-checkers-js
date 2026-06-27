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
   * In Node-based test environments file:// URLs must be read from disk.
   * In the browser fetch handles them (and http/s URLs) natively.
   * @param {string|URL} url
   * @returns {Promise<string>}
   */
  async #getText(url) {
    const resolved = new URL(url, typeof location !== 'undefined' ? location.href : 'file:///');
    const isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
    if (resolved.protocol === 'file:' && isNode) {
      const { readFile } = await import('node:fs/promises');
      return readFile(resolved.pathname, 'utf-8');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load template ${url}: ${response.status}`);
    }
    return response.text();
  }

  /**
   * Fetch an HTML page/template and replace the container contents.
   * If a selector is provided, only the matching element's innerHTML is used.
   * @param {string|URL} url
   * @param {string} [selector]
   */
  async loadTemplate(url, selector) {
    const html = await this.#getText(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sourceElement = selector ? doc.querySelector(selector) : doc.body;

    if (!sourceElement) {
      throw new Error(`Template ${url} missing selector: ${selector}`);
    }
    const template = document.createElement('template');
    template.innerHTML = sourceElement.innerHTML;
    this.container.replaceChildren(template.content);
  }
}
