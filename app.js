(() => {
  'use strict';

  const STORAGE_KEY = 'sentinel-access-map-v1';
  const DEFAULT_PLAN = 'assets/floor-plan.svg';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const floorNames = { 1: ['طبقه همکف', 'طبقه همکف / سطح ۰۱'], 2: ['طبقه عملیاتی', 'طبقه عملیاتی / سطح ۰۲'], 3: ['طبقه مدیریت', 'طبقه مدیریت / سطح ۰۳'] };
  const catalog = {
    camera: { name: 'دوربین', short: 'دوربین', icon: '<rect x="5" y="9" width="17" height="13" rx="3"/><path d="m22 13 7-4v13l-7-4M11 9V5h7v4M9 26h9"/><circle cx="13.5" cy="15.5" r="2.5"/>' },
    reader: { name: 'کارت‌خوان', short: 'کارت‌خوان', icon: '<rect x="9" y="3" width="14" height="26" rx="3"/><path d="M13 9h6M13 14h6M14 23h4"/><path d="M3 13c2-2 2-4 0-6M29 13c-2-2-2-4 0-6"/>' },
    gate: { name: 'گیت تردد', short: 'گیت', icon: '<path d="M4 5v23M28 5v23M4 10h24M16 10v15M8 18h16M16 25l-5 4M16 25l5 4"/>' },
    door: { name: 'در', short: 'در', icon: '<path d="M7 29V3h18v26M11 29V7h10v22M3 29h26"/><circle cx="18" cy="18" r="1"/>' }
  };
  const icon = (type) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${catalog[type].icon}</svg>`;
  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('acs-canvas'), elements: $('acs-elements'), scroll: $('acs-scroll-area'), overlay: $('acs-path-overlay'),
    floor: $('acs-floor-select'), properties: $('acs-properties'), palette: $('acs-palette'),
    modal: $('acs-camera-modal'), modalTitle: $('acs-camera-title'), videoTime: $('acs-video-time'), menu: $('acs-device-menu'),
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
  const fa = value => Number(value).toLocaleString('fa-IR', { useGrouping: false });
  const stateOptions = el => ['door','gate'].includes(el.type)
    ? [{ value: 'locked', label: '🔒 قفل کردن' }, { value: 'unlocked', label: '🔓 باز کردن' }]
    : [{ value: 'active', label: '● فعال کردن' }, { value: 'inactive', label: '○ غیرفعال کردن' }];
  const stateLabel = el => ({ locked: 'قفل', unlocked: 'باز', active: 'فعال', inactive: 'غیرفعال', normal: 'عادی' })[el.state] || 'عادی';
  function hideMenu() { ui.menu.classList.add('acs-app-hidden'); ui.menu.replaceChildren(); delete ui.menu.dataset.id; }
  function showMenu(el) {
    ui.menu.dataset.id = String(el.id);
    ui.menu.innerHTML = `<div class="acs-app-device-menu-title">${catalog[el.type].name} شماره ${fa(el.id)} · ${stateLabel(el)}</div>${stateOptions(el).map(option => `<button class="acs-app-device-menu-action" type="button" data-state="${option.value}" aria-pressed="${el.state === option.value}">${option.label}</button>`).join('')}`;
    // Keep the context menu inside the map even for devices near its edges.
    const width = ui.canvas.clientWidth, height = ui.canvas.clientHeight;
    ui.menu.style.left = `${clamp(width * el.x / 100 + el.width / 2 + 8, 8, Math.max(8, width - 185))}px`;
    ui.menu.style.top = `${clamp(height * el.y / 100 - 18, 8, Math.max(8, height - 108))}px`;
    ui.menu.classList.remove('acs-app-hidden');
  }
  function changeDeviceState(el, state) {
    if (!stateOptions(el).some(option => option.value === state)) return;
    el.state = state;
    hideMenu(); renderElements(); renderProperties(); persist();
    const message = `${catalog[el.type].name} شماره ${fa(el.id)}: ${stateLabel(el)}`;
    setStatus(message); toast('وضعیت تجهیز تغییر کرد', message);
  }
  function persist(showConfirmation = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      if (showConfirmation) toast('تنظیمات ذخیره شد', `اطلاعات طبقه ${fa(appState.currentFloor)} در این مرورگر ذخیره شد.`);
    } catch {
      toast('فضای ذخیره‌سازی کافی نیست', 'نقشه کوچک‌تری انتخاب کنید؛ تغییرات ذخیره نشد.', true);
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
    $('acs-floor-label').textContent = ui.floor.selectedOptions[0].textContent;
    document.querySelectorAll('.acs-app-floor-option').forEach(option => option.setAttribute('aria-selected', String(Number(option.dataset.floor) === appState.currentFloor)));
    $('acs-floor-crumb').textContent = floorNames[appState.currentFloor][0];
    $('acs-map-name').textContent = floorNames[appState.currentFloor][1];
    $('acs-device-count').textContent = `${fa(floor.elements.length)} تجهیز`;
    $('acs-map-dimensions').textContent = `${fa(floor.imageWidth)} × ${fa(floor.imageHeight)} پیکسل`;
    ui.canvas.style.aspectRatio = `${floor.imageWidth} / ${floor.imageHeight}`;
    ui.canvas.style.setProperty('--acs-plan-ratio', String(floor.imageWidth / floor.imageHeight));
    ui.canvas.style.backgroundImage = `url("${floor.background || DEFAULT_PLAN}")`;
  }
  function renderElements() {
    ui.elements.replaceChildren();
    for (const el of currentFloor().elements) {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = `acs-app-device acs-app-device-${el.type}${el.state !== 'normal' ? ` acs-app-device-${el.state}` : ''}${el.id === selectedId ? ' acs-app-device-selected' : ''}${el.id === breachedId ? ' acs-app-device-breached' : ''}`;
      node.dataset.id = String(el.id);
      node.setAttribute('aria-label', `${catalog[el.type].name} شماره ${fa(el.id)}، وضعیت ${stateLabel(el)}`);
      node.style.left = `${el.x}%`; node.style.top = `${el.y}%`;
      node.style.width = `${el.width}px`; node.style.height = `${el.height}px`;
      node.style.setProperty('--acs-rotation', `${el.rotation}deg`);
      node.innerHTML = `<span class="acs-app-device-badge">${icon(el.type)}</span><span class="acs-app-device-label">${catalog[el.type].short} ${fa(el.id)}</span>`;
      ui.elements.append(node);
    }
    $('acs-device-count').textContent = `${fa(currentFloor().elements.length)} تجهیز`;
  }
  function renderProperties() {
    const el = selectedElement();
    if (!el) {
      ui.properties.innerHTML = `<div class="acs-app-empty-state"><div class="acs-app-empty-icon">${icon('reader')}</div><p class="acs-app-empty-title">برای ویرایش، یک تجهیز انتخاب کنید</p><p class="acs-app-empty-description">روی یکی از تجهیزات نقشه کلیک کنید تا اندازه، چرخش و وضعیت آن را تغییر دهید.</p></div>`;
      return;
    }
    const field = (key, title, min, max, unit) => `<div class="acs-app-property-row"><label class="acs-app-property-label" for="acs-range-${key}"><span>${title}</span><span class="acs-app-property-value" id="acs-value-${key}">${fa(el[key])} ${unit}</span></label><input id="acs-range-${key}" class="acs-app-slider" type="range" data-property="${key}" min="${min}" max="${max}" value="${el[key]}" style="--acs-progress:${((el[key]-min)/(max-min))*100}%"></div>`;
    const actions = stateOptions(el).map(option => `<button class="acs-app-state-button" type="button" data-state="${option.value}" aria-pressed="${el.state === option.value}">${option.label}</button>`).join('');
    ui.properties.innerHTML = `<div class="acs-app-properties-inner"><div class="acs-app-property-device"><div class="acs-app-property-icon">${icon(el.type)}</div><div><strong>${catalog[el.type].name} شماره ${fa(el.id)}</strong><small>شناسه تجهیز · ACS-${el.id}</small></div></div><div class="acs-app-property-heading">اندازه و چرخش</div>${field('width','عرض',32,120,'پیکسل')}${field('height','ارتفاع',42,130,'پیکسل')}${field('rotation','چرخش',0,360,'درجه')}<p class="acs-app-property-hint">برای جابه‌جایی، تجهیز را روی نقشه بکشید.</p><div class="acs-app-property-divider"></div><div class="acs-app-property-heading">وضعیت تجهیز · ${stateLabel(el)}</div><div class="acs-app-state-actions">${actions}</div><button id="acs-delete" class="acs-app-delete-button" type="button"><span aria-hidden="true">✕</span> حذف تجهیز</button></div>`;
  }
  function render() { updateCanvas(); renderElements(); renderProperties(); }
  function select(id) { if (id !== selectedId) hideMenu(); selectedId = id; renderElements(); renderProperties(); }

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
        select(el.id); persist(); setStatus(`${catalog[el.type].name} شماره ${fa(el.id)} به طبقه ${fa(appState.currentFloor)} افزوده شد`);
      }
    } else if (action.moved) {
      hideMenu(); persist(); setStatus('موقعیت تجهیز به‌روز شد');
    } else if (action.el.type === 'camera') {
      hideMenu(); openCamera(action.el);
    } else {
      showMenu(action.el);
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
      dragging.moved = true; hideMenu();
      positionWithinCanvas(dragging.el, event.clientX - dragging.offsetX, event.clientY - dragging.offsetY);
      const node = ui.elements.querySelector(`[data-id="${dragging.el.id}"]`);
      if (node) { node.style.left = `${dragging.el.x}%`; node.style.top = `${dragging.el.y}%`; }
      if (!ui.tracking.classList.contains('acs-app-hidden')) stopTracking(); // A route is only valid for the original device positions.
    }
  }
  function startDrag(action) { dragging = action; document.addEventListener('mousemove', moveDrag); document.addEventListener('mouseup', endDrag); }
  ui.palette.innerHTML = Object.entries(catalog).map(([type, info]) => `<button class="acs-app-palette-item" type="button" data-type="${type}" aria-label="کشیدن ${info.name} روی نقشه"><span class="acs-app-palette-icon">${icon(type)}</span><span>${info.name}</span></button>`).join('');
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
    toast('تجهیز افزوده شد', `${catalog[el.type].name} شماره ${fa(el.id)} در مرکز نقشه قرار گرفت.`);
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
  ui.elements.addEventListener('click', event => { if (event.detail === 0) { const node = event.target.closest('.acs-app-device'); if (node) { const el = currentFloor().elements.find(item => item.id === Number(node.dataset.id)); if (el) { select(el.id); if (el.type === 'camera') openCamera(el); else showMenu(el); } } } });
  ui.elements.addEventListener('contextmenu', event => {
    const node = event.target.closest('.acs-app-device'); if (!node) return;
    event.preventDefault();
    const el = currentFloor().elements.find(item => item.id === Number(node.dataset.id));
    if (el) { select(el.id); showMenu(el); }
  });
  ui.menu.addEventListener('mousedown', event => event.stopPropagation());
  ui.menu.addEventListener('click', event => {
    const button = event.target.closest('.acs-app-device-menu-action');
    const el = currentFloor().elements.find(item => item.id === Number(ui.menu.dataset.id));
    if (button && el) changeDeviceState(el, button.dataset.state);
  });
  ui.canvas.addEventListener('mousedown', event => { if (event.target === ui.canvas || event.target === ui.elements || event.target === ui.overlay) { hideMenu(); select(null); } });
  ui.properties.addEventListener('input', event => {
    const input = event.target.closest('.acs-app-slider');
    const el = selectedElement();
    if (!input || !el) return;
    el[input.dataset.property] = Number(input.value);
    $('acs-value-' + input.dataset.property).textContent = `${fa(input.value)} ${input.dataset.property === 'rotation' ? 'درجه' : 'پیکسل'}`;
    input.style.setProperty('--acs-progress', `${((Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min)))*100}%`);
    renderElements(); persist();
  });
  ui.properties.addEventListener('click', event => {
    const action = event.target.closest('.acs-app-state-button');
    if (action) { const el = selectedElement(); if (el) changeDeviceState(el, action.dataset.state); return; }
    if (!event.target.closest('#acs-delete')) return;
    const el = selectedElement(); if (!el) return;
    currentFloor().elements = currentFloor().elements.filter(item => item.id !== el.id);
    if (breachedId === el.id) breachedId = null;
    stopTracking(); hideMenu(); selectedId = null; render(); persist(); setStatus(`${catalog[el.type].name} شماره ${fa(el.id)} حذف شد`);
  });
  $('acs-upload').addEventListener('change', event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'].includes(file.type)) { toast('فرمت تصویر پشتیبانی نمی‌شود', 'فایل PNG، JPG، WEBP، GIF یا SVG انتخاب کنید.', true); event.target.value = ''; return; }
    const floorId = appState.currentFloor;
    const reader = new FileReader();
    reader.onerror = () => toast('خطا در بارگذاری', 'خواندن تصویر انتخاب‌شده ممکن نیست.', true);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => toast('تصویر نامعتبر', 'نمایش فایل انتخاب‌شده ممکن نیست.', true);
      image.onload = () => {
        const floor = appState.floors[floorId];
        floor.background = reader.result;
        floor.imageWidth = image.naturalWidth;
        floor.imageHeight = image.naturalHeight;
        if (floorId === appState.currentFloor) { stopTracking(); render(); }
        persist(); toast('نقشه بارگذاری شد', `${file.name} برای طبقه ${fa(floorId)} ثبت شد.`);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  });
  const floorTrigger = $('acs-floor-trigger');
  const floorMenu = $('acs-floor-menu');
  const floorChoices = [...floorMenu.querySelectorAll('.acs-app-floor-option')];
  function closeFloorMenu() { floorMenu.classList.add('acs-app-hidden'); floorTrigger.setAttribute('aria-expanded', 'false'); }
  function openFloorMenu(focusChoice = false) {
    floorMenu.classList.remove('acs-app-hidden'); floorTrigger.setAttribute('aria-expanded', 'true');
    if (focusChoice) floorChoices[appState.currentFloor - 1].focus();
  }
  floorTrigger.addEventListener('click', () => {
    if (floorMenu.classList.contains('acs-app-hidden')) openFloorMenu(); else closeFloorMenu();
  });
  floorTrigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); openFloorMenu(true);
    }
  });
  floorMenu.addEventListener('click', event => {
    const option = event.target.closest('.acs-app-floor-option'); if (!option) return;
    ui.floor.value = option.dataset.floor;
    if (Number(ui.floor.value) !== appState.currentFloor) ui.floor.dispatchEvent(new Event('change', { bubbles: true }));
    closeFloorMenu(); floorTrigger.focus();
  });
  floorMenu.addEventListener('keydown', event => {
    const index = floorChoices.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); closeFloorMenu(); floorTrigger.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); floorChoices[(index + (event.key === 'ArrowDown' ? 1 : -1) + floorChoices.length) % floorChoices.length].focus();
    }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); floorChoices[event.key === 'Home' ? 0 : floorChoices.length - 1].focus(); }
  });
  ui.floor.addEventListener('change', () => {
    stopTracking(); clearBreach(); hideMenu(); selectedId = null;
    appState.currentFloor = Number(ui.floor.value);
    ui.scroll.scrollTo(0, 0); render(); persist(); setStatus(`نمایش طبقه ${fa(appState.currentFloor)}`);
  });
  $('acs-save').addEventListener('click', () => persist(true));
  function setDoors(state) {
    const doors = currentFloor().elements.filter(el => el.type === 'door');
    doors.forEach(el => { el.state = state; });
    renderElements(); renderProperties(); persist();
    hideMenu();
    setStatus(`همه درهای طبقه ${fa(appState.currentFloor)} ${state === 'locked' ? 'قفل' : 'باز'} شدند`);
    toast('وضعیت درها تغییر کرد', `${fa(doors.length)} در در طبقه ${fa(appState.currentFloor)} ${state === 'locked' ? 'قفل' : 'باز'} شد.`);
  }
  $('acs-lock-all').addEventListener('click', () => setDoors('locked'));
  $('acs-unlock-all').addEventListener('click', () => setDoors('unlocked'));
  function clearBreach() { clearTimeout(breachTimer); breachTimer = null; breachedId = null; renderElements(); }
  $('acs-breach').addEventListener('click', () => {
    const candidates = currentFloor().elements.filter(el => el.type === 'gate' || el.type === 'reader');
    if (!candidates.length) { toast('نقطه دسترسی یافت نشد', 'برای شبیه‌سازی هشدار، یک گیت یا کارت‌خوان روی نقشه قرار دهید.', true); return; }
    clearBreach();
    const el = candidates[Math.floor(Math.random() * candidates.length)];
    breachedId = el.id; renderElements();
    const name = catalog[el.type].name;
    toast('هشدار امنیتی', `دسترسی غیرمجاز در ${name} شماره ${fa(el.id)}`, true);
    setStatus(`هشدار: دسترسی غیرمجاز در ${name} شماره ${fa(el.id)}`);
    breachTimer = setTimeout(() => { breachedId = null; renderElements(); setStatus('همه سامانه‌ها در وضعیت عادی هستند'); }, 6500);
  });
  function openCamera(el) {
    previousFocus = document.activeElement;
    ui.modalTitle.textContent = `دوربین شماره ${fa(el.id)} · پخش زنده`;
    ui.modal.classList.remove('acs-app-hidden');
    updateVideoTime(); $('acs-close-modal').focus();
  }
  function closeCamera() { ui.modal.classList.add('acs-app-hidden'); previousFocus?.focus(); }
  function updateVideoTime() { ui.videoTime.textContent = new Date().toLocaleString('fa-IR', { hour12: false }); }
  setInterval(() => { if (!ui.modal.classList.contains('acs-app-hidden')) updateVideoTime(); }, 1000);
  $('acs-close-modal').addEventListener('click', closeCamera);
  ui.modal.addEventListener('click', event => { if (event.target === ui.modal) closeCamera(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !ui.modal.classList.contains('acs-app-hidden')) { event.preventDefault(); closeCamera(); } });

  function stopTracking() {
    trackingTimers.forEach(clearTimeout); trackingTimers = [];
    if (trackingFrame !== null) cancelAnimationFrame(trackingFrame);
    trackingFrame = null; ui.overlay.replaceChildren(); ui.tracking.classList.add('acs-app-hidden');
  }
  $('acs-close-tracking').addEventListener('click', stopTracking);
  $('acs-track').addEventListener('click', () => {
    stopTracking();
    const devices = [...currentFloor().elements];
    if (devices.length < 3) { toast('تجهیزات کافی نیست', 'برای شبیه‌سازی مسیر، دست‌کم ۳ تجهیز روی نقشه قرار دهید.', true); return; }
    // Prefer a logical entrance → corridor → destination journey. Fall back to other devices if needed.
    const gate = devices.filter(el => el.type === 'gate').sort((a, b) => b.y - a.y)[0];
    const door = devices.filter(el => el.type === 'door').sort((a, b) => Math.hypot(a.x - 62, a.y - 55) - Math.hypot(b.x - 62, b.y - 55))[0];
    const camera = devices.filter(el => el.type === 'camera').sort((a, b) => Math.hypot(a.x - 84, a.y - 23) - Math.hypot(b.x - 84, b.y - 23))[0];
    const points = [gate, door, camera].filter((el, index, list) => el && list.indexOf(el) === index);
    for (const el of devices) { if (points.length === 3) break; if (!points.includes(el)) points.push(el); }
    ui.entries.innerHTML = '<div class="acs-app-tracking-wait">در حال یافتن موقعیت پرسنل…</div>';
    ui.tracking.classList.remove('acs-app-hidden');
    const entries = ['۰۸:۰۰ - احراز هویت در گیت اصلی', '۰۸:۰۲ - عبور از در راهرو', '۰۸:۰۵ - آخرین موقعیت: اتاق سرور'];
    entries.forEach((entry, index) => trackingTimers.push(setTimeout(() => {
      if (index === 0) ui.entries.replaceChildren();
      const line = document.createElement('div'); line.className = 'acs-app-tracking-entry';
      const marker = document.createElement('span'); marker.className = 'acs-app-tracking-entry-dot';
      const text = document.createElement('span'); text.textContent = entry;
      line.append(marker, text); ui.entries.append(line);
      if (index === 2) setStatus('آخرین موقعیت پرسنل: اتاق سرور');
    }, [150, 2600, 5200][index])));

    // Percent-based viewBox stays aligned with device centers even when the map is resized/fullscreen.
    ui.overlay.setAttribute('viewBox', '0 0 1000 1000');
    ui.overlay.setAttribute('preserveAspectRatio', 'none');
    const route = `M ${points[0].x * 10} ${points[0].y * 10} L ${points[1].x * 10} ${points[1].y * 10} L ${points[2].x * 10} ${points[2].y * 10}`;
    const svg = (tag, attributes) => {
      const element = document.createElementNS(SVG_NS, tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
      return element;
    };
    const glow = svg('path', { d: route, class: 'acs-app-route-glow' });
    const path = svg('path', { d: route, class: 'acs-app-route-line', pathLength: '100' });
    ui.overlay.append(glow, path);
    points.forEach((el, index) => {
      const pin = svg('circle', { cx: el.x * 10, cy: el.y * 10, r: 13, class: 'acs-app-route-pin' });
      const label = svg('text', { x: el.x * 10, y: el.y * 10 + 5, 'text-anchor': 'middle', class: 'acs-app-route-pin-label' });
      label.textContent = fa(index + 1);
      ui.overlay.append(pin, label);
    });
    const dotGlow = svg('circle', { r: 22, class: 'acs-app-route-dot-glow' });
    const dot = svg('circle', { r: 9, class: 'acs-app-route-dot' });
    ui.overlay.append(dotGlow, dot);
    const length = path.getTotalLength(), duration = 5200, started = performance.now();
    function tick(now) {
      const progress = Math.min((now - started) / duration, 1);
      const p = path.getPointAtLength(length * progress);
      for (const marker of [dotGlow, dot]) { marker.setAttribute('cx', String(p.x)); marker.setAttribute('cy', String(p.y)); }
      if (progress < 1) trackingFrame = requestAnimationFrame(tick);
      else trackingFrame = null;
    }
    trackingFrame = requestAnimationFrame(tick);
    setStatus('ردیابی حرکت پرسنل در ساختمان');
  });
  const mapFrame = document.querySelector('.acs-app-map-frame');
  mapFrame.append(ui.modal, ui.tracking);
  const fullscreenButton = $('acs-fullscreen');
  function updateFullscreenButton() {
    const expanded = document.fullscreenElement === mapFrame || mapFrame.classList.contains('acs-app-map-fullscreen');
    $('acs-fullscreen-label').textContent = expanded ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه';
    fullscreenButton.setAttribute('aria-label', expanded ? 'خروج از تمام‌صفحه نقشه' : 'تمام‌صفحه کردن نقشه');
    fullscreenButton.setAttribute('aria-pressed', String(expanded));
  }
  fullscreenButton.addEventListener('click', async () => {
    if (document.fullscreenElement === mapFrame) { await document.exitFullscreen(); return; }
    if (mapFrame.classList.contains('acs-app-map-fullscreen')) { mapFrame.classList.remove('acs-app-map-fullscreen'); updateFullscreenButton(); return; }
    try {
      if (!mapFrame.requestFullscreen) throw new Error('Fullscreen unavailable');
      await mapFrame.requestFullscreen();
    } catch {
      // Embedded portals may deny Fullscreen API; use a contained CSS fallback.
      mapFrame.classList.add('acs-app-map-fullscreen');
    }
    updateFullscreenButton();
  });
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      hideMenu(); closeFloorMenu();
      if (mapFrame.classList.contains('acs-app-map-fullscreen')) { mapFrame.classList.remove('acs-app-map-fullscreen'); updateFullscreenButton(); }
    }
  });
  document.addEventListener('mousedown', event => {
    if (!event.target.closest('.acs-app-device-menu') && !event.target.closest('.acs-app-device')) hideMenu();
    if (!event.target.closest('.acs-app-select-wrap')) closeFloorMenu();
  });
  window.addEventListener('resize', hideMenu);
  render();
})();
