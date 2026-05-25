// main.js — Atmos Index

// ─── Sky palette ───────────────────────────────────────────────────────────────
const SKY_KEYFRAMES = [
  { h:  0.0, top:[  0,  2, 14], mid:[  1,  4, 22], hor:[  2,  6, 32], glow:0,    glowC:[255,140, 60], cShadow:[ 20, 25, 55], cLight:[ 45, 55, 90], aMult:0.25 },
  { h:  4.5, top:[  4,  8, 40], mid:[ 12, 18, 62], hor:[ 28, 22, 75], glow:0,    glowC:[200,120, 80], cShadow:[ 40, 45, 90], cLight:[ 80, 90,140], aMult:0.40 },
  { h:  5.5, top:[ 10, 24, 80], mid:[ 38, 60,140], hor:[105, 72,128], glow:0,    glowC:[255,160, 80], cShadow:[140,120,165], cLight:[210,190,230], aMult:0.65 },
  { h:  6.5, top:[ 22, 58,135], mid:[215,115, 60], hor:[255,190, 80], glow:0.30, glowC:[255,225,120], cShadow:[205,145,105], cLight:[255,235,200], aMult:0.90 },
  { h:  7.5, top:[ 26, 88,168], mid:[132,198,248], hor:[255,218,168], glow:0.18, glowC:[255,242,185], cShadow:[200,218,242], cLight:[255,255,255], aMult:1.00 },
  { h: 10.0, top:[ 28,100,190], mid:[120,195,248], hor:[188,225,255], glow:0.12, glowC:[255,252,215], cShadow:[200,218,242], cLight:[255,255,255], aMult:1.00 },
  { h: 16.0, top:[ 28,100,190], mid:[120,195,248], hor:[188,225,255], glow:0.12, glowC:[255,252,215], cShadow:[200,218,242], cLight:[255,255,255], aMult:1.00 },
  { h: 17.5, top:[ 22, 68,158], mid:[168,132,195], hor:[255,188,128], glow:0.22, glowC:[255,200,100], cShadow:[205,165,145], cLight:[255,242,222], aMult:1.00 },
  { h: 18.5, top:[ 15, 30, 98], mid:[188, 68, 68], hor:[255,148, 68], glow:0.34, glowC:[255,162, 62], cShadow:[205,125, 85], cLight:[255,205,165], aMult:0.90 },
  { h: 19.5, top:[  8, 14, 55], mid:[ 65, 25, 75], hor:[128, 55, 85], glow:0,    glowC:[255,120, 80], cShadow:[ 95, 75,118], cLight:[162,132,175], aMult:0.55 },
  { h: 20.5, top:[  3,  5, 32], mid:[ 10, 10, 44], hor:[ 20, 15, 54], glow:0,    glowC:[255,100, 60], cShadow:[ 45, 48, 88], cLight:[ 78, 82,132], aMult:0.30 },
  { h: 21.5, top:[  0,  2, 14], mid:[  1,  4, 22], hor:[  2,  6, 32], glow:0,    glowC:[255,140, 60], cShadow:[ 20, 25, 55], cLight:[ 45, 55, 90], aMult:0.25 },
  { h: 24.0, top:[  0,  2, 14], mid:[  1,  4, 22], hor:[  2,  6, 32], glow:0,    glowC:[255,140, 60], cShadow:[ 20, 25, 55], cLight:[ 45, 55, 90], aMult:0.25 },
];

function getSkyColors(date) {
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  let i = SKY_KEYFRAMES.length - 2;
  for (let k = 0; k < SKY_KEYFRAMES.length - 1; k++) {
    if (h < SKY_KEYFRAMES[k + 1].h) { i = k; break; }
  }
  const a = SKY_KEYFRAMES[i], b = SKY_KEYFRAMES[i + 1];
  const t = (h - a.h) / (b.h - a.h);
  const lerpC = (ca, cb, t) => ca.map((v, j) => Math.round(lerp(v, cb[j], t)));
  return {
    top:     lerpC(a.top,     b.top,     t),
    mid:     lerpC(a.mid,     b.mid,     t),
    hor:     lerpC(a.hor,     b.hor,     t),
    glow:    lerp(a.glow,     b.glow,    t),
    glowC:   lerpC(a.glowC,   b.glowC,   t),
    cShadow: lerpC(a.cShadow, b.cShadow, t),
    cLight:  lerpC(a.cLight,  b.cLight,  t),
    aMult:   lerp(a.aMult,    b.aMult,   t),
    hour: h,
  };
}

