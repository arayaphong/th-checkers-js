import { PieceColor } from '../../core/Piece.js';
import { Position } from '../../core/Position.js';

/**
 * Adapts the serialized engine state returned by the worker into a lightweight
 * Game-like object with the methods Board and Shell need.
 *
 * This avoids sending real Game/Board instances across the worker boundary,
 * where structured cloning strips class methods.
 *
 * @param {import('../../app/Engine.js').EngineState} state
 */
export function createGameAdapter(state) {
  return {
    board: () => createBoardAdapter(state.board),
    getMoves: () => state.moves.map(adaptMove),
    getMoveSequence: () => [...state.moveSequence],
    player: () => (state.player === 'BLACK' ? PieceColor.BLACK : PieceColor.WHITE),
  };
}

function createBoardAdapter(serializedBoard) {
  const pieces = new Map(serializedBoard.pieces.map((p) => [p.position.index, p]));

  return {
    isOccupied(pos) {
      return pieces.has(pos.hash());
    },
    isBlackPiece(pos) {
      return pieces.get(pos.hash())?.color === 'BLACK';
    },
    isDamePiece(pos) {
      return pieces.get(pos.hash())?.type === 'DAME';
    },
  };
}

function adaptMove(m) {
  return {
    from: Position.fromString(m.from.notation),
    to: Position.fromString(m.to.notation),
    captured: m.captured.map((c) => Position.fromString(c.notation)),
    path: m.path.map((p) => Position.fromString(p.notation)),
    trace: m.trace ?? undefined,
  };
}
