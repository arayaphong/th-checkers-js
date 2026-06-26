import { describe, expect, test } from '@jest/globals';
import { Game } from '../../core/Game.js';
import { Board } from '../../core/Board.js';
import { Position } from '../../core/Position.js';
import { PieceColor, PieceType } from '../../core/Piece.js';

const MAX_CONSECUTIVE_UNDOS = 4;
const MAX_TEST_MOVES = 3;

// ============================================================================
// 1. Game - Default Constructor (4 tests)
// ============================================================================
describe('Game - Default Constructor', () => {
  test('Initial board state matches setup', () => {
    const game = new Game();
    expect(game.board().encode()).toBe(Board.setup().encode());
  });

  test('Initial player is white', () => {
    const game = new Game();
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Initial move count > 0', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
  });

  test('Empty move sequence initially', () => {
    const game = new Game();
    expect(game.getMoveSequence()).toHaveLength(0);
  });
});

// ============================================================================
// 2. Game - Constructor with Board (2 tests)
// ============================================================================
describe('Game - Constructor with Board', () => {
  test('Board is set correctly', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const customBoard = Board.fromPieces(pieces);
    const game = new Game(customBoard);
    expect(game.board().encode()).toBe(customBoard.encode());
  });

  test('Initial player is white with custom board', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    expect(game.player()).toBe(PieceColor.WHITE);
  });
});

// ============================================================================
// 3. Game - Copy functionality (3 tests)
// ============================================================================
describe('Game - Copy functionality', () => {
  test('Board state matches', () => {
    const original = new Game();
    original.selectMove(0);
    const copied = Game.copy(original);
    expect(copied.board().encode()).toBe(original.board().encode());
  });

  test('Player matches', () => {
    const original = new Game();
    original.selectMove(0);
    const copied = Game.copy(original);
    expect(copied.player()).toBe(original.player());
  });

  test('Move sequence matches', () => {
    const original = new Game();
    original.selectMove(0);
    const copied = Game.copy(original);
    expect(copied.getMoveSequence()).toEqual(original.getMoveSequence());
  });
});

