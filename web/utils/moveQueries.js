import { singleRoute } from '../../core/utils/routeUtils.js';

/**
 * Shared async legality queries against an engine or engine client.
 * Both Board and Shell can use these to avoid coupling to each other.
 */

/**
 * @param {import('../../cli/Engine.js').Engine | import('./EngineClient.js').EngineClient} engine
 * @returns {Promise<Set<string>>}
 */
export async function movableSquares(engine) {
  const game = await engine.getGame();
  return new Set(game.getMoves().map((move) => move.from.toString()));
}

/**
 * @param {import('../../cli/Engine.js').Engine | import('./EngineClient.js').EngineClient} engine
 * @param {string} notation
 * @returns {Promise<string[]>}
 */
export async function targetsFrom(engine, notation) {
  const game = await engine.getGame();
  return game.getMoves()
    .filter((move) => move.from.toString() === notation)
    .map((move) => move.to.toString());
}

/**
 * @param {import('../../cli/Engine.js').Engine | import('./EngineClient.js').EngineClient} engine
 * @param {string} from
 * @param {string} to
 * @returns {Promise<string[] | null>}
 */
export async function pathFor(engine, from, to) {
  const game = await engine.getGame();
  const route = singleRoute(game.getMoves(), from, to);
  return route ? route.map((pos) => pos.toString()) : null;
}
