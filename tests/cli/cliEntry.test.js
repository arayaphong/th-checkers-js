import { describe, expect, jest, test } from '@jest/globals';

import { main } from '../../cli/cliEntry.js';

describe('cli/cliEntry.js', () => {
  test('exits without starting the REPL for an unknown demo id', async () => {
    const originalExitCode = process.exitCode;
    const errors = [];
    const error = jest.spyOn(console, 'error').mockImplementation((message) => errors.push(message));
    let cliConstructed = false;
    let cliStarted = false;

    class FakeCli {
      constructor() {
        cliConstructed = true;
      }

      run() {
        cliStarted = true;
      }
    }

    let didStart;
    let exitCodeAfter;
    try {
      didStart = await main(['node', 'cli/cliEntry.js', 'nope'], FakeCli);
      exitCodeAfter = process.exitCode;
    } finally {
      error.mockRestore();
      process.exitCode = originalExitCode;
    }

    expect(didStart).toBe(false);
    expect(exitCodeAfter).toBe(1);
    expect(cliConstructed).toBe(false);
    expect(cliStarted).toBe(false);
    expect(errors).toContain('Unknown demo: "nope". Available: demo1, demo2, demo3, demo4');
  });
});
