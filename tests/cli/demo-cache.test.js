import { afterEach, describe, expect, jest, test } from '@jest/globals';

const originalProcess = globalThis.process;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.process = originalProcess;
  globalThis.fetch = originalFetch;
});

function demoJson() {
  return JSON.stringify({
    id: 'demo1',
    title: 'Retryable demo',
    description: 'Loads after a transient failure.',
    pieces: [
      ['D5', { color: 'WHITE', type: 'DAME' }],
      ['C4', { color: 'BLACK', type: 'PION' }],
    ],
  });
}

describe('demo cache', () => {
  test('evicts failed loads so a later call can retry', async () => {
    globalThis.process = undefined;
    globalThis.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('temporary fetch failure'))
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(demoJson()),
      });

    const { createDemoGame } = await import(`../../cli/demos/index.js?retry=${Date.now()}`);

    await expect(createDemoGame('demo1')).rejects.toThrow('temporary fetch failure');

    const game = await createDemoGame('demo1');

    expect(game.getMoves().length).toBeGreaterThan(0);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
