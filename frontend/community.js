const pages = {
  landing: document.getElementById('page-landing'),
  host: document.getElementById('page-host'),
  participant: document.getElementById('page-participant'),
};

const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');
const profileStardust = document.getElementById('profileStardust');
const routeNames = Object.keys(pages);
const toast = document.getElementById('toast');
const navStardust = document.getElementById('navStardust');
const mapPicker = document.getElementById('mapPicker');
const mapIcon = document.getElementById('mapIcon');
const mapLabel = document.getElementById('mapLabel');
const mapCoords = document.getElementById('mapCoords');
const mapModal = document.getElementById('mapModal');
const mapModalBackdrop = document.getElementById('mapModalBackdrop');
const mapCloseBtn = document.getElementById('mapCloseBtn');
const mapUseLocationBtn = document.getElementById('mapUseLocationBtn');
const mapResetBtn = document.getElementById('mapResetBtn');
const mapConfirmBtn = document.getElementById('mapConfirmBtn');
const mapCancelBtn = document.getElementById('mapCancelBtn');
const mapSelectionStatus = document.getElementById('mapSelectionStatus');
const fundingToggle = document.getElementById('fundingToggle');
const fundingOptions = document.getElementById('fundingOptions');
const goalRow = document.getElementById('goalRow');
const goalAmount = document.getElementById('goalAmount');
const hostForm = document.getElementById('hostForm');
const sessionList = document.getElementById('sessionList');
const hostProgressLabel = document.getElementById('hostProgressLabel');
const hostStageLabel = document.getElementById('hostStageLabel');
const cosmosScene = document.getElementById('cosmosScene');
const progressPercent = document.getElementById('progressPercent');
const sessionEmpty = document.getElementById('sessionEmpty');
const sessionContent = document.getElementById('sessionContent');
const detailTitle = document.getElementById('detailTitle');
const detailDesc = document.getElementById('detailDesc');
const detailFacts = document.getElementById('detailFacts');
const detailCost = document.getElementById('detailCost');
const joinForm = document.getElementById('joinForm');
const bringingInput = document.getElementById('bringingInput');
const contributionAmount = document.getElementById('contributionAmount');
const contributionReference = document.getElementById('contributionReference');
const paymentLink = document.getElementById('paymentLink');
const crewList = document.getElementById('crewList');
const crewCount = document.getElementById('crewCount');
const hostActions = document.getElementById('hostActions');
const summaryBtn = document.getElementById('summaryBtn');
const cancelBtn = document.getElementById('cancelBtn');
const fundingSummary = document.getElementById('fundingSummary');
const fundingPoolMeta = document.getElementById('fundingPoolMeta');
const fundingMethodCard = document.getElementById('fundingMethodCard');
const fundingActionBar = document.getElementById('fundingActionBar');
const openPaymentBtn = document.getElementById('openPaymentBtn');
const copyPaymentBtn = document.getElementById('copyPaymentBtn');
const fundingQrCard = document.getElementById('fundingQrCard');
const fundingQrImage = document.getElementById('fundingQrImage');
const fundingQrCaption = document.getElementById('fundingQrCaption');
const fundingLedger = document.getElementById('fundingLedger');
const fundingSpendList = document.getElementById('fundingSpendList');
const contributionForm = document.getElementById('contributionForm');
const extraContributionAmount = document.getElementById('extraContributionAmount');
const extraContributionMethod = document.getElementById('extraContributionMethod');
const extraContributionReference = document.getElementById('extraContributionReference');
const api = window.SkyFolkApi;

let selectedFundingOption = null;
let selectedSessionId = null;
let toastTimer = null;
let myStardust = getInitialStardust();
let locationMap = null;
let locationMarker = null;
let pendingLocation = null;
let W = 0;
let H = 0;
let stars = [];
let mouse = { x: -999, y: -999 };
let resolvedConstellations = [];
let currentPaymentDetails = null;
let paymentRequestId = 0;

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

const progressFields = Array.from(document.querySelectorAll('[data-progress-field]'));
const formSteps = Array.from(document.querySelectorAll('.form-step'));

let demoSessions = [];

