// Legal moves container — digests regular positions or capture sequences into uniform MoveInfo
import { Position } from './Position.js';
function assertValidIndex(method, index, length) {
    if (!Number.isInteger(index)) {
        throw new RangeError(`${method}: index must be an integer`);
    }
    if (index < 0 || index >= length) {
        throw new RangeError(`${method}: index out of range`);
    }
}
function copyMoveInfo(move) {
    return {
        targetPosition: move.targetPosition,
        capturedPositions: [...move.capturedPositions],
        path: [...move.path],
        sequence: move.sequence?.toSpliced(),
    };
}

function assertPosition(value, context) {
    if (!(value instanceof Position)) {
        throw new TypeError(`${context} must be a Position`);
    }
}

function assertValidCaptureSequence(seq, context = 'Capture sequence') {
    if (seq.length === 0 || seq.length % 2 !== 0) {
        throw new Error('Capture sequence must contain captured/landing position pairs');
    }
    for (const [index, position] of seq.entries()) {
        assertPosition(position, `${context} item ${index}`);
    }
}

function processCaptureSequence(seq) {
    assertValidCaptureSequence(seq);
    // Even indices = captured pieces, odd indices = landing positions
    const captured = seq.values().filter((_, index) => index % 2 === 0).toArray();
    const path = seq.values().filter((_, index) => index % 2 === 1).toArray();
    return {
        targetPosition: seq.at(-1), // last element = final landing
        capturedPositions: captured,
        path,
        sequence: seq,
    };
}
export class CaptureTrace {
    #sequence;
    constructor(sequence) {
        assertValidCaptureSequence(sequence, 'CaptureTrace sequence');
        this.#sequence = Object.freeze([...sequence]);
    }
    get sequence() {
        return this.#sequence;
    }
    get length() {
        return this.#sequence.length / 2;
    }
    get captured() {
        return this.#sequence.values().filter((_, index) => index % 2 === 0).toArray();
    }
    path(from) {
        return [
            from,
            ...this.#sequence.values().filter((_, index) => index % 2 === 1).toArray(),
        ];
    }
    get finalLanding() {
        return this.#sequence.at(-1);
    }
    toString() {
        return this.#sequence
            .values()
            .filter((_, index) => index % 2 === 0)
            .map((captured, index) => `×${captured.toString()} →${this.#sequence[(index * 2) + 1].toString()}`)
            .toArray()
            .join(' ');
    }
}
export class Legals {
    #moves;
    #hasCaptures;
    // Implementation
    constructor(items) {
        if (items.length === 0) {
            this.#moves = [];
            this.#hasCaptures = false;
            return;
        }
        // Type detection: first item is Position or array
        if (Array.isArray(items.at(0))) {
            this.#hasCaptures = true;
            this.#moves = items.map((item, index) => {
                if (!Array.isArray(item)) {
                    throw new TypeError(`Capture move ${index} must be a capture sequence`);
                }
                return processCaptureSequence(item);
            });
        }
        else {
            this.#hasCaptures = false;
            this.#moves = items.map((item, index) => {
                assertPosition(item, `Regular move ${index}`);
                return {
                    targetPosition: item,
                    capturedPositions: [],
                    path: [item],
                    sequence: undefined,
                };
            });
        }
    }
    hasCaptured() {
        return this.#hasCaptures;
    }
    size() {
        return this.#moves.length;
    }
    empty() {
        return this.#moves.length === 0;
    }
    getPosition(index) {
        assertValidIndex('Legals.getPosition', index, this.#moves.length);
        return this.#moves[index].targetPosition;
    }
    getCapturePieces(index) {
        if (!this.#hasCaptures) {
            throw new Error('Legals.getCapturePieces: not a capture variant');
        }
        assertValidIndex('Legals.getCapturePieces', index, this.#moves.length);
        return [...this.#moves[index].capturedPositions];
    }
    getMoveInfo(index) {
        assertValidIndex('Legals.getMoveInfo', index, this.#moves.length);
        return copyMoveInfo(this.#moves[index]);
    }
    getTrace(index) {
        if (!this.#hasCaptures) {
            return undefined;
        }
        assertValidIndex('Legals.getTrace', index, this.#moves.length);
        return new CaptureTrace([...this.#moves[index].sequence]);
    }
    [Symbol.iterator]() {
        return this.#moves.values().map(copyMoveInfo);
    }
}
