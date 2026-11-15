/* =====================================================================
   TODAY'S PRACTICE: one extra stop on Home's daily line that rotates through
   the skills the lessons don't drill every day (reading, listening, writing,
   conjugation, shadowing). It picks the skill you've practised least recently,
   keeps it for the whole day, and ticks off once you've done enough of it.
   ===================================================================== */
/** count practice of a skill today; when it reaches `need`, the skill is done for today */
function skillTick(id, need = 1) {
  const d = today(), s = store.get('skillday', {});
  if (s.d !== d) { s.d = d; s.c = {}; }
  s.c[id] = (s.c[id] || 0) + 1; store.set('skillday', s);
  if (s.c[id] >= need && !flagged('skill:' + id)) {
    dayFlag('skill:' + id);
    const last = store.get('skillLast', {}); last[id] = d; store.set('skillLast', last);
  }
}
const skillCount = id => { const s = store.get('skillday', {}); return s.d === today() ? (s.c || {})[id] || 0 : 0; };
/** words you've started that have a native recording */
const listenWords = () => V.filter(x => x.au && progress[x.id]);
const SKILLS = [
  { id: 'read', need: 1, title: 'Reading', jp: '読', sub: () => 'One short passage at your level, with questions',
    ok: () => READ.some(p => p.lv === userLevel()), act: "App.todayRead()" },
  { id: 'listen', need: 8, title: 'Listening', jp: '聴', sub: () => 'Hear words you’ve learned and pick or type them',
    ok: () => DATA.mode === 'full' && listenWords().length >= 8, act: "App.todayListen()" },
  { id: 'shadow', need: 3, title: 'Shadowing', jp: '声', sub: () => 'Say sentences after a native speaker and compare',
    ok: () => shAvailable(), act: "App.shadowStart()" },
  { id: 'write', need: 3, title: 'Writing', jp: '書', sub: () => 'Write three kanji you’re learning, stroke by stroke',
    ok: () => DATA.mode === 'full' && K.filter(k => progress[k.id]).length >= 3, act: "App.todayWrite()" },
  { id: 'conj', need: 10, title: 'Conjugation', jp: '活', sub: () => 'Ten quick verb and adjective forms',
    ok: () => V.filter(x => x.pos === 'verb' && progress[x.id]).length >= 5, act: "App.go('conj')" }
];
/** today's skill: the one practised least recently (never first), the same all day */
function todaySkill() {
  const d = today(), av = SKILLS.filter(s => s.ok()); if (!av.length) return null;
  const saved = store.get('todaySkill', null);
  if (saved && saved.d === d) { const s = av.find(x => x.id === saved.id); if (s) return s; }
  const last = store.get('skillLast', {}), start = hashStr(d) % av.length;
  const order = av.map((s, i) => ({ s, k: last[s.id] || '', r: (i - start + av.length) % av.length }))
    .sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : a.r - b.r);
  const pickS = order[0].s; store.set('todaySkill', { d, id: pickS.id });
  return pickS;
}
/** the stop for Home's daily line */
function todayStop() {
  const s = todaySkill(); if (!s) return null;
  const done = flagged('skill:' + s.id), n = Math.min(skillCount(s.id), s.need);
  return { title: `Practice: ${s.title}`, sub: done ? 'Done for today' : s.need > 1 && n ? `${s.sub()} · ${n} of ${s.need} done` : s.sub(), done, go: 'Start', act: s.act };
}
const todayApp = {
  todayRead() {
    const lv = userLevel(), st = readStats(), list = READ.filter(p => p.lv === lv);
    const p = list.find(x => !st[x.id]) || list.slice().sort((a, b) => ((st[a.id] || {}).best || 0) / a.q.length - ((st[b.id] || {}).best || 0) / b.q.length)[0];
    App.go('read'); if (p) App.rdOpen(p.id);
  },
  todayListen() {
    const ws = shuffle(listenWords()).slice(0, 10), lv = LV.indexOf(userLevel());
    // wrong options come from all words up to your level, so there are always enough that sound different
    const pool = V.filter(x => LV.indexOf(x.lvl) <= lv);
    S.session = { mode: 'test', kind: 'vocab', pool, queue: ws, idx: 0, dir: 'hear', results: [], back: { view: 'home' } };
    nextQ();
  },
  todayWrite() {
    const st = writeStats(), mine = K.filter(k => progress[k.id]);
    mine.sort((a, b) => ((st[a.k] || {}).t || 0) - ((st[b.k] || {}).t || 0));
    S.wrBack = 'home'; writeStart(mine.slice(0, 3).map(k => k.k), 'Today’s writing');
  }
};
Object.assign(App, todayApp);
