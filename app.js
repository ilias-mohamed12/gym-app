// FitBox – Kalorien, Mahlzeiten, Training, Übungsvideos. Alles bleibt auf dem Gerät.
(() => {
  // ---------------------------------------------------------------- helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const fmt = (n) => Math.round(n).toLocaleString('de-DE');
  const pad = (n) => String(n).padStart(2, '0');
  const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
  const today = () => dayStr(new Date());
  const timeStr = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const durStr = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return m >= 60 ? `${Math.floor(m / 60)}:${pad(m % 60)}:${pad(s)}` : `${m}:${pad(s)}`; };
  const dayLabel = (s) => {
    if (s === today()) return 'Heute';
    if (s === addDays(today(), -1)) return 'Gestern';
    return parseDay(s).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const weekday = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = Montag
  const kg = (n) => (Math.round(num(n) * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  // weeks: Monday-based, counted continuously (2024-01-01 is a Monday)
  const mondayOf = (s) => { const d = parseDay(s); d.setDate(d.getDate() - weekday(d)); return dayStr(d); };
  const weekIdx = (s) => Math.round((parseDay(mondayOf(s)) - new Date(2024, 0, 1)) / 6048e5);
  const isoWeek = (s) => { const d = parseDay(s); d.setDate(d.getDate() + 3 - weekday(d)); const j4 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - j4) / 864e5 - 3 + weekday(j4)) / 7); };
  const shortDate = (s) => parseDay(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

  // weekly rotation: every week another exercise / muscle group goes first
  function groupsOf(exs) {
    const order = [], map = new Map();
    exs.forEach((e) => { const g = (e.muscle || '').trim().toLowerCase() || '#' + e.id; if (!map.has(g)) { map.set(g, []); order.push(g); } map.get(g).push(e); });
    return order.map((g) => map.get(g));
  }
  const groupLabel = (g) => (g[0].muscle || '').trim() || g[0].name;
  function rotation(plan, day = today()) {
    const exs = plan.exercises.filter((e) => (e.name || '').trim());
    const first = exs.filter((e) => e.fixed === 'start'), last = exs.filter((e) => e.fixed === 'end');
    const mid = exs.filter((e) => e.fixed !== 'start' && e.fixed !== 'end');
    const groups = groupsOf(mid), n = groups.length;
    if (!plan.rotate || n < 2) return { exercises: [...first, ...mid, ...last], groups, k: 0, n };
    const k = (((weekIdx(day) - (plan.rotateStart ?? weekIdx(day))) % n) + n) % n;
    const rot = [...groups.slice(k), ...groups.slice(0, k)];
    return { exercises: [...first, ...rot.flat(), ...last], groups: rot, k, n };
  }

  const kg1 = (n) => num(n).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); // body weight: always 1 decimal
  const upperReps = (r) => { const m = String(r || '').match(/\d+/g); return m ? +m[m.length - 1] : 0; };
  const goalHit = (e) => { const done = e.sets.filter((s) => s.done); const u = e.repsUpper; return !!u && e.fixed !== 'start' && done.length >= (e.plannedSets || e.sets.length) && done.every((s) => num(s.reps) >= u); };
  const bestWeight = (sets) => sets.filter((s) => s.done).reduce((a, s) => Math.max(a, num(s.weight)), 0);
  const setsText = (sets) => sets.filter((s) => s.done).map((s) => `${s.reps || '–'}${num(s.weight) ? ` × ${kg(s.weight)} kg` : ''}`).join(' · ');

  const ICON = {
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
    play: '<svg viewBox="0 0 24 24" style="fill:#fff;stroke:none"><path d="M8 5v14l11-7z"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 19h16M6 15l4-4 3 3 5-6"/></svg>',
    rotate: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4"/></svg>',
    film: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  };

  // ---------------------------------------------------------------- state
  const state = {
    tab: 'today',
    date: today(),
    settings: { kcalGoal: 2850, proteinGoal: 135, weightStep: 2.5, restSec: 90 },
    folderId: null,       // open video folder
    workoutView: false,   // showing the running workout
    workout: null,        // running workout (persisted)
    editPlan: null,       // plan being edited in the sheet
    rest: null,           // rest timer { until }
  };
  const urls = [];        // object URLs to revoke on re-render
  const keepUrl = (blob) => { const u = URL.createObjectURL(blob); urls.push(u); return u; };
  const freeUrls = () => { while (urls.length) URL.revokeObjectURL(urls.pop()); };

  const view = $('#view'), sheet = $('#sheet'), sheetBg = $('#sheetBg');

  async function kvGet(key, def) { const r = await DB.get('kv', key); return r ? r.value : def; }
  const kvSet = (key, value) => DB.put('kv', { key, value });

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 1800);
  }

  // ---------------------------------------------------------------- sheet
  function openSheet(html, opt = {}) {
    sheet.className = 'sheet' + (opt.full ? ' full' : '');
    sheet.innerHTML = (opt.full ? '' : '<div class="grab"></div>') + html;
    sheet.hidden = false; sheetBg.hidden = !!opt.full;
    sheet.scrollTop = 0;
    const first = $('[autofocus]', sheet); if (first && !opt.noFocus) setTimeout(() => first.focus(), 250);
  }
  function closeSheet() {
    $$('video', sheet).forEach((v) => v.pause());
    sheet.hidden = true; sheetBg.hidden = true; sheet.innerHTML = '';
    state.editPlan = null;
  }
  sheetBg.addEventListener('click', closeSheet);

  // ---------------------------------------------------------------- header + tabs
  function setHeader(title, { back = false, action = '' } = {}) {
    $('#title').textContent = title;
    $('#backBtn').hidden = !back;
    $('#actionBtn').innerHTML = action;
  }
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    if (state.tab === b.dataset.tab) { state.folderId = null; state.workoutView = false; }
    state.tab = b.dataset.tab;
    $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
    render();
  });
  $('#backBtn').addEventListener('click', () => {
    if (state.tab === 'videos') state.folderId = null;
    if (state.tab === 'training') state.workoutView = false;
    render();
  });
  $('#actionBtn').addEventListener('click', () => {
    const a = $('#actionBtn').dataset.act;
    if (a && actions[a]) actions[a]({});
  });
  const action = (act, icon) => { $('#actionBtn').dataset.act = act; return icon; };

  async function render() {
    freeUrls();
    window.scrollTo(0, 0);
    if (state.tab === 'today') return renderToday();
    if (state.tab === 'meals') return renderMeals();
    if (state.tab === 'training') return state.workoutView && state.workout ? renderWorkout() : renderTraining();
    if (state.tab === 'weight') return renderWeight();
    if (state.tab === 'videos') return state.folderId ? renderFolder() : renderFolders();
  }

  // ================================================================ TODAY
  async function renderToday() {
    setHeader(state.date === today() ? 'Heute' : dayLabel(state.date), { action: action('settings', ICON.gear) });
    const entries = (await DB.by('entries', 'date', state.date)).sort((a, b) => a.time - b.time);
    const kcal = entries.reduce((a, e) => a + num(e.kcal), 0);
    const protein = entries.reduce((a, e) => a + num(e.protein), 0);
    const goal = state.settings.kcalGoal || 2000, pGoal = state.settings.proteinGoal || 0;
    const left = goal - kcal, pct = Math.min(1, kcal / goal);
    const C = 2 * Math.PI * 64;
    const ringCol = kcal > goal ? 'var(--danger)' : 'var(--accent)';
    view.innerHTML = `
      <div class="datebar">
        <button data-act="dayPrev" aria-label="Vorheriger Tag">${ICON.left}</button>
        <span class="d" data-act="dayToday">${esc(parseDay(state.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
        <button data-act="dayNext" aria-label="Nächster Tag" ${state.date >= today() ? 'style="visibility:hidden"' : ''}>${ICON.right}</button>
      </div>
      <div class="card">
        <div class="ring-wrap">
          <div class="ring">
            <svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="64" stroke="var(--field)" stroke-width="14" fill="none"/>
              <circle cx="75" cy="75" r="64" stroke="${ringCol}" stroke-width="14" fill="none" stroke-linecap="round"
                stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="transition:stroke-dashoffset .5s"/></svg>
            <div class="c"><div class="big ${left < 0 ? 'over' : ''}">${fmt(Math.abs(left))}</div><div class="lbl">${left < 0 ? 'kcal zu viel' : 'kcal übrig'}</div></div>
          </div>
          <div class="stats">
            <div class="stat"><div class="k">Gegessen</div><div class="v">${fmt(kcal)} <small style="font-size:14px;color:var(--muted)">/ ${fmt(goal)} kcal</small></div></div>
            ${pGoal ? `<div class="stat"><div class="k">Protein</div><div class="v">${fmt(protein)} <small style="font-size:14px;color:var(--muted)">/ ${fmt(pGoal)} g</small></div>
              <div class="bar"><i style="width:${Math.min(100, (protein / pGoal) * 100)}%"></i></div></div>` : ''}
          </div>
        </div>
      </div>
      <button class="btn" data-act="addFood">${ICON.plus} Essen eintragen</button>
      <div class="section-title">Eingetragen</div>
      ${entries.length ? `<div class="list">${entries.map((e) => `
        <button class="row" data-act="entry" data-id="${e.id}">
          <div class="grow"><div class="name">${esc(e.name)}</div><div class="sub">${timeStr(e.time)}${num(e.protein) ? ` · ${fmt(e.protein)} g Protein` : ''}</div></div>
          <div class="kcal">${fmt(e.kcal)} kcal</div>
        </button>`).join('')}</div>`
        : `<div class="card empty"><b>Noch nichts eingetragen</b>Tippe auf „Essen eintragen“.</div>`}
    `;
  }

  async function foodSheet(mode) {
    const meals = (await DB.all('meals')).sort((a, b) => (b.used || 0) - (a.used || 0) || a.name.localeCompare(b.name));
    mode = mode || (meals.length ? 'saved' : 'quick');
    openSheet(`
      <h2>Essen eintragen</h2>
      <div class="seg"><button data-act="foodMode" data-mode="saved" class="${mode === 'saved' ? 'on' : ''}">Gespeichert</button>
        <button data-act="foodMode" data-mode="quick" class="${mode === 'quick' ? 'on' : ''}">Schnell eintragen</button></div>
      ${mode === 'saved' ? `
        ${meals.length > 5 ? '<input class="in search" id="mealSearch" placeholder="Suchen…" autocomplete="off">' : ''}
        ${meals.length ? `<div class="list" id="mealPick">${meals.map((m) => `
          <div class="row" data-name="${esc(m.name.toLowerCase())}">
            <div class="grow"><div class="name">${esc(m.name)}</div><div class="sub">${fmt(m.kcal)} kcal${num(m.protein) ? ` · ${fmt(m.protein)} g Protein` : ''}</div></div>
            <button class="plus" data-act="pickMeal" data-id="${m.id}" aria-label="Eintragen">${ICON.plus}</button>
          </div>`).join('')}</div>`
          : '<div class="card empty"><b>Noch keine Mahlzeiten gespeichert</b>Trag etwas über „Schnell eintragen“ ein und hak „Als Mahlzeit speichern“ an.</div>'}
      ` : `
        <label class="f"><span>Was hast du gegessen?</span><input class="in" id="qName" placeholder="z. B. Hähnchen mit Reis" autocomplete="off" autofocus></label>
        <div class="grid2">
          <label class="f"><span>Kalorien (kcal)</span><input class="in" id="qKcal" inputmode="decimal" placeholder="0"></label>
          <label class="f"><span>Protein (g) – optional</span><input class="in" id="qProtein" inputmode="decimal" placeholder="0"></label>
        </div>
        <label class="check"><input type="checkbox" id="qSave" checked> Als Mahlzeit speichern</label>
        <button class="btn" data-act="quickSave">Eintragen</button>
      `}
    `, { noFocus: mode === 'saved' });
    const s = $('#mealSearch');
    if (s) s.addEventListener('input', () => { const q = s.value.trim().toLowerCase(); $$('#mealPick .row').forEach((r) => { r.hidden = !r.dataset.name.includes(q); }); });
  }

  async function addEntry(name, kcal, protein) {
    await DB.put('entries', { id: uid(), date: state.date, name, kcal: num(kcal), protein: num(protein), time: Date.now() });
  }

  // ================================================================ MEALS
  async function renderMeals() {
    setHeader('Mahlzeiten', { action: action('newMeal', ICON.plus) });
    const meals = (await DB.all('meals')).sort((a, b) => a.name.localeCompare(b.name));
    view.innerHTML = `
      <p class="hint">Speichere Gerichte, die du oft isst. Dann trägst du sie mit einem Tipp ein.</p>
      ${meals.length ? `<div class="list">${meals.map((m) => `
        <div class="row">
          <button class="grow" data-act="meal" data-id="${m.id}" style="border:0;background:none;text-align:left;padding:0">
            <div class="name">${esc(m.name)}</div><div class="sub">${fmt(m.kcal)} kcal${num(m.protein) ? ` · ${fmt(m.protein)} g Protein` : ''}</div>
          </button>
          <button class="plus" data-act="mealToday" data-id="${m.id}" aria-label="Heute eintragen">${ICON.plus}</button>
        </div>`).join('')}</div>`
        : `<div class="card empty"><b>Noch keine Mahlzeiten</b>Leg deine Lieblingsgerichte einmal an.</div>`}
      <button class="btn" data-act="newMeal">${ICON.plus} Neue Mahlzeit</button>
    `;
  }

  function mealSheet(m) {
    const isNew = !m; m = m || { name: '', kcal: '', protein: '' };
    openSheet(`
      <h2>${isNew ? 'Neue Mahlzeit' : 'Mahlzeit bearbeiten'}</h2>
      <label class="f"><span>Name</span><input class="in" id="mName" value="${esc(m.name)}" placeholder="z. B. Overnight Oats" autocomplete="off" ${isNew ? 'autofocus' : ''}></label>
      <div class="grid2">
        <label class="f"><span>Kalorien (kcal)</span><input class="in" id="mKcal" inputmode="decimal" value="${esc(m.kcal)}" placeholder="0"></label>
        <label class="f"><span>Protein (g)</span><input class="in" id="mProtein" inputmode="decimal" value="${esc(m.protein)}" placeholder="0"></label>
      </div>
      <button class="btn" data-act="mealSave" data-id="${isNew ? '' : m.id}">Speichern</button>
      ${isNew ? '' : `<button class="btn secondary" data-act="mealToday" data-id="${m.id}">Heute eintragen</button>
        <button class="btn danger" data-act="mealDel" data-id="${m.id}">Löschen</button>`}
    `);
  }

  // ================================================================ TRAINING
  async function renderTraining() {
    setHeader('Training', { action: action('newPlan', ICON.plus) });
    const wd = weekday();
    const plans = (await DB.all('plans')).sort((a, b) => ((b.days || []).includes(wd) - (a.days || []).includes(wd)) || (a.createdAt || 0) - (b.createdAt || 0));
    const history = (await DB.all('workouts')).sort((a, b) => b.startedAt - a.startedAt).slice(0, 15);
    view.innerHTML = `
      ${state.workout ? `<button class="banner" data-act="resume">${ICON.play}<span style="flex:1">Training läuft: ${esc(state.workout.planName)}<br><small style="font-weight:500;opacity:.9">Tippen zum Fortsetzen</small></span>${ICON.right}</button>` : ''}
      <div class="section-title">Meine Pläne</div>
      ${plans.length ? plans.map((p) => `
        <div class="card plan-card">
          <button class="grow" data-act="plan" data-id="${p.id}" style="border:0;background:none;text-align:left;padding:0">
            <h3>${esc(p.name)} ${(p.days || []).includes(wd) ? '<span class="badge">Heute dran</span>' : ''}</h3>
            ${(p.days || []).length ? `<div class="sub" style="color:var(--accent);font-size:13px;font-weight:700">${p.days.slice().sort().map((d) => DAYS[d]).join(' · ')}</div>` : ''}
            ${p.rotate && rotation(p).n > 1 ? `<div class="sub" style="font-size:13px;font-weight:700">${ICON.rotate.replace('<svg ', '<svg style="width:14px;height:14px;vertical-align:-2px" ')} Diese Woche zuerst: ${esc(groupLabel(rotation(p).groups[0]))}</div>` : ''}
            <div class="sub" style="color:var(--muted);font-size:14px">${p.exercises.length} Übung${p.exercises.length === 1 ? '' : 'en'} · ${esc(rotation(p).exercises.slice(0, 3).map((e) => e.name).join(', '))}${p.exercises.length > 3 ? ' …' : ''}</div>
          </button>
          <button class="btn small" data-act="start" data-id="${p.id}">Start</button>
        </div>`).join('')
        : `<div class="card empty"><b>Noch kein Trainingsplan</b>Leg z. B. „Oberkörper“ oder „Rücken & Becken“ an.</div>`}
      <button class="btn secondary" data-act="newPlan">${ICON.plus} Neuer Plan</button>
      ${typeof TEMPLATES !== 'undefined' ? `<button class="btn secondary" data-act="loadTemplate" data-t="split6">📋 Vorlage laden: ${esc(TEMPLATES.split6.title)}</button>` : ''}
      <div class="section-title">Verlauf</div>
      ${history.length ? `<div class="list">${history.map((w) => {
        const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
        return `<button class="row" data-act="historyItem" data-id="${w.id}">
          <div class="grow"><div class="name">${esc(w.planName)}</div><div class="sub">${esc(dayLabel(w.date))} · ${durStr((w.finishedAt - w.startedAt) / 1000)} · ${done} Sätze</div></div>${ICON.right}</button>`;
      }).join('')}</div>` : '<div class="card empty">Hier erscheinen deine abgeschlossenen Trainings.</div>'}
    `;
  }

  async function planSheet(p) {
    const isNew = !p;
    state.editPlan = isNew ? { id: uid(), name: '', exercises: [], createdAt: Date.now(), isNew: true } : JSON.parse(JSON.stringify(p));
    if (isNew) state.editPlan.exercises.push(newExercise());
    await drawPlanEditor();
  }
  const newExercise = () => ({ id: uid(), name: '', sets: 3, reps: '10', weight: '', folderId: '', note: '' });

  async function drawPlanEditor() {
    const p = state.editPlan, folders = await DB.all('folders');
    openSheet(`
      <h2>${p.isNew ? 'Neuer Plan' : 'Plan bearbeiten'}</h2>
      <label class="f"><span>Name des Plans</span><input class="in" id="pName" value="${esc(p.name)}" placeholder="z. B. Rücken & Becken" autocomplete="off" ${p.isNew ? 'autofocus' : ''}></label>
      <span class="mini" style="margin-top:4px">Trainingstage (optional)</span>
      <div class="days">${DAYS.map((d, i) => `<button class="pill ${(p.days || []).includes(i) ? 'on' : ''}" data-act="dayToggle" data-d="${i}">${d}</button>`).join('')}</div>
      <label class="f"><span>Hinweis (optional)</span><input class="in" id="pNote" value="${esc(p.note || '')}" placeholder="z. B. 1–2 Wdh. im Tank" autocomplete="off"></label>
      <label class="check" style="margin-bottom:4px"><input type="checkbox" id="pRotate" ${p.rotate ? 'checked' : ''}> Reihenfolge jede Woche wechseln</label>
      <p class="hint" style="margin-top:0">Jede Woche kommt eine andere Übung bzw. Muskelgruppe zuerst dran – so bekommt jede mal den stärksten Reiz. Gleiche Muskelgruppe = bleibt zusammen.</p>
      ${rotationPreview(p)}
      <div class="section-title" style="margin-top:8px">Übungen</div>
      ${p.exercises.map((e, i) => `
        <div class="ex-edit" data-i="${i}">
          <div class="top-row">
            <input class="in" data-f="name" value="${esc(e.name)}" placeholder="Übung, z. B. Pelvic Tilt" autocomplete="off">
            ${i > 0 ? `<button class="icon-btn" data-act="exUp" data-i="${i}" aria-label="Nach oben">${ICON.up}</button>` : ''}
            <button class="icon-btn" data-act="exDel" data-i="${i}" aria-label="Entfernen" style="color:var(--danger)">${ICON.trash}</button>
          </div>
          ${e.videoId ? `<video class="clip-inline" data-clip="${e.videoId}" muted playsinline autoplay loop></video>` : ''}
          <div class="grid3">
            <label><span class="mini">Sätze</span><input class="in" data-f="sets" inputmode="numeric" value="${esc(e.sets)}"></label>
            <label><span class="mini">Wdh.</span><input class="in" data-f="reps" value="${esc(e.reps)}" placeholder="10"></label>
            <label><span class="mini">kg</span><input class="in" data-f="weight" inputmode="decimal" value="${esc(e.weight)}" placeholder="–"></label>
          </div>
          ${folders.length ? `<label style="display:block;margin-top:8px"><span class="mini">Video-Fach (optional)</span>
            <select class="in" data-f="folderId"><option value="">– kein Video –</option>${folders.map((f) => `<option value="${f.id}" ${f.id === e.folderId ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>` : ''}
          <select class="in" data-f="fixed" style="margin-top:8px">
            <option value="" ${!e.fixed ? 'selected' : ''}>Position: rotiert wöchentlich</option>
            <option value="start" ${e.fixed === 'start' ? 'selected' : ''}>Position: immer am Anfang (Aufwärmen)</option>
            <option value="end" ${e.fixed === 'end' ? 'selected' : ''}>Position: immer am Ende</option>
          </select>
          <input class="in" data-f="muscle" value="${esc(e.muscle || '')}" placeholder="Muskelgruppe (optional), z. B. Brust" autocomplete="off" style="margin-top:8px">
          <input class="in" data-f="note" value="${esc(e.note || '')}" placeholder="Notiz (optional), z. B. langsam ablassen" autocomplete="off" style="margin-top:8px">
        </div>`).join('')}
      <button class="btn secondary" data-act="exAdd">${ICON.plus} Übung hinzufügen</button>
      <button class="btn ai-btn" data-act="exFromVideo">${ICON.film} Übung per Video hinzufügen</button>
      <p class="hint" style="text-align:center">${state.settings.apiKey ? 'Die KI erkennt die Übung und schneidet einen 2–3 s Clip.' : 'Ohne API-Schlüssel benennst du die Übung selbst (KI in den Einstellungen aktivieren).'}</p>
      <div style="height:10px"></div>
      <button class="btn" data-act="planSave">Plan speichern</button>
      ${p.isNew ? '' : `<button class="btn danger" data-act="planDel">Plan löschen</button>`}
      <button class="btn danger" data-act="closeSheet" style="color:var(--muted)">Abbrechen</button>
    `, { full: true });
    mountClips(sheet);
  }
  // read the editor fields back into state.editPlan
  function readPlanEditor() {
    const p = state.editPlan; if (!p) return;
    const n = $('#pName', sheet); if (n) p.name = n.value.trim();
    const r = $('#pRotate', sheet); if (r) p.rotate = r.checked;
    const pn = $('#pNote', sheet); if (pn) p.note = pn.value.trim();
    $$('.ex-edit', sheet).forEach((box) => {
      const e = p.exercises[+box.dataset.i]; if (!e) return;
      $$('[data-f]', box).forEach((inp) => { e[inp.dataset.f] = inp.value; });
    });
  }

  // shows the order for this and the next weeks
  function rotationPreview(p) {
    if (!p.rotate) return '';
    const exs = p.exercises.filter((e) => (e.name || '').trim() && e.fixed !== 'start' && e.fixed !== 'end');
    const n = groupsOf(exs).length; if (n < 2) return '';
    const start = p.rotateStart ?? weekIdx(today());
    const rows = [];
    for (let w = 0; w < Math.min(n, 6); w++) {
      const day = addDays(today(), 7 * w);
      const r = rotation({ ...p, rotateStart: start }, day);
      rows.push(`<div class="row"><div class="grow"><div class="name">${w === 0 ? 'Diese Woche' : w === 1 ? 'Nächste Woche' : `In ${w} Wochen`} <span style="color:var(--muted);font-weight:500;font-size:14px">· KW ${isoWeek(day)}</span></div>
        <div class="sub">${r.groups.map((g, i) => (i === 0 ? `<b style="color:var(--accent)">${esc(groupLabel(g))}</b>` : esc(groupLabel(g)))).join(' → ')}</div></div></div>`);
    }
    return `<div class="list" style="margin-bottom:14px">${rows.join('')}</div>`;
  }

  async function startWorkout(planId) {
    const plan = await DB.get('plans', planId); if (!plan) return;
    if (state.workout && !confirm('Es läuft schon ein Training. Verwerfen und neu starten?')) return;
    const last = (await DB.all('workouts')).filter((w) => w.planId === planId).sort((a, b) => b.startedAt - a.startedAt)[0];
    state.workout = {
      id: uid(), planId, planName: plan.name, date: today(), startedAt: Date.now(),
      planNote: plan.note || '',
      rotationFirst: plan.rotate && rotation(plan).n > 1 ? groupLabel(rotation(plan).groups[0]) : '',
      exercises: rotation(plan).exercises.map((e) => {
        const prev = last && last.exercises.find((x) => x.name === e.name);
        const n = Math.max(1, Math.round(num(e.sets)) || 1);
        return {
          name: e.name, exId: e.id, folderId: e.folderId || '', videoId: e.videoId || '', note: e.note || '', planWeight: e.weight || '',
          fixed: e.fixed || '', repsUpper: upperReps(e.reps), plannedSets: n,
          target: `${n} × ${e.reps || '–'}${num(e.weight) ? ` · ${kg(e.weight)} kg` : ''}`,
          prevText: prev ? setsText(prev.sets) : '',
          sets: Array.from({ length: n }, (_, i) => ({
            reps: (prev && prev.sets[i] && prev.sets[i].reps) || String(e.reps || '').replace(/[^\d].*$/, ''),
            weight: (prev && prev.sets[i] && prev.sets[i].weight) || e.weight || '', done: false,
          })),
        };
      }),
    };
    await kvSet('activeWorkout', state.workout);
    state.workoutView = true;
    render();
  }
  const saveWorkout = () => kvSet('activeWorkout', state.workout);

  async function renderWorkout() {
    const w = state.workout;
    setHeader(w.planName, { back: true, action: action('', '') });
    const folders = Object.fromEntries((await DB.all('folders')).map((f) => [f.id, f]));
    const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
    view.innerHTML = `
      <div class="card" style="display:flex;align-items:center;gap:12px">
        <div style="flex:1"><div class="sub" style="color:var(--muted);font-size:14px">Dauer</div><div class="timer" id="wTimer" style="font-size:24px;color:var(--text)">${durStr((Date.now() - w.startedAt) / 1000)}</div></div>
        <div style="flex:1"><div class="sub" style="color:var(--muted);font-size:14px">Sätze</div><div style="font-size:24px;font-weight:800">${done} / ${total}</div>
          <div class="progress"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div></div>
      </div>
      ${w.planNote ? `<p class="hint" style="margin-top:0">💡 ${esc(w.planNote)}</p>` : ''}
      ${w.rotationFirst ? `<p class="hint" style="margin-top:0">${ICON.rotate.replace('<svg ', '<svg style="width:14px;height:14px;vertical-align:-2px" ')} Diese Woche zuerst: <b style="color:var(--text)">${esc(w.rotationFirst)}</b></p>` : ''}
      ${w.exercises.map((e, ei) => `
        <div class="ex-run ${e.fixed === 'start' ? 'warm' : ''}">
          <div class="ex-head"><h3>${esc(e.name)} ${e.fixed === 'start' ? '<span class="warm-badge">Aufwärmen</span>' : ''}</h3>
            ${e.folderId && folders[e.folderId] ? `<button class="chip-link" data-act="folderSheet" data-id="${e.folderId}">${ICON.video} Videos</button>` : ''}
            <button class="chip-link" data-act="progress" data-name="${esc(e.name)}" aria-label="Fortschritt">${ICON.chart}</button></div>
          ${e.videoId ? `<video class="clip-inline" data-clip="${e.videoId}" muted playsinline autoplay loop></video>` : ''}
          <div class="sub" style="color:var(--muted);font-size:14px;margin:-6px 0 4px">Ziel: ${esc(e.target)}</div>
          ${e.prevText ? `<div class="sub" style="font-size:14px;margin-bottom:4px"><b>Letztes Mal:</b> ${esc(e.prevText)}</div>` : ''}
          ${e.note ? `<div class="sub" style="color:var(--muted);font-size:14px;margin-bottom:4px">📝 ${esc(e.note)}</div>` : ''}
          ${goalHit(e) ? '<div class="goal-hit">✅ Obere Wdh.-Grenze geschafft – nächstes Mal mehr Gewicht</div>' : ''}
          <div class="wstep" ${e.fixed === 'start' ? 'hidden' : ''}>
            <span>Gewicht</span>
            <button data-act="wStep" data-e="${ei}" data-dir="-1" aria-label="Weniger Gewicht">−</button>
            <b>${kg(curWeight(e))} kg</b>
            <button data-act="wStep" data-e="${ei}" data-dir="1" aria-label="Mehr Gewicht">+</button>
          </div>
          <div class="set-labels"><span>Satz</span><span>Wdh.</span><span>kg</span><span></span></div>
          ${e.sets.map((s, si) => `
            <div class="set-row">
              <span class="n">${si + 1}</span>
              <input class="in" data-w="reps" data-e="${ei}" data-s="${si}" inputmode="numeric" value="${esc(s.reps)}" placeholder="–">
              <input class="in" data-w="weight" data-e="${ei}" data-s="${si}" inputmode="decimal" value="${esc(s.weight)}" placeholder="–">
              <button class="tick ${s.done ? 'on' : ''}" data-act="tick" data-e="${ei}" data-s="${si}" aria-label="Satz erledigt">${ICON.check}</button>
            </div>`).join('')}
          <button class="pill" data-act="addSet" data-e="${ei}">+ Satz</button>
        </div>`).join('')}
      <button class="btn" data-act="finish">Training beenden</button>
      <button class="btn danger" data-act="discard">Training verwerfen</button>
    `;
    mountClips(view);
  }

  // weight shown in the stepper: first open set, otherwise the last set
  const curWeight = (e) => { const s = e.sets.find((x) => !x.done) || e.sets[e.sets.length - 1]; return s ? s.weight : 0; };

  // finish sheet: summary, weight changes for the plan, records
  async function finishSheet() {
    const w = state.workout;
    const plan = await DB.get('plans', w.planId);
    const history = await DB.all('workouts');
    const done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
    const changes = [], records = [];
    w.exercises.forEach((e, i) => {
      const best = bestWeight(e.sets);
      if (!best) return;
      const pe = plan && plan.exercises.find((x) => x.id === e.exId || x.name === e.name);
      const step = num(state.settings.weightStep) || 2.5;
      const up = goalHit(e);
      const target = up ? Math.round((best + step) * 100) / 100 : best;
      if (pe && num(pe.weight) !== target) changes.push({ i, name: e.name, from: num(pe.weight), to: target, up });
      const prevBest = history.reduce((a, h) => { const x = h.exercises.find((y) => y.name === e.name); return x ? Math.max(a, bestWeight(x.sets)) : a; }, 0);
      if (prevBest && best > prevBest) records.push({ name: e.name, best, prevBest });
    });
    state.finishChanges = changes;
    openSheet(`
      <h2>Training beenden</h2>
      <div class="card" style="display:flex;gap:12px">
        <div style="flex:1"><div class="sub" style="color:var(--muted);font-size:14px">Dauer</div><div style="font-size:22px;font-weight:800">${durStr((Date.now() - w.startedAt) / 1000)}</div></div>
        <div style="flex:1"><div class="sub" style="color:var(--muted);font-size:14px">Sätze</div><div style="font-size:22px;font-weight:800">${done}</div></div>
      </div>
      ${records.length ? `<div class="card" style="background:color-mix(in srgb, var(--warn) 18%, var(--card))">${records.map((r) => `<div style="font-weight:700">🏆 Neuer Rekord: ${esc(r.name)} ${kg(r.best)} kg <span style="color:var(--muted);font-weight:500">(vorher ${kg(r.prevBest)} kg)</span></div>`).join('')}</div>` : ''}
      ${changes.length ? `<div class="section-title">Gewichte im Plan übernehmen</div>
        <p class="hint" style="margin-top:0">Beim nächsten Mal startest du dann mit dem neuen Gewicht.</p>
        <div class="list">${changes.map((c, k) => `<label class="row" style="cursor:pointer"><input type="checkbox" data-change="${k}" checked style="width:22px;height:22px;accent-color:var(--accent)">
          <div class="grow"><div class="name">${esc(c.name)}</div><div class="sub">${c.from ? `${kg(c.from)} kg` : 'kein Gewicht'} → <b style="color:${c.to > c.from ? 'var(--accent)' : 'var(--text)'}">${kg(c.to)} kg</b>${c.up ? ' · ⬆ obere Grenze erreicht' : ''}</div></div></label>`).join('')}</div>` : ''}
      <button class="btn" data-act="finishConfirm">Speichern & beenden</button>
      <button class="btn secondary" data-act="closeSheet">Weiter trainieren</button>
    `, { noFocus: true });
  }

  // weight history of one exercise with a small chart
  async function progressSheet(name) {
    const rows = (await DB.all('workouts')).map((w) => {
      const e = w.exercises.find((x) => x.name === name);
      return e && bestWeight(e.sets) ? { date: w.date, at: w.startedAt, best: bestWeight(e.sets), text: setsText(e.sets) } : null;
    }).filter(Boolean).sort((a, b) => a.at - b.at);
    let chart = '';
    if (rows.length >= 2) {
      const pts = rows.slice(-12), W = 320, H = 120, pad = 14;
      const min = Math.min(...pts.map((r) => r.best)), max = Math.max(...pts.map((r) => r.best)), span = max - min || 1;
      const left = 58; const xy = pts.map((r, i) => [left + (i / (pts.length - 1)) * (W - left - pad), H - pad - ((r.best - min) / span) * (H - 2 * pad)]);
      chart = `<div class="card"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
        <polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        ${xy.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent)"/>`).join('')}
        <text x="2" y="${pad + 4}" font-size="12" font-weight="700" fill="var(--muted)">${kg(max)} kg</text><text x="2" y="${H - pad + 4}" font-size="12" font-weight="700" fill="var(--muted)">${kg(min)} kg</text>
      </svg></div>`;
    }
    const best = rows.reduce((a, r) => Math.max(a, r.best), 0);
    openSheet(`
      <h2>${esc(name)}</h2>
      ${rows.length ? `<p class="hint" style="margin-top:-6px">Bestes Gewicht: <b style="color:var(--text)">${kg(best)} kg</b> · ${rows.length} Training${rows.length === 1 ? '' : 's'}</p>
        ${chart}
        <div class="list">${rows.slice().reverse().map((r) => `<div class="row"><div class="grow"><div class="name">${kg(r.best)} kg</div><div class="sub">${esc(dayLabel(r.date))} · ${esc(r.text)}</div></div></div>`).join('')}</div>`
        : '<div class="card empty"><b>Noch keine Daten</b>Nach deinem ersten Training mit Gewicht siehst du hier deinen Fortschritt.</div>'}
      <button class="btn secondary" data-act="closeSheet">Schließen</button>
    `, { noFocus: true });
  }

  function startRest(sec) {
    state.rest = { until: Date.now() + sec * 1000 };
    drawRest();
  }
  function drawRest() {
    let el = $('#restBtn');
    if (!state.rest) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('button'); el.id = 'restBtn'; el.className = 'rest'; el.onclick = () => { state.rest = null; drawRest(); }; document.body.appendChild(el); }
    const left = (state.rest.until - Date.now()) / 1000;
    if (left <= 0) { el.textContent = 'Pause vorbei – weiter!'; if (left < -4) { state.rest = null; drawRest(); } return; }
    el.textContent = `Pause ${durStr(left)}  ✕`;
  }
  setInterval(() => {
    if (state.rest) drawRest();
    const t = $('#wTimer'); if (t && state.workout) t.textContent = durStr((Date.now() - state.workout.startedAt) / 1000);
  }, 500);

  // ================================================================ BODY WEIGHT
  async function renderWeight() {
    setHeader('Gewicht', { action: action('', '') });
    const all = (await DB.all('weights')).sort((a, b) => a.date.localeCompare(b.date));
    const byWeek = new Map();
    all.forEach((w) => { const m = mondayOf(w.date); if (!byWeek.has(m)) byWeek.set(m, []); byWeek.get(m).push(w); });
    const weeks = [...byWeek.entries()].map(([monday, list]) => ({ monday, list, avg: list.reduce((a, w) => a + num(w.kg), 0) / list.length }))
      .sort((a, b) => a.monday.localeCompare(b.monday));
    weeks.forEach((w, i) => { w.diff = i ? w.avg - weeks[i - 1].avg : null; });
    const thisMonday = mondayOf(today());
    const cur = weeks.find((w) => w.monday === thisMonday);
    const prev = weeks.filter((w) => w.monday < thisMonday).slice(-1)[0];
    const todayEntry = all.find((w) => w.date === today());
    const last = all[all.length - 1];
    const diffTxt = (d) => d == null ? '–' : `${d > 0 ? '+' : d < 0 ? '−' : '±'}${kg1(Math.abs(d))} kg`;
    const diffCls = (d) => d == null || Math.abs(d) < 0.05 ? '' : d < 0 ? 'down' : 'up';

    // chart of weekly averages (last 12 weeks)
    let chart = '';
    const pts = weeks.slice(-12);
    if (pts.length >= 2) {
      const W = 340, H = 170, L = 46, R = 26, T = 14, B = 26;
      const vals = pts.map((w) => w.avg);
      let min = Math.min(...vals), max = Math.max(...vals);
      if (max - min < 1) { const mid = (max + min) / 2; min = mid - 0.5; max = mid + 0.5; }
      const X = (i) => L + (i / (pts.length - 1)) * (W - L - R), Y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
      const grid = [0, 0.5, 1].map((f) => { const v = min + f * (max - min); return `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="var(--muted)">${kg1(v)}</text>`; }).join('');
      const labels = pts.map((w, i) => (pts.length <= 6 || i % 2 === pts.length % 2 || i === pts.length - 1) ? `<text x="${X(i)}" y="${H - 6}" font-size="11" text-anchor="middle" fill="var(--muted)">KW ${isoWeek(w.monday)}</text>` : '').join('');
      chart = `<div class="card"><div class="section-title" style="margin:0 0 6px">Wochendurchschnitt</div>
        <svg class="chart" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${grid}
          <polyline points="${pts.map((w, i) => `${X(i)},${Y(w.avg)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
          ${pts.map((w, i) => `<circle cx="${X(i)}" cy="${Y(w.avg)}" r="${w.monday === thisMonday ? 5 : 4}" fill="${w.monday === thisMonday ? 'var(--card)' : 'var(--accent)'}" stroke="var(--accent)" stroke-width="2"/>`).join('')}
          ${labels}</svg>
        <p class="hint" style="margin:4px 0 0">Offener Punkt = laufende Woche (bisheriger Schnitt).</p></div>`;
    }

    view.innerHTML = `
      <div class="card">
        <div class="section-title" style="margin:0 0 8px">${todayEntry ? 'Heute eingetragen' : 'Gewicht heute'}</div>
        <div class="wbig">
          <input class="in" id="wKg" inputmode="decimal" placeholder="${last ? kg1(last.kg) : '80,0'}" value="${todayEntry ? kg1(todayEntry.kg) : ''}">
          <button class="btn" data-act="weightSave">${todayEntry ? 'Ändern' : 'Speichern'}</button>
        </div>
        <label class="f" style="margin:10px 0 0"><span>Datum</span><input class="in" id="wDate" type="date" value="${today()}" max="${today()}"></label>
      </div>
      <div class="card">
        <div class="kpis">
          <div><div class="k">Diese Woche</div><div class="v">${cur ? `${kg1(cur.avg)}` : '–'}</div><div class="k">${cur ? `${cur.list.length}/7 Tage` : 'noch keine Werte'}</div></div>
          <div><div class="k">Letzte Woche</div><div class="v">${prev ? kg1(prev.avg) : '–'}</div><div class="k">${prev ? `KW ${isoWeek(prev.monday)}` : ''}</div></div>
          <div><div class="k">Veränderung</div><div class="v ${cur && prev ? diffCls(cur.avg - prev.avg) : ''}">${cur && prev ? diffTxt(cur.avg - prev.avg) : '–'}</div><div class="k">zur Vorwoche</div></div>
        </div>
      </div>
      ${chart || (all.length ? '<div class="card empty">Der Graph erscheint, sobald du Werte aus mindestens zwei Wochen hast.</div>' : '')}
      <div class="section-title">Wochen</div>
      ${weeks.length ? `<div class="list">${weeks.slice().reverse().map((w) => `
        <button class="row" data-act="weekSheet" data-m="${w.monday}">
          <div class="grow"><div class="name">KW ${isoWeek(w.monday)} <span style="color:var(--muted);font-weight:500;font-size:14px">· ${shortDate(w.monday)} – ${shortDate(addDays(w.monday, 6))}${w.monday === thisMonday ? ' · läuft' : ''}</span></div>
            <div class="sub">${w.list.length} Tag${w.list.length === 1 ? '' : 'e'} · <span class="${diffCls(w.diff)}">${diffTxt(w.diff)}</span></div></div>
          <div class="kcal">Ø ${kg1(w.avg)} kg</div></button>`).join('')}</div>`
        : '<div class="card empty"><b>Noch kein Gewicht eingetragen</b>Wieg dich am besten jeden Morgen zur gleichen Zeit und trag den Wert hier ein.</div>'}
    `;
  }

  async function weekSheet(monday) {
    const list = (await DB.all('weights')).filter((w) => mondayOf(w.date) === monday).sort((a, b) => a.date.localeCompare(b.date));
    const avg = list.length ? list.reduce((a, w) => a + num(w.kg), 0) / list.length : 0;
    openSheet(`
      <h2>KW ${isoWeek(monday)}</h2>
      <p class="hint" style="margin-top:-6px">${shortDate(monday)} – ${shortDate(addDays(monday, 6))} · Durchschnitt <b style="color:var(--text)">${kg1(avg)} kg</b></p>
      <div class="list">${Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((d) => {
        const e = list.find((w) => w.date === d);
        return `<div class="row"><div class="grow"><div class="name">${esc(parseDay(d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' }))}</div></div>
          ${e ? `<div class="kcal">${kg1(e.kg)} kg</div><button class="icon-btn" data-act="weightDel" data-d="${d}" aria-label="Löschen" style="color:var(--danger)">${ICON.trash}</button>` : '<div class="sub">–</div>'}</div>`;
      }).join('')}</div>
      <button class="btn secondary" data-act="closeSheet">Schließen</button>
    `, { noFocus: true });
  }

  // ================================================================ VIDEOS
  async function renderFolders() {
    setHeader('Videos', { action: action('newFolder', ICON.plus) });
    const folders = (await DB.all('folders')).sort((a, b) => a.name.localeCompare(b.name));
    const videos = await DB.all('videos');
    view.innerHTML = `
      <p class="hint">Lege Fächer an, z. B. „Pelvic Tilt“, und speichere darin deine Übungsvideos.</p>
      ${folders.length ? `<div class="folders">${folders.map((f) => {
        const vs = videos.filter((v) => v.folderId === f.id).sort((a, b) => a.createdAt - b.createdAt);
        const th = vs.find((v) => v.thumb);
        return `<button class="folder" data-act="folder" data-id="${f.id}">
          <div class="th">${th ? `<img src="${keepUrl(th.thumb)}" alt="">` : ICON.folder}</div>
          <div class="meta"><b>${esc(f.name)}</b><small>${vs.length} Video${vs.length === 1 ? '' : 's'}</small></div></button>`;
      }).join('')}</div>`
        : `<div class="card empty"><b>Noch keine Fächer</b>Tippe auf „Neues Fach“.</div>`}
      <div style="height:12px"></div>
      <button class="btn" data-act="newFolder">${ICON.plus} Neues Fach</button>
    `;
  }

  async function renderFolder() {
    const f = await DB.get('folders', state.folderId);
    if (!f) { state.folderId = null; return render(); }
    setHeader(f.name, { back: true, action: action('folderMenu', ICON.more) });
    const vs = (await DB.by('videos', 'folderId', f.id)).sort((a, b) => a.createdAt - b.createdAt);
    view.innerHTML = `
      <button class="btn" data-act="addVideo">${ICON.plus} Video hinzufügen</button>
      <div style="height:14px"></div>
      ${vs.length ? `<div class="vids">${vs.map((v) => `
        <button class="vid" data-act="video" data-id="${v.id}">
          <div class="th">${v.thumb ? `<img src="${keepUrl(v.thumb)}" alt="">` : ''}<span class="play">${ICON.play}</span>${v.duration ? `<span class="dur">${durStr(v.duration)}</span>` : ''}</div>
          <div class="t">${esc(v.title)}</div></button>`).join('')}</div>`
        : `<div class="card empty"><b>Noch keine Videos</b>Füge Videos aus deiner Galerie hinzu oder nimm direkt eins auf.</div>`}
    `;
  }

  // read duration + make a thumbnail from a video file
  function videoMeta(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      let finished = false;
      const finish = (thumb) => {
        if (finished) return; finished = true; clearTimeout(timer);
        const duration = isFinite(v.duration) ? v.duration : 0;
        v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
        resolve({ thumb, duration });
      };
      const timer = setTimeout(() => finish(null), 10000);
      v.addEventListener('loadedmetadata', () => { try { v.currentTime = Math.min(0.6, (v.duration || 1) / 2); } catch { finish(null); } });
      v.addEventListener('seeked', () => {
        try {
          const w = 360, h = Math.round(w * (v.videoHeight || 640) / (v.videoWidth || 360)) || 480;
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(v, 0, 0, w, h);
          c.toBlob((b) => finish(b), 'image/jpeg', 0.75);
        } catch { finish(null); }
      });
      v.addEventListener('error', () => finish(null));
      v.load();
    });
  }

  $('#videoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length || !state.folderId) return;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    let i = 0;
    for (const file of files) {
      i++; toast(`Speichere Video ${i}/${files.length}…`);
      const meta = await videoMeta(file);
      const title = (file.name || 'Video').replace(/\.[^.]+$/, '').replace(/^(IMG|VID|MOV)_?/i, 'Video ').replace(/[_]+/g, ' ').trim();
      try {
        await DB.put('videos', { id: uid(), folderId: state.folderId, title, blob: file, type: file.type, thumb: meta.thumb, duration: meta.duration, createdAt: Date.now() });
      } catch (err) {
        alert('Video konnte nicht gespeichert werden (Speicher voll?).'); break;
      }
    }
    toast(files.length === 1 ? 'Video gespeichert' : `${files.length} Videos gespeichert`);
    render();
  });

  async function videoSheet(id) {
    const v = await DB.get('videos', id); if (!v) return;
    const folders = await DB.all('folders');
    openSheet(`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <button class="icon-btn" data-act="closeSheet" aria-label="Schließen">${ICON.left}</button>
        <h2 style="margin:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(v.title)}</h2>
      </div>
      <video class="player" id="vPlayer" src="${keepUrl(v.blob)}" controls playsinline autoplay ${v.clipEnd > v.clipStart ? 'muted' : 'loop'}></video>
      ${v.clipEnd > v.clipStart ? `<p class="hint" style="margin-top:-6px">Clip ${v.clipStart.toFixed(1)}–${v.clipEnd.toFixed(1)} s in Schleife ${v.ai ? '<span class="ai-tag">KI</span>' : ''} · <a href="#" id="vFull" style="color:var(--accent);font-weight:700">ganzes Video ansehen</a></p>` : ''}
      <label class="f"><span>Titel</span><input class="in" id="vTitle" value="${esc(v.title)}" autocomplete="off"></label>
      <label class="f"><span>Fach</span><select class="in" id="vFolder">${folders.map((f) => `<option value="${f.id}" ${f.id === v.folderId ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label>
      <button class="btn" data-act="videoSave" data-id="${v.id}">Speichern</button>
      <button class="btn danger" data-act="videoDel" data-id="${v.id}">Video löschen</button>
    `, { full: true, noFocus: true });
    if (v.clipEnd > v.clipStart) {
      const pl = $('#vPlayer'); loopClip(pl, v.clipStart, v.clipEnd);
      $('#vFull').addEventListener('click', (e) => { e.preventDefault(); const full = document.createElement('video'); Object.assign(full, { className: 'player', src: pl.src, controls: true, playsInline: true, autoplay: true }); pl.replaceWith(full); e.target.parentElement.remove(); });
    }
  }

  // videos of a folder inside a sheet (e.g. during a workout)
  async function folderSheet(folderId) {
    const f = await DB.get('folders', folderId); if (!f) return;
    const vs = (await DB.by('videos', 'folderId', folderId)).sort((a, b) => a.createdAt - b.createdAt);
    openSheet(`
      <h2>${esc(f.name)}</h2>
      ${vs.length ? vs.map((v) => `<video class="player" src="${keepUrl(v.blob)}" controls playsinline loop preload="metadata" ${v.thumb ? `poster="${keepUrl(v.thumb)}"` : ''}></video><div class="hint" style="margin-top:-8px">${esc(v.title)}</div>`).join('')
        : '<div class="card empty">In diesem Fach sind noch keine Videos.</div>'}
      <button class="btn secondary" data-act="closeSheet">Schließen</button>
    `, { noFocus: true });
  }

  // ================================================================ VIDEO CLIPS + AI
  // play only [start, end] of a video in a loop ("virtual clip", the file stays untouched)
  function loopClip(video, start, end) {
    if (!(end > start)) return;
    let raf = 0;
    const tick = () => {
      if (!video.isConnected) return cancelAnimationFrame(raf);
      if (video.currentTime >= end || video.currentTime < start - 0.3) video.currentTime = start;
      raf = requestAnimationFrame(tick);
    };
    video.loop = false;
    video.addEventListener('loadedmetadata', () => { video.currentTime = start; video.play().catch(() => {}); }, { once: true });
    video.addEventListener('ended', () => { video.currentTime = start; video.play().catch(() => {}); });
    raf = requestAnimationFrame(tick);
  }
  // fill all <video data-clip="id"> in a container
  async function mountClips(root) {
    for (const el of $$('video[data-clip]', root)) {
      const v = await DB.get('videos', el.dataset.clip);
      if (!v) { el.remove(); continue; }
      el.src = keepUrl(v.blob);
      if (v.clipEnd > v.clipStart) loopClip(el, v.clipStart, v.clipEnd);
    }
  }

  const once = (el, ev, ms = 6000) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms);
    el.addEventListener(ev, () => { clearTimeout(t); res(); }, { once: true });
    el.addEventListener('error', () => { clearTimeout(t); rej(new Error('Video konnte nicht gelesen werden')); }, { once: true });
  });

  // grab small JPEG frames spread over the video (sent to the AI; the video itself stays on the phone)
  async function extractFrames(file, maxFrames = 12) {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    try {
      v.load();
      await once(v, 'loadedmetadata');
      const dur = v.duration || 0;
      const count = Math.max(4, Math.min(maxFrames, Math.ceil(dur / 1.2)));
      const w = 512, h = Math.round(w * (v.videoHeight || 910) / (v.videoWidth || 512));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      const frames = [];
      for (let i = 0; i < count; i++) {
        const t = Math.min(Math.max(0, dur - 0.05), ((i + 0.5) * dur) / count);
        v.currentTime = t;
        await once(v, 'seeked');
        g.drawImage(v, 0, 0, w, h);
        frames.push({ t: Math.round(t * 10) / 10, data: c.toDataURL('image/jpeg', 0.72).split(',')[1] });
      }
      return { duration: dur, frames };
    } finally {
      v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
    }
  }

  const CLIP_SCHEMA = {
    type: 'object',
    properties: {
      exercise_name: { type: 'string', description: 'Gängiger Name der Übung, wie im Gym üblich (deutsch oder englischer Fachbegriff, z. B. "Pelvic Tilt", "Kreuzheben")' },
      muscle_group: { type: 'string', description: 'Hauptmuskelgruppe auf Deutsch, ein bis zwei Wörter (z. B. "Brust", "Rücken", "Beine", "Core")' },
      confidence: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] },
      clip_start: { type: 'number', description: 'Start des Clips in Sekunden' },
      clip_end: { type: 'number', description: 'Ende des Clips in Sekunden, 2 bis 3 Sekunden nach clip_start' },
      suggested_sets: { type: 'integer' },
      suggested_reps: { type: 'string' },
      tip: { type: 'string', description: 'Ein kurzer Technik-Hinweis, höchstens 12 Wörter' },
    },
    required: ['exercise_name', 'muscle_group', 'confidence', 'clip_start', 'clip_end', 'suggested_sets', 'suggested_reps', 'tip'],
    additionalProperties: false,
  };

  // ask Claude which exercise is shown and where a clean repetition is
  async function analyzeWithClaude(frames, duration, splitName) {
    const { default: Anthropic } = await import('./vendor/anthropic-sdk.mjs');
    const client = new Anthropic({ apiKey: state.settings.apiKey, dangerouslyAllowBrowser: true });
    const content = [];
    frames.forEach((f, i) => {
      content.push({ type: 'text', text: `Bild ${i + 1} – Zeitpunkt ${f.t.toFixed(1)} s` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
    });
    content.push({ type: 'text', text: [
      `Das sind ${frames.length} Einzelbilder aus einem ${duration.toFixed(1)} Sekunden langen Trainingsvideo${splitName ? ` für den Trainingstag "${splitName}"` : ''}.`,
      'Bestimme, welche Fitness-Übung gezeigt wird, und die Hauptmuskelgruppe.',
      `Wähle einen 2 bis 3 Sekunden langen Ausschnitt (clip_start/clip_end, innerhalb von 0 bis ${duration.toFixed(1)} s), in dem die Übung klar und am besten mit einer vollständigen Wiederholung zu sehen ist. Orientiere dich an den Zeitpunkten der Bilder.`,
      'Schlage übliche Sätze und Wiederholungen vor. Antworte auf Deutsch.',
    ].join('\n') });
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { format: { type: 'json_schema', schema: CLIP_SCHEMA } },
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Die KI hat dieses Video abgelehnt. Bitte die Übung selbst benennen.');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const r = JSON.parse(text);
    // keep the clip inside the video and between 1.5 and 4 s
    let start = Math.max(0, Math.min(num(r.clip_start), Math.max(0, duration - 1.5)));
    let end = Math.min(duration, Math.max(start + 1.5, Math.min(num(r.clip_end), start + 4)));
    return { ...r, clip_start: start, clip_end: end };
  }

  function aiErrorText(err, Anthropic) {
    if (Anthropic && err instanceof Anthropic.AuthenticationError) return 'API-Schlüssel ungültig. Bitte in den Einstellungen prüfen.';
    if (Anthropic && err instanceof Anthropic.PermissionDeniedError) return 'Kein Zugriff mit diesem API-Schlüssel (Guthaben/Berechtigung prüfen).';
    if (Anthropic && err instanceof Anthropic.RateLimitError) return 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.';
    if (Anthropic && err instanceof Anthropic.APIConnectionError) return 'Keine Verbindung – bist du online?';
    if (Anthropic && err instanceof Anthropic.APIError) return `KI-Fehler (${err.status || '?'}). Du kannst die Übung selbst benennen.`;
    return err && err.message ? err.message : 'Unbekannter Fehler';
  }

  // review sheet: preview loop, name, muscle group, adjust the clip
  function clipReviewSheet(job) {
    const d = job.duration || 0;
    openSheet(`
      <h2>Neue Übung aus Video</h2>
      ${job.ai ? `<p class="hint" style="margin-top:-6px"><span class="ai-tag">KI · Sicherheit ${esc(job.ai.confidence)}</span>${job.ai.tip ? ` 📝 ${esc(job.ai.tip)}` : ''}</p>` : ''}
      ${job.error ? `<p class="hint" style="color:var(--danger);margin-top:-6px">${esc(job.error)}</p>` : ''}
      <video class="player" id="clipPreview" muted playsinline autoplay></video>
      <span class="mini">Clip-Start</span>
      <input class="range" id="clipStart" type="range" min="0" max="${Math.max(0, d - 0.5).toFixed(1)}" step="0.1" value="${job.start.toFixed(1)}">
      <span class="mini">Clip-Länge</span>
      <input class="range" id="clipLen" type="range" min="1" max="5" step="0.1" value="${(job.end - job.start).toFixed(1)}">
      <div class="range-row"><span id="clipInfo"></span><span>Video: ${durStr(d)}</span></div>
      <label class="f"><span>Übung</span><input class="in" id="cxName" value="${esc(job.name)}" placeholder="z. B. Pelvic Tilt" autocomplete="off"></label>
      <div class="grid3">
        <label><span class="mini">Muskel</span><input class="in" id="cxMuscle" value="${esc(job.muscle)}" placeholder="z. B. Core"></label>
        <label><span class="mini">Sätze</span><input class="in" id="cxSets" inputmode="numeric" value="${esc(job.sets)}"></label>
        <label><span class="mini">Wdh.</span><input class="in" id="cxReps" value="${esc(job.reps)}"></label>
      </div>
      <div style="height:12px"></div>
      <button class="btn" data-act="clipAccept">Übung übernehmen</button>
      <button class="btn danger" data-act="clipCancel" style="color:var(--muted)">Abbrechen</button>
    `, { full: true, noFocus: true });
    const v = $('#clipPreview'), s = $('#clipStart'), l = $('#clipLen'), info = $('#clipInfo');
    v.src = keepUrl(job.file);
    const update = () => {
      job.start = num(s.value); job.end = Math.min(d, job.start + num(l.value));
      info.textContent = `${job.start.toFixed(1)} s – ${job.end.toFixed(1)} s`;
      v.currentTime = job.start;
    };
    s.addEventListener('input', update); l.addEventListener('input', update);
    info.textContent = `${job.start.toFixed(1)} s – ${job.end.toFixed(1)} s`;
    const tick = () => { if (!v.isConnected) return; if (v.currentTime >= job.end || v.currentTime < job.start - 0.3) v.currentTime = job.start; requestAnimationFrame(tick); };
    v.addEventListener('loadedmetadata', () => { v.currentTime = job.start; v.play().catch(() => {}); }, { once: true });
    v.addEventListener('ended', () => { v.currentTime = job.start; v.play().catch(() => {}); });
    requestAnimationFrame(tick);
    state.clipJob = job;
  }

  $('#aiVideoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file || !state.editPlan) return;
    const job = { file, name: '', muscle: '', sets: '3', reps: '10', start: 0, end: 3, duration: 0, ai: null, error: '' };
    openSheet(`<h2>Video wird analysiert…</h2><div class="spinner"></div><p class="hint" style="text-align:center" id="aiStatus">Einzelbilder werden vorbereitet</p>`, { full: true, noFocus: true });
    let Anthropic = null;
    try {
      const { duration, frames } = await extractFrames(file);
      job.duration = duration; job.end = Math.min(duration, 3);
      if (state.settings.apiKey) {
        const st = $('#aiStatus'); if (st) st.textContent = `KI schaut sich ${frames.length} Bilder an…`;
        try {
          Anthropic = (await import('./vendor/anthropic-sdk.mjs')).default;
          const r = await analyzeWithClaude(frames, duration, state.editPlan.name);
          Object.assign(job, { ai: r, name: r.exercise_name, muscle: r.muscle_group, sets: String(r.suggested_sets || 3), reps: r.suggested_reps || '10', start: r.clip_start, end: r.clip_end });
        } catch (err) { job.error = aiErrorText(err, Anthropic); }
      }
    } catch (err) {
      job.error = 'Das Video konnte nicht gelesen werden. Wähle den Clip bitte selbst.';
      job.duration = job.duration || 3;
    }
    clipReviewSheet(job);
  });

  // ================================================================ SETTINGS & BACKUP
  async function settingsSheet() {
    let usage = '';
    try { const est = await navigator.storage.estimate(); const mb = est.usage / 1048576; usage = mb < 1 ? 'unter 1 MB belegt' : `${mb.toFixed(0)} MB belegt`; } catch {}
    openSheet(`
      <h2>Einstellungen</h2>
      <div class="grid2">
        <label class="f"><span>Kalorienziel (kcal)</span><input class="in" id="sKcal" inputmode="numeric" value="${state.settings.kcalGoal}"></label>
        <label class="f"><span>Proteinziel (g, 0 = aus)</span><input class="in" id="sProtein" inputmode="numeric" value="${state.settings.proteinGoal}"></label>
      </div>
      <div class="grid2">
        <label class="f"><span>Gewichtsschritt (+/−)</span><select class="in" id="sStep">${[1, 1.25, 2.5, 5].map((v) => `<option value="${v}" ${num(state.settings.weightStep) === v ? 'selected' : ''}>${kg(v)} kg</option>`).join('')}</select></label>
        <label class="f"><span>Pause nach jedem Satz</span><select class="in" id="sRest">${[0, 60, 90, 120, 180].map((v) => `<option value="${v}" ${num(state.settings.restSec) === v ? 'selected' : ''}>${v ? durStr(v) + ' min' : 'aus'}</option>`).join('')}</select></label>
      </div>
      <button class="btn" data-act="settingsSave">Speichern</button>
      <div class="section-title">KI-Videoerkennung</div>
      <p class="hint">Mit einem eigenen Anthropic-API-Schlüssel erkennt die KI Übungen in deinen Videos und schneidet einen 2–3 s Clip. Es werden nur ein paar kleine Einzelbilder gesendet, nicht das Video. Kosten ca. 1–3 Cent pro Video, abgerechnet über dein Anthropic-Konto (nicht über das Claude-Abo). Den Schlüssel bekommst du auf platform.claude.com. Er wird nur auf diesem iPhone gespeichert.</p>
      <label class="f"><span>API-Schlüssel</span><input class="in" id="sKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(state.settings.apiKey || '')}"></label>
      <button class="btn secondary" data-act="settingsSave">Schlüssel speichern</button>
      <div class="section-title">Sicherung</div>
      <p class="hint">Deine Daten liegen nur auf diesem iPhone. Exportiere ab und zu eine Sicherung (ohne Videos) in die Dateien-App.</p>
      <button class="btn secondary" data-act="exportData">Sicherung exportieren</button>
      <button class="btn secondary" data-act="importData">Sicherung importieren</button>
      ${usage ? `<p class="hint" style="text-align:center;margin-top:16px">Speicher: ${usage}</p>` : ''}
    `, { noFocus: true });
  }

  async function exportData() {
    const data = {};
    for (const s of DB.stores) if (s !== 'videos') data[s] = await DB.all(s);
    data.kv = data.kv.map((r) => (r.key === 'settings' ? { ...r, value: { ...r.value, apiKey: undefined } } : r));
    const blob = new Blob([JSON.stringify({ app: 'FitBox', version: 1, exportedAt: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
    const name = `fitbox-sicherung-${today()}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  $('#importInput').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'FitBox' || !j.data) throw new Error('kein FitBox-Backup');
      if (!confirm('Sicherung importieren? Aktuelle Einträge, Mahlzeiten und Pläne werden ersetzt (Videos bleiben).')) return;
      const keepKey = state.settings.apiKey;
      for (const s of Object.keys(j.data)) { if (s === 'videos' || !DB.stores.includes(s)) continue; await DB.clear(s); for (const o of j.data[s]) await DB.put(s, o); }
      if (keepKey) { const st = { ...(await kvGet('settings', {})), apiKey: keepKey }; await kvSet('settings', st); }
      await boot(); closeSheet(); toast('Sicherung importiert');
    } catch (err) { alert('Import fehlgeschlagen: ' + err.message); }
  });

  // ================================================================ ACTIONS
  const actions = {
    closeSheet,
    // today
    dayPrev: () => { state.date = addDays(state.date, -1); render(); },
    dayNext: () => { if (state.date < today()) { state.date = addDays(state.date, 1); render(); } },
    dayToday: () => { state.date = today(); render(); },
    addFood: () => foodSheet(),
    foodMode: (d) => foodSheet(d.mode),
    pickMeal: async (d) => {
      const m = await DB.get('meals', d.id); if (!m) return;
      await addEntry(m.name, m.kcal, m.protein);
      m.used = (m.used || 0) + 1; await DB.put('meals', m);
      closeSheet(); toast(`${m.name} eingetragen`); render();
    },
    quickSave: async () => {
      const name = $('#qName').value.trim() || 'Essen', kcal = num($('#qKcal').value), protein = num($('#qProtein').value);
      if (!kcal && !protein) { $('#qKcal').focus(); toast('Bitte Kalorien eingeben'); return; }
      await addEntry(name, kcal, protein);
      if ($('#qSave').checked && name !== 'Essen') await DB.put('meals', { id: uid(), name, kcal, protein, createdAt: Date.now(), used: 1 });
      closeSheet(); toast('Eingetragen'); render();
    },
    entry: async (d) => {
      const e = await DB.get('entries', d.id); if (!e) return;
      openSheet(`
        <h2>Eintrag</h2>
        <label class="f"><span>Name</span><input class="in" id="eName" value="${esc(e.name)}"></label>
        <div class="grid2">
          <label class="f"><span>Kalorien (kcal)</span><input class="in" id="eKcal" inputmode="decimal" value="${esc(e.kcal)}"></label>
          <label class="f"><span>Protein (g)</span><input class="in" id="eProtein" inputmode="decimal" value="${esc(e.protein || '')}"></label>
        </div>
        <button class="btn" data-act="entrySave" data-id="${e.id}">Speichern</button>
        <button class="btn danger" data-act="entryDel" data-id="${e.id}">Eintrag löschen</button>
      `, { noFocus: true });
    },
    entrySave: async (d) => {
      const e = await DB.get('entries', d.id); if (!e) return;
      e.name = $('#eName').value.trim() || e.name; e.kcal = num($('#eKcal').value); e.protein = num($('#eProtein').value);
      await DB.put('entries', e); closeSheet(); render();
    },
    entryDel: async (d) => { await DB.del('entries', d.id); closeSheet(); toast('Gelöscht'); render(); },
    settings: () => settingsSheet(),
    settingsSave: async () => {
      state.settings.kcalGoal = Math.max(500, Math.round(num($('#sKcal').value)) || 2200);
      state.settings.proteinGoal = Math.max(0, Math.round(num($('#sProtein').value)));
      state.settings.weightStep = num($('#sStep').value) || 2.5;
      state.settings.restSec = Math.round(num($('#sRest').value));
      state.settings.apiKey = ($('#sKey').value || '').trim();
      await kvSet('settings', state.settings); closeSheet(); toast('Gespeichert'); render();
    },
    exportData: () => exportData(),
    importData: () => $('#importInput').click(),
    // meals
    newMeal: () => mealSheet(null),
    meal: async (d) => mealSheet(await DB.get('meals', d.id)),
    mealSave: async (d) => {
      const name = $('#mName').value.trim(); if (!name) { $('#mName').focus(); toast('Bitte einen Namen eingeben'); return; }
      const old = d.id ? await DB.get('meals', d.id) : null;
      await DB.put('meals', { ...(old || { id: uid(), createdAt: Date.now() }), name, kcal: num($('#mKcal').value), protein: num($('#mProtein').value) });
      closeSheet(); toast('Mahlzeit gespeichert'); render();
    },
    mealDel: async (d) => { if (!confirm('Mahlzeit löschen?')) return; await DB.del('meals', d.id); closeSheet(); render(); },
    mealToday: async (d) => {
      const m = await DB.get('meals', d.id); if (!m) return;
      state.date = today(); await addEntry(m.name, m.kcal, m.protein);
      m.used = (m.used || 0) + 1; await DB.put('meals', m);
      closeSheet(); toast(`${m.name} für heute eingetragen`); render();
    },
    // training
    newPlan: () => planSheet(null),
    plan: async (d) => planSheet(await DB.get('plans', d.id)),
    exAdd: async () => { readPlanEditor(); state.editPlan.exercises.push(newExercise()); await drawPlanEditor(); const ins = $$('.ex-edit [data-f="name"]', sheet); ins[ins.length - 1].focus(); },
    exDel: async (d) => { readPlanEditor(); state.editPlan.exercises.splice(+d.i, 1); await drawPlanEditor(); },
    exUp: async (d) => { readPlanEditor(); const ex = state.editPlan.exercises, i = +d.i; [ex[i - 1], ex[i]] = [ex[i], ex[i - 1]]; await drawPlanEditor(); },
    loadTemplate: async (d) => {
      const t = TEMPLATES[d.t]; if (!t) return;
      const existing = new Set((await DB.all('plans')).map((p) => p.name.toLowerCase()));
      const todo = t.plans.filter((p) => !existing.has(p.name.toLowerCase()));
      if (!todo.length) { toast('Diese Pläne sind schon angelegt'); return; }
      if (!confirm(`${t.title} laden?\n${todo.length} Pläne werden angelegt:\n${todo.map((p) => '• ' + p.name).join('\n')}`)) return;
      const folders = await DB.all('folders');
      const folderFor = (name) => { const f = folders.find((x) => x.name.toLowerCase() === name.toLowerCase()); return f ? f.id : ''; };
      let i = 0;
      for (const tp of todo) {
        await DB.put('plans', { id: uid(), name: tp.name, days: tp.days, rotate: tp.rotate, rotateStart: weekIdx(today()), note: tp.note, createdAt: Date.now() + i++,
          exercises: tp.exercises.map((e) => ({ id: uid(), name: e.name, sets: e.sets, reps: e.reps, weight: '', muscle: e.muscle, fixed: e.fixed || '', folderId: folderFor(e.name), note: '' })) });
      }
      toast(`${todo.length} Pläne angelegt`); render();
    },
    exFromVideo: () => { readPlanEditor(); $('#aiVideoInput').click(); },
    clipCancel: () => { state.clipJob = null; drawPlanEditor(); },
    clipAccept: async () => {
      const job = state.clipJob, p = state.editPlan; if (!job || !p) return;
      const name = $('#cxName').value.trim(); if (!name) { $('#cxName').focus(); toast('Bitte die Übung benennen'); return; }
      // one video folder per split day (plan)
      const folderName = p.name || 'Trainingsvideos';
      let folder = (await DB.all('folders')).find((f) => f.name.toLowerCase() === folderName.toLowerCase());
      if (!folder) { folder = { id: uid(), name: folderName, createdAt: Date.now() }; await DB.put('folders', folder); }
      const meta = await videoMeta(job.file);
      const video = { id: uid(), folderId: folder.id, title: name, blob: job.file, type: job.file.type, thumb: meta.thumb, duration: meta.duration || job.duration,
        clipStart: job.start, clipEnd: job.end, ai: !!job.ai, createdAt: Date.now() };
      await DB.put('videos', video);
      const ex = newExercise();
      Object.assign(ex, { name, muscle: $('#cxMuscle').value.trim(), sets: $('#cxSets').value || '3', reps: $('#cxReps').value || '10', folderId: folder.id, videoId: video.id, note: job.ai && job.ai.tip ? job.ai.tip : '' });
      // replace an empty placeholder exercise, otherwise append
      const empty = p.exercises.findIndex((x) => !(x.name || '').trim());
      if (empty >= 0) p.exercises[empty] = ex; else p.exercises.push(ex);
      state.clipJob = null;
      await drawPlanEditor();
      toast(`${name} hinzugefügt`);
    },
    planSave: async () => {
      readPlanEditor();
      const p = state.editPlan;
      p.exercises = p.exercises.filter((e) => e.name.trim());
      if (!p.name) { $('#pName').focus(); toast('Bitte einen Namen für den Plan eingeben'); return; }
      if (!p.exercises.length) { toast('Füge mindestens eine Übung hinzu'); return; }
      delete p.isNew;
      if (p.rotate && p.rotateStart == null) p.rotateStart = weekIdx(today());
      await DB.put('plans', p); closeSheet(); toast('Plan gespeichert'); render();
    },
    planDel: async () => { if (!confirm('Plan löschen?')) return; await DB.del('plans', state.editPlan.id); closeSheet(); render(); },
    start: (d) => startWorkout(d.id),
    resume: () => { state.workoutView = true; render(); },
    tick: (d) => {
      const s = state.workout.exercises[+d.e].sets[+d.s];
      s.done = !s.done; saveWorkout();
      if (s.done && num(state.settings.restSec) > 0 && state.workout.exercises[+d.e].fixed !== 'start') startRest(num(state.settings.restSec));
      render().then(() => window.scrollTo(0, scrollY0));
    },
    addSet: (d) => {
      const e = state.workout.exercises[+d.e], last = e.sets[e.sets.length - 1] || {};
      e.sets.push({ reps: last.reps || '', weight: last.weight || '', done: false }); saveWorkout();
      render().then(() => window.scrollTo(0, scrollY0));
    },
    dayToggle: (d, el) => {
      const p = state.editPlan; p.days = p.days || [];
      const i = +d.d; p.days = p.days.includes(i) ? p.days.filter((x) => x !== i) : [...p.days, i];
      el.classList.toggle('on', p.days.includes(i));
    },
    wStep: (d) => {
      const e = state.workout.exercises[+d.e], step = num(state.settings.weightStep) || 2.5;
      const open = e.sets.filter((s) => !s.done), target = open.length ? open : e.sets;
      const base = num(curWeight(e));
      const next = Math.max(0, Math.round((base + (+d.dir) * step) * 100) / 100);
      target.forEach((s) => { s.weight = kg(next); });
      saveWorkout(); render().then(() => window.scrollTo(0, scrollY0));
    },
    progress: (d) => progressSheet(d.name),
    finish: async () => {
      const w = state.workout, done = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
      if (!done && !confirm('Noch kein Satz abgehakt. Trotzdem beenden?')) return;
      finishSheet();
    },
    finishConfirm: async () => {
      const w = state.workout;
      // apply the checked weight changes to the plan
      const plan = await DB.get('plans', w.planId);
      if (plan && state.finishChanges && state.finishChanges.length) {
        const checked = new Set($$('[data-change]', sheet).filter((c) => c.checked).map((c) => +c.dataset.change));
        state.finishChanges.forEach((c, k) => {
          if (!checked.has(k)) return;
          const e = w.exercises[c.i], pe = plan.exercises.find((x) => x.id === e.exId || x.name === e.name);
          if (pe) pe.weight = kg(c.to);
        });
        await DB.put('plans', plan);
      }
      closeSheet();
      w.finishedAt = Date.now();
      await DB.put('workouts', w); await DB.del('kv', 'activeWorkout');
      state.workout = null; state.workoutView = false; state.rest = null; drawRest();
      toast('Stark! Training gespeichert 💪'); render();
    },
    discard: async () => {
      if (!confirm('Training verwerfen? Es wird nicht gespeichert.')) return;
      await DB.del('kv', 'activeWorkout'); state.workout = null; state.workoutView = false; state.rest = null; drawRest(); render();
    },
    historyItem: async (d) => {
      const w = await DB.get('workouts', d.id); if (!w) return;
      openSheet(`
        <h2>${esc(w.planName)}</h2>
        <p class="hint">${esc(parseDay(w.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))} · ${durStr((w.finishedAt - w.startedAt) / 1000)}</p>
        <div class="list">${w.exercises.map((e) => `<div class="row"><div class="grow"><div class="name">${esc(e.name)}</div>
          <div class="sub">${e.sets.filter((s) => s.done).map((s) => `${s.reps || '–'}${s.weight ? ` × ${s.weight} kg` : ''}`).join(' · ') || 'keine Sätze'}</div></div></div>`).join('')}</div>
        <button class="btn danger" data-act="historyDel" data-id="${w.id}">Aus Verlauf löschen</button>
      `, { noFocus: true });
    },
    historyDel: async (d) => { if (!confirm('Training aus dem Verlauf löschen?')) return; await DB.del('workouts', d.id); closeSheet(); render(); },
    folderSheet: (d) => folderSheet(d.id),
    // body weight
    weightSave: async () => {
      const v = num($('#wKg').value), date = $('#wDate').value || today();
      if (v < 20 || v > 400) { $('#wKg').focus(); toast('Bitte ein gültiges Gewicht eingeben'); return; }
      if (date > today()) { toast('Datum liegt in der Zukunft'); return; }
      await DB.put('weights', { date, kg: Math.round(v * 10) / 10, at: Date.now() });
      toast(date === today() ? 'Gewicht gespeichert' : `Gespeichert für ${shortDate(date)}`); render();
    },
    weekSheet: (d) => weekSheet(d.m),
    weightDel: async (d) => { if (!confirm('Eintrag löschen?')) return; const m = mondayOf(d.d); await DB.del('weights', d.d); render(); weekSheet(m); },
    // videos
    newFolder: () => openSheet(`
      <h2>Neues Fach</h2>
      <label class="f"><span>Name</span><input class="in" id="fName" placeholder="z. B. Pelvic Tilt" autocomplete="off" autofocus></label>
      <button class="btn" data-act="folderSave">Fach anlegen</button>`),
    folderSave: async (d) => {
      const name = $('#fName').value.trim(); if (!name) { $('#fName').focus(); return; }
      const old = d.id ? await DB.get('folders', d.id) : null;
      const f = { ...(old || { id: uid(), createdAt: Date.now() }), name };
      await DB.put('folders', f); closeSheet();
      if (!old) state.folderId = f.id;
      toast(old ? 'Umbenannt' : 'Fach angelegt'); render();
    },
    folder: (d) => { state.folderId = d.id; render(); },
    folderMenu: async () => {
      const f = await DB.get('folders', state.folderId); if (!f) return;
      openSheet(`
        <h2>Fach</h2>
        <label class="f"><span>Name</span><input class="in" id="fName" value="${esc(f.name)}" autocomplete="off"></label>
        <button class="btn" data-act="folderSave" data-id="${f.id}">Umbenennen</button>
        <button class="btn danger" data-act="folderDel" data-id="${f.id}">Fach mit allen Videos löschen</button>`, { noFocus: true });
    },
    folderDel: async (d) => {
      if (!confirm('Fach und alle Videos darin wirklich löschen?')) return;
      for (const v of await DB.by('videos', 'folderId', d.id)) await DB.del('videos', v.id);
      await DB.del('folders', d.id); state.folderId = null; closeSheet(); toast('Fach gelöscht'); render();
    },
    addVideo: () => $('#videoInput').click(),
    video: (d) => videoSheet(d.id),
    videoSave: async (d) => {
      const v = await DB.get('videos', d.id); if (!v) return;
      v.title = $('#vTitle').value.trim() || v.title; v.folderId = $('#vFolder').value || v.folderId;
      await DB.put('videos', v); closeSheet(); toast('Gespeichert'); render();
    },
    videoDel: async (d) => { if (!confirm('Video löschen?')) return; await DB.del('videos', d.id); closeSheet(); toast('Video gelöscht'); render(); },
  };

  let scrollY0 = 0;
  function onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el || !actions[el.dataset.act]) return;
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
    scrollY0 = window.scrollY;
    actions[el.dataset.act]({ ...el.dataset }, el, e);
  }
  view.addEventListener('click', onClick);
  sheet.addEventListener('change', (e) => { if (e.target.id === 'pRotate' && state.editPlan) { readPlanEditor(); drawPlanEditor(); } });
  sheet.addEventListener('click', onClick);
  // workout inputs: keep values while typing
  view.addEventListener('input', (e) => {
    const el = e.target; if (!el.dataset.w || !state.workout) return;
    state.workout.exercises[+el.dataset.e].sets[+el.dataset.s][el.dataset.w] = el.value;
    clearTimeout(view._t); view._t = setTimeout(saveWorkout, 400);
  });

  // ---------------------------------------------------------------- boot
  async function boot() {
    state.settings = { ...state.settings, ...(await kvGet('settings', {})) };
    state.workout = await kvGet('activeWorkout', null);
    render();
  }
  // a new day while the app stays open
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.tab === 'today' && state.date !== today() && !sheet.innerHTML) { state.date = today(); render(); } });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  boot();
})();