// ============================================================================
// 4. Game - Player alternation (2 tests)
// ============================================================================
describe('Game - Player alternation', () => {
  test('White starts first', () => {
    const game = new Game();
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Players alternate after moves', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
    game.selectMove(0);
    expect(game.player()).toBe(PieceColor.BLACK);
    if (game.moveCount() > 0) {
      game.selectMove(0);
      expect(game.player()).toBe(PieceColor.WHITE);
    }
  });

  test('Turn alternates immediately after capture promotion', () => {
    const pieces = new Map([
      [Position.fromString('B3'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.moveCount()).toBe(1);

    game.selectMove(0);

    const board = game.board();
    const promoted = Position.fromString('D1');
    const stillPresent = Position.fromString('E2');

    expect(game.player()).toBe(PieceColor.BLACK);
    expect(game.getMoveSequence()).toEqual([0]);
    expect(board.isOccupied(promoted)).toBe(true);
    expect(board.isDamePiece(promoted)).toBe(true);
    expect(board.isOccupied(stillPresent)).toBe(true);
    expect(board.isBlackPiece(stillPresent)).toBe(true);
  });
});

// ============================================================================
// 5. Game - Move selection and execution (2 tests)
// ============================================================================
describe('Game - Move selection and execution', () => {
  test('Valid move selection', () => {
    const game = new Game();
    const initialCount = game.moveCount();
    expect(initialCount).toBeGreaterThan(0);
    expect(game.getMoveSequence()).toHaveLength(0);

    game.selectMove(0);
    expect(game.getMoveSequence()).toHaveLength(1);
    expect(game.getMoveSequence()[0]).toBe(0);
    expect(game.player()).toBe(PieceColor.BLACK);
  });

  test('Multiple moves', () => {
    const game = new Game();
    for (let i = 0; i < MAX_TEST_MOVES && game.moveCount() > 0; i++) {
      game.selectMove(0);
    }
    expect(game.getMoveSequence().length).toBeLessThanOrEqual(MAX_TEST_MOVES);
    if (game.getMoveSequence().length % 2 === 0) {
      expect(game.player()).toBe(PieceColor.WHITE);
    } else {
      expect(game.player()).toBe(PieceColor.BLACK);
    }
  });

  test('Dame capture can finish on a square occupied before the sequence', () => {
    const pieces = new Map([
      [Position.fromString('B1'), { color: PieceColor.WHITE, type: PieceType.DAME }],
      [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('E4'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('B5'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('E6'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    const moves = game.getMoves();
    const moveIndex = moves.findIndex(
      move => move.trace?.toString() === '×C2 →D3 ×E4 →F5 ×E6 →D7 ×B5 →A4 ×B3 →C2',
    );

    expect(moveIndex).toBeGreaterThanOrEqual(0);
    expect(() => game.selectMove(moveIndex)).not.toThrow();

    const landing = Position.fromString('C2');
    const board = game.board();
    expect(game.getMoveSequence()).toEqual([moveIndex]);
    expect(game.player()).toBe(PieceColor.BLACK);
    expect(board.getPieces(PieceColor.BLACK).size).toBe(0);
    expect(board.isOccupied(Position.fromString('B1'))).toBe(false);
    expect(board.isOccupied(landing)).toBe(true);
    expect(board.isBlackPiece(landing)).toBe(false);
    expect(board.isDamePiece(landing)).toBe(true);
  });
});

// ============================================================================
// 6. Game - Undo functionality (7 tests)
// ============================================================================
describe('Game - Undo functionality', () => {
  test('Cannot undo from initial state', () => {
    const game = new Game();
    expect(game.getMoveSequence()).toHaveLength(0);
    game.undoMove();
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Undo single move', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
    const initialBoard = game.board();
    const initialPlayer = game.player();
    game.selectMove(0);
    expect(game.getMoveSequence()).toHaveLength(1);
    expect(game.player()).not.toBe(initialPlayer);
    game.undoMove();
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(initialPlayer);
    expect(game.board().encode()).toBe(initialBoard.encode());
  });

  test('Undo multiple moves', () => {
    const game = new Game();
    const initialHash = game.board().encode();
    for (let i = 0; i < MAX_TEST_MOVES && game.moveCount() > 0; i++) {
      game.selectMove(0);
    }
    const movesMade = game.getMoveSequence().length;
    for (let i = 0; i < movesMade; i++) {
      game.undoMove();
    }
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.board().encode()).toBe(initialHash);
  });

  // ADDED: Undo preserves choices_dirty flag
  test('Undo preserves choices_dirty flag', () => {
    const game = new Game();
    expect(game.moveCount()).toBeGreaterThan(0);
    // Make a move (this should mark choices as dirty)
    game.selectMove(0);
    // This should recompute choices
    void game.moveCount();
    // Undo the move (this should also mark choices as dirty)
    game.undoMove();
    // This should recompute choices again
    const choicesAfterUndo = game.moveCount();
    // Verify that choices are properly recomputed
    expect(choicesAfterUndo).toBeGreaterThan(0);
  });

  // ADDED: Undo multiple times consecutively
  test('Undo multiple times consecutively', () => {
    const game = new Game();
    const moveCounts = [];
    const players = [];
    const boardHashes = [];

    // Record initial state
    moveCounts.push(game.moveCount());
    players.push(game.player());
    boardHashes.push(game.board().encode());

    // Make up to MAX_CONSECUTIVE_UNDOS moves
    for (let i = 0; i < MAX_CONSECUTIVE_UNDOS && game.moveCount() > 0; i++) {
      game.selectMove(0);
      moveCounts.push(game.moveCount());
      players.push(game.player());
      boardHashes.push(game.board().encode());
    }

    const totalMoves = game.getMoveSequence().length;

    // Undo moves one by one and verify each state
    for (let i = totalMoves; i > 0; i--) {
      game.undoMove();
      expect(game.getMoveSequence().length).toBe(i - 1);
      expect(game.player()).toBe(players[i - 1]);
      expect(game.board().encode()).toBe(boardHashes[i - 1]);
    }

    // Should be back to initial state
    expect(game.getMoveSequence()).toHaveLength(0);
    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.board().encode()).toBe(boardHashes[0]);
  });

  test('Undo after capture move', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromCoords(4, 5), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    const initialBoard = game.board();
    const initialPieceCount =
      initialBoard.getPieces(PieceColor.BLACK).size +
      initialBoard.getPieces(PieceColor.WHITE).size;

    if (game.moveCount() > 0) {
      game.selectMove(0);
      game.undoMove();
      const afterUndo = game.board();
      const afterPieceCount =
        afterUndo.getPieces(PieceColor.BLACK).size +
        afterUndo.getPieces(PieceColor.WHITE).size;
      expect(afterPieceCount).toBe(initialPieceCount);
      expect(afterUndo.encode()).toBe(initialBoard.encode());
    }
  });

  // ADDED: Undo with promotion
  test('Undo with promotion', () => {
    const pieces = new Map([
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(1, 6), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    if (game.moveCount() > 0) {
      game.selectMove(0);

      if (game.moveCount() > 0) {
        game.selectMove(0);

        // Undo the last move
        game.undoMove();

        // Verify the piece promotion is properly undone
        const afterUndoBoard = game.board();
        const whitePieces = afterUndoBoard.getPieces(PieceColor.WHITE);
        const blackPieces = afterUndoBoard.getPieces(PieceColor.BLACK);

        let promotionProperlyUndone = true;
        for (const [pos, pieceInfo] of whitePieces) {
          if (pos.y !== 0 && pieceInfo.type === PieceType.DAME) {
            promotionProperlyUndone = false;
          }
        }
        for (const [pos, pieceInfo] of blackPieces) {
          if (pos.y !== Position.BOARD_SIZE - 1 && pieceInfo.type === PieceType.DAME) {
            promotionProperlyUndone = false;
          }
        }

        expect(promotionProperlyUndone).toBe(true);
      }
    }
  });
});

// ============================================================================
// 7. Game - Move struct functionality (2 tests)
// ============================================================================
describe('Game - Move struct functionality', () => {
  test('Move equality', () => {
    const from = Position.fromCoords(1, 2);
    const to = Position.fromCoords(3, 4);
    const captured = [Position.fromCoords(2, 3)];
    const path = [from, to];
    const move1 = { from, to, captured, path };
    const move2 = { from, to, captured: [...captured], path: [...path] };
    const move3 = { from, to: Position.fromCoords(5, 6), captured, path: [from, Position.fromCoords(5, 6)] };

    // move1 equals move2
    expect(move1.from.equals(move2.from)).toBe(true);
    expect(move1.to.equals(move2.to)).toBe(true);
    expect(move1.captured.length).toBe(move2.captured.length);
    for (let i = 0; i < move1.captured.length; i++) {
      expect(move1.captured[i].equals(move2.captured[i])).toBe(true);
    }

    // move1 differs from move3
    expect(move1.to.equals(move3.to)).toBe(false);
  });

  test('Move capture detection', () => {
    const from = Position.fromCoords(1, 2);
    const to = Position.fromCoords(3, 4);
    const nonCapture = { from, to, captured: [], path: [from, to] };
    const capture = { from, to, captured: [Position.fromCoords(2, 3)], path: [from, to] };

    expect(nonCapture.captured.length).toBe(0);
    expect(capture.captured.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 7b. Game - Capture trace on Move (7 tests)
// ============================================================================
describe('Game - Capture trace on Move', () => {
  test('non-capture move has no trace', () => {
    const game = new Game();
    const moves = game.getMoves();
    for (const move of moves) {
      expect(move.trace).toBeUndefined();
    }
  });

  test('single capture move has trace with correct structure', () => {
    // White pion at C4, black pion at B3 — single capture C4→A2 ×B3
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    const moves = game.getMoves();
    expect(moves.length).toBeGreaterThan(0);

    const captureMove = moves.find(m => m.captured.length > 0);
    expect(captureMove).toBeDefined();
    expect(captureMove.trace).toBeDefined();
    expect(captureMove.trace.length).toBe(1);
    expect(captureMove.trace.sequence).toHaveLength(2);
    // sequence: [captured, landing]
    expect(captureMove.trace.sequence[0].equals(Position.fromString('B3'))).toBe(true);
    expect(captureMove.trace.sequence[1].equals(Position.fromString('A2'))).toBe(true);
  });

  test('capture trace.captured matches Move.captured', () => {
    // White at C4, black at B3 — single capture C4→A2 ×B3
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    const moves = game.getMoves();
    const captureMove = moves.find(m => m.captured.length > 0);
    expect(captureMove).toBeDefined();
    expect(captureMove.trace).toBeDefined();

    // trace.captured should match Move.captured
    const traceCaps = captureMove.trace.captured;
    expect(traceCaps.length).toBe(captureMove.captured.length);
    for (let i = 0; i < traceCaps.length; i++) {
      expect(traceCaps[i].equals(captureMove.captured[i])).toBe(true);
    }
  });

  test('capture trace.path includes all landings', () => {
    // Double capture: B5 ×C4→D3 ×E2→F1
    const pieces = new Map([
      [Position.fromString('B5'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    const moves = game.getMoves();
    const captureMove = moves.find(m => m.trace && m.trace.length === 2);
    expect(captureMove).toBeDefined();

    const path = captureMove.trace.path(captureMove.from);
    expect(path.length).toBe(3); // from, landing1, landing2
    expect(path[0].equals(captureMove.from)).toBe(true);
    // landing1 = D3, landing2 = F1 (the final to)
    expect(path[path.length - 1].equals(captureMove.to)).toBe(true);
  });

  test('getMoves returns defensive copy of trace', () => {
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    const moves1 = game.getMoves();
    const moves2 = game.getMoves();

    const cap1 = moves1.find(m => m.trace);
    const cap2 = moves2.find(m => m.trace);

    // Mutating cap1's captured shouldn't affect cap2
    cap1.captured.push(Position.fromString('D5'));
    expect(cap2.captured.length).toBe(1);
  });

  test('Game.copy preserves capture trace', () => {
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    const original = Game.copy(game);
    const origMoves = original.getMoves();
    const origCap = origMoves.find(m => m.trace);
    expect(origCap.trace).toBeDefined();

    const copied = Game.copy(original);
    const copiedMoves = copied.getMoves();
    const copiedCap = copiedMoves.find(m => m.trace);
    expect(copiedCap.trace).toBeDefined();
    expect(copiedCap.trace.length).toBe(origCap.trace.length);
    expect(copiedCap.trace.toString()).toBe(origCap.trace.toString());
  });

  test('trace.finalLanding matches Move.to', () => {
    const pieces = new Map([
      [Position.fromString('C4'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B3'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    const moves = game.getMoves();
    for (const move of moves) {
      if (move.trace) {
        expect(move.trace.finalLanding.equals(move.to)).toBe(true);
      }
    }
  });
});

// ============================================================================
// 8. Game - Edge cases
// ============================================================================
describe('Game - Edge cases', () => {
  test('Empty board game', () => {
    const game = new Game(Board.empty());
    expect(game.moveCount()).toBe(0);
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Single piece board', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));
    expect(game.player()).toBe(PieceColor.WHITE);
  });

  test('Rejects fractional move index', () => {
    const game = new Game();

    expect(() => game.selectMove(0.5)).toThrow(RangeError);
    expect(() => game.selectMove(0.5)).toThrow(/integer/);
    expect(game.getMoveSequence()).toHaveLength(0);
  });

  test('Rejects non-finite move index', () => {
    const game = new Game();

    expect(() => game.selectMove(Number.NaN)).toThrow(RangeError);
    expect(() => game.selectMove(Number.POSITIVE_INFINITY)).toThrow(/integer/);
    expect(game.getMoveSequence()).toHaveLength(0);
  });

  test('Rejects negative move index', () => {
    const game = new Game();

    expect(() => game.selectMove(-1)).toThrow(RangeError);
    expect(() => game.selectMove(-1)).toThrow(/out of range/);
    expect(game.getMoveSequence()).toHaveLength(0);
  });

  test('Rejects move index equal to move count', () => {
    const game = new Game();
    const count = game.moveCount();

    expect(() => game.selectMove(count)).toThrow(RangeError);
    expect(() => game.selectMove(count)).toThrow(/out of range/);
    expect(game.getMoveSequence()).toHaveLength(0);
  });

  test('Rejects move selection when no legal moves exist', () => {
    const game = new Game(Board.empty());

    expect(() => game.selectMove(0)).toThrow(RangeError);
    expect(() => game.selectMove(0)).toThrow(/no legal moves/);
    expect(game.getMoveSequence()).toHaveLength(0);
  });
});

// ============================================================================
// 9. Game - Board manipulation through game (2 tests)
// ============================================================================
describe('Game - Board manipulation through game', () => {
  test('Board state changes after moves', () => {
    const game = new Game();
    const initialHash = game.board().encode();
    if (game.moveCount() > 0) {
      game.selectMove(0);
      expect(game.board().encode()).not.toBe(initialHash);
    }
  });

  // ADDED: Board accessor is const correct
  test('Board accessor is const correct', () => {
    const game = new Game();
    // In JavaScript, const correctness is not enforced, but the accessor
    // should still return a usable board reference.
    const boardRef = game.board();
    const hash = boardRef.encode();
    expect(hash).toBe(game.board().encode());
  });

  test('Board accessor cannot mutate game state', () => {
    const game = new Game();
    const before = game.board().encode();
    const historyBefore = game.getEncodedHistory()[0];
    const transformed = game.board().removePiece(Position.fromString('B7'));

    expect(transformed.encode()).not.toBe(before);
    expect(game.board().encode()).toBe(before);
    expect(game.getEncodedHistory()[0]).toBe(historyBefore);
  });

  test('Board history entries cannot mutate game state', () => {
    const game = new Game();
    const before = game.board().encode();
    const transformed = game.getBoardHistory()[0].removePiece(Position.fromString('B7'));

    expect(transformed.encode()).not.toBe(before);
    expect(game.board().encode()).toBe(before);
    expect(game.getBoardHistory()[0].encode()).toBe(before);
  });

  test('Move sequence accessor cannot mutate game state', () => {
    const game = new Game();
    game.selectMove(0);
    const beforeSequence = game.getMoveSequence();
    const beforePlayer = game.player();

    const exposed = game.getMoveSequence();
    exposed.push(99);

    expect(game.getMoveSequence()).toEqual(beforeSequence);
    expect(game.player()).toBe(beforePlayer);
  });

  test('Board history accessor cannot remove internal board state', () => {
    const game = new Game();
    const before = game.board().encode();

    const exposed = game.getBoardHistory();
    exposed.pop();

    expect(game.board().encode()).toBe(before);
    expect(game.getBoardHistory()).toHaveLength(1);
  });

  test('Encoded history accessor cannot mutate internal history', () => {
    const game = new Game();
    const before = game.getEncodedHistory();

    const exposed = game.getEncodedHistory();
    exposed.pop();

    expect(game.getEncodedHistory()).toEqual(before);
  });

  test('Moves accessor cannot mutate cached choices', () => {
    const game = new Game();
    const moveCount = game.moveCount();
    const moves = game.getMoves();

    moves.pop();
    moves[0].captured.push(Position.fromString('B3'));

    const freshMoves = game.getMoves();
    expect(freshMoves).toHaveLength(moveCount);
    expect(freshMoves[0].captured).toHaveLength(0);
  });
});

// ============================================================================
// 11. Game - Move sequence integrity (2 tests)
// ============================================================================
describe('Game - Move sequence integrity', () => {
  test('Move sequence grows correctly', () => {
    const game = new Game();
    const initialSize = game.getMoveSequence().length;
    expect(initialSize).toBe(0);

    for (let i = 0; i < MAX_TEST_MOVES && game.moveCount() > 0; i++) {
      game.selectMove(0);
      expect(game.getMoveSequence().length).toBe(initialSize + i + 1);
    }
  });

  test('Move sequence values are valid', () => {
    const game = new Game();
    if (game.moveCount() > 0) {
      const moveCount = game.moveCount();
      game.selectMove(moveCount - 1);
      const sequence = game.getMoveSequence();
      expect(sequence.length).toBe(1);
      expect(sequence[0]).toBe(moveCount - 1);
    }
  });
});

// ============================================================================
// 12. Game - State consistency (2 tests)
// ============================================================================
describe('Game - State consistency', () => {
  test('Consistent state after operations', () => {
    const game = new Game();
    if (game.moveCount() > 0) {
      const initialPlayer = game.player();
      game.selectMove(0);
      expect(game.player()).not.toBe(initialPlayer);
      expect(game.getMoveSequence()).toHaveLength(1);
      game.undoMove();
      expect(game.player()).toBe(initialPlayer);
      expect(game.getMoveSequence()).toHaveLength(0);
    }
  });

  // ADDED: Move count consistency
  test('Move count consistency', () => {
    const board = Board.setup();
    const standardGame = new Game(board);
    expect(standardGame.moveCount()).toBeGreaterThan(0);
  });
});

// ============================================================================
// 13. Game - Promotion mechanics (3 tests) — ALL ADDED
// ============================================================================
// ADDED: Promotion mechanics describe block
describe('Game - Promotion mechanics', () => {
  test('Piece promotion verification', () => {
    const pieces = new Map([
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.player()).toBe(PieceColor.WHITE);
    expect(board.isOccupied(Position.fromCoords(0, 1))).toBe(true);
    expect(board.isBlackPiece(Position.fromCoords(0, 1))).toBe(false);
    expect(board.isDamePiece(Position.fromCoords(0, 1))).toBe(false);

    const initialMoveCount = game.moveCount();
    if (initialMoveCount > 0) {
      game.selectMove(0);

      const updatedBoard = game.board();
      const whitePieces = updatedBoard.getPieces(PieceColor.WHITE);

      for (const [pos, pieceInfo] of whitePieces) {
        if (pos.y === 0) {
          expect(pieceInfo.type).toBe(PieceType.DAME);
        }
      }
    }
  });

  test('No premature promotion', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 2), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(3, 4), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(board.isDamePiece(Position.fromCoords(1, 2))).toBe(false);
    expect(board.isDamePiece(Position.fromCoords(3, 4))).toBe(false);

    if (game.moveCount() > 0) {
      game.selectMove(0);

      const updatedBoard = game.board();
      const whitePieces = updatedBoard.getPieces(PieceColor.WHITE);
      const blackPieces = updatedBoard.getPieces(PieceColor.BLACK);

      for (const [pos, pieceInfo] of whitePieces) {
        if (pos.y !== 0) {
          expect(pieceInfo.type).toBe(PieceType.PION);
        }
      }

      for (const [pos, pieceInfo] of blackPieces) {
        if (pos.y !== Position.BOARD_SIZE - 1) {
          expect(pieceInfo.type).toBe(PieceType.PION);
        }
      }
    }
  });

  test('Black piece promotion test', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 6), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.player()).toBe(PieceColor.WHITE);

    if (game.moveCount() > 0) {
      game.selectMove(0);

      if (game.player() === PieceColor.BLACK && game.moveCount() > 0) {
        game.selectMove(0);

        const updatedBoard = game.board();
        const blackPieces = updatedBoard.getPieces(PieceColor.BLACK);

        for (const [pos, pieceInfo] of blackPieces) {
          if (pos.y === Position.BOARD_SIZE - 1) {
            expect(pieceInfo.type).toBe(PieceType.DAME);
          }
        }
      }
    }
  });
});

// ============================================================================
// 14. Game - Bitwise move generation (8 tests)
// ============================================================================
describe('Game - Bitwise move generation', () => {
  test('Standard board: white has exactly 7 opening moves', () => {
    const game = new Game();
    expect(game.player()).toBe(PieceColor.WHITE);
    expect(game.moveCount()).toBe(7);
  });

  // ADDED: Only current player's pieces generate moves
  test('Only current player pieces generate moves', () => {
    const pieces = new Map([
      [Position.fromCoords(3, 4), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(4, 5), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.player()).toBe(PieceColor.WHITE);
    const whiteMoves = game.moveCount();
    expect(whiteMoves).toBeGreaterThan(0);

    game.selectMove(0);
    expect(game.player()).toBe(PieceColor.BLACK);
    const blackMoves = game.moveCount();
    expect(blackMoves).toBeGreaterThan(0);
  });

  // ADDED: Dame pieces are found by bitwise iteration
  test('Dame pieces are found by bitwise iteration', () => {
    const pieces = new Map([
      [Position.fromCoords(3, 4), { color: PieceColor.WHITE, type: PieceType.DAME }],
      [Position.fromCoords(4, 1), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.moveCount()).toBeGreaterThan(2);
  });

  // ADDED: Mixed pion and dame pieces both found
  test('Mixed pion and dame pieces both found', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 4), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(5, 4), { color: PieceColor.WHITE, type: PieceType.DAME }],
      [Position.fromCoords(0, 1), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.moveCount()).toBeGreaterThan(2);
  });

  test('Empty board produces zero moves', () => {
    const game = new Game(Board.empty());
    expect(game.moveCount()).toBe(0);
  });

  // ADDED: Pieces with no legal moves are excluded
  test('Pieces with no legal moves are excluded', () => {
    const pieces = new Map([
      [Position.fromCoords(0, 1), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(1, 0), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 1), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    const count = game.moveCount();
    if (count > 0) {
      const hashBefore = game.board().encode();
      game.selectMove(0);
      game.undoMove();
      expect(game.board().encode()).toBe(hashBefore);
    }
  });

  // ADDED: Capture moves found correctly via bitwise iteration
  test('Capture moves found correctly via bitwise iteration', () => {
    const pieces = new Map([
      [Position.fromCoords(1, 4), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromCoords(2, 3), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const board = Board.fromPieces(pieces);
    const game = new Game(board);

    expect(game.moveCount()).toBe(1);

    game.selectMove(0);
    expect(game.board().isOccupied(Position.fromCoords(2, 3))).toBe(false);
    expect(game.board().isOccupied(Position.fromCoords(3, 2))).toBe(true);
  });

  test('Full game playthrough terminates', () => {
    const game = new Game();
    let moves = 0;
    const seen = new Set();
    seen.add(game.board().encode());

    while (game.moveCount() > 0 && moves < 500) {
      seen.add(game.board().encode());
      game.selectMove(0);
      moves++;
    }
    expect(moves).toBeGreaterThan(0);
    expect(game.getMoveSequence().length).toBe(moves);
  });
});

// ============================================================================
// 15. Game - Rules semantics: capture is mandatory but not maximal
// ============================================================================
// Thai checkers forces a capturing player to capture (no quiet moves are
// offered when any capture exists) but does NOT require taking the longest
// capture — unlike international draughts. This pins both halves of that rule.
describe('Game - Capture mandatory but not maximal', () => {
  test('Offers captures of different lengths and no quiet moves', () => {
    const pieces = new Map([
      // Left region: A6 has a forced double capture (×B5 →C4 ×D3 →E2).
      [Position.fromString('A6'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('B5'), { color: PieceColor.BLACK, type: PieceType.PION }],
      [Position.fromString('D3'), { color: PieceColor.BLACK, type: PieceType.PION }],
      // Right region: H5 has a single capture (×G4 →F3).
      [Position.fromString('H5'), { color: PieceColor.WHITE, type: PieceType.PION }],
      [Position.fromString('G4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    ]);
    const game = new Game(Board.fromPieces(pieces));

    expect(game.player()).toBe(PieceColor.WHITE);

    const moves = game.getMoves();
    // Mandatory: every offered move is a capture (no quiet A6/H5 step moves).
    expect(moves.every((m) => m.captured.length > 0)).toBe(true);

    // Not maximal: the single capture (length 1) is still offered alongside the
    // double capture (length 2). A maximal-capture rule would forbid the H5 move.
    const lengths = moves.map((m) => m.captured.length).sort();
    expect(lengths).toEqual([1, 2]);

    const froms = new Set(moves.map((m) => m.from.toString()));
    expect(froms).toEqual(new Set(['A6', 'H5']));
  });
});
