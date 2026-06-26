import { describe, expect, test } from '@jest/globals';
import { Legals, CaptureTrace } from '../../core/Legals.js';
import { Position } from '../../core/Position.js';

describe('Legals - index validation', () => {
  test('getPosition rejects non-integer indexes', () => {
    const legals = new Legals([Position.fromString('B1')]);

    expect(() => legals.getPosition(0.5)).toThrow(RangeError);
    expect(() => legals.getPosition(0.5)).toThrow(/integer/);
    expect(() => legals.getPosition(Number.NaN)).toThrow(RangeError);
  });

  test('getPosition rejects out-of-range indexes', () => {
    const legals = new Legals([Position.fromString('B1')]);

    expect(() => legals.getPosition(-1)).toThrow(RangeError);
    expect(() => legals.getPosition(1)).toThrow(RangeError);
  });

  test('regular move path is the target square', () => {
    const legals = new Legals([Position.fromString('B1')]);
    expect(legals.getMoveInfo(0).path.map(pos => pos.toString())).toEqual(['B1']);
  });

  test('getMoveInfo rejects invalid indexes', () => {
    const legals = new Legals([Position.fromString('B1')]);

    expect(() => legals.getMoveInfo(0.5)).toThrow(RangeError);
    expect(() => legals.getMoveInfo(Number.NaN)).toThrow(RangeError);
    expect(() => legals.getMoveInfo(1)).toThrow(RangeError);
  });

  test('getCapturePieces rejects invalid indexes for capture moves', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);

    expect(() => legals.getCapturePieces(0.5)).toThrow(RangeError);
    expect(() => legals.getCapturePieces(Number.NaN)).toThrow(RangeError);
    expect(() => legals.getCapturePieces(1)).toThrow(RangeError);
  });
});

describe('Legals - immutability', () => {
  test('getCapturePieces returns a defensive copy', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);

    const captured = legals.getCapturePieces(0);
    captured.push(Position.fromString('D3'));

    expect(legals.getCapturePieces(0)).toHaveLength(1);
    expect(legals.getCapturePieces(0)[0].equals(Position.fromString('B3'))).toBe(true);
  });

  test('getMoveInfo returns a defensive copy', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);

    const move = legals.getMoveInfo(0);
    move.capturedPositions.push(Position.fromString('D3'));

    expect(legals.getMoveInfo(0).capturedPositions).toHaveLength(1);
  });

  test('iterator yields defensive copies', () => {
    const legals = new Legals([
      [Position.fromString('B3'), Position.fromString('A2')],
    ]);
    const [move] = [...legals];

    move.capturedPositions.push(Position.fromString('D3'));

    expect(legals.getMoveInfo(0).capturedPositions).toHaveLength(1);
  });
});

