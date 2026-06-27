import { createGameAdapter } from './GameAdapter.js';

/**
 * Client for the engine Web Worker.
 *
 * Every command sent to the worker is broadcast back to all subscribers as a
 * `{ raw, result, isPick }` object, so Board and Shell stay in sync without
 * direct coupling. Queries like `getGame()` and `getState()` return promises as
 * usual and are not broadcast.
 */
export class EngineClient {
  /**
   * @param {string|URL} workerUrl
   * @param {object} [options]
   * @param {number} [options.timeout]
   */
  constructor(workerUrl, options = {}) {
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.pending = new Map();
    this.nextId = 1;
    this.ready = false;
    this.readyQueue = [];
    this.subscribers = [];
    this.timeout = options.timeout ?? 10000;

    this.worker.onmessage = (event) => this.#onMessage(event);
    this.worker.onerror = (error) => this.#onError(error);
  }

  /**
   * Subscribe to every result broadcast by the worker.
   * @param {(message: { raw?: string, result: unknown, isPick: boolean }) => void} callback
   * @returns {() => void}
   */
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

  #onMessage(event) {
    const { id, type, result, error } = event.data;

    if (type === 'ready') {
      this.ready = true;
      for (const fn of this.readyQueue) fn();
      this.readyQueue = [];
      return;
    }

    const handler = this.pending.get(id);
    let raw;
    let isPick = false;
    if (handler) {
      this.pending.delete(id);
      clearTimeout(handler.timer);
      raw = handler.raw;
      isPick = handler.isPick;
      if (error) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(result);
      }
    }

    // Only command/pick results are broadcast to subscribers; internal queries
    // like getState/newGame return promises and must not be echoed by the UI.
    if (!error && raw !== undefined) {
      this.#broadcast(raw, result, isPick);
    }
  }

  #onError(error) {
    this.ready = true;
    for (const fn of this.readyQueue) fn();
    this.readyQueue = [];
    for (const handler of this.pending.values()) {
      clearTimeout(handler.timer);
      handler.reject(error);
    }
    this.pending.clear();
  }

  #whenReady() {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.readyQueue.push(resolve);
      setTimeout(() => {
        const index = this.readyQueue.indexOf(resolve);
        if (index >= 0) {
          this.readyQueue.splice(index, 1);
          reject(new Error('Engine worker failed to become ready'));
        }
      }, this.timeout);
    });
  }

  /**
   * @param {string} type
   * @param {unknown} [payload]
   * @param {string} [raw]
   * @param {boolean} [isPick]
   * @returns {Promise<unknown>}
   */
  async #send(type, payload, raw, isPick = false) {
    await this.#whenReady();
    return new Promise((resolve, reject) => {
      const id = this.nextId;
      this.nextId += 1;

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Engine worker request timed out: ${type}`));
      }, this.timeout);

      this.pending.set(id, { resolve, reject, timer, raw, isPick });
      this.worker.postMessage({ id, type, payload });
    });
  }

  /**
   * Send a raw REPL-style command string. The result is broadcast to subscribers.
   * @param {string} raw
   */
  command(raw) {
    return this.#send('command', raw, raw, false);
  }

  /**
   * Send a pre-parsed input object.
   * @param {import('../../app/parse.js').ParsedInput} parsed
   */
  handle(parsed) {
    return this.#send('handle', parsed);
  }

  /**
   * Resolve a pending disambiguation pick. The result is broadcast.
   * @param {string} raw
   */
  resolvePick(raw) {
    return this.#send('resolvePick', raw, raw, true);
  }

  /**
   * Get a lightweight Game-like adapter built from the worker's serialized state.
   * @returns {Promise<{ board: Function, getMoves: Function, getMoveSequence: Function, player: number }>}
   */
  async getGame() {
    const state = await this.#send('getState');
    return createGameAdapter(state);
  }

  /**
   * Get the serialized engine state.
   * @returns {Promise<import('../../app/Engine.js').EngineState>}
   */
  getState() {
    return /** @type {Promise<import('../../app/Engine.js').EngineState>} */ (this.#send('getState'));
  }

  /**
   * Start a fresh game.
   */
  newGame() {
    return this.#send('newGame');
  }

  /**
   * Terminate the worker.
   */
  terminate() {
    this.worker.terminate();
  }
}
