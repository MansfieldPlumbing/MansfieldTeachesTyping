# Soundtrack

The game ships with **homespun Web Audio oscillator SFX** (strum, jump, boop, block,
coin, stomp, win, etc.) baked into `js/audio.js` — no files needed for those.

For background **music**, this folder streams whatever is listed in `manifest.json`.

## Adding tracks

1. Drop an audio file here, e.g. `assets/music/pipe-dreams.mp3`.
2. Add it to `manifest.json`:

   ```json
   {
     "tracks": [
       { "title": "Pipe Dreams", "artist": "NEFFEX", "src": "pipe-dreams.mp3" }
     ]
   }
   ```

The player loops the list and respects the global mute toggle.

## Licensing — read this

Only add tracks that are **cleared for use**. Good sources:

- **NEFFEX** — many releases are explicitly "free to use" (credit required). Verify per-track.
- **YouTube Audio Library**, **Free Music Archive** (check the specific license), **Incompetech** (CC-BY).

Record the license + a link for every track in a `CREDITS.md` next to this file.
Do **not** commit copyrighted music without a license.
