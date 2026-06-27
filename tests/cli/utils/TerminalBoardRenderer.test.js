import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Game } from '../../../core/Game.js';
import {
  boardToString,
  movesToString,
  printBoard,
  printChoices,
} from '../../../cli/utils/TerminalBoardRenderer.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('TerminalBoardRenderer', () => {
  test('boardToString renders a board', () => {
    const game = new Game();
    const output = boardToString(game.board());

    expect(output).toContain('A B C D E F G H');
    expect(output).toContain('1');
    expect(output).toContain('8');
  });

  test('movesToString renders available moves', () => {
    const game = new Game();
    const moves = game.getMoves();
    const output = movesToString(moves);

    expect(output).toContain(`Moves (${moves.length}):`);
    expect(output).toMatch(/\w\d -> \w\d/);
  });

  test('printBoard writes rendered board to console', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const game = new Game();

    printBoard(game.board());

    expect(log).toHaveBeenCalledWith(boardToString(game.board()));
  });

  test('printChoices writes rendered moves to console', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const game = new Game();

    printChoices(game);

    expect(log).toHaveBeenCalledWith(movesToString(game.getMoves()));
  });
});
