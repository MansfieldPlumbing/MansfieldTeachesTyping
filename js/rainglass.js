/* Rain on a glass pane — the backdrop for Key Rain. Deep teal night-glass with
   beaded water droplets and a few that release and slide down leaving a trail.
   Cheap: one pre-rendered bead sprite stamped many times + a handful of sliders. */

export class RainGlass {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.beads = [];
    this.sliders = [];
    this._bead = this._makeBead();
    this.resize();
  }

  _makeBead() {
    // a small glassy water bead on its own canvas, stamped later via drawImage
    const s = 48, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s * 0.38, s * 0.34, 1, s * 0.5, s * 0.55, s * 0.5);
    grad.addColorStop(0, 'rgba(210,240,255,0.55)');
    grad.addColorStop(0.35, 'rgba(120,170,190,0.20)');
    grad.addColorStop(0.75, 'rgba(20,50,64,0.30)');
    grad.addColorStop(1, 'rgba(8,22,30,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, 7); g.fill();
    // specular highlight
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.arc(s * 0.36, s * 0.32, s * 0.06, 0, 7); g.fill();
    return c;
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // seed static beads scaled to area
    const n = Math.round((this.w * this.h) / 9000);
    this.beads = [];
    for (let i = 0; i < n; i++) {
      this.beads.push({ x: Math.random() * this.w, y: Math.random() * this.h, r: 3 + Math.random() * 7, a: 0.5 + Math.random() * 0.5 });
    }
    this.sliders = [];
    for (let i = 0; i < 7; i++) this.sliders.push(this._newSlider(true));
  }

  _newSlider(initial) {
    return {
      x: Math.random() * this.w,
      y: initial ? Math.random() * this.h : -10,
      r: 4 + Math.random() * 7,
      v: 0.4 + Math.random() * 1.4,
      wob: Math.random() * 6.28,
      trail: [],
    };
  }

  frame() {
    const g = this.g, w = this.w, h = this.h;
    // deep glass gradient
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a1a24');
    bg.addColorStop(0.55, '#0b2330');
    bg.addColorStop(1, '#081820');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // soft blurred light behind the glass (a streetlamp through rain)
    const glow = g.createRadialGradient(w * 0.7, h * 0.2, 10, w * 0.7, h * 0.2, Math.max(w, h) * 0.5);
    glow.addColorStop(0, 'rgba(90,160,180,0.20)');
    glow.addColorStop(1, 'rgba(90,160,180,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);

    // static beads
    for (const b of this.beads) {
      g.globalAlpha = b.a * 0.9;
      g.drawImage(this._bead, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    g.globalAlpha = 1;

    // sliders + trails
    for (const s of this.sliders) {
      s.y += s.v; s.v += 0.02; s.wob += 0.08;
      s.x += Math.sin(s.wob) * 0.3;
      s.trail.push({ x: s.x, y: s.y, r: s.r * (0.4 + Math.random() * 0.3) });
      if (s.trail.length > 14) s.trail.shift();
      for (let i = 0; i < s.trail.length; i++) {
        const t = s.trail[i];
        g.globalAlpha = (i / s.trail.length) * 0.5;
        g.drawImage(this._bead, t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
      }
      g.globalAlpha = 1;
      g.drawImage(this._bead, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      if (s.y - s.r > h) Object.assign(s, this._newSlider(false));
    }
  }

  destroy() { /* nothing persistent */ }
}
