import { Engine } from '../../app/Engine.js';
import { initBoard } from './board.js';
import { initShell } from './shell.js';

window.Engine = Engine;

const state = { engine: new Engine() };
let submitCommand = null;
const syncBoard = initBoard(state, (command) => submitCommand?.(command));
({ submitCommand } = initShell(state, syncBoard));
