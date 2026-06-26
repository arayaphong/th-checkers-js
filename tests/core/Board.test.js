import { describe, expect, test } from '@jest/globals';
import { Board } from '../../core/Board.js';
import { Position } from '../../core/Position.js';
import { PieceColor, PieceType } from '../../core/Piece.js';

function piecesFromFirstPositions(count) {
  return new Map(
    Position.allValid().slice(0, count).map(pos => [
      pos,
      { color: PieceColor.WHITE, type: PieceType.PION },
    ]),
  );
}

function encodedWithOccupiedSquares(count) {
  let occBits = 0;
  for (let i = 0; i < count; i++) {
    occBits |= (1 << i);
  }
  return BigInt(occBits >>> 0) << 32n;
}

describe('Board - constructor invariants', () => {
  test('accepts valid raw bitboards', () => {
    const board = new Board(0b11, 0b01, 0b10);

    expect(board.occBits).toBe(0b11);
    expect(board.blackBits).toBe(0b01);
    expect(board.dameBits).toBe(0b10);
  });

  test('accepts valid raw bitboards that use bit 31', () => {
    const highBit = 0x8000_0000;
    const board = new Board(highBit, highBit, highBit);

    expect(board.occBits).toBe(highBit);
    expect(board.blackBits).toBe(highBit);
    expect(board.dameBits).toBe(highBit);
  });

  test('rejects non-uint32 bitboards', () => {
    expect(() => new Board(0.5)).toThrow(/occBits must be an unsigned 32-bit integer/);
    expect(() => new Board(2 ** 32)).toThrow(/occBits must be an unsigned 32-bit integer/);
    expect(() => new Board(0, -1)).toThrow(/blackBits must be an unsigned 32-bit integer/);
    expect(() => new Board(0, 0, Number.POSITIVE_INFINITY)).toThrow(/dameBits must be an unsigned 32-bit integer/);
  });

  test('rejects raw boards with more than 16 occupied squares', () => {
    expect(() => new Board((1 << 17) - 1)).toThrow(RangeError);
    expect(() => new Board((1 << 17) - 1)).toThrow(/more than 16 pieces/);
  });

  test('rejects piece metadata on empty squares', () => {
    expect(() => new Board(0, 1, 0)).toThrow(/blackBits cannot mark empty squares/);
    expect(() => new Board(0, 0, 1)).toThrow(/dameBits cannot mark empty squares/);
  });
});

describe('Board - immutability', () => {
  test('movePiece returns a new board without changing the original', () => {
    const from = Position.fromCoords(1, 2);
    const to = Position.fromCoords(0, 1);
    const board = Board.fromPieces(new Map([
      [from, { color: PieceColor.WHITE, type: PieceType.PION }],
    ]));
    const before = board.encode();

    const moved = board.movePiece(from, to);

    expect(Object.isFrozen(board)).toBe(true);
    expect(board.encode()).toBe(before);
    expect(board.isOccupied(from)).toBe(true);
    expect(board.isOccupied(to)).toBe(false);
    expect(moved.isOccupied(from)).toBe(false);
    expect(moved.isOccupied(to)).toBe(true);
  });

  test('removePiece and promotePiece return new boards', () => {
    const pos = Position.fromCoords(1, 2);
    const board = Board.fromPieces(new Map([
      [pos, { color: PieceColor.WHITE, type: PieceType.PION }],
    ]));

    const removed = board.removePiece(pos);
    const promoted = board.promotePiece(pos);

    expect(board.isOccupied(pos)).toBe(true);
    expect(board.isDamePiece(pos)).toBe(false);
    expect(removed.isOccupied(pos)).toBe(false);
    expect(promoted.isOccupied(pos)).toBe(true);
    expect(promoted.isDamePiece(pos)).toBe(true);
  });
});