function resizeStars() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  resolvedConstellations = CONSTELLATIONS.map(item => ({
    ...item,
    px: item.stars.map(([rx, ry]) => ({ x: rx * W, y: ry * H }))
  }));
  stars = Array.from({ length: Math.floor(W * H / 3400) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.7 + 0.35,
    a: Math.random() * 0.62 + 0.18,
    ph: Math.random() * Math.PI * 2,
    sp: Math.random() * 0.012 + 0.003,
  }));
}

function drawStars() {
  ctx.clearRect(0, 0, W, H);

  resolvedConstellations.forEach((item, index) => {
    const pulse = 0.5 + Math.sin(Date.now() * 0.0014 + index) * 0.22;
    ctx.strokeStyle = `rgba(145, 170, 255, ${0.16 + pulse * 0.12})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 7]);
    ctx.beginPath();
    item.lines.forEach(([a, b]) => {
      ctx.moveTo(item.px[a].x, item.px[a].y);
      ctx.lineTo(item.px[b].x, item.px[b].y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    item.px.forEach(point => {
      const glow = 2.4 + pulse * 1.2;
      ctx.fillStyle = `rgba(174, 203, 255, ${0.22 + pulse * 0.24})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, glow * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(225, 235, 255, ${0.72 + pulse * 0.22})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, glow, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  stars.forEach(star => {
    star.ph += star.sp;
    const alpha = Math.min(1, Math.max(0.08, star.a + Math.sin(star.ph) * 0.16));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,220,255,${alpha})`;
    ctx.fill();
  });

  requestAnimationFrame(drawStars);
}

function showRoute(route, shouldUpdateHash = true) {
  const safeRoute = routeNames.includes(route) ? route : 'landing';

  routeNames.forEach(name => {
    pages[name].classList.toggle('active', name === safeRoute);
  });

  if (shouldUpdateHash) {
    const nextHash = safeRoute === 'landing' ? '' : `#${safeRoute}`;
    history.pushState({ route: safeRoute }, '', `${location.pathname}${nextHash}`);
  }

  if (safeRoute === 'participant' && selectedSessionId === null && demoSessions.length > 0) {
    selectSession(demoSessions[0].id);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateHostProgress();
}

function routeFromHash() {
  const hashRoute = location.hash.replace('#', '');
  return routeNames.includes(hashRoute) ? hashRoute : 'landing';
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

function updateStardust() {
  navStardust.textContent = myStardust.toLocaleString();
  profileStardust.textContent = myStardust.toLocaleString();
}

function isProgressFieldComplete(field) {
  if (field === mapPicker) return Boolean(mapPicker.dataset.lat);
  if (field.type === 'number' && field.id === 'sessionCapacity') return field.value.trim() !== '';
  return field.value.trim() !== '';
}

function updateHostProgress() {
  const completed = progressFields.filter(isProgressFieldComplete).length;
  const total = progressFields.length;
  const progress = total ? completed / total : 0;
  const scrollProgress = getHostScrollProgress();
  const sceneProgress = Math.max(progress, scrollProgress);
  const activeStep = getActiveStep();
  const stageLabel = activeStep ? activeStep.dataset.stageLabel : 'Waiting at launch deck';

  cosmosScene.style.setProperty('--scene-progress', sceneProgress.toFixed(3));
  progressPercent.textContent = `${Math.round(progress * 100)}%`;
  hostProgressLabel.textContent = `${completed} of ${total} checks complete`;
  hostStageLabel.textContent = completed === total ? 'Session ready to publish.' : stageLabel;
  document.body.dataset.hostStage = String(Math.min(8, completed));

  formSteps.forEach(step => {
    const fields = Array.from(step.querySelectorAll('[data-progress-field]'));
    const isComplete = fields.length > 0 && fields.every(isProgressFieldComplete);
    step.classList.toggle('is-complete', isComplete);
  });
}

function getHostScrollProgress() {
  const first = formSteps[0];
  const last = formSteps[formSteps.length - 1];
  if (!first || !last || !pages.host.classList.contains('active')) return 0;

  const start = first.offsetTop;
  const end = last.offsetTop + last.offsetHeight - window.innerHeight * 0.7;
  const span = Math.max(1, end - start);
  return Math.min(1, Math.max(0, (window.scrollY - start) / span));
}

function getActiveStep() {
  const midpoint = window.innerHeight * 0.45;
  let closest = formSteps[0];
  let closestDistance = Infinity;

  formSteps.forEach(step => {
    const rect = step.getBoundingClientRect();
    const distance = Math.abs(rect.top - midpoint);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = step;
    }
  });

  formSteps.forEach(step => step.classList.toggle('is-active', step === closest));
  return closest;
}

function setMapLocation(lat, lng, label) {
  mapPicker.classList.add('is-set');
  mapPicker.dataset.lat = String(lat);
  mapPicker.dataset.lng = String(lng);
  mapPicker.dataset.label = label;
  mapIcon.textContent = '✓';
  mapLabel.textContent = label;
  mapCoords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  const locationName = document.getElementById('locationName');
  if (!locationName.value.trim()) locationName.value = label;
  updateHostProgress();
}

function formatLatLng(lat, lng) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '16');
  url.searchParams.set('accept-language', 'en');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) return '';
    const result = await response.json();
    return String(result.display_name || '').trim();
  } catch {
    return '';
  }
}

