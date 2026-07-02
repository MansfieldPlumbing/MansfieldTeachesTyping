/* Music manager — the game's `bg`. Plays the chiptune instantly (zero latency,
   works offline), and the moment the real soundfont band has loaded its
   instruments it takes over and the chiptune bows out. If the band can't load
   (offline / CDN blocked), the chiptune just keeps playing. Same tiny interface
   the app already used: play(index) / stop() / setMuted(m). */

import { Chiptune } from './chiptune.js';
import { WavetableBand } from './wavetable.js';

// which band loop backs each level (by flat lesson index) — a different vibe
// as you climb. Typing Hero passes a genre name straight through instead.
const GENRE_BY_LEVEL = ['rock', 'punk', 'surf', 'rock', 'ska', 'funk', 'synthwave', 'metal', 'rock', 'chill', 'chill', 'rock'];

export class MusicEngine {
  constructor() {
    this.chip = new Chiptune();
    this.band = new WavetableBand();
    this.muted = false;
    this.token = 0;
  }

  // sel is a level index (number -> GENRE_BY_LEVEL) or a genre name (string)
  play(sel = 0) {
    const my = ++this.token;
    const genre = typeof sel === 'string' ? sel : (GENRE_BY_LEVEL[sel] || 'rock');
    const chipIdx = typeof sel === 'number' ? sel : 3;
    this.chip.play(chipIdx); // instant
    // real band lazy-loads; swap the chiptune out once it's audible (if this
    // request is still the current one)
    this.band.play(genre, () => { if (my === this.token) this.chip.stop(); });
  }

  stop() {
    this.token++;
    this.chip.stop();
    this.band.stop();
  }

  setMuted(m) {
    this.muted = m;
    this.chip.setMuted(m);
    this.band.setMuted(m);
  }
}

export const bg = new MusicEngine();