// Sun disc arcs east → west. Returns null below horizon.
function getSunPosition(hour, w, h) {
  const riseH = 6.3, setH = 18.7;
  if (hour < riseH || hour > setH) return null;
  const t    = (hour - riseH) / (setH - riseH);
  const elev = Math.sin(t * Math.PI);
  return {
    x:    w * (0.05 + 0.90 * t),
    y:    h * (1.0 - elev * 0.80),
    r:    Math.min(w, h) * (0.30 + 0.25 * (1 - elev)),
    elev,
  };
}

// Moon rises ~7 pm, sets ~7 am, arcing right → left (opposite the sun).
function getMoonPosition(hour, w, h) {
  const riseH = 19.0, setH = 7.0;
  const arcLen = 24 - riseH + setH; // 12 h arc
  let t;
  if      (hour >= riseH) t = (hour - riseH) / arcLen;
  else if (hour <= setH)  t = (24 - riseH + hour) / arcLen;
  else                    return null;
  const elev = Math.sin(t * Math.PI);
  return {
    x:    w * (0.95 - 0.90 * t),
    y:    h * (1.0  - elev * 0.78),
    elev,
  };
}

// Lunar phase 0–1 (0 / 1 = new moon, 0.5 = full moon).
// Reference new moon: 2000-01-06 UTC.
function getMoonPhase(date) {
  const REF_MS   = 946684800000;
  const CYCLE_MS = 29.53059 * 86400 * 1000;
  return ((date.getTime() - REF_MS) % CYCLE_MS + CYCLE_MS) % CYCLE_MS / CYCLE_MS;
}

// ─── Perlin noise ──────────────────────────────────────────────────────────────
class Perlin {
  constructor(seed = Math.random()) {
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    let s = seed * 1e9;
    const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(a, b, t) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x),   yf = y - Math.floor(y);
    const u  = this.fade(xf),        v  = this.fade(yf);
    const aa = this.p[this.p[X] + Y],     ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X + 1] + Y], bb = this.p[this.p[X + 1] + Y + 1];
    const x1 = this.lerp(this.grad(aa, xf, yf),     this.grad(ba, xf - 1, yf),     u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    return (this.lerp(x1, x2, v) + 1) * 0.5;
  }
}

// ─── Cloud particle ────────────────────────────────────────────────────────────
class CloudParticle {
  constructor(x, y, opts) {
    this.opts   = opts;
    this.perlin = opts.perlin;
    this.w      = opts.width;
    this.h      = opts.height;
    this.skyTop = opts.skyTop;
    this.depth  = Math.random();
    this._displayAlpha = 0;
    this._spawn(x, y);
  }

  _spawn(x, y) {
    const opts = this.opts;
    const d    = this.depth;
    this.x = x;
    this.y = y;
    this.size          = randRange(opts.sizeMin, opts.sizeMax) * (0.3 + 0.7 * d);
    this._targetAlpha  = randRange(opts.alphaMin, opts.alphaMax) * (0.4 + 0.6 * d);
    this.speedX        = randRange(opts.speedMin, opts.speedMax) * (0.2 + 0.8 * d);
    this.noiseOffsetX  = Math.random() * 1000;
    this.noiseOffsetY  = Math.random() * 1000;
    this._displayAlpha = 0;
    this._windVX       = 0;
    this._windVY       = 0;
    this._hueShift     = randRange(-8, 8);
    this.homeX         = x;
    this.homeY         = y;

    // Fixed sub-puff offsets computed once per spawn for consistent cloud shape.
    // Only generated for particles large enough to benefit.
    const s = this.size;
    this._puffs = s >= 6 ? [
      { ox: randRange(-s * 0.55, s * 0.55), oy: randRange(-s * 0.40, s * 0.05), scale: randRange(0.52, 0.78) },
      { ox: randRange(-s * 0.38, s * 0.38), oy: randRange(-s * 0.30, s * 0.10), scale: randRange(0.35, 0.58) },
    ] : [];
  }

