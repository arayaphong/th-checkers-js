// Pure input parser for the REPL. Classifies a raw input line into a
// ParsedInput. It performs only *syntactic* analysis — it does not know the
// current legal-move list, so semantic validation lives in the Cli.

import { Position } from '../core/Position.js';

/**
 * @typedef {'undo'|'redo'|'new'|'help'|'moves'|'demo1'|'demo2'|'demo3'|'demo4'|'quit'} CommandName
 */

/**
 * @typedef {Object} ParsedCommand
 * @property {'command'} kind
 * @property {CommandName} name
 */

/**
 * @typedef {Object} ParsedIndex
 * @property {'index'} kind
 * @property {number} value
 */

/**
 * @typedef {Object} ParsedCoords
 * @property {'coords'} kind
 * @property {Position} from
 * @property {Position} to
 */

/**
 * @typedef {Object} ParsedTraceIndex
 * @property {'trace-index'} kind
 * @property {number} index
 */

/**
 * @typedef {Object} ParsedTraceCoords
 * @property {'trace-coords'} kind
 * @property {Position} from
 * @property {Position} to
 */

/**
 * @typedef {Object} ParsedEmpty
 * @property {'empty'} kind
 */

/**
 * @typedef {Object} ParsedError
 * @property {'error'} kind
 * @property {string} message
 */

/**
 * @typedef {ParsedCommand|ParsedIndex|ParsedCoords|ParsedTraceIndex|ParsedTraceCoords|ParsedEmpty|ParsedError} ParsedInput
 */

/** @type {Record<string, CommandName>} */
const COMMAND_ALIASES = {
  undo: 'undo',
  u: 'undo',
  redo: 'redo',
  r: 'redo',
  new: 'new',
  reset: 'new',
  n: 'new',
  help: 'help',
  h: 'help',
  '?': 'help',
  moves: 'moves',
  m: 'moves',
  demo1: 'demo1',
  demo2: 'demo2',
  demo3: 'demo3',
  demo4: 'demo4',
  quit: 'quit',
  exit: 'quit',
  q: 'quit',
};

const COORD = /^[A-H][1-8]$/i;

/**
 * Parse a single line of REPL input into a ParsedInput.
 * @param {string} raw
 * @returns {ParsedInput}
 */
export function parseInput(raw) {
  const trimmed = raw.trim();
  if (trimmed === '') return { kind: 'empty' };

  const lower = trimmed.toLowerCase();

  // Commands (single token).
  const command = COMMAND_ALIASES[lower];
  if (command) return { kind: 'command', name: command };

  // Bare positive integer → 1-based menu choice.
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (value < 1) {
      return { kind: 'error', message: 'Move number must be 1 or greater.' };
    }
    return { kind: 'index', value };
  }

  // Trace: "trace <number>" or "trace <from> <to>"
  if (lower === 'trace' || lower.startsWith('trace ')) {
    const rest = trimmed.slice(5).trim();
    if (/^\d+$/.test(rest)) {
      return { kind: 'trace-index', index: Number(rest) };
    }
    const tokens = rest.split(/[\s,-]+/).filter((t) => t.length > 0);
    if (tokens.length === 2 && tokens.every((t) => COORD.test(t))) {
      try {
        const from = Position.fromString(tokens[0].toUpperCase());
        const to = Position.fromString(tokens[1].toUpperCase());
        return { kind: 'trace-coords', from, to };
      } catch (err) {
        return { kind: 'error', message: /** @type {Error} */ (err).message };
      }
    }
    return { kind: 'error', message: 'Usage: trace <number> or trace <from> <to>' };
  }

  // Coordinates: two squares separated by space, '-' or ','.
  const tokens = trimmed.split(/[\s,-]+/).filter((t) => t.length > 0);
  if (tokens.length === 2 && tokens.every((t) => COORD.test(t))) {
    try {
      const from = Position.fromString(tokens[0].toUpperCase());
      const to = Position.fromString(tokens[1].toUpperCase());
      return { kind: 'coords', from, to };
    } catch (err) {
      return { kind: 'error', message: /** @type {Error} */ (err).message };
    }
  }

  return {
    kind: 'error',
    message: `Unrecognized input: "${trimmed}". Type 'help' for commands.`,
  };
}