function updatePendingLocation(lat, lng, label = '') {
  pendingLocation = {
    lat,
    lng,
    label: label || `Pinned location (${formatLatLng(lat, lng)})`,
  };

  if (locationMarker) {
    locationMarker.setLatLng([lat, lng]);
  } else if (locationMap && window.L) {
    locationMarker = window.L.marker([lat, lng]).addTo(locationMap);
  }

  if (locationMap) {
    locationMap.setView([lat, lng], Math.max(locationMap.getZoom(), 13), { animate: true });
  }

  mapSelectionStatus.textContent = `${pendingLocation.label} · ${formatLatLng(lat, lng)}`;
  mapConfirmBtn.disabled = false;
}

function ensureLocationMap() {
  if (locationMap || !window.L) return;

  locationMap = window.L.map('locationMap', {
    zoomControl: true,
    attributionControl: true,
  }).setView([20.5937, 78.9629], 4);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(locationMap);

  locationMap.on('click', async (event) => {
    updatePendingLocation(event.latlng.lat, event.latlng.lng);
    const label = await reverseGeocode(event.latlng.lat, event.latlng.lng);
    if (pendingLocation && pendingLocation.lat === event.latlng.lat && pendingLocation.lng === event.latlng.lng && label) {
      pendingLocation.label = label;
      mapSelectionStatus.textContent = `${label} · ${formatLatLng(event.latlng.lat, event.latlng.lng)}`;
    }
  });
}

function openMapModal() {
  ensureLocationMap();
  if (!locationMap) {
    showToast('Map tiles are unavailable right now');
    return;
  }
  mapModal.classList.remove('hidden');
  mapModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const savedLat = Number(mapPicker.dataset.lat || 0);
  const savedLng = Number(mapPicker.dataset.lng || 0);
  if (Number.isFinite(savedLat) && Number.isFinite(savedLng) && mapPicker.dataset.lat && mapPicker.dataset.lng) {
    updatePendingLocation(savedLat, savedLng, mapPicker.dataset.label || 'Saved location');
  } else {
    pendingLocation = null;
    mapSelectionStatus.textContent = 'No pin selected yet.';
    mapConfirmBtn.disabled = true;
  }

  setTimeout(() => locationMap?.invalidateSize(), 30);
}

function closeMapModal() {
  mapModal.classList.add('hidden');
  mapModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function useCurrentLocationForMap() {
  if (!navigator.geolocation) {
    showToast('This browser does not expose geolocation');
    return;
  }

  mapSelectionStatus.textContent = 'Looking up your current location...';
  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    updatePendingLocation(lat, lng, 'Current location');
    const label = await reverseGeocode(lat, lng);
    if (pendingLocation && pendingLocation.lat === lat && pendingLocation.lng === lng && label) {
      pendingLocation.label = label;
      mapSelectionStatus.textContent = `${label} · ${formatLatLng(lat, lng)}`;
    }
  }, () => {
    mapSelectionStatus.textContent = 'Location lookup was denied or unavailable.';
  }, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000,
  });
}

function clearFundingSelection() {
  selectedFundingOption = null;
  document.querySelectorAll('.funding-option').forEach(option => {
    option.classList.remove('selected');
  });
  goalRow.classList.remove('visible');
  goalAmount.value = '';
}

