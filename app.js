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
  const iconVariants = {
    camera: [{ id: 'standard', label: 'دوربین پایه' }, { id: 'dome', label: 'دوربین سقفی', path: '<path d="M4 20a12 12 0 0 1 24 0H4Zm3 0v4h18v-4M12 26h8M15 8V5M6 9 4 7M26 9l2-2"/><circle cx="16" cy="17" r="2"/>' }],
    reader: [{ id: 'standard', label: 'کارت‌خوان پایه' }, { id: 'contactless', label: 'بدون تماس', path: '<rect x="6" y="3" width="20" height="26" rx="3"/><path d="M12 22h8M14 12a3 3 0 0 1 0 5M18 9a7 7 0 0 1 0 11M11 9a7 7 0 0 0 0 11"/>' }],
    gate: [{ id: 'standard', label: 'گیت گردان' }, { id: 'barrier', label: 'گیت بازویی', path: '<path d="M5 27V14h6v13M21 27V14h6v13M11 16l13-8 2 3-15 9M3 28h26"/><circle cx="8" cy="11" r="2"/>' }],
    door: [{ id: 'standard', label: 'در تک‌لنگه' }, { id: 'double', label: 'در دولنگه', path: '<path d="M3 29V4h26v25M6 29V8h10v21M16 8h10v21M3 29h26M12 19h1M20 19h1"/>' }]
  };
  const icon = (type, variant = 'standard') => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconVariants[type].find(item => item.id === variant)?.path || catalog[type].icon}</svg>`;
  const people = [
    { id: 4829, name: 'علیرضا قورچیان', initials: 'عق', role: 'مدیر فناوری اطلاعات', department: 'فناوری اطلاعات', floor: 1, x: 82, y: 24, location: 'اتاق سرور', entry: '۰۸:۰۰', last: '۰۸:۰۵', color: 'teal' },
    { id: 4731, name: 'مریم رضایی', initials: 'مر', role: 'کارشناس حراست', department: 'حراست', floor: 1, x: 37, y: 27, location: 'مرکز حراست', entry: '۰۷:۴۸', last: '۰۸:۱۲', color: 'blue' },
    { id: 4914, name: 'امیرحسین نوری', initials: 'ان', role: 'کارشناس پشتیبانی', department: 'عملیات', floor: 1, x: 43, y: 73, location: 'دفتر غربی', entry: '۰۸:۱۵', last: '۰۸:۲۱', color: 'amber' },
    { id: 5068, name: 'نگار احمدی', initials: 'نا', role: 'کارشناس منابع انسانی', department: 'منابع انسانی', floor: 2, x: 58, y: 44, location: 'راهروی اصلی', entry: '۰۸:۰۷', last: '۰۸:۳۲', color: 'violet' },
    { id: 5172, name: 'آرش محمدی', initials: 'آم', role: 'مسئول شبکه', department: 'فناوری اطلاعات', floor: 2, x: 81, y: 25, location: 'اتاق سرور', entry: '۰۷:۵۵', last: '۰۸:۲۸', color: 'blue' },
    { id: 5276, name: 'سارا کریمی', initials: 'سک', role: 'مدیر اداری', department: 'مدیریت', floor: 3, x: 58, y: 28, location: 'اتاق جلسه', entry: '۰۸:۲۲', last: '۰۸:۳۹', color: 'violet' },
    { id: 5310, name: 'پویا جعفری', initials: 'پج', role: 'کارشناس مالی', department: 'مالی', floor: 3, x: 48, y: 70, location: 'دفتر غربی', entry: '۰۸:۱۰', last: '۰۸:۴۱', color: 'amber' },
    { id: 5396, name: 'لیلا حسینی', initials: 'لح', role: 'پذیرش', department: 'اداری', floor: 1, x: 19, y: 27, location: 'پذیرش', entry: '۰۷:۳۰', last: '۰۸:۴۵', color: 'teal' }
  ];
  const sampleAlerts = () => [{ id: 1, type: 'denied', severity: 'medium', floor: 1, deviceId: 404, message: 'کارت نامعتبر در کارت‌خوان شماره ۴۰۴', time: 'امروز · ۰۷:۴۲', acknowledged: true }];
  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('acs-canvas'), elements: $('acs-elements'), scroll: $('acs-scroll-area'), overlay: $('acs-path-overlay'),
    floor: $('acs-floor-select'), properties: $('acs-properties'), palette: $('acs-palette'),
    modal: $('acs-camera-modal'), modalTitle: $('acs-camera-title'), videoTime: $('acs-video-time'), menu: $('acs-device-menu'),
    tracking: $('acs-tracking-log'), entries: $('acs-tracking-entries'), status: $('acs-status-text'), marker: $('acs-person-marker')
  };

  const device = (id, type, x, y, width = 46, height = 58, rotation = 0, state = 'normal') => ({ id, type, x, y, width, height, rotation, state });
  const initialState = () => ({
    currentFloor: 1,
    alerts: sampleAlerts(),
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
      saved.alerts = Array.isArray(saved.alerts) ? saved.alerts.filter(item => item && Number.isFinite(item.id) && typeof item.message === 'string').slice(0, 50) : sampleAlerts();
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
  let selectedPersonId = null;
  let activeTab = 'properties';
  let activeRoute = null;

  const currentFloor = () => appState.floors[appState.currentFloor];
  const selectedElement = () => currentFloor().elements.find(el => el.id === selectedId);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const fa = value => Number(value).toLocaleString('fa-IR', { useGrouping: false });
  const normalizeSearch = value => String(value).toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[\u064B-\u065F]/g, '');
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
      const stateIcon = ['door','gate'].includes(el.type) && ['locked','unlocked'].includes(el.state) ? `<span class="acs-app-device-state-indicator" aria-hidden="true">${el.state === 'locked' ? '🔒' : '🔓'}</span>` : '';
      node.innerHTML = `<span class="acs-app-device-badge">${icon(el.type, el.icon)}</span><span class="acs-app-device-label">${stateIcon}${catalog[el.type].short} ${fa(el.id)}</span>`;
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
    const icons = iconVariants[el.type].map(item => `<button class="acs-app-icon-choice" type="button" data-icon="${item.id}" aria-pressed="${(el.icon || 'standard') === item.id}">${icon(el.type, item.id)}<span>${item.label}</span></button>`).join('');
    ui.properties.innerHTML = `<div class="acs-app-properties-inner"><div class="acs-app-property-device"><div class="acs-app-property-icon">${icon(el.type, el.icon)}</div><div><strong>${catalog[el.type].name} شماره ${fa(el.id)}</strong><small>شناسه تجهیز · ACS-${el.id}</small></div></div><div class="acs-app-property-heading">اندازه و چرخش</div>${field('width','عرض',32,120,'پیکسل')}${field('height','ارتفاع',42,130,'پیکسل')}${field('rotation','چرخش',0,360,'درجه')}<p class="acs-app-property-hint">برای جابه‌جایی، تجهیز را روی نقشه بکشید.</p><div class="acs-app-property-divider"></div><div class="acs-app-property-heading">آیکون تجهیز</div><div class="acs-app-icon-choices">${icons}</div><div class="acs-app-property-divider"></div><div class="acs-app-property-heading">وضعیت تجهیز · ${stateLabel(el)}</div><div class="acs-app-state-actions">${actions}</div><button id="acs-delete" class="acs-app-delete-button" type="button"><span aria-hidden="true">✕</span> حذف تجهیز</button></div>`;
  }
  const personById = id => people.find(person => person.id === id);
  function setTab(tab) {
    activeTab = tab;
    for (const name of ['properties','personnel','events']) {
      const selected = name === tab;
      const button = $('acs-tab-' + name);
      button.classList.toggle('acs-app-panel-tab-active', selected);
      button.setAttribute('aria-selected', String(selected));
      $(name === 'properties' ? 'acs-properties' : `acs-${name}-panel`).classList.toggle('acs-app-hidden', !selected);
    }
  }
  function renderPersonMarker() {
    const person = personById(selectedPersonId);
    if (!person || person.floor !== appState.currentFloor) { ui.marker.classList.add('acs-app-hidden'); return; }
    ui.marker.style.left = `${person.x}%`;
    ui.marker.style.top = `${person.y}%`;
    ui.marker.innerHTML = `<span class="acs-app-marker-card"><span class="acs-app-marker-avatar">${person.initials}</span><span><strong>${person.name}</strong><small>${person.location}</small></span></span><span class="acs-app-marker-stem"></span><span class="acs-app-marker-point"></span>`;
    ui.marker.classList.remove('acs-app-hidden');
  }
  function renderPersonnel() {
    $('acs-personnel-total').textContent = `${fa(people.length)} نفر`;
    $('acs-presence-count').textContent = `${fa(people.filter(person => person.floor === appState.currentFloor).length)} نفر حاضر`;
    const query = normalizeSearch($('acs-person-search').value.trim());
    const filtered = people.filter(person => normalizeSearch(`${person.name} ${person.department} ${person.role} ${person.id} ${fa(person.id)} ${person.location}`).includes(query));
    $('acs-person-list').innerHTML = filtered.length ? filtered.map(person => `<button class="acs-app-person-row ${selectedPersonId === person.id ? 'acs-app-person-row-selected' : ''}" type="button" data-person-id="${person.id}"><span class="acs-app-person-avatar acs-app-person-avatar-${person.color}">${person.initials}</span><span class="acs-app-person-info"><strong>${person.name}</strong><small>${person.department} · ${floorNames[person.floor][0]}</small></span><span class="acs-app-person-online" title="حاضر در مجموعه"></span></button>`).join('') : '<div class="acs-app-list-empty">شخصی با این مشخصات یافت نشد.</div>';
    const detail = $('acs-person-detail');
    const person = personById(selectedPersonId);
    if (!person) { detail.classList.add('acs-app-hidden'); detail.replaceChildren(); return; }
    detail.innerHTML = `<div class="acs-app-person-detail-head"><span class="acs-app-person-avatar acs-app-person-avatar-${person.color}">${person.initials}</span><span><strong>${person.name}</strong><small>${person.role}</small></span></div><div class="acs-app-person-detail-line"><span>کد پرسنلی</span><strong>${fa(person.id)}</strong></div><div class="acs-app-person-detail-line"><span>محل فعلی</span><strong>${person.location}</strong></div><div class="acs-app-person-detail-line"><span>طبقه</span><strong>${floorNames[person.floor][0]}</strong></div><div class="acs-app-person-detail-line"><span>ورود / آخرین تردد</span><strong>${person.entry} / ${person.last}</strong></div><div class="acs-app-person-detail-line"><span>آخرین خروج</span><strong>دیروز · ۱۷:۳۵ از گیت اصلی</strong></div><div class="acs-app-person-inside">● اکنون داخل مجموعه حضور دارد</div><div class="acs-app-person-detail-actions"><button class="acs-app-person-action" type="button" data-person-action="locate">◎ نمایش موقعیت</button><button class="acs-app-person-action acs-app-person-action-secondary" type="button" data-person-action="route">↗ نمایش مسیر</button></div>`;
    detail.classList.remove('acs-app-hidden');
  }
  function focusPerson(person, switchTab = true) {
    if (!person) return;
    stopTracking(); selectedPersonId = person.id;
    if (person.floor !== appState.currentFloor) {
      ui.floor.value = String(person.floor);
      ui.floor.dispatchEvent(new Event('change', { bubbles: true }));
    } else { renderPersonMarker(); renderPersonnel(); }
    if (switchTab) setTab('personnel');
    setStatus(`موقعیت ${person.name}: ${person.location} · ${floorNames[person.floor][0]}`);
    requestAnimationFrame(() => { if (!ui.marker.classList.contains('acs-app-hidden')) ui.marker.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); });
  }
  function renderEvents() {
    const pending = appState.alerts.filter(alert => !alert.acknowledged).length;
    $('acs-alert-count').textContent = fa(pending);
    $('acs-alert-count').classList.toggle('acs-app-hidden', pending === 0);
    const list = $('acs-event-list'); list.replaceChildren();
    if (!appState.alerts.length) { const empty = document.createElement('div'); empty.className = 'acs-app-list-empty'; empty.textContent = 'رویدادی ثبت نشده است.'; list.append(empty); return; }
    for (const alert of appState.alerts.slice(0, 30)) {
      const card = document.createElement('div'); card.className = `acs-app-event-card${alert.acknowledged ? ' acs-app-event-card-ack' : ''}`;
      const head = document.createElement('div'); head.className = 'acs-app-event-head';
      const tag = document.createElement('span'); tag.className = `acs-app-event-severity acs-app-event-severity-${alert.severity === 'high' ? 'high' : 'medium'}`; tag.textContent = alert.severity === 'high' ? 'بحرانی' : 'هشدار';
      const time = document.createElement('span'); time.className = 'acs-app-event-time'; time.textContent = alert.time;
      head.append(tag, time);
      const message = document.createElement('strong'); message.textContent = alert.message;
      const foot = document.createElement('div'); foot.className = 'acs-app-event-foot';
      const floor = document.createElement('span'); floor.textContent = `طبقه ${fa(alert.floor)} · تجهیز ${fa(alert.deviceId)}`;
      const ack = document.createElement('button'); ack.type = 'button'; ack.className = 'acs-app-event-ack'; ack.dataset.ackId = String(alert.id); ack.textContent = alert.acknowledged ? 'تأیید شده ✓' : 'تأیید هشدار'; ack.disabled = !!alert.acknowledged;
      const locate = document.createElement('button'); locate.type = 'button'; locate.className = 'acs-app-event-locate'; locate.dataset.locateAlert = String(alert.id); locate.textContent = 'نمایش تجهیز';
      foot.append(floor, locate, ack); card.append(head, message, foot); list.append(card);
    }
  }
  function render() { updateCanvas(); renderElements(); renderProperties(); renderPersonMarker(); renderPersonnel(); renderEvents(); }
  function select(id) { if (id !== selectedId) hideMenu(); selectedId = id; renderElements(); renderProperties(); if (id !== null) setTab('properties'); }

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
    const iconChoice = event.target.closest('.acs-app-icon-choice');
    if (iconChoice) { const el = selectedElement(); if (el && iconVariants[el.type].some(item => item.id === iconChoice.dataset.icon)) { el.icon = iconChoice.dataset.icon; renderElements(); renderProperties(); persist(); } return; }
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
  document.querySelectorAll('.acs-app-panel-tab').forEach(button => button.addEventListener('click', () => setTab(button.id.replace('acs-tab-', ''))));
  $('acs-person-search').addEventListener('input', renderPersonnel);
  $('acs-person-list').addEventListener('click', event => {
    const row = event.target.closest('.acs-app-person-row');
    if (row) focusPerson(personById(Number(row.dataset.personId)));
  });
  $('acs-person-detail').addEventListener('click', event => {
    const button = event.target.closest('.acs-app-person-action');
    const person = personById(selectedPersonId);
    if (!button || !person) return;
    if (button.dataset.personAction === 'route') startTracking(person);
    else focusPerson(person);
  });
  $('acs-events-panel').addEventListener('click', event => {
    const action = event.target.closest('.acs-app-alert-action');
    if (action) { triggerAlert(action.dataset.alertType); return; }
    const locate = event.target.closest('.acs-app-event-locate');
    if (locate) {
      const alert = appState.alerts.find(item => item.id === Number(locate.dataset.locateAlert));
      if (!alert || ![1,2,3].includes(Number(alert.floor))) return;
      if (alert.floor !== appState.currentFloor) { ui.floor.value = String(alert.floor); ui.floor.dispatchEvent(new Event('change', { bubbles: true })); }
      const device = currentFloor().elements.find(item => item.id === alert.deviceId);
      if (!device) { toast('تجهیز پیدا نشد', 'این تجهیز از نقشه حذف شده است.', true); return; }
      select(device.id);
      requestAnimationFrame(() => ui.elements.querySelector(`[data-id="${device.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }));
      return;
    }
    const ack = event.target.closest('.acs-app-event-ack');
    if (ack) { const alert = appState.alerts.find(item => item.id === Number(ack.dataset.ackId)); if (alert) { alert.acknowledged = true; renderEvents(); persist(); } }
  });
  $('acs-ack-all').addEventListener('click', () => { appState.alerts.forEach(alert => { alert.acknowledged = true; }); renderEvents(); persist(); toast('هشدارها تأیید شدند', 'همه رویدادهای فعال بررسی شدند.'); });
  $('acs-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'acs-configuration.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('پشتیبان تهیه شد', 'فایل پیکربندی دانلود شد.');
  });
  $('acs-import').addEventListener('change', event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) { toast('فایل بیش از حد بزرگ است', 'فایل پیکربندی باید کوچک‌تر از ۱۲ مگابایت باشد.', true); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.floors || ![1,2,3].includes(Number(data.currentFloor))) throw new Error('invalid floors');
        for (const floorNo of [1,2,3]) {
          const floor = data.floors[floorNo];
          if (!floor || !Array.isArray(floor.elements) || floor.elements.length > 500) throw new Error('invalid devices');
          if (floor.background !== null && (typeof floor.background !== 'string' || !/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(floor.background))) throw new Error('invalid image');
          for (const el of floor.elements) {
            if (!el || !catalog[el.type] || ![el.id,el.x,el.y,el.width,el.height,el.rotation].every(Number.isFinite) || el.x < 0 || el.x > 100 || el.y < 0 || el.y > 100 || el.width < 20 || el.width > 200 || el.height < 20 || el.height > 200) throw new Error('invalid element');
            if (!iconVariants[el.type].some(variant => variant.id === (el.icon || 'standard'))) el.icon = 'standard';
          }
          floor.imageWidth = Math.max(1, Number(floor.imageWidth) || 1400);
          floor.imageHeight = Math.max(1, Number(floor.imageHeight) || 900);
        }
        stopTracking(); hideMenu(); clearBreach(); selectedId = null; selectedPersonId = null;
        appState.floors = data.floors; appState.currentFloor = Number(data.currentFloor);
        appState.alerts = Array.isArray(data.alerts) ? data.alerts.filter(alert => Number.isFinite(alert.id) && typeof alert.message === 'string').slice(0, 50) : [];
        nextId = Math.max(400, ...Object.values(appState.floors).flatMap(floor => floor.elements.map(el => el.id))) + 1;
        render(); persist(); toast('پیکربندی وارد شد', 'نقشه‌ها و تجهیزات بازیابی شدند.');
      } catch { toast('فایل نامعتبر است', 'ساختار فایل پیکربندی قابل‌قبول نیست.', true); }
    };
    reader.onerror = () => toast('خطا در خواندن فایل', 'لطفاً دوباره تلاش کنید.', true);
    reader.readAsText(file);
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
  const alertScenarios = {
    unauthorized: { type: 'gate', fallback: 'reader', title: 'دسترسی غیرمجاز', severity: 'high' },
    forced: { type: 'door', title: 'باز شدن اجباری در', severity: 'high', state: 'unlocked' },
    offline: { type: 'camera', title: 'قطع ارتباط دوربین', severity: 'medium', state: 'inactive' },
    denied: { type: 'reader', title: 'کارت نامعتبر', severity: 'medium' }
  };
  function triggerAlert(type) {
    const scenario = alertScenarios[type]; if (!scenario) return;
    const candidates = currentFloor().elements.filter(el => el.type === scenario.type || el.type === scenario.fallback);
    if (!candidates.length) { toast('تجهیز مناسب یافت نشد', `برای این هشدار یک ${catalog[scenario.type].name} به نقشه اضافه کنید.`, true); return; }
    clearBreach();
    const el = candidates[Math.floor(Math.random() * candidates.length)];
    if (scenario.state) el.state = scenario.state;
    breachedId = el.id;
    const message = `${scenario.title} در ${catalog[el.type].name} شماره ${fa(el.id)}`;
    const nextAlertId = Math.max(0, ...appState.alerts.map(alert => alert.id)) + 1;
    appState.alerts.unshift({ id: nextAlertId, type, severity: scenario.severity, floor: appState.currentFloor, deviceId: el.id, message, time: new Date().toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }), acknowledged: false });
    appState.alerts = appState.alerts.slice(0, 50);
    renderElements(); renderProperties(); renderEvents(); persist();
    toast('هشدار امنیتی', message, true); setStatus(`هشدار: ${message}`);
    breachTimer = setTimeout(() => { breachedId = null; renderElements(); setStatus('همه سامانه‌ها در وضعیت عادی هستند'); }, 6500);
  }
  $('acs-breach').addEventListener('click', () => triggerAlert('unauthorized'));
  function openCamera(el) {
    previousFocus = document.activeElement;
    ui.modalTitle.textContent = `دوربین شماره ${fa(el.id)} · ${el.state === 'inactive' ? 'قطع ارتباط' : 'پخش زنده'}`;
    ui.modal.classList.toggle('acs-app-modal-offline', el.state === 'inactive');
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
    trackingFrame = null; activeRoute = null;
    ui.overlay.replaceChildren(); ui.tracking.classList.add('acs-app-hidden');
  }
  function updateRouteGeometry() {
    if (!activeRoute) return;
    const route = activeRoute;
    const w = ui.canvas.clientWidth, h = ui.canvas.clientHeight;
    if (!w || !h) return;
    // SVG coordinates use the rendered canvas size: circles and strokes remain circular,
    // while percentage-based waypoints stay aligned after zoom, upload or fullscreen.
    ui.overlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
    ui.overlay.removeAttribute('preserveAspectRatio');
    const coords = route.points.map(point => [point.x * w / 100, point.y * h / 100]);
    const d = `M ${coords[0][0]} ${coords[0][1]} L ${coords[1][0]} ${coords[1][1]} L ${coords[2][0]} ${coords[2][1]}`;
    route.path.setAttribute('d', d); route.glow.setAttribute('d', d);
    coords.forEach(([x,y], index) => {
      route.pins[index].setAttribute('cx', String(x)); route.pins[index].setAttribute('cy', String(y));
      route.labels[index].setAttribute('x', String(x)); route.labels[index].setAttribute('y', String(y + 5));
    });
    route.length = route.path.getTotalLength();
    route.path.style.strokeDasharray = String(route.length);
    updateRoutePosition(route.progress);
  }
  function updateRoutePosition(progress) {
    if (!activeRoute || !activeRoute.length) return;
    const route = activeRoute;
    route.progress = progress;
    route.path.style.strokeDashoffset = String(route.length * (1 - progress));
    const point = route.path.getPointAtLength(route.length * progress);
    for (const marker of [route.dot, route.dotGlow]) {
      marker.setAttribute('cx', String(point.x)); marker.setAttribute('cy', String(point.y));
    }
  }
  function startTracking(person = personById(selectedPersonId)?.floor === appState.currentFloor ? personById(selectedPersonId) : people.find(item => item.floor === appState.currentFloor)) {
    if (!person) { toast('شخصی یافت نشد', 'ابتدا یک فرد حاضر را انتخاب کنید.', true); return; }
    stopTracking(); selectedPersonId = person.id;
    renderPersonMarker(); renderPersonnel();
    const devices = currentFloor().elements;
    const gate = devices.filter(el => el.type === 'gate').sort((a,b) => b.y - a.y)[0] || {x:50,y:85};
    const door = devices.filter(el => el.type === 'door').sort((a,b) => Math.hypot(a.x-person.x,a.y-person.y)-Math.hypot(b.x-person.x,b.y-person.y))[0] || {x:60,y:55};
    const points = [gate,door,person];
    $('acs-tracking-avatar').textContent = person.initials;
    $('acs-tracking-name').textContent = person.name;
    $('acs-tracking-id').textContent = `شماره پرسنلی · ${fa(person.id)}`;
    ui.entries.innerHTML = '<div class="acs-app-tracking-wait">در حال بازسازی مسیر تردد…</div>';
    ui.tracking.classList.remove('acs-app-hidden');
    const svg = (tag, attributes) => {
      const element = document.createElementNS(SVG_NS, tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
      return element;
    };
    const glow = svg('path', { class: 'acs-app-route-glow' });
    const path = svg('path', { class: 'acs-app-route-line' });
    ui.overlay.append(glow, path);
    const pins = [], labels = [];
    points.forEach((point, index) => {
      const pin = svg('circle', { r: 13, class: 'acs-app-route-pin' });
      const label = svg('text', { 'text-anchor': 'middle', class: 'acs-app-route-pin-label' });
      label.textContent = fa(index+1);
      pins.push(pin); labels.push(label); ui.overlay.append(pin, label);
    });
    const dotGlow = svg('circle', { r: 22, class: 'acs-app-route-dot-glow' });
    const dot = svg('circle', { r: 9, class: 'acs-app-route-dot' });
    ui.overlay.append(dotGlow, dot);
    const duration = 5500;
    activeRoute = { points, path, glow, pins, labels, dot, dotGlow, length: 0, progress: 0 };
    updateRouteGeometry();
    const firstLength = Math.hypot((points[1].x-points[0].x)*ui.canvas.clientWidth/100, (points[1].y-points[0].y)*ui.canvas.clientHeight/100);
    const middleTime = Math.round(duration * firstLength / Math.max(1, activeRoute.length));
    const toEnglish = digits => digits.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
    const entryMinutes = Number(toEnglish(person.entry).split(':')[0]) * 60 + Number(toEnglish(person.entry).split(':')[1]);
    const passageTime = `${fa(Math.floor((entryMinutes + 2) / 60)).padStart(2, '۰')}:${fa((entryMinutes + 2) % 60).padStart(2, '۰')}`;
    const entries = [
      `${person.entry} - ورود از گیت اصلی`,
      `${passageTime} - عبور از در راهرو`,
      `${person.last} - آخرین موقعیت: ${person.location}`
    ];
    [150,middleTime,duration].forEach((delay,index) => trackingTimers.push(setTimeout(() => {
      if (index === 0) ui.entries.replaceChildren();
      const line = document.createElement('div'); line.className = 'acs-app-tracking-entry';
      const point = document.createElement('span'); point.className = 'acs-app-tracking-entry-dot';
      const text = document.createElement('span'); text.textContent = entries[index];
      line.append(point,text); ui.entries.append(line);
      if (index === 2) setStatus(`آخرین موقعیت ${person.name}: ${person.location}`);
    }, delay)));
    const started = performance.now();
    function tick(now) {
      if (!activeRoute) return;
      const progress = Math.min((now - started) / duration, 1);
      updateRoutePosition(progress);
      if (progress < 1) trackingFrame = requestAnimationFrame(tick);
      else trackingFrame = null;
    }
    trackingFrame = requestAnimationFrame(tick);
    setStatus(`در حال نمایش مسیر ${person.name}`);
  }
  $('acs-close-tracking').addEventListener('click', stopTracking);
  $('acs-track').addEventListener('click', () => startTracking());
  if ('ResizeObserver' in window) new ResizeObserver(() => updateRouteGeometry()).observe(ui.canvas);
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
  window.addEventListener('resize', () => { hideMenu(); updateRouteGeometry(); });
  render();
})();
