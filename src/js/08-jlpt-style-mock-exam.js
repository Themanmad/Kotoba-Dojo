/* =====================================================================
   JLPT-STYLE MOCK EXAM
   Question types follow the JLPT papers; questions are generated from the
   app's own dictionary, grammar and Tatoeba data (official papers are the
   Japan Foundation's copyright). Pass marks are the official ones from
   jlpt.jp. Reading (読解) uses the app's own graded passages (READ).
   ===================================================================== */
const EXAM_SECTIONS = [
  { key: 'kr', sec: 'vocab', jp: '漢字読み', en: 'Kanji reading', instr: '＿＿の ことばは ひらがなで どう かきますか。', instrEn: 'How is the underlined word read?' },
  { key: 'hy', sec: 'vocab', jp: '表記', en: 'Writing', instr: '＿＿の ことばは どう かきますか。', instrEn: 'How is the underlined word written?' },
  { key: 'bm', sec: 'vocab', jp: '文脈規定', en: 'Word in context', instr: '（　　）に なにを いれますか。', instrEn: 'Which word fits the blank?' },
  { key: 'ik', sec: 'vocab', jp: '言い換え類義', en: 'Closest meaning', instr: '＿＿の ことばに いちばん ちかい いみは どれですか。', instrEn: 'Which meaning is closest to the underlined word?' },
  { key: 'gf', sec: 'grammar', jp: '文法形式の判断', en: 'Grammar form', instr: '（　　）に 何を 入れますか。', instrEn: 'Which grammar fits the blank?' },
  { key: 'ord', sec: 'grammar', jp: '文の組み立て', en: 'Sentence order', instr: '★ に 入る ものは どれですか。', instrEn: 'Put the four parts in order. Which one goes in ★?' },
  { key: 'rd', sec: 'read', jp: '読解', en: 'Reading', instr: 'ぶんしょうを 読んで、しつもんに こたえて ください。', instrEn: 'Read the passage, then answer the question.' },
  { key: 'li', sec: 'listen', jp: '聴解', en: 'Listening', instr: '音声を 聞いて、正しい いみを えらんで ください。', instrEn: 'Listen, then choose the correct meaning.' }
];
const EXAM_COUNTS = {
  N5: { kr: 7, hy: 5, bm: 6, ik: 3, gf: 9, ord: 4, rd: 4, li: 8 },
  N4: { kr: 7, hy: 5, bm: 7, ik: 4, gf: 10, ord: 4, rd: 4, li: 8 },
  N3: { kr: 8, hy: 6, bm: 8, ik: 5, gf: 10, ord: 5, rd: 5, li: 9 },
  N2: { kr: 5, hy: 5, bm: 7, ik: 5, gf: 10, ord: 5, rd: 5, li: 9 },
  N1: { kr: 6, hy: 0, bm: 7, ik: 6, gf: 10, ord: 5, rd: 4, li: 9 }
};
/* official pass marks (jlpt.jp): N4/N5 language knowledge+reading 0–120 & listening 0–60; N1–N3 three sections of 0–60 */
const PASS = { N1: { total: 100, two: false }, N2: { total: 90, two: false }, N3: { total: 95, two: false }, N4: { total: 90, two: true }, N5: { total: 80, two: true } };
const SEC_PER_Q = 55;

