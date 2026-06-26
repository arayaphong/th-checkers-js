// Demo loader: reads JSON demo definitions under app/demo/ and turns them
// into Game instances and explanatory text.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Board } from '../../core/Board.js';
import { Game } from '../../core/Game.js';
import { PieceColor, PieceType } from '../../core/Piece.js';
import { Position } from '../../core/Position.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, number>} */
const COLOR_MAP = {
  WHITE: PieceColor.WHITE,
  BLACK: PieceColor.BLACK,
};

/** @type {Record<string, number>} */
const TYPE_MAP = {
  PION: PieceType.PION,
  DAME: PieceType.DAME,
};

/**
 * @typedef {Object} DemoDefinition
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {[string, {color: string, type: string}][]} pieces
 */

/**
 * Load a demo definition from its JSON file.
 * @param {string} id
 * @returns {DemoDefinition}
 */
function loadDemoJson(id) {
  const path = join(__dirname, `${id}.json`);
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

/**
 * Build a Game from a demo definition.
 * @param {DemoDefinition} demo
 * @returns {Game}
 */
function buildGame(demo) {
  const pieces = demo.pieces.map(([pos, info]) => [
    Position.fromString(pos),
    { color: COLOR_MAP[info.color], type: TYPE_MAP[info.type] },
  ]);
  return new Game(Board.fromPieces(pieces));
}

/** @type {string[]} */
export const DEMO_IDS = ['demo1', 'demo2', 'demo3', 'demo4'];

/**
 * Create a Game for the given demo id.
 * @param {string} id
 * @returns {Game}
 */
export function createDemoGame(id) {
  const demo = loadDemoJson(id);
  return buildGame(demo);
}

/**
 * Return the explanatory text for the given demo id.
 * @param {string} id
 * @returns {string}
 */
export function explainDemo(id) {
  const demo = loadDemoJson(id);
  return demo.description;
}

/**
 * Return the title for the given demo id.
 * @param {string} id
 * @returns {string}
 */
export function demoTitle(id) {
  const demo = loadDemoJson(id);
  return demo.title;
}

// Convenience exports for each demo (keeps existing call sites and tests working).

/** @returns {Game} */
export function createDemo1Game() { return createDemoGame('demo1'); }
/** @returns {string} */
export function explainDemo1() { return explainDemo('demo1'); }

/** @returns {Game} */
export function createDemo2Game() { return createDemoGame('demo2'); }
/** @returns {string} */
export function explainDemo2() { return explainDemo('demo2'); }

/** @returns {Game} */
export function createDemo3Game() { return createDemoGame('demo3'); }
/** @returns {string} */
export function explainDemo3() { return explainDemo('demo3'); }

/** @returns {Game} */
export function createDemo4Game() { return createDemoGame('demo4'); }
/** @returns {string} */
export function explainDemo4() { return explainDemo('demo4'); }
