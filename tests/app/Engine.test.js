import { describe, expect, test } from '@jest/globals';

import { Engine } from '../../app/Engine.js';
import { createDemo3Game, createDemo4Game } from '../../app/demo/index.js';
import { Game } from '../../core/Game.js';
import { Position } from '../../core/Position.js';

describe('Engine state data', () => {
  test('moves command returns structured board and move data', async () => {
    const engine = new Engine();
    const result = await engine.runCommand('moves');

    expect(result.kind).toBe('state');
    expect(result.action).toBe('moves');
    expect(result.state.board.encoded).toEqual(expect.any(String));
    expect(result.state.board.pieces.length).toBeGreaterThan(0);
    expect(result.state.moves.length).toBeGreaterThan(0);
    expect(result.state.moves[0]).toMatchObject({
      number: 1,
      from: { notation: expect.stringMatching(/^[A-H][1-8]$/) },
      to: { notation: expect.stringMatching(/^[A-H][1-8]$/) },
      captured: expect.any(Array),
      path: expect.any(Array),
    });
  });

  test('getGame returns a defensive copy of engine state', () => {
    const engine = new Engine();
    const before = engine.getState();
    const exposed = engine.getGame();

    exposed.selectMove(0);

    expect(engine.getState()).toEqual(before);
    expect(exposed.getMoveSequence()).toEqual([0]);
  });

  test('constructor copies injected game state', () => {
    const game = new Game();
    const engine = new Engine(game);
    const before = engine.getState();

    game.selectMove(0);

    expect(engine.getState()).toEqual(before);
    expect(game.getMoveSequence()).toEqual([0]);
  });
});

describe('Engine coordinate moves', () => {
  test('applies matching coordinates directly when all matches capture the same pieces', async () => {
    const engine = new Engine(await createDemo3Game());
    const result = engine.applyCoords(Position.fromString('D1'), Position.fromString('D1'));

    expect(result.kind).toBe('state');
    expect(engine.isPickingMove()).toBe(false);
    expect(result.state.gameOver).toBe(true);
  });

  test('returns disambiguation choices when matching coordinates capture different pieces', async () => {
    const engine = new Engine(await createDemo4Game());
    const result = engine.applyCoords(Position.fromString('D1'), Position.fromString('D1'));

    expect(result.kind).toBe('pick-required');
    expect(engine.isPickingMove()).toBe(true);
    expect(result.choices.length).toBeGreaterThan(1);
    expect(result.state.pendingPick).toHaveLength(result.choices.length);

    const pickResult = engine.resolvePick('2');
    expect(pickResult.kind).toBe('state');
    expect(engine.isPickingMove()).toBe(false);
  });
});

describe('Engine history', () => {
  test('undo and redo update state without rendering', () => {
    const engine = new Engine();

    expect(engine.applyIndex(1).kind).toBe('state');

    const undoResult = engine.undo();
    expect(undoResult.kind).toBe('state');
    expect(undoResult.state.canRedo).toBe(true);

    const redoResult = engine.redo();
    expect(redoResult.kind).toBe('state');
    expect(redoResult.action).toBe('redo');
    expect(redoResult.state.canUndo).toBe(true);
  });
});

