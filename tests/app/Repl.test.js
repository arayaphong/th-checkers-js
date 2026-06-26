import { describe, expect, test } from '@jest/globals';
import { Readable, PassThrough } from 'node:stream';

import { Repl } from '../../app/Repl.js';
import { createDemo31Game } from '../../app/demo31.js';
import { createDemo32Game } from '../../app/demo32.js';

/**
 * @param {string[]} inputLines
 * @param {import('../../core/Game.js').Game} [game]
 * @returns {Promise<string>}
 */
function runRepl(inputLines, game) {
  const input = Readable.from(inputLines.map((line) => `${line}\n`));
  const output = new PassThrough();
  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk));

  const repl = new Repl(input, output, game);
  return repl.run().then(() => Buffer.concat(chunks).toString('utf8'));
}

describe('Repl coordinate input', () => {
  test('applies d1 d1 directly when all matches capture the same pieces', async () => {
    const output = await runRepl(['d1 d1', 'quit'], createDemo31Game());

    expect(output).toContain('Ply 0 — WHITE to move. 2 legal move(s):');
    expect(output).not.toContain('Multiple moves match D1 -> D1');
    expect(output).toContain('Game over — WHITE wins');
  });

  test('asks for choice when matches capture different pieces', async () => {
    const output = await runRepl(['d1 d1', '2', 'quit'], createDemo32Game());

    expect(output).toContain('Multiple moves match D1 -> D1');
    expect(output).toContain('Pick a number:');
  });
});
