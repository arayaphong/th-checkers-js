import { Position } from '../../core/Position.js';
import { trace } from './debug.js';

// The board is a thin view: it renders the engine's board snapshot and asks the
// shell what is legal (movableSquares / targetsFrom). It never decides legality
// itself — every move is handed to the shell as a command for it to validate.
export function initBoard(state, shell) {
  const boardElement = document.querySelector('.board');
  boardElement.setAttribute('role', 'group');

  const cellByNotation = new Map();
  let movable = new Set();
  let selected = null;
  let selectedCell = null;
  // Squares highlighted by a `trace` command; kept so a transient hover preview
  // can restore them when the pointer leaves.
  let stickyPath = [];

  function paintPath(notations) {
    for (const cell of cellByNotation.values()) {
      cell.classList.remove('path');
    }
    for (const notation of notations) {
      cellByNotation.get(notation)?.classList.add('path');
    }
  }

  // Preview the continuous path from the selected source to the hovered/focused
  // target, but only when the shell reports a single unambiguous route.
  function previewPathTo(notation) {
    if (!selected) return;
    const cells = shell.pathFor(selected.toString(), notation);
    paintPath(cells ?? stickyPath);
  }

  function endPreview() {
    paintPath(stickyPath);
  }

  // Pin a path on the board (driven by a `trace` command in the shell).
  function highlightPath(notations) {
    stickyPath = notations ?? [];
    paintPath(stickyPath);
  }

  function clearPath() {
    stickyPath = [];
    paintPath([]);
  }

  function describeCell(board, pos, notation) {
    if (!board.isOccupied(pos)) {
      return `${notation}, empty square`;
    }

    const color = board.isBlackPiece(pos) ? 'black' : 'white';
    const type = board.isDamePiece(pos) ? 'king' : 'piece';
    const moveState = movable.has(notation) ? ', movable' : '';
    return `${notation}, ${color} ${type}${moveState}`;
  }

  function clearHints() {
    for (const cell of cellByNotation.values()) {
      cell.classList.remove('hint');
      cell.removeAttribute('aria-current');
      cell.setAttribute('aria-label', cell.dataset.label ?? '');
    }
  }

  function select(pos, cell) {
    // Starting a new move intent retires any pinned trace highlight.
    clearPath();
    selected = pos;
    selectedCell = cell;
    cell.classList.add('selected');
    cell.setAttribute('aria-pressed', 'true');
    cell.setAttribute('aria-label', `${cell.dataset.label}, selected`);
    const targets = shell.targetsFrom(pos.toString());
    for (const target of targets) {
      const targetCell = cellByNotation.get(target);
      targetCell?.classList.add('hint');
      targetCell?.setAttribute('aria-current', 'true');
      targetCell?.setAttribute('aria-label', `${targetCell.dataset.label}, legal target`);
    }
    trace('board', 'select', pos.toString(), { targets });
  }

  function clearSelection() {
    selectedCell?.classList.remove('selected');
    selectedCell?.removeAttribute('aria-pressed');
    selectedCell?.setAttribute('aria-label', selectedCell.dataset.label ?? '');
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

  function handleCellKeydown(event, pos, cell) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    handleCellClick(pos, cell);
  }

  function syncBoard() {
    selected = null;
    selectedCell = null;
    stickyPath = [];
    cellByNotation.clear();
    movable = shell.movableSquares();
    trace('board', 'render', { movable: [...movable] });

    const board = state.engine.getGame().board();
    const cells = [];

    for (let row = 0; row < Position.BOARD_SIZE; row++) {
      for (let col = 0; col < Position.BOARD_SIZE; col++) {
        const isValid = Position.isValid(col, row);
        const cell = document.createElement(isValid ? 'button' : 'div');
        cell.className = `cell ${isValid ? 'dark' : 'light'}`;

        if (isValid) {
          const pos = Position.fromCoords(col, row);
          const notation = pos.toString();
          const label = describeCell(board, pos, notation);
          cell.type = 'button';
          cell.dataset.notation = notation;
          cell.dataset.label = label;
          cell.setAttribute('aria-label', label);
          cellByNotation.set(notation, cell);
          if (board.isOccupied(pos)) {
            cell.classList.add('piece', board.isBlackPiece(pos) ? 'black' : 'white');
            if (board.isDamePiece(pos)) {
              cell.classList.add('king');
              const crown = document.createElement('span');
              crown.className = 'king-marker';
              crown.setAttribute('aria-hidden', 'true');
              crown.textContent = 'K';
              cell.append(crown);
            }
          }
          if (movable.has(notation)) {
            cell.classList.add('movable');
          }
          cell.addEventListener('click', () => handleCellClick(pos, cell));
          cell.addEventListener('keydown', (event) => handleCellKeydown(event, pos, cell));
          // Hover or keyboard-focus a target to preview the path; leaving restores
          // whatever a `trace` command had pinned.
          cell.addEventListener('mouseenter', () => previewPathTo(notation));
          cell.addEventListener('mouseleave', endPreview);
          cell.addEventListener('focus', () => previewPathTo(notation));
          cell.addEventListener('blur', endPreview);
        } else {
          cell.setAttribute('aria-hidden', 'true');
        }

        cells.push(cell);
      }
    }

    boardElement.replaceChildren(...cells);
  }

  syncBoard();
  return { sync: syncBoard, highlightPath, clearPath };
}
