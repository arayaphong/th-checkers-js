import { describe, expect, test } from '@jest/globals';
import { Readable, PassThrough } from 'node:stream';

import { Cli } from '../../cli/Cli.js';
import { createDemo3Game, createDemo4Game } from '../../cli/demos/index.js';

/**
 * @param {string[]} inputLines
 * @param {import('../../core/Game.js').Game} [game]
 * @returns {Promise<string>}
 */
function runCli(inputLines, game) {
  const input = Readable.from(inputLines.map((line) => `${line}\n`));
  const output = new PassThrough();
  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk));

  const cli = new Cli(input, output, game);
  return cli.run().then(() => Buffer.concat(chunks).toString('utf8'));
}

describe('Cli coordinate input', () => {
  test('applies d1 d1 directly when all matches capture the same pieces', async () => {
    const output = await runCli(['d1 d1', 'quit'], await createDemo3Game());

    expect(output).toContain('Ply 0 — WHITE to move. 2 legal move(s):');
    expect(output).not.toContain('Multiple moves match D1 -> D1');
    expect(output).toContain('Game over — WHITE wins');
  });

  test('asks for choice when matches capture different pieces', async () => {
    const output = await runCli(['d1 d1', '2', 'quit'], await createDemo4Game());

    expect(output).toContain('Multiple moves match D1 -> D1');
    expect(output).toContain('Pick a number:');
  });
});
