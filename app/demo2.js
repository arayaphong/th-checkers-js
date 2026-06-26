// Demo 2: dame loop capture ending on the original square.
//
// Same black-piece layout as Demo 1, but the white piece is a dame.
// The dame circles the four black pieces and lands back on D5.
//
//   D5 -> C4 -> B3 -> C2 -> D1 -> E2 -> F3 -> E4 -> D5

import { fileURLToPath } from 'node:url';

import { Board } from '../core/Board.js';
import { Game } from '../core/Game.js';
import { PieceColor, PieceType } from '../core/Piece.js';
import { Position } from '../core/Position.js';
import { Repl } from './Repl.js';

export function createDemo2Game() {
  const board = Board.fromPieces([
    [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.DAME }],
    [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
  ]);
  return new Game(board);
}

export function explainDemo2() {
  return `Demo 2: dame loop capture ending on the original square.

The white dame on D5 can capture four black pieces in a loop:
  D5 -> C4 -> B3 -> C2 -> D1 -> E2 -> F3 -> E4 -> D5

It captures C4, C2, E2, and E4, then lands back on D5.
In the REPL, try:
  > d5 d5
`;
}

async function main() {
  console.log(explainDemo2());
  await new Repl(undefined, undefined, createDemo2Game()).run();
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
