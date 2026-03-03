// main.js

// ─── Sky palette ───────────────────────────────────────────────────────────────
// Keyframes keyed by fractional local hour. Each entry:
//   top/mid/hor   [r,g,b]  linear sky gradient: zenith → mid-sky → horizon
//   glow          0–1      opacity of sun radial overlay (only while sun is above horizon)
//   glowC         [r,g,b]  sun glow colour
//   cShadow/cLight[r,g,b]  cloud particle shadow / highlight colour endpoints
//   aMult         0–1      cloud alpha multiplier (0 = clouds invisible)
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

// Interpolate sky colours for the given Date
function getSkyColors(date) {
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  // Find the surrounding keyframe pair
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

// Sun disc position in canvas coords, arcing east→west. Returns null below horizon.
function getSunPosition(hour, w, h) {
  const riseH = 6.3, setH = 18.7;
  if (hour < riseH || hour > setH) return null;
  const t    = (hour - riseH) / (setH - riseH);   // 0 = sunrise, 1 = sunset
  const elev = Math.sin(t * Math.PI);              // elevation fraction 0 → 1 → 0
  return {
    x:    w * (0.05 + 0.90 * t),
    y:    h * (1.0 - elev * 0.80),
    r:    Math.min(w, h) * (0.30 + 0.25 * (1 - elev)), // larger glow near horizon
    elev,                                               // 0 = horizon, 1 = zenith
  };
}

// ─── Perlin noise ──────────────────────────────────────────────────────────────

// Tiny Perlin noise (2D) implementation (public-domain style, based on classic improved Perlin noise patterns)
class Perlin {
  constructor(seed = Math.random()) {
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;

    // seeded shuffle
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
    // 8-direction gradients
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.p[this.p[X] + Y];
    const ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X + 1] + Y];
    const bb = this.p[this.p[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    // normalize to ~[0,1]
    return (this.lerp(x1, x2, v) + 1) * 0.5;
  }
}

class CloudParticle {
  constructor(x, y, opts) {
    this.opts = opts;
    this.perlin = opts.perlin;
    this.w = opts.width;
    this.h = opts.height;
    this.skyTop = opts.skyTop;

    // Depth is fixed for this particle's lifetime: 0 = distant/back, 1 = close/front.
    // Drives parallax: far particles are smaller, slower, and more transparent.
    this.depth = Math.random();

    this._displayAlpha = 0;
    this._spawn(x, y);
  }

  _spawn(x, y) {
    const opts = this.opts;
    const d = this.depth;
    this.x = x;
    this.y = y;
    // Scale size, speed, and opacity by depth for natural parallax layering
    this.size         = randRange(opts.sizeMin, opts.sizeMax) * (0.3 + 0.7 * d);
    this._targetAlpha = randRange(opts.alphaMin, opts.alphaMax) * (0.4 + 0.6 * d);
    this.speedX       = randRange(opts.speedMin, opts.speedMax) * (0.2 + 0.8 * d);
    this.noiseOffsetX = Math.random() * 1000;
    this.noiseOffsetY = Math.random() * 1000;
    this._displayAlpha = 0;
    this._windVX = 0;
    this._windVY = 0;
    // Per-particle warm/cool tint seed: positive = cooler (more blue), negative = warmer (more red)
    this._hueShift = randRange(-8, 8);
    // Home anchor: drifts with base speed, spring keeps particle from dispersing
    this.homeX = x;
    this.homeY = y;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.skyTop = h;
  }

  update(dt, mouse) {
    const opts = this.opts;
    const dtFactor = dt * 60;

    // True 2D noise: sample both axes, use large spatial offsets (+100/+200) to
    // decouple nx and ny so they drift independently.
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

    // Evolve Y offset at a slightly different rate for richer 2D trajectories
    this.noiseOffsetX += opts.noiseStep * dtFactor;
    this.noiseOffsetY += opts.noiseStep * 0.73 * dtFactor;

    // Advance home anchor at base drift speed (no noise) so it tracks where the
    // particle would be without turbulence. The spring below then counteracts the
    // accumulated noise drift, keeping particles near their cluster indefinitely.
    this.homeX += this.speedX * dtFactor;
    this.x += (this.homeX - this.x) * 0.005 * dtFactor;
    this.y += (this.homeY - this.y) * 0.005 * dtFactor;

    // Fade in toward target alpha
    if (this._displayAlpha < this._targetAlpha) {
      this._displayAlpha = Math.min(this._targetAlpha, this._displayAlpha + 3 * dtFactor);
    }

    // Wind cursor influence: particles within radius feel a gust in the direction
    // the mouse is moving, plus a gentle radial push away from the cursor centre.
    // Force scales with depth so near particles scatter more than distant ones.
    const mdx = this.x - mouse.x;
    const mdy = this.y - mouse.y;
    const distSq = mdx * mdx + mdy * mdy;
    const WIND_R = 150;
    if (distSq < WIND_R * WIND_R && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const proximity = 1 - dist / WIND_R;
      const falloff = proximity * proximity;          // quadratic: strongest at centre
      const depthScale = 0.3 + 0.7 * this.depth;    // far particles disturbed less
      const nx = mdx / dist;                         // radial direction (away from cursor)
      const ny = mdy / dist;
      const f = 1.5 * falloff * depthScale;
      this._windVX += (mouse.vx * 0.6 + nx * 1) * f * dtFactor;
      this._windVY += (mouse.vy * 0.6 + ny * 1) * f * dtFactor;
    }

    // Apply wind velocity and let it decay naturally
    this.x += this._windVX * dtFactor;
    this.y += this._windVY * dtFactor;
    this._windVX *= 0.90;
    this._windVY *= 0.90;
    // Soft speed cap so particles never fly fully off screen
    if (Math.abs(this._windVX) > 4) this._windVX *= 0.75;
    if (Math.abs(this._windVY) > 4) this._windVY *= 0.75;

    // Horizontal wrap
    if (this.x > this.w + this.size) {
      this._spawn(-this.size, Math.random() * this.skyTop);
    } else if (this.x < -this.size * 2) {
      this._spawn(this.w + this.size, Math.random() * this.skyTop);
    }

    // Vertical bounds: reset if drifted out of sky zone
    if (this.y < -this.size || this.y > this.skyTop + this.size) {
      this._spawn(Math.random() * this.w, Math.random() * this.skyTop);
    }
  }

  // skyColors is the current interpolated palette from getSkyColors()
  draw(ctx, skyColors) {
    // Noise-driven shade: lerps between time-of-day shadow/light endpoints
    const shadeNoise = this.perlin.noise2D(
      this.noiseOffsetX * this.opts.noiseScale * 0.4 + 300,
      this.noiseOffsetY * this.opts.noiseScale * 0.4 + 300
    );
    // Per-particle hue seed shifts red/blue channels for subtle warm/cool variation
    const cr = Math.round(Math.max(0, Math.min(255, lerp(skyColors.cShadow[0], skyColors.cLight[0], shadeNoise) - this._hueShift * 0.3)));
    const cg = Math.round(lerp(skyColors.cShadow[1], skyColors.cLight[1], shadeNoise));
    const cb = Math.round(Math.max(0, Math.min(255, lerp(skyColors.cShadow[2], skyColors.cLight[2], shadeNoise) + this._hueShift)));
    const alpha = (this._displayAlpha / 255) * skyColors.aMult;

    // All drawing runs inside save/restore so the ellipse transform and any
    // shadow state are automatically cleaned up after each particle.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1.8, 1.0); // horizontal stretch → cloud-shaped ellipse

    // Shadow blur glow: only active during sunrise/sunset (skyColors.glow > 0).
    // Intensity scales with the sky's current glow value and particle size.
    if (skyColors.glow > 0) {
      ctx.shadowBlur  = skyColors.glow * this.size * 2;
      ctx.shadowColor = `rgba(${skyColors.glowC[0]},${skyColors.glowC[1]},${skyColors.glowC[2]},0.5)`;
    }

    // Radial gradient fill: opaque at centre, fully transparent at edge
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
    grad.addColorStop(0,   `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`);
    grad.addColorStop(1.0, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Core density blob: a softer secondary puff offset from centre for internal volume
    const coreNoise = this.perlin.noise2D(
      this.noiseOffsetX * this.opts.noiseScale * 1.5 + 500,
      this.noiseOffsetY * this.opts.noiseScale * 1.5 + 500
    );
    if (coreNoise < this.opts.coreChance) {
      const ox = randRange(-this.opts.coreOffset, this.opts.coreOffset);
      const oy = randRange(-this.opts.coreOffset, this.opts.coreOffset);
      const coreR = this.size * this.opts.coreScale;
      const coreGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreR);
      coreGrad.addColorStop(0,   `rgba(${cr},${cg},${cb},${(alpha * 0.5).toFixed(3)})`);
      coreGrad.addColorStop(1.0, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(ox, oy, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // restores transform, shadowBlur, shadowColor automatically
  }
}

class CloudSystem {
  constructor({ canvas, numParticles = 500 }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });

    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.perlin = new Perlin();

    this.fadeAlpha = 10 / 255;

    this.numParticles = numParticles;
    this.particles = [];

    this.lastT = null;      // null until first frame so dt is always clean
    this._rafId = null;
    this._resizeTimer = null;
    this._lastColorMs = null;
    this._stars = [];

    // Mouse/wind state: position far off-canvas so no force is applied until
    // the cursor actually enters. vx/vy are smoothed per-event and decay per-frame.
    this._mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };

    // Compute initial sky palette before resize() so _buildGradients() has colours
    this._skyColors = getSkyColors(new Date());

    this.resize();
    this.initParticles();
    this._bindMouse();

    window.addEventListener("resize", () => this._onResize());
    document.addEventListener("visibilitychange", () => this._onVisibility());

    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }

  // Debounced resize — fires once 150 ms after the last resize event
  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => this.resize(), 150);
  }

  // Pause animation when the tab is hidden; resume cleanly when it returns
  _onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    } else {
      this.lastT = null;       // reset timing to avoid a large dt spike on resume
      this._lastColorMs = null; // force colour refresh on resume
      this._rafId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  _bindMouse() {
    // Shared helper: update _mouse from any (x, y) in canvas-local coords
    const move = (x, y) => {
      const rawVX = x - this._mouse.x;
      const rawVY = y - this._mouse.y;
      this._mouse.vx = this._mouse.vx * 0.5 + rawVX * 0.5;
      this._mouse.vy = this._mouse.vy * 0.5 + rawVY * 0.5;
      this._mouse.x = x;
      this._mouse.y = y;
    };

    const park = () => {
      this._mouse.x  = -9999;
      this._mouse.y  = -9999;
      this._mouse.vx = 0;
      this._mouse.vy = 0;
    };

    // ── Mouse ──────────────────────────────────────────────────────────────
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      move(e.clientX - rect.left, e.clientY - rect.top);
    });
    this.canvas.addEventListener('mouseleave', park);

    // ── Touch ──────────────────────────────────────────────────────────────
    // touchstart: seed position so the first touchmove delta isn't huge
    this.canvas.addEventListener('touchstart', e => {
      const rect = this.canvas.getBoundingClientRect();
      const t = e.touches[0];
      this._mouse.x = t.clientX - rect.left;
      this._mouse.y = t.clientY - rect.top;
    }, { passive: true });

    // touchmove: same velocity logic as mousemove; preventDefault stops page scroll
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const t = e.touches[0];
      move(t.clientX - rect.left, t.clientY - rect.top);
    }, { passive: false });

    this.canvas.addEventListener('touchend',   park);
    this.canvas.addEventListener('touchcancel', park);
  }

  _initStars() {
    this._stars = generateStars(this.w, this.h);
  }

  _drawSunDisc() {
    if (!this._sunDiscGrad) return;
    this.ctx.fillStyle = this._sunDiscGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  // Build (or rebuild) the cached sky gradient and optional sun glow gradient.
  // Uses this._skyColors so call getSkyColors() before calling this.
  _buildGradients() {
    const { ctx, w, h } = this;
    const sc = this._skyColors;

    // Sky: zenith colour transitions down through mid-sky to the horizon
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0,   `rgb(${sc.top.join(',')})`);
    sky.addColorStop(0.5, `rgb(${sc.mid.join(',')})`);
    sky.addColorStop(1.0, `rgb(${sc.hor.join(',')})`);
    this._skyGrad = sky;

    // Compute sun position once; used for both the large glow overlay and the disc.
    this._sunGrad     = null;
    this._sunDiscGrad = null;
    const sunPos = getSunPosition(sc.hour, w, h);
    if (sunPos) {
      const { x: sx, y: sy, r: sr, elev } = sunPos;
      const [gr, gg, gb] = sc.glowC;

      // Large atmospheric glow overlay (only meaningful during sunrise/sunset)
      if (sc.glow > 0) {
        const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sun.addColorStop(0,   `rgba(${gr},${gg},${gb},${(sc.glow * 0.85).toFixed(3)})`);
        sun.addColorStop(0.4, `rgba(${gr},${gg},${gb},${(sc.glow * 0.25).toFixed(3)})`);
        sun.addColorStop(1.0, `rgba(${gr},${gg},${gb},0)`);
        this._sunGrad = sun;
      }

      // Tight sun disc: larger and warmer near the horizon (atmospheric scattering),
      // smaller and whiter overhead. Core colour fades from glowC toward white as
      // the sun climbs; disc radius shrinks from ~28 px at horizon to ~14 px at zenith.
      const base   = Math.min(w, h) * 0.015;
      const discR  = base * (0.65 + 1.35 * (1 - elev));
      const coreB  = Math.round(180 + 75 * elev); // blue channel: warmer/lower near horizon
      const disc   = ctx.createRadialGradient(sx, sy, 0, sx, sy, discR);
      disc.addColorStop(0,   `rgba(255,255,${coreB},1.0)`);    // white-hot centre
      disc.addColorStop(0.3, `rgba(${gr},${gg},${gb},0.95)`);  // transition to sky-tint colour
      disc.addColorStop(0.8, `rgba(${gr},${gg},${gb},0.18)`);  // soft penumbra fade
      disc.addColorStop(1.0, `rgba(${gr},${gg},${gb},0)`);
      this._sunDiscGrad = disc;
    }

    // Keep body background in sync so there's no colour flash before the canvas paints
    const [r, g, b] = sc.top;
    document.body.style.background = `rgb(${r},${g},${b})`;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.floor(rect.width));
    this.h = Math.max(1, Math.floor(rect.height));

    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this._buildGradients();

    // Resizing the canvas clears it — immediately repaint the sky
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    if (this._sunGrad) {
      this.ctx.fillStyle = this._sunGrad;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    this._drawSunDisc();

    this._initStars();
    for (const p of this.particles) p.resize(this.w, this.h);
  }

  initParticles() {
    this.particles.length = 0;

    const opts = {
      perlin: this.perlin,
      width: this.w,
      height: this.h,
      skyTop: this.h,

      // size is now a circle radius
      sizeMin: 2,
      sizeMax: 25,
      alphaMin: 100,
      alphaMax: 180,
      speedMin: 0.5,
      speedMax: 1.2,

      noiseStep: 0.005,
      noiseScale: 1.0,
      verticalDrift: 0.5,

      coreChance: 0.3,
      coreOffset: 6,
      coreScale: 0.8,
    };

    // Cloud clusters: spawn particles in soft elliptical groups so the sky
    // starts with recognizable cloud shapes rather than uniform noise.
    const numClusters = 5;
    const clusters = Array.from({ length: numClusters }, () => ({
      cx: randRange(this.w * 0.05, this.w * 0.95),
      cy: randRange(this.h * 0.05, this.h * 0.95),
      rx: randRange(this.w * 0.07, this.w * 0.17), // horizontal spread
      ry: randRange(this.h * 0.03, this.h * 0.10), // vertical spread (flatter)
    }));

    for (let i = 0; i < this.numParticles; i++) {
      const cl = clusters[i % numClusters];
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()); // sqrt gives uniform distribution within the disk
      const x = cl.cx + Math.cos(angle) * r * cl.rx;
      const y = cl.cy + Math.sin(angle) * r * cl.ry;
      this.particles.push(new CloudParticle(
        Math.max(-50, Math.min(this.w + 50, x)),
        Math.max(0, Math.min(this.h, y)),
        opts
      ));
    }

    // Sort back-to-front by depth so near particles render on top of far ones
    this.particles.sort((a, b) => a.depth - b.depth);

    // Initial sky fill
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    if (this._sunGrad) {
      this.ctx.fillStyle = this._sunGrad;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    this._drawSunDisc();
  }

  fadeBackground() {
    this.ctx.save();
    this.ctx.globalAlpha = this.fadeAlpha;
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    if (this._sunGrad) {
      this.ctx.fillStyle = this._sunGrad;
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    this.ctx.restore();
  }

  loop(t) {
    if (this.lastT === null) this.lastT = t; // clean first-frame timing
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    // Refresh sky palette once per second — smooth real-time colour transitions
    if (this._lastColorMs === null || t - this._lastColorMs >= 1000) {
      this._skyColors = getSkyColors(new Date());
      this._buildGradients();
      this._lastColorMs = t;
    }

    this.fadeBackground();
    this._drawSunDisc();
    drawStars(this.ctx, this._stars, this._skyColors, t, this.perlin);

    // Decay mouse velocity each frame so the wind gust fades when the cursor stops
    this._mouse.vx *= 0.80;
    this._mouse.vy *= 0.80;

    for (const p of this.particles) {
      p.update(dt, this._mouse);
      p.draw(this.ctx, this._skyColors);
    }

    this._rafId = requestAnimationFrame((nt) => this.loop(nt));
  }
}

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

