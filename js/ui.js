/* Tiny shared UI helpers. No framework — just enough hyperscript and a couple
   of reusable pieces (the immersive stage, the humble HUD, encouraging toast,
   the quiet results screen) so each mode stays small. */

/** hyperscript: h('div', {class:'x', onclick:fn}, child, child) */
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return e;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/** Build the full-screen game stage. Returns the pieces a mode needs.
   HUD overlays the game across the top: a real Back button on the left, big
   horizontal stats, and a slot (top-right) for the keyboard's finger guide. */
export function mountStage(parent, { goalLabel = 'Goal', onExit } = {}) {
  const back = h('button', { class: 'btn-back-game', type: 'button', title: 'Back (Esc)', onclick: onExit },
    h('span', { class: 'arrow' }, '←'), 'Back');

  const stat = (cls, k) => h('div', { class: 'stat ' + cls },
    h('span', { class: 'k' }, k), h('span', { class: 'v' }, '—'));

  const sWpm = stat('', 'WPM');
  const sAcc = stat('', 'Acc');
  const sTime = stat('', 'Time');
  const sStreak = stat('streak', 'Streak');
  const sGoal = stat('goal', goalLabel);

  const finger = h('div', { class: 'finger-slot' });
  const hud = h('div', { class: 'hud' },
    back, h('div', { class: 'stats' }, sWpm, sAcc, sTime, sStreak, sGoal), finger);
  const field = h('div', { class: 'field' });
  const kbMount = h('div', { class: 'kb-mount' });
  const stage = h('div', { class: 'stage fade-in' }, field, hud, kbMount);
  parent.appendChild(stage);

  const setV = (el, v) => { el.querySelector('.v').innerHTML = v; };

  return {
    stage, field, kbMount, finger,
    setGoal: (v) => setV(sGoal, v),
    update(snap, elapsedMs) {
      setV(sWpm, snap.wpm);
      setV(sAcc, snap.accuracy + '<small>%</small>');
      const s = Math.floor((elapsedMs || 0) / 1000);
      setV(sTime, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      setV(sStreak, snap.streak);
      sStreak.classList.toggle('hot', snap.streak >= 10);
    },
    destroy() { stage.remove(); },
  };
}

/** Encouraging toast inside a field. */
export function makeToast(field) {
  const t = h('div', { class: 'toast' });
  field.appendChild(t);
  let timer = null;
  return (msg, tone) => {
    t.textContent = msg;
    t.style.color = tone === 'miss' ? 'var(--warn)' : tone === 'big' ? 'var(--pipe-green)' : 'var(--brass)';
    t.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => t.classList.remove('show'), 700);
  };
}

/** size a canvas to its parent, accounting for device pixel ratio */
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: r.width, h: r.height, g };
}

/** The quiet, editorial results screen. */
export function resultsScreen(parent, { lesson, snap, passed, isPB, onRetry, onNext, onMenu }) {
  const cell = (k, v) => h('div', { class: 'cell' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, String(v)));
  const blurb = passed
    ? `You hit ${snap.wpm} WPM at ${snap.accuracy}% — past the ${lesson.minWpm} WPM goal. Great work, and you can go even faster.`
    : `You reached ${snap.wpm} WPM at ${snap.accuracy}%. The goal is ${lesson.minWpm} WPM at 80%+. One more pass and it's yours.`;

  const wrap = h('div', { class: 'results fade-in' },
    h('div', { class: 'seal' }, passed ? '🛠️' : '💧'),
    h('h3', { class: 'verdict' + (passed ? '' : ' miss') }, passed ? 'Pipes Fixed' : 'Almost Sealed'),
    isPB ? h('div', { class: 'l-focus', style: 'color:var(--brass)' }, '★ New personal best') : null,
    h('p', { class: 'blurb' }, blurb),
    h('div', { class: 'result-grid' },
      cell('WPM', snap.wpm), cell('Accuracy', snap.accuracy + '%'),
      cell('Best streak', snap.maxStreak), cell('Keystrokes', snap.total)),
    h('div', { class: 'result-actions' },
      h('button', { class: 'btn', onclick: onRetry }, '↻ Retry'),
      onNext ? h('button', { class: 'btn', onclick: onNext }, 'Next lesson →') : null,
      h('button', { class: 'btn primary', onclick: onMenu }, 'Menu')),
  );
  parent.appendChild(wrap);
  return { destroy: () => wrap.remove() };
}
