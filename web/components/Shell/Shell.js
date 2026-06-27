import { parseInput } from '../../../cli/parser.js';
import { formatMove, formatTrace, renderGame } from '../../../cli/render.js';
import { Component } from '../Component/Component.js';
import { trace } from '../../utils/Debug.js';
import { EngineClient } from '../../utils/EngineClient.js';

const HELP = `Commands:
\t<number>          apply the move with that menu number
\t<from> <to>       apply a move by coordinates, e.g. "b3 c4" or "b3-c4"
\ttrace <n>         show the full path of move #n
\ttrace <f> <t>     show all paths from f to t
\tundo  | u         take back the last move
\tredo  | r         re-apply a move undone with 'undo'
\tnew   | reset | n start a fresh game
\tmoves | m         re-print the board and move menu
\thelp  | h | ?     show this help
\tquit  | q | exit  clear the session and start a fresh board

Demos:
\tdemo1             branching chain capture, same final landing
\tdemo2             dame loop capture ending on the original square
\tdemo3             dame loop capture with two mirror-image paths
\tdemo4             dame loop capture with extra central branching`;

/**
 * Shell component.
 *
 * Provides the REPL interface and drives the engine through an EngineClient
 * that talks to a Web Worker. It can run standalone (spawning its own worker)
 * or share an EngineClient with a Board component via the `engine` option.
 *
 * The Shell subscribes to every result broadcast by the worker, so commands
 * issued from the Board (or any other client) are echoed and rendered here.
 */
export class Shell extends Component {
  constructor(container, options = {}) {
    super(container);
    this.state = { engine: options.engine ?? this.#createEngine() };
    this.pending = false;
    this.activeDemo = null;

    this.unsubscribe = this.state.engine.subscribe?.((message) => this.#onEngineResult(message));
  }

  #createEngine() {
    const workerUrl = new URL('../../workers/gameWorker.js', import.meta.url);
    return new EngineClient(workerUrl);
  }

  destroy() {
    this.unsubscribe?.();
    if (this.state.engine instanceof EngineClient) {
      this.state.engine.terminate();
    }
  }

  async #onEngineResult({ raw, result, isPick }) {
    this.appendPrompt(raw, isPick);
    await this.renderResult(result);
  }