// ─── Star field ─────────────────────────────────────────────────────────────

// Build a fixed array of star descriptors sized to fill the canvas.
// Each star stores its position, shape (jittered polar vertices), per-point
// radii, and independent Perlin offsets so every star twinkles at its own rate.
function generateStars(w, h, count = 150) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const numPoints = Math.floor(randRange(3, 6.99)); // 3–6 spikes

    // Slightly jittered evenly-spaced angles → organic asymmetry
    const angles = [];
    for (let j = 0; j < numPoints; j++) {
      angles.push((j / numPoints) * Math.PI * 2 + randRange(-0.18, 0.18));
    }
    angles.sort((a, b) => a - b);

    // 15% chance of a larger "prominent" star; rest are typical background stars
    const outerR = Math.random() < 0.15
      ? randRange(3.5, 5.5)
      : randRange(0.8, 2.8);
    const innerR = outerR * randRange(0.28, 0.46);

    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      numPoints,
      angles,
      radii:       angles.map(() => outerR * randRange(0.84, 1.16)), // per-spike asymmetry
      innerR,
      brightness:  Math.pow(Math.random(), 1.4), // most stars dim, a few bright
      noiseOff:    Math.random() * 500,           // overall twinkle offset
      noiseOffPts: angles.map(() => Math.random() * 1000), // per-spike twinkle
      twinkleSpeed: randRange(0.04, 0.14),
    });
  }
  return stars;
}

