// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Flat
// vector art, canvas text for the HUD and the panels. The stall reads at a glance: the order
// board up top, the sauce pot, the grill and the serve table, the ingredient bowls on the
// counter, and the cook with the tray. Text that holds a number is rebuilt only when the number
// changes, so a frame allocates nothing.
import { FIELD, FONT, GRILL, LIVES, MENU, PALETTE, RECIPES, STATIONS } from './config.js';
import { stationAt } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 620, top: 120, line: 34, bottom: 76 };
const HEART = 22;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function mmss(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Skor ');
  const servedLabel = cachedLabel('Tersaji ');
  const bestLabel = cachedLabel('Terbaik ');
  const finalLabel = cachedLabel('Skor ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  /** One satay skewer: a bamboo stick with three cubes of the meat's colour. */
  function drawSkewer(x, y, kind, size, vertical) {
    const menu = MENU[kind];
    const s = size / 34;
    context.save();
    context.translate(x, y);
    if (vertical) context.rotate(Math.PI / 2);
    context.fillStyle = '#d8b98f';
    context.fillRect(-size * 0.55, -2 * s, size * 1.1, 4 * s);
    for (let cube = 0; cube < 3; cube += 1) {
      context.fillStyle = menu.color;
      context.fillRect(-size * 0.32 + cube * size * 0.24, -8 * s, size * 0.2, 16 * s);
      context.fillStyle = menu.dark;
      context.fillRect(-size * 0.32 + cube * size * 0.24, 4 * s, size * 0.2, 4 * s);
    }
    context.restore();
  }

  function drawHeart(x, y, size, filled) {
    context.fillStyle = filled ? PALETTE.heart : PALETTE.panelEdge;
    context.beginPath();
    context.moveTo(x, y + size * 0.35);
    context.bezierCurveTo(x - size * 0.6, y - size * 0.25, x - size * 0.25, y - size * 0.7, x, y - size * 0.2);
    context.bezierCurveTo(x + size * 0.25, y - size * 0.7, x + size * 0.6, y - size * 0.25, x, y + size * 0.35);
    context.fill();
  }

  function drawOrderCard(order, x, y, w, h) {
    const recipe = RECIPES[order.recipeIndex];
    const frac = Math.max(0, order.timeLeft / order.total);
    context.fillStyle = PALETTE.orderCard;
    roundRect(x, y, w, h, 10);
    context.fill();
    context.fillStyle = PALETTE.orderText;
    context.font = `bold 20px ${FONT}`;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(recipe.name, x + 12, y + 28);
    let iconX = x + 12;
    for (const kind of recipe.skewers) {
      drawSkewer(iconX + 17, y + 52, kind, 30, false);
      iconX += 42;
    }
    if (recipe.sauce) {
      context.fillStyle = PALETTE.sauce;
      context.beginPath();
      context.arc(iconX + 12, y + 52, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.orderText;
      context.font = `12px ${FONT}`;
      context.fillText('saus', iconX + 26, y + 56);
    }
    context.fillStyle = '#e8e0cc';
    context.fillRect(x + 12, y + h - 16, w - 24, 6);
    context.fillStyle = frac > 0.5 ? PALETTE.timerGood : frac > 0.25 ? PALETTE.timerWarn : PALETTE.timerBad;
    context.fillRect(x + 12, y + h - 16, (w - 24) * frac, 6);
  }

  function drawKitchen(state) {
    // Wall, awning stripes, floor.
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 560);
    context.fillStyle = PALETTE.wallStripe;
    for (let stripe = 0; stripe < 8; stripe += 1) {
      context.fillRect(stripe * 160, 0, 80, 14);
    }
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 600, FIELD.width, FIELD.height - 600);
    context.fillStyle = PALETTE.counter;
    context.fillRect(0, 560, FIELD.width, 40);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(0, 560, FIELD.width, 8);

    // Ingredient bowls on the counter, between the sauce pot and the grill.
    const bowls = [
      { kind: 'chicken', x: 330 },
      { kind: 'beef', x: 378 },
      { kind: 'tofu', x: 426 },
    ];
    for (const bowl of bowls) {
      context.fillStyle = '#e8e4da';
      context.beginPath();
      context.arc(bowl.x, 548, 20, 0, Math.PI);
      context.fill();
      context.fillStyle = MENU[bowl.kind].color;
      context.beginPath();
      context.arc(bowl.x - 7, 544, 7, 0, Math.PI * 2);
      context.arc(bowl.x + 7, 544, 7, 0, Math.PI * 2);
      context.fill();
      text(MENU[bowl.kind].name, bowl.x, 592, 15, PALETTE.muted, 'center');
    }

    // Sauce pot (left station).
    const sauce = STATIONS.sauce;
    context.fillStyle = '#3a3a3a';
    context.fillRect(sauce.x0 + 30, 500, 110, 60);
    context.fillStyle = PALETTE.sauce;
    context.beginPath();
    context.ellipse(sauce.x0 + 85, 502, 55, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#d8b98f';
    context.fillRect(sauce.x0 + 130, 470, 6, 40);
    context.save();
    context.globalAlpha = 0.5;
    context.strokeStyle = '#fff3e0';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(sauce.x0 + 70, 480);
    context.quadraticCurveTo(sauce.x0 + 60, 460, sauce.x0 + 72, 444);
    context.moveTo(sauce.x0 + 100, 480);
    context.quadraticCurveTo(sauce.x0 + 110, 462, sauce.x0 + 98, 446);
    context.stroke();
    context.restore();
    text(sauce.label, (sauce.x0 + sauce.x1) / 2, 592, 15, PALETTE.muted, 'center');

    // Grill (centre station): charcoal bed, embers, three skewer slots.
    const grill = STATIONS.grill;
    context.fillStyle = PALETTE.grill;
    roundRect(grill.x0, 470, grill.x1 - grill.x0, 90, 8);
    context.fill();
    for (let ember = 0; ember < 14; ember += 1) {
      context.fillStyle = ember % 3 === 0 ? PALETTE.ember : PALETTE.charcoal;
      context.beginPath();
      context.arc(grill.x0 + 24 + ember * 24, 500 + (ember % 2) * 14, 6, 0, Math.PI * 2);
      context.fill();
    }
    for (let slot = 0; slot < state.grill.length; slot += 1) {
      const item = state.grill[slot];
      const cx = grill.x0 + 90 + slot * 110;
      if (item === null) {
        context.strokeStyle = '#5a5a5a';
        context.lineWidth = 2;
        context.strokeRect(cx - 44, 448, 88, 10);
        continue;
      }
      drawSkewer(cx, 452, item.kind, 76, false);
      const frac = Math.min(1, item.progress);
      context.fillStyle = '#3a3a3a';
      context.fillRect(cx - 44, 428, 88, 8);
      context.fillStyle = item.burnt ? '#111111' : frac >= 1 ? PALETTE.timerGood : PALETTE.ember;
      context.fillRect(cx - 44, 428, 88 * frac, 8);
      if (item.burnt) text('GOSONG', cx, 420, 13, PALETTE.timerBad, 'center');
      else if (frac >= 1) text('MATANG!', cx, 420, 13, PALETTE.timerGood, 'center');
    }
    text(grill.label, (grill.x0 + grill.x1) / 2, 592, 15, PALETTE.muted, 'center');

    // Serve table (right station): table, bell, and the plate being built.
    const serve = STATIONS.serve;
    context.fillStyle = '#6b4a26';
    context.fillRect(serve.x0 + 20, 500, 150, 60);
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(serve.x0 + 95, 496, 62, 14, 0, 0, Math.PI * 2);
    context.fill();
    const plate = state.plate;
    let plateX = serve.x0 + 62;
    for (const kind of plate.skewers) {
      drawSkewer(plateX + 16, 492, kind, 30, false);
      plateX += 30;
    }
    if (plate.sauce) {
      context.strokeStyle = PALETTE.sauce;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(serve.x0 + 50, 500);
      context.quadraticCurveTo(serve.x0 + 95, 492, serve.x0 + 140, 500);
      context.stroke();
    }
    context.fillStyle = '#f2c94c';
    context.beginPath();
    context.arc(serve.x0 + 168, 486, 12, Math.PI, 0);
    context.fill();
    context.fillRect(serve.x0 + 162, 486, 12, 4);
    text(serve.label, (serve.x0 + serve.x1) / 2, 592, 15, PALETTE.muted, 'center');

    // Falling skewers from the top shelf.
    for (const item of state.falling) {
      if (!item.active) continue;
      drawSkewer(item.x + item.width / 2, item.y + item.height / 2, item.kind, 34, false);
    }

    // Station hint: glow the station the cook stands at.
    const centre = state.cook.x + state.cook.width / 2;
    const station = stationAt(centre);
    if (station) {
      const box = STATIONS[station];
      context.strokeStyle = PALETTE.coin;
      context.lineWidth = 3;
      context.strokeRect(box.x0, 420, box.x1 - box.x0, 140);
      text('SPASI', (box.x0 + box.x1) / 2, 410, 18, PALETTE.coin, 'center');
    }
  }

  function drawCook(state) {
    const cook = state.cook;
    const x = cook.x;
    const y = cook.y;
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.beginPath();
    context.ellipse(x + cook.width / 2, FIELD.groundY + 6, 34, 8, 0, 0, Math.PI * 2);
    context.fill();
    // Legs, apron, shirt, head, chef hat.
    context.fillStyle = '#3a2a1c';
    context.fillRect(x + 14, y + 62, 14, 22);
    context.fillRect(x + 36, y + 62, 14, 22);
    context.fillStyle = PALETTE.cookApron;
    context.fillRect(x + 10, y + 34, 44, 34);
    context.fillStyle = PALETTE.cookShirt;
    context.fillRect(x + 8, y + 28, 48, 14);
    context.fillStyle = PALETTE.cookSkin;
    context.beginPath();
    context.arc(x + 32, y + 16, 14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.cookHat;
    context.beginPath();
    context.arc(x + 20, y + 4, 10, 0, Math.PI * 2);
    context.arc(x + 32, y + 0, 12, 0, Math.PI * 2);
    context.arc(x + 44, y + 4, 10, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x + 18, y + 2, 28, 6);
    // The tray: raw skewers carried above the head.
    let trayX = x + 6;
    for (const kind of state.tray) {
      drawSkewer(trayX + 8, y - 14, kind, 26, false);
      trayX += 18;
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), FIELD.width - 24, 20, 28, PALETTE.text, 'right');
    text(servedLabel(state.served), FIELD.width - 24, 52, 20, PALETTE.muted, 'right');
    const firstHeart = FIELD.width - 24 - LIVES * (HEART + 8) + 8;
    for (let life = 0; life < LIVES; life += 1) drawHeart(firstHeart + life * (HEART + 8) + 10, 100, HEART, life < state.lives);
    // Day timer, top centre-right (clear of the order board on the left).
    const timerX = 880;
    const dayText = `HARI 1 · ${mmss(state.dayLeft)}`;
    text(dayText, timerX, 20, 30, PALETTE.text, 'center');
    const barW = 260;
    const barX = timerX - barW / 2;
    const frac = Math.max(0, state.dayLeft / 120);
    context.fillStyle = '#3a3a3a';
    context.fillRect(barX, 56, barW, 10);
    context.fillStyle = frac > 0.4 ? PALETTE.timerGood : frac > 0.16 ? PALETTE.timerWarn : PALETTE.timerBad;
    context.fillRect(barX, 56, barW * frac, 10);
    text(`Level ${state.level}`, timerX, 88, 16, PALETTE.muted, 'center');
    // Tray count, bottom left.
    text(`Nampan ${state.tray.length}/${3}`, 24, FIELD.height - 40, 20, PALETTE.muted, 'left');
    if (state.flashTime > 0 && state.flash) {
      const w = context.measureText(state.flash).width + 40;
      context.fillStyle = 'rgba(0,0,0,0.65)';
      roundRect((FIELD.width - w) / 2, FIELD.height - 84, w, 36, 18);
      context.fill();
      text(state.flash, FIELD.width / 2, FIELD.height - 58, 20, PALETTE.text, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, PANEL.width, height, 12);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 23, PALETTE.coin, 'center');
    return { x, y, height };
  }

  const TITLE_LINES = [
    'Tangkap tusuk sate yang jatuh dari rak.',
    'Panggang, beri saus kacang, sajikan sebelum pelanggan pergi.',
    'Gerak: ← → atau A D · Aksi: Spasi · Jeda: P',
    '',
  ];

  /** A banner across the wall for the title screen: it leaves the kitchen visible below it. */
  function drawBanner(title, lines, prompt) {
    const x = 280;
    const y = 116;
    const height = 58 + lines.length * 28 + 46;
    context.fillStyle = 'rgba(43, 29, 18, 0.92)';
    roundRect(x, y, 720, height, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, 720, height, 12);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 52, 44, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 86 + index * 28, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 16, 22, PALETTE.coin, 'center');
  }
  const PAUSED_LINES = ['Satenya menunggu di panggangan.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(state);
    drawCook(state);
    if (screen === SCREEN_TITLE) {
      // The order board, full of customers, is part of the title view.
      let cardX = 16;
      for (const order of state.orders) {
        drawOrderCard(order, cardX, 16, 200, 92);
        cardX += 212;
      }
      TITLE_LINES[3] = bestLabel(best);
      drawBanner('SATE KILAT', TITLE_LINES, 'Tekan Spasi atau klik untuk mulai');
      return;
    }
    // Order board on the wall.
    let cardX = 16;
    for (const order of state.orders) {
      drawOrderCard(order, cardX, 16, 200, 92);
      cardX += 212;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Jeda', PAUSED_LINES, 'Tekan P untuk lanjut');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = servedLabel(state.served);
      OVER_LINES[1] = finalLabel(state.score);
      OVER_LINES[2] = bestLabel(best);
      const panel = drawPanel('Hari Selesai!', OVER_LINES, 'Tekan Spasi atau klik untuk main lagi');
      // A plated dish by the serve table: the stall's signature, ready to serve.
      const plateY = panel.y + panel.height + 46;
      const plateX = 1050;
      context.fillStyle = PALETTE.plate;
      context.beginPath();
      context.ellipse(plateX, plateY, 90, 20, 0, 0, Math.PI * 2);
      context.fill();
      drawSkewer(plateX - 30, plateY - 4, 'chicken', 46, false);
      drawSkewer(plateX + 30, plateY - 4, 'beef', 46, false);
      context.strokeStyle = PALETTE.sauce;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(plateX - 60, plateY + 6);
      context.quadraticCurveTo(plateX, plateY - 2, plateX + 60, plateY + 6);
      context.stroke();
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
