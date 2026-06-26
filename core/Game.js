// Thai Checkers game state machine
import { PieceColor, pieceSymbol } from './Piece.js';
import { Position } from './Position.js';
import { Board } from './Board.js';
import { Explorer } from './Explorer.js';
import { CaptureTrace } from './Legals.js';
function copyMove(move) {
    return {
        from: move.from,
        to: move.to,
        captured: [...move.captured],
        trace: move.trace,
    };
}
export function boardToString(board) {
    let result = '   ';
    for (let col = 0; col < 8; col++) {
        result += String.fromCharCode('A'.charCodeAt(0) + col) + ' ';
    }
    result += '\n';
    for (let row = 0; row < 8; row++) {
        result += ` ${row + 1} `;
        for (let col = 0; col < 8; col++) {
            let symbol = ' ';
            if ((row + col) % 2 === 0) {
                symbol = '.';
            }
            else {
                const pos = Position.fromCoords(col, row);
                if (board.isOccupied(pos)) {
                    symbol = pieceSymbol(board.isBlackPiece(pos), board.isDamePiece(pos));
                }
                else {
                    symbol = ' ';
                }
            }
            result += symbol + ' ';
        }
        result += '\n';
    }
    return result;
}
export class Game {
    #boardHistory = [];
    #encodedHistory = [];
    #indexHistory = [];
    // Caches
    #choicesDirty = true;
    #choicesCache = [];
    #moveableDirty = true;
    #moveableCache = new Map();
    #moveCountCache = 0;
    #sortedPositionsCache = [];
    // ─── Constructors ───
    constructor(board) {
        const initial = board ?? Board.setup();
        this.#boardHistory.push(initial);
        this.#encodedHistory.push(initial.encode());
    }
    static copy(other) {
        const g = new Game();
        g.#boardHistory = other.#boardHistory.map(b => Board.copy(b));
        g.#encodedHistory = [...other.#encodedHistory];
        g.#indexHistory = [...other.#indexHistory];
        g.#choicesDirty = true;
        g.#moveableDirty = true;
        return g;
    }
    // ─── Core actions ───
    selectMove(index) {
        this.#assertValidMoveIndex(index);
        const move = this.#buildMoveAtIndex(index);
        this.#indexHistory.push(index);
        this.#executeMove(move);
    }
    undoMove() {
        if (this.#indexHistory.length === 0)
            return;
        this.#indexHistory.pop();
        this.#boardHistory.pop();
        this.#encodedHistory.pop();
        this.#choicesDirty = true;
        this.#moveableDirty = true;
    }
    // ─── Queries ───
    moveCount() {
        this.#updateChoicesCache();
        return this.#moveCountCache;
    }
    getMoves() {
        this.#updateChoicesCache();
        return this.#choicesCache.map(copyMove);
    }
    getMoveSequence() {
        return [...this.#indexHistory];
    }
    getBoardHistory() {
        return [...this.#boardHistory];
    }
    getEncodedHistory() {
        return [...this.#encodedHistory];
    }
    board() {
        return this.#boardHistory.at(-1);
    }
    player() {
        return this.#indexHistory.length % 2 === 0 ? PieceColor.WHITE : PieceColor.BLACK;
    }
    // ─── Private: move execution ───
    #executeMove(move) {
        const current = this.board();
        // Remove captured pieces first so a long chain can finish on a
        // square that was occupied before the sequence began.
        let next = current;
        for (const cap of move.captured) {
            next = next.removePiece(cap);
        }
        // Move piece
        next = next.movePiece(move.from, move.to);
        // Promotion check
        const movedIsBlack = current.isBlackPiece(move.from);
        const color = movedIsBlack ? PieceColor.BLACK : PieceColor.WHITE;
        const promoRow = color === PieceColor.WHITE ? 0 : 7;
        if (move.to.y === promoRow && !current.isDamePiece(move.from)) {
            next = next.promotePiece(move.to);
        }
        this.#boardHistory.push(next);
        this.#encodedHistory.push(next.encode());
        this.#choicesDirty = true;
        this.#moveableDirty = true;
    }
    // ─── Private: move generation ───
    #updateChoicesCache() {
        if (!this.#choicesDirty)
            return;
        this.#choicesDirty = false;
        this.#updateMoveableCache();
        this.#moveCountCache = this.#computeMoveCountFast();
        this.#choicesCache = this.#buildAllMoves();
    }
    #updateMoveableCache() {
        if (!this.#moveableDirty)
            return;
        this.#moveableDirty = false;
        this.#moveableCache.clear();
        this.#sortedPositionsCache = [];
        const board = this.board();
        const color = this.player();
        const pieces = board.getPieces(color);
        for (const [index] of pieces) {
            const pos = Position.fromIndex(index);
            const explorer = new Explorer(board);
            const legals = explorer.findValidMoves(pos);
            if (!legals.empty()) {
                this.#moveableCache.set(pos, legals);
                this.#sortedPositionsCache.push(pos);
            }
        }
        // Sort positions for deterministic ordering
        this.#sortedPositionsCache.sort((a, b) => a.compare(b));
    }
    #hasMandatoryCapture() {
        for (const legals of this.#moveableCache.values()) {
            if (legals.hasCaptured())
                return true;
        }
        return false;
    }
    #toMove(from, info) {
        const move = { from, to: info.targetPosition, captured: [...info.capturedPositions] };
        if (info.capturedPositions.length > 0) {
            move.trace = new CaptureTrace([...info.sequence]);
        }
        return move;
    }
    #computeMoveCountFast() {
        const hasCaptures = this.#hasMandatoryCapture();
        let count = 0;
        for (const legals of this.#moveableCache.values()) {
            if (hasCaptures && !legals.hasCaptured())
                continue;
            count += legals.size();
        }
        return count;
    }
    #buildAllMoves() {
        const moves = [];
        const hasCaptures = this.#hasMandatoryCapture();
        for (const pos of this.#sortedPositionsCache) {
            const legals = this.#moveableCache.get(pos);
            // If captures exist anywhere, only include capture moves
            if (hasCaptures && !legals.hasCaptured())
                continue;
            for (let i = 0; i < legals.size(); i++) {
                moves.push(this.#toMove(pos, legals.getMoveInfo(i)));
            }
        }
        return moves;
    }
    #assertValidMoveIndex(index) {
        if (!Number.isInteger(index)) {
            throw new RangeError(`Move index must be an integer: ${index}`);
        }
        const count = this.moveCount();
        if (index < 0 || index >= count) {
            const range = count > 0 ? `0-${count - 1}` : 'no legal moves';
            throw new RangeError(`Move index ${index} out of range; valid range is ${range}`);
        }
    }
    #buildMoveAtIndex(index) {
        this.#updateMoveableCache();
        const hasCaptures = this.#hasMandatoryCapture();
        let cumulative = 0;
        for (const pos of this.#sortedPositionsCache) {
            const legals = this.#moveableCache.get(pos);
            if (hasCaptures && !legals.hasCaptured())
                continue;
            const size = legals.size();
            if (index < cumulative + size) {
                return this.#toMove(pos, legals.getMoveInfo(index - cumulative));
            }
            cumulative += size;
        }
        throw new RangeError(`Move index ${index} out of range`);
    }
    // ─── Debug ───
    printBoard() {
        console.log(boardToString(this.board()));
    }
    printChoices() {
        const moves = this.getMoves();
        console.log(`Moves (${moves.length}):`);
        for (const m of moves) {
            const capStr = m.captured.length > 0 ? ` captures ${m.captured.map(c => c.toString()).join(',')}` : '';
            console.log(`  ${m.from.toString()} -> ${m.to.toString()}${capStr}`);
        }
    }
}
//# sourceMappingURL=Game.js.map