import { describe, expect, test } from '@jest/globals';

import { createDemo2Game, explainDemo2 } from '../../app/demo/index.js';

describe('createDemo2Game', () => {
  test('has at least one legal move', async () => {
    const game = await createDemo2Game();
    const moves = game.getMoves();

    expect(moves.length).toBeGreaterThan(0);
  });

  test('contains a loop capture that starts and ends on D5', async () => {
    const game = await createDemo2Game();
    const moves = game.getMoves();

    const loopMoves = moves.filter((m) => m.from.toString() === 'D5' && m.to.toString() === 'D5');
    expect(loopMoves.length).toBeGreaterThan(0);
  });

  test('the loop capture captures all four black pions', async () => {
    const game = await createDemo2Game();
    const moves = game.getMoves();

    const loopMove = moves.find((m) => m.from.toString() === 'D5' && m.to.toString() === 'D5');
    expect(loopMove).toBeDefined();

    const capturedSquares = loopMove.captured.map((p) => p.toString()).sort();
    expect(capturedSquares).toEqual(['C2', 'C4', 'E2', 'E4']);
  });

  test('contains the expected loop path through the intermediate landings', async () => {
    const game = await createDemo2Game();
    const moves = game.getMoves();

    const expectedPath = [
      'D5', 'B3', 'D1', 'F3', 'D5',
    ];

    const match = moves.find((m) => {
      const path = m.path.map((p) => p.toString());
      return JSON.stringify(path) === JSON.stringify(expectedPath);
    });

    expect(match).toBeDefined();
  });
});

describe('explainDemo2', () => {
  test('mentions the key squares and the loop path', async () => {
    const text = await explainDemo2();
    expect(text).toContain('D5');
    expect(text).toContain('C4');
    expect(text).toContain('C2');
    expect(text).toContain('E2');
    expect(text).toContain('E4');
    expect(text).toContain('d5 d5');
  });
});
