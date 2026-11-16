/* =====================================================================
   RENDER + ACTIONS
   ===================================================================== */
/* desktop sidebar footer: progress on the line you're riding */
function navFoot(st) {
  const l = userLevel(); if (!l || l === 'MY') return '';
  const row = (name, kind) => { const x = levelStats(kind, l); const pc = x.total ? Math.round(100 * x.known / x.total) : 0; return x.total ? `<div class="nf-row"><span>${name}</span><div class="nf-bar"><span style="width:${Math.max(pc, x.known ? 2 : 0)}%"></span></div><b>${pc}%</b></div>` : ''; };
  const due = dueCount();
  return `<div style="--lc:${lcVar(l)}"><div class="nf-head"><i></i>${esc(lvName(l))} line</div>${row('Words', 'vocab')}${row('Kanji', 'kanji')}${row('Grammar', 'grammar')}
  <div class="nf-meta"><span>🔥 ${st} day${st === 1 ? '' : 's'}</span><span>${due ? `${due} due` : 'Nothing due'}</span></div></div>`;
}
/* ---------- the late bundle: Chat and Play load right after the first screen, from late.js ---------- */
const LATE = { ready: false, failed: false };
const LATE_VIEWS = ['chat', 'play'];
function loadLate() {
  if (LATE.ready || LATE.loading) return; LATE.loading = true; LATE.failed = false;
  const sc = document.createElement('script'); sc.src = 'late.js?v=__LATE_V__'; sc.async = true;
  sc.onload = () => { LATE.loading = false; LATE.ready = true; if (LATE_VIEWS.includes(S.view) && !S.session) render(); };
  sc.onerror = () => { LATE.loading = false; LATE.failed = true; sc.remove(); if (LATE_VIEWS.includes(S.view) && !S.session) render(); };
  document.head.appendChild(sc);
}
function lateWait() {
  if (LATE.failed) return `<div class="card empty-state"><b>This part didn’t load</b><p>Chat and Play need one more file, and it couldn’t be fetched. Check your connection and try again.</p><button class="btn" onclick="loadLate();render()">Try again</button></div>`;
  loadLate(); return `<div class="loading" role="status">読み込み中… loading</div>`;
}
function render() {
  const navOf = v => ['path', 'lesson', 'place', 'books', 'learn'].includes(v) ? 'learn' : ['exam', 'conj', 'write', 'shadow', 'dquiz', 'practice'].includes(v) ? 'practice' : ['kana', 'vocab', 'kanji', 'grammar', 'read', 'library'].includes(v) ? 'library' : ['chat', 'play', 'explore'].includes(v) ? 'explore' : v === 'anki' ? 'settings' : v;
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === navOf(S.view) || b.dataset.v === S.view));
  const st = streak(); $('#streak').innerHTML = (st ? `<span class="hst">${ICON.flame}${st}</span>` : '') + (gameOn() ? `<span class="hxp" title="${esc(beltOf(game.xp).name)}">⭐ ${fmtN(game.xp)}</span>` : '');
  const nf = $('#navfoot'); if (nf) nf.innerHTML = navFoot(st);
  const pb = $('#profbtn'); if (pb) pb.innerHTML = `<span class="pf-lv">${esc(userLevel())}</span>${ICON.user}`;
  const page = S.session ? 'session' : S.view;
  document.body.classList.toggle('in-session', !!S.session);   // phones hide the bottom bar while you're answering
  if (S.view === 'path' && DATA.mode === 'full' && !S.pathLoading && (LV.some(l => !isLoaded('vocab', l)) || LV.some(l => !isLoaded('grammar', l)))) { S.pathLoading = true; loadPathData().then(() => { S.pathLoading = false; if (S.view === 'path') render(); }); }
  $('#app').innerHTML = `<div class="page page-${page}">${S.session ? renderSession() : ({ home: vHome, path: vPath, lesson: vLesson, place: vPlace, library: vLibrary, kana: vKana, vocab: vVocab, kanji: vKanji, grammar: vGrammar, anki: vAnki, dquiz: vDquiz, chat: () => LATE.ready ? vChat() : lateWait(), play: () => LATE.ready ? vPlay() : lateWait(), exam: vExam, search: vSearch, settings: vSettings, books: vBooks, conj: vConj, read: vRead, write: vWrite, shadow: vShadow, learn: vLearn, practice: vPractice, explore: vExplore })[S.view]()}</div>`;
  hydrate($('#app')); paintLevels($('#app')); comfortHydrate();
  { const nb = document.querySelector('.nav-extra[data-v="shadow"]'); if (nb) nb.hidden = !shAvailable(); }   // needs sentence recordings (full data)
  if (S.view === 'write' && !S.session) writeHydrate();
  if (S.fromPlay && S.view !== 'play' && !S.session) $('#app').insertAdjacentHTML('afterbegin', `<button class="backtown" onclick="S.fromPlay=false;App.go('play')">🏯 Back to town</button>`);
  if (S.view === 'play' && !S.session && LATE.ready) townMount();
}
const SKINS = [
  { id: 'dojo', name: 'Dojo', desc: 'Warm ivory, charcoal and vermilion', bg: '#F7F3EC', ink: '#2A2724', accent: '#B4472F', line: '#E6DFD3', font: 'Inter', sample: '道 Aa', glow: 'none', meta: ['#F7F3EC', '#1B1A18'] },
  { id: 'washi', name: 'Station', desc: 'Platform white, line colours', bg: '#F5F7F6', ink: '#1C2127', accent: '#22408F', line: '#4DAF4A', font: 'Zen Kaku Gothic New', sample: '駅 Aa', glow: 'none', meta: ['#F5F7F6', '#0F1317'] },
  { id: 'terminal', name: 'Terminal', desc: 'Green hacker console', bg: '#010b05', ink: '#3dff7a', accent: '#39ff14', line: '#0d4020', font: 'JetBrains Mono, monospace', sample: '> 語_', glow: '0 0 8px #39ff14', meta: ['#010b05', '#010b05'] },
  { id: 'sakura', name: 'Sakura', desc: 'Soft cherry-blossom pink', bg: '#fdf6f8', ink: '#2a1d22', accent: '#d6336c', line: '#f1dde4', font: 'Noto Sans JP', sample: '桜 Aa', glow: 'none', meta: ['#fdf6f8', '#1a1216'] },
  { id: 'ocean', name: 'Ocean', desc: 'Calm blue', bg: '#f4f8fb', ink: '#14202b', accent: '#1769aa', line: '#dbe6ef', font: 'Noto Sans JP', sample: '海 Aa', glow: 'none', meta: ['#f4f8fb', '#0d151d'] }
];
const darkQuery = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
const isDark = () => settings.skin === 'terminal' || settings.theme === 'dark' || (settings.theme === 'system' && darkQuery.matches);
function applyTheme() {
  const r = document.documentElement;
  if (settings.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', settings.theme);
  if (!settings.skin || settings.skin === 'washi') r.removeAttribute('data-skin'); else r.setAttribute('data-skin', settings.skin);
  const sk = SKINS.find(k => k.id === settings.skin) || SKINS[0];
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = isDark() ? sk.meta[1] : sk.meta[0];
  const b = $('#themebtn');
  if (b) { b.style.display = settings.skin === 'terminal' ? 'none' : ''; b.innerHTML = isDark() ? ICON.sun : ICON.moon; b.title = isDark() ? 'Switch to light mode' : 'Switch to dark mode'; }
}
if (darkQuery.addEventListener) darkQuery.addEventListener('change', () => { if (settings.theme === 'system') applyTheme(); });
function applySettings() { document.body.classList.toggle('furi-tap', settings.furigana === 'tap'); applyTheme(); if (typeof applyComfort === 'function') applyComfort(); }
const saveSettings = () => store.set('settings', settings);
/* ---------- detail panel with history ----------
   Opening a word / kanji / grammar point from inside the panel stacks it, so
   "‹ Back" (or the phone's back gesture) returns to where you were.          */
const itemById = id => id.startsWith('k:') ? KMAP[id.slice(2)] : id.startsWith('g:') ? GMAP[id] : id.startsWith('a:') ? KANAMAP[id.slice(2)] : VMAP[id];
const itemLabel = x => !x ? '' : x.kind === 'kana' ? x.ch : x.kind === 'kanji' ? x.k : x.kind === 'grammar' ? (gSplitTitle(x.t).jp || x.t) : x.w;
let sheetStack = [], sheetPushed = 0, sheetClosing = false;
function renderSheet() {
  closeWordPop();
  const sh = $('#sheet'), top = sheetStack[sheetStack.length - 1]; if (!top) return hideSheet();
  const item = itemById(top.id), prev = sheetStack[sheetStack.length - 2];
  sh.innerHTML = `<div class="sheet-bg" onclick="App.closeSheet()"></div><div class="sheet">
    <div class="sheet-nav">${prev ? `<button class="ghost sheet-back" onclick="App.sheetBack()" aria-label="Back">‹ <span class="jp">${esc(itemLabel(itemById(prev.id)))}</span></button>` : '<span></span>'}
    <button class="ghost close" onclick="App.closeSheet()" aria-label="Close">✕</button></div>${detail(item)}</div>`;
  sh.classList.add('open'); hydrate(sh); paintLevels(sh);
  const panel = sh.querySelector('.sheet'); if (panel) panel.scrollTop = top.scroll || 0;
}
function hideSheet() { closeWordPop(); sheetStack = []; const sh = $('#sheet'); sh.classList.remove('open'); sh.innerHTML = ''; }
function openSheet(id) {
  if (!itemById(id)) return;
  const sh = $('#sheet'), open = sh.classList.contains('open');
  if (!open) { sheetStack = []; sheetPushed = 0; }
  const top = sheetStack[sheetStack.length - 1];
  if (top && top.id === id) return;
  if (top) { const panel = sh.querySelector('.sheet'); top.scroll = panel ? panel.scrollTop : 0; }
  sheetStack.push({ id, scroll: 0 });
  try { history.pushState({ kdSheet: sheetStack.length }, ''); sheetPushed++; } catch (e) {}
  renderSheet();
}
function popSheet() { sheetStack.pop(); if (sheetStack.length) renderSheet(); else hideSheet(); }
window.addEventListener('popstate', () => {
  if (sheetClosing) { sheetClosing = false; return hideSheet(); }
  if ($('#sheet').classList.contains('open')) { sheetPushed = Math.max(0, sheetPushed - 1); popSheet(); }
});
let searchTimer = null;

