(function () {
  const page = detectPage();
  const state = {
    open: localStorage.getItem('orbitAiOpen') === 'true',
    mode: 'mission'
  };

  document.addEventListener('DOMContentLoaded', initOrbitAI);

  function detectPage() {
    const path = location.pathname.split('/').pop() || 'index.html';
    if (path.includes('community')) return 'community';
    if (path.includes('workshops')) return 'workshops';
    if (path.includes('vr')) return 'vr';
    if (path.includes('photography')) return 'photography';
    if (path.includes('iss')) return 'iss';
    if (path.includes('long-horizon')) return 'time';
    if (path.includes('index')) return 'home';
    return 'orbit';
  }

  function initOrbitAI() {
    buildWidget();
    injectPageAssistants();
    renderPanel('daily');
  }

  function buildWidget() {
    const toggle = document.createElement('button');
    toggle.className = 'orbit-ai-toggle';
    toggle.type = 'button';
    toggle.innerHTML = '<span>✦</span><span>Orbit AI</span>';
    toggle.addEventListener('click', () => {
      state.open = !state.open;
      localStorage.setItem('orbitAiOpen', String(state.open));
      document.getElementById('orbitAiPanel').classList.toggle('hidden', !state.open);
    });

    const panel = document.createElement('aside');
    panel.className = `orbit-ai-panel ${state.open ? '' : 'hidden'}`;
    panel.id = 'orbitAiPanel';
    panel.setAttribute('aria-label', 'Orbit AI Copilot');
    panel.innerHTML = `
      <div class="orbit-ai-head">
        <div class="orbit-ai-title">
          <strong>Orbit AI Copilot</strong>
          <span>${pageLabel()} intelligence layer</span>
        </div>
        <button class="orbit-ai-close" type="button" aria-label="Close Orbit AI">×</button>
      </div>
      <div class="orbit-ai-body">
        <div class="orbit-ai-chiprow" id="orbitAiChips"></div>
        <div class="orbit-ai-output" id="orbitAiOutput"></div>
      </div>
    `;

    document.body.append(toggle, panel);
    panel.querySelector('.orbit-ai-close').addEventListener('click', () => {
      state.open = false;
      localStorage.setItem('orbitAiOpen', 'false');
      panel.classList.add('hidden');
    });
  }

  function pageLabel() {
    return {
      community: 'community event',
      workshops: 'dashboard',
      vr: 'VR tour',
      photography: 'astrophotography',
      iss: 'ISS narrator',
      time: 'future narrator',
      home: 'mission control'
    }[page] || 'space';
  }

  function renderPanel(mode) {
    state.mode = mode;
    const chips = document.getElementById('orbitAiChips');
    const output = document.getElementById('orbitAiOutput');
    if (!chips || !output) return;

    chips.innerHTML = [
      ['daily', 'Daily briefing'],
      ['personal', 'For me'],
      ['story', 'Story mode'],
      ['page', pageActionLabel()]
    ].map(([key, label]) => `<button class="orbit-ai-chip" type="button" data-ai-mode="${key}">${label}</button>`).join('');

    chips.querySelectorAll('[data-ai-mode]').forEach(button => {
      button.addEventListener('click', () => renderPanel(button.dataset.aiMode));
    });

    output.innerHTML = renderMode(mode);
    wireOutputActions(output);
  }

  function pageActionLabel() {
    return {
      community: 'Build event',
      workshops: 'Dashboard',
      vr: 'Tour guide',
      photography: 'Photo helper',
      iss: 'Narrate ISS',
      time: 'Future report',
      home: 'Start path'
    }[page] || 'Mission help';
  }

  function renderMode(mode) {
    if (mode === 'daily') return dailyBriefing();
    if (mode === 'personal') return personalPlan();
    if (mode === 'story') return storyMode();
    return pageSpecificPanel();
  }

  function dailyBriefing() {
    const hour = new Date().getHours();
    const skyMood = hour < 6 || hour > 18 ? 'night-sky' : 'planning';
    return card('Daily Space Briefing', `
      <p>Today’s Orbit plan: run a ${skyMood} session, check the ISS tracker, and try one short guided VR mission.</p>
      <ul>
        <li>Photo target: Moon detail or a bright planet if visible from your sky.</li>
        <li>Learning bite: compare speed-based and gravity-based time dilation.</li>
        <li>Community prompt: host a beginner-friendly watch party with red-light etiquette.</li>
      </ul>
    `) + card('Recommended next', `<p>${recommendation()}</p>`);
  }

  function personalPlan() {
    const session = readJSON('orbitCurrentUser', { name: 'Cosmic Guest' });
    const name = session.name || 'Cosmic Guest';
    return card(`Personalized for ${escapeHTML(name)}`, `
      <p>Your best Orbit path is: capture or browse one space photo, visit one VR scene, then write a short mission log.</p>
      <ul>
        <li>Beginner path: Moon VR, ISS narrator, Moonrise community session.</li>
        <li>Creative path: photo caption, future narrator, story recap.</li>
        <li>Science path: black hole VR, time dilation forecast, pulsar explainer.</li>
      </ul>
    `);
  }

  function storyMode() {
    return card('AI Story Mode', `
      <p>Captain’s Log: You opened Orbit from mission control, reviewed the night sky, and prepared one more step into the dark. Your next action becomes the next chapter.</p>
      <ul>
        <li>VR missions become exploration logs.</li>
        <li>Community sessions become crew briefings.</li>
        <li>Time dilation trips become future-return reports.</li>
      </ul>
    `) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="copy-story">Save story seed</button><button class="orbit-ai-action" data-ai-action="open-page-mode">${pageActionLabel()}</button></div>`;
  }

  function pageSpecificPanel() {
    if (page === 'community') {
      return card('Community Event Assistant', `
        <p>Tell Orbit the vibe, or use the starter plan below. I can fill your host form with a clean beginner-friendly event.</p>
        <ul>
          <li>Title: Saturn and Moon beginner watch</li>
          <li>Gear: telescope, tripod, red flashlight, warm layers</li>
          <li>Safety: arrive before dark and keep white lights off</li>
        </ul>
      `) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="fill-event">Fill host form</button><button class="orbit-ai-action" data-ai-action="gear-list">Gear checklist</button></div>`;
    }

    if (page === 'workshops') {
      return card('Dashboard Scout', `
        <p>I can help scan this dashboard, refresh the live search, or turn the results into a short application plan.</p>
        <ul>
          <li>Start with ISRO, NASA, and OTHER for broad student opportunities.</li>
          <li>Check deadlines first, then open official sources before applying.</li>
          <li>Use the plan view after results load for a compact shortlist.</li>
        </ul>
      `) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="workshop-refresh">Refresh feed</button><button class="orbit-ai-action" data-ai-action="workshop-plan">Make plan</button></div>`;
    }

    if (page === 'vr') {
      const scene = getActiveVRScene();
      return card('VR AI Tour Guide', `<p>${vrNarration(scene)}</p>`) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="vr-beginner">Beginner mode</button><button class="orbit-ai-action" data-ai-action="vr-cinematic">Cinematic mode</button></div>`;
    }

    if (page === 'photography') {
      return card('Astrophotography AI', `
        <p>I can generate a title, caption, category, and gentle critique for uploads or NASA images.</p>
        <ul>
          <li>Use “Fill upload” after opening the upload modal.</li>
          <li>Use “Critique photo” while viewing a lightbox image.</li>
        </ul>
      `) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="fill-photo">Fill upload</button><button class="orbit-ai-action" data-ai-action="critique-photo">Critique photo</button></div>`;
    }

    if (page === 'time') {
      return card('Time Dilation Future Narrator', `
        <p>When you launch, Orbit AI converts your skipped Earth years into a return briefing: headlines, scientific drift, prediction results, and a personal mission log.</p>
        <ul>
          <li>Short trips produce subtle trend updates.</li>
          <li>Long trips produce future-history style reports.</li>
          <li>Your wins and losses become the story of the return.</li>
        </ul>
      `) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="future-preview">Preview future report</button><button class="orbit-ai-action" data-ai-action="explain-time">Explain current trip</button></div>`;
    }

    if (page === 'iss') {
      return card('ISS AI Narrator', `
        <p>Use this as a mission narrator: it can explain orbital speed, Earth passes, station altitude, and why the ISS appears only near dawn or dusk.</p>
      `) + `<div class="orbit-ai-actions"><button class="orbit-ai-action" data-ai-action="iss-narrate">Narrate ISS</button><button class="orbit-ai-action" data-ai-action="iss-kid">Kid-friendly</button></div>`;
    }

    return card('Mission Control', '<p>Start with Photography, VR, Time Dilation, or Community. Orbit AI will adapt on each page.</p>');
  }

  function card(title, body) {
    return `<section class="orbit-ai-card"><h3>${title}</h3>${body}</section>`;
  }

  function wireOutputActions(root) {
    root.querySelectorAll('[data-ai-action]').forEach(button => {
      button.addEventListener('click', () => runAction(button.dataset.aiAction));
    });
  }

  function runAction(action) {
    if (action === 'open-page-mode') return renderPanel('page');
    if (action === 'copy-story') return saveStorySeed();
    if (action === 'fill-event') return fillCommunityEvent();
    if (action === 'gear-list') return emitOutput('Gear Checklist', '<ul><li>Telescope or binoculars</li><li>Tripod and phone adapter</li><li>Red flashlight</li><li>Warm layers and water</li><li>Power bank and spare batteries</li></ul>');
    if (action === 'workshop-refresh') return refreshWorkshops();
    if (action === 'workshop-plan') return workshopPlan();
    if (action === 'fill-photo') return fillPhotoUpload();
    if (action === 'critique-photo') return critiquePhoto();
    if (action === 'vr-beginner') return emitOutput('Beginner Tour', `<p>${vrNarration(getActiveVRScene(), 'beginner')}</p>`);
    if (action === 'vr-cinematic') return emitOutput('Cinematic Tour', `<p>${vrNarration(getActiveVRScene(), 'cinematic')}</p>`);
    if (action === 'future-preview') return emitOutput('Future Preview', futurePreview());
    if (action === 'explain-time') return emitOutput('Trip Explainer', explainTimeTrip());
    if (action === 'iss-narrate') return emitOutput('ISS Narration', '<p>The ISS circles Earth roughly every 90 minutes. Watch how fast the ground track moves: it is not drifting, it is orbital mechanics in real time.</p>');
    if (action === 'iss-kid') return emitOutput('Kid-Friendly ISS', '<p>Think of the ISS as a science house flying around Earth. It moves so fast that astronauts see many sunrises in one day.</p>');
  }

  function emitOutput(title, html) {
    const output = document.getElementById('orbitAiOutput');
    if (!output) return;
    output.insertAdjacentHTML('afterbegin', card(title, html));
  }

  function fillCommunityEvent() {
    setValue('sessionTitle', 'Saturn and Moon Beginner Watch');
    setValue('sessionDesc', 'A relaxed skywatch for first-timers. We will point out the Moon, Saturn if visible, and a few easy constellations while helping guests try phone photography through a telescope.');
    setValue('locationName', 'Riverside dark-sky field');
    setValue('locationDesc', 'Meet near the north gate by the red lamp post. Park beside the field, arrive before dark, and use red lights only.');
    setValue('sessionCapacity', '12');
    setValue('goalAmount', '600');
    const fundingToggle = document.getElementById('fundingToggle');
    if (fundingToggle && !fundingToggle.checked) fundingToggle.click();
    document.querySelector('[data-funding="experience"]')?.click();
    document.querySelector('[data-route="host"]')?.click();
    dispatchInput(['sessionTitle', 'sessionDesc', 'locationName', 'locationDesc', 'sessionCapacity', 'goalAmount']);
    emitOutput('Event Draft Added', '<p>I filled the host form with a beginner-friendly observing night. Adjust the date, time, and map pin before publishing.</p>');
  }

  function fillPhotoUpload() {
    document.getElementById('fabBtn')?.click();
    setValue('photoTitle', 'Moonlit Crater Detail');
    setValue('photoCategory', 'moon');
    setValue('photoDesc', 'AI draft: A high-contrast lunar detail study. Try noting telescope, eyepiece, camera, exposure, stacking app, and seeing conditions for a stronger post.');
    emitOutput('Photo Draft Added', '<p>I filled the upload modal with a clean title, category, and description starter.</p>');
  }

  function critiquePhoto() {
    const title = document.getElementById('lbTitle')?.textContent || document.getElementById('photoTitle')?.value || 'this image';
    emitOutput('Photo Critique', `<p>${escapeHTML(title)} has a strong subject. Improve the post by adding capture settings, sky conditions, and one sentence about what viewers should notice first.</p>`);
  }

  function refreshWorkshops() {
    if (typeof window.fetchWorkshops === 'function') {
      window.fetchWorkshops();
      emitOutput('Dashboard Scan Started', '<p>I refreshed the dashboard. When the cards load, sort by deadline and open official pages before applying.</p>');
      return;
    }
    emitOutput('Dashboard Scan', '<p>The dashboard fetcher is not available on this page yet.</p>');
  }

  function workshopPlan() {
    const count = document.getElementById('result-count')?.textContent || 'the visible results';
    const active = document.querySelector('.filter-btn.active')?.textContent || 'ALL';
    emitOutput('Application Plan', `
      <p>Current view: ${escapeHTML(active)} / ${escapeHTML(count)}.</p>
      <ul>
        <li>Open official links for the top three relevant cards.</li>
        <li>Prioritize deadlines within seven days and online or hybrid access.</li>
        <li>Prepare one resume, one short statement of interest, and proof of student or professional status.</li>
      </ul>
    `);
  }

  function saveStorySeed() {
    const story = {
      savedAt: new Date().toISOString(),
      page,
      text: 'Captain’s Log: Orbit AI initialized a personalized space journey across missions, photos, community, and future reports.'
    };
    localStorage.setItem('orbitStorySeed', JSON.stringify(story));
    emitOutput('Story Seed Saved', '<p>Your story seed is saved locally and can become a full mission journal later.</p>');
  }

  function injectPageAssistants() {
    if (page === 'community') injectCommunityBar();
    if (page === 'workshops') injectWorkshopsBar();
    if (page === 'photography') injectPhotographyBar();
    if (page === 'vr') hookVRGuide();
    if (page === 'time') hookTimeNarrator();
    if (page === 'iss') injectISSBar();
  }

  function injectCommunityBar() {
    const hostForm = document.getElementById('hostForm');
    if (!hostForm) return;
    const bar = document.createElement('div');
    bar.className = 'orbit-ai-pagebar';
    bar.innerHTML = `
      <button class="orbit-ai-mini" type="button" data-ai-action="fill-event"><strong>AI event draft</strong><span>Fill title, description, location, capacity, and funding.</span></button>
      <button class="orbit-ai-mini" type="button" data-ai-action="gear-list"><strong>AI gear checklist</strong><span>Get a quick packing and safety guide.</span></button>
    `;
    hostForm.parentElement.insertBefore(bar, hostForm);
    bar.querySelectorAll('[data-ai-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.aiAction)));
  }

  function injectWorkshopsBar() {
    const header = document.querySelector('.dashboard-shell .header');
    if (!header) return;
    const bar = document.createElement('div');
    bar.className = 'orbit-ai-pagebar';
    bar.innerHTML = `
      <button class="orbit-ai-mini" type="button" data-ai-action="workshop-refresh"><strong>AI dashboard scan</strong><span>Refresh the live opportunity feed.</span></button>
      <button class="orbit-ai-mini" type="button" data-ai-action="workshop-plan"><strong>AI application plan</strong><span>Summarize how to shortlist results.</span></button>
    `;
    header.insertAdjacentElement('afterend', bar);
    bar.querySelectorAll('[data-ai-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.aiAction)));
  }

  function injectPhotographyBar() {
    const header = document.querySelector('.page-header');
    if (!header) return;
    const bar = document.createElement('div');
    bar.className = 'orbit-ai-pagebar';
    bar.innerHTML = `
      <button class="orbit-ai-mini" type="button" data-ai-action="fill-photo"><strong>AI upload draft</strong><span>Generate a title, category, and caption starter.</span></button>
      <button class="orbit-ai-mini" type="button" data-ai-action="critique-photo"><strong>AI photo critique</strong><span>Get notes for improving a post or image description.</span></button>
    `;
    header.insertAdjacentElement('afterend', bar);
    bar.querySelectorAll('[data-ai-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.aiAction)));
  }

  function hookVRGuide() {
    const header = document.querySelector('.menu-header');
    if (header) {
      const bar = document.createElement('div');
      bar.className = 'orbit-ai-pagebar';
      bar.innerHTML = `
        <button class="orbit-ai-mini" type="button" data-ai-action="vr-beginner"><strong>AI beginner guide</strong><span>Explain the selected VR mission simply.</span></button>
        <button class="orbit-ai-mini" type="button" data-ai-action="vr-cinematic"><strong>AI cinematic guide</strong><span>Turn the scene into a mission narration.</span></button>
      `;
      header.insertAdjacentElement('afterend', bar);
      bar.querySelectorAll('[data-ai-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.aiAction)));
    }

    const original = window.activateScene;
    if (typeof original === 'function') {
      window.activateScene = function (id) {
        original(id);
        setTimeout(() => emitOutput('VR Tour Guide', `<p>${vrNarration(id)}</p>`), 80);
      };
    }
  }

  function hookTimeNarrator() {
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      const bar = document.createElement('div');
      bar.className = 'orbit-ai-pagebar';
      bar.innerHTML = `
        <button class="orbit-ai-mini" type="button" data-ai-action="future-preview"><strong>AI future preview</strong><span>See how Orbit will narrate your return.</span></button>
        <button class="orbit-ai-mini" type="button" data-ai-action="explain-time"><strong>AI trip explainer</strong><span>Translate the current dilation numbers.</span></button>
      `;
      topbar.insertAdjacentElement('afterend', bar);
      bar.querySelectorAll('[data-ai-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.aiAction)));
    }

    const original = window.resolveTrip;
    if (typeof original === 'function') {
      window.resolveTrip = function () {
        original();
        const target = document.getElementById('res-inner');
        if (!target || target.querySelector('.orbit-ai-card')) return;
        target.insertAdjacentHTML('beforeend', card('AI Future Narrator', futurePreview()));
      };
    }
  }

  function injectISSBar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    const bar = document.createElement('div');
    bar.className = 'orbit-ai-pagebar';
    bar.innerHTML = `
      <button class="orbit-ai-mini" type="button" data-ai-action="iss-narrate"><strong>AI ISS narrator</strong><span>Explain what the station is doing right now.</span></button>
      <button class="orbit-ai-mini" type="button" data-ai-action="iss-kid"><strong>Kid-friendly mode</strong><span>Make orbital mechanics easier to understand.</span></button>
    `;
    nav.insertAdjacentElement('afterend', bar);
    bar.querySelectorAll('[data-ai-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.aiAction)));
  }

  function getActiveVRScene() {
    const active = Array.from(document.querySelectorAll('.scene-group')).find(el => el.getAttribute('visible') === 'true');
    return active ? active.id.replace('scene-', '') : 'solarsystem';
  }

  function vrNarration(id, mode = 'standard') {
    const lines = {
      saturn: 'You are inside Saturn’s ring plane. Those rings are not solid bands; they are countless icy fragments reflecting sunlight as they orbit.',
      moon: 'This is Tranquility Base. Notice how the black lunar sky contrasts with Earth, because the Moon has almost no atmosphere to scatter light.',
      blackhole: 'The dark center marks the event horizon. The glowing disk is hot matter spiraling inward, where gravity turns motion into radiation.',
      pulsar: 'A pulsar is a neutron star with lighthouse-like beams. When a beam sweeps across Earth, we detect a pulse with stunning regularity.',
      bennu: 'Bennu is a rubble-pile asteroid. OSIRIS-REx studied it closely and returned a sample to help explain early solar system chemistry.',
      solarsystem: 'This solar system tour compresses huge distances into a flyable model. Use it to compare planet scale, orbital rhythm, and sunlight.'
    };
    const base = lines[id] || lines.solarsystem;
    if (mode === 'beginner') return `${base} Simple version: look for what is moving, glowing, or unusually dark. That usually reveals the physics.`;
    if (mode === 'cinematic') return `${base} Mission log: your visor catches faint light, the instruments hum, and space turns from backdrop into evidence.`;
    return base;
  }

  function futurePreview() {
    const timeState = typeof window.getOrbitTimeState === 'function' ? window.getOrbitTimeState() : {};
    const years = Number(timeState.homeYrs || 12);
    const scale = years > 50 ? 'civilization-scale' : years > 5 ? 'noticeable' : 'subtle';
    return `<p>You return after ${years.toFixed(2)} Earth years. The future report will frame the changes as ${scale}: orbital traffic, exoplanet discoveries, solar behavior, and whether your predictions beat the crowd.</p>
      <ul><li>Headline: Earth kept moving while you barely aged.</li><li>Science: trends are compared against the year you departed.</li><li>Story: your Stardust outcome becomes the emotional beat.</li></ul>`;
  }

  function explainTimeTrip() {
    const timeState = typeof window.getOrbitTimeState === 'function' ? window.getOrbitTimeState() : {};
    const factor = Number(timeState.dilationFactor || 2.29);
    const days = Number(timeState.shipDays || 1);
    return `<p>Your selected trip stretches time by about ${factor.toFixed(2)}×. That means ${days} ship day${days === 1 ? '' : 's'} feels normal to you, while home experiences roughly ${(days * factor).toFixed(2)} days.</p>`;
  }

  function recommendation() {
    return {
      community: 'Draft one beginner skywatch event, then use the gear checklist before publishing.',
      workshops: 'Refresh the dashboard feed, then use the AI application plan to shortlist official opportunities.',
      vr: 'Launch the black hole mission, then switch the guide to beginner mode.',
      photography: 'Open the upload modal and let AI create a caption starter.',
      iss: 'Use narrator mode while watching the ISS ground track.',
      time: 'Run one short speed trip, then read the AI future report.'
    }[page] || 'Start with the Daily Space Briefing, then pick one mission.';
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function dispatchInput(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function readJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || '') || fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }
})();
