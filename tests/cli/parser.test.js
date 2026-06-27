import { describe, expect, test } from '@jest/globals';

import { parseInput } from '../../cli/parser.js';

describe('parseInput - commands', () => {
  test('recognizes full command names', () => {
    expect(parseInput('undo')).toEqual({ kind: 'command', name: 'undo' });
    expect(parseInput('redo')).toEqual({ kind: 'command', name: 'redo' });
    expect(parseInput('new')).toEqual({ kind: 'command', name: 'new' });
    expect(parseInput('reset')).toEqual({ kind: 'command', name: 'new' });
    expect(parseInput('moves')).toEqual({ kind: 'command', name: 'moves' });
    expect(parseInput('demo1')).toEqual({ kind: 'command', name: 'demo1' });
    expect(parseInput('demo2')).toEqual({ kind: 'command', name: 'demo2' });
    expect(parseInput('demo3')).toEqual({ kind: 'command', name: 'demo3' });
    expect(parseInput('demo4')).toEqual({ kind: 'command', name: 'demo4' });
    expect(parseInput('help')).toEqual({ kind: 'command', name: 'help' });
    expect(parseInput('quit')).toEqual({ kind: 'command', name: 'quit' });
    expect(parseInput('exit')).toEqual({ kind: 'command', name: 'quit' });
  });

  test('recognizes aliases and is case-insensitive', () => {
    expect(parseInput('U')).toEqual({ kind: 'command', name: 'undo' });
    expect(parseInput('R')).toEqual({ kind: 'command', name: 'redo' });
    expect(parseInput('N')).toEqual({ kind: 'command', name: 'new' });
    expect(parseInput('h')).toEqual({ kind: 'command', name: 'help' });
    expect(parseInput('?')).toEqual({ kind: 'command', name: 'help' });
    expect(parseInput('Q')).toEqual({ kind: 'command', name: 'quit' });
  });

  test('ignores surrounding whitespace', () => {
    expect(parseInput('  undo  ')).toEqual({ kind: 'command', name: 'undo' });
  });
});

describe('parseInput - numbers', () => {
  test('parses a 1-based menu index', () => {
    expect(parseInput('1')).toEqual({ kind: 'index', value: 1 });
    expect(parseInput('42')).toEqual({ kind: 'index', value: 42 });
  });

  test('rejects zero', () => {
    expect(parseInput('0')).toEqual({ kind: 'error', message: expect.any(String) });
  });
});

describe('parseInput - coordinates', () => {
  test('parses two squares separated by space, dash or comma', () => {
    // B3 and C4 are both playable dark squares ((x+y) is odd).
    const space = parseInput('b3 c4');
    const dash = parseInput('B3-C4');
    const comma = parseInput('b3,c4');
    for (const result of [space, dash, comma]) {
      expect(result.kind).toBe('coords');
      if (result.kind === 'coords') {
        expect(result.from.toString()).toBe('B3');
        expect(result.to.toString()).toBe('C4');
      }
    }
  });

  test('rejects coordinates that land on a light square', () => {
    // A1 matches the [A-H][1-8] shape but is not a playable black square.
    expect(parseInput('a1 b2').kind).toBe('error');
  });
});

describe('parseInput - trace', () => {
  test('parses trace by move number', () => {
    const result = parseInput('trace 3');
    expect(result).toEqual({ kind: 'trace-index', index: 3 });
  });

  test('parses trace by coordinates', () => {
    const result = parseInput('trace d5 d1');
    expect(result.kind).toBe('trace-coords');
    if (result.kind === 'trace-coords') {
      expect(result.from.toString()).toBe('D5');
      expect(result.to.toString()).toBe('D1');
    }
  });

  test('rejects bare trace', () => {
    expect(parseInput('trace').kind).toBe('error');
  });

  test('rejects trace with bad coordinates', () => {
    expect(parseInput('trace d5').kind).toBe('error');
    expect(parseInput('trace d5 x1').kind).toBe('error');
  });
});

describe('parseInput - empty and unknown', () => {
  test('blank line is empty', () => {
    expect(parseInput('')).toEqual({ kind: 'empty' });
    expect(parseInput('   ')).toEqual({ kind: 'empty' });
  });

  test('gibberish is an error', () => {
    expect(parseInput('foo bar baz').kind).toBe('error');
  });
});
