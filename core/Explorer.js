// Move generation — Thai Checkers rules
import { PieceColor } from './Piece.js';
import { Position } from './Position.js';
import { Legals } from './Legals.js';

const freezeDirs = (dirs) => Object.freeze(dirs.map((dir) => Object.freeze(dir)));

const WHITE_PION_DIRS = freezeDirs([{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }]);
const BLACK_PION_DIRS = freezeDirs([{ dx: -1, dy: 1 }, { dx: 1, dy: 1 }]);
const DAME_DIRS = freezeDirs([
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
]);

function getDirs(color, isDame) {
    return isDame
        ? DAME_DIRS
        : color === PieceColor.BLACK ? BLACK_PION_DIRS : WHITE_PION_DIRS;
}

// ─── Explorer ───
export class Explorer {
    #board;
    constructor(board) {
        this.#board = board;
    }
    // ─── public API ───
    findValidMoves(from) {
        if (!this.#board.isOccupied(from)) {
            throw new Error(`No piece at ${from.toString()}`);
        }
        const isDame = this.#board.isDamePiece(from);
        const color = this.#board.isBlackPiece(from) ? PieceColor.BLACK : PieceColor.WHITE;
        // 1. Try captures
        const captures = this.#findAllCaptureSequences(from, color, isDame);
        if (captures.length > 0)
            return Legals.fromCaptures(captures);

        // 2. Regular moves
        const dirs = getDirs(color, isDame);
        const positions = this.#findRegularMoves(from, color, isDame, dirs);
        return Legals.fromRegularMoves(positions);
    }
    // ─── capture sequence finding ───
    #findAllCaptureSequences(from, color, isDame) {
        const results = this.#findCapturesFrom(this.#board, from, color, isDame, []);
        // Deduplicate: same full path = same sequence
        const seen = new Set();
        const deduped = [];
        for (const seq of results) {
            const key = seq.map((pos) => pos.hash()).join(',');
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(seq);
            }
        }
        return deduped;
    }
    #findCapturesFrom(board, pos, color, isDame, path) {
        const results = [];
        const dirs = getDirs(color, isDame);
        for (const d of dirs) {
            const caps = this.#findCapturesInDir(board, pos, d, isDame);
            for (const cap of caps) {
                const sim = this.#applyCapture(board, pos, cap[0], cap[1]);
                const becameDame = !isDame && this.#isPromoted(cap[1], color);
                if (becameDame) {
                    // Pion promotion ends the capture sequence immediately.
                    results.push(this.#flatten(path, cap));
                    continue;
                }
                const rec = this.#findCapturesFrom(sim, cap[1], color, isDame, [...path, cap]);
                if (rec.length > 0)
                    results.push(...rec);
                else
                    results.push(this.#flatten(path, cap));
            }
        }
        return results;
    }
    #flatten(path, last) {
        return [...path.flatMap(([captured, landing]) => [captured, landing]), ...last];
    }
    #applyCapture(board, from, captured, landing) {
        return board.removePiece(captured).movePiece(from, landing);
    }
    #isPromoted(pos, color) {
        return color === PieceColor.WHITE ? pos.y === 0 : pos.y === 7;
    }
    #isOpponentPiece(board, pos, myColor) {
        return myColor === PieceColor.WHITE ? board.isBlackPiece(pos) : !board.isBlackPiece(pos);
    }
    // ─── find all captures in one direction (dame can have multiple landings) ───
    #findCapturesInDir(board, from, dir, isDame) {
        const myColor = board.isBlackPiece(from) ? PieceColor.BLACK : PieceColor.WHITE;
        const results = [];
        const { dx, dy } = dir;
        if (isDame) {
            let x = from.x + dx;
            let y = from.y + dy;
            let foundOpponent = null;
            while (Position.isValid(x, y)) {
                const pos = Position.fromCoords(x, y);
                if (board.isOccupied(pos)) {
                    const isOpp = this.#isOpponentPiece(board, pos, myColor);
                    if (isOpp && !foundOpponent) {
                        foundOpponent = pos;
                    }
                    else {
                        break;
                    }
                }
                else if (foundOpponent) {
                    // Dame lands on first empty square immediately behind captured piece
                    results.push([foundOpponent, pos]);
                    break;
                }
                x += dx;
                y += dy;
            }
            return results;
        }
        // Pion: single square capture
        const midX = from.x + dx;
        const midY = from.y + dy;
        const landX = from.x + 2 * dx;
        const landY = from.y + 2 * dy;
        if (!Position.isValid(midX, midY) || !Position.isValid(landX, landY))
            return [];
        const midPos = Position.fromCoords(midX, midY);
        const landPos = Position.fromCoords(landX, landY);
        if (!board.isOccupied(midPos) || board.isOccupied(landPos))
            return [];
        const isOpp = this.#isOpponentPiece(board, midPos, myColor);
        if (!isOpp)
            return [];
        return [[midPos, landPos]];
    }
    // ─── regular moves ───
    #findRegularMoves(from, color, isDame, dirs) {
        const positions = [];
        if (isDame) {
            for (const { dx, dy } of dirs) {
                let x = from.x + dx;
                let y = from.y + dy;
                while (Position.isValid(x, y)) {
                    const pos = Position.fromCoords(x, y);
                    if (this.#board.isOccupied(pos))
                        break;
                    positions.push(pos);
                    x += dx;
                    y += dy;
                }
            }
        }
        else {
            for (const { dx, dy } of dirs) {
                const nx = from.x + dx;
                const ny = from.y + dy;
                if (Position.isValid(nx, ny)) {
                    const pos = Position.fromCoords(nx, ny);
                    if (!this.#board.isOccupied(pos))
                        positions.push(pos);
                }
            }
        }
        return positions;
    }
}
