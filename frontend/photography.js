// ── Starfield ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('starCanvas');
const ctx    = canvas.getContext('2d');
let W, H, stars = [], constellations = [];
let mouse = { x: -999, y: -999 };
const HOVER_RADIUS = 104;
const api = window.SkyFolkApi;

const CONSTELLATION_BLUEPRINTS = [
  {
    name: 'Orion',
    points: [[0.08, 0.20], [0.11, 0.27], [0.09, 0.34], [0.14, 0.30], [0.19, 0.30], [0.17, 0.22], [0.20, 0.38]],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 6]],
  },
  {
    name: 'Cassiopeia',
    points: [[0.75, 0.08], [0.80, 0.14], [0.85, 0.09], [0.90, 0.15], [0.95, 0.10]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: 'Ursa Major',
    points: [[0.55, 0.12], [0.60, 0.10], [0.65, 0.11], [0.70, 0.14], [0.72, 0.20], [0.68, 0.24], [0.63, 0.22]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]],
  },
  {
    name: 'Scorpius',
    points: [[0.82, 0.55], [0.86, 0.60], [0.84, 0.66], [0.80, 0.71], [0.76, 0.75], [0.74, 0.80], [0.78, 0.83], [0.83, 0.82]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [5, 7]],
  },
  {
    name: 'Leo',
    points: [[0.28, 0.55], [0.32, 0.50], [0.37, 0.48], [0.42, 0.52], [0.40, 0.58], [0.35, 0.62], [0.30, 0.61]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
  },
  {
    name: 'Lyra',
    points: [[0.50, 0.30], [0.47, 0.36], [0.53, 0.36], [0.46, 0.42], [0.54, 0.42]],
    links: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]],
  },
  {
    name: 'Aquila',
    points: [[0.16, 0.68], [0.20, 0.62], [0.24, 0.68], [0.20, 0.72], [0.18, 0.78], [0.23, 0.79]],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5]],
  },
  {
    name: 'Cygnus',
    points: [[0.36, 0.16], [0.40, 0.20], [0.44, 0.24], [0.40, 0.28], [0.36, 0.32], [0.47, 0.18], [0.33, 0.25]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [2, 6]],
  },
  {
    name: 'Draco',
    points: [[0.60, 0.70], [0.65, 0.66], [0.70, 0.70], [0.74, 0.76], [0.69, 0.82], [0.63, 0.80]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
];

function resizeCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  buildStars();
  buildConstellations();
}

function buildStars() {
  stars = Array.from({ length: Math.floor(W * H / 3000) }, () => ({
    x:  Math.random() * W,
    y:  Math.random() * H,
    r:  Math.random() * 1.8 + 0.45,
    a:  Math.random() * 0.68 + 0.24,
    ph: Math.random() * Math.PI * 2,
    sp: Math.random() * 0.012 + 0.003,
  }));
}

function buildConstellations() {
  constellations = CONSTELLATION_BLUEPRINTS.map(c => ({
    name: c.name,
    links: c.links,
    points: c.points.map(([x, y]) => ({
      x: x * W,
      y: y * H,
      pulse: Math.random() * Math.PI * 2,
    })),
  }));
}

function getHoveredConstellation() {
  for (const c of constellations) {
    for (const p of c.points) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < HOVER_RADIUS) return c;
    }
  }
  return null;
}

function drawConstellations() {
  const hovered = getHoveredConstellation();

  for (const c of constellations) {
    const isHovered = hovered && hovered.name === c.name;

    ctx.save();
    ctx.lineWidth = isHovered ? 1.25 : 0.65;
    ctx.strokeStyle = isHovered ? 'rgba(174, 203, 255, 0.66)' : 'rgba(115, 145, 220, 0.16)';
    ctx.shadowBlur = isHovered ? 14 : 6;
    ctx.shadowColor = isHovered ? 'rgba(135, 165, 255, 0.34)' : 'rgba(135, 165, 255, 0.12)';
    ctx.setLineDash(isHovered ? [] : [2, 7]);

    for (const [from, to] of c.links) {
      const a = c.points[from];
      const b = c.points[to];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (const p of c.points) {
      p.pulse += 0.01;
      const pulse = Math.sin(p.pulse) * (isHovered ? 0.35 : 0.08);
      const r = isHovered ? 3.8 + pulse : 2.15;
      const a = isHovered ? 0.96 : 0.62 + pulse;

      if (isHovered) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
        glow.addColorStop(0, 'rgba(205, 225, 255, 0.40)');
        glow.addColorStop(0.28, 'rgba(135, 165, 255, 0.18)');
        glow.addColorStop(1, 'rgba(180, 210, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? `rgba(220,235,255,${a})` : `rgba(180,200,255,${a})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(135,164,255,${isHovered ? 0.035 : 0.018})`;
      ctx.fill();
    }

    ctx.restore();
  }

  return hovered;
}

function drawStars() {
  ctx.clearRect(0, 0, W, H);
  drawConstellations();

  for (const s of stars) {
    s.ph += s.sp;
    const a = Math.min(1, Math.max(0.08, s.a + Math.sin(s.ph) * 0.18));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,220,255,${a})`;
    ctx.fill();

    if (a > 0.66) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(135,164,255,${(a - 0.66) * 0.16})`;
      ctx.fill();
    }
  }
  requestAnimationFrame(drawStars);
}

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = -999;
  mouse.y = -999;
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
drawStars();

