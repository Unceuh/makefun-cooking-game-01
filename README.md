[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Unceuh/makefun-cooking-game-01/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Unceuh/makefun-cooking-game-01/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

# Sate Kilat — warung sate cepat saji

A complete, original cooking game for make.fun's "Make the best cooking game" bounty. It runs
offline in a desktop browser from its own static files, played with keyboard and mouse.

You run a lightning-fast satay stall for one day (two minutes). Skewers of chicken, beef and
tofu fall from the top shelf — catch them in your tray, load them onto the charcoal grill, take
them off when they are cooked (before they burn), drizzle peanut sauce on the plate, and serve
the finished dish to the order board before the customer's timer runs out. A served order pays
its price plus a tip for the time left; an expired order costs a life. Three lives, then the day
is over — serve as many orders as you can.

## How to play

- Move: `←` `→` or `A` `D` (mouse click also starts / uses a station)
- Use a station: `Space` — stand at the sauce pot, the grill, or the serve table
- Pause: `P` or `Esc`

Stations, left to right: **Saus Kacang** (peanut sauce), **Panggangan** (charcoal grill),
**Meja Saji** (serve table). The ingredient bowls on the counter show what falls from the shelf.

## Play it

Serve `game/` with any static server and open `game/index.html`, for example:

```sh
node serve.ts        # from the kit, or: python3 -m http.server -d game
```

No build step, no libraries, no network requests. Screenshots are staged renders of the game's
own code (`?shot=start|play|end&seed=1`).

## Files

- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the vendored `vendor/makefun-game.ts`
- `game/index.html` + `game/src/` — the game, one file per job: `config` (tuning, recipes,
  stations), `world` (rules and state), `pilot` (screenshot autopilot), `input`, `render`,
  `shots` (staged scenes), `main` (boot and loop), `random` (seeded RNG)
- `screenshots/` — three staged renders of the game itself
