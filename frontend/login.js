const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const spaceCursor = document.getElementById('spaceCursor');

let W, H, stars = [], mouse = { x: -999, y: -999 };
let cursorAngle = -20;
const HOVER_RADIUS = 104;
const AUTH_USERS_KEY = 'orbitDemoUsers';
const AUTH_SESSION_KEY = 'orbitCurrentUser';

// Constellation definitions as relative [0-1] coords
const CONSTELLATIONS = [
  {
    name: 'Orion',
    stars: [
      [0.08, 0.20], [0.11, 0.27], [0.09, 0.34],
      [0.14, 0.30], [0.19, 0.30],
      [0.17, 0.22], [0.20, 0.38],
    ],
    lines: [[0,1],[1,2],[1,3],[3,4],[4,5],[4,6]]
  },
  {
    name: 'Cassiopeia',
    stars: [
      [0.75, 0.08], [0.80, 0.14], [0.85, 0.09],
      [0.90, 0.15], [0.95, 0.10]
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]]
  },
  {
    name: 'Ursa Major',
    stars: [
      [0.55, 0.12], [0.60, 0.10], [0.65, 0.11],
      [0.70, 0.14], [0.72, 0.20], [0.68, 0.24],
      [0.63, 0.22]
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]]
  },
  {
    name: 'Scorpius',
    stars: [
      [0.82, 0.55], [0.86, 0.60], [0.84, 0.66],
      [0.80, 0.71], [0.76, 0.75], [0.74, 0.80],
      [0.78, 0.83], [0.83, 0.82]
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[5,7]]
  },
  {
    name: 'Leo',
    stars: [
      [0.28, 0.55], [0.32, 0.50], [0.37, 0.48],
      [0.42, 0.52], [0.40, 0.58], [0.35, 0.62],
      [0.30, 0.61]
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]]
  },
  {
    name: 'Lyra',
    stars: [
      [0.50, 0.30], [0.47, 0.36], [0.53, 0.36],
      [0.46, 0.42], [0.54, 0.42]
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,4]]
  },
  {
    name: 'Aquila',
    stars: [
      [0.16, 0.68], [0.20, 0.62], [0.24, 0.68],
      [0.20, 0.72], [0.18, 0.78], [0.23, 0.79]
    ],
    lines: [[0,1],[1,2],[1,3],[3,4],[3,5]]
  },
  {
    name: 'Cygnus',
    stars: [
      [0.36, 0.16], [0.40, 0.20], [0.44, 0.24],
      [0.40, 0.28], [0.36, 0.32], [0.47, 0.18],
      [0.33, 0.25]
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[1,5],[2,6]]
  }
];

// Resolve relative coords to absolute pixel positions
function resolveConstellations() {
  return CONSTELLATIONS.map(c => ({
    ...c,
    px: c.stars.map(([rx, ry]) => ({ x: rx * W, y: ry * H }))
  }));
}

let resolved = [];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resolved = resolveConstellations();
}

// Generate random background stars
function generateStars() {
  stars = [];
  const count = Math.floor((W * H) / 2700);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.65 + 0.42,
      alpha: Math.random() * 0.62 + 0.18,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.014 + 0.004
    });
  }
}

// Check if mouse is near a constellation
function getHoveredConstellation() {
  for (const c of resolved) {
    for (const p of c.px) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < HOVER_RADIUS) return c;
    }
  }
  return null;
}