describe('Legals - capture sequence validation', () => {
  test('rejects empty capture sequence', () => {
    expect(() => new Legals([[]])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects single-position capture sequence', () => {
    expect(() => new Legals([
      [Position.fromString('B3')],
    ])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects odd-length capture sequence', () => {
    expect(() => new Legals([
      [Position.fromString('B3'), Position.fromString('A2'), Position.fromString('D3')],
    ])).toThrow(/captured\/landing position pairs/);
  });

  test('accepts captured and landing pairs', () => {
    const legals = new Legals([
      [
        Position.fromString('B3'),
        Position.fromString('A2'),
        Position.fromString('D3'),
        Position.fromString('E4'),
      ],
    ]);

    expect(legals.getPosition(0).equals(Position.fromString('E4'))).toBe(true);
    expect(legals.getCapturePieces(0).map(pos => pos.toString())).toEqual(['B3', 'D3']);
    expect(legals.getMoveInfo(0).path.map(pos => pos.toString())).toEqual(['A2', 'E4']);
  });
});

describe('Legals - runtime position validation', () => {
  test('rejects non-Position regular moves', () => {
    const positions = [{}];

    expect(() => new Legals(positions)).toThrow(TypeError);
    expect(() => new Legals(positions)).toThrow(/Regular move 0 must be a Position/);
  });

  test('rejects mixed regular move inputs', () => {
    const positions = [
      Position.fromString('B1'),
      [Position.fromString('B3'), Position.fromString('A2')],
    ];

    expect(() => new Legals(positions)).toThrow(TypeError);
    expect(() => new Legals(positions)).toThrow(/Regular move 1 must be a Position/);
  });

  test('rejects non-Position captured entries', () => {
    const sequences = [
      [{}, Position.fromString('A2')],
    ];

    expect(() => new Legals(sequences)).toThrow(TypeError);
    expect(() => new Legals(sequences)).toThrow(/Capture sequence item 0 must be a Position/);
  });

  test('rejects non-Position landing entries', () => {
    const sequences = [
      [Position.fromString('B3'), {}],
    ];

    expect(() => new Legals(sequences)).toThrow(TypeError);
    expect(() => new Legals(sequences)).toThrow(/Capture sequence item 1 must be a Position/);
  });

  test('rejects mixed capture move inputs', () => {
    const sequences = [
      [Position.fromString('B3'), Position.fromString('A2')],
      Position.fromString('C4'),
    ];

    expect(() => new Legals(sequences)).toThrow(TypeError);
    expect(() => new Legals(sequences)).toThrow(/Capture move 1 must be a capture sequence/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CaptureTrace
// ═══════════════════════════════════════════════════════════════════════════════
describe('CaptureTrace', () => {
  const B3 = Position.fromString('B3');
  const A2 = Position.fromString('A2');
  const D3 = Position.fromString('D3');
  const E4 = Position.fromString('E4');
  const F5 = Position.fromString('F5');
  const G6 = Position.fromString('G6');

  // ── construction ──

  test('constructs with captured/landing pairs', () => {
    const trace = new CaptureTrace([B3, A2, D3, E4]);
    expect(trace.length).toBe(2);
    expect(trace.sequence).toHaveLength(4);
  });

  test('rejects empty sequence', () => {
    expect(() => new CaptureTrace([])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects single-element sequence', () => {
    expect(() => new CaptureTrace([B3])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects odd-length sequence', () => {
    expect(() => new CaptureTrace([B3, A2, D3])).toThrow(/captured\/landing position pairs/);
  });

  test('rejects non-Position captured entries', () => {
    const sequence = [{}, A2];

    expect(() => new CaptureTrace(sequence)).toThrow(TypeError);
    expect(() => new CaptureTrace(sequence)).toThrow(/CaptureTrace sequence item 0 must be a Position/);
  });

  test('rejects non-Position landing entries', () => {
    const sequence = [B3, {}];

    expect(() => new CaptureTrace(sequence)).toThrow(TypeError);
    expect(() => new CaptureTrace(sequence)).toThrow(/CaptureTrace sequence item 1 must be a Position/);
  });

  // ── sequence ──

  test('sequence is frozen (immutable)', () => {
    const trace = new CaptureTrace([B3, A2]);
    expect(() => {
      trace.sequence.push(D3);
    }).toThrow();
  });

  test('sequence preserves order', () => {
    const trace = new CaptureTrace([B3, A2, D3, E4]);
    expect(trace.sequence[0].equals(B3)).toBe(true);
    expect(trace.sequence[1].equals(A2)).toBe(true);
    expect(trace.sequence[2].equals(D3)).toBe(true);
    expect(trace.sequence[3].equals(E4)).toBe(true);
  });

  // ── captured ──

  test('captured returns only captured pieces (even indices)', () => {
    const trace = new CaptureTrace([B3, A2, D3, E4, F5, G6]);
    const caps = trace.captured;
    expect(caps).toHaveLength(3);
    expect(caps[0].equals(B3)).toBe(true);
    expect(caps[1].equals(D3)).toBe(true);
    expect(caps[2].equals(F5)).toBe(true);
  });

  test('captured is a defensive copy', () => {
    const trace = new CaptureTrace([B3, A2]);
    const caps = trace.captured;
    caps.push(D3);
    expect(trace.captured).toHaveLength(1);
  });

  // ── path ──

  test('path returns travel from given start position', () => {
    const from = Position.fromString('C4');
    const trace = new CaptureTrace([B3, A2, D3, E4]);
    const path = trace.path(from);
    expect(path).toHaveLength(3);
    expect(path[0].equals(from)).toBe(true);
    expect(path[1].equals(A2)).toBe(true);
    expect(path[2].equals(E4)).toBe(true);
  });

  test('path with single capture', () => {
    const from = Position.fromString('C4');
    const trace = new CaptureTrace([Position.fromString('D3'), Position.fromString('E2')]);
    const path = trace.path(from);
    expect(path).toHaveLength(2);
    expect(path[0].equals(from)).toBe(true);
    expect(path[1].equals(Position.fromString('E2'))).toBe(true);
  });

  // ── length ──

  test('length is number of captures', () => {
    expect(new CaptureTrace([B3, A2]).length).toBe(1);
    expect(new CaptureTrace([B3, A2, D3, E4]).length).toBe(2);
    expect(new CaptureTrace([B3, A2, D3, E4, F5, G6]).length).toBe(3);
  });

  // ── finalLanding ──

  test('finalLanding is last element of sequence', () => {
    const trace = new CaptureTrace([B3, A2, D3, E4]);
    expect(trace.finalLanding.equals(E4)).toBe(true);
  });

  test('finalLanding with single capture', () => {
    const trace = new CaptureTrace([B3, A2]);
    expect(trace.finalLanding.equals(A2)).toBe(true);
  });

  // ── toString ──

  test('toString single capture', () => {
    const trace = new CaptureTrace([B3, A2]);
    expect(trace.toString()).toBe('×B3 →A2');
  });

  test('toString double capture', () => {
    const trace = new CaptureTrace([B3, A2, D3, E4]);
    expect(trace.toString()).toBe('×B3 →A2 ×D3 →E4');
  });

  test('toString triple capture', () => {
    const trace = new CaptureTrace([B3, A2, D3, E4, F5, G6]);
    expect(trace.toString()).toBe('×B3 →A2 ×D3 →E4 ×F5 →G6');
  });
});
