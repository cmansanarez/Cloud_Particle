// main.js

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
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.skyTop = h * 0.5;
  }

  update(dt) {
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

    // Fade in toward target alpha
    if (this._displayAlpha < this._targetAlpha) {
      this._displayAlpha = Math.min(this._targetAlpha, this._displayAlpha + 3 * dtFactor);
    }

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

  draw(ctx) {
    // Per-particle color: slow noise drives a lerp from cool blue-grey shadow to bright white.
    // Gives each cloud internal light/shadow variation without flickering.
    const shadeNoise = this.perlin.noise2D(
      this.noiseOffsetX * this.opts.noiseScale * 0.4 + 300,
      this.noiseOffsetY * this.opts.noiseScale * 0.4 + 300
    );
    const cr = Math.round(lerp(200, 255, shadeNoise));
    const cg = Math.round(lerp(218, 255, shadeNoise));
    const cb = Math.round(lerp(242, 255, shadeNoise));
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

    ctx.globalAlpha = this._displayAlpha / 255;

    // Circle instead of square — reads as a soft round puff
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Noise-driven core density: slow-oscillating denser sub-circle
    // Samples a separate region of noise space (+500) so it is independent from motion.
    const coreNoise = this.perlin.noise2D(
      this.noiseOffsetX * this.opts.noiseScale * 1.5 + 500,
      this.noiseOffsetY * this.opts.noiseScale * 1.5 + 500
    );
    if (coreNoise < this.opts.coreChance) {
      const ox = randRange(-this.opts.coreOffset, this.opts.coreOffset);
      const oy = randRange(-this.opts.coreOffset, this.opts.coreOffset);
      ctx.beginPath();
      ctx.arc(
        this.x + ox,
        this.y + oy,
        this.size * this.opts.coreScale,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
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

    this.resize();
    this.initParticles();

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
      this.lastT = null; // reset timing to avoid a large dt spike on resume
      this._rafId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  // Build (or rebuild on resize) the cached sky and sun gradient objects.
  // Both are drawn each frame in fadeBackground() at fadeAlpha, so the canvas
  // naturally converges to the combined appearance of sky + sun warmth at equilibrium.
  _buildGradients() {
    const { ctx, w, h } = this;

    // Sky: deep azure at zenith transitions down to pale near the horizon
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0,   'rgb(28, 100, 190)');
    sky.addColorStop(0.5, 'rgb(120, 195, 248)');
    sky.addColorStop(1.0, 'rgb(188, 225, 255)');
    this._skyGrad = sky;

    // Sun warmth: soft radial glow anchored in the upper-right.
    // Drawn alongside the sky fade each frame so the canvas settles at a sky
    // that has the warmth permanently baked into the equilibrium state.
    const sx = w * 0.82, sy = h * 0.08, sr = Math.min(w, h) * 0.55;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sun.addColorStop(0,   'rgba(255, 252, 215, 0.18)');
    sun.addColorStop(0.4, 'rgba(255, 242, 185, 0.06)');
    sun.addColorStop(1.0, 'rgba(255, 240, 160, 0)');
    this._sunGrad = sun;
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
    this.ctx.fillStyle = this._sunGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);

    for (const p of this.particles) p.resize(this.w, this.h);
  }

  initParticles() {
    this.particles.length = 0;

    const opts = {
      perlin: this.perlin,
      width: this.w,
      height: this.h,
      skyTop: this.h * 0.5,

      // size is now a circle radius
      sizeMin: 2,
      sizeMax: 5,
      alphaMin: 100,
      alphaMax: 180,
      speedMin: 0.5,
      speedMax: 1.2,

      noiseStep: 0.005,
      noiseScale: 1.0,
      verticalDrift: 0.5,

      coreChance: 0.3,
      coreOffset: 2,
      coreScale: 0.8,
    };

    // Cloud clusters: spawn particles in soft elliptical groups so the sky
    // starts with recognizable cloud shapes rather than uniform noise.
    const numClusters = 5;
    const clusters = Array.from({ length: numClusters }, () => ({
      cx: randRange(this.w * 0.05, this.w * 0.95),
      cy: randRange(this.h * 0.05, this.h * 0.42),
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
        Math.max(0, Math.min(this.h * 0.5, y)),
        opts
      ));
    }

    // Sort back-to-front by depth so near particles render on top of far ones
    this.particles.sort((a, b) => a.depth - b.depth);

    // Initial sky fill
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = this._sunGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  fadeBackground() {
    this.ctx.save();
    this.ctx.globalAlpha = this.fadeAlpha;
    // Both gradients at the same alpha — the canvas converges to their combined appearance
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.fillStyle = this._sunGrad;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.restore();
  }

  loop(t) {
    if (this.lastT === null) this.lastT = t; // clean first-frame timing
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    this.fadeBackground();

    // fillStyle is set per-particle in draw() for color shading
    for (const p of this.particles) {
      p.update(dt);
      p.draw(this.ctx);
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

// Boot
new CloudSystem({ canvas: document.querySelector("#c"), numParticles: 500 });
