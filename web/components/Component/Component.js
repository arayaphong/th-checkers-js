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
   * Fetch an HTML template and replace the container contents.
   * @param {string|URL} url
   */
  async loadTemplate(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load template ${url}: ${response.status}`);
    }
    this.container.innerHTML = await response.text();
  }
}