// ── NASA image data ───────────────────────────────────────────────────────
const PHOTO_SEEDS = [
  {
    category: 'nebula',
    title: 'Orion Nebula in Infrared',
    author: 'NASA/ESA/JPL-Caltech',
    initials: 'NA',
    stardust: 842,
    desc: 'Official NASA image-library asset PIA25434. Spitzer, WISE, and Herschel data reveal dust cavities and star-forming filaments in the Orion Nebula.',
    date: 'Nov 22, 2022',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA25434/PIA25434~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA25434/PIA25434~large.jpg',
  },
  {
    category: 'galaxy',
    title: 'Andromeda Galaxy',
    author: 'NASA/JPL/Caltech',
    initials: 'NA',
    stardust: 920,
    desc: 'Official NASA image-library asset PIA04921 from the Galaxy Evolution Explorer, showing Messier 31 in ultraviolet light.',
    date: 'Dec 10, 2003',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA04921/PIA04921~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA04921/PIA04921~large.jpg',
  },
  {
    category: 'planet',
    title: 'Jupiter Marble',
    author: 'NASA/JPL-Caltech/SwRI/MSSS',
    initials: 'NA',
    stardust: 774,
    desc: 'Official NASA image-library asset PIA22946. Juno captured this color-enhanced view of Jupiter and the Great Red Spot during a close pass.',
    date: 'Mar 21, 2019',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA22946/PIA22946~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA22946/PIA22946~large.jpg',
  },
  {
    category: 'aurora',
    title: 'Aurora Australis from the ISS',
    author: 'NASA/JSC',
    initials: 'NA',
    stardust: 536,
    desc: 'Official NASA image-library asset iss006e28961. Expedition Six photographed a green aurora over Earth shortly after sunset.',
    date: 'Feb 16, 2003',
    imgUrl: 'https://images-assets.nasa.gov/image/iss006e28961/iss006e28961~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/iss006e28961/iss006e28961~large.jpg',
  },
  {
    category: 'moon',
    title: 'Nearside of the Moon',
    author: 'ISRO/NASA/JPL-Caltech/Brown Univ.',
    initials: 'NA',
    stardust: 688,
    desc: 'Official NASA image-library asset PIA12235. A detailed view of the lunar nearside from Chandrayaan-1 data.',
    date: 'Sep 24, 2009',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA12235/PIA12235~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA12235/PIA12235~orig.jpg',
  },
  {
    category: 'nebula',
    title: 'A Flame in Orion Belt',
    author: 'NASA/JPL-Caltech/UCLA',
    initials: 'NA',
    stardust: 611,
    desc: 'Official NASA image-library asset PIA13448. WISE captured the Flame Nebula, Horsehead Nebula, and NGC 2023 in the Orion Molecular Cloud.',
    date: 'Dec 2, 2010',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA13448/PIA13448~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA13448/PIA13448~large.jpg',
  },
  {
    category: 'galaxy',
    title: 'Virgo Galaxy Cluster',
    author: 'NASA/JPL-Caltech/SSC',
    initials: 'NA',
    stardust: 453,
    desc: 'Official NASA image-library asset PIA07906. The Galaxy Evolution Explorer observed a small ultraviolet view of the Virgo Cluster.',
    date: 'May 5, 2005',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA07906/PIA07906~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA07906/PIA07906~large.jpg',
  },
  {
    category: 'planet',
    title: 'Jupiter Great Red Spot',
    author: 'NASA/JPL',
    initials: 'NA',
    stardust: 702,
    desc: 'Official NASA image-library asset PIA01370. Voyager imagery focuses on Jupiter and its long-lived Great Red Spot.',
    date: 'Dec 5, 1998',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA01370/PIA01370~small.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA01370/PIA01370~orig.jpg',
  },
  {
    category: 'moon',
    title: 'Color of the Moon',
    author: 'NASA/GSFC/Arizona State University',
    initials: 'NA',
    stardust: 498,
    desc: 'Official NASA image-library asset PIA13517 from Lunar Reconnaissance Orbiter data, mapping subtle color variations across the Moon.',
    date: 'Sep 10, 2010',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA13517/PIA13517~small.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA13517/PIA13517~orig.jpg',
  },
  {
    category: 'aurora',
    title: 'Aurora Borealis at Kennedy Space Center',
    author: 'NASA/Ben Smegelsky',
    initials: 'NA',
    stardust: 430,
    desc: 'Official NASA image-library asset KSC-20251111-PH-JBS01_0011. A faint aurora glows above Launch Complex 39B at Kennedy Space Center.',
    date: 'Nov 11, 2025',
    imgUrl: 'https://images-assets.nasa.gov/image/KSC-20251111-PH-JBS01_0011/KSC-20251111-PH-JBS01_0011~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/KSC-20251111-PH-JBS01_0011/KSC-20251111-PH-JBS01_0011~large.jpg',
  },
  {
    category: 'nebula',
    title: 'Seeing Beyond the Monkey Head',
    author: 'NASA/JPL-Caltech',
    initials: 'NA',
    stardust: 570,
    desc: 'Official NASA image-library asset PIA19836. Spitzer reveals baby stars inside the dusty star-forming region NGC 2174.',
    date: 'Aug 20, 2015',
    imgUrl: 'https://images-assets.nasa.gov/image/PIA19836/PIA19836~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/PIA19836/PIA19836~large.jpg',
  },
  {
    category: 'galaxy',
    title: 'Hubble Hockey Stick Galaxy',
    author: 'ESA/Hubble & NASA',
    initials: 'NA',
    stardust: 387,
    desc: 'Official NASA image-library asset GSFC_20171208_Archive_e000012. Hubble frames NGC 4656, a warped galaxy shaped by interactions with neighbors.',
    date: 'Dec 8, 2017',
    imgUrl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000012/GSFC_20171208_Archive_e000012~medium.jpg',
    fullUrl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000012/GSFC_20171208_Archive_e000012~large.jpg',
  },
];