function collectHostPayload() {
  const fundingEnabled = fundingToggle.checked;

  return {
    title: document.getElementById('sessionTitle').value.trim(),
    description: document.getElementById('sessionDesc').value.trim(),
    date: document.getElementById('sessionDate').value,
    time: document.getElementById('sessionTime').value,
    capacity: document.getElementById('sessionCapacity').value || null,
    location: {
      name: document.getElementById('locationName').value.trim(),
      description: document.getElementById('locationDesc').value.trim(),
      lat: mapPicker.dataset.lat ? Number(mapPicker.dataset.lat) : null,
      lng: mapPicker.dataset.lng ? Number(mapPicker.dataset.lng) : null,
    },
    funding: fundingEnabled
      ? {
          enabled: true,
          type: selectedFundingOption,
          goal: goalAmount.value || null,
          paymentMethod: document.getElementById('fundingMethod').value,
          paymentHandle: document.getElementById('fundingHandle').value.trim(),
          paymentInstructions: document.getElementById('fundingInstructions').value.trim(),
        }
      : { enabled: false },
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function selectedContributionAmount() {
  return Math.max(0, Math.floor(Number(contributionAmount.value) || 0));
}

function isProbablyUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function fallbackPaymentDetails(session, amount = selectedContributionAmount()) {
  const method = String(session?.fundingPaymentMethod || '').trim();
  const handle = String(session?.fundingPaymentHandle || '').trim();
  const instructions = String(session?.fundingPaymentInstructions || '').trim();
  const currency = String(session?.fundingCurrency || 'INR').trim();
  const summaryLines = [
    `${session?.title || 'Session'} funding pool`,
    `Method: ${method || 'Manual payment'}`,
  ];

  if (handle) summaryLines.push(`Handle/link: ${handle}`);
  if (amount > 0) summaryLines.push(`Suggested amount: ${amount} ${currency}`);
  if (instructions) summaryLines.push(`Instructions: ${instructions}`);

  return {
    sessionId: String(session?.id || ''),
    amount,
    method,
    handle,
    currency,
    instructions,
    summary: summaryLines.join('\n'),
    actionLabel: '',
    actionUrl: '',
    qrCodeDataUrl: '',
    referenceRequired: ['UPI', 'Razorpay', 'Bank transfer'].includes(method),
    loading: false,
  };
}

function currentPaymentFor(session, amount = selectedContributionAmount()) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (
    currentPaymentDetails &&
    currentPaymentDetails.sessionId === String(session?.id) &&
    currentPaymentDetails.amount === safeAmount
  ) {
    return currentPaymentDetails;
  }
  return fallbackPaymentDetails(session, safeAmount);
}

async function refreshPaymentDetails(session, amount = selectedContributionAmount()) {
  if (!session?.fundingEnabled) {
    currentPaymentDetails = null;
    renderFundingActions(session);
    return;
  }

  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const requestId = ++paymentRequestId;
  currentPaymentDetails = {
    ...fallbackPaymentDetails(session, safeAmount),
    loading: true,
  };
  renderFundingActions(session);

  try {
    const result = await api.get(`/sessions/${session.id}/payment?amount=${safeAmount}`);
    if (requestId !== paymentRequestId || String(selectedSessionId) !== String(session.id)) {
      return;
    }
    currentPaymentDetails = {
      ...result.payment,
      sessionId: String(session.id),
      amount: safeAmount,
      loading: false,
    };
  } catch (error) {
    if (requestId !== paymentRequestId || String(selectedSessionId) !== String(session.id)) {
      return;
    }
    currentPaymentDetails = {
      ...fallbackPaymentDetails(session, safeAmount),
      loading: false,
      error: error.message,
    };
  }

  renderFundingActions(session);
}

function syncFundingMethodSelectors(session) {
  const configuredMethod = String(session?.fundingPaymentMethod || '').trim();
  if (configuredMethod && Array.from(paymentLink.options).some(option => option.value === configuredMethod)) {
    paymentLink.value = configuredMethod;
    extraContributionMethod.value = configuredMethod;
  }

  paymentLink.disabled = Boolean(configuredMethod);
  extraContributionMethod.disabled = Boolean(configuredMethod);
}

function renderFundingActions(session) {
  if (!session?.fundingEnabled) {
    fundingMethodCard.textContent = '';
    fundingMethodCard.classList.add('hidden');
    fundingActionBar.classList.add('hidden');
    fundingQrCard.classList.add('hidden');
    return;
  }

  const amount = selectedContributionAmount();
  const payment = currentPaymentFor(session, amount);
  const parts = [
    `<strong>${escapeHtml(payment.method || session.fundingPaymentMethod || session.fundingType || 'Funding pool')}</strong>`,
  ];

  if (payment.handle) {
    const handle = escapeHtml(payment.handle);
    parts.push(isProbablyUrl(payment.handle) ? `<a href="${handle}" target="_blank" rel="noreferrer">${handle}</a>` : `Handle: ${handle}`);
  }
  if (amount > 0) {
    parts.push(`Suggested amount: ${amount} ${escapeHtml(payment.currency || session.fundingCurrency || 'INR')}`);
  }
  parts.push(escapeHtml(payment.instructions || session.fundingPaymentInstructions || 'Record contributions separately from Stardust and track refunds transparently.'));
  if (payment.referenceRequired) {
    parts.push('Record the payment reference before you join so the host can confirm the contribution.');
  }
  if (payment.loading) {
    parts.push('Refreshing the session payment artifact...');
  }

  fundingMethodCard.innerHTML = parts.join('<br>');
  fundingMethodCard.classList.remove('hidden');

  openPaymentBtn.textContent = payment.actionLabel || 'Open payment';
  openPaymentBtn.disabled = !payment.actionUrl;
  copyPaymentBtn.disabled = !payment.summary;
  fundingActionBar.classList.toggle('hidden', !payment.summary && !payment.actionUrl);

  if (payment.qrCodeDataUrl) {
    fundingQrImage.src = payment.qrCodeDataUrl;
    fundingQrCaption.textContent = payment.referenceRequired
      ? 'Scan to pay, then keep the transaction reference so the host can confirm it.'
      : 'Scan to open the configured payment flow for this meetup.';
    fundingQrCard.classList.remove('hidden');
  } else {
    fundingQrImage.removeAttribute('src');
    fundingQrCard.classList.add('hidden');
  }
}

function renderSessions() {
  sessionList.innerHTML = '';

  demoSessions.forEach(session => {
    const card = document.createElement('button');
    card.className = 'session-card';
    card.type = 'button';
    card.dataset.sessionId = String(session.id);
    card.innerHTML = `
      <h2>${escapeHtml(session.title)}</h2>
      <div class="session-meta">
        <span>${escapeHtml(session.place)}</span>
        <span>${escapeHtml(session.time)}</span>
        <span>${escapeHtml(session.seats)}</span>
        <span>${session.participants.length} participants</span>
      </div>
      <p>${escapeHtml(session.desc)}</p>
      <span class="cost-chip">${session.cost} Stardust to join</span>
    `;

    card.addEventListener('click', () => selectSession(session.id));
    sessionList.appendChild(card);
  });
}

function selectSession(sessionId) {
  selectedSessionId = String(sessionId);
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;
  const currentUser = api.getUser();
  const isHost = Boolean(currentUser?.id && session.hostUserId === currentUser.id);

  document.querySelectorAll('.session-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.sessionId === selectedSessionId);
  });

  sessionEmpty.classList.add('hidden');
  sessionContent.classList.remove('hidden');
  detailTitle.textContent = session.title;
  detailDesc.textContent = session.desc;
  detailCost.textContent = session.cost;
  detailFacts.innerHTML = `
    <span>${escapeHtml(session.place)}</span>
    <span>${escapeHtml(session.time)}</span>
    <span>${escapeHtml(session.seats)}</span>
    <span>${session.participants.length} participants</span>
    <span>${session.status || 'scheduled'}</span>
    <span>${session.fundingRaised}/${session.fundingGoal} ${escapeHtml(session.fundingCurrency || 'INR')} funding</span>
  `;
  contributionAmount.value = '';
  contributionReference.value = '';
  bringingInput.value = '';
  syncFundingMethodSelectors(session);
  joinForm.classList.toggle('hidden', session.status === 'cancelled');
  hostActions.classList.toggle('hidden', !isHost);
  contributionForm.classList.toggle('hidden', !(session.fundingEnabled && session.status !== 'cancelled'));
  fundingPoolMeta.textContent = session.fundingEnabled
    ? `${session.fundingRaised}/${session.fundingGoal} ${session.fundingCurrency || 'INR'}`
    : 'No pool';
  if (session.spendSummary) {
    fundingSummary.textContent = session.spendSummary;
    fundingSummary.classList.remove('hidden');
  } else {
    fundingSummary.textContent = '';
    fundingSummary.classList.add('hidden');
  }
  refreshPaymentDetails(session);
  renderFundingLedger(session, isHost);
  renderCrew(session);
}

