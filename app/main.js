// Entry point for the TUI REPL application.
//
// Usage:
//   node app/main.js            start a fresh game
//   node app/main.js <demo-id>  start with a demo board (e.g. demo3)

import { Game } from '../core/Game.js';
import { createDemoGame, DEMO_IDS } from './demo/index.js';
import { Repl } from './Repl.js';
import { pathToFileURL } from 'node:url';

export async function resolveGame(arg = process.argv[2]) {
  if (!arg) {
    return new Game();
  }
  const id = arg.toLowerCase();
  if (!DEMO_IDS.includes(id)) {
    console.error(`Unknown demo: "${arg}". Available: ${DEMO_IDS.join(', ')}`);
    process.exitCode = 1;
    return null;
  }
  return createDemoGame(id);
}

export async function main(argv = process.argv, ReplClass = Repl) {
  const game = await resolveGame(argv[2]);
  if (!game) {
    return false;
  }
  await new ReplClass(undefined, undefined, game).run();
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
