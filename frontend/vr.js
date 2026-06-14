/* =============================================================
   app.js
   UI logic for VR WORLD. To add another destination:
     1. Add an entry to SCENES below
     2. Add a matching <a-entity id="scene-<id>" class="scene-group">
        block inside <a-scene> in index.html
   Everything else (menu card, switching, HUD) wires up automatically.
   ============================================================= */

let SCENES = [
  {
    id: 'saturn',
    icon: '🪐',
    accent: '#D8B26B',
    name: "Saturn's Ring Plane",
    desc: "Float inside Saturn's rings - ice boulders drifting past, the gas giant looming overhead.",
    mode: 'Desktop + VR',
    status: 'stable'
  },
  {
    id: 'moon',
    icon: '🌕',
    accent: '#C9CDD3',
    name: 'Apollo 11: Tranquility Base',
    desc: 'Walk the lunar surface beside the Eagle lander and look back at Earth from the Moon.',
    mode: 'Desktop + VR',
    status: 'stable'
  },
  {
    id: 'blackhole',
    icon: '🌑',
    accent: '#FF6600',
    name: 'Stellar Black Hole',
    desc: 'Stand before a black hole - accretion disk blazing, relativistic jets firing, light bending around the event horizon.',
    mode: '360 mode',
    status: 'stable'
  },
  {
    id: 'pulsar',
    icon: '💫',
    accent: '#88CCFF',
    name: 'Millisecond Pulsar',
    desc: 'Watch a neutron star spin 716 times per second, sweeping twin lighthouse beams across space.',
    mode: 'Desktop + VR',
    status: 'stable'
  },
  {
    id: 'earthiss',
    icon: '🛰️',
    accent: '#5EE6D9',
    name: 'Earth Orbit: ISS Overlook',
    desc: 'Hover above Earth and watch the ISS cross the limb in low orbit.',
    mode: 'Phone + desktop',
    status: 'live'
  },
  {
    id: 'solarsystem',
    icon: '🌌',
    accent: '#FDB813',
    name: 'The Solar System',
    desc: 'Fly through a scaled orbital model of the Sun and all 8 planets, Saturn with visible rings.',
    mode: 'Desktop + VR',
    status: 'stable'
  },
  {
    id: 'supernova',
    icon: '✨',
    accent: '#FF8F7A',
    name: 'Supernova Timeline',
    desc: 'Stand inside an expanding shock front as a massive star tears itself apart.',
    mode: 'Desktop + VR',
    status: 'beta'
  },
  {
    id: 'cme',
    icon: '☀️',
    accent: '#F0A060',
    name: 'Solar Flare and CME Corridor',
    desc: 'Follow a coronal mass ejection as it leaves the Sun and heads toward Earth.',
    mode: 'Desktop + VR',
    status: 'beta'
  }
];

const api = window.SkyFolkApi;

const starCanvas = document.getElementById('starCanvas');
const starCtx = starCanvas ? starCanvas.getContext('2d') : null;

let starW = 0;
let starH = 0;
let stars = [];
let mouse = { x: -999, y: -999 };
let resolvedConstellations = [];

const CONSTELLATIONS = [
  { stars: [[0.08,0.20],[0.11,0.27],[0.09,0.34],[0.14,0.30],[0.19,0.30],[0.17,0.22],[0.20,0.38]], lines: [[0,1],[1,2],[1,3],[3,4],[4,5],[4,6]] },
  { stars: [[0.75,0.08],[0.80,0.14],[0.85,0.09],[0.90,0.15],[0.95,0.10]], lines: [[0,1],[1,2],[2,3],[3,4]] },
  { stars: [[0.55,0.12],[0.60,0.10],[0.65,0.11],[0.70,0.14],[0.72,0.20],[0.68,0.24],[0.63,0.22]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]] },
  { stars: [[0.82,0.55],[0.86,0.60],[0.84,0.66],[0.80,0.71],[0.76,0.75],[0.74,0.80],[0.78,0.83],[0.83,0.82]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[5,7]] },
  { stars: [[0.28,0.55],[0.32,0.50],[0.37,0.48],[0.42,0.52],[0.40,0.58],[0.35,0.62],[0.30,0.61]], lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]] },
  { stars: [[0.50,0.30],[0.47,0.36],[0.53,0.36],[0.46,0.42],[0.54,0.42]], lines: [[0,1],[0,2],[1,3],[2,4],[3,4]] },
  { stars: [[0.16,0.68],[0.20,0.62],[0.24,0.68],[0.20,0.72],[0.18,0.78],[0.23,0.79]], lines: [[0,1],[1,2],[1,3],[3,4],[3,5]] },
  { stars: [[0.36,0.16],[0.40,0.20],[0.44,0.24],[0.40,0.28],[0.36,0.32],[0.47,0.18],[0.33,0.25]], lines: [[0,1],[1,2],[2,3],[3,4],[1,5],[2,6]] }
];

