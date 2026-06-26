import { Position } from '../../core/Position.js';
import { trace } from './debug.js';

// The board is a thin view: it renders the engine's board snapshot and asks the
// shell what is legal (movableSquares / targetsFrom). It never decides legality
// itself — every move is handed to the shell as a command for it to validate.
export function initBoard(state, shell) {
  const boardElement = document.querySelector('.board');
  const cellByNotation = new Map();
  let movable = new Set();
  let selected = null;
  let selectedCell = null;

  function clearHints() {
    for (const cell of cellByNotation.values()) {
      cell.classList.remove('hint');
    }
  }

  function select(pos, cell) {
    selected = pos;
    selectedCell = cell;
    cell.classList.add('selected');
    const targets = shell.targetsFrom(pos.toString());
    for (const target of targets) {
      cellByNotation.get(target)?.classList.add('hint');
    }
    trace('board', 'select', pos.toString(), { targets });
  }

  function clearSelection() {
    selectedCell?.classList.remove('selected');
    clearHints();
    selected = null;
    selectedCell = null;
  }

  function handleCellClick(pos, cell) {
    const notation = pos.toString();
    trace('board', 'click', notation, { selected: selected?.toString() ?? null });

    // First click: only a square the shell reports as movable can be a source.
    if (!selected) {
      if (!movable.has(notation)) {
        trace('board', 'ignore (not movable)', notation);
        return;
      }
      select(pos, cell);
      return;
    }

    // Click the same square again -> deselect.
    if (selected.equals(pos)) {
      trace('board', 'deselect', notation);
      clearSelection();
      return;
    }

    // Click another of your own movable pieces -> switch the selection there.
    if (movable.has(notation)) {
      trace('board', 'reselect', notation);
      clearSelection();
      select(pos, cell);
      return;
    }

    // Otherwise treat it as the destination and let the shell validate/apply it.
    const command = `${selected.toString()} ${notation}`;
    clearSelection();
    trace('board', 'submit move', command);
    shell.submit(command);
  }

  function syncBoard() {
    selected = null;
    selectedCell = null;
    cellByNotation.clear();
    movable = shell.movableSquares();
    trace('board', 'render', { movable: [...movable] });

    const board = state.engine.getGame().board();
    const cells = [];

    for (let row = 0; row < Position.BOARD_SIZE; row++) {
      for (let col = 0; col < Position.BOARD_SIZE; col++) {
        const cell = document.createElement('div');
        const isValid = Position.isValid(col, row);
        cell.className = `cell ${isValid ? 'dark' : 'light'}`;

        if (isValid) {
          const pos = Position.fromCoords(col, row);
          const notation = pos.toString();
          cell.dataset.notation = notation;
          cellByNotation.set(notation, cell);
          if (board.isOccupied(pos)) {
            cell.classList.add('piece', board.isBlackPiece(pos) ? 'black' : 'white');
            if (board.isDamePiece(pos)) {
              cell.classList.add('king');
            }
          }
          if (movable.has(notation)) {
            cell.classList.add('movable');
          }
          cell.addEventListener('click', () => handleCellClick(pos, cell));
        }

        cells.push(cell);
      }
    }

    boardElement.replaceChildren(...cells);
  }

  syncBoard();
  return syncBoard;
}
