// UI-neutral application engine. It owns the Game instance, undo/redo state,
// demo loading and move disambiguation, then returns structured results for
// whichever frontend is driving it.

import { Game } from '../core/Game.js';
import { PieceColor } from '../core/Piece.js';
import { Position } from '../core/Position.js';
import { createDemoGame, DEMO_IDS, explainDemo } from './demos/index.js';
import { expandRoute } from './utils/moveRoute.js';

const COLOR_NAMES = new Map([
  [PieceColor.WHITE, 'WHITE'],
  [PieceColor.BLACK, 'BLACK'],
]);

function opponentOf(color) {
  return color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
}

/**
 * @param {import('../core/Position.js').Position} position
 */
function serializePosition(position) {
  return {
    notation: position.toString(),
    index: position.hash(),
    x: position.x,
    y: position.y,
  };
}

/**
 * @param {import('../core/Board.js').Board} board
 */
function serializeBoard(board) {
  return {
    encoded: board.encode().toString(),
    pieces: Position.allValid()
      .filter((position) => board.isOccupied(position))
      .map((position) => ({
        position: serializePosition(position),
        color: board.isBlackPiece(position) ? 'BLACK' : 'WHITE',
        type: board.isDamePiece(position) ? 'DAME' : 'PION',
      })),
  };
}

/**
 * @param {import('../core/Game.js').Move} move
 * @param {number} index
 */
function serializeMove(move, index) {
  return {
    index,
    number: index + 1,
    from: serializePosition(move.from),
    to: serializePosition(move.to),
    captured: move.captured.map(serializePosition),
    path: expandRoute(move.path).map(serializePosition),
    trace: move.trace ? move.trace.toString() : null,
  };
}

/**
 * @param {import('../core/Game.js').Move} move
 */
function capturedKey(move) {
  return move.captured
    .map((position) => position.hash())
    .sort((a, b) => a - b)
    .join(',');
}

export class Engine {
  #game;
  /** Move indices that were undone, newest last; consumed by redo. */
  #redoStack = [];
  /** Move indices waiting for a user/frontend disambiguation pick. */
  #pendingPick = null;

  /**
   * @param {Game} [game]
   */
  constructor(game) {
    this.#game = game ? Game.copy(game) : new Game();
  }

