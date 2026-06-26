import { pieceSymbol } from '../../core/Piece.js';
import { Position } from '../../core/Position.js';

const BOARD_RANGE = Object.freeze(
    Array.from({ length: Position.BOARD_SIZE }, (_, index) => index),
);
const FIRST_COLUMN_CODE = 'A'.charCodeAt(0);

export function boardToString(board) {
    const cols = BOARD_RANGE.map((col) => String.fromCharCode(FIRST_COLUMN_CODE + col));
    const header = `   ${cols.join(' ')} `;
    const rows = BOARD_RANGE.map((row) => {
        const cells = BOARD_RANGE.map((col) => {
            if ((row + col) % 2 === 0) {
                return '.';
            }
            const pos = Position.fromCoords(col, row);
            return board.isOccupied(pos)
                ? pieceSymbol(board.isBlackPiece(pos), board.isDamePiece(pos))
                : ' ';
        });
        return ` ${row + 1} ${cells.join(' ')} `;
    });
    return `${[header, ...rows].join('\n')}\n`;
}

export function movesToString(moves) {
    const lines = [`Moves (${moves.length}):`];
    for (const move of moves) {
        const capStr = move.captured.length > 0
            ? ` captures ${move.captured.map((pos) => pos.toString()).join(',')}`
            : '';
        lines.push(`  ${move.from.toString()} -> ${move.to.toString()}${capStr}`);
    }
    return lines.join('\n');
}

export function printBoard(board) {
    console.log(boardToString(board));
}

export function printChoices(game) {
    console.log(movesToString(game.getMoves()));
}
