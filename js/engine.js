/* The shared typing brain. Every mode tracks the same honest numbers:
   WPM, accuracy, streak. No mode reinvents counting. */

export class Metrics {
  constructor() {
    this.correct = 0;
    this.total = 0;
    this.errors = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.startedAt = null;
    this.endedAt = null;
  }
  start() { if (this.startedAt == null) this.startedAt = performance.now(); }
  hit() {
    this.start();
    this.correct++; this.total++; this.streak++;
    if (this.streak > this.maxStreak) this.maxStreak = this.streak;
  }
  miss() { this.start(); this.total++; this.errors++; this.streak = 0; }
  stop() { this.endedAt = performance.now(); }

  elapsedMs() { return (this.endedAt || performance.now()) - (this.startedAt || performance.now()); }
  /** standard 5-chars-per-word WPM, correct characters only */
  wpm() {
    const min = this.elapsedMs() / 60000;
    if (min <= 0) return 0;
    return Math.max(0, Math.round((this.correct / 5) / min));
  }
  accuracy() { return this.total === 0 ? 100 : Math.round((this.correct / this.total) * 100); }

  snapshot() {
    return { wpm: this.wpm(), accuracy: this.accuracy(), streak: this.streak,
             maxStreak: this.maxStreak, correct: this.correct, total: this.total, errors: this.errors };
  }
}

/** Linear typer for Focus mode: one long string, a moving cursor. */
export class LinearTyper {
  constructor(text) {
    this.text = text;
    this.i = 0;
    this.badAt = -1;     // index currently showing an error
    this.metrics = new Metrics();
  }
  get current() { return this.text[this.i]; }
  get done() { return this.i >= this.text.length; }

  type(ch) {
    if (this.done) return { finished: true };
    const expected = this.text[this.i];
    if (ch === expected) {
      this.metrics.hit();
      this.i++;
      this.badAt = -1;
      return { correct: true, expected, finished: this.done, advanced: true };
    }
    this.metrics.miss();
    this.badAt = this.i;
    return { correct: false, expected, finished: false, advanced: false };
  }
  backspace() {
    if (this.i > 0) { this.i--; this.badAt = -1; }
  }
}

/* ---- turning a lesson into typeable material ------------------------------ */

/** One long stream for Focus mode (patterns joined by a space). */
export function buildStream(lesson) {
  return lesson.patterns.join('   ');
}

/**
 * Discrete targets (entities) for the game modes.
 * granularity: 'char' (single key per target) or 'word' (whole token).
 * Returns an array of strings.
 */
export function buildTargets(lesson, granularity) {
  const tokens = [];
  for (const p of lesson.patterns) {
    for (const tok of p.split(/\s+/)) if (tok) tokens.push(tok);
  }
  if (granularity === 'char') {
    const chars = [];
    for (const t of tokens) for (const c of t) chars.push(c);
    return chars;
  }
  return tokens;
}

/** Pass condition mirrors MTT: meet the lesson WPM goal at >=80% accuracy. */
export function didPass(lesson, snap) {
  return snap.wpm >= lesson.minWpm && snap.accuracy >= 80;
}
