const LOGIN_PAGE = 'index.html';
const DASHBOARD_PAGE = 'workshops.html';
const AUTH_TOKEN_KEY = 'orbitAuthToken';

const app = document.getElementById('app');
const starsCanvas = document.getElementById('stars-canvas');
const bhCanvas = document.getElementById('bh-canvas');
const rippleCanvas = document.getElementById('ripple-canvas');
const scene = document.getElementById('scene');
const statusText = document.getElementById('status');

const sCtx = starsCanvas.getContext('2d');
const bhCtx = bhCanvas.getContext('2d');
const rCtx = rippleCanvas.getContext('2d');

let W = 0;
let H = 0;
let dpr = 1;
let blackholeW = 760;
let blackholeH = 520;
let stars = [];
let startTime = null;
let redirecting = false;

const STATUS = [
  [0, 'Reading the starfield'],
  [1400, 'Event horizon approaching'],
  [2900, 'Opening SkyFolk']
];

const CONSTELLATIONS = [
  {
    stars: [[0.08, 0.28], [0.12, 0.34], [0.17, 0.27], [0.22, 0.34], [0.28, 0.31]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
  },
  {
    stars: [[0.70, 0.16], [0.75, 0.23], [0.80, 0.18], [0.86, 0.25], [0.92, 0.2]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
  }
];

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp01 = value => Math.min(1, Math.max(0, value));

function resizeCanvas(canvas, ctx, width, height) {
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  const rect = scene.getBoundingClientRect();
  blackholeW = rect.width || 760;
  blackholeH = rect.height || 520;

  resizeCanvas(starsCanvas, sCtx, W, H);
  resizeCanvas(rippleCanvas, rCtx, W, H);
  resizeCanvas(bhCanvas, bhCtx, blackholeW, blackholeH);
  generateStars();
}

function generateStars() {
  const count = Math.floor((W * H) / 3000);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.45 + 0.3,
    a: Math.random() * 0.56 + 0.16,
    speed: Math.random() * 0.012 + 0.004,
    phase: Math.random() * Math.PI * 2
  }));
}

function drawStars(t, approach) {
  sCtx.clearRect(0, 0, W, H);

  const glow = sCtx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.62);
  glow.addColorStop(0, `rgba(45, 60, 135, ${0.1 + approach * 0.08})`);
  glow.addColorStop(0.5, 'rgba(35, 45, 110, 0.04)');
  glow.addColorStop(1, 'rgba(35, 45, 110, 0)');
  sCtx.fillStyle = glow;
  sCtx.fillRect(0, 0, W, H);

  for (const s of stars) {
    s.phase += s.speed;
    const drift = approach * 5;
    const alpha = Math.min(1, Math.max(0.04, s.a + Math.sin(s.phase) * 0.13));
    const x = s.x + (s.x - W * 0.5) * approach * 0.012;
    const y = s.y + (s.y - H * 0.5) * approach * 0.012 + Math.sin(s.phase) * drift * 0.08;

    sCtx.beginPath();
    sCtx.arc(x, y, s.r * (1 + approach * 0.15), 0, Math.PI * 2);
    sCtx.fillStyle = `rgba(210, 220, 255, ${alpha})`;
    sCtx.fill();
  }

  drawConstellations(t);
}

function drawConstellations(t) {
  sCtx.save();
  sCtx.lineWidth = 0.6;
  sCtx.setLineDash([2, 8]);

  for (const c of CONSTELLATIONS) {
    const points = c.stars.map(([x, y]) => ({
      x: x * W,
      y: y * H + Math.sin(t * 0.00028 + x * 8) * 1.8
    }));

    sCtx.beginPath();
    for (const [a, b] of c.lines) {
      sCtx.moveTo(points[a].x, points[a].y);
      sCtx.lineTo(points[b].x, points[b].y);
    }
    sCtx.strokeStyle = 'rgba(120, 150, 230, 0.06)';
    sCtx.stroke();

    for (const p of points) {
      sCtx.beginPath();
      sCtx.arc(p.x, p.y, 1.9, 0, Math.PI * 2);
      sCtx.fillStyle = 'rgba(185, 203, 255, 0.3)';
      sCtx.fill();
    }
  }

  sCtx.setLineDash([]);
  sCtx.restore();
}

function drawBlackHole(t, approach) {
  const w = blackholeW;
  const h = blackholeH;
  const cx = w / 2;
  const cy = h * 0.52;
  const zoom = 0.66 + easeOutCubic(approach) * 0.58;
  const outerR = Math.min(w * 0.34, h * 0.42) * zoom;
  const diskH = outerR * 0.18;
  const coreR = outerR * 0.29;
  const pulse = 0.92 + Math.sin(t * 0.002) * 0.08;
  const spin = t * 0.001;

  bhCtx.clearRect(0, 0, w, h);

  const lens = bhCtx.createRadialGradient(cx, cy, coreR * 0.6, cx, cy, outerR * 1.55);
  lens.addColorStop(0, 'rgba(0, 0, 8, 0)');
  lens.addColorStop(0.28, `rgba(155, 178, 255, ${0.14 + approach * 0.08})`);
  lens.addColorStop(0.55, `rgba(70, 95, 220, ${0.08 + approach * 0.04})`);
  lens.addColorStop(1, 'rgba(70, 95, 220, 0)');
  bhCtx.fillStyle = lens;
  bhCtx.beginPath();
  bhCtx.arc(cx, cy, outerR * 1.58, 0, Math.PI * 2);
  bhCtx.fill();

  bhCtx.save();
  bhCtx.translate(cx, cy);

  drawDisk(-1, outerR, diskH, spin, approach);
  drawCore(coreR, pulse, approach);
  drawDisk(1, outerR, diskH, spin, approach);

  bhCtx.restore();
}

