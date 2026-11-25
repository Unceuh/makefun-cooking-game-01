// The screenshot autopilot: the same rules a player follows, written as one function the
// screenshot scenes and the play-test harness both use. It picks the order the plate is closest
// to finishing, then serves a finished plate, takes cooked skewers off the grill, sauces the
// plate, loads the tray, or chases the lowest falling skewer the order still needs.
import { FIELD, RECIPES, STATIONS } from './config.js';
import { plateCanStillMatch, plateMatchesOrder, stationAt } from './world.js';

/** The x-centre of a station, where the cook stands to use it. */
function stationCentre(name) {
  const box = STATIONS[name];
  return (box.x0 + box.x1) / 2;
}

/** -1, 0 or 1: which way the cook walks to reach `targetX`. */
function steer(state, targetX) {
  const centre = state.cook.x + state.cook.width / 2;
  if (targetX > centre + 10) return 1;
  if (targetX < centre - 10) return -1;
  return 0;
}

/** The order the plate is closest to finishing (the first one, when the plate is empty). */
function targetOrder(state) {
  let best = null;
  let bestScore = -1;
  for (const order of state.orders) {
    const recipe = RECIPES[order.recipeIndex];
    const have = state.plate.skewers.slice();
    let score = 0;
    for (const kind of recipe.skewers) {
      const at = have.indexOf(kind);
      if (at >= 0) {
        have.splice(at, 1);
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = order;
    }
  }
  return best;
}

/** The skewer kinds the target order still needs, beyond what the plate already holds. */
function stillNeeded(state, order) {
  if (order === null) return [];
  const recipe = RECIPES[order.recipeIndex];
  const have = state.plate.skewers.slice();
  const need = [];
  for (const kind of recipe.skewers) {
    const at = have.indexOf(kind);
    if (at >= 0) have.splice(at, 1);
    else need.push(kind);
  }
  return need;
}

export function autopilot(state) {
  const centre = state.cook.x + state.cook.width / 2;
  const plate = state.plate;

  // A finished plate goes to the serve window at once.
  for (const order of state.orders) {
    if (plateMatchesOrder(plate, order)) {
      const target = stationCentre('serve');
      return { direction: steer(state, target), interact: stationAt(centre) === 'serve' };
    }
  }

  const order = targetOrder(state);
  const need = stillNeeded(state, order);

  // A plate no order can ever match is dumped at the serve window.
  if (plate.skewers.length > 0 && !plateCanStillMatch(plate, state.orders)) {
    const target = stationCentre('serve');
    return { direction: steer(state, target), interact: stationAt(centre) === 'serve' };
  }
  // Cooked skewers the order still needs come off the grill before they burn.
  const cookedNeeded = state.grill.some(
    (slot) => slot !== null && slot.progress >= 1 && !slot.burnt && need.includes(slot.kind),
  );
  if (cookedNeeded) {
    const target = stationCentre('grill');
    return { direction: steer(state, target), interact: stationAt(centre) === 'grill' };
  }
  // A plated dish gets its peanut sauce.
  if (plate.skewers.length > 0 && !plate.sauce) {
    const target = stationCentre('sauce');
    return { direction: steer(state, target), interact: stationAt(centre) === 'sauce' };
  }
  // A tray holding a needed skewer goes straight onto the grill.
  if (state.tray.some((kind) => need.includes(kind)) && state.grill.some((slot) => slot === null)) {
    const target = stationCentre('grill');
    return { direction: steer(state, target), interact: stationAt(centre) === 'grill' };
  }
  // Otherwise chase the lowest falling skewer the order still needs.
  let lowest = null;
  for (const item of state.falling) {
    if (!item.active) continue;
    if (need.length > 0 && !need.includes(item.kind)) continue;
    if (lowest === null || item.y > lowest.y) lowest = item;
  }
  if (lowest !== null) return { direction: steer(state, lowest.x + lowest.width / 2), interact: false };
  return { direction: steer(state, FIELD.width / 2), interact: false };
}
