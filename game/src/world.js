// The game's rules and state, with no drawing and no browser in it: the cook, the falling
// skewers, the grill, the sauce pot, the plate, the order board, the day timer, score and lives.
// step() advances one fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound. Nothing here allocates after createWorld
// returns, except the short order and tray arrays, which are reused by clearing in place.
import {
  COOK, DAY_SECONDS, FALL, FIELD, GRILL, KINDS, LEVEL, LIVES, ORDER, POOL_SIZE, RECIPES,
  STATIONS, TRAY_MAX,
} from './config.js';

export const EVENT_CAUGHT = 1;
export const EVENT_SERVED = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_OVER = 8;
export const EVENT_GRILL = 16;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function sortedKinds(kinds) {
  return kinds.slice().sort().join(',');
}

/** The station whose x-range holds the cook's centre, or null between stations. */
export function stationAt(x) {
  if (x >= STATIONS.sauce.x0 && x <= STATIONS.sauce.x1) return 'sauce';
  if (x >= STATIONS.grill.x0 && x <= STATIONS.grill.x1) return 'grill';
  if (x >= STATIONS.serve.x0 && x <= STATIONS.serve.x1) return 'serve';
  return null;
}

/** Does the plate hold exactly what this order asks for? */
export function plateMatchesOrder(plate, order) {
  const recipe = RECIPES[order.recipeIndex];
  return sortedKinds(plate.skewers) === sortedKinds(recipe.skewers) && plate.sauce === recipe.sauce;
}

/** Could this plate still become some open order, by adding skewers or sauce? */
export function plateCanStillMatch(plate, orders) {
  for (const order of orders) {
    const recipe = RECIPES[order.recipeIndex];
    if (plate.sauce && !recipe.sauce) continue;
    const remaining = recipe.skewers.slice();
    let fits = true;
    for (const kind of plate.skewers) {
      const at = remaining.indexOf(kind);
      if (at < 0) { fits = false; break; }
      remaining.splice(at, 1);
    }
    if (fits) return true;
  }
  return false;
}

