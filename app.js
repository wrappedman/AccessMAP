(() => {
  'use strict';

  const STORAGE_KEY = 'sentinel-access-map-v1';
  const DEFAULT_PLAN = 'assets/floor-plan.svg';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const floorNames = { 1: ['GROUND FLOOR', 'GROUND FLOOR / LEVEL 01'], 2: ['OPERATIONS FLOOR', 'OPERATIONS / LEVEL 02'], 3: ['EXECUTIVE FLOOR', 'EXECUTIVE / LEVEL 03'] };
  const catalog = {
    camera: { name: 'Camera', short: 'CAM', icon: '<rect x="5" y="9" width="17" height="13" rx="3"/><path d="m22 13 7-4v13l-7-4M11 9V5h7v4M9 26h9"/><circle cx="13.5" cy="15.5" r="2.5"/>' },
    reader: { name: 'Card Reader', short: 'READER', icon: '<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M13 9h6M13 14h6M14 23h4"/><path d="M3 13c2-2 2-4 0-6M29 13c-2-2-2-4 0-6"/>' },
    gate: { name: 'Turnstile Gate', short: 'GATE', icon: '<path d="M4 5v23M28 5v23M4 10h24M16 10v15M8 18h16M16 25l-5 4M16 25l5 4"/>' },
    door: { name: 'Door', short: 'DOOR', icon: '<path d="M7 29V3h18v26M11 29V7h10v22M3 29h26"/><circle cx="18" cy="18" r="1"/>' }
  };
  const icon = (type) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${catalog[type].icon}</svg>`;
  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('acs-canvas'), elements: $('acs-elements'), scroll: $('acs-scroll-area'), overlay: $('acs-path-overlay'),
    floor: $('acs-floor-select'), properties: $('acs-properties'), palette: $('acs-palette'),
    modal: $('acs-camera-modal'), modalTitle: $('acs-camera-title'), videoTime: $('acs-video-time'),
    tracking: $('acs-tracking-log'), entries: $('acs-tracking-entries'), status: $('acs-status-text')
  };

  const device = (id, type, x, y, width = 46, height = 58, rotation = 0, state = 'normal') => ({ id, type, x, y, width, height, rotation, state });
  const initialState = () => ({
    currentFloor: 1,
    floors: {
      1: { background: null, imageWidth: 1400, imageHeight: 900, elements: [
        device(401,'camera',15,22), device(402,'camera',61,22), device(403,'camera',88,68),
        device(404,'reader',21,42), device(405,'reader',82,42), device(406,'gate',50,85,52,62),
        device(407,'door',36,42), device(408,'door',60,56), device(409,'door',82,56),
        device(410,'camera',45,70), device(411,'gate',15,50,52,62)
      ] },
      2: { background: null, imageWidth: 1400, imageHeight: 900, elements: [
        device(501,'camera',16,21), device(502,'camera',83,25), device(503,'reader',59,43),
        device(504,'gate',51,84,52,62), device(505,'door',22,56), device(506,'door',82,57)
      ] },
      3: { background: null, imageWidth: 1400, imageHeight: 900, elements: [
        device(601,'camera',16,21), device(602,'reader',82,43), device(603,'gate',50,84,52,62), device(604,'door',60,56)
      ] }
    }
  });

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || ![1,2,3].includes(Number(saved.currentFloor))) return initialState();
      for (const floorNo of [1,2,3]) {
        const floor = saved.floors?.[floorNo];
        if (!floor || !Array.isArray(floor.elements)) return initialState();
        floor.elements = floor.elements.filter(el => el && catalog[el.type] && Number.isFinite(el.x) && Number.isFinite(el.y) && Number.isFinite(el.width) && Number.isFinite(el.height) && Number.isFinite(el.rotation) && Number.isFinite(Number(el.id)));
        floor.imageWidth = Math.max(1, Number(floor.imageWidth) || 1400);
        floor.imageHeight = Math.max(1, Number(floor.imageHeight) || 900);
        if (typeof floor.background !== 'string' || !floor.background.startsWith('data:image/')) floor.background = null;
      }
      saved.currentFloor = Number(saved.currentFloor);
      return saved;
    } catch { return initialState(); }
  }

  // Single source of truth. Coordinates are element CENTER points in percentages.
  const appState = loadState();
  window.appState = appState; // Exposed for integration/debugging; mutations should use the UI.
  let selectedId = null;
  let nextId = Math.max(400, ...Object.values(appState.floors).flatMap(floor => floor.elements.map(el => Number(el.id)))) + 1;
  let dragging = null;
  let breachTimer = null;
  let breachedId = null;
  let trackingTimers = [];
  let trackingFrame = null;
  let previousFocus = null;

  const currentFloor = () => appState.floors[appState.currentFloor];
  const selectedElement = () => currentFloor().elements.find(el => el.id === selectedId);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function persist(showConfirmation = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      if (showConfirmation) toast('Configuration saved', `Floor ${appState.currentFloor} is saved in this browser.`);
    } catch {
      toast('Storage is full', 'Try a smaller floor plan image; changes are not saved.', true);
    }
  }
  function toast(title, message, error = false) {
    const node = document.createElement('div');
    node.className = `acs-app-toast${error ? ' acs-app-toast-error' : ''}`;
    const symbol = document.createElement('span'); symbol.className = 'acs-app-toast-symbol'; symbol.textContent = error ? '⚠' : '✓';
    const text = document.createElement('span');
    const strong = document.createElement('strong'); strong.textContent = title;
    const small = document.createElement('small'); small.textContent = message;
    text.append(strong, small); node.append(symbol, text);
    $('acs-toast-region').append(node);
    window.setTimeout(() => node.remove(), 4600);
  }
  function setStatus(text) { ui.status.textContent = text; }
  function updateCanvas() {
    const floor = currentFloor();
    ui.floor.value = String(appState.currentFloor);
    $('acs-floor-crumb').textContent = floorNames[appState.currentFloor][0];
    $('acs-map-name').textContent = floorNames[appState.currentFloor][1];
    $('acs-device-count').textContent = `${floor.elements.length} DEVICE${floor.elements.length === 1 ? '' : 'S'}`;
    $('acs-map-dimensions').textContent = `${floor.imageWidth} × ${floor.imageHeight} PX`;
    ui.canvas.style.aspectRatio = `${floor.imageWidth} / ${floor.imageHeight}`;
    ui.canvas.style.backgroundImage = `url("${floor.background || DEFAULT_PLAN}")`;
  }
  function renderElements() {
    ui.elements.replaceChildren();
    for (const el of currentFloor().elements) {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = `acs-app-device acs-app-device-${el.type}${el.type === 'door' ? ` acs-app-device-${el.state}` : ''}${el.id === selectedId ? ' acs-app-device-selected' : ''}${el.id === breachedId ? ' acs-app-device-breached' : ''}`;
      node.dataset.id = String(el.id);
      node.setAttribute('aria-label', `${catalog[el.type].name} number ${el.id}${el.type === 'door' ? `, ${el.state}` : ''}`);
      node.style.left = `${el.x}%`; node.style.top = `${el.y}%`;
      node.style.width = `${el.width}px`; node.style.height = `${el.height}px`;
      node.style.setProperty('--acs-rotation', `${el.rotation}deg`);
      node.innerHTML = `<span class="acs-app-device-badge">${icon(el.type)}</span><span class="acs-app-device-label">${catalog[el.type].short} ${el.id}</span>`;
      ui.elements.append(node);
    }
    $('acs-device-count').textContent = `${currentFloor().elements.length} DEVICE${currentFloor().elements.length === 1 ? '' : 'S'}`;
  }
  function renderProperties() {
    const el = selectedElement();
    if (!el) {
      ui.properties.innerHTML = `<div class="acs-app-empty-state"><div class="acs-app-empty-icon">${icon('reader')}</div><p class="acs-app-empty-title">Select an element to edit</p><p class="acs-app-empty-description">Choose a device on the floor plan to adjust its size, rotation, or remove it.</p></div>`;
      return;
    }
    const field = (key, title, min, max, unit) => `<div class="acs-app-property-row"><label class="acs-app-property-label" for="acs-range-${key}"><span>${title}</span><span class="acs-app-property-value" id="acs-value-${key}">${el[key]}${unit}</span></label><input id="acs-range-${key}" class="acs-app-slider" type="range" data-property="${key}" min="${min}" max="${max}" value="${el[key]}" style="--acs-progress:${((el[key]-min)/(max-min))*100}%"></div>`;
    ui.properties.innerHTML = `<div class="acs-app-properties-inner"><div class="acs-app-property-device"><div class="acs-app-property-icon">${icon(el.type)}</div><div><strong>${catalog[el.type].name} #${el.id}</strong><small>DEVICE ID · ACS-${el.id}</small></div></div><div class="acs-app-property-heading">TRANSFORM</div>${field('width','Width',32,120,' px')}${field('height','Height',42,130,' px')}${field('rotation','Rotation',0,360,'°')}<p class="acs-app-property-hint">Drag the device directly on the map to reposition it.</p><div class="acs-app-property-divider"></div>${el.type === 'door' ? `<div class="acs-app-door-state ${el.state === 'locked' ? 'acs-app-door-state-locked' : ''}">● &nbsp; Door ${el.state === 'unlocked' ? 'unlocked' : el.state === 'locked' ? 'locked' : 'in normal mode'}</div>` : ''}<button id="acs-delete" class="acs-app-delete-button" type="button"><span aria-hidden="true">✕</span> Delete Element</button></div>`;
  }
  function render() { updateCanvas(); renderElements(); renderProperties(); }
  function select(id) { selectedId = id; renderElements(); renderProperties(); }

  // Clamp a rotated badge plus the label to the visible canvas, including after resizing.
  function positionWithinCanvas(el, clientX, clientY) {
    const rect = ui.canvas.getBoundingClientRect();
    const radians = el.rotation * Math.PI / 180;
    const badgeH = Math.max(24, el.height - 14);
    const halfX = (Math.abs(Math.cos(radians)) * el.width + Math.abs(Math.sin(radians)) * badgeH) / 2;
    const halfY = (Math.abs(Math.sin(radians)) * el.width + Math.abs(Math.cos(radians)) * badgeH) / 2;
    const marginX = Math.min(rect.width / 2, Math.max(halfX, 40));
    const marginY = Math.min(rect.height / 2, Math.max(halfY + 14, 22));
    el.x = Math.round(clamp((clientX - rect.left), marginX, rect.width - marginX) / rect.width * 10000) / 100;
    el.y = Math.round(clamp((clientY - rect.top), marginY, rect.height - marginY) / rect.height * 10000) / 100;
  }
  function isOnCanvas(x, y) {
    const r = ui.canvas.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function endDrag(event) {
    if (!dragging) return;
    const action = dragging;
    dragging = null;
    document.removeEventListener('mousemove', moveDrag);
    document.removeEventListener('mouseup', endDrag);
    if (action.kind === 'palette') {
      action.ghost.remove();
      if (isOnCanvas(event.clientX, event.clientY)) {
        const el = device(nextId++, action.type, 50, 50, action.type === 'gate' ? 52 : 46, action.type === 'gate' ? 62 : 58);
        positionWithinCanvas(el, event.clientX, event.clientY);
        currentFloor().elements.push(el);
        select(el.id); persist(); setStatus(`${catalog[el.type].name} #${el.id} added to Floor ${appState.currentFloor}`);
      }
    } else if (action.moved) {
      persist(); setStatus('Device position updated');
    } else if (action.el.type === 'camera') {
      openCamera(action.el);
    }
  }
  function moveDrag(event) {
    if (!dragging) return;
    event.preventDefault();
    if (dragging.kind === 'palette') {
      dragging.ghost.style.left = `${event.clientX}px`;
      dragging.ghost.style.top = `${event.clientY}px`;
      dragging.ghost.classList.toggle('acs-app-drag-invalid', !isOnCanvas(event.clientX, event.clientY));
    } else {
      if (!dragging.moved && Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) < 4) return;
      dragging.moved = true;
      positionWithinCanvas(dragging.el, event.clientX - dragging.offsetX, event.clientY - dragging.offsetY);
      const node = ui.elements.querySelector(`[data-id="${dragging.el.id}"]`);
      if (node) { node.style.left = `${dragging.el.x}%`; node.style.top = `${dragging.el.y}%`; }
      if (trackingFrame) stopTracking(); // A route is only valid for the positions at simulation start.
    }
  }
  function startDrag(action) { dragging = action; document.addEventListener('mousemove', moveDrag); document.addEventListener('mouseup', endDrag); }
  ui.palette.innerHTML = Object.entries(catalog).map(([type, info]) => `<button class="acs-app-palette-item" type="button" data-type="${type}" aria-label="Drag ${info.name} to floor plan"><span class="acs-app-palette-icon">${icon(type)}</span><span>${info.name}</span></button>`).join('');
  ui.palette.addEventListener('mousedown', event => {
    const item = event.target.closest('.acs-app-palette-item');
    if (!item || event.button !== 0) return;
    event.preventDefault();
    const type = item.dataset.type;
    const ghost = document.createElement('div'); ghost.className = 'acs-app-drag-ghost acs-app-drag-invalid'; ghost.innerHTML = icon(type);
    ghost.style.left = `${event.clientX}px`; ghost.style.top = `${event.clientY}px`;
    document.querySelector('#acs-builder-app').append(ghost);
    startDrag({ kind: 'palette', type, ghost });
  });
  ui.palette.addEventListener('keydown', event => {
    const item = event.target.closest('.acs-app-palette-item');
    if (!item || !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    const rect = ui.canvas.getBoundingClientRect();
    const el = device(nextId++, item.dataset.type, 50, 50);
    positionWithinCanvas(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
    currentFloor().elements.push(el); select(el.id); persist();
    toast('Device placed', `${catalog[el.type].name} #${el.id} placed at the center of the map.`);
  });
  ui.elements.addEventListener('mousedown', event => {
    const node = event.target.closest('.acs-app-device');
    if (!node || event.button !== 0) return;
    event.preventDefault();
    const el = currentFloor().elements.find(item => item.id === Number(node.dataset.id));
    if (!el) return;
    select(el.id);
    const rect = ui.canvas.getBoundingClientRect();
    startDrag({ kind: 'existing', el, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - (rect.left + rect.width * el.x / 100), offsetY: event.clientY - (rect.top + rect.height * el.y / 100), moved: false });
  });
  ui.elements.addEventListener('click', event => { if (event.detail === 0) { const node = event.target.closest('.acs-app-device'); if (node) { const el = currentFloor().elements.find(item => item.id === Number(node.dataset.id)); if (el) { select(el.id); if (el.type === 'camera') openCamera(el); } } } });
  ui.canvas.addEventListener('mousedown', event => { if (event.target === ui.canvas || event.target === ui.elements || event.target === ui.overlay) select(null); });
  ui.properties.addEventListener('input', event => {
    const input = event.target.closest('.acs-app-slider');
    const el = selectedElement();
    if (!input || !el) return;
    el[input.dataset.property] = Number(input.value);
    $('acs-value-' + input.dataset.property).textContent = input.value + (input.dataset.property === 'rotation' ? '°' : ' px');
    input.style.setProperty('--acs-progress', `${((Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min)))*100}%`);
    renderElements(); persist();
  });
  ui.properties.addEventListener('click', event => {
    if (!event.target.closest('#acs-delete')) return;
    const el = selectedElement(); if (!el) return;
    currentFloor().elements = currentFloor().elements.filter(item => item.id !== el.id);
    if (breachedId === el.id) breachedId = null;
    stopTracking(); selectedId = null; render(); persist(); setStatus(`${catalog[el.type].name} #${el.id} removed`);
  });
  $('acs-upload').addEventListener('change', event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'].includes(file.type)) { toast('Unsupported image', 'Choose a PNG, JPG, WEBP, GIF or SVG image.', true); event.target.value = ''; return; }
    const floorId = appState.currentFloor;
    const reader = new FileReader();
    reader.onerror = () => toast('Upload failed', 'The selected image could not be read.', true);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => toast('Invalid image', 'The selected file could not be decoded.', true);
      image.onload = () => {
        const floor = appState.floors[floorId];
        floor.background = reader.result;
        floor.imageWidth = image.naturalWidth;
        floor.imageHeight = image.naturalHeight;
        if (floorId === appState.currentFloor) { stopTracking(); render(); }
        persist(); toast('Floor plan uploaded', `${file.name} is now the background for Floor ${floorId}.`);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  });
  ui.floor.addEventListener('change', () => {
    stopTracking(); clearBreach(); selectedId = null;
    appState.currentFloor = Number(ui.floor.value);
    ui.scroll.scrollTo(0, 0); render(); persist(); setStatus(`Viewing Floor ${appState.currentFloor}`);
  });
  $('acs-save').addEventListener('click', () => persist(true));
  function setDoors(state) {
    const doors = currentFloor().elements.filter(el => el.type === 'door');
    doors.forEach(el => { el.state = state; });
    renderElements(); renderProperties(); persist();
    setStatus(`All doors ${state} on Floor ${appState.currentFloor}`);
    toast(`Doors ${state}`, `${doors.length} door${doors.length === 1 ? '' : 's'} updated on Floor ${appState.currentFloor}.`);
  }
  $('acs-lock-all').addEventListener('click', () => setDoors('locked'));
  $('acs-unlock-all').addEventListener('click', () => setDoors('unlocked'));
  function clearBreach() { clearTimeout(breachTimer); breachTimer = null; breachedId = null; renderElements(); }
  $('acs-breach').addEventListener('click', () => {
    const candidates = currentFloor().elements.filter(el => el.type === 'gate' || el.type === 'reader');
    if (!candidates.length) { toast('No access points available', 'Place a gate or card reader to trigger a breach.', true); return; }
    clearBreach();
    const el = candidates[Math.floor(Math.random() * candidates.length)];
    breachedId = el.id; renderElements();
    const name = el.type === 'gate' ? 'Gate' : 'Card Reader';
    toast('SECURITY ALERT', `Unauthorized access at ${name} #${el.id}`, true);
    setStatus(`ALERT: Unauthorized access at ${name} #${el.id}`);
    breachTimer = setTimeout(() => { breachedId = null; renderElements(); setStatus('All systems nominal'); }, 6500);
  });
  function openCamera(el) {
    previousFocus = document.activeElement;
    ui.modalTitle.textContent = `Camera #${el.id} · Live feed`;
    ui.modal.classList.remove('acs-app-hidden');
    updateVideoTime(); $('acs-close-modal').focus();
  }
  function closeCamera() { ui.modal.classList.add('acs-app-hidden'); previousFocus?.focus(); }
  function updateVideoTime() { ui.videoTime.textContent = new Date().toLocaleString('en-GB', { hour12: false }); }
  setInterval(() => { if (!ui.modal.classList.contains('acs-app-hidden')) updateVideoTime(); }, 1000);
  $('acs-close-modal').addEventListener('click', closeCamera);
  ui.modal.addEventListener('click', event => { if (event.target === ui.modal) closeCamera(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !ui.modal.classList.contains('acs-app-hidden')) closeCamera(); });

  function stopTracking() {
    trackingTimers.forEach(clearTimeout); trackingTimers = [];
    if (trackingFrame !== null) cancelAnimationFrame(trackingFrame);
    trackingFrame = null; ui.overlay.replaceChildren(); ui.tracking.classList.add('acs-app-hidden');
  }
  $('acs-close-tracking').addEventListener('click', stopTracking);
  $('acs-track').addEventListener('click', () => {
    stopTracking();
    const devices = [...currentFloor().elements];
    if (devices.length < 3) { toast('Not enough devices', 'Place at least 3 devices to simulate a route.', true); return; }
    // Shuffle without changing the stored element order.
    for (let i = devices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [devices[i],devices[j]] = [devices[j],devices[i]]; }
    const points = devices.slice(0, 3);
    ui.entries.innerHTML = '<div class="acs-app-tracking-wait">Locating personnel signal…</div>';
    ui.tracking.classList.remove('acs-app-hidden');
    const entries = ['08:00 AM - Authenticated at Main Gate', '08:02 AM - Passed Corridor Door', '08:05 AM - Last Known Location: Server Room'];
    entries.forEach((entry, index) => trackingTimers.push(setTimeout(() => {
      if (index === 0) ui.entries.replaceChildren();
      const line = document.createElement('div'); line.className = 'acs-app-tracking-entry';
      const dot = document.createElement('span'); dot.className = 'acs-app-tracking-entry-dot';
      const text = document.createElement('span'); text.textContent = entry;
      line.append(dot, text); ui.entries.append(line);
      if (index === 2) setStatus('Personnel last seen: Server Room');
    }, [300, 2100, 4200][index])));
    const canvasRect = ui.canvas.getBoundingClientRect();
    const w = canvasRect.width, h = canvasRect.height;
    ui.overlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const coords = points.map(el => [w * el.x / 100, h * el.y / 100]);
    const route = `M ${coords[0][0]} ${coords[0][1]} L ${coords[1][0]} ${coords[1][1]} L ${coords[2][0]} ${coords[2][1]}`;
    const glow = document.createElementNS(SVG_NS, 'path'); glow.setAttribute('d', route); glow.setAttribute('class', 'acs-app-route-glow');
    const path = document.createElementNS(SVG_NS, 'path'); path.setAttribute('d', route); path.setAttribute('class', 'acs-app-route-line'); path.setAttribute('pathLength', '100');
    const dot = document.createElementNS(SVG_NS, 'circle'); dot.setAttribute('r', '8'); dot.setAttribute('class', 'acs-app-route-dot');
    ui.overlay.append(glow, path, dot);
    const length = path.getTotalLength(), duration = 5200, started = performance.now();
    function tick(now) {
      const elapsed = (now - started) % duration;
      const progress = elapsed / duration;
      const p = path.getPointAtLength(length * progress);
      dot.setAttribute('cx', String(p.x)); dot.setAttribute('cy', String(p.y));
      trackingFrame = requestAnimationFrame(tick);
    }
    trackingFrame = requestAnimationFrame(tick);
    setStatus('Tracking Jordan Davis through the building');
  });
  window.addEventListener('resize', () => { if (trackingFrame !== null) stopTracking(); });
  render();
})();
