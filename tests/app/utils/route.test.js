import { describe, expect, test } from '@jest/globals';

import { expandRoute, singleRoute } from '../../../app/utils/route.js';
import { Game } from '../../../core/Game.js';
import { Position } from '../../../core/Position.js';
import { createDemo3Game } from '../../../app/demo/index.js';

/** Build waypoints from algebraic notation, e.g. p('D1', 'B3'). */
function p(...notations) {
  return notations.map((n) => Position.fromString(n));
}

/** Render a route as a space-separated notation string for easy assertions. */
function trail(waypoints) {
  return expandRoute(waypoints).map((pos) => pos.toString()).join(' ');
}

describe('expandRoute', () => {
  test('returns an empty array for no waypoints', () => {
    expect(expandRoute([])).toEqual([]);
  });

  test('keeps a single waypoint as-is', () => {
    expect(trail(p('C4'))).toBe('C4');
  });

  test('leaves an already-adjacent pair untouched (plain pion step)', () => {
    expect(trail(p('B3', 'C4'))).toBe('B3 C4');
  });

  test('fills the captured square jumped over by a pion capture', () => {
    // D1 -> B3 jumps over C2 (the captured piece).
    expect(trail(p('D1', 'B3'))).toBe('D1 C2 B3');
  });

  test('fills every empty square a flying dame glides across', () => {
    // B1 -> G6 glides C2 D3 E4, over the capture at F5, landing on G6.
    expect(trail(p('B1', 'G6'))).toBe('B1 C2 D3 E4 F5 G6');
  });

  test('expands a multi-jump chain into one continuous, gap-free trail', () => {
    const route = expandRoute(p('D1', 'B3', 'D5', 'F7'));
    // Every consecutive pair is a single diagonal step apart.
    for (let i = 1; i < route.length; i += 1) {
      const dx = Math.abs(route[i].x - route[i - 1].x);
      const dy = Math.abs(route[i].y - route[i - 1].y);
      expect(dx).toBe(1);
      expect(dy).toBe(1);
    }
    expect(trail(p('D1', 'B3', 'D5', 'F7'))).toBe('D1 C2 B3 C4 D5 E6 F7');
  });

  test('handles a loop that returns to the starting square', () => {
    // Dame loop D5 -> B3 -> D1 -> F3 -> D5 (demo2), expanded continuously.
    expect(trail(p('D5', 'B3', 'D1', 'F3', 'D5')))
      .toBe('D5 C4 B3 C2 D1 E2 F3 E4 D5');
  });

  test('does not mutate the input waypoints', () => {
    const waypoints = p('D1', 'B3');
    const before = waypoints.map((pos) => pos.toString());
    expandRoute(waypoints);
    expect(waypoints.map((pos) => pos.toString())).toEqual(before);
  });
});

describe('singleRoute', () => {
  test('returns the continuous path when exactly one move connects the squares', () => {
    const game = new Game();
    const move = game.getMoves()[0];
    const from = move.from.toString();
    const to = move.to.toString();

    const route = singleRoute(game.getMoves(), from, to);
    expect(route).not.toBeNull();
    expect(route.map((pos) => pos.toString())).toEqual(
      expandRoute(move.path).map((pos) => pos.toString()),
    );
  });

  test('returns null when no legal move connects the squares', () => {
    const game = new Game();
    expect(singleRoute(game.getMoves(), 'A1', 'H8')).toBeNull();
  });

  test('returns null when several mirror-image paths share the endpoints', async () => {
    // demo3 is a dame loop with two distinct D1 -> D1 routes — ambiguous, so it
    // is intentionally not highlighted.
    const game = await createDemo3Game();
    const loops = game.getMoves().filter(
      (move) => move.from.toString() === 'D1' && move.to.toString() === 'D1',
    );
    expect(loops.length).toBeGreaterThan(1);
    expect(singleRoute(game.getMoves(), 'D1', 'D1')).toBeNull();
  });
});
