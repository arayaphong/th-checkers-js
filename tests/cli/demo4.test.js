import { describe, expect, test } from '@jest/globals';

import { createDemo4Game, explainDemo4 } from '../../cli/demos/index.js';

describe('createDemo4Game', () => {
  test('has multiple branching capture sequences', async () => {
    const game = await createDemo4Game();
    const moves = game.getMoves();

    expect(moves.length).toBeGreaterThan(2);
  });

  test('contains the two simple opposite-direction ring-loop paths', async () => {
    const game = await createDemo4Game();
    const moves = game.getMoves();

    const loopPaths = moves
      .filter((m) => m.from.toString() === 'D1' && m.to.toString() === 'D1')
      .map((m) => m.path.map((p) => p.toString()));

    expect(loopPaths).toContainEqual([
      'D1', 'B3', 'D5', 'F7', 'H5', 'F3', 'D1',
    ]);
    expect(loopPaths).toContainEqual([
      'D1', 'F3', 'H5', 'F7', 'D5', 'B3', 'D1',
    ]);
  });

  test('the two ring-loop paths each capture six pieces and leave E4 untouched', async () => {
    const game = await createDemo4Game();
    const moves = game.getMoves();

    const ringLoopPaths = [
      ['D1', 'B3', 'D5', 'F7', 'H5', 'F3', 'D1'],
      ['D1', 'F3', 'H5', 'F7', 'D5', 'B3', 'D1'],
    ];

    for (const expectedPath of ringLoopPaths) {
      const move = moves.find((m) => {
        const path = m.path.map((p) => p.toString());
        return JSON.stringify(path) === JSON.stringify(expectedPath);
      });
      expect(move).toBeDefined();
      expect(move.captured).toHaveLength(6);
      expect(move.captured.map((p) => p.toString())).not.toContain('E4');
    }
  });

  test('some sequences capture all seven black pions', async () => {
    const game = await createDemo4Game();
    const moves = game.getMoves();

    const fullCaptures = moves.filter((m) => m.captured.length === 7);
    expect(fullCaptures.length).toBeGreaterThan(0);

    for (const move of fullCaptures) {
      const capturedSquares = move.captured.map((p) => p.toString()).sort();
      expect(capturedSquares).toEqual(['C2', 'C4', 'E2', 'E4', 'E6', 'G4', 'G6']);
    }
  });
});

describe('explainDemo4', () => {
  test('mentions the key squares and both loop directions', async () => {
    const text = await explainDemo4();
    expect(text).toContain('D1');
    expect(text).toContain('C2');
    expect(text).toContain('E2');
    expect(text).toContain('E4');
    expect(text).toContain('d1 d1');
  });
});
