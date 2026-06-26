// Demo loader: reads JSON demo definitions in both Node and browser contexts.
// Node loads from disk lazily, while browser code fetches the same files.

import { Board } from '../../core/Board.js';
import { Game } from '../../core/Game.js';
import { PieceColor, PieceType } from '../../core/Piece.js';
import { Position } from '../../core/Position.js';

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

/** @type {Map<string, Promise<DemoDefinition>>} */
const DEMO_CACHE = new Map();

function isNodeRuntime() {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

/**
 * @param {URL} url
 * @returns {Promise<string>}
 */
async function readDemoText(url) {
  if (isNodeRuntime()) {
    const { readFile } = await import('node:fs/promises');
    return readFile(url, 'utf8');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load demo JSON: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Load a demo definition by id.
 * @param {string} id
 * @returns {Promise<DemoDefinition>}
 */
function loadDemoJson(id) {
  if (!DEMO_IDS.includes(id)) {
    return Promise.reject(new Error(`Unknown demo: ${id}`));
  }

  let pending = DEMO_CACHE.get(id);
  if (!pending) {
    pending = (async () => {
      const url = new URL(`./${id}.json`, import.meta.url);
      const raw = await readDemoText(url);
      return JSON.parse(raw);
    })();
    DEMO_CACHE.set(id, pending);
  }
  return pending;
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
 * @returns {Promise<Game>}
 */
export async function createDemoGame(id) {
  const demo = await loadDemoJson(id);
  return buildGame(demo);
}

/**
 * Return the explanatory text for the given demo id.
 * @param {string} id
 * @returns {Promise<string>}
 */
export async function explainDemo(id) {
  const demo = await loadDemoJson(id);
  return demo.description;
}

/**
 * Return the title for the given demo id.
 * @param {string} id
 * @returns {Promise<string>}
 */
export async function demoTitle(id) {
  const demo = await loadDemoJson(id);
  return demo.title;
}

// Convenience exports for each demo (keeps existing call sites and tests working).

/** @returns {Promise<Game>} */
export function createDemo1Game() { return createDemoGame('demo1'); }
/** @returns {Promise<string>} */
export function explainDemo1() { return explainDemo('demo1'); }

/** @returns {Promise<Game>} */
export function createDemo2Game() { return createDemoGame('demo2'); }
/** @returns {Promise<string>} */
export function explainDemo2() { return explainDemo('demo2'); }

/** @returns {Promise<Game>} */
export function createDemo3Game() { return createDemoGame('demo3'); }
/** @returns {Promise<string>} */
export function explainDemo3() { return explainDemo('demo3'); }

/** @returns {Promise<Game>} */
export function createDemo4Game() { return createDemoGame('demo4'); }
/** @returns {Promise<string>} */
export function explainDemo4() { return explainDemo('demo4'); }
