import { Engine } from '../../app/Engine.js';
import { initBoard } from './board.js';
import { initShell } from './shell.js';

window.Engine = Engine;

const state = { engine: new Engine() };
const syncBoard = initBoard(state);
initShell(state, syncBoard);
