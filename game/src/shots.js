// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from
// a fresh world for a fixed number of steps, steered by the autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { autopilot } from './pilot.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, false, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = autopilot(world.state);
    if (world.step(STEP, move.direction, move.interact, false) & EVENT_OVER) break;
  }
  if (name === 'play') {
    // The play frame should show the grill at work: if it happens to be empty, load the tray
    // and let the skewers cook halfway, through the same steps a player would take.
    const state = world.state;
    const grillBusy = state.grill.some((slot) => slot !== null);
    if (!grillBusy && state.tray.length > 0) {
      const grillCentre = 640;
      for (let index = 0; index < 600; index += 1) {
        const centre = state.cook.x + state.cook.width / 2;
        const direction = grillCentre > centre + 10 ? 1 : grillCentre < centre - 10 ? -1 : 0;
        const inGrill = centre >= 452 && centre <= 828;
        world.step(STEP, direction, inGrill, false);
        if (state.grill.some((slot) => slot !== null)) break;
      }
      for (let index = 0; index < 90; index += 1) world.step(STEP, 0, false, false);
    }
  }
  const over = world.state.lives === 0 || world.state.dayLeft <= 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