  async mount() {
    await this.loadTemplate(new URL('./Shell.html', import.meta.url), '#app');
    this.output = this.container.querySelector('#output');
    this.statusLine = this.container.querySelector('#status-line');
    this.form = this.container.querySelector('#command-form');
    this.input = this.container.querySelector('#command-input');
    this.promptLabel = this.container.querySelector('#prompt-label');
    this.clearButton = this.container.querySelector('#clear-button');
    this.submitButton = this.form.querySelector('button[type="submit"]');
    this.shortcutButtons = [...this.container.querySelectorAll('.shortcut-button')];

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitCommand(this.input.value);
    });

    this.clearButton.addEventListener('click', () => {
      this.clearConsole();
    });

    for (const button of this.shortcutButtons) {
      button.addEventListener('click', () => {
        this.input.value = button.dataset.command ?? '';
        this.submitCommand(this.input.value);
      });
    }
  }

  engine() {
    return this.state.engine;
  }

  async start() {
    this.appendPrompt();
    this.appendBlock(renderGame(await this.engine().getGame()));
    this.appendBlock(HELP);
    this.syncPrompt(await this.engine().getState());
    this.input.focus();
  }

  setControlsDisabled(disabled) {
    this.input.disabled = disabled;
    this.submitButton.disabled = disabled;
    for (const button of this.shortcutButtons) {
      button.disabled = disabled;
    }
  }

  async moveAt(index) {
    return (await this.engine().getGame()).getMoves()[index];
  }

  appendBlock(text = '') {
    this.output.textContent += `${text}\n`;
    this.output.scrollTop = this.output.scrollHeight;
  }

  appendPrompt(raw, isPick) {
    const prefix = isPick ? 'Pick a number:' : '>';
    this.appendBlock(`${prefix} ${raw ?? ''}`);
  }

  clearConsole() {
    this.output.textContent = '';
    this.setStatus('Console cleared.');
    this.input.focus();
  }

  setStatus(text, isError = false) {
    this.statusLine.textContent = text;
    this.statusLine.classList.toggle('error', isError);
  }

  syncPrompt(state) {
    this.promptLabel.textContent = state.pendingPick.length > 0 ? 'Pick a number:' : '>';
    for (const button of this.shortcutButtons) {
      button.classList.toggle('active', button.dataset.command === this.activeDemo);
    }
  }

  async renderResult(result) {
    switch (result.kind) {
      case 'state':
        if (result.action !== 'moves') this.activeDemo = null;
        this.appendBlock(renderGame(await this.engine().getGame()));
        this.setStatus(`Action: ${result.action}. ${result.state.legalMoveCount} legal move(s).`);
        break;
      case 'demo':
        this.activeDemo = result.id;
        this.appendBlock(result.description);
        this.appendBlock(renderGame(await this.engine().getGame()));
        this.setStatus(`Loaded ${result.id}. ${result.state.legalMoveCount} legal move(s).`);
        break;
      case 'help':
        this.appendBlock(HELP);
        this.setStatus('Help shown.');
        break;
      case 'invalid-index':
        this.appendBlock(`No move #${result.value}. There are ${result.legalMoveCount} legal move(s).`);
        this.setStatus('Invalid move number.', true);
        break;
      case 'no-coordinate-match':
        this.appendBlock(`No legal move from ${result.from.notation} to ${result.to.notation}.`);
        this.setStatus('No matching move for those coordinates.', true);
        break;
      case 'pick-required':
        this.appendBlock(`Multiple moves match ${result.from.notation} -> ${result.to.notation}:`);
        for (const [index, choice] of result.choices.entries()) {
          const move = await this.moveAt(choice.index);
          const captures = move.captured.length > 0
            ? ` [x ${move.captured.map((c) => c.toString()).join(',')}]`
            : '';
          this.appendBlock(`  ${index + 1}) ${move.from.toString()} -> ${move.to.toString()}${captures}`);
        }
        this.setStatus('Multiple matching moves. Pick a number to continue.');
        break;
      case 'trace':
        this.appendBlock(formatTrace(await this.moveAt(result.move.index)));
        this.setStatus(`Trace for move #${result.move.number}.`);
        break;
      case 'trace-list':
        this.appendBlock(`Trace(s) for ${result.from.notation} -> ${result.to.notation}:`);
        for (const [index, move] of result.moves.entries()) {
          this.appendBlock(`  ${index + 1}) ${formatTrace(await this.moveAt(move.index))}`);
        }
        this.setStatus(`Found ${result.moves.length} trace(s).`);
        break;
      case 'empty-history':
        this.appendBlock(result.action === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.');
        this.setStatus(`Nothing to ${result.action}.`, true);
        break;
      case 'cancelled':
        this.appendBlock('Cancelled.');
        this.setStatus('Selection cancelled.', true);
        break;
      case 'parse-error':
        this.appendBlock(result.message);
        this.setStatus('Input could not be parsed.', true);
        break;
      case 'invalid-demo':
        this.appendBlock(`Unknown demo: "${result.id}". Available: ${result.available.join(', ')}`);
        this.setStatus('Unknown demo id.', true);
        break;
      case 'error':
        if (result.action === 'redo') {
          this.appendBlock(`Could not redo: ${result.error.message}`);
          this.setStatus('Redo failed.', true);
        } else if (result.action === 'demo') {
          this.appendBlock(`Could not load demo: ${result.error.message}`);
          this.setStatus('Demo loading failed.', true);
        } else {
          this.appendBlock(`Could not apply move: ${result.error.message}`);
          this.setStatus('Move failed.', true);
        }
        break;
      case 'quit': {
        this.activeDemo = null;
        await this.engine().newGame();
        this.appendBlock('Bye.');
        this.appendBlock(renderGame(await this.engine().getGame()));
        this.setStatus('Session reset to a fresh board.');
        break;
      }
      case 'noop':
        this.setStatus('No operation.');
        break;
      default:
        break;
    }
    this.syncPrompt(await this.engine().getState());
  }

  async submitCommand(raw) {
    if (this.pending) {
      trace('shell', 'submit ignored (busy)', raw);
      return;
    }

    const trimmed = raw.trim();
    if (trimmed === '') {
      this.input.focus();
      return;
    }

    this.pending = true;
    this.setControlsDisabled(true);
    const state = await this.engine().getState();
    const picking = state.pendingPick.length > 0;
    trace('shell', 'submit', { raw: trimmed, picking });

    try {
      if (picking) {
        await this.engine().resolvePick(trimmed);
      } else {
        await this.engine().command(trimmed);
      }
      // Rendering is handled by the subscription callback so Board commands are
      // also echoed here.
    } catch (error) {
      trace('shell', 'unexpected error', error);
      this.appendBlock(`Unexpected error: ${error.message}`);
      this.setStatus('Unexpected error.', true);
    } finally {
      this.pending = false;
      this.setControlsDisabled(false);
      this.input.value = '';
      this.input.focus();
    }
  }
}
