import { describe, expect, test } from '@jest/globals';

import { Board } from '../../core/Board.js';
import { Game } from '../../core/Game.js';
import { Position } from '../../core/Position.js';
import { PieceColor, PieceType } from '../../core/Piece.js';
import { formatMove, formatTrace, renderGame } from '../../cli/render.js';

describe('formatMove', () => {
  test('renders a plain move', () => {
    const game = new Game();
    const move = game.getMoves()[0];
    expect(formatMove(move)).toMatch(/^[A-H][1-8] -> [A-H][1-8]$/);
  });

  test('renders a capture move with trace notation', () => {
    // White pion at C4, black pion at B3 — single capture: C4→A2 ×B3 →A2
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    const moves = game.getMoves();
    const captureMove = moves.find((m) => m.trace);
    expect(captureMove).toBeDefined();

    const formatted = formatMove(captureMove);
    expect(formatted).toContain('×B3');
    expect(formatted).toContain('→A2');
    expect(formatted).toMatch(/^C4 -> A2 ×B3 →A2$/);
  });
});

describe('formatTrace', () => {
  test('renders a plain move as its single step', () => {
    const game = new Game();
    const move = game.getMoves()[0];
    expect(formatTrace(move)).toMatch(/^[A-H][1-8] -> [A-H][1-8]$/);
  });

  test('lists every square a capture passes through, not just the landings', () => {
    // White pion at C4, black pion at B3 — single capture C4 -> A2 over B3.
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    const captureMove = game.getMoves().find((m) => m.trace);
    expect(captureMove).toBeDefined();

    // The captured square B3 sits on the path between C4 and A2.
    expect(formatTrace(captureMove)).toBe('C4 -> B3 -> A2 [x B3]');
  });

  test('produces a continuous, gap-free trail for a multi-jump chain', () => {
    // Dame at D5 looping over four pions back to D5 (the demo2 shape).
    const pieces = new Map([
      [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.DAME }],
      [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('E4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    const move = game.getMoves()[0];

    const [path] = formatTrace(move).split(' [x ');
    const squares = path.split(' -> ');
    // No jumps: each consecutive pair is one diagonal step apart.
    for (let i = 1; i < squares.length; i += 1) {
      const a = Position.fromString(squares[i - 1]);
      const b = Position.fromString(squares[i]);
      expect(Math.abs(b.x - a.x)).toBe(1);
      expect(Math.abs(b.y - a.y)).toBe(1);
    }
  });
});

describe('renderGame', () => {
  test('shows the board, status line and a numbered menu at the start', () => {
    const game = new Game();
    const output = renderGame(game);

    // Board header row (columns A..H).
    expect(output).toContain('A B C D E F G H');
    // Status line: side to move and ply count.
    expect(output).toContain('WHITE to move');
    expect(output).toContain('Ply 0');
    // At least one numbered move entry.
    expect(output).toMatch(/^\s+1\) [A-H][1-8] -> [A-H][1-8]/m);
  });

  test('reports game over when the side to move has no legal moves', () => {
    // An empty board leaves WHITE (the side to move first) with nothing to do.
    const game = new Game(Board.empty());
    const output = renderGame(game);
    expect(output).toContain('Game over');
    expect(output).toContain('BLACK wins');
  });

  test('a fresh game is not game over', () => {
    expect(renderGame(new Game())).not.toContain('Game over');
  });
});