  resize(w, h) {
    this.w = w; this.h = h; this.skyTop = h;
  }

  update(dt, mouse) {
    const opts     = this.opts;
    const dtFactor = dt * 60;

    const nx = (this.perlin.noise2D(
      this.noiseOffsetX * opts.noiseScale,
      this.noiseOffsetY * opts.noiseScale * 0.3 + 100
    ) - 0.5) * 2;
    const ny = (this.perlin.noise2D(
      this.noiseOffsetX * opts.noiseScale * 0.3 + 200,
      this.noiseOffsetY * opts.noiseScale
    ) - 0.5) * 2;

    this.x += (this.speedX + nx) * dtFactor;
    this.y += (ny * opts.verticalDrift) * dtFactor;

    this.noiseOffsetX += opts.noiseStep * dtFactor;
    this.noiseOffsetY += opts.noiseStep * 0.73 * dtFactor;

    this.homeX += this.speedX * dtFactor;
    this.x += (this.homeX - this.x) * 0.005 * dtFactor;
    this.y += (this.homeY - this.y) * 0.005 * dtFactor;

    if (this._displayAlpha < this._targetAlpha) {
      this._displayAlpha = Math.min(this._targetAlpha, this._displayAlpha + 3 * dtFactor);
    }

    // Cursor wind influence
    const mdx = this.x - mouse.x;
    const mdy = this.y - mouse.y;
    const distSq = mdx * mdx + mdy * mdy;
    const WIND_R = 150;
    if (distSq < WIND_R * WIND_R && distSq > 0.01) {
      const dist       = Math.sqrt(distSq);
      const proximity  = 1 - dist / WIND_R;
      const falloff    = proximity * proximity;
      const depthScale = 0.3 + 0.7 * this.depth;
      const rnx = mdx / dist, rny = mdy / dist;
      const f   = 1.5 * falloff * depthScale;
      this._windVX += (mouse.vx * 0.6 + rnx * 1) * f * dtFactor;
      this._windVY += (mouse.vy * 0.6 + rny * 1) * f * dtFactor;
    }

    this.x += this._windVX * dtFactor;
    this.y += this._windVY * dtFactor;
    this._windVX *= 0.90;
    this._windVY *= 0.90;
    if (Math.abs(this._windVX) > 4) this._windVX *= 0.75;
    if (Math.abs(this._windVY) > 4) this._windVY *= 0.75;

    if (this.x > this.w + this.size) {
      this._spawn(-this.size, Math.random() * this.skyTop);
    } else if (this.x < -this.size * 2) {
      this._spawn(this.w + this.size, Math.random() * this.skyTop);
    }
    if (this.y < -this.size || this.y > this.skyTop + this.size) {
      this._spawn(Math.random() * this.w, Math.random() * this.skyTop);
    }
  }

