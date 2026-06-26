import { Position } from '../../core/Position.js';

export function initBoard(state, onMove) {
  const boardElement = document.querySelector('.board');
  let selected = null;

  function handleCellClick(pos) {
    if (!selected) {
      selected = pos;
      return;
    }

    if (selected.equals(pos)) {
      selected = null;
      return;
    }

    onMove(`${selected.toString()} ${pos.toString()}`);
    selected = null;
  }

  function syncBoard() {
    selected = null;
    const board = state.engine.getGame().board();
    boardElement.replaceChildren();

    for (let row = 0; row < Position.BOARD_SIZE; row++) {
      for (let col = 0; col < Position.BOARD_SIZE; col++) {
        const cell = document.createElement('div');
        const isValid = Position.isValid(col, row);
        cell.className = `cell ${isValid ? 'dark' : 'light'}`;

        if (isValid) {
          const pos = Position.fromCoords(col, row);
          cell.dataset.notation = pos.toString();
          if (board.isOccupied(pos)) {
            cell.classList.add('piece', board.isBlackPiece(pos) ? 'black' : 'white');
            if (board.isDamePiece(pos)) {
              cell.classList.add('king');
            }
          }
          cell.addEventListener('click', () => handleCellClick(pos));
        }

        boardElement.append(cell);
      }
    }
  }

  syncBoard();
  return syncBoard;
}
