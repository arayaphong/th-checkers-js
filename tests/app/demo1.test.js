import { describe, expect, test } from '@jest/globals';

import { createDemo1Game, explainDemo1 } from '../../app/demo/index.js';

describe('createDemo1Game', () => {
  test('produces exactly two legal moves', () => {
    const game = createDemo1Game();
    const moves = game.getMoves();

    expect(moves).toHaveLength(2);
  });

  test('both moves start on D5 and end on D1', () => {
    const game = createDemo1Game();
    const moves = game.getMoves();

    for (const move of moves) {
      expect(move.from.toString()).toBe('D5');
      expect(move.to.toString()).toBe('D1');
    }
  });

  test('one move captures C4 and C2, the other captures E4 and E2', () => {
    const game = createDemo1Game();
    const moves = game.getMoves();

    const capturedSets = moves
      .map((m) => m.captured.map((p) => p.toString()).sort())
      .sort();

    expect(capturedSets).toEqual([
      ['C2', 'C4'],
      ['E2', 'E4'],
    ]);
  });

  test('each move captures two black pions', () => {
    const game = createDemo1Game();
    const moves = game.getMoves();

    for (const move of moves) {
      expect(move.captured).toHaveLength(2);
    }
  });
});

describe('explainDemo1', () => {
  test('mentions the key squares and both capture paths', () => {
    const text = explainDemo1();
    expect(text).toContain('D5');
    expect(text).toContain('D1');
    expect(text).toContain('C4');
    expect(text).toContain('C2');
    expect(text).toContain('E4');
    expect(text).toContain('E2');
    expect(text).toContain('d5 d1');
  });
});