document.addEventListener('DOMContentLoaded', () => {
  initOrbitBackground();
  buildMenu();
  wireGlobalControls();
  loadImmersiveOverview();
});

function initOrbitBackground() {
  if (!starCanvas || !starCtx) return;

  function resizeStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    starW = window.innerWidth;
    starH = window.innerHeight;
    starCanvas.width = Math.floor(starW * dpr);
    starCanvas.height = Math.floor(starH * dpr);
    starCanvas.style.width = `${starW}px`;
    starCanvas.style.height = `${starH}px`;
    starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resolvedConstellations = CONSTELLATIONS.map(item => ({
      ...item,
      px: item.stars.map(([rx, ry]) => ({ x: rx * starW, y: ry * starH }))
    }));
    stars = Array.from({ length: Math.floor((starW * starH) / 2700) }, () => ({
      x: Math.random() * starW,
      y: Math.random() * starH,
      r: Math.random() * 1.65 + 0.42,
      alpha: Math.random() * 0.62 + 0.18,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.014 + 0.004
    }));
  }

  function drawStars() {
    starCtx.clearRect(0, 0, starW, starH);

    const skyGlow = starCtx.createRadialGradient(starW * 0.5, starH * 0.42, 0, starW * 0.5, starH * 0.42, Math.max(starW, starH) * 0.55);
    skyGlow.addColorStop(0, 'rgba(45, 60, 135, 0.10)');
    skyGlow.addColorStop(1, 'rgba(45, 60, 135, 0)');
    starCtx.fillStyle = skyGlow;
    starCtx.fillRect(0, 0, starW, starH);

    stars.forEach(star => {
      star.twinkle += star.speed;
      const alpha = Math.min(1, Math.max(0.05, star.alpha + Math.sin(star.twinkle) * 0.15));
      starCtx.fillStyle = `rgba(210, 220, 255, ${alpha})`;
      starCtx.beginPath();
      starCtx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      starCtx.fill();
    });

    resolvedConstellations.forEach(item => {
      const pulse = 0.58 + Math.sin(Date.now() * 0.0015 + item.px.length) * 0.24;
      starCtx.strokeStyle = `rgba(145, 170, 255, ${0.18 + pulse * 0.12})`;
      starCtx.lineWidth = 0.82;
      starCtx.setLineDash([2, 7]);
      starCtx.beginPath();
      item.lines.forEach(([a, b]) => {
        starCtx.moveTo(item.px[a].x, item.px[a].y);
        starCtx.lineTo(item.px[b].x, item.px[b].y);
      });
      starCtx.stroke();
      starCtx.setLineDash([]);

      item.px.forEach(point => {
        starCtx.fillStyle = `rgba(174, 203, 255, ${0.18 + pulse * 0.22})`;
        starCtx.beginPath();
        starCtx.arc(point.x, point.y, 9, 0, Math.PI * 2);
        starCtx.fill();
        starCtx.fillStyle = `rgba(220, 235, 255, ${0.72 + pulse * 0.22})`;
        starCtx.beginPath();
        starCtx.arc(point.x, point.y, 2.55, 0, Math.PI * 2);
        starCtx.fill();
      });
    });

    requestAnimationFrame(drawStars);
  }

  window.addEventListener('mousemove', event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = -999;
    mouse.y = -999;
  });

  window.addEventListener('resize', resizeStars);
  resizeStars();
  drawStars();
}

