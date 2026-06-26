import { Engine } from '../../app/Engine.js';
import { initBoard } from './board.js';
import { initShell } from './shell.js';
import { setTrace } from './debug.js';

window.Engine = Engine;
window.setTrace = setTrace;

const state = { engine: new Engine() };

// Stable facade the board talks to. It delegates to the real shell once it
// exists, so the board never reaches into the engine for move legality itself.
let shell = null;
const shellApi = {
  submit: (command) => shell?.submitCommand(command),
  movableSquares: () => shell?.movableSquares() ?? new Set(),
  targetsFrom: (notation) => shell?.targetsFrom(notation) ?? [],
};

const syncBoard = initBoard(state, shellApi);
shell = initShell(state, syncBoard);
syncBoard(); // re-render now that the shell's legality queries are live
