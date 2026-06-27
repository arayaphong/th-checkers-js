// UI-neutral application engine. It owns the Game instance, undo/redo state,
// demo loading and move disambiguation, then returns structured results for
// whichever frontend is driving it.

import { Game } from '../core/Game.js';
import { PieceColor } from '../core/Piece.js';
import { Position } from '../core/Position.js';
import { createDemoGame, DEMO_IDS, explainDemo } from './demo/index.js';
import { expandRoute } from './utils/route.js';

const COLOR_NAMES = new Map([
  [PieceColor.WHITE, 'WHITE'],
  [PieceColor.BLACK, 'BLACK'],
]);

function opponentOf(color) {
  return color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
}

// ─── Interchangeable move detection ───

/**
 * Compute which moves are interchangeable — they share the same from, same to,
 * and the same unordered set of intermediate squares in their expanded path.
 * @param {import('../core/Game.js').Move[]} moves
 * @returns {{ interchangeable: InterchangeableGroup[], moveToGroup: Map<number, number> }}
 */
function computeInterchangeable(moves) {
  /** @type {Map<string, { indices: number[], intermediates: string[] }>} */
  const groups = new Map();

  moves.forEach((move, index) => {
    const expanded = expandRoute(move.path);
    const from = expanded[0].toString();
    const to = expanded[expanded.length - 1].toString();
    const intermediates = expanded.slice(1, -1).map((p) => p.toString()).sort();
    const key = `${from}\u2192${to}:${intermediates.join(',')}`;

    if (!groups.has(key)) {
      groups.set(key, { indices: [], intermediates });
    }
    groups.get(key).indices.push(index);
  });

  let nextGroupId = 1;
  /** @type {InterchangeableGroup[]} */
  const interchangeable = [];
  /** @type {Map<number, number>} */
  const moveToGroup = new Map();

  for (const group of groups.values()) {
    if (group.indices.length >= 2) {
      for (const idx of group.indices) {
        moveToGroup.set(idx, nextGroupId);
      }
      interchangeable.push({
        id: nextGroupId,
        moveNumbers: group.indices.map((i) => i + 1),
        intermediates: group.intermediates,
      });
      nextGroupId++;
    }
  }

  return { interchangeable, moveToGroup };
}

/**
 * Build a collapsed menu: one entry per group, one entry per ungrouped move.
 * @param {import('../core/Game.js').Move[]} moves
 * @param {Map<number, number>} moveToGroup
 * @returns {CollapsedMenuEntry[]}
 */
function buildCollapsedMenu(moves, moveToGroup) {
  const seenGroups = new Set();
  /** @type {CollapsedMenuEntry[]} */
  const menu = [];
  let displayNum = 1;

  for (let i = 0; i < moves.length; i++) {
    const groupId = moveToGroup.get(i);
    if (groupId && seenGroups.has(groupId)) continue;
    if (groupId) seenGroups.add(groupId);

    const alternates = groupId
      ? [...moveToGroup.values()].filter((gid) => gid === groupId).length - 1
      : 0;

    menu.push({
      displayNumber: displayNum++,
      actualIndex: i,
      groupId: groupId ?? null,
      alternates,
    });
  }

  return menu;
}

// ─── Serialization helpers ───

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
 * @param {number|null} [groupId]
 */
function serializeMove(move, index, groupId = null) {
  return {
    index,
    number: index + 1,
    from: serializePosition(move.from),
    to: serializePosition(move.to),
    captured: move.captured.map(serializePosition),
    path: expandRoute(move.path).map(serializePosition),
    trace: move.trace ? move.trace.toString() : null,
    groupId,
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

// ─── Engine class ───

export class Engine {
  #game;
  /** Move indices that were undone, newest last; consumed by redo. */
  #redoStack = [];
  /** Move indices waiting for a user/frontend disambiguation pick. */
  #pendingPick = null;
  /** Cached collapsed menu from the most recent getState() call. */
  #collapsedMenu = [];

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

    const { interchangeable, moveToGroup } = computeInterchangeable(moves);
    const collapsedMenu = buildCollapsedMenu(moves, moveToGroup);
    this.#collapsedMenu = collapsedMenu;

    return {
      board: serializeBoard(board),
      ply: this.#game.getMoveSequence().length,
      player: COLOR_NAMES.get(player),
      winner: winner === null ? null : COLOR_NAMES.get(winner),
      gameOver: moves.length === 0,
      legalMoveCount: moves.length,
      moves: moves.map((m, i) => serializeMove(m, i, moveToGroup.get(i) ?? null)),
      moveSequence: this.#game.getMoveSequence(),
      canUndo: this.#game.getMoveSequence().length > 0,
      canRedo: this.#redoStack.length > 0,
      pendingPick: this.#pendingPick
        ? this.#pendingPick.map((index) => serializeMove(moves[index], index))
        : [],
      interchangeable,
      collapsedMenu,
      collapsedCount: collapsedMenu.length,
    };
  }

  /**
   * @param {import('./parse.js').ParsedInput} parsed
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
   * @param {import('./parse.js').CommandName} name
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
   * Apply a move by its 1-based collapsed-menu number.
   * @param {number} value
   */
  applyIndex(value) {
    const menu = this.#collapsedMenu;
    if (!Number.isInteger(value) || value < 1 || value > menu.length) {
      return {
        kind: 'invalid-index',
        action: 'apply',
        value,
        legalMoveCount: menu.length,
      };
    }
    const actualIndex = menu[value - 1].actualIndex;
    return this.#commitMove(actualIndex, 'apply');
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
    const { moveToGroup } = computeInterchangeable(moves);
    return {
      kind: 'trace',
      move: serializeMove(moves[value - 1], value - 1, moveToGroup.get(value - 1) ?? null),
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

    const matchMoves = matches.map(({ move }) => move);
    const { interchangeable, moveToGroup } = computeInterchangeable(matchMoves);

    // Remap group moveNumbers from match-local (1-based) to global move numbers
    const globalNumbers = matches.map(({ index }) => index + 1);
    const remappedInterchangeable = interchangeable.map((g) => ({
      ...g,
      moveNumbers: g.moveNumbers.map((n) => globalNumbers[n - 1]),
    }));

    return {
      kind: 'trace-list',
      from: serializePosition(from),
      to: serializePosition(to),
      moves: matches.map(({ move, index }, matchIdx) =>
        serializeMove(move, index, moveToGroup.get(matchIdx) ?? null)
      ),
      interchangeable: remappedInterchangeable,
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

// ─── Type definitions (JSDoc) ───

/**
 * @typedef {Object} InterchangeableGroup
 * @property {number} id - 1-based group identifier
 * @property {number[]} moveNumbers - 1-based move numbers in this group
 * @property {string[]} intermediates - sorted intermediate square notations
 */

/**
 * @typedef {Object} CollapsedMenuEntry
 * @property {number} displayNumber - 1-based menu number in collapsed view
 * @property {number} actualIndex - 0-based index into the full moves array
 * @property {number|null} groupId - group this entry belongs to, or null
 * @property {number} alternates - how many other moves are hidden in this group
 */
