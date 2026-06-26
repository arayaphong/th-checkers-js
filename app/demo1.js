// Demo 1: branching chain capture with the same final landing.
//
// A white pion on D5 has two capture sequences that both finish on D1,
// capturing different black pieces along the way.
//
// Path A: D5 -> B3 -> D1   capturing C4, then C2
// Path B: D5 -> F3 -> D1   capturing E4, then E2

import { fileURLToPath } from 'node:url';

import { Board } from '../core/Board.js';
import { Game } from '../core/Game.js';
import { PieceColor, PieceType } from '../core/Piece.js';
import { Position } from '../core/Position.js';
import { Repl } from './Repl.js';

export function createDemo1Game() {
  const board = Board.fromPieces([
    [Position.fromString('D5'), { color: PieceColor.WHITE, type: PieceType.PION }],
    [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
  ]);
  return new Game(board);
}

export function explainDemo1() {
  return `Demo 1: branching chain capture with the same final landing.

The white pion on D5 has two capture sequences that both end on D1:
  1) D5 -> B3 -> D1   capturing C4, then C2
  2) D5 -> F3 -> D1   capturing E4, then E2

In the REPL, try:
  > d5 d1
The app will ask you to pick which capture path to use.
`;
}

async function main() {
  console.log(explainDemo1());
  await new Repl(undefined, undefined, createDemo1Game()).run();
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