/* -------------------------------------------------------------
   Build the scene-select cards from the SCENES config
   ------------------------------------------------------------- */
function buildMenu() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';

  SCENES.forEach((scene, index) => {
    if (!document.getElementById(`scene-${scene.id}`)) return;
    const card = document.createElement('button');
    card.className = 'scene-card';
    card.style.setProperty('--card-accent', scene.accent);
    card.setAttribute('aria-label', `Launch ${scene.name} simulation`);

    card.innerHTML = `
      <span class="scene-index">TARGET 0${index + 1}</span>
      <span class="scene-icon" aria-hidden="true">${scene.icon}</span>
      <span class="scene-name">${scene.name}</span>
      <span class="scene-desc">${scene.desc}</span>
      ${scene.metricValue ? `
        <span class="scene-reading">${scene.metricValue}</span>
        <span class="scene-detail">${scene.metricDetail || ''}</span>
        <span class="scene-source">${scene.sourceLabel || ''}</span>
      ` : ''}
      <span class="scene-meta">
        <span class="scene-mode">${scene.mode || 'Desktop + VR'}</span>
        <span class="scene-status">${scene.status || 'stable'}</span>
      </span>
    `;

    card.addEventListener('click', () => activateScene(scene.id));
    grid.appendChild(card);
  });
}

async function loadImmersiveOverview() {
  if (!api) return;

  try {
    const result = await api.get('/immersive/overview');
    const availableIds = new Set(Array.from(document.querySelectorAll('.scene-group')).map(node => node.id.replace('scene-', '')));
    const missionMap = new Map((result.missions || []).map(mission => [mission.id, mission]));

    SCENES = SCENES
      .map(scene => missionMap.has(scene.id) ? { ...scene, ...missionMap.get(scene.id) } : scene)
      .filter(scene => availableIds.has(scene.id));

    const missionCount = document.getElementById('mission-count');
    if (missionCount) {
      const count = result.telemetry?.missionsOnline || SCENES.length;
      missionCount.textContent = `MISSION SELECT - ${count} ACTIVE TARGETS`;
    }

    const footer = document.getElementById('mission-footer-copy');
    if (footer && result.telemetry) {
      footer.textContent = `${result.telemetry.orbitUnit} · ${result.telemetry.skyVisibility} · WebXR ready`;
    }

    const highlights = Array.isArray(result.highlights) ? result.highlights : [];
    const watch = highlights[0];
    const solar = highlights[1];
    const relativity = highlights[2];

    if (watch) {
      document.getElementById('brief-watch-value').textContent = watch.value;
      document.getElementById('brief-watch-detail').textContent = watch.detail;
    }
    if (solar) {
      document.getElementById('brief-solar-value').textContent = solar.value;
      document.getElementById('brief-solar-detail').textContent = solar.detail;
    }
    if (relativity) {
      document.getElementById('brief-relativity-value').textContent = relativity.value;
      document.getElementById('brief-relativity-detail').textContent = relativity.detail;
    }

    buildMenu();
  } catch (error) {
    console.error(error);
  }
}

/* -------------------------------------------------------------
   Global controls: back buttons + VR enter/exit handling
   ------------------------------------------------------------- */