function drawFrame() {
  ctx.clearRect(0, 0, W, H);

  const hovered = getHoveredConstellation();

  const skyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.55);
  skyGlow.addColorStop(0, 'rgba(45, 60, 135, 0.10)');
  skyGlow.addColorStop(1, 'rgba(45, 60, 135, 0)');
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, W, H);

  // Draw background stars with twinkle
  for (const s of stars) {
    s.twinkle += s.speed;
    const flicker = Math.sin(s.twinkle) * 0.15;
    const a = Math.min(1, Math.max(0.05, s.alpha + flicker));
    ctx.fillStyle = `rgba(210, 220, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw constellation lines (always faint, brighter on hover)
  for (const c of resolved) {
    const isHovered = hovered && hovered.name === c.name;
    ctx.strokeStyle = isHovered
      ? 'rgba(174, 203, 255, 0.74)'
      : 'rgba(115, 145, 220, 0.13)';
    ctx.lineWidth = isHovered ? 1.25 : 0.65;
    ctx.setLineDash(isHovered ? [] : [2, 7]);
    ctx.beginPath();
    for (const [a, b] of c.lines) {
      ctx.moveTo(c.px[a].x, c.px[a].y);
      ctx.lineTo(c.px[b].x, c.px[b].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw constellation stars
    for (const p of c.px) {
      const isHovered2 = hovered && hovered.name === c.name;
      const pulse = isHovered2 ? Math.sin(Date.now() * 0.006) * 0.35 : 0;
      const r = isHovered2 ? 4.2 + pulse : 2.25;
      const alpha = isHovered2 ? 1.0 : 0.68;

      if (isHovered2) {
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
        grd.addColorStop(0, 'rgba(205, 225, 255, 0.45)');
        grd.addColorStop(0.28, 'rgba(135, 165, 255, 0.18)');
        grd.addColorStop(1, 'rgba(180, 210, 255, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 6.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isHovered2
        ? `rgba(220, 235, 255, ${alpha})`
        : `rgba(180, 200, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Tooltip
  if (hovered) {
    tooltip.textContent = hovered.name;
    tooltip.classList.remove('hidden');
    tooltip.style.left = (mouse.x + 22) + 'px';
    tooltip.style.top = (mouse.y - 16) + 'px';
  } else {
    tooltip.classList.add('hidden');
  }

  requestAnimationFrame(drawFrame);
}

// Mouse tracking
window.addEventListener('mousemove', e => {
  const dx = e.clientX - mouse.x;
  const dy = e.clientY - mouse.y;
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  if (spaceCursor) {
    if (Math.abs(dx) + Math.abs(dy) > 0.4) {
      cursorAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    }

    spaceCursor.style.opacity = '1';
    spaceCursor.style.transform = `translate(${mouse.x - 23}px, ${mouse.y - 23}px) rotate(${cursorAngle}deg)`;
  }
});

window.addEventListener('mouseleave', () => {
  mouse.x = -999;
  mouse.y = -999;
  if (spaceCursor) spaceCursor.style.opacity = '0';
});

window.addEventListener('resize', () => {
  resize();
  generateStars();
});

// Tab switching
function switchTab(tab) {
  document.getElementById('formLogin').classList.toggle('hidden', tab !== 'login');
  document.getElementById('formSignup').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
  clearMessage();
}

function handleLogin() {
  const email = getInputValue('loginEmail').toLowerCase();
  const password = getInputValue('loginPassword');
  const users = readUsers();
  const user = users.find(item => item.email === email);

  if (!isValidEmail(email) || !password) {
    return rejectAuth('Enter a valid email and password.');
  }

  if (!user || user.password !== password) {
    return rejectAuth('No matching Orbit account found. Check your details or create one.');
  }

  writeSession(user);
  showMessage(`Welcome back, ${user.name}. Launching Orbit...`, 'success');
  setTimeout(() => {
    window.location.href = 'photography.html';
  }, 450);
}

function handleSignup() {
  const name = getInputValue('signupName');
  const email = getInputValue('signupEmail').toLowerCase();
  const password = getInputValue('signupPassword');
  const users = readUsers();

  if (name.length < 2) {
    return rejectAuth('Add your full name so your Orbit profile has a callsign.');
  }

  if (!isValidEmail(email)) {
    return rejectAuth('Use a valid email address.');
  }

  if (password.length < 6) {
    return rejectAuth('Password must be at least 6 characters.');
  }

  if (users.some(item => item.email === email)) {
    return rejectAuth('That email already has an Orbit account. Log in instead.');
  }

  const user = {
    id: globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `orbit-${Date.now()}`,
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  writeSession(user);
  showMessage(`Account created. Welcome aboard, ${name}.`, 'success');
  setTimeout(() => {
    window.location.href = 'photography.html';
  }, 650);
}

function handleForgotPassword() {
  const email = getInputValue('loginEmail').toLowerCase();
  const user = readUsers().find(item => item.email === email);

  if (!isValidEmail(email)) {
    return rejectAuth('Enter your account email first.');
  }

  if (!user) {
    return rejectAuth('No local demo account exists for that email yet.');
  }

  showMessage('This demo stores accounts in this browser. Create a new account if you need a fresh password.', 'success');
}

function getInputValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : '';
}

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function writeSession(user) {
  const { password, ...safeUser } = user;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeUser));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function rejectAuth(message) {
  showMessage(message, 'error');
  shake();
}

function showMessage(message, type) {
  const status = document.getElementById('authMessage');
  if (!status) return;
  status.textContent = message;
  status.className = `auth-message ${type}`;
}

function clearMessage() {
  const status = document.getElementById('authMessage');
  if (!status) return;
  status.textContent = '';
  status.className = 'auth-message hidden';
}

function shake() {
  const card = document.getElementById('authCard');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = 'shake 0.4s ease';
}

// Shake keyframes injected via JS so no extra CSS file needed
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// Init
resize();
generateStars();
drawFrame();
