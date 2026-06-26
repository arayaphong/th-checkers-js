// Thai Checkers piece definitions
export var PieceColor;
(function (PieceColor) {
    PieceColor[PieceColor["WHITE"] = 0] = "WHITE";
    PieceColor[PieceColor["BLACK"] = 1] = "BLACK";
})(PieceColor || (PieceColor = {}));
export var PieceType;
(function (PieceType) {
    PieceType[PieceType["PION"] = 0] = "PION";
    PieceType[PieceType["DAME"] = 1] = "DAME";
})(PieceType || (PieceType = {}));
export function isPieceColor(color) {
    return color === PieceColor.WHITE || color === PieceColor.BLACK;
}
export function isPieceType(type) {
    return type === PieceType.PION || type === PieceType.DAME;
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
    return isBlack ? (isDame ? '\u25A1' : '\u25CB') : (isDame ? '\u25A0' : '\u25CF');
}
export function toStringPieceColor(color) {
    assertPieceColor(color);
    return color === PieceColor.WHITE ? 'WHITE' : 'BLACK';
}
export function toStringPieceType(type) {
    assertPieceType(type);
    return type === PieceType.PION ? 'PION' : 'DAME';
}
//# sourceMappingURL=Piece.js.map