function wireGlobalControls() {
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', returnToMenu);
  wireProfileMenu();

  // The in-VR back button is an <a-plane> inside A-Frame - it fires
  // A-Frame's own 'click' event (via raycaster), not a DOM click.
  // We wait for the scene to load before attaching so the element exists.
  const sceneEl = document.getElementById('vr-scene');
  sceneEl.addEventListener('loaded', () => {
    const vrBackBtn = document.getElementById('vr-back-btn');
    if (vrBackBtn) vrBackBtn.addEventListener('click', returnToMenu);
  });

  // Only switch to the 3D in-VR HUD when a real XR headset session is
  // active. On desktop, A-Frame fires `enter-vr` for fullscreen too -
  // in that case we keep the normal 2D HUD so the back button still works.
  sceneEl.addEventListener('enter-vr', () => {
    const xrSession = sceneEl.xrSession;
    const isDesktopFullscreen = xrSession && xrSession.environmentBlendMode === 'opaque-desktop';
    const presenting = sceneEl.renderer && sceneEl.renderer.xr && sceneEl.renderer.xr.isPresenting;
    if (presenting && !isDesktopFullscreen) {
      document.body.classList.add('in-vr');
      const vrHud = document.getElementById('vr-hud');
      if (vrHud) vrHud.setAttribute('visible', true);
      // Show the reticle cursor for gaze-clicking the in-VR HUD
      const reticle = document.querySelector('[cursor]');
      if (reticle) reticle.setAttribute('visible', true);
    }
  });

  sceneEl.addEventListener('exit-vr', () => {
    document.body.classList.remove('in-vr');
    const vrHud = document.getElementById('vr-hud');
    if (vrHud) vrHud.setAttribute('visible', false);
    const reticle = document.querySelector('[cursor]');
    if (reticle) reticle.setAttribute('visible', false);
  });
}

function wireProfileMenu() {
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (!profileBtn || !profileMenu) return;

  const closeProfile = () => {
    profileMenu.classList.add('hidden');
    profileBtn.setAttribute('aria-expanded', 'false');
  };

  profileBtn.addEventListener('click', event => {
    event.stopPropagation();
    const isOpen = !profileMenu.classList.contains('hidden');
    profileMenu.classList.toggle('hidden', isOpen);
    profileBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  profileMenu.addEventListener('click', event => {
    event.stopPropagation();
  });

  document.addEventListener('click', closeProfile);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeProfile();
  });

  document.querySelectorAll('[data-profile-action]').forEach(button => {
    button.addEventListener('click', () => {
      closeProfile();
    });
  });
}

/* -------------------------------------------------------------
   Scene switching
   ------------------------------------------------------------- */
function activateScene(id) {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) return;

  const sceneEl = document.getElementById('vr-scene');
  if (!sceneEl) return;

  // Swap overlays
  const menuOverlay = document.getElementById('menu-overlay');
  const hud = document.getElementById('hud');
  const cameraRig = document.getElementById('cameraRig');
  if (menuOverlay) menuOverlay.classList.add('hidden');
  sceneEl.classList.remove('hidden-scene');
  if (hud) hud.classList.remove('hidden');
  document.body.classList.add('scene-active');

  // Reset the camera rig to its default starting point each time a new
  // scene loads - prevents the user from spawning far away after flying
  // around a large scene (e.g. the Solar System) with WASD.
  if (cameraRig) cameraRig.setAttribute('position', '0 1.6 0');

  // Show only the requested scene group; hide all others.
  // Toggling `visible` (rather than adding/removing entities) keeps
  // every scene preloaded and instant to switch between.
  document.querySelectorAll('.scene-group').forEach((el) => {
    el.setAttribute('visible', el.id === `scene-${id}`);
  });

  // Update both the 2D HUD and the in-VR HUD readouts
  const hudTitle = document.getElementById('hud-title');
  if (hudTitle) hudTitle.textContent = scene.name;
  const vrTitle = document.getElementById('vr-hud-title');
  if (vrTitle) vrTitle.setAttribute('value', scene.name);

  setTimeout(() => {
  window.dispatchEvent(new Event('resize'));
  if (sceneEl.renderer) {
    sceneEl.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  if (sceneEl.resize) sceneEl.resize();
}, 50);
}

/* -------------------------------------------------------------
   Return to the mission-select menu
   ------------------------------------------------------------- */
function returnToMenu() {
  const menuOverlay = document.getElementById('menu-overlay');
  const sceneEl = document.getElementById('vr-scene');
  const hud = document.getElementById('hud');
  if (menuOverlay) menuOverlay.classList.remove('hidden');
  if (sceneEl) sceneEl.classList.add('hidden-scene');
  if (hud) hud.classList.add('hidden');
  document.body.classList.remove('scene-active');

  document.querySelectorAll('.scene-group').forEach((el) => {
    el.setAttribute('visible', false);
  });

  // If the user backs out while still in a VR session, exit it too
  if (sceneEl && sceneEl.is('vr-mode')) {
    sceneEl.exitVR();
  }
}
