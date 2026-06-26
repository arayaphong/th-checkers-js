// Demo 3.1: dame loop capture with two mirror-image paths.
//
// A white dame on D1 is surrounded by six black pions. Both loop directions
// capture the exact same six pieces and land back on D1; only the order of
// captures and the intermediate landings differ.

import { fileURLToPath } from 'node:url';

import { Board } from '../core/Board.js';
import { Game } from '../core/Game.js';
import { PieceColor, PieceType } from '../core/Piece.js';
import { Position } from '../core/Position.js';
import { Repl } from './Repl.js';

export function createDemo31Game() {
  const board = Board.fromPieces([
    [Position.fromString('D1'), { color: PieceColor.WHITE, type: PieceType.DAME }],
    [Position.fromString('C2'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('C4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E6'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('G6'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('G4'), { color: PieceColor.BLACK, type: PieceType.PION }],
    [Position.fromString('E2'), { color: PieceColor.BLACK, type: PieceType.PION }],
  ]);
  return new Game(board);
}

export function explainDemo31() {
  return `Demo 3.1: dame loop capture with two mirror-image paths.

The white dame on D1 is surrounded by six black pions.
Both loop directions capture the exact same six pieces and land back on D1;
only the path differs.

  Path A (via C2 first):
    D1 -> C2 -> B3 -> C4 -> D5 -> E6 -> F7 -> G6 -> H5 -> G4 -> F3 -> E2 -> D1

  Path B (via E2 first):
    D1 -> E2 -> F3 -> G4 -> H5 -> G6 -> F7 -> E6 -> D5 -> C4 -> B3 -> C2 -> D1

In the REPL, try:
  > d1 d1
The move is applied directly because both paths produce the same result.
You can also pick explicitly with 1 or 2.
`;
}

async function main() {
  console.log(explainDemo31());
  await new Repl(undefined, undefined, createDemo31Game()).run();
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
