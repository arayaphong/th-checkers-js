// Entry point for the TUI REPL application.

import { Repl } from './Repl.js';

async function main() {
  await new Repl().run();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
