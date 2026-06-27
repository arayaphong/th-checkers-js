import { Engine } from '../../app/Engine.js';
import { parseInput } from '../../app/parse.js';

const engine = new Engine();

/**
 * Post a response back to the main thread.
 * @param {number} id
 * @param {unknown} result
 * @param {string} [error]
 */
function respond(id, result, error) {
  self.postMessage({ id, result, error });
}

self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    let result;
    switch (type) {
      case 'command': {
        const raw = /** @type {string} */ (payload);
        result = engine.isPickingMove()
          ? engine.resolvePick(raw)
          : await engine.handle(parseInput(raw));
        break;
      }
      case 'handle': {
        const parsed = /** @type {import('../../app/parse.js').ParsedInput} */ (payload);
        result = await engine.handle(parsed);
        break;
      }
      case 'resolvePick': {
        const raw = /** @type {string} */ (payload);
        result = engine.resolvePick(raw);
        break;
      }
      case 'getState':
        result = engine.getState();
        break;
      case 'newGame':
        result = engine.newGame();
        break;
      default:
        throw new Error(`Unknown worker command: ${type}`);
    }
    respond(id, result);
  } catch (error) {
    respond(id, null, /** @type {Error} */ (error).message);
  }
};

// Signal that the worker has finished loading and is ready for commands.
self.postMessage({ type: 'ready' });