  // Secondary wind force from automated gust sweeps.
  applyGust(gust, dt) {
    const dtFactor = dt * 60;
    const dx = this.x - gust.x;
    const dy = this.y - gust.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= gust.r * gust.r || distSq < 0.01) return;
    const dist       = Math.sqrt(distSq);
    const proximity  = 1 - dist / gust.r;
    const falloff    = proximity * proximity;
    const depthScale = 0.3 + 0.7 * this.depth;
    this._windVX += gust.vx * 0.45 * falloff * depthScale * dtFactor;
    this._windVY += gust.vy * 0.45 * falloff * depthScale * dtFactor;
  }

  // sunPos may be null (night). When present, highlights shift toward the sun.
  draw(ctx, skyColors, sunPos) {
    const shadeNoise = this.perlin.noise2D(
      this.noiseOffsetX * this.opts.noiseScale * 0.4 + 300,
      this.noiseOffsetY * this.opts.noiseScale * 0.4 + 300
    );

    // Sun-directional highlight offset: the radial gradient's bright inner centre
    // shifts toward the sun so each particle has a lit side and a shadow side.
    let hx = 0, hy = 0;
    if (sunPos) {
      const dx   = sunPos.x - this.x;
      const dy   = sunPos.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // Stronger offset near the horizon where lighting is most dramatic.
      const strength = this.size * (0.15 + 0.45 * (1 - sunPos.elev));
      hx = (dx / dist) * strength;
      hy = (dy / dist) * strength;
    }

    const cr = Math.round(Math.max(0, Math.min(255, lerp(skyColors.cShadow[0], skyColors.cLight[0], shadeNoise) - this._hueShift * 0.3)));
    const cg = Math.round(lerp(skyColors.cShadow[1], skyColors.cLight[1], shadeNoise));
    const cb = Math.round(Math.max(0, Math.min(255, lerp(skyColors.cShadow[2], skyColors.cLight[2], shadeNoise) + this._hueShift)));
    const alpha = (this._displayAlpha / 255) * skyColors.aMult;
    const col   = `${cr},${cg},${cb}`;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1.8, 1.0);

    if (skyColors.glow > 0) {
      ctx.shadowBlur  = skyColors.glow * this.size * 2;
      ctx.shadowColor = `rgba(${skyColors.glowC[0]},${skyColors.glowC[1]},${skyColors.glowC[2]},0.5)`;
    }

    // Main puff: inner glow centre offset toward sun for directional lighting.
    const grad = ctx.createRadialGradient(hx, hy, 0, 0, 0, this.size);
    grad.addColorStop(0,   `rgba(${col},${alpha.toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Sub-puffs: fixed offset blobs that give each particle a cumulus silhouette.
    if (this._puffs.length > 0) {
      ctx.shadowBlur = 0;
      for (const puff of this._puffs) {
        const pr = this.size * puff.scale;
        const pg = ctx.createRadialGradient(puff.ox, puff.oy, 0, puff.ox, puff.oy, pr);
        pg.addColorStop(0,   `rgba(${col},${(alpha * 0.55).toFixed(3)})`);
        pg.addColorStop(1.0, `rgba(${col},0)`);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(puff.ox, puff.oy, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// ─── Cloud system ──────────────────────────────────────────────────────────────
class CloudSystem {
  constructor({ canvas, numParticles = 500 }) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d', { alpha: true });
    this.dpr    = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.perlin = new Perlin();

    this.fadeAlpha    = 10 / 255;
    this.numParticles = numParticles;
    this.particles    = [];

    this.lastT         = null;
    this._rafId        = null;
    this._resizeTimer  = null;
    this._lastColorMs  = null;
    this._stars        = [];

    this._mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };

    // Gust state: automated wind sweeps that trigger every 20–45 s.
    this._gust         = null;
    this._gustCooldown = randRange(15, 30);

    // Moon phase is computed once at load; changes imperceptibly within a session.
    this._moonPhase = getMoonPhase(new Date());

    this._skyColors = getSkyColors(new Date());
    this._sunPos    = null;

    this.resize();
    this.initParticles();
    this._bindMouse();

    window.addEventListener('resize', () => this._onResize());
    document.addEventListener('visibilitychange', () => this._onVisibility());

    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => this.resize(), 150);
  }

  _onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    } else {
      this.lastT        = null;
      this._lastColorMs = null;
      this._rafId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  _bindMouse() {
    const move = (x, y) => {
      const rawVX    = x - this._mouse.x;
      const rawVY    = y - this._mouse.y;
      this._mouse.vx = this._mouse.vx * 0.5 + rawVX * 0.5;
      this._mouse.vy = this._mouse.vy * 0.5 + rawVY * 0.5;
      this._mouse.x  = x;
      this._mouse.y  = y;
    };
    const park = () => { this._mouse.x = -9999; this._mouse.y = -9999; this._mouse.vx = 0; this._mouse.vy = 0; };

    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      move(e.clientX - r.left, e.clientY - r.top);
    });
    this.canvas.addEventListener('mouseleave', park);
    this.canvas.addEventListener('touchstart', e => {
      const r = this.canvas.getBoundingClientRect(), t = e.touches[0];
      this._mouse.x = t.clientX - r.left; this._mouse.y = t.clientY - r.top;
    }, { passive: true });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect(), t = e.touches[0];
      move(t.clientX - r.left, t.clientY - r.top);
    }, { passive: false });
    this.canvas.addEventListener('touchend',    park);
    this.canvas.addEventListener('touchcancel', park);
  }

  _buildGradients() {
    const { ctx, w, h } = this;
    const sc = this._skyColors;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0,   `rgb(${sc.top.join(',')})`);
    sky.addColorStop(0.5, `rgb(${sc.mid.join(',')})`);
    sky.addColorStop(1.0, `rgb(${sc.hor.join(',')})`);
    this._skyGrad = sky;

    this._sunGrad     = null;
    this._sunDiscGrad = null;
    const sunPos = getSunPosition(sc.hour, w, h);
    this._sunPos = sunPos; // stored for particle shading each frame

    if (sunPos) {
      const { x: sx, y: sy, r: sr, elev } = sunPos;
      const [gr, gg, gb] = sc.glowC;

      if (sc.glow > 0) {
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sun.addColorStop(0,   `rgba(${gr},${gg},${gb},${(sc.glow * 0.85).toFixed(3)})`);
        sun.addColorStop(0.4, `rgba(${gr},${gg},${gb},${(sc.glow * 0.25).toFixed(3)})`);
        sun.addColorStop(1.0, `rgba(${gr},${gg},${gb},0)`);
        this._sunGrad = sun;
      }

      const base  = Math.min(w, h) * 0.015;
      const discR = base * (0.65 + 1.35 * (1 - elev));
      const coreB = Math.round(180 + 75 * elev);
      const disc  = ctx.createRadialGradient(sx, sy, 0, sx, sy, discR);
      disc.addColorStop(0,   `rgba(255,255,${coreB},1.0)`);
      disc.addColorStop(0.3, `rgba(${gr},${gg},${gb},0.95)`);
      disc.addColorStop(0.8, `rgba(${gr},${gg},${gb},0.18)`);
      disc.addColorStop(1.0, `rgba(${gr},${gg},${gb},0)`);
      this._sunDiscGrad = disc;
    }

    const [r, g, b] = sc.top;
    document.body.style.background = `rgb(${r},${g},${b})`;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.floor(rect.width));
    this.h = Math.max(1, Math.floor(rect.height));
    this.canvas.width  = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._buildGradients();
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    if (this._sunGrad) { this.ctx.fillStyle = this._sunGrad; this.ctx.fillRect(0, 0, this.w, this.h); }
    this._drawSunDisc();
    this._initStars();
    for (const p of this.particles) p.resize(this.w, this.h);
  }

  _initStars() { this._stars = generateStars(this.w, this.h); }

  _drawSunDisc() {
    if (!this._sunDiscGrad) return;
    this.ctx.fillStyle = this._sunDiscGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  initParticles() {
    this.particles.length = 0;
    const opts = {
      perlin: this.perlin, width: this.w, height: this.h, skyTop: this.h,
      sizeMin: 2, sizeMax: 25, alphaMin: 100, alphaMax: 180,
      speedMin: 0.5, speedMax: 1.2,
      noiseStep: 0.005, noiseScale: 1.0, verticalDrift: 0.5,
    };

    const numClusters = 5;
    const clusters = Array.from({ length: numClusters }, () => ({
      cx: randRange(this.w * 0.05, this.w * 0.95),
      cy: randRange(this.h * 0.05, this.h * 0.95),
      rx: randRange(this.w * 0.07, this.w * 0.17),
      ry: randRange(this.h * 0.03, this.h * 0.10),
    }));

    for (let i = 0; i < this.numParticles; i++) {
      const cl    = clusters[i % numClusters];
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.sqrt(Math.random());
      const x     = cl.cx + Math.cos(angle) * r * cl.rx;
      const y     = cl.cy + Math.sin(angle) * r * cl.ry;
      this.particles.push(new CloudParticle(
        Math.max(-50, Math.min(this.w + 50, x)),
        Math.max(0,   Math.min(this.h, y)),
        opts
      ));
    }
    this.particles.sort((a, b) => a.depth - b.depth);

    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    if (this._sunGrad) { this.ctx.fillStyle = this._sunGrad; this.ctx.fillRect(0, 0, this.w, this.h); }
    this._drawSunDisc();
  }

  fadeBackground() {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    ctx.fillStyle   = this._skyGrad;
    ctx.fillRect(0, 0, w, h);
    if (this._sunGrad) { ctx.fillStyle = this._sunGrad; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }

  // Horizon haze: drawn after particles so near-horizon clouds fade into the sky.
  _drawHaze() {
    const { ctx, w, h } = this;
    const sc    = this._skyColors;
    const hazeH = h * 0.30;
    const y0    = h - hazeH;
    const [r, g, b] = sc.hor;
    const peak  = 0.28 + 0.16 * sc.aMult;
    const grad  = ctx.createLinearGradient(0, y0, 0, h);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${(peak * 0.45).toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(${r},${g},${b},${peak.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, w, hazeH);
  }

  // Phase-accurate moon with atmospheric halo and terminator curve.
  _drawMoon() {
    const sc        = this._skyColors;
    const nightness = Math.max(0, Math.min(1, 1 - (sc.aMult - 0.25) / 0.40));
    if (nightness < 0.05) return;

    const moonPos = getMoonPosition(sc.hour, this.w, this.h);
    if (!moonPos) return;

    const { ctx }        = this;
    const { x: mx, y: my, elev } = moonPos;
    const moonR  = Math.min(this.w, this.h) * 0.022;
    const alpha  = nightness * Math.min(1, 0.45 + elev * 0.75);

    const phase    = this._moonPhase;
    const waxing   = phase < 0.5;
    const litFrac  = waxing ? phase * 2 : (1 - phase) * 2; // 0 = new, 1 = full

    ctx.save();
    ctx.translate(mx, my);

    // Atmospheric halo
    const haloR = moonR * 3.8;
    const halo  = ctx.createRadialGradient(0, 0, moonR * 0.9, 0, 0, haloR);
    halo.addColorStop(0,   `rgba(195,212,255,${(alpha * 0.14).toFixed(3)})`);
    halo.addColorStop(1.0, 'rgba(195,212,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Clip all subsequent drawing to the disc boundary
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, moonR, 0, Math.PI * 2);
    ctx.clip();

    // Lit disc with subtle off-centre gradient for surface texture
    const disc = ctx.createRadialGradient(-moonR * 0.12, -moonR * 0.18, 0, 0, 0, moonR);
    disc.addColorStop(0,   `rgba(255,255,250,${alpha.toFixed(3)})`);
    disc.addColorStop(0.6, `rgba(222,232,255,${alpha.toFixed(3)})`);
    disc.addColorStop(1.0, `rgba(168,188,230,${(alpha * 0.8).toFixed(3)})`);
    ctx.fillStyle = disc;
    ctx.fillRect(-moonR, -moonR, moonR * 2, moonR * 2);

    // Shadow terminator: half-circle arc + bezier ellipse whose x-deviation
    // moves from +moonR (new moon, full shadow) through 0 (quarter) to -moonR (full moon, no shadow).
    const tx  = moonR * (1 - 2 * litFrac);
    const [sr, sg, sb] = sc.top;

    ctx.beginPath();
    if (waxing) {
      // Shadow on left, lit on right
      ctx.arc(0, 0, moonR, -Math.PI / 2, Math.PI / 2, true); // CCW through left side
      ctx.bezierCurveTo(tx, moonR * 0.55, tx, -moonR * 0.55, 0, -moonR);
    } else {
      // Shadow on right, lit on left
      ctx.arc(0, 0, moonR, -Math.PI / 2, Math.PI / 2, false); // CW through right side
      ctx.bezierCurveTo(-tx, moonR * 0.55, -tx, -moonR * 0.55, 0, -moonR);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${sr},${sg},${sb},${(alpha * 0.96).toFixed(3)})`;
    ctx.fill();

    ctx.restore(); // remove clip
    ctx.restore(); // remove translate
  }

  // Advance automated gust. Intensity scales with aMult so days are windier.
  _updateGust(dt) {
    if (this._gust) {
      this._gust.x += this._gust.vx * dt * 60;
      if (this._gust.x > this.w + 200) {
        this._gust         = null;
        this._gustCooldown = randRange(20, 45);
      }
      return;
    }
    this._gustCooldown -= dt;
    if (this._gustCooldown > 0) return;

    const intensity = 0.5 + this._skyColors.aMult * 1.0;
    this._gust = {
      x:  -120,
      y:  randRange(this.h * 0.05, this.h * 0.72),
      vx: randRange(3.5, 7.0) * intensity,
      vy: randRange(-0.8, 0.8),
      r:  randRange(140, 260),
    };
  }

  loop(t) {
    if (this.lastT === null) this.lastT = t;
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    if (this._lastColorMs === null || t - this._lastColorMs >= 1000) {
      this._skyColors = getSkyColors(new Date());
      this._buildGradients(); // also updates this._sunPos
      this._lastColorMs = t;
    }

    this.fadeBackground();
    this._drawSunDisc();
    this._drawMoon();
    drawStars(this.ctx, this._stars, this._skyColors, t, this.perlin);

    this._mouse.vx *= 0.80;
    this._mouse.vy *= 0.80;

    this._updateGust(dt);

    for (const p of this.particles) {
      p.update(dt, this._mouse);
      if (this._gust) p.applyGust(this._gust, dt);
      p.draw(this.ctx, this._skyColors, this._sunPos);
    }

    this._drawHaze();

    this._rafId = requestAnimationFrame((nt) => this.loop(nt));
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────
function randRange(a, b) { return a + Math.random() * (b - a); }
function lerp(a, b, t)   { return a + t * (b - a); }

// ─── Star field ─────────────────────────────────────────────────────────────────
function generateStars(w, h, count = 150) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const numPoints = Math.floor(randRange(3, 6.99));
    const angles = [];
    for (let j = 0; j < numPoints; j++) {
      angles.push((j / numPoints) * Math.PI * 2 + randRange(-0.18, 0.18));
    }
    angles.sort((a, b) => a - b);
    const outerR = Math.random() < 0.15 ? randRange(3.5, 5.5) : randRange(0.8, 2.8);
    const innerR = outerR * randRange(0.28, 0.46);
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      numPoints, angles,
      radii:        angles.map(() => outerR * randRange(0.84, 1.16)),
      innerR,
      brightness:   Math.pow(Math.random(), 1.4),
      noiseOff:     Math.random() * 500,
      noiseOffPts:  angles.map(() => Math.random() * 1000),
      twinkleSpeed: randRange(0.04, 0.14),
    });
  }
  return stars;
}

