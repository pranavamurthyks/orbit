(function () {
  
  const API_BASE = localStorage.getItem('orbitApiBase') || 'https://orbit-fkec.onrender.com';
  function getToken() {
    return localStorage.getItem('orbitAuthToken');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('orbitCurrentUser') || 'null');
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem('orbitCurrentUser', JSON.stringify(user));
    if (window.SkyFolkSession && typeof window.SkyFolkSession.applyUser === 'function') {
      window.SkyFolkSession.applyUser(user);
    }
  }

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  window.SkyFolkApi = {
    API_BASE,
    getToken,
    getUser,
    setUser,
    get: path => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  };
})();
