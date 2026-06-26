import { describe, expect, test } from '@jest/globals';
import { Game } from '../../core/Game.js';
import { PieceColor } from '../../core/Piece.js';

function positionKey(game) {
  const mixer = 0x9e3779b97f4a7c15n;
  return game.player() === PieceColor.BLACK
    ? game.board().encode() ^ mixer
    : game.board().encode();
}

describe('Selector - Deterministic playthroughs', () => {
  test('First-move selector terminates', () => {
    const game = new Game();
    const seen = new Set();
    seen.add(positionKey(game));
    let moves = 0;

    while (game.moveCount() > 0 && moves < 500) {
      game.selectMove(0);
      moves++;
      const key = positionKey(game);
      if (seen.has(key)) break;
      seen.add(key);
    }

    expect(moves).toBeGreaterThan(0);
    expect(game.getMoveSequence().length).toBe(moves);
    expect(game.getMoveSequence().every(m => m === 0)).toBe(true);
  });

  test('Last-move selector terminates', () => {
    const game = new Game();
    let moves = 0;
    while (moves < 500) {
      const count = game.moveCount();
      if (count === 0) break;
      game.selectMove(count - 1);
      moves++;
    }
    expect(moves).toBeGreaterThan(0);
    expect(game.getMoveSequence().length).toBe(moves);
  });

  test('Middle-move selector terminates', () => {
    const game = new Game();
    let moves = 0;
    while (moves < 500) {
      const count = game.moveCount();
      if (count === 0) break;
      game.selectMove(Math.floor(count / 2));
      moves++;
    }
    expect(moves).toBeGreaterThan(0);
    expect(game.getMoveSequence().length).toBe(moves);
  });

  test('Alternating selector terminates', () => {
    const game = new Game();
    let state = 0;
    let moves = 0;
    while (moves < 500) {
      const count = game.moveCount();
      if (count === 0) break;
      const idx = state % 2 === 0 ? count - 1 : 0;
      game.selectMove(idx);
      state++;
      moves++;
    }
    expect(moves).toBeGreaterThan(0);
    expect(game.getMoveSequence().length).toBe(moves);
  });

  test('Player alternates throughout playthrough', () => {
    const game = new Game();
    let moves = 0;
    while (game.moveCount() > 0 && moves < 100) {
      const before = game.player();
      game.selectMove(0);
      moves++;
      expect(game.player()).not.toBe(before);
    }
    expect(moves).toBeGreaterThan(0);
  });
});
