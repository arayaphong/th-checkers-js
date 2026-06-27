import { parseInput } from '../../../app/parse.js';
import { formatMove, formatTrace, renderGame } from '../../../app/render.js';
import { singleRoute } from '../../../app/utils/route.js';
import { Component } from '../Component/Component.js';
import { trace } from '../../utils/Debug.js';

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
 * Provides the REPL interface, drives the engine, and answers legality queries
 * for the board. The board is supplied after construction via `setBoard()` to
 * break the circular dependency between the two components.
 */
export class Shell extends Component {
  constructor(container, state) {
    super(container);
    this.state = state;
    this.board = null;
    this.pending = false;
    this.activeDemo = null;
  }

  async mount() {
    await this.loadTemplate(new URL('./Shell.html', import.meta.url));

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

  setBoard(board) {
    this.board = board;
  }

  start() {
    this.appendBlock(renderGame(this.engine().getGame()));
    this.appendBlock(HELP);
    this.board?.sync();
    this.syncPrompt();
    this.input.focus();
  }

  engine() {
    return this.state.engine;
  }

  setControlsDisabled(disabled) {
    this.input.disabled = disabled;
    this.submitButton.disabled = disabled;
    for (const button of this.shortcutButtons) {
      button.disabled = disabled;
    }
  }

  moveAt(index) {
    return this.engine().getGame().getMoves()[index];
  }

  // --- Legality queries the board UI relies on (single source of truth) ---
  movableSquares() {
    const froms = new Set(this.engine().getGame().getMoves().map((move) => move.from.toString()));
    trace('shell', 'movableSquares', [...froms]);
    return froms;
  }

  targetsFrom(notation) {
    const targets = this.engine().getGame().getMoves()
      .filter((move) => move.from.toString() === notation)
      .map((move) => move.to.toString());
    trace('shell', 'targetsFrom', notation, targets);
    return targets;
  }

  // The continuous path the board highlights, or null when from -> to is not a
  // single unambiguous route (no such move, or several mirror-image paths).
  pathFor(from, to) {
    const route = singleRoute(this.engine().getGame().getMoves(), from, to);
    const cells = route ? route.map((pos) => pos.toString()) : null;
    trace('shell', 'pathFor', `${from} -> ${to}`, cells);
    return cells;
  }

  appendBlock(text = '') {
    this.output.textContent += `${text}\n`;
    this.output.scrollTop = this.output.scrollHeight;
  }

  appendPrompt(raw) {
    this.appendBlock(`${this.engine().isPickingMove() ? 'Pick a number:' : '>'} ${raw}`);
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

  syncPrompt() {
    this.promptLabel.textContent = this.engine().isPickingMove() ? 'Pick a number:' : '>';
    for (const button of this.shortcutButtons) {
      button.classList.toggle('active', button.dataset.command === this.activeDemo);
    }
  }

  renderResult(result) {
    switch (result.kind) {
      case 'state':
        if (result.action !== 'moves') this.activeDemo = null;
        this.board?.sync();
        this.appendBlock(renderGame(this.engine().getGame()));
        this.setStatus(`Action: ${result.action}. ${result.state.legalMoveCount} legal move(s).`);
        break;
      case 'demo':
        this.activeDemo = result.id;
        this.board?.sync();
        this.appendBlock(result.description);
        this.appendBlock(renderGame(this.engine().getGame()));
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
          this.appendBlock(`  ${index + 1}) ${formatMove(this.moveAt(choice.index))}`);
        }
        this.setStatus('Multiple matching moves. Pick a number to continue.');
        break;
      case 'trace':
        this.appendBlock(formatTrace(this.moveAt(result.move.index)));
        this.board?.highlightPath(result.move.path.map((cell) => cell.notation));
        this.setStatus(`Trace for move #${result.move.number}.`);
        break;
      case 'trace-list':
        this.appendBlock(`Trace(s) for ${result.from.notation} -> ${result.to.notation}:`);
        for (const [index, move] of result.moves.entries()) {
          this.appendBlock(`  ${index + 1}) ${formatTrace(this.moveAt(move.index))}`);
        }
        // Only a single unambiguous route is highlighted; mirror-image paths are not.
        this.board?.highlightPath(
          result.moves.length === 1 ? result.moves[0].path.map((cell) => cell.notation) : [],
        );
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
      case 'quit':
        this.activeDemo = null;
        this.state.engine = new this.state.engine.constructor();
        this.board?.sync();
        this.appendBlock('Bye.');
        this.appendBlock(renderGame(this.engine().getGame()));
        this.setStatus('Session reset to a fresh board.');
        break;
      case 'noop':
        this.setStatus('No operation.');
        break;
      default:
        break;
    }
    this.syncPrompt();
  }

  async submitCommand(raw) {
    if (this.pending) {
      trace('shell', 'submit ignored (busy)', raw);
      return;
    }

    this.pending = true;
    this.setControlsDisabled(true);
    const picking = this.engine().isPickingMove();
    trace('shell', 'submit', { raw, picking });

    try {
      this.appendPrompt(raw);
      const currentEngine = this.engine();
      const result = picking
        ? currentEngine.resolvePick(raw)
        : await currentEngine.handle(parseInput(raw));
      trace('shell', 'result', result.kind, result);
      this.renderResult(result);
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
