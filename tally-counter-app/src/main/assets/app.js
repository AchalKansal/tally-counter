'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const KEY_COUNTERS = 'tally_counters';
const KEY_SETTINGS = 'tally_settings';
const MAX_COUNTERS = 5;
const MAX_HISTORY  = 25;
const RING_R       = 54;
const RING_C       = 2 * Math.PI * RING_R; // ≈ 339.3

// ─── State ────────────────────────────────────────────────────────────────────

let counters = [];
let settings = {
  sound:         true,
  vibration:     true,
  keepScreenOn:  false,
  theme:         'light',
  activeId:      null,
};
let activeId  = null;
let audioCtx  = null;

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(KEY_COUNTERS);
    if (raw) counters = JSON.parse(raw);
  } catch (_) {}

  if (!counters.length) counters = [makeCounter('Counter 1')];

  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch (_) {}

  activeId = settings.activeId || counters[0].id;
  if (!counters.find(c => c.id === activeId)) activeId = counters[0].id;
}

function saveCounters() {
  localStorage.setItem(KEY_COUNTERS, JSON.stringify(counters));
}

function saveSettings() {
  settings.activeId = activeId;
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

// ─── Counter model ────────────────────────────────────────────────────────────

function makeCounter(name) {
  return { id: Date.now() + Math.floor(Math.random() * 1000), name, count: 0, target: 0, step: 1, history: [] };
}

function active() {
  return counters.find(c => c.id === activeId) || counters[0];
}

function pushHistory(c) {
  if (c.count === 0) return;
  c.history.unshift({ count: c.count, ts: Date.now() });
  if (c.history.length > MAX_HISTORY) c.history.pop();
}

// ─── Count actions ────────────────────────────────────────────────────────────

function increment() {
  const c = active();
  c.count += c.step;
  const hitTarget = c.target > 0 && c.count >= c.target;

  playSound(hitTarget ? 'complete' : 'click');
  doVibrate(hitTarget ? [50, 40, 80] : [18]);

  saveCounters();
  renderCount();
  popCount();

  if (hitTarget) {
    showBanner('🎉 Target Reached!');
    pushHistory(c);
    saveCounters();
  }
}

function decrement() {
  const c = active();
  if (c.count <= 0) { doVibrate([8, 30, 8]); return; }
  c.count = Math.max(0, c.count - c.step);
  playSound('click');
  doVibrate([10]);
  saveCounters();
  renderCount();
  popCount();
}

function resetCounter() {
  const c = active();
  pushHistory(c);
  c.count = 0;
  saveCounters();
  renderCount();
  doVibrate([30, 25, 50]);
}

// ─── Audio (Web Audio API — no external files) ────────────────────────────────

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  if (!settings.sound) return;
  try {
    const ac = ctx();
    if (type === 'complete') {
      tone(ac, 523, 0, 0.22, 0.5);   // C5
      tone(ac, 659, 0.18, 0.22, 0.4); // E5
      tone(ac, 784, 0.36, 0.22, 0.3); // G5
    } else {
      tone(ac, 700, 0, 0.1, 0.12);
    }
  } catch (_) {}
}

function tone(ac, freq, delay, dur, vol) {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  const t = ac.currentTime + delay;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// ─── Vibration ────────────────────────────────────────────────────────────────

function doVibrate(pattern) {
  if (!settings.vibration) return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    } else if (window.Android) {
      if (pattern.length >= 3 && window.Android.vibratePattern) {
        window.Android.vibratePattern(pattern[0], pattern[1] || 0, pattern[2] || 0);
      } else if (window.Android.vibrate) {
        window.Android.vibrate(pattern[0] || 20);
      }
    }
  } catch (_) {}
}

// ─── Screen keep-on ───────────────────────────────────────────────────────────