function renderFundingLedger(session, isHost) {
  const contributions = Array.isArray(session.fundingContributions) ? session.fundingContributions : [];
  const spendItems = Array.isArray(session.fundingSpendItems) ? session.fundingSpendItems : [];

  if (!contributions.length) {
    fundingLedger.innerHTML = '<div class="empty">No funding contributions recorded yet.</div>';
  } else {
    fundingLedger.innerHTML = contributions.map(item => `
      <div class="ledger-row">
        <strong>${escapeHtml(item.name)} contributed ${item.amount} ${escapeHtml(session.fundingCurrency || 'INR')}</strong>
        <div class="ledger-tags">
          <span class="ledger-tag">${escapeHtml(item.method || 'method pending')}</span>
          <span class="ledger-tag">status: ${escapeHtml(item.status || 'recorded')}</span>
          <span class="ledger-tag">refund: ${escapeHtml(item.refundStatus || 'not-applicable')}</span>
        </div>
        ${item.reference ? `<span>Reference: ${escapeHtml(item.reference)}</span>` : ''}
        ${item.note ? `<span>${escapeHtml(item.note)}</span>` : ''}
        ${isHost && item.status !== 'confirmed'
          ? `<button class="refund-btn" type="button" data-confirm-id="${item.id}">Confirm payment</button>`
          : ''}
        ${isHost && item.refundStatus !== 'refunded' && item.refundStatus !== 'not-applicable'
          ? `<button class="refund-btn" type="button" data-refund-id="${item.id}">Mark refunded</button>`
          : ''}
      </div>
    `).join('');
  }

  if (!spendItems.length) {
    fundingSpendList.innerHTML = session.fundingEnabled
      ? '<div class="empty">No spend items posted yet.</div>'
      : '';
  } else {
    fundingSpendList.innerHTML = spendItems.map(item => `
      <div class="spend-row">
        <strong>${escapeHtml(item.label)} - ${item.amount} ${escapeHtml(session.fundingCurrency || 'INR')}</strong>
        ${item.note ? `<span>${escapeHtml(item.note)}</span>` : ''}
      </div>
    `).join('');
  }

  fundingLedger.querySelectorAll('[data-refund-id]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        const result = await api.post(`/sessions/${session.id}/contributions/${button.dataset.refundId}/refund`, {
          refundStatus: 'refunded',
          note: 'Host marked this contribution as refunded after cancellation.',
        });
        demoSessions = demoSessions.map(item => String(item.id) === String(result.session.id) ? result.session : item);
        renderSessions();
        selectSession(result.session.id);
        showToast('Contribution marked as refunded');
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  fundingLedger.querySelectorAll('[data-confirm-id]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        const result = await api.post(`/sessions/${session.id}/contributions/${button.dataset.confirmId}/confirm`, {
          note: 'Host confirmed the contribution after checking the payment proof.',
        });
        demoSessions = demoSessions.map(item => String(item.id) === String(result.session.id) ? result.session : item);
        renderSessions();
        selectSession(result.session.id);
        showToast('Contribution confirmed');
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

