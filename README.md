# Mansfield Teaches Typing

A love letter to **Mario Teaches Typing** (Interplay, 1992). Help **Mansfield** —
a plumber in a green cap and blue overalls — fix the pipes one key at a time.

It is **vanilla HTML / CSS / JS**. No React, no Vite, no build step. Open it on a
static server and it runs. The whole telos: build something a kid would *want* to
use instead of the DOS original — which means encouraging feedback (Charles
Martinet refused to read the mean voice lines, so we don't either), instant
restart, juicy hits, and a ghost to race.

## Run it

```bash
npm run dev            # python3 -m http.server 3000
# then open http://localhost:3000
```

Any static server works (`npx serve`, `python3 -m http.server`, etc). ES modules
need HTTP — opening `index.html` from `file://` will not load the modules.

## Modes

| # | Mode | What it is |
|---|------|------------|
| 01 | **Adventure** | The MTT homage. Mansfield runs the pipe; type each brick (a letter) or clog-creature (a word) to smash through. A translucent **ghost** races you — *Par* at the lesson's goal WPM, plus your **personal best**. Stay ahead of Par to pass. |
| 02 | **Mansfield Hero** | Guitar Hero, but really Space Invaders. Words fall toward the **fret** — type them before they leak. Every correct key rings the next note of a pentatonic run, so good typing makes music. |
| 03 | **Focus** | No game. Just the words, a live caret, and honest numbers. The grown-up, business-casual loop, styled calm like [art4quinn](https://github.com/MansfieldPlumbing/art4quinn). |

Shared by all three: a **glassmorphic on-screen keyboard** that lights the next
key and names the finger (MTT's teaching aid, modernised). On phones it *is* the
input — tap to type, so the native keyboard never covers the screen.

## Structure

```
index.html            entry — loads styles/app.css + js/main.js
styles/app.css        the whole design system (art4quinn-derived, light/dark)
js/
  main.js             app shell + router (landing → mode → lesson → play → results)
  lessons.js          lesson data (home row → reaches → words → sentences)
  audio.js            Web Audio SFX (strum/jump/boop/block…) + soundtrack manager
  finger.js           which hand & finger types each key
  keyboard.js         glassmorphic on-screen keyboard
  sprite.js           Mansfield, a 16×16 pixel plumber, drawn to canvas
  engine.js           shared typing brain (WPM / accuracy / streak)
  ghost.js            ghost record/replay + benchmark "plumber" pace ghosts
  ui.js               shared stage / HUD / toast / results helpers
  modes/
    scroller.js       01 Adventure
    hero.js           02 Mansfield Hero
    focus.js          03 Focus
assets/music/         drop copyright-free tracks here (see its README)
tests/                node logic tests + a Playwright browser smoke test
```

## Tests

```bash
npm test               # pure-logic unit tests (no deps)
npm run test:browser   # headless click-through (needs: npm i playwright && npx playwright install chromium)
```

## Credits & lineage

Built in the spirit of the 1992 original by Brian Fargo's Interplay (produced by
Thomas Decker; music by George "The Fat Man" Sanger). The ghost car is a nod to
*The Wizard* (1989), Nitrotype, and every time-trial you've ever raced.

Post-1.0 ideas: a 3D arcade-driving mode (art4quinn already vendors three.js), a
real online top-5 leaderboard, and MediaPipe hand-tracking.