// Assign heights for masonry feel
const heights = [180, 220, 260, 200, 240, 160, 280, 210, 190, 250, 230, 170];

let photos = PHOTO_SEEDS.map((p, i) => ({
  ...p,
  id: i,
  imgH: heights[i % heights.length],
  given: false,
}));

let myStardust = getInitialStardust();
let activeFilter = 'all';
let currentLbId  = null;
let selectedGiftAmount = 10;
let selectedUploadFile = null;
let communityMeta = {
  weeklyChallenge: null,
  darkSkySpots: [],
  communityFavoriteCount: 0,
};
let darkSkyMap = null;
let darkSkyMarkers = [];
let activeSpotName = null;
const categoryLabels = {
  nebula: 'Nebula',
  planet: 'Planet',
  galaxy: 'Galaxy',
  aurora: 'Aurora',
  moon: 'Moon',
};

function slugifyCategory(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatCategory(category) {
  return categoryLabels[category] || category
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function setupFilterButton(btn) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderGrid();
  });
}

function ensureCategoryFilter(category, label = formatCategory(category)) {
  if (category === 'all' || document.querySelector(`.filter-btn[data-filter="${category}"]`)) return;
  categoryLabels[category] = label;

  const sep = document.querySelector('.filter-sep');
  const btn = document.createElement('button');
  btn.className = 'filter-btn';
  btn.dataset.filter = category;
  btn.textContent = label;
  setupFilterButton(btn);
  sep.before(btn);
}

function ensureCategoryOption(category, label = formatCategory(category)) {
  if (document.querySelector(`#photoCategory option[value="${category}"]`)) return;
  categoryLabels[category] = label;

  const option = document.createElement('option');
  option.value = category;
  option.textContent = label;
  photoCategory.querySelector('option[value="create"]').before(option);
}

// ── Render grid ───────────────────────────────────────────────────────────
function filteredPhotos() {
  const sort = document.getElementById('sortSelect').value;
  let list = activeFilter === 'all'
    ? [...photos]
    : photos.filter(p => p.category === activeFilter);

  if (sort === 'stardust') list.sort((a,b) => b.stardust - a.stardust);
  else if (sort === 'mine') list = list.filter(p => p.author === getCurrentUserName());
  else list.sort((a,b) => getPhotoTime(b) - getPhotoTime(a));

  return list;
}