function renderCrew(session) {
  crewList.innerHTML = '';
  crewCount.textContent = `${session.participants.length} listed`;

  session.participants.forEach(person => {
    const item = document.createElement('div');
    item.className = 'crew-item';
    item.innerHTML = `
      <div class="crew-avatar">${escapeHtml(person.initials)}</div>
      <div>
        <strong>${escapeHtml(person.name)}</strong>
        <span>${escapeHtml(person.bringing)}</span>
      </div>
    `;
    crewList.appendChild(item);
  });
}

document.querySelectorAll('[data-route]').forEach(button => {
  button.addEventListener('click', () => {
    showRoute(button.dataset.route);
  });
});

window.addEventListener('popstate', () => {
  showRoute(routeFromHash(), false);
});

window.addEventListener('scroll', updateHostProgress, { passive: true });

window.addEventListener('mousemove', event => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = -999;
  mouse.y = -999;
});

progressFields.forEach(field => {
  field.addEventListener('input', updateHostProgress);
  field.addEventListener('change', updateHostProgress);
});

mapPicker.addEventListener('click', openMapModal);

mapModalBackdrop.addEventListener('click', closeMapModal);
mapCloseBtn.addEventListener('click', closeMapModal);
mapCancelBtn.addEventListener('click', closeMapModal);