  /** Snapshot of the current Game, kept for adapters that still render from Game. */
  getGame() {
    return Game.copy(this.#game);
  }

  isPickingMove() {
    return this.#pendingPick !== null;
  }

  getState() {
    const board = this.#game.board();
    const moves = this.#game.getMoves();
    const player = this.#game.player();
    const winner = moves.length === 0 ? opponentOf(player) : null;

    return {
      board: serializeBoard(board),
      ply: this.#game.getMoveSequence().length,
      player: COLOR_NAMES.get(player),
      winner: winner === null ? null : COLOR_NAMES.get(winner),
      gameOver: moves.length === 0,
      legalMoveCount: moves.length,
      moves: moves.map(serializeMove),
      moveSequence: this.#game.getMoveSequence(),
      canUndo: this.#game.getMoveSequence().length > 0,
      canRedo: this.#redoStack.length > 0,
      pendingPick: this.#pendingPick
        ? this.#pendingPick.map((index) => serializeMove(moves[index], index))
        : [],
    };
  }

  /**
   * @param {import('./parseInput.js').ParsedInput} parsed
   */
  async handle(parsed) {
    switch (parsed.kind) {
      case 'empty':
        return this.moves();
      case 'command':
        return this.runCommand(parsed.name);
      case 'index':
        return this.applyIndex(parsed.value);
      case 'coords':
        return this.applyCoords(parsed.from, parsed.to);
      case 'trace-index':
        return this.traceIndex(parsed.index);
      case 'trace-coords':
        return this.traceCoords(parsed.from, parsed.to);
      case 'error':
        return { kind: 'parse-error', message: parsed.message };
      default:
        return { kind: 'noop' };
    }
  }

  /**
   * @param {import('./parseInput.js').CommandName} name
   */
  async runCommand(name) {
    switch (name) {
      case 'help':
        return { kind: 'help' };
      case 'moves':
        return this.moves();
      case 'undo':
        return this.undo();
      case 'redo':
        return this.redo();
      case 'new':
        return this.newGame();
      case 'demo1':
      case 'demo2':
      case 'demo3':
      case 'demo4':
        return this.loadDemo(name);
      case 'quit':
        return { kind: 'quit' };
      default:
        return { kind: 'noop' };
    }
  }

  moves() {
    return { kind: 'state', action: 'moves', state: this.getState() };
  }

  newGame() {
    this.#game = new Game();
    this.#redoStack = [];
    this.#pendingPick = null;
    return { kind: 'state', action: 'new', state: this.getState() };
  }

  /**
   * @param {string} id
   */
  async loadDemo(id) {
    if (!DEMO_IDS.includes(id)) {
      return { kind: 'invalid-demo', id, available: [...DEMO_IDS] };
    }

    try {
      const [game, description] = await Promise.all([
        createDemoGame(id),
        explainDemo(id),
      ]);
      this.#game = game;
      this.#redoStack = [];
      this.#pendingPick = null;
      return {
        kind: 'demo',
        id,
        description,
        state: this.getState(),
      };
    } catch (err) {
      return {
        kind: 'error',
        action: 'demo',
        error: /** @type {Error} */ (err),
      };
    }
  }

  /**
   * Apply a move by its 1-based menu number.
   * @param {number} value
   */
  applyIndex(value) {
    const moves = this.#game.getMoves();
    if (!Number.isInteger(value) || value < 1 || value > moves.length) {
      return {
        kind: 'invalid-index',
        action: 'apply',
        value,
        legalMoveCount: moves.length,
      };
    }
    return this.#commitMove(value - 1, 'apply');
  }

  /**
   * @param {import('../core/Position.js').Position} from
   * @param {import('../core/Position.js').Position} to
   */
  applyCoords(from, to) {
    const moves = this.#game.getMoves();
    const matches = [];
    moves.forEach((move, index) => {
      if (move.from.equals(from) && move.to.equals(to)) matches.push(index);
    });

    if (matches.length === 0) {
      return {
        kind: 'no-coordinate-match',
        action: 'apply',
        from: serializePosition(from),
        to: serializePosition(to),
      };
    }
    if (matches.length === 1) {
      return this.#commitMove(matches[0], 'apply');
    }

    const firstKey = capturedKey(moves[matches[0]]);
    if (matches.every((index) => capturedKey(moves[index]) === firstKey)) {
      return this.#commitMove(matches[0], 'apply');
    }

    this.#pendingPick = matches;
    return {
      kind: 'pick-required',
      from: serializePosition(from),
      to: serializePosition(to),
      choices: matches.map((index) => serializeMove(moves[index], index)),
      state: this.getState(),
    };
  }

  /**
   * @param {number} value
   */
  traceIndex(value) {
    const moves = this.#game.getMoves();
    if (!Number.isInteger(value) || value < 1 || value > moves.length) {
      return {
        kind: 'invalid-index',
        action: 'trace',
        value,
        legalMoveCount: moves.length,
      };
    }
    return {
      kind: 'trace',
      move: serializeMove(moves[value - 1], value - 1),
    };
  }

  /**
   * @param {import('../core/Position.js').Position} from
   * @param {import('../core/Position.js').Position} to
   */
  traceCoords(from, to) {
    const moves = this.#game.getMoves();
    const matches = moves
      .map((move, index) => ({ move, index }))
      .filter(({ move }) => move.from.equals(from) && move.to.equals(to));

    if (matches.length === 0) {
      return {
        kind: 'no-coordinate-match',
        action: 'trace',
        from: serializePosition(from),
        to: serializePosition(to),
      };
    }

    return {
      kind: 'trace-list',
      from: serializePosition(from),
      to: serializePosition(to),
      moves: matches.map(({ move, index }) => serializeMove(move, index)),
    };
  }

  /**
   * Resolve a pending disambiguation pick from the user's input line.
   * @param {string} raw
   */
  resolvePick(raw) {
    const matches = this.#pendingPick;
    this.#pendingPick = null;
    if (!matches) {
      return { kind: 'noop' };
    }

    const choice = Number(raw.trim());
    if (!Number.isInteger(choice) || choice < 1 || choice > matches.length) {
      return { kind: 'cancelled' };
    }
    return this.#commitMove(matches[choice - 1], 'apply');
  }

  undo() {
    const sequence = this.#game.getMoveSequence();
    if (sequence.length === 0) {
      return { kind: 'empty-history', action: 'undo' };
    }

    this.#redoStack.push(sequence[sequence.length - 1]);
    this.#game.undoMove();
    this.#pendingPick = null;
    return { kind: 'state', action: 'undo', state: this.getState() };
  }

  redo() {
    const index = this.#redoStack.pop();
    if (index === undefined) {
      return { kind: 'empty-history', action: 'redo' };
    }

    return this.#commitMove(index, 'redo', false);
  }

  /**
   * @param {number} index
   * @param {'apply'|'redo'} action
   * @param {boolean} [resetRedo]
   */
  #commitMove(index, action, resetRedo = true) {
    try {
      this.#game.selectMove(index);
      if (resetRedo) this.#redoStack = [];
      this.#pendingPick = null;
      return { kind: 'state', action, state: this.getState() };
    } catch (err) {
      return {
        kind: 'error',
        action,
        error: /** @type {Error} */ (err),
      };
    }
  }
}