function getPhotoTime(photo) {
  if (photo.date === 'Today') return Date.now();

  const time = Date.parse(photo.date);
  return Number.isNaN(time) ? photo.id : time;
}

function updateStats() {
  const total = photos.reduce((sum, photo) => sum + photo.stardust, 0);
  document.getElementById('totalPhotos').textContent = photos.length;
  document.getElementById('totalStardust').textContent = (total / 1000).toFixed(1) + 'k';
  document.getElementById('favoriteCount').textContent = communityMeta.communityFavoriteCount || 0;
}

function spotConfidenceLabel(confidence) {
  return {
    high: 'High confidence',
    medium: 'Growing evidence',
    emerging: 'Emerging signal',
  }[confidence] || 'Community signal';
}

function updateSpotDetail(spot) {
  const title = document.getElementById('spotDetailTitle');
  const confidence = document.getElementById('spotDetailConfidence');
  const copy = document.getElementById('spotDetailCopy');
  const grid = document.getElementById('spotDetailGrid');

  if (!spot) {
    title.textContent = 'Choose a spot';
    confidence.textContent = 'Waiting';
    copy.textContent = 'Select a marker or one of the ranked locations to inspect the crowd evidence behind that site.';
    grid.innerHTML = `
      <div class="spot-detail-stat"><span>Dark-sky score</span><strong>-</strong></div>
      <div class="spot-detail-stat"><span>Submissions</span><strong>-</strong></div>
      <div class="spot-detail-stat"><span>Proof-rich shots</span><strong>-</strong></div>
      <div class="spot-detail-stat"><span>Recent uploads</span><strong>-</strong></div>
    `;
    return;
  }

  title.textContent = spot.name;
  confidence.textContent = spotConfidenceLabel(spot.confidence);
  copy.textContent = `${spot.submissions} uploads have clustered here, with ${spot.proofSubmissions || 0} proof-rich captures and ${spot.recentSubmissions || 0} recent submissions.${spot.lastCaptureLabel ? ` Latest evidence: ${spot.lastCaptureLabel}.` : ''}`;
  grid.innerHTML = `
    <div class="spot-detail-stat"><span>Dark-sky score</span><strong>${spot.avgDarkSky || 0}/100</strong></div>
    <div class="spot-detail-stat"><span>Submissions</span><strong>${spot.submissions}</strong></div>
    <div class="spot-detail-stat"><span>Proof-rich shots</span><strong>${spot.proofSubmissions || 0}</strong></div>
    <div class="spot-detail-stat"><span>Recent uploads</span><strong>${spot.recentSubmissions || 0}</strong></div>
  `;
}