mapUseLocationBtn.addEventListener('click', useCurrentLocationForMap);

mapResetBtn.addEventListener('click', () => {
  pendingLocation = null;
  mapSelectionStatus.textContent = 'No pin selected yet.';
  mapConfirmBtn.disabled = true;
  if (locationMarker && locationMap) {
    locationMap.removeLayer(locationMarker);
    locationMarker = null;
  }
});

mapConfirmBtn.addEventListener('click', () => {
  if (!pendingLocation) {
    showToast('Pick a point on the map first');
    return;
  }
  setMapLocation(pendingLocation.lat, pendingLocation.lng, pendingLocation.label);
  closeMapModal();
  showToast('Location pinned for this session');
});

fundingToggle.addEventListener('change', () => {
  fundingOptions.classList.toggle('visible', fundingToggle.checked);
  if (!fundingToggle.checked) clearFundingSelection();
  updateHostProgress();
});

document.querySelectorAll('.funding-option').forEach(option => {
  option.addEventListener('click', () => {
    selectedFundingOption = option.dataset.funding;
    document.querySelectorAll('.funding-option').forEach(item => {
      item.classList.toggle('selected', item === option);
    });
    goalRow.classList.add('visible');
  });
});

hostForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (fundingToggle.checked && !selectedFundingOption) {
    showToast('Choose a funding pool type first');
    return;
  }

  try {
    const payload = collectHostPayload();
    const result = await api.post('/sessions', payload);
    demoSessions.unshift(result.session);

    renderSessions();
    showToast('Session initiated and added to available sessions');
    showRoute('participant');
    selectSession(result.session.id);
  } catch (error) {
    showToast(error.message);
  }
});

joinForm.addEventListener('submit', async event => {
  event.preventDefault();

  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;

  if (myStardust < session.cost) {
    showToast(`You need ${session.cost} Stardust to join this session`);
    return;
  }

  const bringing = bringingInput.value.trim();
  if (!bringing) {
    showToast('Add your gear or supplies');
    return;
  }

  const contribution = Math.max(0, Math.floor(Number(contributionAmount.value) || 0));
  const payment = currentPaymentFor(session, contribution);
  if (contribution > 0 && payment.referenceRequired && !contributionReference.value.trim()) {
    showToast('Add the payment reference before joining');
    return;
  }
  try {
    const result = await api.post(`/sessions/${session.id}/join`, {
      bringing,
      contributionAmount: contribution,
      contributionMethod: paymentLink.value,
      contributionReference: contributionReference.value.trim(),
    });

    myStardust = result.balance;
    updateLocalBalance(result.balance);
    const nextSession = result.session;
    demoSessions = demoSessions.map(item => item.id === nextSession.id ? nextSession : item);

    updateStardust();
    renderSessions();
    selectSession(nextSession.id);
    showToast(`Joined "${nextSession.title}" for ${nextSession.cost} Stardust`);
  } catch (error) {
    showToast(error.message);
  }
});

contributionForm.addEventListener('submit', async event => {
  event.preventDefault();
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;

  const amount = Math.max(0, Math.floor(Number(extraContributionAmount.value) || 0));
  if (amount < 1) {
    showToast('Add a contribution amount first');
    return;
  }

  const payment = currentPaymentFor(session, amount);
  if (payment.referenceRequired && !extraContributionReference.value.trim()) {
    showToast('Add the payment reference before recording the contribution');
    return;
  }

  try {
    const result = await api.post(`/sessions/${session.id}/contribute`, {
      amount,
      method: extraContributionMethod.value,
      reference: extraContributionReference.value.trim(),
      note: 'Recorded from the participant funding form.',
    });
    demoSessions = demoSessions.map(item => String(item.id) === String(result.session.id) ? result.session : item);
    extraContributionAmount.value = '';
    extraContributionReference.value = '';
    renderSessions();
    selectSession(result.session.id);
    showToast('Contribution recorded in the funding ledger');
  } catch (error) {
    showToast(error.message);
  }
});

