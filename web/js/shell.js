import { parseInput } from '../../app/parse.js';
import { formatMove, formatTrace, renderGame } from '../../app/render.js';
import { singleRoute } from '../../app/utils/route.js';
import { trace } from './debug.js';

const HELP = `Commands:
	<number>          apply the move with that menu number
	<from> <to>       apply a move by coordinates, e.g. "b3 c4" or "b3-c4"
	trace <n>         show the full path of move #n
	trace <f> <t>     show all paths from f to t
	undo  | u         take back the last move
	redo  | r         re-apply a move undone with 'undo'
	new   | reset | n start a fresh game
	moves | m         re-print the board and move menu
	help  | h | ?     show this help
	quit  | q | exit  clear the session and start a fresh board

Demos:
	demo1             branching chain capture, same final landing
	demo2             dame loop capture ending on the original square
	demo3             dame loop capture with two mirror-image paths
	demo4             dame loop capture with extra central branching`;

export function initShell(state, board) {
  const output = document.querySelector('#output');
  const statusLine = document.querySelector('#status-line');
  const form = document.querySelector('#command-form');
  const input = document.querySelector('#command-input');
  const promptLabel = document.querySelector('#prompt-label');
  const clearButton = document.querySelector('#clear-button');
  const submitButton = form.querySelector('button[type="submit"]');
  const shortcutButtons = [...document.querySelectorAll('.shortcut-button')];

  let pending = false;
  let activeDemo = null;

  function engine() {
    return state.engine;
  }

  function setControlsDisabled(disabled) {
    input.disabled = disabled;
    submitButton.disabled = disabled;
    for (const button of shortcutButtons) {
      button.disabled = disabled;
    }
  }

  function moveAt(index) {
    return engine().getGame().getMoves()[index];
  }

  // --- Legality queries the board UI relies on (single source of truth) ---
  function movableSquares() {
    const froms = new Set(engine().getGame().getMoves().map((move) => move.from.toString()));
    trace('shell', 'movableSquares', [...froms]);
    return froms;
  }

  function targetsFrom(notation) {
    const targets = engine().getGame().getMoves()
      .filter((move) => move.from.toString() === notation)
      .map((move) => move.to.toString());
    trace('shell', 'targetsFrom', notation, targets);
    return targets;
  }

  // The continuous path the board highlights, or null when from -> to is not a
  // single unambiguous route (no such move, or several mirror-image paths).
  function pathFor(from, to) {
    const route = singleRoute(engine().getGame().getMoves(), from, to);
    const cells = route ? route.map((pos) => pos.toString()) : null;
    trace('shell', 'pathFor', `${from} -> ${to}`, cells);
    return cells;
  }

  function appendBlock(text = '') {
    output.textContent += `${text}\n`;
    output.scrollTop = output.scrollHeight;
  }

  function appendPrompt(raw) {
    appendBlock(`${engine().isPickingMove() ? 'Pick a number:' : '>'} ${raw}`);
  }

  function clearConsole() {
    output.textContent = '';
    setStatus('Console cleared.');
    input.focus();
  }

  function setStatus(text, isError = false) {
    statusLine.textContent = text;
    statusLine.classList.toggle('error', isError);
  }

  function syncPrompt() {
    promptLabel.textContent = engine().isPickingMove() ? 'Pick a number:' : '>';
    for (const button of shortcutButtons) {
      button.classList.toggle('active', button.dataset.command === activeDemo);
    }
  }

  function renderResult(result) {
    switch (result.kind) {
      case 'state':
        if (result.action !== 'moves') activeDemo = null;
        board.sync();
        appendBlock(renderGame(engine().getGame(), result.state));
        setStatus(`Action: ${result.action}. ${result.state.legalMoveCount} legal move(s).`);
        break;
      case 'demo':
        activeDemo = result.id;
        board.sync();
        appendBlock(result.description);
        appendBlock(renderGame(engine().getGame(), result.state));
        setStatus(`Loaded ${result.id}. ${result.state.legalMoveCount} legal move(s).`);
        break;
      case 'help':
        appendBlock(HELP);
        setStatus('Help shown.');
        break;
      case 'invalid-index':
        appendBlock(`No move #${result.value}. There are ${result.legalMoveCount} legal move(s).`);
        setStatus('Invalid move number.', true);
        break;
      case 'no-coordinate-match':
        appendBlock(`No legal move from ${result.from.notation} to ${result.to.notation}.`);
        setStatus('No matching move for those coordinates.', true);
        break;
      case 'pick-required':
        appendBlock(`Multiple moves match ${result.from.notation} -> ${result.to.notation}:`);
        for (const [index, choice] of result.choices.entries()) {
          appendBlock(`  ${index + 1}) ${formatMove(moveAt(choice.index))}`);
        }
        setStatus('Multiple matching moves. Pick a number to continue.');
        break;
      case 'trace':
        appendBlock(formatTrace(moveAt(result.move.index)));
        board.highlightPath(result.move.path.map((cell) => cell.notation));
        setStatus(`Trace for move #${result.move.number}${result.move.groupId ? ` (group ${result.move.groupId})` : ''}.`);
        break;
      case 'trace-list':
        appendBlock(`Trace(s) for ${result.from.notation} -> ${result.to.notation}:`);
        for (const [index, move] of result.moves.entries()) {
          appendBlock(`  ${index + 1}) ${formatTrace(moveAt(move.index))}`);
        }
        // Only a single unambiguous route is highlighted; mirror-image paths are not.
        board.highlightPath(
          result.moves.length === 1 ? result.moves[0].path.map((cell) => cell.notation) : [],
        );
        setStatus(`Found ${result.moves.length} trace(s).`);
        break;
      case 'empty-history':
        appendBlock(result.action === 'undo' ? 'Nothing to undo.' : 'Nothing to redo.');
        setStatus(`Nothing to ${result.action}.`, true);
        break;
      case 'cancelled':
        appendBlock('Cancelled.');
        setStatus('Selection cancelled.', true);
        break;
      case 'parse-error':
        appendBlock(result.message);
        setStatus('Input could not be parsed.', true);
        break;
      case 'invalid-demo':
        appendBlock(`Unknown demo: "${result.id}". Available: ${result.available.join(', ')}`);
        setStatus('Unknown demo id.', true);
        break;
      case 'error':
        if (result.action === 'redo') {
          appendBlock(`Could not redo: ${result.error.message}`);
          setStatus('Redo failed.', true);
        } else if (result.action === 'demo') {
          appendBlock(`Could not load demo: ${result.error.message}`);
          setStatus('Demo loading failed.', true);
        } else {
          appendBlock(`Could not apply move: ${result.error.message}`);
          setStatus('Move failed.', true);
        }
        break;
      case 'quit':
        activeDemo = null;
        state.engine = new state.engine.constructor();
        board.sync();
        appendBlock('Bye.');
        appendBlock(renderGame(engine().getGame()));
        setStatus('Session reset to a fresh board.');
        break;
      case 'noop':
        setStatus('No operation.');
        break;
    }
    syncPrompt();
  }

  async function submitCommand(raw) {
    if (pending) {
      trace('shell', 'submit ignored (busy)', raw);
      return;
    }

    pending = true;
    setControlsDisabled(true);
    const picking = engine().isPickingMove();
    trace('shell', 'submit', { raw, picking });

    try {
      appendPrompt(raw);
      const currentEngine = engine();
      const result = picking
        ? currentEngine.resolvePick(raw)
        : await currentEngine.handle(parseInput(raw));
      trace('shell', 'result', result.kind, result);
      renderResult(result);
    } catch (error) {
      trace('shell', 'unexpected error', error);
      appendBlock(`Unexpected error: ${error.message}`);
      setStatus('Unexpected error.', true);
    } finally {
      pending = false;
      setControlsDisabled(false);
      input.value = '';
      input.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitCommand(input.value);
  });

  clearButton.addEventListener('click', () => {
    clearConsole();
  });

  for (const button of shortcutButtons) {
    button.addEventListener('click', () => {
      input.value = button.dataset.command ?? '';
      submitCommand(input.value);
    });
  }

  appendBlock(renderGame(engine().getGame()));
  appendBlock(HELP);
  board.sync();
  syncPrompt();
  input.focus();

  return { submitCommand, movableSquares, targetsFrom, pathFor };
}
