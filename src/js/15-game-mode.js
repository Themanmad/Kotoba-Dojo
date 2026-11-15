/* =====================================================================
   GAME MODE — dojo belts earned with XP, stars per lesson, badges, combos and a daily time goal.
   XP and badges are always counted, so switching to game mode shows what you've already earned;
   they're only shown when Settings → Learning style is “Game”. The daily goal shows in both styles.
   ===================================================================== */
const BELTS = [
  { xp: 0, name: 'White belt', jp: '白帯', c: '#E9ECEF', t: '#1C2127' }, { xp: 400, name: 'Yellow belt', jp: '黄帯', c: '#F4C430', t: '#1C2127' },
  { xp: 1200, name: 'Orange belt', jp: '橙帯', c: '#F0802A', t: '#fff' }, { xp: 2500, name: 'Green belt', jp: '緑帯', c: '#3FA34D', t: '#fff' },
  { xp: 4500, name: 'Blue belt', jp: '青帯', c: '#2B6CC4', t: '#fff' }, { xp: 7500, name: 'Purple belt', jp: '紫帯', c: '#7B4BB7', t: '#fff' },
  { xp: 12000, name: 'Brown belt', jp: '茶帯', c: '#7A4A26', t: '#fff' }, { xp: 18000, name: 'Black belt, 1st dan', jp: '初段', c: '#16181C', t: '#fff' },
  { xp: 30000, name: 'Black belt, 2nd dan', jp: '二段', c: '#16181C', t: '#F4C430' }, { xp: 50000, name: 'Black belt, 3rd dan', jp: '三段', c: '#16181C', t: '#F4C430' }
];
const BADGES = [
  { id: 'first', icon: '🎌', name: 'First step', how: 'Finish your first lesson' },
  { id: 'perfect', icon: '💯', name: 'Perfect', how: 'Get every practice question right in a lesson' },
  { id: 'goal', icon: '🎯', name: 'On target', how: 'Reach your daily goal' },
  { id: 'streak3', icon: '🔥', name: 'Warming up', how: 'Study 3 days in a row' },
  { id: 'streak7', icon: '🔥', name: 'One week strong', how: 'Study 7 days in a row' },
  { id: 'streak30', icon: '🏮', name: 'Habit master', how: 'Study 30 days in a row' },
  { id: 'words100', icon: '📚', name: '100 words', how: 'Have 100 words in your reviews' },
  { id: 'words500', icon: '📖', name: '500 words', how: 'Have 500 words in your reviews' },
  { id: 'kanji50', icon: '字', name: '50 kanji', how: 'Have 50 kanji in your reviews' },
  { id: 'stage', icon: '⛩️', name: 'Stage cleared', how: 'Clear a checkpoint' },
  { id: 'combo10', icon: '⚡', name: 'On fire', how: 'Answer 10 in a row correctly' },
  { id: 'travel', icon: '✈️', name: 'Ready to travel', how: 'Finish every Travel lesson' },
  { id: 'exam', icon: '🏆', name: 'Exam ready', how: 'Score 80%+ on a mock exam' }
];
let game = Object.assign({ xp: 0, badges: {}, stars: {}, combo: 0, goalDays: {} }, store.get('game', {}));
const saveGame = () => store.set('game', game);
const gameOn = () => settings.style === 'game';
const beltOf = xp => { let b = BELTS[0]; for (const x of BELTS) if (xp >= x.xp) b = x; return b; };
const nextBelt = xp => BELTS.find(b => b.xp > xp) || null;
function addXP(n) {
  if (!n) return;
  const before = beltOf(game.xp); game.xp += n; saveGame();
  const after = beltOf(game.xp);
  if (gameOn()) { xpPop(n); if (after !== before) setTimeout(() => celebrate(`New belt: ${after.name}!`, `${after.jp} · keep going`), 400); }
}
function earn(id) {
  if (game.badges[id]) return; game.badges[id] = today(); saveGame();
  const b = BADGES.find(x => x.id === id); if (b && gameOn()) setTimeout(() => celebrate(`Badge: ${b.icon} ${b.name}`, b.how), 900);
}
/** answer hook used by lessons, quizzes and flashcards */
function gameAnswer(ok) {
  if (ok) { game.combo++; addXP(10 + (game.combo >= 5 ? 5 : 0)); if (game.combo >= 10) earn('combo10'); }
  else game.combo = 0;
  saveGame();
}
const starsFor = pct => pct >= 90 ? 3 : pct >= 70 ? 2 : 1;
const starHtml = n => `<span class="stars" aria-label="${n} of 3 stars">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>`;
function gameLesson(u, pct) {
  const st = starsFor(pct), prev = game.stars[u.id] || 0;
  if (st > prev) game.stars[u.id] = st;
  addXP(u.cp ? (pct >= CP_PASS ? 150 : 20) : 50 + (pct === 100 ? 25 : 0));
  earn('first'); if (pct === 100 && !u.cp) earn('perfect'); if (u.cp && pct >= CP_PASS) earn('stage');
  if (travelUnits().every(t => pathSt.done[t.id])) earn('travel');
  checkBadges(); saveGame();
  return st;
}
function checkBadges() {
  const st = streak(); if (st >= 3) earn('streak3'); if (st >= 7) earn('streak7'); if (st >= 30) earn('streak30');
  const ids = Object.keys(progress), w = ids.filter(i => i.startsWith('v:')).length, k = ids.filter(i => i.startsWith('k:')).length;
  if (w >= 100) earn('words100'); if (w >= 500) earn('words500'); if (k >= 50) earn('kanji50');
  if (store.get('exams', []).some(h => h.max && h.total / h.max >= 0.8)) earn('exam');
}

