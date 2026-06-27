import { Position } from '../../../core/Position.js';
import { Component } from '../Component/Component.js';
import { trace } from '../../utils/Debug.js';
import { EngineClient } from '../../utils/Client.js';
import { movableSquares, targetsFrom, pathFor } from '../../utils/Moves.js';

/**
 * Board component.
 *
 * Renders the engine's board snapshot and queries legality through an engine
 * or EngineClient. It can run standalone (spawning its own worker) or share an
 * EngineClient with a Shell component via the `engine` option.
 *
 * The Board never decides legality itself and never handles disambiguation UI;
 * it simply sends raw coordinate commands to the engine and re-renders whenever
 * the engine reports a new state.
 */
export class Board extends Component {
  constructor(container, options = {}) {
    super(container);
    this.state = { engine: options.engine ?? this.#createEngine() };

    this.boardElement = null;
    this.cellByNotation = new Map();
    this.movable = new Set();
    this.selected = null;
    this.selectedCell = null;
    // Squares highlighted by a `trace` command; kept so a transient hover preview
    // can restore them when the pointer leaves.
    this.stickyPath = [];

    this.unsubscribe = this.state.engine.subscribe?.((message) => this.#onEngineResult(message));
  }

  #createEngine() {
    const workerUrl = new URL('../../workers/worker.js', import.meta.url);
    return new EngineClient(workerUrl);
  }

  destroy() {
    this.unsubscribe?.();
    if (this.state.engine instanceof EngineClient) {
      this.state.engine.terminate();
    }
  }

  #addEventListeners() {
    this.boardElement.addEventListener('click', (e) => this.#handleBoardEvent(e));
    this.boardElement.addEventListener('keydown', (e) => this.#handleBoardEvent(e));
    this.boardElement.addEventListener('focusin', (e) => this.#handleBoardEvent(e));
    this.boardElement.addEventListener('focusout', (e) => this.#handleBoardEvent(e));
    this.boardElement.addEventListener('mouseover', (e) => this.#handleBoardEvent(e));
    this.boardElement.addEventListener('mouseout', (e) => this.#handleBoardEvent(e));
  }

  async #handleBoardEvent(event) {
    const cell = event.target.closest('button.cell');
    if (!cell) return;

    const notation = cell.dataset.notation;

    switch (event.type) {
      case 'click':
      case 'keydown': {
        const pos = Position.fromString(notation);
        return this.handleCellInteraction(event, pos, cell);
      }
      case 'focusin':
      case 'mouseover':
        return this.previewPathTo(notation);
      case 'focusout':
      case 'mouseout':
        return this.endPreview();
    }
  }

  #onEngineResult({ result }) {
    switch (result.kind) {
      case 'state':
      case 'demo':
      case 'quit':
        this.sync();
        break;
      case 'trace':
        this.highlightPath(result.move.path.map((cell) => cell.notation));
        break;
      case 'trace-list':
        this.highlightPath(
          result.moves.length === 1 ? result.moves[0].path.map((cell) => cell.notation) : [],
        );
        break;
      default:
        break;
    }
  }

  async mount() {
    await this.loadTemplate(new URL('./Board.html', import.meta.url), '#app');
    this.boardElement = this.container.querySelector('.board');
    this.boardElement.setAttribute('role', 'group');
    this.#addEventListeners();
    await this.sync();
  }

  engine() {
    return this.state.engine;
  }

  paintPath(notations) {
    for (const cell of this.cellByNotation.values()) {
      cell.classList.remove('path');
    }
    for (const notation of notations) {
      this.cellByNotation.get(notation)?.classList.add('path');
    }
  }

  // Preview the continuous path from the selected source to the hovered/focused
  // target, but only when the engine reports a single unambiguous route.
  async previewPathTo(notation) {
    if (!this.selected) return;
    const cells = await pathFor(this.engine(), this.selected.toString(), notation);
    this.paintPath(cells ?? this.stickyPath);
  }

  endPreview() {
    this.paintPath(this.stickyPath);
  }

  // Pin a path on the board (driven by a `trace` command anywhere in the app).
  highlightPath(notations) {
    this.stickyPath = notations ?? [];
    this.paintPath(this.stickyPath);
  }

  clearPath() {
    this.stickyPath = [];
    this.paintPath([]);
  }

  describeCell(board, pos, notation) {
    if (!board.isOccupied(pos)) {
      return `${notation}, empty square`;
    }

    const color = board.isBlackPiece(pos) ? 'black' : 'white';
    const type = board.isDamePiece(pos) ? 'king' : 'piece';
    const moveState = this.movable.has(notation) ? ', movable' : '';
    return `${notation}, ${color} ${type}${moveState}`;
  }

  clearHints() {
    for (const cell of this.cellByNotation.values()) {
      cell.classList.remove('hint');
      cell.removeAttribute('aria-current');
      cell.setAttribute('aria-label', cell.dataset.label ?? '');
    }
  }

  async select(pos, cell) {
    // Starting a new move intent retires any pinned trace highlight.
    this.clearPath();
    this.selected = pos;
    this.selectedCell = cell;
    cell.classList.add('selected');
    cell.setAttribute('aria-pressed', 'true');
    cell.setAttribute('aria-label', `${cell.dataset.label}, selected`);
    const targets = await targetsFrom(this.engine(), pos.toString());
    for (const target of targets) {
      const targetCell = this.cellByNotation.get(target);
      targetCell?.classList.add('hint');
      targetCell?.setAttribute('aria-current', 'true');
      targetCell?.setAttribute('aria-label', `${targetCell.dataset.label}, legal target`);
    }
    trace('board', 'select', pos.toString(), { targets });
  }

  clearSelection() {
    this.selectedCell?.classList.remove('selected');
    this.selectedCell?.removeAttribute('aria-pressed');
    this.selectedCell?.setAttribute('aria-label', this.selectedCell.dataset.label ?? '');
    this.clearHints();
    this.selected = null;
    this.selectedCell = null;
  }

  async handleCellClick(pos, cell) {
    return this.handleCellInteraction({ type: 'click' }, pos, cell);
  }

  async handleCellInteraction(event, pos, cell) {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (event.type === 'keydown') {
      event.preventDefault();
    }

    const notation = pos.toString();
    trace('board', 'interact', notation, { type: event.type, selected: this.selected?.toString() ?? null });

    // First click: only a square the engine reports as movable can be a source.
    if (!this.selected) {
      if (this.movable.has(notation)) {
        await this.select(pos, cell);
      } else {
        trace('board', 'ignore (not movable)', notation);
      }
      return;
    }

    // Click the same square again -> deselect.
    if (this.selected.equals(pos)) {
      trace('board', 'deselect', notation);
      this.clearSelection();
      return;
    } else if (this.movable.has(notation)) {
      // Click another of your own movable pieces -> switch the selection there.
      trace('board', 'reselect', notation);
      this.clearSelection();
      await this.select(pos, cell);
      return;
    }

    // Otherwise treat it as the destination and hand it to the engine as a raw
    // command. The worker will broadcast the result to all clients.
    const command = `${this.selected.toString()} ${notation}`;
    this.clearSelection();
    trace('board', 'submit move', command);
    await this.engine().command(command);
  }

  async sync() {
    this.selected = null;
    this.selectedCell = null;
    this.stickyPath = [];
    this.cellByNotation.clear();
    this.movable = await movableSquares(this.engine());
    trace('board', 'render', { movable: [...this.movable] });

    const board = (await this.engine().getGame()).board();
    const cells = [];

    for (let row = 0; row < Position.BOARD_SIZE; row++) {
      for (let col = 0; col < Position.BOARD_SIZE; col++) {
        const isValid = Position.isValid(col, row);
        const cell = document.createElement(isValid ? 'button' : 'div');
        cell.className = `cell ${isValid ? 'dark' : 'light'}`;

        if (isValid) {
          const pos = Position.fromCoords(col, row);
          const notation = pos.toString();
          const label = this.describeCell(board, pos, notation);
          cell.type = 'button';
          cell.dataset.notation = notation;
          cell.dataset.label = label;
          cell.setAttribute('aria-label', label);
          this.cellByNotation.set(notation, cell);
          if (board.isOccupied(pos)) {
            cell.classList.add('piece', board.isBlackPiece(pos) ? 'black' : 'white');
            if (board.isDamePiece(pos)) {
              cell.classList.add('king');
              const crown = document.createElement('span');
              crown.className = 'king-marker';
              crown.setAttribute('aria-hidden', 'true');
              crown.textContent = 'K';
              cell.append(crown);
            }
          }
          if (this.movable.has(notation)) {
            cell.classList.add('movable');
          }
        } else {
          cell.setAttribute('aria-hidden', 'true');
        }

        cells.push(cell);
      }
    }

    this.boardElement.replaceChildren(...cells);
  }
}
