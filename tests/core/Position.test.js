import { describe, expect, test } from '@jest/globals';
import { Position } from '../../core/Position.js';

describe('Position - fromString', () => {
  test('parses exact algebraic notation', () => {
    expect(Position.fromString('B1').toString()).toBe('B1');
    expect(Position.fromString('C4').toString()).toBe('C4');
    expect(Position.fromString('G8').toString()).toBe('G8');
  });

  test('rejects trailing characters', () => {
    expect(() => Position.fromString('C4extra')).toThrow(/Invalid position string/);
    expect(() => Position.fromString('B1x')).toThrow(/Invalid position string/);
  });

  test('rejects multi-digit rows', () => {
    expect(() => Position.fromString('B10')).toThrow(/Invalid position string/);
  });

  test('rejects lowercase notation', () => {
    expect(() => Position.fromString('c4')).toThrow(/Invalid position string/);
  });

  test('rejects light squares after parsing valid-looking notation', () => {
    expect(() => Position.fromString('A1')).toThrow(/Invalid coordinates/);
  });
});

describe('Position - numeric factories', () => {
  test('constructor rejects invalid indexes', () => {
    expect(() => new Position(-1)).toThrow(/Invalid position index/);
    expect(() => new Position(32)).toThrow(/Invalid position index/);
    expect(() => new Position(0.5)).toThrow(/Invalid position index/);
    expect(() => new Position(Number.NaN)).toThrow(/Invalid position index/);
    expect(() => new Position(Number.POSITIVE_INFINITY)).toThrow(/Invalid position index/);
  });

  test('fromCoords rejects fractional coordinates', () => {
    expect(() => Position.fromCoords(1.5, 1.5)).toThrow(/Invalid coordinates/);
    expect(() => Position.fromCoords(0.5, 0.5)).toThrow(/Invalid coordinates/);
  });

  test('fromCoords rejects non-finite coordinates', () => {
    expect(() => Position.fromCoords(Number.NaN, 1)).toThrow(/Invalid coordinates/);
    expect(() => Position.fromCoords(1, Number.POSITIVE_INFINITY)).toThrow(/Invalid coordinates/);
  });

  test('fromIndex parses valid indexes', () => {
    expect(Position.fromIndex(0).toString()).toBe('B1');
    expect(Position.fromIndex(31).toString()).toBe('G8');
  });

  test('fromIndex rejects invalid indexes', () => {
    expect(() => Position.fromIndex(-1)).toThrow(/Invalid position index/);
    expect(() => Position.fromIndex(32)).toThrow(/Invalid position index/);
    expect(() => Position.fromIndex(0.5)).toThrow(/Invalid position index/);
    expect(() => Position.fromIndex(Number.NaN)).toThrow(/Invalid position index/);
    expect(() => Position.fromIndex(Number.POSITIVE_INFINITY)).toThrow(/Invalid position index/);
  });
});