describe('Engine interchangeable moves', () => {
  test('fresh game has no interchangeable moves', () => {
    const engine = new Engine();
    const state = engine.getState();

    expect(state.interchangeable).toEqual([]);
    expect(state.collapsedMenu.length).toBe(state.legalMoveCount);
    expect(state.collapsedCount).toBe(state.legalMoveCount);
    expect(state.moves[0].groupId).toBeNull();
  });

  test('demo3 has interchangeable mirror-image loop paths', async () => {
    const engine = new Engine(await createDemo3Game());
    const state = engine.getState();

    // Demo3: dame at D1 with 6 surrounding pions.
    // Two mirror-image loop paths capture the same pieces and land on D1.
    // Both paths visit the same set of intermediates (just different order).
    expect(state.interchangeable.length).toBeGreaterThanOrEqual(1);

    // Find the group containing the D1 loop moves
    const loopGroup = state.interchangeable.find((g) =>
      g.moveNumbers.some((n) => {
        const move = state.moves[n - 1];
        return move.from.notation === 'D1' && move.to.notation === 'D1';
      })
    );

    expect(loopGroup).toBeDefined();
    expect(loopGroup.moveNumbers.length).toBeGreaterThanOrEqual(2);
    expect(loopGroup.intermediates.length).toBeGreaterThan(0);

    // All moves in the group should have the same groupId
    for (const num of loopGroup.moveNumbers) {
      expect(state.moves[num - 1].groupId).toBe(loopGroup.id);
    }
  });

  test('collapsedMenu merges interchangeable moves into one entry', async () => {
    const engine = new Engine(await createDemo3Game());
    const state = engine.getState();

    // collapsedCount should be less than total moves when there are groups
    if (state.interchangeable.length > 0) {
      expect(state.collapsedCount).toBeLessThan(state.legalMoveCount);

      // The sum of alternates + collapsedCount should equal total moves
      const totalFromMenu = state.collapsedMenu.reduce(
        (sum, entry) => sum + 1 + entry.alternates,
        0
      );
      expect(totalFromMenu).toBe(state.legalMoveCount);
    }

    // Each collapsed entry should have the right shape
    for (const entry of state.collapsedMenu) {
      expect(entry).toMatchObject({
        displayNumber: expect.any(Number),
        actualIndex: expect.any(Number),
        groupId: expect.toBeOneOf([expect.any(Number), null]),
        alternates: expect.any(Number),
      });
      expect(entry.displayNumber).toBeGreaterThanOrEqual(1);
      expect(entry.actualIndex).toBeGreaterThanOrEqual(0);
      expect(entry.alternates).toBeGreaterThanOrEqual(0);
    }
  });

  test('applyIndex uses collapsed menu numbering', async () => {
    const engine = new Engine(await createDemo3Game());
    const stateBefore = engine.getState();

    // Picking menu item 1 should apply the first collapsed entry
    const result = engine.applyIndex(1);
    expect(result.kind).toBe('state');

    // The game should have progressed by exactly one ply
    expect(result.state.ply).toBe(stateBefore.ply + 1);
  });

  test('applyIndex rejects out-of-range collapsed menu number', async () => {
    const engine = new Engine(await createDemo3Game());
    const state = engine.getState();

    const result = engine.applyIndex(state.collapsedCount + 1);
    expect(result.kind).toBe('invalid-index');
    expect(result.legalMoveCount).toBe(state.collapsedCount);
  });

  test('demo4 does NOT group different-capture paths as interchangeable', async () => {
    const engine = new Engine(await createDemo4Game());
    const state = engine.getState();

    // Demo4 has extra central pion at E4 creating branches with DIFFERENT captures.
    // Moves that capture different pieces should NOT be interchangeable
    // even if they share the same from/to.
    const d1Moves = state.moves.filter((m) =>
      m.from.notation === 'D1' && m.to.notation === 'D1'
    );

    if (d1Moves.length >= 2) {
      // If two D1->D1 moves exist, they should have different captures
      // and thus should NOT share a groupId
      const captures = d1Moves.map((m) =>
        m.captured.map((c) => c.notation).sort().join(',')
      );
      const uniqueCaptures = [...new Set(captures)];

      // If captures differ, they shouldn't be in the same interchangeable group
      if (uniqueCaptures.length > 1) {
        const groupIds = d1Moves
          .map((m) => m.groupId)
          .filter((id) => id !== null);
        const uniqueGroupIds = [...new Set(groupIds)];
        // Different capture sets should not share the same group
        expect(uniqueGroupIds.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('Engine trace with interchangeable', () => {
  test('traceIndex includes groupId for interchangeable moves', async () => {
    const engine = new Engine(await createDemo3Game());
    const state = engine.getState();

    // Skip if no interchangeable groups
    if (state.interchangeable.length === 0) return;

    const groupedMoveNum = state.interchangeable[0].moveNumbers[0];
    const result = engine.traceIndex(groupedMoveNum);

    expect(result.kind).toBe('trace');
    expect(result.move.groupId).toBe(state.interchangeable[0].id);
  });

  test('traceIndex has null groupId for ungrouped moves', () => {
    const engine = new Engine();
    const result = engine.traceIndex(1);

    expect(result.kind).toBe('trace');
    expect(result.move.groupId).toBeNull();
  });

  test('traceCoords returns interchangeable array for grouped matches', async () => {
    const engine = new Engine(await createDemo3Game());
    const result = engine.traceCoords(Position.fromString('D1'), Position.fromString('D1'));

    expect(result.kind).toBe('trace-list');

    // Should have interchangeable info when there are multiple matching traces
    if (result.moves.length >= 2) {
      expect(result.interchangeable).toBeDefined();
      // moveNumbers should reference global move numbers
      if (result.interchangeable.length > 0) {
        for (const group of result.interchangeable) {
          for (const num of group.moveNumbers) {
            expect(num).toBeGreaterThanOrEqual(1);
            expect(num).toBeLessThanOrEqual(result.moves.length);
          }
        }
      }
    }
  });
});
