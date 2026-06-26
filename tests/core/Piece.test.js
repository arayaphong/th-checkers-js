import { describe, expect, test } from '@jest/globals';
import {
  PieceColor,
  PieceType,
  assertPieceColor,
  assertPieceInfo,
  assertPieceType,
  isPieceColor,
  isPieceType,
  toStringPieceColor,
  toStringPieceType,
} from '../../core/Piece.js';

describe('Piece - runtime enum validation', () => {
  test('recognizes valid colors and types', () => {
    expect(isPieceColor(PieceColor.WHITE)).toBe(true);
    expect(isPieceColor(PieceColor.BLACK)).toBe(true);
    expect(isPieceType(PieceType.PION)).toBe(true);
    expect(isPieceType(PieceType.DAME)).toBe(true);
  });

  test('rejects invalid colors and types', () => {
    expect(isPieceColor(99)).toBe(false);
    expect(isPieceType(99)).toBe(false);
    expect(() => assertPieceColor(99)).toThrow(/Invalid piece color: 99/);
    expect(() => assertPieceType(99)).toThrow(/Invalid piece type: 99/);
  });

  test('validates piece info objects', () => {
    expect(() => assertPieceInfo({ color: PieceColor.WHITE, type: PieceType.PION })).not.toThrow();
    expect(() => assertPieceInfo(undefined)).toThrow(TypeError);
    expect(() => assertPieceInfo({ color: 99, type: PieceType.PION })).toThrow(/Invalid piece color/);
    expect(() => assertPieceInfo({ color: PieceColor.WHITE, type: 99 })).toThrow(/Invalid piece type/);
  });

  test('string helpers reject invalid enum values', () => {
    expect(toStringPieceColor(PieceColor.WHITE)).toBe('WHITE');
    expect(toStringPieceColor(PieceColor.BLACK)).toBe('BLACK');
    expect(toStringPieceType(PieceType.PION)).toBe('PION');
    expect(toStringPieceType(PieceType.DAME)).toBe('DAME');

    expect(() => toStringPieceColor(99)).toThrow(/Invalid piece color: 99/);
    expect(() => toStringPieceType(99)).toThrow(/Invalid piece type: 99/);
  });

  test('assertPieceInfo narrows valid inputs', () => {
    const value = { color: PieceColor.BLACK, type: PieceType.DAME };

    assertPieceInfo(value);
    const piece = value;

    expect(piece.color).toBe(PieceColor.BLACK);
    expect(piece.type).toBe(PieceType.DAME);
  });
});