const hiraOnly = s => /^[぀-ゟ]+$/.test(s);
const exPlain = x => { const m = []; for (const e of x.ex || []) { const p = plain(e.j); if (x.w && p.includes(x.w)) m.push({ p, e, m: exMarkup(e) }); } return m.length ? pick(m) : null; };
/* Rotation: remember when each item was last asked, and favour ones you haven't seen recently. */
const SEEN_KEY = 'seenQ';
function freshFirst(arr, ns) {
  const seen = store.get(SEEN_KEY, {});
  return shuffle(arr).map(x => [x, seen[ns + '|' + x.id] || 0]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
}
function markSeen(pairs) {
  const seen = store.get(SEEN_KEY, {}), now = Date.now();
  pairs.forEach(([ns, id]) => { seen[ns + '|' + id] = now; });
  const keys = Object.keys(seen);
  if (keys.length > 4000) keys.sort((a, b) => seen[a] - seen[b]).slice(0, keys.length - 4000).forEach(k => delete seen[k]);
  store.set(SEEN_KEY, seen);
}
const underline = (p, w, shown) => { const i = p.indexOf(w); return esc(p.slice(0, i)) + `<u>${esc(shown ?? w)}</u>` + esc(p.slice(i + w.length)); };
const DAK = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
const UNDAK = Object.fromEntries(Object.entries(DAK).map(([a, b]) => [b, a]));
/** Plausible wrong readings, the way JLPT distractors work: voicing, small っ, long vowels. */
function mutateReading(r) {
  const out = new Set(), ch = [...r];
  ch.forEach((c, i) => { const d = DAK[c] || UNDAK[c]; if (d && i < 3) { const a = ch.slice(); a[i] = d; out.add(a.join('')); } });
  if (r.includes('っ')) out.add(r.replace('っ', ''));
  else for (let i = 1; i < ch.length; i++) if ('かきくけこさしすせそたちつてとぱぴぷぺぽ'.includes(ch[i])) { out.add(ch.slice(0, i).join('') + 'っ' + ch.slice(i).join('')); break; }
  if (/ょう|ゅう/.test(r)) out.add(r.replace(/(ょ|ゅ)う/, '$1'));
  else if (/[ょゅ]/.test(r)) out.add(r.replace(/(ょ|ゅ)/, '$1う'));
  if (/[こそとのほもよろごぞどぼぽ]う/.test(r)) out.add(r.replace(/([こそとのほもよろごぞどぼぽ])う/, '$1'));
  else { const m = /[こそとのほもろごぞどぼぽ](?!う)/.exec(r); if (m) out.add(r.slice(0, m.index + 1) + 'う' + r.slice(m.index + 1)); }
  if (/ょ/.test(r)) out.add(r.replace('ょ', 'ゅ')); else if (/ゅ/.test(r)) out.add(r.replace('ゅ', 'ょ'));
  out.delete(r);
  return shuffle([...out]);
}
function fillFour(correct, wrong) {
  const opts = [correct], seen = new Set([correct]);
  for (const w of wrong) { if (opts.length >= 4) break; if (w && !seen.has(w)) { seen.add(w); opts.push(w); } }
  if (opts.length < 4) return null;
  const sh = shuffle(opts); return { opts: sh, ans: sh.indexOf(correct) };
}
const EXAM_GEN = {
  kr(x, l, pool) {
    if (!x.w || ![...x.w].some(isK) || !hiraOnly(x.r)) return null;
    const s = exPlain(x);
    const near = pool.filter(y => y !== x && hiraOnly(y.r) && [...y.w].some(c => isK(c) && x.w.includes(c))).map(y => y.r);
    const len = pool.filter(y => y !== x && hiraOnly(y.r) && Math.abs(y.r.length - x.r.length) <= 1).map(y => y.r);
    const f = fillFour(x.r, [...mutateReading(x.r), ...shuffle(near), ...shuffle(len)]); if (!f) return null;
    return { item: x, prompt: s ? `<div class="psent jp">${sentHtml(s.m, s.p.indexOf(x.w), x.w.length, `<u>${esc(x.w)}</u>`)}</div>` : `<div class="pword jp"><u>${esc(x.w)}</u></div>`, opts: f.opts.map(o => `<span class="jp">${esc(o)}</span>`), ans: f.ans, raw: f.opts, fullM: s && s.m };
  },
  hy(x, l, pool) {
    if (!x.w || ![...x.w].some(isK) || !hiraOnly(x.r)) return null;
    const wrong = [];
    [...x.w].forEach((c, i) => {
      const k = KMAP[c]; if (!k) return;
      const alts = K.filter(o => o !== k && (o.on.some(r => k.on.includes(r)) || o.kun.some(r => k.kun.length && r.split('.')[0] === k.kun[0].split('.')[0])));
      for (const o of shuffle(alts).slice(0, 2)) { const a = [...x.w]; a[i] = o.k; wrong.push(a.join('')); }
    });
    const similar = pool.filter(y => y !== x && [...y.w].some(isK) && y.w.length === x.w.length).map(y => y.w);
    const f = fillFour(x.w, [...shuffle(wrong), ...shuffle(similar)].filter(w => !VMAP['v:' + w + '|' + x.r])); if (!f) return null;
    const s = exPlain(x);
    return { item: x, prompt: s ? `<div class="psent jp">${sentHtml(s.m, s.p.indexOf(x.w), x.w.length, `<u>${esc(x.r)}</u>`)}</div>` : `<div class="pword jp"><u>${esc(x.r)}</u></div>`, opts: f.opts.map(o => `<span class="jp">${esc(o)}</span>`), ans: f.ans, raw: f.opts, fullM: s && s.m };
  },
  bm(x, l, pool) {
    const s = exPlain(x); if (!s) return null;
    const cand = shuffle(pool.filter(y => y !== x && y.pos === x.pos && y.w && !s.p.includes(y.w) && !vocabOverlap(x, y)));
    const f = fillFour(x.w, cand.map(y => y.w)); if (!f) return null;
    const fOf = w => (w === x.w ? x : cand.find(y => y.w === w) || {}).f || w;
    return { item: x, prompt: `<div class="psent jp">${sentHtml(s.m, s.p.indexOf(x.w), x.w.length, '（　　）')}</div>`, opts: f.opts.map(o => `<span class="jp cjp">${ruby(fOf(o))}</span>`), ans: f.ans, raw: f.opts, fullM: s.m };
  },
  ik(x, l, pool) {
    if (!x.m) return null;
    const s = exPlain(x);
    const wrong = shuffle(pool.filter(y => y !== x && y.pos === x.pos && !vocabOverlap(x, y))).map(y => y.m);
    const f = fillFour(x.m, wrong); if (!f) return null;
    return { item: x, prompt: s ? `<div class="psent jp">${sentHtml(s.m, s.p.indexOf(x.w), x.w.length, h => `<u>${h}</u>`)}</div>` : `<div class="pword jp"><u>${ruby(x.f)}</u></div>`, opts: f.opts.map(esc), ans: f.ans, raw: f.opts, fullM: s && s.m };
  },
  gf(g, l, pool) {
    const b = gBlank(g); if (!b) return null;
    const f = fillFour(b.v.v, gFillOpts(g, b.v, pool)); if (!f) return null;
    return { item: g, prompt: `<div class="psent jp">${sentHtml(exMarkup(b.e), b.i, b.v.v.length, '（　　）')}</div>`, opts: f.opts.map(o => `<span class="jp">${esc(o)}</span>`), ans: f.ans, raw: f.opts, fullM: exMarkup(b.e) };
  },
  ord(x) {
    for (const e of shuffle(x.ex || [])) {
      const c = chunkSentence(plain(e.j)); if (!c || c.parts.length < 4) continue;
      const start = Math.floor(Math.random() * (c.parts.length - 3));
      const four = c.parts.slice(start, start + 4);
      if (new Set(four).size < 4) continue;
      const star = four[2], sh = shuffle(four);
      const m = exMarkup(e), off = []; let pos = 0; c.parts.forEach(pt => { off.push(pos); pos += pt.length; });
      const a = off[start], len = four.join('').length;
      const chunkHtml = o => { const k = c.parts.indexOf(o, start); return rangeHtml(m, off[k], off[k] + o.length); };
      return { item: x, prompt: `<div class="psent jp">${sentHtml(m, a, len, '<span class="slot"></span><span class="slot"></span><span class="slot star">★</span><span class="slot"></span>')}</div>${e.e ? `<div class="proma">${esc(e.e)}</div>` : ''}`,
        opts: sh.map(o => `<span class="jp cjp">${chunkHtml(o)}</span>`), ans: sh.indexOf(star), raw: sh, full: plain(e.j), fullM: m };
    }
    return null;
  },
  li(x, l, pool) {
    const es = (x.ex || []).filter(e => e.e && plain(e.j).length <= 40); if (!es.length) return null;
    const native = es.filter(e => e.dau || hasRec(e.au)); if (!native.length) return null;
    const e = pick(native), au = e.dau || 's' + e.au;
    const wrong = shuffle(pool.flatMap(y => (y.ex || []).map(z => z.e)).filter(t => t && t !== e.e));
    const f = fillFour(e.e, wrong); if (!f) return null;
    return { item: x, fullM: exMarkup(e), say: plain(e.j), au, prompt: `<button class="listen" data-audio="${au}">🔊 Play</button><div class="proma">${e.dau ? 'Recording from your deck' : `Native recording by ${esc(e.by || 'a Tatoeba member')}`} · tap to replay as often as you like.</div>`, opts: f.opts.map(esc), ans: f.ans, raw: f.opts, full: plain(e.j) };
  }
};
/** Split a sentence into JLPT-style chunks (文節): each chunk is a content word plus the
    particles / endings after it. Content words are found by longest match against the word list. */
const FUNC = ['なければなりません', 'なければならない', 'なければ', 'ていません', 'ています', 'ている', 'てください', 'ないでください', 'ください', 'ながら', 'かもしれません', 'かもしれない', 'ことがあります', 'ことがある', 'つもり', 'ければ', 'ではありません', 'じゃありません', 'ませんでした', 'ましょう', 'でした', 'ました', 'ません', 'ます', 'です', 'でしょう', 'だった', 'から', 'まで', 'より', 'ので', 'のに', 'けど', 'たい', 'ない', 'たら', 'ても', 'では', 'には', 'とは', 'へは', 'だ', 'は', 'が', 'を', 'に', 'で', 'と', 'へ', 'も', 'の', 'や', 'か', 'ね', 'よ', 'て', 'た', 'ば', '、'].sort((a, b) => b.length - a.length);
let SEGIDX = null;
function segIndex() {
  if (SEGIDX && SEGIDX.n === V.length) return SEGIDX;
  const words = new Set(); let max = 1;
  for (const x of V) for (const w of [x.w, x.r]) if (w && (w.length >= 2 || [...w].some(isK))) { words.add(w); max = Math.max(max, w.length); }
  return (SEGIDX = { words, max: Math.min(max, 10), n: V.length });
}
function chunkSentence(p) {
  const m = /[。！？!?]+$/.exec(p); const end = m ? m[0] : ''; const body = end ? p.slice(0, -end.length) : p;
  const { words, max } = segIndex(), toks = [];
  for (let i = 0; i < body.length;) {
    let t = null;
    for (let L = Math.min(max, body.length - i); L >= 1 && !t; L--) { const w = body.slice(i, i + L); if (words.has(w)) t = { t: w, f: false }; }
    if (!t) { const f = FUNC.find(f => body.startsWith(f, i)); if (f && toks.length) t = { t: f, f: true }; }
    if (!t) t = { t: body[i], f: false, u: true };
    const last = toks[toks.length - 1];
    if (t.u && last && last.u) last.t += t.t; else toks.push(t);
    i += t.t.length;
  }
  const parts = []; let cur = '', prevFunc = false;
  for (const t of toks) {
    if (!t.f && cur && (prevFunc || /^[\u30a0-\u30ff]/.test(t.t))) { parts.push(cur); cur = ''; }
    cur += t.t; prevFunc = t.f;
  }
  if (cur) parts.push(cur);
  return { parts: parts.filter(Boolean), end };
}
/** How many questions of each type. Full exam = JLPT-like mix; a section = n questions spread over its types. */
function examCounts(l, scope, n) {
  const base = EXAM_COUNTS[l];
  if (!scope || scope.type === 'full') return base;
  const keys = scope.type === 'key' ? [scope.id] : EXAM_SECTIONS.filter(x => x.sec === scope.id && base[x.key]).map(x => x.key);
  const tot = keys.reduce((a, k) => a + (base[k] || 1), 0), out = {};
  let left = n;
  keys.forEach((k, i) => { const c = i === keys.length - 1 ? left : Math.max(1, Math.round(n * (base[k] || 1) / tot)); out[k] = c; left -= c; });
  return out;
}
function scopeLabel(scope) {
  if (!scope || scope.type === 'full') return 'Full exam';
  if (scope.type === 'part') return { vocab: '文字・語彙 Vocabulary', grammar: '文法 Grammar', read: '読解 Reading', listen: '聴解 Listening' }[scope.id];
  const sec = EXAM_SECTIONS.find(x => x.key === scope.id); return `${sec.jp} ${sec.en}`;
}
function buildExam(l, scope, n) {
  const counts = examCounts(l, scope, n), words = (DATA.vocab[l] || []).filter(x => x.w), gram = G.filter(g => g.lvl === l);
  const qs = [], used = new Set();
  EXAM_SECTIONS.forEach((sec, si) => {
    let k = counts[sec.key] || 0; if (!k) return;
    if (sec.key === 'rd') { readExamQs(l, k).forEach(q => { q.key = 'rd'; q.si = si; qs.push(q); }); return; }
    const cands = sec.key === 'ord' ? freshFirst(gram, 'ord').concat(freshFirst(words, 'ord')) : freshFirst(sec.sec === 'grammar' ? gram : words, sec.key);
    const pool = sec.key === 'gf' ? (gram.length >= 6 ? gram : G) : words;
    for (const it of cands) {
      if (k <= 0) break;
      const tag = it.id + '|' + sec.sec; if (used.has(tag)) continue;
      const q = EXAM_GEN[sec.key](it, l, pool);
      if (q) { q.key = sec.key; q.si = si; qs.push(q); used.add(tag); k--; }
    }
  });
  markSeen(qs.map(q => [q.key, q.item.id]));
  return qs;
}
const fmtClock = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
let examTimer = null;
function stopExamTimer() { if (examTimer) { clearInterval(examTimer); examTimer = null; } }
async function startExam(scope) {
  const l = S.examLv; scope = scope || { type: 'full' };
  try { await Promise.all([load('vocab', l), load('grammar', l)]); } catch (e) {}
  const qs = buildExam(l, scope, S.examN);
  if ((scope.id === 'listen' || scope.id === 'li') && qs.length < 3) return toast(`No native ${l} sentence recordings yet — listening practice appears once the full data is built`);
  if (qs.length < (scope.type === 'full' ? 10 : 3)) return toast(`Not enough ${l} data for this ${scope.type === 'full' ? 'exam' : 'section'} yet`);
  S.session = { mode: 'exam', level: l, scope, qs, idx: 0, ans: qs.map(() => -1), start: Date.now(), limit: (qs.length * SEC_PER_Q + qs.filter(q => q.key === 'rd').length * 60) * 1000, done: false,
    skippedListening: scope.type === 'full' && !qs.some(q => q.key === 'li') };
  stopExamTimer();
  examTimer = setInterval(() => {
    const s = S.session; if (!s || s.mode !== 'exam' || s.done) return stopExamTimer();
    const left = s.limit - (Date.now() - s.start), el = $('#etimer');
    if (el) { el.textContent = '⏱ ' + fmtClock(left); el.classList.toggle('low', left < 120e3); }
    if (left <= 0) { toast("Time's up!"); finishExam(true); }
  }, 1000);
  render(); window.scrollTo(0, 0);
  examAutoplay();
}
function examAutoplay() { const s = S.session; const q = s && s.qs[s.idx]; if (q && q.key === 'li' && q.say) setTimeout(() => playAudio(q.au), 300); }
function examPick(i) {
  const s = S.session; if (!s || s.mode !== 'exam' || s.done) return;
  s.ans[s.idx] = i; render();
  if (s.idx < s.qs.length - 1) setTimeout(() => { if (S.session === s && !s.done && s.ans[s.idx] === i) { s.idx++; render(); window.scrollTo(0, 0); examAutoplay(); } }, 280);
}
function examGo(d) { const s = S.session; if (!s || s.mode !== 'exam' || s.done) return; s.idx = Math.max(0, Math.min(s.qs.length - 1, s.idx + d)); render(); window.scrollTo(0, 0); examAutoplay(); }
function examJump(i) { const s = S.session; if (!s || s.mode !== 'exam' || s.done) return; s.idx = i; render(); window.scrollTo(0, 0); examAutoplay(); }
function finishExam(force) {
  const s = S.session; if (!s || s.mode !== 'exam' || s.done) return;
  const blank = s.ans.filter(a => a < 0).length;
  if (!force && blank && !confirm(`${blank} question${blank === 1 ? ' is' : 's are'} unanswered. Finish anyway?`)) return;
  stopExamTimer();
  s.done = true; s.time = Date.now() - s.start;
  rec.silent = true; s.qs.forEach((q, i) => { if (!q.noRec) rec(q.item, s.ans[i] === q.ans); }); rec.silent = false;   // reading questions aren't flashcards
  { const okN = s.qs.filter((q, i) => s.ans[i] === q.ans).length; addXP(okN * 5 + 100); checkBadges(); }
  const full = !s.scope || s.scope.type === 'full', ok = s.qs.filter((q, i) => s.ans[i] === q.ans).length;
  s.result = full ? scoreExam(s) : null;
  const hist = store.get('exams', []);
  hist.unshift(full ? { d: today(), l: s.level, total: s.result.total, max: s.result.max, need: s.result.need, pass: s.result.pass }
    : { d: today(), l: s.level, part: scopeLabel(s.scope), ok, n: s.qs.length });
  store.set('exams', hist.slice(0, 40));
  render(); window.scrollTo(0, 0);
}
function scoreExam(s) {
  const by = { vocab: [0, 0], grammar: [0, 0], read: [0, 0], listen: [0, 0] };
  s.qs.forEach((q, i) => { const sec = EXAM_SECTIONS[q.si].sec; by[sec][1]++; if (s.ans[i] === q.ans) by[sec][0]++; });
  const P = PASS[s.level], pct = ([a, b]) => b ? a / b : 0;
  const hasLi = by.listen[1] > 0, hasRd = by.read[1] > 0;
  if (P.two) {
    // N4/N5: language knowledge and reading are one section (0–120)
    const lkRaw = [by.vocab[0] + by.grammar[0] + by.read[0], by.vocab[1] + by.grammar[1] + by.read[1]];
    const lk = Math.round(pct(lkRaw) * 120), li = hasLi ? Math.round(pct(by.listen) * 60) : null;
    const max = 120 + (hasLi ? 60 : 0), need = hasLi ? P.total : Math.round(P.total * 120 / 180);
    const total = lk + (li || 0);
    return { by, rows: [[hasRd ? 'Language knowledge (vocab/grammar)・Reading' : 'Language knowledge (vocab/grammar)', lk, 120, 38], ...(hasLi ? [['Listening', li, 60, 19]] : [])], total, max, need, readingSkipped: !hasRd,
      pass: total >= need && lk >= 38 && (!hasLi || li >= 19) };
  }
  // N1–N3: three sections of 0–60
  const lkRaw = [by.vocab[0] + by.grammar[0], by.vocab[1] + by.grammar[1]];
  const lk = Math.round(pct(lkRaw) * 60), rd = hasRd ? Math.round(pct(by.read) * 60) : null, li = hasLi ? Math.round(pct(by.listen) * 60) : null;
  const max = 60 + (hasRd ? 60 : 0) + (hasLi ? 60 : 0), need = Math.round(P.total * max / 180);
  const total = lk + (rd || 0) + (li || 0);
  return { by, rows: [['Language knowledge (vocab/grammar)', lk, 60, 19], ...(hasRd ? [['Reading', rd, 60, 19]] : []), ...(hasLi ? [['Listening', li, 60, 19]] : [])], total, max, need, readingSkipped: !hasRd,
    pass: total >= need && lk >= 19 && (!hasRd || rd >= 19) && (!hasLi || li >= 19) };
}
function vExam() {
  const lv = LV.filter(l => levelTotal('vocab', l) >= 30);
  if (!lv.includes(S.examLv)) S.examLv = lv.includes(userLevel()) ? userLevel() : (lv[0] || 'N5');
  const c = EXAM_COUNTS[S.examLv], n = Object.values(c).reduce((a, b) => a + b, 0);
  const hist = store.get('exams', []).slice(0, 8);
  const secBtn = (type, id, title, sub, strong) => `<button class="secrow ${strong ? 'part' : ''}" onclick="App.examSection('${type}','${id}')"><span><b class="jp">${title}</b><span>${sub}</span></span><span class="go">Practise ›</span></button>`;
  const parts = [['vocab', '文字・語彙', 'Vocabulary'], ['grammar', '文法', 'Grammar'], ['read', '読解', 'Reading'], ['listen', '聴解', 'Listening']];
  const body = S.examMode === 'full' ? `
  <div class="card" style="margin-top:14px">
    <div class="exparts">${EXAM_SECTIONS.filter(x => c[x.key]).map((x, i) => `<div><span class="jp">問題${i + 1} ${x.jp}</span><span class="muted">${x.en} · ${c[x.key]}</span></div>`).join('')}</div>
    <p class="note">About ${n} questions · ${Math.round(n * SEC_PER_Q / 60)} minutes · pass mark ${PASS[S.examLv].total}/180${PASS[S.examLv].two ? ' (sections: 38/120 and 19/60)' : ' (19/60 in every section)'}</p>
    <button class="btn" onclick="App.startExam()">Start ${S.examLv} mock exam</button>
  </div>` : `
  <div class="label">Questions per practice</div>${chips([[10, '10'], [20, '20'], [30, '30']], S.examN, 'App.examNSet')}
  <div class="seclist">${parts.map(([id, jp, en]) => {
    const keys = EXAM_SECTIONS.filter(x => x.sec === id && c[x.key]);
    return secBtn('part', id, `${jp}`, `${en} · all question types`, true) + (keys.length > 1 ? keys.map(x => secBtn('key', x.key, x.jp, x.en)).join('') : '');
  }).join('')}</div>`;
  return `<h1>Mock exam</h1><p class="sub">JLPT-style practice built from your dictionary, grammar and example sentences. Questions rotate, so you'll keep seeing new ones.</p>
  <div class="label">Level</div>${chips(lv.map(l => [l, l]), S.examLv, 'App.examLvSet')}
  <div style="margin-top:14px">${seg([['full', 'Full exam'], ['section', 'By section']], S.examMode, 'App.examModeSet')}</div>
  ${body}
  <p class="note">Practice exam, not an official JLPT paper, so scores are estimates. Reading (読解) uses short passages written for this app. Listening uses native-speaker recordings only.</p>
  ${hist.length ? `<div class="label">Recent attempts</div><div class="card lvrows">${hist.map(h => h.part
    ? `<div class="lvrow"><b>${h.l}</b><span class="muted jp">${esc(h.part)}</span><span>${h.ok}/${h.n} · ${Math.round(h.ok / h.n * 100)}%</span></div>`
    : `<div class="lvrow"><b>${h.l}</b><span class="muted">${esc(h.d)} · full exam</span><span class="${h.pass ? 'okc' : 'badc'}">${h.total}/${h.max} · ${h.pass ? '合格 pass' : 'not yet'}</span></div>`).join('')}</div>` : ''}`;
}
function renderExam() {
  const s = S.session;
  if (s.done) return renderExamResult();
  const q = s.qs[s.idx], sec = EXAM_SECTIONS[q.si], secNo = [...new Set(s.qs.map(x => x.si))].indexOf(q.si) + 1;
  const left = s.limit - (Date.now() - s.start), last = s.idx === s.qs.length - 1;
  const opts = q.opts.map((o, i) => `<button class="choice ${s.ans[s.idx] === i ? 'sel' : ''}" onclick="App.examPick(${i})"><span class="n">${i + 1}</span><span>${o}</span></button>`).join('');
  return `<div class="qtop"><span class="qnav"><button class="ghost" onclick="App.examQuit()">✕ Quit</button></span><span id="etimer" class="${left < 120e3 ? 'low' : ''}">⏱ ${fmtClock(left)}</span></div>
  <div class="qbar"><i style="width:${(s.ans.filter(a => a >= 0).length / s.qs.length) * 100}%"></i></div>
  <div class="exsec"><b class="jp">問題${secNo}　${sec.jp}</b><span>${sec.en} · question ${s.idx + 1} of ${s.qs.length}${s.scope && s.scope.type !== 'full' ? ' · section practice' : ''}</span></div>
  <div class="exinstr jp">${sec.instr}</div><div class="exinstr-en">${sec.instrEn}</div>
  <div class="card prompt">${q.prompt}</div>
  <div class="choices ${q.key === 'li' || q.key === 'ik' || q.key === 'rd' ? '' : 'grid2'}">${opts}</div>
  <div class="btnrow"><button class="btn sec" onclick="App.examGo(-1)" ${s.idx ? '' : 'disabled'}>‹ Previous</button>${last ? `<button class="btn" onclick="App.finishExam()">Finish exam</button>` : `<button class="btn" onclick="App.examGo(1)">Next ›</button>`}</div>
  <div class="exgrid">${s.qs.map((x, i) => `<button class="${i === s.idx ? 'cur' : ''} ${s.ans[i] >= 0 ? 'done' : ''}" onclick="App.examJump(${i})">${i + 1}</button>`).join('')}</div>
  ${!last ? `<button class="btn line" onclick="App.finishExam()">Finish exam now</button>` : ''}
  <p class="note kbd">Keys: 1–4 to answer · ← → to move</p>`;
}
function examReview(s) {
  const wrong = s.qs.map((q, i) => ({ q, i })).filter(o => s.ans[o.i] !== o.q.ans);
  if (!wrong.length) return '<p class="note" style="text-align:center">Every question right!</p>';
  return `<div class="label">Review (${wrong.length}) — tap to study</div><div class="list">${wrong.map(({ q, i }) => {
    if (q.rd) return `<button class="row exrev force" onclick="App.endSession();App.go('read');App.rdOpen('${esc(q.item.id.slice(3))}')"><span class="rm"><b class="jp">読解</b> · <span class="jp">${ruby(q.rd.title)}</span>: <span class="jp">${ruby(q.rd.q)}</span><br>
      <span class="badc">✗ ${s.ans[i] >= 0 ? `<span class="jp">${esc(q.raw[s.ans[i]])}</span>` : 'no answer'}</span> · <span class="okc">✓ <span class="jp">${esc(q.raw[q.ans])}</span></span><br><span class="muted">${esc(q.rd.why)}</span></span></button>`;
    const it = q.item, label = it.kind === 'grammar' ? esc(it.t) : esc(it.w || it.r);
    return `<button class="row exrev force" data-open="${esc(it.id)}"><span class="rm"><b class="jp">${EXAM_SECTIONS[q.si].jp}</b> · ${q.fullM ? `<span class="jp exs">${ruby(q.fullM, true)}</span>` : `<span class="jp">${label}</span>`}<br>
      <span class="badc">✗ ${s.ans[i] >= 0 ? `<span class="jp">${esc(q.raw[s.ans[i]])}</span>` : 'no answer'}</span> · <span class="okc">✓ <span class="jp">${esc(q.raw[q.ans])}</span></span></span></button>`; }).join('')}</div>`;
}
function renderSectionResult() {
  const s = S.session, ok = s.qs.filter((q, i) => s.ans[i] === q.ans).length, n = s.qs.length, pct = Math.round(ok / n * 100), P = PASS[s.level];
  const minPct = Math.round((P.two && s.scope.id !== 'listen' && s.scope.id !== 'li' ? 38 / 120 : 19 / 60) * 100), passPct = Math.round(P.total / 180 * 100);
  const rows = EXAM_SECTIONS.map((sec, si) => { const qs = s.qs.map((q, i) => ({ q, i })).filter(o => o.q.si === si); if (!qs.length) return '';
    const k = qs.filter(o => s.ans[o.i] === o.q.ans).length; return `<div class="lvrow"><b class="jp" style="font-weight:500">${sec.jp}</b><div class="pbar"><i style="width:${k / qs.length * 100}%"></i></div><span class="muted">${k}/${qs.length}</span></div>`; }).join('');
  return `<div class="card score"><div class="muted">${s.level} · <span class="jp">${esc(scopeLabel(s.scope))}</span> · ${fmtClock(s.time)} used</div>
    <div class="big ${pct >= passPct ? 'okc' : pct >= minPct ? '' : 'badc'}">${pct}%</div><div style="font-weight:600">${ok} of ${n} correct</div>
    <div class="muted" style="font-size:13px;margin-top:6px">For reference: the JLPT's minimum for a section is about ${minPct}%, and passing ${s.level} overall needs about ${passPct}%.</div></div>
  ${rows.split('lvrow').length > 2 ? `<div class="label">By question type</div><div class="card lvrows wide">${rows}</div>` : ''}
  ${examReview(s)}
  <button class="btn" onclick="App.examSection('${s.scope.type}','${s.scope.id}')">Practise again (new questions)</button>
  <button class="btn line" onclick="App.endSession()">Done</button>`;
}
function renderExamResult() {
  const s = S.session;
  if (s.scope && s.scope.type !== 'full') return renderSectionResult();
  const r = s.result, P = PASS[s.level];
  const secRows = EXAM_SECTIONS.map((sec, si) => { const qs = s.qs.map((q, i) => ({ q, i })).filter(o => o.q.si === si); if (!qs.length) return '';
    const ok = qs.filter(o => s.ans[o.i] === o.q.ans).length; return `<div class="lvrow"><b class="jp" style="font-weight:500">${sec.jp}</b><div class="pbar"><i style="width:${ok / qs.length * 100}%"></i></div><span class="muted">${ok}/${qs.length}</span></div>`; }).join('');
  const wrong = s.qs.map((q, i) => ({ q, i })).filter(o => s.ans[o.i] !== o.q.ans);
  return `<div class="card score"><div class="muted">${s.level} mock exam · ${fmtClock(s.time)} used</div>
    <div class="big ${r.pass ? 'okc' : 'badc'}">${r.pass ? '合格' : '不合格'}</div>
    <div style="font-weight:600">${r.pass ? 'Estimated pass' : 'Not quite there yet'} · ${r.total} / ${r.max}</div>
    <div class="muted" style="font-size:13px;margin-top:4px">Pass line on the parts tested: ${r.need}${r.readingSkipped ? ` (scaled from ${P.total}/180, reading not included)` : r.max < 180 ? ` (scaled from ${P.total}/180, listening not included)` : '/180'}</div></div>
  <div class="label">Scaled section scores</div>
  <div class="card lvrows">${r.rows.map(([n, v, max, min]) => `<div class="lvrow"><span style="grid-column:1/3">${n}</span><span class="${v >= min ? 'okc' : 'badc'}">${v}/${max} <span class="muted">(min ${min})</span></span></div>`).join('')}
    ${r.readingSkipped ? '<div class="lvrow"><span style="grid-column:1/3">Reading (読解)</span><span class="muted">not included</span></div>' : ''}</div>
  <div class="label">By question type</div><div class="card lvrows wide">${secRows}</div>
  ${s.skippedListening ? '<p class="note">Listening wasn\'t included: there are no native sentence recordings for this level in the current data.</p>' : ''}
  ${examReview(s)}
  <button class="btn" onclick="App.startExam()">Take another ${s.level} exam</button>
  <button class="btn line" onclick="App.endSession()">Done</button>
  <p class="note">Estimate only: questions are generated from the app's data, not official JLPT papers. Pass marks from <a href="https://www.jlpt.jp/e/guideline/results.html" target="_blank" rel="noopener">jlpt.jp</a>.</p>`;
}