function applyKeepScreenOn(on) {
  try { window.Android && window.Android.keepScreenOn(on); } catch (_) {}
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function render() {
  applyTheme();
  renderHeader();
  renderCount();
  renderTabs();
}

function applyTheme() {
  document.body.className = settings.theme || 'light';
}

function renderHeader() {
  document.getElementById('counterName').textContent = active().name;
}

function renderCount() {
  const c = active();
  document.getElementById('countDisplay').textContent = c.count.toLocaleString('en-IN');

  const ring       = document.getElementById('progressRing');
  const fill       = document.getElementById('ringFill');
  const label      = document.getElementById('targetLabel');
  const hint       = document.getElementById('tapHint');

  if (c.target > 0) {
    ring.classList.remove('hidden');
    label.classList.remove('hidden');
    hint.classList.add('hidden');

    const progress = Math.min(c.count / c.target, 1);
    fill.style.strokeDasharray  = RING_C;
    fill.style.strokeDashoffset = RING_C * (1 - progress);

    const pct = Math.round(progress * 100);
    label.textContent = `${c.count.toLocaleString('en-IN')} / ${c.target.toLocaleString('en-IN')} · ${pct}%`;
  } else {
    ring.classList.add('hidden');
    label.classList.add('hidden');
    hint.classList.remove('hidden');
  }
}

function renderTabs() {
  const bar    = document.getElementById('tabBar');
  const addBtn = document.getElementById('addCounterBtn');
  bar.querySelectorAll('.tab-btn:not(.add-tab)').forEach(b => b.remove());

  counters.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (c.id === activeId ? ' active' : '');
    const label = c.name.length > 9 ? c.name.slice(0, 8) + '…' : c.name;
    btn.textContent = label;
    btn.addEventListener('click', () => switchTo(c.id));
    bar.insertBefore(btn, addBtn);
  });

  addBtn.style.display = counters.length >= MAX_COUNTERS ? 'none' : '';
}

function popCount() {
  const el = document.getElementById('countDisplay');
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function flashTap() {
  const area = document.getElementById('countArea');
  area.classList.add('tapped');
  setTimeout(() => area.classList.remove('tapped'), 120);
}

function showBanner(msg) {
  let b = document.getElementById('banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'banner';
    document.getElementById('app').appendChild(b);
  }
  b.textContent = msg;
  b.className = 'banner show';
  setTimeout(() => { b.className = 'banner'; }, 2400);
}

// ─── Counter management ───────────────────────────────────────────────────────

function switchTo(id) {
  activeId = id;
  saveSettings();
  render();
}

function addCounter() {
  if (counters.length >= MAX_COUNTERS) { showBanner('Maximum 5 counters'); return; }
  const c = makeCounter(`Counter ${counters.length + 1}`);
  counters.push(c);
  activeId = c.id;
  saveCounters();
  saveSettings();
  render();
  openSettings();
}

function deleteActive() {
  if (counters.length === 1) { showBanner('Cannot delete the last counter'); return; }
  counters = counters.filter(c => c.id !== activeId);
  activeId = counters[0].id;
  saveCounters();
  saveSettings();
  closeSettings();
  render();
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function openSettings() {
  const c = active();
  document.getElementById('nameInput').value   = c.name;
  document.getElementById('targetInput').value = c.target || '';
  document.getElementById('stepInput').value   = c.step || 1;
  setToggle('soundToggle',    settings.sound);
  setToggle('vibToggle',      settings.vibration);
  setToggle('wakeLockToggle', settings.keepScreenOn);

  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === settings.theme);
  });

  show('settingsPanel');
  show('settingsOverlay');
}

function closeSettings() {
  hide('settingsPanel');
  hide('settingsOverlay');
}

function commitSettings() {
  const c = active();
  const newName = document.getElementById('nameInput').value.trim();
  if (newName) c.name = newName;
  c.target = Math.max(0, parseInt(document.getElementById('targetInput').value) || 0);
  c.step   = Math.max(1, parseInt(document.getElementById('stepInput').value)   || 1);

  settings.sound        = getToggle('soundToggle');
  settings.vibration    = getToggle('vibToggle');
  settings.keepScreenOn = getToggle('wakeLockToggle');
  applyKeepScreenOn(settings.keepScreenOn);

  saveCounters();
  saveSettings();
  closeSettings();
  render();
}

