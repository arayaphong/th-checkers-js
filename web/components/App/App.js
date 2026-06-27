import { Engine } from '../../../app/Engine.js';
import { Component } from '../Component/Component.js';
import { Board } from '../Board/Board.js';
import { Shell } from '../Shell/Shell.js';

/**
 * Root application component.
 *
 * Owns the page skeleton, the shared engine state, and the Board/Shell child
 * components. Shell is created first because Board queries it for move legality;
 * `shell.setBoard(board)` resolves the remaining circular dependency.
 */
export class App extends Component {
  constructor() {
    super(document.querySelector('#app'));
    this.state = { engine: new Engine() };
  }

  async mount() {
    await this.loadTemplate(new URL('./App.html', import.meta.url));

    const boardRoot = this.container.querySelector('[data-board-root]');
    const shellRoot = this.container.querySelector('[data-shell-root]');

    const shell = new Shell(shellRoot, this.state);
    await shell.mount();

    const board = new Board(boardRoot, this.state, shell);
    await board.mount();

    shell.setBoard(board);
    shell.start();
  }
}
