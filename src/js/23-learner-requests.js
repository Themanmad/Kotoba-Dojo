/* =====================================================================
   WHAT LEARNERS ASK FOR (app reviews and forums): type the answer instead of picking it,
   forgive typos, say when you typed the reading instead of the meaning, drill the items you
   keep missing, undo a misclick, skip what you already know, pause for a holiday,
   slow the audio down, and install the app on your phone.
   ===================================================================== */

/* ---------- typed answers ---------- */
const normEn = s => String(s).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[‘’]/g, "'").replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:to|a|an|the) /, '');
function editDist(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const typeGlosses = x => [...new Set((x.kind === 'kanji' ? x.mean : [...(x.senses || []).flatMap(s => s.g || []), ...String(x.m || '').split(/[;,]/)]).map(normEn).filter(Boolean))];
const typeReads = x => [...new Set(x.kind === 'kanji'
  ? [...x.on, ...x.kun].flatMap(r => { const h = kata2hira(String(r).replace(/-/g, '')); return [h.replace(/\./g, ''), h.split('.')[0]]; })
  : [kata2hira(x.r)])].filter(Boolean);
const hiraNorm = s => kata2hira(String(s)).replace(/[\s。、．.]/g, '');
function makeTypeQ(kind, item) {
  const hasKanji = kind === 'kanji' || [...item.w].some(isK);
  const mode = kind === 'kanji' ? pick(['mean', 'mean', 'read']) : hasKanji ? pick(['read', 'mean']) : 'mean';
  const isRead = mode === 'read';
  const prompt = kind === 'kanji' ? `<div class="pkanji jp">${item.k}</div>` : isRead ? `<div class="pword jp">${esc(item.w)}</div>` : `<div class="pword jp">${ruby(item.f)}</div>`;
  const say = kind === 'kanji' ? '' : wordSay(item.r), au = kind === 'kanji' ? null : item.au;
  return { item, dir: 'type', type: mode, jp: !isRead, say, au, prompt, grid: false, opts: [], msg: '', hinted: false,
    meta: `<span class="tag lv">${lvName(item.lvl)}</span><span class="tag">⌨︎ type it</span>`,
    hint: isRead ? (kind === 'kanji' ? 'Type a reading of this kanji (on or kun)' : 'Type the reading in hiragana') : 'Type the meaning in English' };
}
/** → { ok, typo, hint } */
function typeCheck(q, raw) {
  const x = q.item, v0 = String(raw || '').trim(); if (!v0) return { hint: 'Type something first.' };
  if (q.type === 'read') {
    const v = hiraNorm(romaToKana(v0, true)), acc = typeReads(x);
    if (acc.includes(v)) return { ok: true };
    if (/[a-z]/i.test(v) && typeGlosses(x).includes(normEn(v0))) return { hint: 'That’s the meaning. We’re asking for the reading: type it in romaji or kana.' };
    if (x.kind === 'vocab' && v === hiraNorm(x.w)) return { ok: true };
    if (v.length >= 2 && acc.some(a => editDist(a, v) === 1)) return { hint: 'Close! One sound is off. Check small っ ゃ ゅ ょ and long vowels.' };
    if (x.kind === 'vocab' && x.r.length >= 2 && hiraNorm(x.r).replace(/ー/g, '') === v.replace(/ー/g, '')) return { ok: true };
    return { ok: false };
  }
  if (/[぀-ヿ]/.test(v0) && typeReads(x).includes(hiraNorm(v0))) return { hint: 'That’s the reading. We’re asking for the meaning in English.' };
  const v = normEn(v0), acc = typeGlosses(x);
  if (!v) return { hint: 'Type the meaning in English.' };
  if (acc.includes(v)) return { ok: true };
  // forgive a slip: one letter in a short word, two in a long one
  const best = acc.map(a => [editDist(a, v), a]).sort((a, b) => a[0] - b[0])[0];
  if (best && v.length >= 4 && best[0] <= (v.length >= 8 ? 2 : 1)) return { ok: true, typo: best[1] };
  // a whole gloss that contains what they typed as a word ("go" for "go out" is not enough; "television" for "television set" is)
  if (v.length >= 4 && acc.some(a => (' ' + a + ' ').includes(' ' + v + ' ') && v.length >= a.length * 0.6)) return { ok: true };
  return { ok: false };
}
function typeForm(q) {
  const read = q.type === 'read';
  return `<form class="tform" onsubmit="event.preventDefault();App.typeAns(this.a.value)" autocomplete="off">
    ${q.msg ? `<div class="tmsg" role="status">${esc(q.msg)}</div>` : ''}
    <input id="typeIn" name="a" ${read ? 'lang="ja" placeholder="Type romaji or kana: taberu"' : 'lang="en" placeholder="Meaning in English"'} autocapitalize="off" autocorrect="off" spellcheck="false" oninput="App.typeIn(this)" enterkeyhint="done">
    ${read ? '<div class="tprev jp" id="typePrev" aria-live="polite">&nbsp;</div>' : ''}
    <div class="trow"><button class="btn">Check</button><button type="button" class="btn line" onclick="App.typeAns(null)">I don’t know</button></div></form>`;
}
const typeFocus = () => setTimeout(() => { const i = $('#typeIn'); if (i) i.focus(); }, 30);

/* ---------- trouble spots: the items you keep missing ---------- */
function troubleItems() {
  return Object.entries(progress).filter(([, p]) => (p.w || 0) >= 3 && (p.w || 0) >= (p.c || 0) * 0.5 + 1)
    .map(([id, p]) => [itemById(id), (p.w || 0) - (p.c || 0) * 0.4]).filter(r => r[0] && r[0].kind !== 'kana')
    .sort((a, b) => b[1] - a[1]).slice(0, 40).map(r => r[0]);
}
function troubleCard() {
  const t = troubleItems(); if (t.length < 2) return '';
  const by = k => t.filter(x => x.kind === k), kinds = [['vocab', 'words'], ['kanji', 'kanji'], ['grammar', 'grammar']].filter(([k]) => by(k).length >= 2);
  return `<div class="card trouble"><div class="tr-h"><b>Trouble spots</b><span>${t.length} item${t.length > 1 ? 's' : ''} you keep missing. A short drill fixes most of them.</span></div>
    <div class="tr-items">${t.slice(0, 10).map(x => `<button class="tr-i jp" data-open="${esc(x.id)}" title="${esc(x.m || '')}">${esc(itemLabel(x))}</button>`).join('')}${t.length > 10 ? `<span class="tr-more">+${t.length - 10}</span>` : ''}</div>
    <div class="btnrow">${kinds.map(([k, l]) => `<button class="btn sec sm" onclick="App.troubleDrill('${k}')">Drill ${by(k).length} ${l}</button>`).join('')}</div></div>`;
}

/* ---------- vacation mode ---------- */
function vacEnd() {
  const gap = Date.now() - settings.vac;
  if (gap > 0) for (const p of Object.values(progress)) { if (p.d) p.d += gap; if (p.t) p.t += gap; if (p.lr) p.lr += gap; }   // everything waits for you: nothing piles up, and memory isn't counted as fading while away
  const d = new Date(settings.vac);
  for (let i = 0; i < 366; i++) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; if (k >= today()) break; if (!actLog[k]) actLog[k] = { r: 0, vac: 1 }; d.setDate(d.getDate() + 1); }
  store.set('log', actLog); save(); settings.vac = 0; saveSettings();
}
const vacBanner = () => settings.vac ? `<div class="banner vac">🏖 <b>Vacation mode</b> Reviews are paused and your streak is safe. <button class="btn sm" onclick="App.vacation(false)">I’m back</button></div>` : '';

