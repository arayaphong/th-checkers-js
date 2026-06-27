import { Component } from '../Component/Component.js';
import { Board } from '../Board/Board.js';
import { Shell } from '../Shell/Shell.js';
import { EngineClient } from '../../utils/EngineClient.js';

/**
 * Root application component.
 *
 * Owns the page skeleton and wires Board and Shell together around a shared
 * EngineClient that talks to a single Web Worker. Both children subscribe to
 * the worker's broadcast results, so commands from either surface are reflected
 * everywhere without direct coupling.
 */
export class App extends Component {
  constructor() {
    super(document.querySelector('#app'));
    const workerUrl = new URL('../../workers/gameWorker.js', import.meta.url);
    this.state = { engine: new EngineClient(workerUrl) };
  }

  async mount() {
    await this.loadTemplate(new URL('./App.html', import.meta.url), '#app');

    const boardRoot = this.container.querySelector('[data-board-root]');
    const shellRoot = this.container.querySelector('[data-shell-root]');

    const board = new Board(boardRoot, { engine: this.state.engine });
    await board.mount();

    const shell = new Shell(shellRoot, { engine: this.state.engine });
    await shell.mount();

    shell.start();
  }
}
