// Bitboard-based 8×8 Thai Checkers board (32 playable dark squares)
import { PieceColor, PieceType, assertPieceColor, assertPieceInfo, } from './Piece.js';
import { Position } from './Position.js';
const BOARD_SQUARES = 32;
const MAX_PIECES = 16;
const MAX_ENCODED = (1n << 64n) - 1n;
/** 1 << idx as unsigned 32-bit integer */
function bit(idx) {
    return (1 << (idx & 0x1f)) >>> 0;
}
function popCount32(value) {
    let bits = value >>> 0;
    let count = 0;
    while (bits !== 0) {
        bits &= bits - 1;
        count++;
    }
    return count;
}
function assertValidPieceCount(count) {
    if (count > MAX_PIECES) {
        throw new RangeError(`Thai checkers boards cannot contain more than ${MAX_PIECES} pieces`);
    }
}
function toPieceKey(position) {
    if (position instanceof Position) {
        return position.hash();
    }
    Position.fromIndex(position);
    return position;
}
export class Board {
    // Bitboards — each bit i corresponds to Position.fromIndex(i)
    #occBits;
    #blackBits;
    #dameBits;
    constructor(occBits = 0, blackBits = 0, dameBits = 0) {
        this.#occBits = occBits >>> 0;
        this.#blackBits = blackBits >>> 0;
        this.#dameBits = dameBits >>> 0;
        Object.freeze(this);
    }
    // ─── Factories ───
    static empty() {
        return new Board();
    }
    static setup() {
        let occBits = 0;
        let blackBits = 0;
        // Black home rows are 0-1, white home rows are 6-7 (white stays unset in blackBits)
        for (const row of [0, 1, 6, 7]) {
            const startCol = row % 2 === 0 ? 1 : 0;
            for (let i = 0; i < 4; i++) {
                const mask = bit(Position.fromCoords(startCol + i * 2, row).hash());
                occBits |= mask;
                if (row < 2)
                    blackBits |= mask;
            }
        }
        return new Board(occBits, blackBits, 0);
    }
    static fromPieces(pieces) {
        let occBits = 0;
        let blackBits = 0;
        let dameBits = 0;
        const seen = new Set();
        for (const [position, info] of pieces) {
            const key = toPieceKey(position);
            if (seen.has(key)) {
                throw new Error(`Duplicate piece position: ${Position.fromIndex(key).toString()}`);
            }
            seen.add(key);
            assertPieceInfo(info);
            const mask = bit(key);
            occBits |= mask;
            if (info.color === PieceColor.BLACK) {
                blackBits |= mask;
            }
            else {
                blackBits &= ~mask;
            }
            if (info.type === PieceType.DAME) {
                dameBits |= mask;
            }
            else {
                dameBits &= ~mask;
            }
        }
        assertValidPieceCount(popCount32(occBits));
        return new Board(occBits, blackBits, dameBits);
    }
    static copy(other) {
        return new Board(other.#occBits, other.#blackBits, other.#dameBits);
    }
    static decode(encoded) {
        if (encoded < 0n || encoded > MAX_ENCODED) {
            throw new RangeError('Encoded board must be an unsigned 64-bit value');
        }
        const occBits = Number((encoded >> 32n) & 0xffffffffn) >>> 0;
        assertValidPieceCount(popCount32(occBits));
        let blackBits = 0;
        let dameBits = 0;
        const low32 = Number(encoded & 0xffffffffn) >>> 0;
        let count = 0;
        for (let i = 0; i < BOARD_SQUARES && count < MAX_PIECES; i++) {
            const mask = bit(i);
            if ((occBits & mask) === 0)
                continue;
            if ((low32 & (1 << count)) !== 0)
                dameBits |= mask;
            if ((low32 & (1 << (count + MAX_PIECES))) !== 0)
                blackBits |= mask;
            count++;
        }
        const board = new Board(occBits, blackBits, dameBits);
        if (board.encode() !== encoded) {
            throw new Error('Encoded board is not canonical');
        }
        return board;
    }
    // ─── Queries ───
    static isValidPosition(pos) {
        return Position.isValid(pos.x, pos.y);
    }
    isOccupied(pos) {
        if (!Board.isValidPosition(pos))
            return false;
        return (this.#occBits & bit(pos.hash())) !== 0;
    }
    isBlackPiece(pos) {
        return (this.#blackBits & bit(pos.hash())) !== 0;
    }
    isDamePiece(pos) {
        return (this.#dameBits & bit(pos.hash())) !== 0;
    }
    getPieces(color) {
        assertPieceColor(color);
        const out = new Map();
        for (let i = 0; i < BOARD_SQUARES; i++) {
            const mask = bit(i);
            if ((this.#occBits & mask) === 0)
                continue;
            const isBlack = (this.#blackBits & mask) !== 0;
            if ((color === PieceColor.BLACK) !== isBlack)
                continue;
            const isDame = (this.#dameBits & mask) !== 0;
            out.set(i, {
                color: isBlack ? PieceColor.BLACK : PieceColor.WHITE,
                type: isDame ? PieceType.DAME : PieceType.PION,
            });
        }
        return out;
    }
    // ─── Transformations ───
    promotePiece(pos) {
        const mask = bit(pos.hash());
        if ((this.#occBits & mask) === 0)
            return this;
        if ((this.#dameBits & mask) !== 0)
            return this;
        return new Board(this.#occBits, this.#blackBits, this.#dameBits | mask);
    }
    movePiece(from, to) {
        const fm = bit(from.hash());
        const tm = bit(to.hash());
        if ((this.#occBits & fm) === 0)
            return this;
        if ((this.#occBits & tm) !== 0)
            return this;
        const wasBlack = (this.#blackBits & fm) !== 0;
        const wasDame = (this.#dameBits & fm) !== 0;
        const occBits = (this.#occBits & ~fm) | tm;
        let blackBits = this.#blackBits & ~fm;
        let dameBits = this.#dameBits & ~fm;
        if (wasBlack)
            blackBits |= tm;
        if (wasDame)
            dameBits |= tm;
        return new Board(occBits, blackBits, dameBits);
    }
    removePiece(pos) {
        const mask = bit(pos.hash());
        if ((this.#occBits & mask) === 0)
            return this;
        return new Board(this.#occBits & ~mask, this.#blackBits & ~mask, this.#dameBits & ~mask);
    }
    // ─── Encoding ───
    encode() {
        let damePacked = 0;
        let blackPacked = 0;
        let count = 0;
        for (let i = 0; i < BOARD_SQUARES; i++) {
            const mask = bit(i);
            if ((this.#occBits & mask) === 0)
                continue;
            if ((this.#dameBits & mask) !== 0)
                damePacked |= (1 << count);
            if ((this.#blackBits & mask) !== 0)
                blackPacked |= (1 << count);
            count++;
        }
        return (BigInt(this.#occBits >>> 0) << 32n)
            | (BigInt(blackPacked & 0xffff) << 16n)
            | BigInt(damePacked & 0xffff);
    }
    // ─── Accessors ───
    get occBits() { return this.#occBits >>> 0; }
    get blackBits() { return this.#blackBits >>> 0; }
    get dameBits() { return this.#dameBits >>> 0; }
    // ─── Equality ───
    equals(other) {
        return this.#occBits === other.#occBits &&
            this.#blackBits === other.#blackBits &&
            this.#dameBits === other.#dameBits;
    }
    hashCode() {
        return (this.#occBits ^ this.#blackBits ^ this.#dameBits) >>> 0;
    }
}
//# sourceMappingURL=Board.js.map