/* ---------- daily time goal: counts real study time (lessons, quizzes, reviews, the placement check) ---------- */
let lastAct = Date.now();
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, { capture: true, passive: true }));
const studyMin = () => Math.floor(((actLog[today()] || {}).sec || 0) / 60);
setInterval(() => {
  if (document.hidden || Date.now() - lastAct > 90e3) return;                     // away from the screen: don't count
  const studying = S.session || ['lesson', 'place'].includes(S.view) || $('#sheet').classList.contains('open');
  if (!studying) return;
  const d = today(), e = actLog[d] || { r: 0 }; e.sec = (e.sec || 0) + 15; actLog[d] = e; store.set('log', actLog);
  if (studyMin() >= (settings.goalMin || 15) && !game.goalDays[d]) { game.goalDays[d] = 1; saveGame(); earn('goal'); addXP(50); if (gameOn()) celebrate('Daily goal reached!', `${settings.goalMin || 15} minutes today. お疲れさま!`); else toast(`Daily goal reached: ${settings.goalMin || 15} minutes`); }
  const g = $('#goalbar'); if (g) g.outerHTML = goalBar();
}, 15e3);
function goalBar() {
  const m = studyMin(), goal = settings.goalMin || 15, pct = Math.min(100, m / goal * 100);
  return `<div class="goalbar${pct >= 100 ? ' met' : ''}" id="goalbar"><div class="gb-ring" style="--p:${pct}"><span>${Math.min(m, 999)}</span></div><div class="gb-t"><b>${pct >= 100 ? 'Daily goal reached' : 'Today’s goal'}</b><span>${m} of ${goal} minutes${pct >= 100 ? ' · nice work' : ''}</span></div></div>`;
}
/* ---------- the game card on Home ---------- */
function gameCard() {
  if (!gameOn()) return goalBar();
  const b = beltOf(game.xp), n = nextBelt(game.xp), pct = n ? (game.xp - b.xp) / (n.xp - b.xp) * 100 : 100;
  const got = BADGES.filter(x => game.badges[x.id]);
  return `<div class="card gcard"><div class="gc-top"><span class="belt" style="--bc:${b.c};--bt:${b.t}"><i></i>${esc(b.jp)}</span><div class="gc-n"><b>${esc(b.name)}</b><span>${fmtN(game.xp)} XP${n ? ` · ${fmtN(n.xp - game.xp)} to ${esc(n.name.replace(', ', ' '))}` : ''}</span></div></div>
    <div class="pbar gc-bar"><i style="width:${pct}%;background:${n ? n.c : b.c}"></i></div>
    ${goalBar()}
    <div class="gc-badges">${BADGES.map(x => `<span class="bdg${game.badges[x.id] ? ' got' : ''}" title="${esc(x.name)}: ${esc(x.how)}">${x.icon}</span>`).join('')}</div>
    <div class="gc-foot">${got.length} of ${BADGES.length} badges</div></div>`;
}
/* ---------- little celebrations (game mode only; nothing moves with reduced motion) ---------- */
function xpPop(n) {
  const el = document.createElement('div'); el.className = 'xppop'; el.textContent = `+${n} XP`; document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
function celebrate(title, sub) {
  const box = document.createElement('div'); box.className = 'celebrate'; box.setAttribute('role', 'status');
  box.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || '')}</span>`; document.body.appendChild(box);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const cols = ['#4DAF4A', '#F0802A', '#1BA1D8', '#D9A800', '#C2337A', '#22408F'];
    for (let i = 0; i < 36; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length]; c.style.animationDelay = Math.random() * .3 + 's'; c.style.transform = `rotate(${Math.random() * 360}deg)`; document.body.appendChild(c); setTimeout(() => c.remove(), 2200); }
  }
  setTimeout(() => box.classList.add('out'), 2200); setTimeout(() => box.remove(), 2700);
}