export function createWorld(random) {
  const cook = { x: 0, y: FIELD.groundY - COOK.height, width: COOK.width, height: COOK.height };
  const tray = [];
  const grill = [];
  for (let index = 0; index < GRILL.slots; index += 1) grill.push(null);
  const plate = { skewers: [], sauce: false };
  const orders = [];
  const falling = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    falling.push({ active: false, kind: KINDS[0], x: 0, y: 0, width: 34, height: 34, speed: 0 });
  }
  const state = {
    cook, tray, grill, plate, orders, falling,
    score: 0, lives: LIVES, served: 0, level: 1, elapsed: 0,
    dayLeft: DAY_SECONDS, fallTimer: 0, orderTimer: 0, orderId: 0,
    flash: '', flashTime: 0, prevInteract: false,
  };

  function reset() {
    cook.x = (FIELD.width - cook.width) / 2;
    tray.length = 0;
    for (let index = 0; index < grill.length; index += 1) grill[index] = null;
    plate.skewers.length = 0;
    plate.sauce = false;
    orders.length = 0;
    for (const item of falling) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.served = 0;
    state.level = 1;
    state.elapsed = 0;
    state.dayLeft = DAY_SECONDS;
    state.fallTimer = 0.8;
    state.orderTimer = 1.2;
    state.orderId = 0;
    state.flash = '';
    state.flashTime = 0;
    state.prevInteract = false;
    spawnOrder();
    spawnOrder();
  }

  function spawnOrder() {
    if (orders.length >= ORDER.maxActive) return;
    const recipeIndex = Math.floor(random() * RECIPES.length);
    orders.push({
      id: state.orderId,
      recipeIndex,
      timeLeft: ORDER.waitSeconds,
      total: ORDER.waitSeconds,
    });
    state.orderId += 1;
  }

  function spawnFalling() {
    for (let index = 0; index < falling.length; index += 1) {
      const item = falling[index];
      if (item.active) continue;
      item.active = true;
      item.kind = KINDS[Math.floor(random() * KINDS.length)];
      item.x = 60 + random() * (FIELD.width - 120);
      item.y = -item.height;
      item.speed = FALL.speed + FALL.speedPerLevel * (state.level - 1);
      return;
    }
  }

  function flash(message) {
    state.flash = message;
    state.flashTime = 1.6;
  }

  function freeGrillSlot() {
    for (let index = 0; index < grill.length; index += 1) if (grill[index] === null) return index;
    return -1;
  }

  function grillHasCooked() {
    for (let index = 0; index < grill.length; index += 1) {
      const slot = grill[index];
      if (slot !== null && slot.progress >= 1 && !slot.burnt) return true;
    }
    return false;
  }

  /** Use the station the cook stands at. Only the press itself counts, not holding the key. */
  function interact() {
    const centre = cook.x + cook.width / 2;
    const station = stationAt(centre);
    if (station === 'sauce') {
      if (plate.skewers.length === 0) { flash('Piring masih kosong'); return 0; }
      if (plate.sauce) { flash('Saus sudah ada'); return 0; }
      plate.sauce = true;
      return EVENT_GRILL;
    }
    if (station === 'grill') {
      // One press collects what is cooked, throws away what burned, and leaves the rest cooking.
      let took = 0;
      let tossed = 0;
      for (let index = 0; index < grill.length; index += 1) {
        const slot = grill[index];
        if (slot === null) continue;
        if (slot.progress >= 1 && !slot.burnt) {
          plate.skewers.push(slot.kind);
          grill[index] = null;
          took += 1;
        } else if (slot.burnt) {
          grill[index] = null;
          tossed += 1;
        }
      }
      if (took > 0 || tossed > 0) {
        if (took === 0) flash('Sate gosong dibuang');
        return EVENT_GRILL;
      }
      if (tray.length === 0) { flash('Bawa tusuk sate dulu'); return 0; }
      let loaded = 0;
      while (tray.length > 0) {
        const slot = freeGrillSlot();
        if (slot === -1) break;
        grill[slot] = { kind: tray.shift(), progress: 0, burnt: false };
        loaded += 1;
      }
      if (loaded > 0) return EVENT_GRILL;
      flash('Panggangan penuh');
      return 0;
    }
    if (station === 'serve') {
      if (plate.skewers.length === 0) { flash('Piring masih kosong'); return 0; }
      for (let index = 0; index < orders.length; index += 1) {
        if (plateMatchesOrder(plate, orders[index])) {
          const recipe = RECIPES[orders[index].recipeIndex];
          const tip = Math.max(0, Math.round(orders[index].timeLeft));
          state.score += recipe.price + tip;
          state.served += 1;
          orders.splice(index, 1);
          plate.skewers.length = 0;
          plate.sauce = false;
          return EVENT_SERVED;
        }
      }
      if (plateCanStillMatch(plate, orders)) {
        flash('Belum cocok dengan pesanan');
        return 0;
      }
      // A plate no order can ever match is dumped, so the stall can start the next dish.
      plate.skewers.length = 0;
      plate.sauce = false;
      flash('Piring dikosongkan, mulai lagi');
      return 0;
    }
    flash('Dekati stasiun: saus, panggangan, atau meja saji');
    return 0;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right). `interactPressed` is the
   * Space/click press for this step. With `harmless` set (the title screen's backdrop) skewers
   * fall but nothing is caught, no order waits and the day never ends.
   */
  function step(dt, direction, interactPressed, harmless) {
    let events = 0;
    if (state.flashTime > 0) state.flashTime = Math.max(0, state.flashTime - dt);
    cook.x = Math.min(FIELD.width - cook.width, Math.max(0, cook.x + direction * COOK.speed * dt));

    const pressed = interactPressed && !state.prevInteract;
    state.prevInteract = interactPressed;

    state.fallTimer -= dt;
    if (state.fallTimer <= 0) {
      spawnFalling();
      const interval = Math.max(FALL.minInterval, FALL.interval * 0.88 ** (state.level - 1));
      state.fallTimer += interval + random() * FALL.intervalJitter;
    }
    for (let index = 0; index < falling.length; index += 1) {
      const item = falling[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      if (item.y > FIELD.groundY + 40) { item.active = false; continue; }
      if (harmless || !overlaps(item, cook)) continue;
      item.active = false;
      if (tray.length < TRAY_MAX) {
        tray.push(item.kind);
        events |= EVENT_CAUGHT;
      }
    }

    if (harmless) return events;

    state.elapsed += dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    state.dayLeft -= dt;

    for (let index = 0; index < grill.length; index += 1) {
      const slot = grill[index];
      if (slot === null) continue;
      slot.progress += dt / GRILL.cookSeconds;
      if (!slot.burnt && slot.progress >= GRILL.burnSeconds / GRILL.cookSeconds) slot.burnt = true;
    }

    state.orderTimer -= dt;
    if (state.orderTimer <= 0) {
      spawnOrder();
      state.orderTimer = ORDER.spawnInterval;
    }
    for (let index = orders.length - 1; index >= 0; index -= 1) {
      orders[index].timeLeft -= dt;
      if (orders[index].timeLeft <= 0) {
        orders.splice(index, 1);
        state.lives -= 1;
        events |= EVENT_EXPIRED;
        if (state.lives <= 0) {
          events |= EVENT_OVER;
          return events;
        }
      }
    }

    if (pressed) events |= interact();
    if (state.dayLeft <= 0) events |= EVENT_OVER;
    return events;
  }

  reset();
  return { state, reset, step, grillHasCooked };
}
