(function () {
  const SESSION_KEY = 'orbitCurrentUser';
  const TOKEN_KEY = 'orbitAuthToken';
  const page = location.pathname.split('/').pop() || 'index.html';
  const API_BASE = localStorage.getItem('orbitApiBase') ||
    (window.location.protocol === 'file:' ? 'http://127.0.0.1:3000/api' : `${window.location.origin}/api`);
  const PUBLIC_PAGES = new Set([
    'index.html',
    'loading.html',
    'workshops.html',
    'iss.html',
    'vr.html',
    'photography.html',
    'community.html',
    'long-horizon-exchange.html',
  ]);
  const isPublicPage = PUBLIC_PAGES.has(page);

  function readStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function initialsFor(name) {
    return String(name || 'SkyFolk Guest')
      .split(/\s+/)
      .map(part => part[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SF';
  }

  function levelFor(stardust) {
    const value = Number(stardust) || 0;
    return Math.max(1, Math.floor(value / 200) + 1);
  }

  function applyUser(user) {
    if (!user) return;

    const displayName = user.displayName || 'SkyFolk Guest';
    const stardust = Number(user.stardustBalance || 0);
    const initials = initialsFor(displayName);

    document.querySelectorAll('.profile-name').forEach(node => {
      node.textContent = displayName;
    });

    document.querySelectorAll('.profile-avatar').forEach(node => {
      node.textContent = initials;
    });

    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) profileBtn.textContent = initials;

    const profileRole = document.querySelector('.profile-role');
    if (profileRole) profileRole.textContent = `Explorer Level ${levelFor(stardust)}`;

    const formatted = stardust.toLocaleString('en-IN');
    ['myStardust', 'profileStardust', 'navStardust'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.textContent = formatted;
    });
  }

  async function syncSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = readStoredUser();

    if (storedUser) {
      applyUser(storedUser);
    }

    if (!token) {
      if (!isPublicPage) location.href = 'index.html';
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const user = await response.json();
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      applyUser(user);

      if (page === 'index.html') {
        location.href = 'workshops.html';
      }
    } catch {
      clearSession();
      if (!isPublicPage) location.href = 'index.html';
    }
  }

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-profile-action="signout"]');
    if (!action) return;

    clearSession();
    location.href = 'index.html';
  });

  window.SkyFolkSession = {
    readStoredUser,
    applyUser,
    syncSession
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncSession, { once: true });
  } else {
    syncSession();
  }
})();
