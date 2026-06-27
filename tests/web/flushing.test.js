/**
 * @jest-environment jsdom
 */

import { Engine } from '../../cli/Engine.js';
import { parseInput } from '../../cli/parser.js';
import { App } from '../../web/components/App/App.js';
import { Board } from '../../web/components/Board/Board.js';
import { Shell } from '../../web/components/Shell/Shell.js';

// jsdom doesn't implement fetch or Worker; stub them for the App integration test.
if (!globalThis.fetch || typeof globalThis.fetch !== 'function') {
  globalThis.fetch = global.fetch;
  globalThis.Request = global.Request;
  globalThis.Response = global.Response;
  globalThis.Headers = global.Headers;
}
if (!globalThis.Worker) {
  globalThis.Worker = class Worker {
    constructor() {}
    postMessage() {}
    terminate() {}
  };
}

/**
 * Mock EngineClient that doesn't use a real Web Worker.
 * It exposes the same API and broadcasts results like the real client.
 */
class MockEngineClient {
  constructor() {
    this.engine = new Engine();
    this.subscribers = [];
    this.ready = true;
    this.commands = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index >= 0) this.subscribers.splice(index, 1);
    };
  }

  #broadcast(raw, result, isPick) {
    for (const fn of this.subscribers) {
      fn({ raw, result, isPick });
    }
  }

  async command(raw) {
    this.commands.push(raw);
    const result = this.engine.isPickingMove()
      ? this.engine.resolvePick(raw)
      : await this.engine.handle(parseInput(raw));
    this.#broadcast(raw, result, false);
    return result;
  }

  async handle(parsed) {
    const result = await this.engine.handle(parsed);
    this.#broadcast(undefined, result, false);
    return result;
  }

  async resolvePick(raw) {
    this.commands.push(raw);
    const result = this.engine.resolvePick(raw);
    this.#broadcast(raw, result, true);
    return result;
  }

  async getGame() {
    const { createGameAdapter } = await import('../../web/utils/GameAdapter.js');
    return createGameAdapter(this.engine.getState());
  }

  async getState() {
    return this.engine.getState();
  }

  async newGame() {
    return this.engine.newGame();
  }

  terminate() {}
}

describe('no empty command flushing', () => {
  test('App mounts Board and Shell without sending empty commands', async () => {
    const client = new MockEngineClient();
    document.body.innerHTML = '<main id="app"></main>';

    const app = new App();
    // Inject the shared mock client by monkey-patching App constructor state
    app.state = { engine: client };
    await app.mount();

    // Give any async subscribers time to settle
    await new Promise((r) => setTimeout(r, 50));

    // No empty commands should have been sent during mount/start.
    const emptyCommands = client.commands.filter((cmd) => cmd.trim() === '');
    expect(emptyCommands).toHaveLength(0);
  });

  test('Shell ignores empty submit', async () => {
    const client = new MockEngineClient();
    document.body.innerHTML = '<main id="app"></main>';

    const shell = new Shell(document.querySelector('#app'), { engine: client });
    await shell.mount();
    shell.start();

    const before = client.commands.length;
    await shell.submitCommand('   ');
    expect(client.commands.length).toBe(before);
  });

  test('Board click sends exactly one command', async () => {
    const client = new MockEngineClient();
    document.body.innerHTML = '<main id="app"></main>';

    const board = new Board(document.querySelector('#app'), { engine: client });
    await board.mount();

    const { Position } = await import('../../core/Position.js');
    const fromCell = document.querySelector('[data-notation="B7"]');
    const toCell = document.querySelector('[data-notation="A6"]') ?? document.querySelector('[data-notation="C6"]');
    expect(fromCell).not.toBeNull();
    expect(toCell).not.toBeNull();

    await board.handleCellClick(Position.fromString('B7'), fromCell);
    await board.handleCellClick(Position.fromString(toCell.dataset.notation), toCell);

    await new Promise((r) => setTimeout(r, 50));

    const moveCommands = client.commands.filter((cmd) => cmd.trim() !== '');
    expect(moveCommands).toHaveLength(1);
    expect(moveCommands[0]).toMatch(/^B7 /);
  });
});
