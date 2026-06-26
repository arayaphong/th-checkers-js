// Shared route geometry. A move stores only its waypoints — `from` plus each
// landing square — so consecutive entries can sit several diagonal cells apart
// (the captured piece for a pion, plus any empty squares a dame glides over).
// `expandRoute` fills those gaps in so every consecutive pair is adjacent,
// giving a continuous trail to print or highlight from source to destination.

import { Position } from '../../core/Position.js';

/**
 * @param {import('../../core/Position.js').Position[]} waypoints
 * @returns {import('../../core/Position.js').Position[]}
 */
export function expandRoute(waypoints) {
  if (waypoints.length === 0) return [];
  const cells = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i += 1) {
    const from = waypoints[i - 1];
    const to = waypoints[i];
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    const stepX = Math.sign(to.x - from.x);
    const stepY = Math.sign(to.y - from.y);
    for (let s = 1; s <= steps; s += 1) {
      cells.push(Position.fromCoords(from.x + stepX * s, from.y + stepY * s));
    }
  }
  return cells;
}
