import { describe, expect, test } from '@jest/globals';

import { Engine } from '../../app/Engine.js';
import { createDemo3Game, createDemo4Game } from '../../app/demo/index.js';
import { Position } from '../../core/Position.js';

describe('Engine state data', () => {
  test('moves command returns structured board and move data', () => {
    const engine = new Engine();
    const result = engine.runCommand('moves');

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
});

describe('Engine coordinate moves', () => {
  test('applies matching coordinates directly when all matches capture the same pieces', () => {
    const engine = new Engine(createDemo3Game());
    const result = engine.applyCoords(Position.fromString('D1'), Position.fromString('D1'));

    expect(result.kind).toBe('state');
    expect(engine.isPickingMove()).toBe(false);
    expect(result.state.gameOver).toBe(true);
  });

  test('returns disambiguation choices when matching coordinates capture different pieces', () => {
    const engine = new Engine(createDemo4Game());
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