/* ---------- installable app ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

const extrasApp = {
  // romaji stays as typed (so we can tell when the meaning was typed instead); the kana it makes shows underneath
  typeIn(el) { const q = S.session && S.session.q, pv = $('#typePrev'); if (q && q.type === 'read' && pv) pv.textContent = el.value.trim() ? '→ ' + romaToKana(el.value, true) : '\u00a0'; },
  typeAns(raw) {
    const s = S.session, q = s && s.q; if (!q || !q.type || s.answered) return;
    const r = raw == null ? { ok: false } : typeCheck(q, raw);
    if (r.hint && !(q.hinted && /Close/.test(r.hint))) { q.msg = r.hint; q.hinted = true; render(); const i = $('#typeIn'); if (i) { i.value = raw || ''; typeFocus(); } return; }
    const right = q.dict ? `<span class="jp">${ruby(q.item.f)}</span> · ${esc(q.item.m)}` : q.type === 'read' ? (q.item.kind === 'kanji' ? esc(kRead(q.item)) : `<span class="jp">${esc(q.item.r)}</span>`) : esc(q.item.m);
    if (r.ok) q.opts = [{ html: `${right}${r.typo ? ` <small class="ttypo">Accepted. Watch the spelling: you typed “${esc(raw)}”</small>` : ''}`, ok: true }];
    else q.opts = [{ html: right, ok: true }, { html: raw == null ? 'I didn’t know' : `<span${q.type === 'read' ? ' class="jp"' : ''}>${esc(q.type === 'read' ? romaToKana(raw, true) : raw)}</span>`, ok: false }];
    App.answer(r.ok ? 0 : 1);
  },
  undoAnswer() {
    const s = S.session, u = s && s.undo; if (!u || !s.answered) return;
    const id = s.q.item.id;
    if (u.prev) progress[id] = u.prev; else delete progress[id]; save();
    Object.assign(game, u.game); saveGame();
    s.streak = u.streak; s.seen = u.seen; s.correct = u.correct;
    if (s.first) { if (u.hadFirst) s.first.set(id, u.firstVal); else s.first.delete(id); }
    if (s.retries) { if (u.retries) s.retries.set(id, u.retries); else s.retries.delete(id); }
    if (s.deck && s.deck.length > u.deckLen) s.deck.splice(Math.min(u.deckLen, s.idx + 4), 1);
    if (s.results) s.results.length = u.resLen;
    s.answered = false; s.chosen = -1; s.undo = null;
    if (s.q.type) { s.q.opts = []; s.q.msg = ''; s.q.hinted = false; }
    render(); if (s.q.type) typeFocus();
  },
  knowIt() {
    const s = S.session; if (!s || s.answered) return;
    const x = s.q.item, now = Date.now();
    progress[x.id] = { c: 1, w: 0, b: KNOWN_BOX, d: now + IV[KNOWN_BOX] * DAY, t: now, l: x.lvl }; save();
    if (s.first) s.first.set(x.id, true);
    if (s.deck) for (let i = s.deck.length - 1; i > s.idx; i--) if (s.deck[i] === x) s.deck.splice(i, 1);
    toast(`Marked as known: ${itemLabel(x)}`); next();
  },
  troubleDrill(kind) { const t = troubleItems().filter(x => x.kind === kind); if (t.length >= 2) startLearn(kind, null, t); },
  vacation(on) {
    if (on) { settings.vac = Date.now(); saveSettings(); toast('Vacation mode on: reviews are paused'); }
    else if (settings.vac) { vacEnd(); toast('Welcome back! Your reviews pick up where you left off.'); }
    render();
  },
  audioRate(v) { settings.audioRate = +v; saveSettings(); render(); }
};

