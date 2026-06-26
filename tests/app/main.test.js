import { describe, expect, jest, test } from '@jest/globals';

import { main } from '../../app/main.js';

describe('app/main.js', () => {
  test('exits without starting the REPL for an unknown demo id', async () => {
    const originalExitCode = process.exitCode;
    const errors = [];
    const error = jest.spyOn(console, 'error').mockImplementation((message) => errors.push(message));
    let replConstructed = false;
    let replStarted = false;

    class FakeRepl {
      constructor() {
        replConstructed = true;
      }

      run() {
        replStarted = true;
      }
    }

    let didStart;
    let exitCodeAfter;
    try {
      didStart = await main(['node', 'app/main.js', 'nope'], FakeRepl);
      exitCodeAfter = process.exitCode;
    } finally {
      error.mockRestore();
      process.exitCode = originalExitCode;
    }

    expect(didStart).toBe(false);
    expect(exitCodeAfter).toBe(1);
    expect(replConstructed).toBe(false);
    expect(replStarted).toBe(false);
    expect(errors).toContain('Unknown demo: "nope". Available: demo1, demo2, demo3, demo4');
  });
});
