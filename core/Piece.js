// Thai Checkers piece definitions
export const PieceColor = Object.freeze({
    WHITE: 0,
    BLACK: 1,
});

export const PieceType = Object.freeze({
    PION: 0,
    DAME: 1,
});

const enumValues = (enumLike) => new Set(Object.values(enumLike));

const PIECE_COLORS = enumValues(PieceColor);
const PIECE_TYPES = enumValues(PieceType);
const PIECE_COLOR_NAMES = new Map([
    [PieceColor.WHITE, 'WHITE'],
    [PieceColor.BLACK, 'BLACK'],
]);
const PIECE_TYPE_NAMES = new Map([
    [PieceType.PION, 'PION'],
    [PieceType.DAME, 'DAME'],
]);
const PIECE_SYMBOLS = Object.freeze([
    Object.freeze(['\u25CF', '\u25A0']),
    Object.freeze(['\u25CB', '\u25A1']),
]);

export function isPieceColor(color) {
    return PIECE_COLORS.has(color);
}

export function isPieceType(type) {
    return PIECE_TYPES.has(type);
}

export function assertPieceColor(color) {
    if (!isPieceColor(color)) {
        throw new RangeError(`Invalid piece color: ${String(color)}`);
    }
}

export function assertPieceType(type) {
    if (!isPieceType(type)) {
        throw new RangeError(`Invalid piece type: ${String(type)}`);
    }
}

export function assertPieceInfo(info) {
    if (typeof info !== 'object' || info === null) {
        throw new TypeError('Piece info must be an object');
    }
    assertPieceColor(info.color);
    assertPieceType(info.type);
}

export function pieceSymbol(isBlack, isDame) {
    return PIECE_SYMBOLS[Number(Boolean(isBlack))][Number(Boolean(isDame))];
}

export function toStringPieceColor(color) {
    assertPieceColor(color);
    return PIECE_COLOR_NAMES.get(color);
}

export function toStringPieceType(type) {
    assertPieceType(type);
    return PIECE_TYPE_NAMES.get(type);
}
