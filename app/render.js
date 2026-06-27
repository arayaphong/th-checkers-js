// Rendering for the REPL. Composes the board grid, a status line and the
// numbered legal-move menu into a single printable string. Kept pure (Game in,
// string out) so it is easy to unit-test and the Repl stays thin.

import { boardToString } from './utils/BoardRenderer.js';
import { expandRoute } from './utils/route.js';
import { PieceColor, toStringPieceColor } from '../core/Piece.js';

/**
 * Format one move as it appears in the numbered menu,
 * e.g. "C3 -> D4 ×E5 →D4" for captures.
 * @param {import('../core/Game.js').Move} move
 * @returns {string}
 */
export function formatMove(move) {
  const captures = move.trace
    ? ` ${move.trace.toString()}`
    : move.captured.length > 0
      ? ` [x ${move.captured.map((c) => c.toString()).join(',')}]`
      : '';
  return `${move.from.toString()} -> ${move.to.toString()}${captures}`;
}

/**
 * Format the full continuous path of a move, listing every square the piece
 * passes through (not just the landing waypoints) so the trail is gap-free,
 * e.g. "D5 -> C4 -> B3 -> C2 -> D1 [x C4,C2]".
 * @param {import('../core/Game.js').Move} move
 * @returns {string}
 */
export function formatTrace(move) {
  const captures =
    move.captured.length > 0
      ? ` [x ${move.captured.map((c) => c.toString()).join(',')}]`
      : '';
  return `${expandRoute(move.path).map((p) => p.toString()).join(' -> ')}${captures}`;
}

/**
 * Render the full display: board, status line and numbered move menu (or game-over).
 * When `state` is provided and contains `collapsedMenu`, the move list is
 * collapsed — one representative per interchangeable group, with a note about
 * alternate variants.
 *
 * @param {import('../core/Game.js').Game} game
 * @param {object} [state] - Optional engine state with collapsedMenu / interchangeable
 * @returns {string}
 */
export function renderGame(game, state = null) {
  const moves = game.getMoves();
  const ply = game.getMoveSequence().length;
  const lines = [];

  lines.push(boardToString(game.board()).trimEnd());
  lines.push('');

  if (moves.length === 0) {
    const winner = game.player() === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    lines.push(`Game over — ${toStringPieceColor(winner)} wins (no moves for ${toStringPieceColor(game.player())}).`);
    return lines.join('\n');
  }

  // ── Collapsed menu (when engine state provides grouping) ──
  if (state?.collapsedMenu && state.collapsedMenu.length > 0) {
    const collapsed = state.collapsedMenu;
    lines.push(
      `Ply ${ply} — ${toStringPieceColor(game.player())} to move. ${collapsed.length} group(s) (${moves.length} total):`
    );

    for (const entry of collapsed) {
      const move = moves[entry.actualIndex];
      const altNote =
        entry.alternates > 0
          ? `  (~ ${entry.alternates} alternate variant${entry.alternates > 1 ? 's' : ''})`
          : '';
      lines.push(`  ${entry.displayNumber}) ${formatMove(move)}${altNote}`);
    }

    // If there are interchangeable groups, print a legend
    if (state.interchangeable && state.interchangeable.length > 0) {
      lines.push('');
      lines.push('Interchangeable groups (same intermediate squares):');
      for (const group of state.interchangeable) {
        const mid = group.intermediates.length > 0 ? group.intermediates.join(', ') : '(none)';
        lines.push(`  Group ${group.id}: moves [${group.moveNumbers.join(', ')}]  intermediates: {${mid}}`);
      }
    }

    return lines.join('\n');
  }

  // ── Fallback: classic full move list ──
  lines.push(`Ply ${ply} — ${toStringPieceColor(game.player())} to move. ${moves.length} legal move(s):`);
  moves.forEach((move, i) => {
    lines.push(`  ${i + 1}) ${formatMove(move)}`);
  });

  return lines.join('\n');
}