// ─── History panel ────────────────────────────────────────────────────────────

function openHistory() {
  const c    = active();
  const list = document.getElementById('historyList');
  document.getElementById('historyTitle').textContent = c.name + ' · History';
  list.innerHTML = '';

  if (!c.history.length) {
    list.innerHTML = '<p class="empty-msg">No sessions yet.<br>Reset a counter to record a session.</p>';
  } else {
    c.history.forEach(entry => {
      const row  = document.createElement('div');
      row.className = 'history-row';
      const d    = new Date(entry.ts);
      const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      row.innerHTML = `<span class="h-date">${date}, ${time}</span><span class="h-count">${entry.count.toLocaleString('en-IN')}</span>`;
      list.appendChild(row);
    });
  }

  show('historyPanel');
  show('historyOverlay');
}

function closeHistory() {
  hide('historyPanel');
  hide('historyOverlay');
}

function clearHistory() {
  active().history = [];
  saveCounters();
  openHistory();
}

// ─── Reset modal ──────────────────────────────────────────────────────────────

function showResetModal() {
  show('resetModal');
  show('resetOverlay');
}

function hideResetModal() {
  hide('resetModal');
  hide('resetOverlay');
}

// ─── Toggle helpers ───────────────────────────────────────────────────────────

function setToggle(id, on) { document.getElementById(id).classList.toggle('on', on); }
function getToggle(id)     { return document.getElementById(id).classList.contains('on'); }
function bindToggle(id)    { document.getElementById(id).addEventListener('click', () => document.getElementById(id).classList.toggle('on')); }
function show(id)          { document.getElementById(id).classList.remove('hidden'); }
function hide(id)          { document.getElementById(id).classList.add('hidden'); }

// ─── Event wiring ─────────────────────────────────────────────────────────────

function setupEvents() {
  // Count area — full tap = increment
  document.getElementById('countArea').addEventListener('click', () => {
    flashTap();
    increment();
  });

  // Prevent action buttons from also firing the area's click
  document.getElementById('actionBar').addEventListener('click', e => e.stopPropagation());

  document.getElementById('incrementBtn').addEventListener('click', increment);
  document.getElementById('decrementBtn').addEventListener('click', decrement);
  document.getElementById('resetBtn').addEventListener('click', showResetModal);

  // Add counter
  document.getElementById('addCounterBtn').addEventListener('click', addCounter);

  // Settings
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', commitSettings);
  document.getElementById('deleteCounterBtn').addEventListener('click', deleteActive);

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.theme = btn.dataset.theme;
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b === btn));
      applyTheme();
    });
  });

  // Toggles
  bindToggle('soundToggle');
  bindToggle('vibToggle');
  bindToggle('wakeLockToggle');

  // History
  document.getElementById('historyBtn').addEventListener('click', openHistory);
  document.getElementById('historyOverlay').addEventListener('click', closeHistory);
  document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

  // Reset modal
  document.getElementById('resetConfirmBtn').addEventListener('click', () => { hideResetModal(); resetCounter(); });
  document.getElementById('resetCancelBtn').addEventListener('click', hideResetModal);
  document.getElementById('resetOverlay').addEventListener('click', hideResetModal);
}

// ─── Insets (called by MainActivity.pushInsetsToPage) ────────────────────────
// MainActivity reads the real status-bar / nav-bar pixel heights and calls this
// so the CSS variables reflect the actual device bars rather than guessing.

function applyInsets(topPx, bottomPx) {
  document.documentElement.style.setProperty('--inset-top',    topPx    + 'px');
  document.documentElement.style.setProperty('--inset-bottom', bottomPx + 'px');
}
window.applyInsets = applyInsets;

// ─── Boot ─────────────────────────────────────────────────────────────────────

loadState();
render();
setupEvents();
applyKeepScreenOn(settings.keepScreenOn);
