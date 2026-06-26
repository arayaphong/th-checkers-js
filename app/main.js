// Entry point for the TUI REPL application.
//
// Usage:
//   node app/main.js            start a fresh game
//   node app/main.js <demo-id>  start with a demo board (e.g. demo3)

import { Game } from '../core/Game.js';
import { createDemoGame, DEMO_IDS } from './demo/index.js';
import { Repl } from './Repl.js';

function resolveGame() {
  const arg = process.argv[2];
  if (!arg) {
    return new Game();
  }
  const id = arg.toLowerCase();
  if (!DEMO_IDS.includes(id)) {
    console.error(`Unknown demo: "${arg}". Available: ${DEMO_IDS.join(', ')}`);
    process.exitCode = 1;
    return new Game();
  }
  return createDemoGame(id);
}

async function main() {
  await new Repl(undefined, undefined, resolveGame()).run();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
