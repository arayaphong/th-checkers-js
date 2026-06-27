import { describe, expect, test } from '@jest/globals';

import { createDemo3Game, explainDemo3 } from '../../cli/demos/index.js';

describe('createDemo3Game', () => {
  test('produces exactly two legal moves', async () => {
    const game = await createDemo3Game();
    const moves = game.getMoves();

    expect(moves).toHaveLength(2);
  });

  test('both moves start and end on D1 and capture the same six pieces', async () => {
    const game = await createDemo3Game();
    const moves = game.getMoves();

    const capturedSet = ['C2', 'C4', 'E2', 'E6', 'G4', 'G6'];

    for (const move of moves) {
      expect(move.from.toString()).toBe('D1');
      expect(move.to.toString()).toBe('D1');
      expect(move.captured.map((p) => p.toString()).sort()).toEqual(capturedSet);
    }
  });

  test('the two moves are mirror-image paths', async () => {
    const game = await createDemo3Game();
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

describe('explainDemo3', () => {
  test('mentions the key squares and both loop directions', async () => {
    const text = await explainDemo3();
    expect(text).toContain('D1');
    expect(text).toContain('C2');
    expect(text).toContain('E2');
    expect(text).toContain('d1 d1');
  });
});
