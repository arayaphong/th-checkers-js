import { describe, expect, test } from '@jest/globals';

import { createDemo31Game, explainDemo31 } from '../../app/demo31.js';

describe('createDemo31Game', () => {
  test('produces exactly two legal moves', () => {
    const game = createDemo31Game();
    const moves = game.getMoves();

    expect(moves).toHaveLength(2);
  });

  test('both moves start and end on D1 and capture the same six pieces', () => {
    const game = createDemo31Game();
    const moves = game.getMoves();

    const capturedSet = ['C2', 'C4', 'E2', 'E6', 'G4', 'G6'];

    for (const move of moves) {
      expect(move.from.toString()).toBe('D1');
      expect(move.to.toString()).toBe('D1');
      expect(move.captured.map((p) => p.toString()).sort()).toEqual(capturedSet);
    }
  });

  test('the two moves are mirror-image paths', () => {
    const game = createDemo31Game();
    const moves = game.getMoves();
    const [pathA, pathB] = moves.map((m) => m.path.map((p) => p.toString()));

    expect(pathA).toEqual([
      'D1', 'B3', 'D5', 'F7', 'H5', 'F3', 'D1',
    ]);
    expect(pathB).toEqual([
      'D1', 'F3', 'H5', 'F7', 'D5', 'B3', 'D1',
    ]);
    expect(pathA).toEqual(pathB.slice().reverse());
  });
});

describe('explainDemo31', () => {
  test('mentions the key squares and both loop directions', () => {
    const text = explainDemo31();
    expect(text).toContain('D1');
    expect(text).toContain('C2');
    expect(text).toContain('E2');
    expect(text).toContain('d1 d1');
  });
});
