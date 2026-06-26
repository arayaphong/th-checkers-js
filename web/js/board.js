import { Position } from '../../core/Position.js';

export function initBoard(state) {
  const boardElement = document.querySelector('.board');

  function syncBoard() {
    const board = state.engine.getGame().board();
    boardElement.replaceChildren();

    for (let row = 0; row < Position.BOARD_SIZE; row++) {
      for (let col = 0; col < Position.BOARD_SIZE; col++) {
        const cell = document.createElement('div');
        cell.className = `cell ${Position.isValid(col, row) ? 'dark' : 'light'}`;

        if (Position.isValid(col, row)) {
          const pos = Position.fromCoords(col, row);
          if (board.isOccupied(pos)) {
            cell.classList.add('piece', board.isBlackPiece(pos) ? 'black' : 'white');
            if (board.isDamePiece(pos)) {
              cell.classList.add('king');
            }
          }
        }

        boardElement.append(cell);
      }
    }
  }

  syncBoard();
  return syncBoard;
}
