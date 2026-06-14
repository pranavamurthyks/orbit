const api = window.SkyFolkApi;
const form = document.getElementById('passportForm');
const entryList = document.getElementById('entryList');
const ledgerList = document.getElementById('ledgerList');
const statusBox = document.getElementById('passportStatus');
const converterInput = document.getElementById('screenTimeMinutes');
const converterResult = document.getElementById('converterResult');
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

let skyOverview = null;

function setStatus(message) {
  statusBox.textContent = message;
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function closeProfileMenu() {
  profileMenu.classList.add('hidden');
  profileBtn.setAttribute('aria-expanded', 'false');
}

function toggleProfileMenu() {
  const open = !profileMenu.classList.contains('hidden');
  profileMenu.classList.toggle('hidden', open);
  profileBtn.setAttribute('aria-expanded', String(!open));
}

function renderEntries(entries) {
  document.getElementById('passportCount').textContent = entries.length;
  document.getElementById('verifiedCount').textContent = entries.filter(entry => entry.verified).length;

  if (!entries.length) {
    entryList.innerHTML = '<div class="empty">No sightings logged yet. Add your first real sky moment.</div>';
    return;
  }

  entryList.innerHTML = entries.map(entry => `
    <article class="entry-card">
      <strong>${esc(entry.title)}</strong>
      <div class="entry-meta">
        <span class="chip">${esc(entry.type)}</span>
        <span class="chip">${esc(entry.locationName || 'SkyFolk field log')}</span>
        <span class="chip">+${entry.stardustAwarded} Stardust</span>
      </div>
      <p>${esc(entry.notes || 'Verified observation saved to your Cosmic Passport.')}</p>
      <span>${esc(entry.observedAtLabel || '')}</span>
    </article>
  `).join('');
}

function renderLedger(ledger, balance) {
  document.getElementById('balanceCount').textContent = Number(balance || 0).toLocaleString('en-IN');

  if (!ledger.length) {
    ledgerList.innerHTML = '<div class="empty">Your ledger will appear here after your first passport action.</div>';
    return;
  }

  ledgerList.innerHTML = ledger.slice(0, 6).map(item => `
    <div class="ledger-item">
      <strong>${item.amount > 0 ? '+' : ''}${item.amount} Stardust</strong>
      <span>${esc(item.reason)}</span>
    </div>
  `).join('');
}

function renderConverter() {
  const minutes = Math.max(0, Number(converterInput.value || 0));
  const issOrbitMinutes = 92.7;
  const orbits = (minutes / issOrbitMinutes).toFixed(2);
  const moonTrips = Math.round(minutes * 4.83);
  const forwardLook = skyOverview?.iss?.nextVisiblePassMinutes || 20;

  converterResult.innerHTML = `
    <strong>${minutes} minutes</strong> is about <strong>${orbits} ISS orbits</strong> of perspective.<br>
    It also reframes to about <strong>${moonTrips}</strong> round trips of light to the Moon.<br>
    Tonight, that same block could cover about <strong>${Math.max(1, Math.round(minutes / forwardLook))}</strong> visible-pass check-ins.
  `;
}

async function loadPassport() {
  setStatus('Loading your passport and stardust ledger...');

  try {
    const [passport, stardust, sky] = await Promise.all([
      api.get('/passport'),
      api.get('/stardust/me'),
      api.get('/sky/overview'),
    ]);

    skyOverview = sky;
    renderEntries(passport.entries);
    renderLedger(stardust.ledger, stardust.balance);
    document.getElementById('skyLabel').textContent = sky.sky.visibility;
    document.getElementById('moonLabel').textContent = sky.sky.moonPhase;
    renderConverter();
    setStatus('');
  } catch (error) {
    setStatus(error.message);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  setStatus('Saving observation...');

  try {
    const payload = {
      type: document.getElementById('entryType').value,
      title: document.getElementById('entryTitle').value.trim(),
      notes: document.getElementById('entryNotes').value.trim(),
      locationName: document.getElementById('entryLocation').value.trim(),
      observedAtLabel: document.getElementById('entryTimeLabel').value.trim(),
    };

    await api.post('/passport', payload);
    form.reset();
    converterInput.value = '180';
    await loadPassport();
    setStatus('Observation added to your Cosmic Passport.');
  } catch (error) {
    setStatus(error.message);
  }
});

converterInput.addEventListener('input', renderConverter);

profileBtn.addEventListener('click', event => {
  event.stopPropagation();
  toggleProfileMenu();
});

profileMenu.addEventListener('click', event => {
  event.stopPropagation();
});

document.addEventListener('click', closeProfileMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeProfileMenu();
});

loadPassport();