function drawStars(ctx, stars, skyColors, t, perlin) {
  const nightness = Math.max(0, Math.min(1, 1 - (skyColors.aMult - 0.25) / 0.40));
  if (nightness < 0.01) return;
  const noiseT = t * 0.0003;
  for (const star of stars) {
    const { x, y, numPoints, angles, radii, innerR, brightness, noiseOff, noiseOffPts, twinkleSpeed } = star;
    const pulse = perlin.noise2D(noiseOff, noiseT * twinkleSpeed);
    const alpha = nightness * brightness * (0.55 + 0.45 * pulse);
    if (alpha < 0.015) continue;
    const verts = [];
    for (let i = 0; i < numPoints; i++) {
      const ptPulse = perlin.noise2D(noiseOffPts[i], noiseT * twinkleSpeed * 0.55);
      const r = radii[i] * (0.82 + 0.18 * ptPulse);
      verts.push({ x: Math.cos(angles[i]) * r, y: Math.sin(angles[i]) * r });
      const nextAngle = i < numPoints - 1 ? angles[i + 1] : angles[0] + Math.PI * 2;
      const midAngle  = (angles[i] + nextAngle) / 2;
      verts.push({ x: Math.cos(midAngle) * innerR, y: Math.sin(midAngle) * innerR });
    }
    const total = verts.length;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur  = (3 + pulse * 7) * (radii[0] / 1.8);
    ctx.shadowColor = `rgba(210,228,255,${(alpha * 0.85).toFixed(3)})`;
    ctx.beginPath();
    const last = verts[total - 1];
    ctx.moveTo((last.x + verts[0].x) / 2, (last.y + verts[0].y) / 2);
    for (let i = 0; i < total; i++) {
      const curr = verts[i], next = verts[(i + 1) % total];
      ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(220,235,255,${alpha.toFixed(3)})`;
    ctx.fill();
    ctx.restore();
  }
}

// ─── Boot ───────────────────────────────────────────────────────────────────────
new CloudSystem({ canvas: document.querySelector('#c'), numParticles: 500 });
