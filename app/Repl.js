// The interactive REPL loop: render the position, read a line, parse it,
// dispatch the action through the UI-neutral Engine, repeat.
//
// Input is consumed via readline's async iterator (`for await ... of rl`) rather
// than one-shot `question()` calls. The iterator buffers lines correctly for
// both interactive TTYs and piped/non-TTY input, where queued lines would
// otherwise be dropped between awaits.

import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

import { Engine } from './Engine.js';
import { parseInput } from './parse.js';
import { formatMove, formatTrace, renderGame } from './render.js';

const HELP = `Commands:
  <number>          apply the move with that menu number
  <from> <to>       apply a move by coordinates, e.g. "b3 c4" or "b3-c4"
  trace <n>         show the full path of move #n
  trace <f> <t>     show all paths from f to t
  undo  | u         take back the last move
  redo  | r         re-apply a move undone with 'undo'
  new   | reset | n  start a fresh game
  moves | m         re-print the board and move menu
  help  | h | ?     show this help
  quit  | q | exit  exit

Demos (load a preset position):
  demo1             branching chain capture, same final landing
  demo2             dame loop capture ending on the original square
  demo3             dame loop capture with two mirror-image paths
  demo4             dame loop capture with extra central branching`;

export class Repl {
  #engine;
  #rl;
  #output;

  /**
   * @param {import('node:stream').Readable} [input]
   * @param {import('node:stream').Writable} [output]
   * @param {import('../core/Game.js').Game} [game]
   */
  constructor(input = stdin, output = stdout, game) {
    this.#rl = createInterface({ input, output });
    this.#output = output;
    this.#engine = new Engine(game);
  }

  async run() {
    this.#rl.on('SIGINT', () => this.#rl.close());
    this.#print(renderGame(this.#engine.getGame()));
    this.#writePrompt();

    try {
      for await (const raw of this.#rl) {
        const done = this.#handleLine(raw);
        if (done) break;
        this.#writePrompt();
      }
    } finally {
      this.#rl.close();
    }
    this.#print('\nBye.');
  }

  /** Process one input line. Returns true if the loop should exit. */
  #handleLine(raw) {
    const result = this.#engine.isPickingMove()
      ? this.#engine.resolvePick(raw)
      : this.#engine.handle(parseInput(raw));

    if (result.kind === 'quit') return true;
    this.#renderResult(result);
    return false;
  }

  #renderResult(result) {
    switch (result.kind) {
      case 'state':
        this.#print(renderGame(this.#engine.getGame()));
        break;
      case 'demo':
        this.#print(result.description);
        this.#print(renderGame(this.#engine.getGame()));
        break;
      case 'help':
        this.#print(HELP);
        break;
      case 'invalid-index':
        this.#print(`No move #${result.value}. There are ${result.legalMoveCount} legal move(s).`);
        break;
      case 'no-coordinate-match':
        this.#print(`No legal move from ${result.from.notation} to ${result.to.notation}.`);
        break;
      case 'pick-required':
        this.#print(`Multiple moves match ${result.from.notation} -> ${result.to.notation}:`);
        result.choices.forEach((choice, index) => {
          this.#print(`  ${index + 1}) ${formatMove(this.#moveAt(choice.index))}`);
        });
        break;
      case 'trace':
        this.#print(formatTrace(this.#moveAt(result.move.index)));
        break;
      case 'trace-list':
        this.#print(`Trace(s) for ${result.from.notation} -> ${result.to.notation}:`);
        result.moves.forEach((move, index) => {
          this.#print(`  ${index + 1}) ${formatTrace(this.#moveAt(move.index))}`);
        });
        break;
      case 'empty-history':
        this.#print(result.action === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.');
        break;
      case 'cancelled':
        this.#print('Cancelled.');
        break;
      case 'parse-error':
        this.#print(result.message);
        break;
      case 'invalid-demo':
        this.#print(`Unknown demo: "${result.id}". Available: ${result.available.join(', ')}`);
        break;
      case 'error':
        if (result.action === 'redo') {
          this.#print(`Could not redo: ${result.error.message}`);
        } else {
          this.#print(`Could not apply move: ${result.error.message}`);
        }
        break;
      case 'noop':
        break;
    }
  }

  #moveAt(index) {
    return this.#engine.getGame().getMoves()[index];
  }

  #writePrompt() {
    this.#output.write(this.#engine.isPickingMove() ? 'Pick a number: ' : '\n> ');
  }

  #print(text) {
    this.#output.write(`${text}\n`);
  }
}