function ensureDarkSkyMap() {
  if (darkSkyMap || !window.L) return;

  darkSkyMap = window.L.map('darkSkyMap', {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([22.5, 79], 4);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(darkSkyMap);
}

function focusDarkSkySpot(name) {
  activeSpotName = name;
  const spots = Array.isArray(communityMeta.darkSkySpots) ? communityMeta.darkSkySpots : [];
  const spot = spots.find(item => item.name === name) || null;
  updateSpotDetail(spot);
  renderCommunityMeta();

  if (spot && darkSkyMap && spot.lat !== null && spot.lng !== null) {
    darkSkyMap.flyTo([spot.lat, spot.lng], Math.max(darkSkyMap.getZoom(), 6), { duration: 0.8 });
    const marker = darkSkyMarkers.find(item => item.name === name);
    if (marker) marker.leaflet.openPopup();
  }
}

function renderDarkSkyMap() {
  ensureDarkSkyMap();
  if (!darkSkyMap) return;

  darkSkyMarkers.forEach(item => item.leaflet.remove());
  darkSkyMarkers = [];

  const spots = (Array.isArray(communityMeta.darkSkySpots) ? communityMeta.darkSkySpots : [])
    .filter(spot => spot.lat !== null && spot.lng !== null);

  if (!spots.length) {
    updateSpotDetail(null);
    return;
  }

  const bounds = [];
  spots.forEach((spot) => {
    const radius = Math.max(8, Math.min(22, Number(spot.avgDarkSky || 0) / 5));
    const marker = window.L.circleMarker([spot.lat, spot.lng], {
      radius,
      color: spot.avgDarkSky >= 80 ? '#f0a060' : spot.avgDarkSky >= 60 ? '#aec0ff' : '#6ee7d8',
      weight: 1.5,
      fillColor: spot.avgDarkSky >= 80 ? '#f0a060' : spot.avgDarkSky >= 60 ? '#6887ff' : '#6ee7d8',
      fillOpacity: 0.32,
    }).addTo(darkSkyMap);

    marker.bindPopup(`
      <div class="darksky-popup">
        <strong>${spot.name}</strong>
        <span>dark-sky ${spot.avgDarkSky || 0}/100 · ${spot.submissions} uploads</span>
        <span>${spot.topCategory ? `top category: ${formatCategory(spot.topCategory)} · ` : ''}${spot.lastCaptureLabel || 'community evidence'}</span>
      </div>
    `);
    marker.on('click', () => focusDarkSkySpot(spot.name));

    darkSkyMarkers.push({
      name: spot.name,
      leaflet: marker,
    });
    bounds.push([spot.lat, spot.lng]);
  });

  if (bounds.length === 1) {
    darkSkyMap.setView(bounds[0], 6);
  } else {
    darkSkyMap.fitBounds(bounds, { padding: [28, 28] });
  }
  window.setTimeout(() => darkSkyMap.invalidateSize(), 0);

  if (!activeSpotName && spots[0]) {
    activeSpotName = spots[0].name;
  }
  updateSpotDetail(spots.find(spot => spot.name === activeSpotName) || spots[0]);
}

function renderCommunityMeta() {
  const challenge = communityMeta.weeklyChallenge;
  const spots = Array.isArray(communityMeta.darkSkySpots) ? communityMeta.darkSkySpots : [];
  const topSpots = spots.slice(0, 3);

  document.getElementById('challengeTitle').textContent = challenge?.title || 'Community challenge';
  document.getElementById('challengePrompt').textContent = challenge?.prompt || 'Upload a real-sky moment connected to this week’s observing theme.';
  document.getElementById('favoriteSummary').textContent =
    `${communityMeta.communityFavoriteCount || 0} gallery shots have crossed the community-favorite threshold.`;
  document.getElementById('mapSpotCount').textContent = `${spots.filter(spot => spot.lat !== null && spot.lng !== null).length} mapped spots`;

  const spotList = document.getElementById('spotList');
  if (!topSpots.length) {
    spotList.innerHTML = '<span>No location data yet. Upload from your next dark-sky trip.</span>';
    return;
  }

  spotList.innerHTML = topSpots.map(spot => `
    <button class="spot-item${activeSpotName === spot.name ? ' active' : ''}" type="button" data-spot-name="${spot.name}">
      <strong>${spot.name}</strong>
      <span class="spot-meta">${spot.submissions} shots · ${spot.stardust} ✦ · dark-sky ${spot.avgDarkSky || 0}/100</span>
      <span class="spot-meta">${spot.lat !== null && spot.lng !== null ? `${Number(spot.lat).toFixed(2)}, ${Number(spot.lng).toFixed(2)}` : 'Location label only'}${spot.topCategory ? ` · ${formatCategory(spot.topCategory)}` : ''}</span>
    </button>
  `).join('');

  spotList.querySelectorAll('[data-spot-name]').forEach(button => {
    button.addEventListener('click', () => focusDarkSkySpot(button.dataset.spotName));
  });
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const list = filteredPhotos();
  grid.innerHTML = '';
  updateStats();
  renderCommunityMeta();
  renderDarkSkyMap();

  if (list.length === 0) {
    grid.innerHTML = '<div style="color:rgba(180,190,230,0.4);font-size:14px;padding:48px;text-align:center;grid-column:1/-1;">No photos in this category yet. Be the first to upload!</div>';
    return;
  }

  for (const p of list) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.dataset.id = p.id;
    card.innerHTML = `
      <img src="${p.imgUrl}" alt="${p.title}" style="height:${p.imgH}px" loading="lazy" />
      <div class="card-body">
        <div class="card-title">${p.title}</div>
        <div class="card-category${p.communityFavorite ? ' favorite' : ''}">${p.communityFavorite ? 'Community Favorite' : formatCategory(p.category)}</div>
        ${p.locationName ? `<div class="card-location">${p.locationName}</div>` : ''}
        <div class="card-meta">
          <div class="card-author">
            <div class="mini-avatar">${p.initials}</div>
            ${p.author}
          </div>
          <div class="card-stardust">
            <span class="star-icon">✦</span>
            ${p.stardust}
          </div>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(p.id));
    grid.appendChild(card);
  }

}

// ── Filter buttons ────────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(setupFilterButton);

document.getElementById('sortSelect').addEventListener('change', renderGrid);

// ── Lightbox ──────────────────────────────────────────────────────────────
function openLightbox(id) {
  const p = photos.find(x => x.id === id);
  if (!p) return;
  currentLbId = id;

  document.getElementById('lbImg').src        = p.fullUrl || p.imgUrl;
  document.getElementById('lbTitle').textContent  = p.title;
  document.getElementById('lbAuthor').textContent = p.author;
  document.getElementById('lbCategory').textContent = formatCategory(p.category);
  document.getElementById('lbDesc').textContent   = p.desc;
  document.getElementById('lbDate').textContent   = p.date;
  document.getElementById('lbAvatar').textContent = p.initials;
  document.getElementById('lbStarCount').textContent = p.stardust;

  const btn = document.getElementById('lbStarBtn');
  btn.classList.toggle('given', p.given);
  updateGiftControls(p.given);

  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.body.style.overflow = '';
  currentLbId = null;
}

document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbBackdrop').addEventListener('click', closeLightbox);

document.getElementById('lbPrev').addEventListener('click', e => {
  e.stopPropagation();
  const list = filteredPhotos();
  const idx  = list.findIndex(p => p.id === currentLbId);
  if (idx > 0) openLightbox(list[idx - 1].id);
});

document.getElementById('lbNext').addEventListener('click', e => {
  e.stopPropagation();
  const list = filteredPhotos();
  const idx  = list.findIndex(p => p.id === currentLbId);
  if (idx < list.length - 1) openLightbox(list[idx + 1].id);
});

document.addEventListener('keydown', e => {
  if (document.getElementById('lightbox').classList.contains('hidden')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft')  document.getElementById('lbPrev').click();
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
});

// ── Stardust ──────────────────────────────────────────────────────────────
const customStardust = document.getElementById('customStardust');

function getGiftAmount() {
  if (selectedGiftAmount === 'custom') {
    return Math.floor(Number(customStardust.value));
  }

  return selectedGiftAmount;
}

function updateGiftControls(given = false) {
  const amount = getGiftAmount();
  const label = document.getElementById('lbStarBtn').querySelector('.star-label');
  const gift = document.getElementById('stardustGift');

  gift.classList.toggle('given', given);
  label.textContent = given
    ? 'Stardust Given ✓'
    : Number.isFinite(amount) && amount > 0
      ? `Give ${amount} Stardust`
      : 'Give Stardust';
}

document.querySelectorAll('.gift-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.gift-chip').forEach(btn => btn.classList.remove('active'));
    chip.classList.add('active');

    selectedGiftAmount = chip.dataset.amount === 'custom'
      ? 'custom'
      : Number(chip.dataset.amount);

    customStardust.classList.toggle('hidden', selectedGiftAmount !== 'custom');
    if (selectedGiftAmount === 'custom') customStardust.focus();

    const p = photos.find(x => x.id === currentLbId);
    updateGiftControls(Boolean(p && p.given));
  });
});

customStardust.addEventListener('input', () => {
  const p = photos.find(x => x.id === currentLbId);
  updateGiftControls(Boolean(p && p.given));
});

function updateProfileStats() {
  const userUploads = photos.filter(photo => photo.author === getCurrentUserName()).length;
  const userGiven = photos.filter(photo => photo.given).length;

  document.getElementById('profileStardust').textContent = myStardust.toLocaleString();
  document.getElementById('profileUploads').textContent = userUploads;
  document.getElementById('profileGiven').textContent = userGiven;
}

document.getElementById('lbStarBtn').addEventListener('click', async () => {
  if (currentLbId === null) return;
  const p = photos.find(x => x.id === currentLbId);
  if (!p) return;

  if (p.given) {
    showToast('You already gave stardust for this photo ✦', 'gold');
    return;
  }

  const cost = getGiftAmount();
  if (!Number.isFinite(cost) || cost < 1) {
    showToast('Choose how much stardust to give');
    return;
  }

  if (myStardust < cost) {
    showToast('Not enough stardust to give!');
    return;
  }

  try {
    const result = await api.post(`/photos/${p.id}/gift`, { amount: cost });
    p.given = true;
    p.stardust = result.photo.stardust;
    myStardust = result.balance;
    updateLocalBalance(result.balance);

    document.getElementById('myStardust').textContent = myStardust.toLocaleString();
    document.getElementById('lbStarCount').textContent = p.stardust;
    updateProfileStats();
    const btn = document.getElementById('lbStarBtn');
    btn.classList.add('given');
    updateGiftControls(true);

    const total = photos.reduce((s, x) => s + x.stardust, 0);
    document.getElementById('totalStardust').textContent = (total / 1000).toFixed(1) + 'k';

    renderGrid();
    showToast(`✦ +${cost} stardust sent to ${p.author}!`, 'gold');
  } catch (error) {
    showToast(error.message);
  }
});

// ── Upload modal ──────────────────────────────────────────────────────────
const fab         = document.getElementById('fabBtn');
const backdrop    = document.getElementById('modalBackdrop');
const modalClose  = document.getElementById('modalClose');
const dropZone    = document.getElementById('dropZone');
const dropInner   = document.getElementById('dropInner');
const fileInput   = document.getElementById('fileInput');
const previewImg  = document.getElementById('previewImg');
const photoCategory = document.getElementById('photoCategory');
const newCategory = document.getElementById('newCategory');
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

fab.addEventListener('click', () => backdrop.classList.remove('hidden'));
modalClose.addEventListener('click', closeModal);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });

function closeModal() {
  backdrop.classList.add('hidden');
  previewImg.classList.add('hidden');
  dropInner.style.display = 'flex';
  fileInput.value = '';
  selectedUploadFile = null;
  document.getElementById('photoTitle').value = '';
  document.getElementById('photoDesc').value  = '';
  photoCategory.value = 'nebula';
  newCategory.value = '';
  newCategory.classList.add('hidden');
  document.getElementById('photoCapturedAt').value = '';
  document.getElementById('photoLocation').value = '';
  document.getElementById('photoLatitude').value = '';
  document.getElementById('photoLongitude').value = '';
  document.getElementById('photoCamera').value = '';
  document.getElementById('photoMetaStatus').textContent = 'EXIF or your device location can seed dark-sky scoring and Passport proofs.';
}

photoCategory.addEventListener('change', () => {
  newCategory.classList.toggle('hidden', photoCategory.value !== 'create');
  if (photoCategory.value === 'create') newCategory.focus();
});

// Drag & drop
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) previewFile(file);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) previewFile(fileInput.files[0]);
});

function toDateTimeLocalValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

async function hydratePhotoMetadataFromExif(file) {
  const status = document.getElementById('photoMetaStatus');
  if (!window.exifr?.parse) {
    status.textContent = 'EXIF auto-read is unavailable in this browser. You can still enter capture metadata manually.';
    return;
  }

  try {
    const metadata = await window.exifr.parse(file, [
      'GPSLatitude',
      'GPSLongitude',
      'DateTimeOriginal',
      'DateTimeDigitized',
      'CreateDate',
      'Model'
    ]);

    if (!metadata) {
      status.textContent = 'No EXIF metadata was found. Add capture time and location manually if you want verification.';
      return;
    }

    if (typeof metadata.GPSLatitude === 'number') {
      document.getElementById('photoLatitude').value = metadata.GPSLatitude.toFixed(6);
    }
    if (typeof metadata.GPSLongitude === 'number') {
      document.getElementById('photoLongitude').value = metadata.GPSLongitude.toFixed(6);
    }

    const capturedAt = metadata.DateTimeOriginal || metadata.DateTimeDigitized || metadata.CreateDate;
    if (capturedAt) {
      document.getElementById('photoCapturedAt').value = toDateTimeLocalValue(capturedAt);
    }

    if (metadata.Model && !document.getElementById('photoCamera').value.trim()) {
      document.getElementById('photoCamera').value = metadata.Model;
    }

    const seeded = [
      typeof metadata.GPSLatitude === 'number' && typeof metadata.GPSLongitude === 'number' ? 'GPS' : null,
      capturedAt ? 'capture time' : null,
      metadata.Model ? 'camera model' : null,
    ].filter(Boolean);
    status.textContent = seeded.length
      ? `Auto-filled ${seeded.join(', ')} from EXIF metadata.`
      : 'No useful EXIF fields were present. Add capture time and location manually if you want verification.';
  } catch (error) {
    status.textContent = 'EXIF parsing failed. You can still enter capture time and location manually.';
  }
}

function previewFile(file) {
  selectedUploadFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    previewImg.classList.remove('hidden');
    dropInner.style.display = 'none';
  };
  reader.readAsDataURL(file);
  hydratePhotoMetadataFromExif(file);
}

document.getElementById('photoUseLocation').addEventListener('click', () => {
  const status = document.getElementById('photoMetaStatus');
  if (!navigator.geolocation) {
    status.textContent = 'This browser cannot provide your location.';
    return;
  }
  status.textContent = 'Fetching your location...';
  navigator.geolocation.getCurrentPosition((position) => {
    document.getElementById('photoLatitude').value = position.coords.latitude.toFixed(6);
    document.getElementById('photoLongitude').value = position.coords.longitude.toFixed(6);
    status.textContent = 'Location attached from your device.';
  }, () => {
    status.textContent = 'Location access was denied.';
  });
});

document.getElementById('submitUpload').addEventListener('click', async () => {
  const title    = document.getElementById('photoTitle').value.trim();
  const selectedCategory = photoCategory.value;
  const customCategoryLabel = newCategory.value.trim();
  const category = selectedCategory === 'create'
    ? slugifyCategory(customCategoryLabel)
    : selectedCategory;
  const desc     = document.getElementById('photoDesc').value.trim();
  const locationName = document.getElementById('photoLocation').value.trim();
  const cameraLabel = document.getElementById('photoCamera').value.trim();
  const capturedAt = document.getElementById('photoCapturedAt').value;
  const latitude = document.getElementById('photoLatitude').value.trim();
  const longitude = document.getElementById('photoLongitude').value.trim();
  const imgSrc   = previewImg.src;

  if (!title) { showToast('Please add a title for your photo'); return; }
  if (selectedCategory === 'create' && !category) {
    showToast('Please name the new category');
    return;
  }
  if (!imgSrc || previewImg.classList.contains('hidden')) {
    showToast('Please select an image to upload'); return;
  }

  if (selectedCategory === 'create') {
    categoryLabels[category] = customCategoryLabel;
    ensureCategoryFilter(category, customCategoryLabel);
    ensureCategoryOption(category, customCategoryLabel);
  }

  try {
    const result = await api.post('/photos', {
      title,
      category,
      description: desc || 'Uploaded by the SkyFolk community.',
      locationName,
      cameraLabel,
      challengeTag: communityMeta.weeklyChallenge?.tag || '',
      imageUrl: imgSrc,
      capturedAt: capturedAt || null,
      latitude: latitude || null,
      longitude: longitude || null,
    });
    myStardust = result.balance;
    updateLocalBalance(result.balance);
    document.getElementById('myStardust').textContent = myStardust.toLocaleString();
    closeModal();
    await loadPhotos();
    showToast('✦ Photo published to the community!', 'gold');
    updateProfileStats();
  } catch (error) {
    showToast(error.message);
  }
});

// ── Profile menu ──────────────────────────────────────────────────────────
function closeProfileMenu() {
  profileMenu.classList.add('hidden');
  profileBtn.setAttribute('aria-expanded', 'false');
}

function toggleProfileMenu() {
  const isOpen = !profileMenu.classList.contains('hidden');

  if (isOpen) {
    closeProfileMenu();
    return;
  }

  updateProfileStats();
  profileMenu.classList.remove('hidden');
  profileBtn.setAttribute('aria-expanded', 'true');
}

profileBtn.addEventListener('click', e => {
  e.stopPropagation();
  toggleProfileMenu();
});

profileMenu.addEventListener('click', e => {
  e.stopPropagation();
});

document.addEventListener('click', closeProfileMenu);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeProfileMenu();
});

document.querySelectorAll('[data-profile-action]').forEach(button => {
  button.addEventListener('click', () => {
    const actionLabels = {
      uploads: 'My Uploads is coming next',
      saved: 'Saved Photos is coming next',
      settings: 'Profile Settings is coming next',
      signout: 'Signed out of demo profile',
    };

    closeProfileMenu();
    showToast(actionLabels[button.dataset.profileAction]);
  });
});

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent  = msg;
  toast.className    = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────
loadPhotos();
updateProfileStats();

async function loadPhotos() {
  try {
    const result = await api.get('/photos');
    communityMeta = {
      weeklyChallenge: result.weeklyChallenge || null,
      darkSkySpots: result.darkSkySpots || [],
      communityFavoriteCount: result.communityFavoriteCount || 0,
    };
    photos = result.photos.map((photo, index) => ({
      ...photo,
      imgH: heights[index % heights.length],
    }));
  } catch (error) {
    console.error(error);
  }

  renderGrid();
  updateProfileStats();
}

function updateLocalBalance(balance) {
  const user = api.getUser();
  if (!user) return;
  user.stardustBalance = balance;
  api.setUser(user);
}

function getCurrentUserName() {
  return api.getUser()?.displayName || 'SkyFolk Guest';
}
function getInitialStardust() {
  try {
    const user = JSON.parse(localStorage.getItem('orbitCurrentUser') || 'null');
    return Number(user?.stardustBalance ?? 1240);
  } catch {
    return 1240;
  }
}