describe('Board - piece count invariant', () => {
  test('fromPieces accepts valid 16-piece Thai checkers boards', () => {
    const board = Board.fromPieces(piecesFromFirstPositions(16));

    expect(board.getPieces(PieceColor.WHITE).size).toBe(16);
  });

  test('fromPieces rejects boards with more than 16 pieces', () => {
    expect(() => Board.fromPieces(piecesFromFirstPositions(17))).toThrow(RangeError);
    expect(() => Board.fromPieces(piecesFromFirstPositions(17))).toThrow(/more than 16 pieces/);
  });

  test('decode rejects encoded boards with more than 16 occupied squares', () => {
    expect(() => Board.decode(encodedWithOccupiedSquares(17))).toThrow(RangeError);
    expect(() => Board.decode(encodedWithOccupiedSquares(17))).toThrow(/more than 16 pieces/);
  });

  test('decode rejects values outside unsigned 64-bit range', () => {
    expect(() => Board.decode(-1n)).toThrow(RangeError);
    expect(() => Board.decode(1n << 64n)).toThrow(RangeError);
  });

  test('decode rejects metadata bits without occupied squares', () => {
    expect(() => Board.decode(1n)).toThrow(/not canonical/);
    expect(() => Board.decode(1n << 16n)).toThrow(/not canonical/);
  });

  test('decode rejects metadata bits beyond occupied piece count', () => {
    const oneOccupiedSquare = 1n << 32n;
    const extraDameBit = 1n << 1n;
    const extraBlackBit = 1n << 17n;

    expect(() => Board.decode(oneOccupiedSquare | extraDameBit)).toThrow(/not canonical/);
    expect(() => Board.decode(oneOccupiedSquare | extraBlackBit)).toThrow(/not canonical/);
  });

  test('decode accepts canonical encoded boards', () => {
    const pieces = new Map([
      [Position.fromString('B1'), { color: PieceColor.BLACK, type: PieceType.DAME }],
      [Position.fromString('A2'), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);

    expect(Board.decode(board.encode()).equals(board)).toBe(true);
  });
});

describe('Board - piece map keys', () => {
  test('getPieces returns stable position index keys', () => {
    const board = Board.setup();
    const pieces = board.getPieces(PieceColor.WHITE);
    const position = Position.fromString('B7');

    expect(pieces.get(position.hash())).toEqual({
      color: PieceColor.WHITE,
      type: PieceType.PION,
    });
    expect(pieces.get(Position.fromString('B7').hash())).toEqual(pieces.get(position.hash()));
  });

  test('fromPieces accepts position index keys', () => {
    const position = Position.fromString('B1');
    const board = Board.fromPieces(new Map([
      [position.hash(), { color: PieceColor.BLACK, type: PieceType.DAME }],
    ]));

    expect(board.isOccupied(position)).toBe(true);
    expect(board.isBlackPiece(position)).toBe(true);
    expect(board.isDamePiece(position)).toBe(true);
  });

  test('fromPieces rejects duplicate logical positions', () => {
    const first = Position.fromString('B1');
    const second = Position.fromString('B1');
    const pieces = new Map([
      [first, { color: PieceColor.BLACK, type: PieceType.PION }],
      [second, { color: PieceColor.WHITE, type: PieceType.DAME }],
    ]);

    expect(first).not.toBe(second);
    expect(() => Board.fromPieces(pieces)).toThrow(/Duplicate piece position: B1/);
  });
});

describe('Board - runtime piece validation', () => {
  test('fromPieces rejects invalid piece colors', () => {
    const pieces = new Map([
      [
        Position.fromString('B1'),
        { color: 99, type: PieceType.PION },
      ],
    ]);

    expect(() => Board.fromPieces(pieces)).toThrow(RangeError);
    expect(() => Board.fromPieces(pieces)).toThrow(/Invalid piece color: 99/);
  });

  test('fromPieces rejects invalid piece types', () => {
    const pieces = new Map([
      [
        Position.fromString('B1'),
        { color: PieceColor.BLACK, type: 99 },
      ],
    ]);

    expect(() => Board.fromPieces(pieces)).toThrow(RangeError);
    expect(() => Board.fromPieces(pieces)).toThrow(/Invalid piece type: 99/);
  });

  test('fromPieces rejects missing piece info', () => {
    const pieces = new Map([
      [Position.fromString('B1'), undefined],
    ]);

    expect(() => Board.fromPieces(pieces)).toThrow(TypeError);
    expect(() => Board.fromPieces(pieces)).toThrow(/Piece info must be an object/);
  });

  test('getPieces rejects invalid colors', () => {
    const board = Board.setup();

    expect(() => board.getPieces(99)).toThrow(RangeError);
    expect(() => board.getPieces(99)).toThrow(/Invalid piece color: 99/);
  });
});
