// Every tuning number, colour and recipe in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule depends on the screen size.
// "Sate Kilat" — a lightning-fast satay stall: catch skewers, grill them, sauce them, serve.
export const FIELD = { width: 1280, height: 720, groundY: 620, counterY: 560 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One working day lasts this long; when it ends the day summary appears. */
export const DAY_SECONDS = 120;

export const COOK = {
  width: 64,
  height: 84,
  speed: 520,
};

export const LIVES = 3;

/** Falling skewers: what drops from the top shelf, how fast, how often. */
export const FALL = {
  speed: 210,
  speedPerLevel: 12,
  interval: 1.15,
  intervalJitter: 0.7,
  minInterval: 0.6,
};

/** Seconds a skewer needs on the grill, and when it burns. */
export const GRILL = { cookSeconds: 3.0, burnSeconds: 7.0, slots: 3 };

/** The tray the cook carries: raw skewers only, at most this many. */
export const TRAY_MAX = 3;

/** Orders: how long a customer waits, and how often a new one arrives. */
export const ORDER = { waitSeconds: 38, spawnInterval: 9, maxActive: 3 };

/** Seconds of play per level, and the last level: spawn rates stop growing there. */
export const LEVEL = { seconds: 30, max: 4 };

/** How many falling skewers can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 24;

/** Skewers on the menu: kind, Indonesian name, colour, what it looks like. */
export const MENU = {
  chicken: { name: 'Ayam', color: '#f2a65a', dark: '#c47b2e' },
  beef: { name: 'Sapi', color: '#d95f4b', dark: '#a63a2c' },
  tofu: { name: 'Tahu', color: '#f5ecd7', dark: '#cbb98f' },
};

export const KIND_CHICKEN = 'chicken';
export const KIND_BEEF = 'beef';
export const KIND_TOFU = 'tofu';
export const KINDS = [KIND_CHICKEN, KIND_BEEF, KIND_TOFU];

/** The order book: every dish the stall serves, as skewers plus peanut sauce. */
export const RECIPES = [
  { name: 'Sate Ayam', skewers: [KIND_CHICKEN], sauce: true, price: 50 },
  { name: 'Sate Sapi', skewers: [KIND_BEEF], sauce: true, price: 60 },
  { name: 'Sate Tahu', skewers: [KIND_TOFU], sauce: true, price: 40 },
  { name: 'Sate Ayam x2', skewers: [KIND_CHICKEN, KIND_CHICKEN], sauce: true, price: 90 },
  { name: 'Sate Campur', skewers: [KIND_CHICKEN, KIND_BEEF], sauce: true, price: 100 },
  { name: 'Paket Kilat', skewers: [KIND_CHICKEN, KIND_TOFU], sauce: true, price: 80 },
];

/** Stations along the counter, by x-range: sauce pot, grill, serve window. */
export const STATIONS = {
  sauce: { x0: 96, x1: 288, label: 'SAUS KACANG' },
  grill: { x0: 452, x1: 828, label: 'PANGGANGAN' },
  serve: { x0: 1000, x1: 1208, label: 'MEJA SAJI' },
};

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#3a2a1c',
  wallStripe: '#4a3624',
  floor: '#2c2118',
  counter: '#8a5a2b',
  counterTop: '#b07a3e',
  panel: '#2b1d12',
  panelEdge: '#6b4a26',
  text: '#fff3e0',
  muted: '#d8b98f',
  coin: '#f2c94c',
  grill: '#1c1c1c',
  charcoal: '#ff6b35',
  ember: '#ffb347',
  sauce: '#8a4b1d',
  plate: '#f5f0e6',
  orderCard: '#fdf6e3',
  orderText: '#3a2a1c',
  timerGood: '#7bc96f',
  timerWarn: '#f2c94c',
  timerBad: '#e5534b',
  heart: '#e5534b',
  cookSkin: '#f2c09a',
  cookShirt: '#e8e4da',
  cookApron: '#2e6b4f',
  cookHat: '#ffffff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sate-kilat.best';
