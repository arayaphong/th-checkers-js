import { parseInput } from '../../app/parse.js';
import { formatMove, formatTrace, renderGame } from '../../app/render.js';

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

export function initShell(state, syncBoard) {
  const output = document.querySelector('#output');
  const statusLine = document.querySelector('#status-line');
  const form = document.querySelector('#command-form');
  const input = document.querySelector('#command-input');
  const promptLabel = document.querySelector('#prompt-label');
  const clearButton = document.querySelector('#clear-button');
  const submitButton = form.querySelector('button[type="submit"]');
  const shortcutButtons = [...document.querySelectorAll('.shortcut-button')];

  let pending = false;

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
      button.classList.toggle('active', button.dataset.command?.startsWith('demo') && false);
    }
  }

  function renderResult(result) {
    switch (result.kind) {
      case 'state':
        syncBoard();
        appendBlock(renderGame(engine().getGame()));
        setStatus(`Action: ${result.action}. ${result.state.legalMoveCount} legal move(s).`);
        break;
      case 'demo':
        syncBoard();
        appendBlock(result.description);
        appendBlock(renderGame(engine().getGame()));
        setStatus(`Loaded ${result.id}. ${result.state.legalMoveCount} legal move(s).`);
        for (const button of shortcutButtons) {
          button.classList.toggle('active', button.dataset.command === result.id);
        }
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
        setStatus(`Trace for move #${result.move.number}.`);
        break;
      case 'trace-list':
        appendBlock(`Trace(s) for ${result.from.notation} -> ${result.to.notation}:`);
        for (const [index, move] of result.moves.entries()) {
          appendBlock(`  ${index + 1}) ${formatTrace(moveAt(move.index))}`);
        }
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
        state.engine = new state.engine.constructor();
        syncBoard();
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
    if (pending) return;

    pending = true;
    setControlsDisabled(true);

    try {
      appendPrompt(raw);
      const currentEngine = engine();
      const result = currentEngine.isPickingMove()
        ? currentEngine.resolvePick(raw)
        : await currentEngine.handle(parseInput(raw));
      renderResult(result);
    } catch (error) {
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
  syncBoard();
  syncPrompt();
  input.focus();

  return { submitCommand };
}
