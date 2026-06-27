import { Component } from '../Component/Component.js';

/**
 * Control component.
 *
 * Renders quick command buttons and dispatches them to the shared engine.
 */
export class Control extends Component {
  constructor(container, options = {}) {
    super(container);
    this.state = { engine: options.engine };
    this.pending = false;
    this.activeDemo = null;
    this.shortcutButtons = [];

    this.unsubscribe = this.state.engine?.subscribe?.((message) => this.#onEngineResult(message));
  }

  destroy() {
    this.unsubscribe?.();
  }

  #onEngineResult({ result }) {
    if (result.kind === 'demo') {
      this.activeDemo = result.id;
    } else if (result.kind === 'state' && result.action !== 'moves') {
      this.activeDemo = null;
    } else if (result.kind === 'quit') {
      this.activeDemo = null;
    }
    this.syncActiveButton();
  }

  async mount() {
    await this.loadTemplate(new URL('./Control.html', import.meta.url), '#app');
    this.shortcutButtons = [...this.container.querySelectorAll('.shortcut-button')];
    for (const button of this.shortcutButtons) {
      button.addEventListener('click', () => this.submitShortcut(button.dataset.command ?? ''));
    }
    this.syncActiveButton();
  }

  setDisabled(disabled) {
    for (const button of this.shortcutButtons) {
      button.disabled = disabled;
    }
  }

  syncActiveButton() {
    for (const button of this.shortcutButtons) {
      button.classList.toggle('active', button.dataset.command === this.activeDemo);
    }
  }

  async submitShortcut(command) {
    if (!command || this.pending || !this.state.engine) {
      return;
    }

    this.pending = true;
    this.setDisabled(true);
    try {
      await this.state.engine.command(command);
    } finally {
      this.pending = false;
      this.setDisabled(false);
    }
  }
}