function drawDisk(side, outerR, diskH, spin, approach) {
  bhCtx.save();
  bhCtx.beginPath();
  if (side < 0) {
    bhCtx.rect(-outerR * 1.2, -diskH * 3.2, outerR * 2.4, diskH * 3.2);
  } else {
    bhCtx.rect(-outerR * 1.2, 0, outerR * 2.4, diskH * 3.2);
  }
  bhCtx.clip();

  const fill = bhCtx.createLinearGradient(-outerR, 0, outerR, 0);
  fill.addColorStop(0, 'rgba(95, 125, 255, 0.03)');
  fill.addColorStop(0.2, `rgba(142, 168, 255, ${0.12 + approach * 0.05})`);
  fill.addColorStop(0.48, `rgba(226, 235, 255, ${0.34 + approach * 0.12})`);
  fill.addColorStop(0.66, `rgba(132, 160, 255, ${0.18 + approach * 0.08})`);
  fill.addColorStop(1, 'rgba(95, 125, 255, 0.03)');

  bhCtx.shadowColor = 'rgba(120, 155, 255, 0.55)';
  bhCtx.shadowBlur = 18 + approach * 14;
  bhCtx.fillStyle = fill;
  bhCtx.beginPath();
  bhCtx.ellipse(0, 0, outerR, diskH, 0, 0, Math.PI * 2);
  bhCtx.fill();

  for (let i = 0; i < 9; i++) {
    const p = i / 8;
    const rx = outerR * (1 - p * 0.34);
    const ry = diskH * (1 - p * 0.52);
    const shimmer = 0.8 + Math.sin(spin * 2.4 + i * 0.85) * 0.2;
    const alpha = (0.08 + p * 0.2 + approach * 0.05) * shimmer * (side > 0 ? 1 : 0.62);

    bhCtx.beginPath();
    bhCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    bhCtx.strokeStyle = i < 2
      ? `rgba(220, 232, 255, ${alpha})`
      : `rgba(116, 145, 255, ${alpha})`;
    bhCtx.lineWidth = 2.1 - p * 1;
    bhCtx.stroke();
  }

  bhCtx.restore();
}

function drawCore(coreR, pulse, approach) {
  const core = bhCtx.createRadialGradient(0, 0, 0, 0, 0, coreR * 1.08);
  core.addColorStop(0, 'rgba(0, 0, 5, 1)');
  core.addColorStop(0.7, 'rgba(0, 0, 8, 1)');
  core.addColorStop(0.9, 'rgba(2, 4, 18, 0.98)');
  core.addColorStop(1, 'rgba(3, 6, 24, 0)');
  bhCtx.fillStyle = core;
  bhCtx.beginPath();
  bhCtx.arc(0, 0, coreR * (1 + approach * 0.06), 0, Math.PI * 2);
  bhCtx.fill();

  const rim = bhCtx.createRadialGradient(0, 0, coreR * 0.88, 0, 0, coreR * 1.8);
  rim.addColorStop(0, 'rgba(220, 232, 255, 0)');
  rim.addColorStop(0.32, `rgba(205, 220, 255, ${(0.22 + approach * 0.12) * pulse})`);
  rim.addColorStop(0.62, `rgba(100, 130, 255, ${(0.14 + approach * 0.08) * pulse})`);
  rim.addColorStop(1, 'rgba(100, 130, 255, 0)');
  bhCtx.fillStyle = rim;
  bhCtx.beginPath();
  bhCtx.arc(0, 0, coreR * 1.85, 0, Math.PI * 2);
  bhCtx.fill();
}

function drawTransition(progress) {
  rCtx.clearRect(0, 0, W, H);
  if (progress <= 0) return;

  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.max(W, H) * (0.1 + progress * 0.92);
  const fade = 1 - progress;
  const glow = rCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, `rgba(220, 232, 255, ${0.26 * fade})`);
  glow.addColorStop(0.34, `rgba(120, 155, 255, ${0.16 * fade})`);
  glow.addColorStop(1, 'rgba(120, 155, 255, 0)');
  rCtx.fillStyle = glow;
  rCtx.fillRect(0, 0, W, H);
}

function updateStatus(elapsed) {
  let current = STATUS[0][1];
  for (const [time, label] of STATUS) {
    if (elapsed >= time) current = label;
  }
  if (statusText.textContent !== current) statusText.textContent = current;
}

function loop(ts) {
  if (!startTime) startTime = ts;
  const elapsed = ts - startTime;
  const approach = easeInOut(clamp01(elapsed / 3600));
  const transition = clamp01((elapsed - 3300) / 900);

  updateStatus(elapsed);
  drawStars(ts, approach);
  drawBlackHole(ts, approach);
  drawTransition(transition);

  if (!redirecting && elapsed > 4300) {
    redirecting = true;
    app.style.transition = 'opacity 0.72s ease, filter 0.72s ease';
    app.style.opacity = '0';
    app.style.filter = 'blur(10px)';
    setTimeout(() => {
      window.location.href = localStorage.getItem(AUTH_TOKEN_KEY) ? DASHBOARD_PAGE : LOGIN_PAGE;
    }, 740);
  }

  if (!redirecting) requestAnimationFrame(loop);
}

resize();
window.addEventListener('resize', resize);
requestAnimationFrame(loop);