contributionAmount.addEventListener('input', () => {
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (session) refreshPaymentDetails(session);
});

paymentLink.addEventListener('change', () => {
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (session) refreshPaymentDetails(session);
});

openPaymentBtn.addEventListener('click', () => {
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;
  const payment = currentPaymentFor(session);
  if (!payment.actionUrl) {
    showToast('No direct payment link is available for this session');
    return;
  }
  if (payment.actionUrl.startsWith('http://') || payment.actionUrl.startsWith('https://')) {
    window.open(payment.actionUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  window.location.href = payment.actionUrl;
});

copyPaymentBtn.addEventListener('click', async () => {
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;
  const payment = currentPaymentFor(session);

  try {
    await navigator.clipboard.writeText(payment.summary);
    showToast('Payment details copied');
  } catch {
    showToast('Clipboard access failed');
  }
});

function parseSpendItems(input) {
  return String(input || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [label, amount, note] = line.split('|').map(part => String(part || '').trim());
      return {
        label,
        amount: Number(amount || 0),
        note: note || '',
      };
    })
    .filter(item => item.label && item.amount > 0);
}

summaryBtn.addEventListener('click', async () => {
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;

  const summary = window.prompt('Post a short spend summary for contributors:', session.spendSummary || 'Snacks, chai, and shared telescope accessories for the meetup.');
  if (summary === null) return;
  const itemSeed = Array.isArray(session.fundingSpendItems) && session.fundingSpendItems.length
    ? session.fundingSpendItems.map(item => `${item.label}|${item.amount}|${item.note || ''}`).join('\n')
    : 'Snacks|200|Tea and biscuits\nTripod rental|400|Shared gear';
  const itemInput = window.prompt('Optional spend items, one per line as label|amount|note', itemSeed);
  if (itemInput === null) return;

  try {
    const result = await api.post(`/sessions/${session.id}/spend-summary`, {
      summary,
      spendItems: parseSpendItems(itemInput),
    });
    demoSessions = demoSessions.map(item => String(item.id) === String(result.session.id) ? result.session : item);
    renderSessions();
    selectSession(result.session.id);
    showToast('Funding summary published');
  } catch (error) {
    showToast(error.message);
  }
});

cancelBtn.addEventListener('click', async () => {
  const session = demoSessions.find(item => String(item.id) === selectedSessionId);
  if (!session) return;

  if (!window.confirm(`Cancel "${session.title}" and trigger the refund message?`)) {
    return;
  }

  try {
    const result = await api.post(`/sessions/${session.id}/cancel`, {});
    demoSessions = demoSessions.map(item => String(item.id) === String(result.session.id) ? result.session : item);
    renderSessions();
    selectSession(result.session.id);
    showToast('Session cancelled');
  } catch (error) {
    showToast(error.message);
  }
});

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

  updateStardust();
  profileMenu.classList.remove('hidden');
  profileBtn.setAttribute('aria-expanded', 'true');
}

profileBtn.addEventListener('click', event => {
  event.stopPropagation();
  toggleProfileMenu();
});

profileMenu.addEventListener('click', event => {
  event.stopPropagation();
});

document.addEventListener('click', closeProfileMenu);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeProfileMenu();
    if (!mapModal.classList.contains('hidden')) closeMapModal();
  }
});

loadSessions();
showRoute(routeFromHash(), false);
updateStardust();
window.addEventListener('resize', () => {
  resizeStars();
  updateHostProgress();
});
resizeStars();
drawStars();
function getInitialStardust() {
  try {
    const user = JSON.parse(localStorage.getItem('orbitCurrentUser') || 'null');
    return Number(user?.stardustBalance ?? 1240);
  } catch {
    return 1240;
  }
}

async function loadSessions() {
  try {
    const result = await api.get('/sessions');
    demoSessions = result.sessions;
  } catch (error) {
    console.error(error);
  }

  renderSessions();
  if (demoSessions.length > 0 && selectedSessionId === null) {
    selectSession(demoSessions[0].id);
  }
}

function updateLocalBalance(balance) {
  const user = api.getUser();
  if (!user) return;
  user.stardustBalance = balance;
  api.setUser(user);
}