// Draw the star field. Stars are fully visible in true night (aMult ≈ 0.25) and
// fade out as the sky brightens through twilight (gone by aMult ≈ 0.65).
function drawStars(ctx, stars, skyColors, t, perlin) {
  const nightness = Math.max(0, Math.min(1, 1 - (skyColors.aMult - 0.25) / 0.40));
  if (nightness < 0.01) return;

  const noiseT = t * 0.0003; // very slow time so twinkle is subtle

  for (const star of stars) {
    const { x, y, numPoints, angles, radii, innerR,
            brightness, noiseOff, noiseOffPts, twinkleSpeed } = star;

    // Per-star brightness pulse drives overall opacity
    const pulse = perlin.noise2D(noiseOff, noiseT * twinkleSpeed);
    const alpha = nightness * brightness * (0.55 + 0.45 * pulse);
    if (alpha < 0.015) continue;

    // Build interleaved outer-spike / inner-valley vertex array
    const verts = [];
    for (let i = 0; i < numPoints; i++) {
      // Per-spike radius modulation: independent noise gives shape flicker
      const ptPulse = perlin.noise2D(noiseOffPts[i], noiseT * twinkleSpeed * 0.55);
      const r = radii[i] * (0.82 + 0.18 * ptPulse);
      verts.push({ x: Math.cos(angles[i]) * r, y: Math.sin(angles[i]) * r });

      // Valley: midpoint angle between this and next spike, at inner radius
      const nextAngle = i < numPoints - 1 ? angles[i + 1] : angles[0] + Math.PI * 2;
      const midAngle  = (angles[i] + nextAngle) / 2;
      verts.push({ x: Math.cos(midAngle) * innerR, y: Math.sin(midAngle) * innerR });
    }

    const total = verts.length; // numPoints * 2

    ctx.save();
    ctx.translate(x, y);

    // Glow halo — size scales with the star's radius; pulses with brightness
    ctx.shadowBlur  = (3 + pulse * 7) * (radii[0] / 1.8);
    ctx.shadowColor = `rgba(210, 228, 255, ${(alpha * 0.85).toFixed(3)})`;

    // Smooth path: midpoint quadratic bezier rounds every sharp vertex into a
    // soft arc, producing a luminous organic shape rather than a rigid polygon.
    ctx.beginPath();
    const last = verts[total - 1];
    ctx.moveTo((last.x + verts[0].x) / 2, (last.y + verts[0].y) / 2);
    for (let i = 0; i < total; i++) {
      const curr = verts[i];
      const next = verts[(i + 1) % total];
      ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
    }
    ctx.closePath();

    ctx.fillStyle = `rgba(220, 235, 255, ${alpha.toFixed(3)})`;
    ctx.fill();
    ctx.restore();
  }
}

// Boot
new CloudSystem({ canvas: document.querySelector("#c"), numParticles: 500 });
