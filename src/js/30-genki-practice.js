/* =====================================================================
   GENKI PRACTICE: example sentences for every Genki grammar point, written for
   this app, turned into exercises (fill in the blank, pick the right sentence,
   what does it mean) with the answer and the reason after each one, and a
   lesson test that mixes grammar, the lesson's words and its verb forms.
   ===================================================================== */
const GKX = { byL: null, byG: null };
function gkpIndex() {
  if (GKX.byL) return GKX;
  GKX.byL = {}; GKX.byG = {};
  GKP.forEach((a, i) => { const it = { i, L: a[0], gp: a[1], j: a[2], e: a[3], w: a[4], why: a[5] }; (GKX.byL[it.L] = GKX.byL[it.L] || []).push(it); });
  for (const L in BOOKDATA.gl) BOOKDATA.gl[L].gp.forEach((g, gi) => g[2].forEach(id => { (GKX.byG[id] = GKX.byG[id] || []).push([+L, gi]); }));
  return GKX;
}
const gkpOf = (L, gp) => (gkpIndex().byL[L] || []).filter(x => gp == null || x.gp === gp);
const gkpParts = j => { const m = /^(.*?)\[\[(.+?)\]\](.*)$/.exec(j); return { pre: m[1], ans: m[2], post: m[3] }; };
const gkpWith = (x, mid) => { const p = gkpParts(x.j); return ruby(p.pre) + mid + ruby(p.post); };
const gkpShow = x => gkpWith(x, `<b class="gkp-a">${ruby(gkpParts(x.j).ans)}</b>`);
const gkpGP = x => BOOKDATA.gl[x.L].gp[x.gp];
const gkpF = x => String(x.f || '').includes('{') ? x.f : furi(x.w, x.r);
const gkpStats = () => store.get('gkp', {});
const gkpSent = x => `<div class="gkp-s"><div class="jp">${gkpShow(x)}</div><small>${esc(x.e)}</small></div>`;

/** practice sentences for a grammar card opened anywhere in the app */
function gkpForGrammar(g) {
  const refs = gkpIndex().byG[g.id]; if (!refs || !refs.length) return '';
  const xs = refs.flatMap(([L, gi]) => gkpOf(L, gi)).slice(0, 3); if (!xs.length) return '';
  const [L, gi] = refs[0];
  return `<div class="mini">Practice sentences <small>(Genki lesson ${L})</small></div>${xs.map(gkpSent).join('')}
    <div class="btnrow"><button class="btn sec sm" onclick="App.gkpStart(${L},${gi})">Practise this pattern</button></div>`;
}

/* ---------- building a session ---------- */
const GKP_TYPES = ['fill', 'pick', 'fill', 'mean'];
function gkpQ(x, type, pool) {
  const p = gkpParts(x.j);
  if (type === 'mean') {
    const others = shuffle(pool.filter(y => y !== x && y.e !== x.e && y.gp !== x.gp)).concat(shuffle(pool.filter(y => y !== x && y.e !== x.e && y.gp === x.gp)));
    const es = [...new Set(others.map(y => y.e))].slice(0, 3);
    if (es.length === 3) return { k: 'g', type, x, opts: shuffle([{ t: x.e, ok: true }, ...es.map(t => ({ t }))]), ans: null };
    type = 'fill';
  }
  return { k: 'g', type, x, opts: shuffle([{ t: p.ans, ok: true }, ...x.w.map(t => ({ t }))]), ans: null };
}
function gkpGrammarQs(L, gp, n) {
  const pool = gkpOf(L), mine = shuffle(gkpOf(L, gp));
  // spread the questions over the lesson's grammar points
  let list = mine;
  if (gp == null) { const by = {}; for (const x of mine) (by[x.gp] = by[x.gp] || []).push(x); list = []; for (let r = 0; list.length < mine.length; r++) for (const k of shuffle(Object.keys(by))) if (by[k][r]) list.push(by[k][r]); }
  return list.slice(0, n).map((x, i) => gkpQ(x, GKP_TYPES[i % GKP_TYPES.length], pool));
}
function gkpWordQs(L, n) {
  const es = gkWords().filter(e => e.L.some(p => p.n === L && p.t === 'c'));
  const items = es.map(bkItem).filter((x, i, a) => x && a.indexOf(x) === i && x.m);
  const mOf = x => String(x.m).split(';')[0].trim();
  return shuffle(items).slice(0, n).map(x => {
    const others = [...new Set(shuffle(items.filter(y => y !== x && mOf(y) !== mOf(x))).map(mOf))].slice(0, 3);
    return others.length < 3 ? null : { k: 'w', x, opts: shuffle([{ t: mOf(x), ok: true }, ...others.map(t => ({ t }))]), ans: null };
  }).filter(Boolean);
}
function gkpFormQs(L, n) {
  const forms = gkForms(L, true); if (!forms.length) return [];
  const pool = shuffle(cjPool('genki', L)), out = [];
  for (let k = 0; k < pool.length * 2 && out.length < n; k++) {
    const x = pool[k % pool.length], ok = cjFormsFor(x), fs = forms.filter(f => ok.includes(f) && CJF[f].kind === (x.vc ? 'v' : 'a')); if (!fs.length) continue;
    const cur = fs.filter(z => CJF[z].lesson === L), f = cur.length && Math.random() < 0.7 ? pick(cur) : pick(fs); if (out.some(q => q.x.w === x.w)) continue;
    const res = conjugate(x, f); if (!res) continue;
    out.push({ k: 'f', x, form: f, res, opts: cjOptions(x, f, res), ans: null });
  }
  return out;
}
function gkpBegin(G) {
  if (!G.qs.length) return toast('Nothing to practise here yet');
  G.i = 0; G.right = 0; G.done = false;
  S.gk = G; S.view = 'books'; render(); window.scrollTo(0, 0);
}

/* ---------- the session screens ---------- */
function vGkp() {
  const G = S.gk;
  if (G.done) return vGkpDone();
  const q = G.qs[G.i], answered = q.ans != null;
  const top = `<div class="qtop"><button class="ghost" onclick="App.gkpEnd()">✕ End</button><span class="muted">${G.i + 1} of ${G.qs.length} · ${G.right} right</span></div>
    <div class="track" aria-hidden="true">${G.qs.map((z, k) => `<i class="${z.ans != null ? (z.opts[z.ans].ok ? 'ok' : 'bad') : k === G.i ? 'cur' : ''}"></i>`).join('')}</div>`;
  let prompt = '', optHtml = o => esc(o.t), grid = false;
  if (q.k === 'g') {
    const x = q.x, P = gkpGP(x);
    const tag = `<div class="gkp-tag jp">${esc(P[0])}</div>`;
    if (q.type === 'fill') { prompt = `${tag}<div class="gkp-ask">Fill in the blank</div><div class="gkp-q jp">${gkpWith(x, answered ? `<b class="gkp-a">${ruby(gkpParts(x.j).ans)}</b>` : '<span class="gkp-blank">？</span>')}</div><div class="gkp-en">${esc(x.e)}</div>`; optHtml = o => `<span class="jp">${ruby(o.t)}</span>`; grid = true; }
    else if (q.type === 'pick') { prompt = `${tag}<div class="gkp-ask">Which sentence says this?</div><div class="gkp-en big">${esc(x.e)}</div>`; optHtml = o => `<span class="jp gkp-opt">${gkpWith(x, ruby(o.t))}</span>`; }
    else { prompt = `${tag}<div class="gkp-ask">What does this mean?</div><div class="gkp-q jp">${gkpShow(x)}</div>`; }
  } else if (q.k === 'w') { prompt = `<div class="gkp-ask">What does this word mean?</div><div class="gkp-word jp">${ruby(gkpF(q.x))}</div>`; grid = true; }
  else { const F = CJF[q.form]; prompt = `<div class="gkp-ask">Change the form</div><div class="gkp-word jp">${ruby(furi(q.x.w, q.x.r))}${q.x.vc === 'vs' ? 'する' : ''}</div><div class="gkp-en">${esc(q.x.m || '')}</div><div class="cj-to"><span>→</span><b>${esc(F.label)}</b><small>${esc(F.what)}</small></div>`; optHtml = o => `<span class="jp">${esc(o.show)}${o.sub ? `<small class="gkp-sub">${esc(o.sub)}</small>` : ''}</span>`; grid = true; }
  const opts = q.opts.map((o, i) => {
    let c = 'choice'; if (answered) c += (o.ok ? ' ok' : i === q.ans ? ' bad' : ' dim') + (i === q.ans ? ' picked' : '');
    return `<button class="${c}" onclick="App.gkpAns(${i})"${answered ? ' tabindex="-1"' : ''}><span class="n">${i + 1}</span><span>${optHtml(o)}</span></button>`;
  }).join('');
  let after = '';
  if (answered) {
    const ok = !!q.opts[q.ans].ok, last = G.i + 1 >= G.qs.length;
    let body = '';
    if (q.k === 'g') {
      const P = gkpGP(q.x), gs = P[2].map(id => GMAP[id]).filter(Boolean);
      body = `<div class="gkp-full jp">${gkpShow(q.x)}</div><div class="gkp-en">${esc(q.x.e)}</div><p class="gkp-why">${esc(q.x.why)}</p>
        <div class="gkp-pt"><b class="jp">${esc(P[0])}</b> · ${esc(P[1])}${gs.length ? `<div class="bk-gpl">${gs.map(g => `<button class="chipbtn" data-open="${esc(g.id)}">${esc(gSplitTitle(g.t).jp || g.t)}</button>`).join('')}</div>` : ''}</div>`;
    } else if (q.k === 'w') body = `<div class="gkp-full jp">${ruby(gkpF(q.x))}</div><div class="gkp-en">${esc(q.x.m)}</div>`;
    else { const o = q.opts[q.ans]; body = `<div class="gkp-full jp">${esc(q.res.w)}${q.res.w !== q.res.r ? ` <small>${esc(q.res.r)}</small>` : ''}</div>${!ok && o.why ? `<p class="gkp-why">${esc(o.why)}</p>` : ''}<p class="gkp-why">${esc(cjWhy(q.x, q.form))}</p>`; }
    after = `<div class="gkp-fb ${ok ? 'ok' : 'no'}" role="status"><b class="gkp-v">${ok ? 'Right!' : 'Not quite'}</b>${body}</div><button class="btn" id="gkpNext" onclick="App.gkpNext()">${last ? 'See results' : 'Next'}</button>`;
  }
  return `${top}<div class="card prompt gkp-card">${prompt}</div><div class="choices ${grid ? 'grid2' : ''}">${opts}</div><div class="after">${after}</div>`;
}
function vGkpDone() {
  const G = S.gk, n = G.qs.length, miss = G.qs.filter(q => !q.opts[q.ans].ok);
  const part = k => { const qs = G.qs.filter(q => q.k === k); return qs.length ? [qs.filter(q => q.opts[q.ans].ok).length, qs.length] : null; };
  const parts = [['g', 'Grammar'], ['w', 'Words'], ['f', 'Forms']].map(([k, l]) => [l, part(k)]).filter(p => p[1]);
  const row = q => q.k === 'g' ? `<div class="gkp-miss">${gkpSent(q.x)}</div>` : q.k === 'w' ? `<div class="gkp-miss"><span class="jp">${ruby(gkpF(q.x))}</span> <small>${esc(q.x.m)}</small></div>` : `<div class="gkp-miss"><span class="jp">${esc(q.x.w)}${q.x.vc === 'vs' ? 'する' : ''}</span> → <b class="jp">${esc(q.res.w)}</b> <small>${esc(CJF[q.form].label)}</small></div>`;
  return `<h1>${G.right} of ${n}</h1><p class="sub">${esc(G.title)}. ${G.right === n ? 'Every one right.' : G.right / n >= 0.8 ? 'Nearly all of them. Here are the ones to look at again.' : 'Go through the ones you missed, then try again.'}</p>
    ${parts.length > 1 ? `<div class="gkp-parts">${parts.map(([l, [a, b]]) => `<span><b>${a}/${b}</b>${l}</span>`).join('')}</div>` : ''}
    ${miss.length ? `<div class="label">To look at again</div><div class="card">${miss.map(row).join('')}</div>` : ''}
    <div class="btnrow"><button class="btn" onclick="App.gkpAgain()">Try again</button>${miss.length ? '<button class="btn sec" onclick="App.gkpMisses()">Just the misses</button>' : ''}<button class="btn line" onclick="App.gkpEnd()">Back to the lesson</button></div>`;
}

const gkpApp = {
  gkpStart(L, gp) {
    const one = gp != null, qs = gkpGrammarQs(L, one ? gp : null, one ? 10 : 15);
    const P = one ? BOOKDATA.gl[L].gp[gp] : null;
    S.bk = { book: 'genki', L }; S.bkLt = 'grammar';
    gkpBegin({ L, kind: 'practice', gp: one ? gp : null, title: one ? `Genki ${L}: ${P[0]}` : `Genki ${L} grammar practice`, qs });
  },
  gkpTest(L) {
    const les = gkWords().filter(e => e.L.some(p => p.n === L && p.t === 'c'));
    if (!bkEnsure(les)) { toast('Loading the lesson…'); return; }
    const f = gkpFormQs(L, L >= 3 ? 4 : 0), w = gkpWordQs(L, 6), g = gkpGrammarQs(L, null, 20 - f.length - w.length);
    S.bk = { book: 'genki', L };
    gkpBegin({ L, kind: 'test', title: `Genki lesson ${L} test`, qs: [...g.slice(0, Math.ceil(g.length / 2)), ...w, ...g.slice(Math.ceil(g.length / 2)), ...f] });
  },
  gkpAns(i) {
    const G = S.gk, q = G && G.qs[G.i]; if (!q || q.ans != null) return;
    q.ans = i; const ok = !!q.opts[i].ok; if (ok) G.right++; buzz(ok);
    if (q.k === 'f') { const st = cjStats(), v = st[q.form] || [0, 0]; v[0] += ok ? 1 : 0; v[1]++; st[q.form] = v; store.set('conj', st); }
    if (q.k === 'w' && q.x.id) gradeQuiet(q.x, ok);
    logAct(false, q.k === 'w' ? 'vocab' : 'grammar');
    render(); const b = $('#gkpNext'); if (b) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  },
  gkpNext() {
    const G = S.gk; if (!G) return; G.i++;
    if (G.i >= G.qs.length) {
      G.done = true;
      if (G.kind === 'test') { const st = gkpStats(), k = 'L' + G.L, o = st[k] || { best: 0, n: 0 }; o.best = Math.max(o.best, Math.round(G.right / G.qs.length * 100)); o.last = Math.round(G.right / G.qs.length * 100); o.n++; st[k] = o; store.set('gkp', st); }
    }
    render(); window.scrollTo(0, 0);
  },
  gkpAgain() { const G = S.gk; G.kind === 'test' ? App.gkpTest(G.L) : App.gkpStart(G.L, G.gp); },
  gkpMisses() {
    const G = S.gk, miss = G.qs.filter(q => !q.opts[q.ans].ok).map(q => Object.assign({}, q, { ans: null, opts: shuffle(q.opts) }));
    gkpBegin({ L: G.L, kind: 'practice', gp: G.gp, title: G.title + ' (misses)', qs: shuffle(miss) });
  },
  gkpEnd() { const G = S.gk; S.gk = null; if (G) { S.bk = { book: 'genki', L: G.L }; S.bkLt = G.kind === 'test' ? S.bkLt : 'grammar'; } render(); window.scrollTo(0, 0); }
};
/* a word answered in a lesson test counts toward that card's record, without scheduling it as new */
function gradeQuiet(x, ok) {
  const p = progress[x.id]; if (!p) return;
  if (ok) p.c = (p.c || 0) + 1; else p.w = (p.w || 0) + 1;
  save();
}

const App = {
  ...ankiApp,
  ...booksApp,
  ...gkpApp,
  ...kreadApp,
  ...extrasApp,
  ...grammarApp,
  kpPlay(b) { const s = b.closest('.kps'); if (!s) return; s.classList.remove('play'); void s.offsetWidth; s.classList.add('play'); },
  leaveExam() { const s = S.session; if (s && s.mode === 'exam' && !s.done && !confirm('Leave the exam? Your answers will be lost.')) return false; stopExamTimer(); return true; },
  go(v, tab) { if (!App.leaveExam()) return; S.session = null; if (v === 'vocab' && tab === 'sit') { S.sit = null; if (DATA.mode === 'full' && LV.some(l => !isLoaded('vocab', l))) loadAllVocab().then(render, render); } if (v === 'grammar') { S.gp = null; S.gw = null; S.gtry = null; } if (v === 'books') { S.bk = null; S.gk = null; } if (v === 'conj') S.cj = null; if (v === 'read') S.rd = null; if (v === 'shadow' && !S.sh) return shStart(); S.view = v; if (tab) S.vtab = tab; App.closeSheet(); render(); window.scrollTo(0, 0); if (v === 'search') { const q = $('#q'); if (q && !S.search.q) q.focus(); } },
  vtab(t) { S.vtab = t; S.browse.limit = 100; if (t !== 'sit') S.sit = null; render(); if (t === 'sit' && DATA.mode === 'full' && LV.some(l => !isLoaded('vocab', l))) loadAllVocab().then(render, render); },
  sitOpen(id) { S.sit = id; render(); window.scrollTo(0, 0); },
  sitStudy(how) {
    const sit = SITUATIONS.find(x => x.id === S.sit); if (!sit) return;
    const items = sitItems(sit); S.back = { view: 'vocab', vtab: 'sit' };
    if (how === 'learn') startLearn('vocab', null, items);
    else if (how === 'cards') { startCards('vocab', false, items); if (!S.session) { S.back = { view: 'vocab', vtab: 'sit' }; startCards('vocab', true, items); } }
    else startTest(freshFirst(items, 'test-sit').slice(0, Math.min(20, items.length)), items);
  },
  cardsMore() { const s = S.session; if (!s) return; S.back = s.back; startCards(s.kind, false, s.custom); },
  kanaScript(v) { settings.kanaScript = v; if (v === 'h') settings.kanaGroups = settings.kanaGroups.filter(g => g !== 'ext'); if (!settings.kanaGroups.length) settings.kanaGroups = ['basic']; saveSettings(); render(); },
  kanaGroup(g) { const set = new Set(settings.kanaGroups); if (set.has(g)) { if (set.size > 1) set.delete(g); } else set.add(g); settings.kanaGroups = KANA_GROUPS.map(x => x[0]).filter(x => set.has(x)); saveSettings(); render(); },
  kanaQ(q) { S.kanaQ = q; render(); },
  lvToggle(l) {
    const set = new Set(settings.levels);
    if (set.has(l)) { if (set.size > 1) set.delete(l); } else set.add(l);
    settings.levels = [...LV, 'MY', 'ANKI'].filter(x => set.has(x)); saveSettings(); S.browse.limit = 100;
    render(); loadSel().then(render, render);
  },
  posSet(p) { S.pos = p; S.browse.limit = 100; render(); },
  cardFront(f) { settings.cardFront = f; saveSettings(); render(); },
  vfDir(d) { S.vf.dir = d; render(); },
  tfDeck(d) { S.tf.deck = d; S.tf.dir = 'mix'; render(); if (d === 'grammar') loadGrammar(LV.filter(l => settings.levels.includes(l) && levelTotal('grammar', l))).then(render, render); }, tfDir(d) { S.tf.dir = d; render(); }, tfCount(c) { S.tf.count = +c; render(); },
  bSort(s) { S.browse.sort = s; S.browse.limit = 100; render(); },
  more() { S.browse.limit += 200; render(); },
  kOrder(o) { S.kf.order = o; render(); }, kRange(r) { S.kf.range = r === 'all' ? 'all' : +r; render(); },
  kLv(l) { S.kf.jlpt = l; render(); }, kQt(q) { S.kf.qt = q; render(); },
  search(v) {
    S.search.q = v; clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      if (DATA.mode === 'full' && LV.some(l => !isLoaded('vocab', l))) {
        S.search.busy = true; $('#sres').innerHTML = searchResults();
        try { await Promise.all([loadAllVocab(), loadGrammar(gLevels())]); } catch (e) {}
        S.search.busy = false;
      }
      const r = $('#sres'); if (r && S.view === 'search' && !S.session) r.innerHTML = searchResults();
    }, 220);
  },
  styleSet(v) { App.set('style', v); if (v === 'game') { checkBadges(); toast('Game mode on: earn XP and belts as you learn'); } },
  goalSet(v) { App.set('goalMin', +v); },
  picStyle(v) { settings.picStyle = v; App.set('picStyle', v); },
  quoteNext() { S.quoteOff = ((S.quoteOff || 0) + 1) % quotePool().length; const el = document.querySelector('.quote'); if (el) { el.outerHTML = quoteCard().replace(/^[\s\S]*?<figure/, '<figure'); const q = document.querySelector('.quote'); if (q) hydrate(q.parentElement); } },
  wotdAdd() {
    const w = wordOfDay(); if (!w || progress[w.x.id]) return;
    progress[w.x.id] = { c: 0, w: 0, b: 0, d: Date.now(), t: Date.now(), l: w.x.lvl }; save();
    toast('Added: it\'s due in your next flashcard session'); render();
  },
  startLearn: kind => { S.back = null; startLearn(kind); }, learnMore() { const s = S.session; if (s && s.mode === 'learn') startLearn(s.kind, { used: s.used, round: s.round, custom: s.custom, back: s.back }); },
  startTest: () => startTest(), answer, next,
  startCards: kind => { S.back = null; startCards(kind); }, cram: kind => { S.back = null; startCards(kind, true); }, flip, rate, back,
  retry() { const s = S.session; const items = shuffle(s.results.filter(r => !r.ok).map(r => r.item)); S.session = { mode: 'test', kind: s.kind, pool: s.pool, queue: items, idx: 0, dir: s.dir, results: [] }; nextQ(); },
  newTest() { S.session = null; S.view = 'vocab'; S.vtab = 'test'; render(); },
  endSession() {
    const s = S.session; if (!App.leaveExam()) return; S.session = null;
    if (s && s.back) { S.view = s.back.view; if (s.back.vtab) S.vtab = s.back.vtab; }
    else if (s) { if (s.mode === 'exam') S.view = 'exam'; else if (s.kind === 'kana' && s.mode !== 'test') S.view = 'kana'; else if (s.mode === 'test') { S.view = 'vocab'; S.vtab = 'test'; } else if (s.kind === 'kanji') S.view = 'kanji'; else if (s.kind === 'grammar') S.view = 'grammar'; else { S.view = 'vocab'; S.vtab = s.mode; } }
    render(); window.scrollTo(0, 0);
  },
  glvToggle(l) { const set = new Set(gSelLevels()); if (set.has(l)) { if (set.size > 1) set.delete(l); } else set.add(l); settings.glevels = LV.filter(x => set.has(x)); saveSettings(); S.gf.limit = 100; render(); loadGrammar().then(render, render); },
  gqSet(q) { S.gq = q; render(); },
  gMore() { S.gf.limit += 200; render(); },
  examLvSet(l) { S.examLv = l; render(); },
  startExam: () => startExam({ type: 'full' }), examPick,
  examSection(type, id) { startExam({ type, id }); },
  examModeSet(m) { S.examMode = m; render(); },
  examNSet(n) { S.examN = +n; render(); }, examGo, examJump, finishExam: () => finishExam(false), examQuit() { App.endSession(); },
  set(k, v) { settings[k] = v; saveSettings(); applySettings(); render(); },
  furi(v) { App.set('furigana', v); },
  theme(v) { App.set('theme', v); },
  skin(v) { App.set('skin', v); },
  toggleTheme() { App.set('theme', isDark() ? 'light' : 'dark'); },
  newPerDay(n) { App.set('newPerDay', +n); },
  retention(r) { App.set('retention', +r); },
  addWords() {
    const t = $('#cw').value.trim(); if (!t) return;
    let added = 0;
    t.split(/\n+/).forEach(line => {
      let p;
      if (/\t|;/.test(line)) p = line.split(/\t|;/);
      else { const a = line.split(','); p = a.length > 3 ? [a[0], a[1], a.slice(2).join(',')] : a; }
      p = p.map(s => s.trim());
      const [w, r, m] = p; if (!w || !m) return;
      const reading = r || w;
      custom.push([furi(w, reading), reading, m, 'custom', 'MY', 3]);
      added++;
    });
    store.set('custom', custom); rebuild();
    if (added && !settings.levels.includes('MY')) { settings.levels.push('MY'); saveSettings(); }
    toast(added ? `Added ${added} word${added === 1 ? '' : 's'}` : 'Nothing added — check the format'); render();
  },
  clearWords() { if (!confirm('Remove all your custom words?')) return; custom = []; store.set('custom', custom); settings.levels = settings.levels.filter(l => l !== 'MY'); if (!settings.levels.length) settings.levels = ['N5']; saveSettings(); rebuild(); render(); },
  ptab(t) { S.ptab = t; render(); },
  lesson(id) { App.closeSheet(); if (!App.leaveExam()) return; S.session = null; const go = () => startLesson(id); if (!unitById(id)) { loadPathData().then(go); } else go(); },
  lessonStep(d) { const L = S.lesson; if (!L) return; L.i = Math.max(0, Math.min(L.steps.length - 1, L.i + d)); render(); window.scrollTo(0, 0); },
  lessonEn(i) { const L = S.lesson; L.showEn[i] = !L.showEn[i]; render(); },
  lessonAns(i) {
    const Q = S.lesson.quiz; if (!Q || Q.answered) return; const q = Q.qs[Q.i], ok = !!q.opts[i].ok;
    Q.answered = true; Q.chosen = i; Q.n++; if (ok) Q.ok++; else if (q.item) Q.missed.push(q.item);
    if (q.item) rec(q.item, ok); else logAct(false, 'grammar');
    if (ok && settings.playOnCorrect && q.au && hasRec(q.au)) playAudio(q.au);
    render();
  },
  lessonQNext() { const Q = S.lesson.quiz; Q.i++; Q.answered = false; Q.chosen = -1; if (Q.i >= Q.qs.length) S.lesson.i = S.lesson.steps.indexOf('done'); render(); window.scrollTo(0, 0); const q = Q.qs[Q.i]; if (q && q.autoplay) setTimeout(() => playAudio(q.autoplay), 250); },
  lessonClose() { const L = S.lesson; if (L && L.steps[L.i] !== 'done' && L.i > 0 && !confirm('Leave this lesson? You can start it again any time.')) return; S.lesson = null; if (S.fromPlay) { S.fromPlay = false; App.go('play'); } else App.go('path'); },
  placeStart() { S.place = { stage: 'intro', tally: {}, lv: null }; S.view = 'place'; App.closeSheet(); render(); window.scrollTo(0, 0); },
  placeKana(knows) {
    const P = S.place; if (!knows) { P.kanaWeak = true; return placeFinish(); }
    const pool = KANA.filter(x => ['basic', 'dakuten', 'combo'].includes(x.group)), hs = shuffle(pool.filter(x => x.script === 'h')).slice(0, 4), ks = shuffle(pool.filter(x => x.script === 'k')).slice(0, 4);
    P.lv = 'Kana'; P.qs = shuffle([...hs, ...ks]).map(x => Object.assign(makeKanaQ(x, 'k2r'), { sk: 'a' })); P.i = 0; P.kanaOk = 0; P.answered = false; P.stage = 'run'; render();
  },
  placeAns(i) {
    const P = S.place; if (P.answered) return; const q = P.qs[P.i], ok = i >= 0 && !!q.opts[i].ok;
    P.answered = true; P.chosen = i;
    if (P.lv === 'Kana') { if (ok) P.kanaOk++; }
    else { const t = P.tally[P.lv] = P.tally[P.lv] || { ok: 0, n: 0 }; t.n++; if (ok) t.ok++; const k = PLACE_SKILL[q.sk] || q.sk; const sk = t[k] = t[k] || [0, 0]; sk[1]++; if (ok) sk[0]++; }
    render();
  },
  placeNext() {
    const P = S.place; P.i++; P.answered = false; P.chosen = -1;
    if (P.i < P.qs.length) return render();
    if (P.lv === 'Kana') { if (P.kanaOk < 6) { P.kanaWeak = true; return placeFinish(); } P.lv = 'N5'; return placeLevel(); }
    const t = P.tally[P.lv], li = LV.indexOf(P.lv);
    if (t && t.n && t.ok / t.n >= PLACE_PASS && li < LV.length - 1) { P.lv = LV[li + 1]; return placeLevel(); }
    placeFinish();
  },
  placeQuit() { if (S.place && S.place.stage === 'run' && !confirm('Stop the placement check?')) return; S.place = null; App.go('path'); },
  knote(el) { const k = el.dataset.knote, v = el.value.trim(); if (v) knotes[k] = el.value; else delete knotes[k]; store.set('knotes', knotes); const s2 = el.parentElement.querySelector('.kr-saved'); if (s2) { s2.textContent = 'Saved on this device'; clearTimeout(el._t); el._t = setTimeout(() => { s2.textContent = ''; }, 1500); } },
  exportProgress() {
    const blob = new Blob([JSON.stringify({ app: 'kotoba-dojo', v: 2, exported: new Date().toISOString(), progress, log: actLog, custom, settings, knotes }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kotoba-dojo-progress-${today()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  importProgress(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result); if (!d || typeof d.progress !== 'object') throw new Error('bad file');
        if (!confirm(`Import ${Object.keys(d.progress).length} studied items? Items in both will keep whichever was studied more recently.`)) return;
        for (const [id, p] of Object.entries(d.progress)) if (!progress[id] || (p.t || 0) > (progress[id].t || 0)) progress[id] = p;
        for (const [k, e] of Object.entries(d.log || {})) { const c = actLog[k] || {}; actLog[k] = { r: Math.max(c.r || 0, e.r || 0), nv: Math.max(c.nv || 0, e.nv || 0), nk: Math.max(c.nk || 0, e.nk || 0) }; }
        if (Array.isArray(d.custom)) for (const c of d.custom) if (!custom.some(x => x[0] === c[0] && x[1] === c[1])) custom.push(c);
        if (d.knotes && typeof d.knotes === 'object') { for (const [k, v] of Object.entries(d.knotes)) if (!knotes[k] && typeof v === 'string') knotes[k] = v; store.set('knotes', knotes); }
        save(); store.set('log', actLog); store.set('custom', custom); rebuild(); toast('Progress imported'); render();
      } catch (e) { toast('That file is not a Kotoba Dojo export'); }
    };
    fr.readAsText(file);
  },
  reset() { if (!confirm('Reset all progress? This cannot be undone.')) return; progress = {}; actLog = {}; save(); store.set('log', actLog); toast('Progress reset'); render(); },
  sheetBack() { if (sheetStack.length < 2) return App.closeSheet(); if (sheetPushed > 0) history.back(); else popSheet(); },
  closeSheet() {
    if (!$('#sheet').classList.contains('open')) return;
    if (sheetPushed > 0) { sheetClosing = true; const n = sheetPushed; sheetPushed = 0; hideSheet(); try { history.go(-n); } catch (e) { sheetClosing = false; } }
    else hideSheet();
  }
};

/* delegated taps: audio, detail sheets, tap-to-reveal furigana */
document.addEventListener('click', e => {
  const say = e.target.closest('[data-audio]'); if (say && !say.dataset.open) { e.stopPropagation(); playAudio(say.dataset.audio, true); return; }
  const rb = e.target.closest('ruby');
  if (e.target.closest('.kcx') && rb && document.body.classList.contains('furi-tap') && !rb.classList.contains('show')) { rb.classList.add('show'); e.stopPropagation(); return; }   // tap-to-reveal furigana: first tap shows the reading
  const kc = e.target.closest('.kcx'); if (kc) { e.stopPropagation(); showWordPop(kc); return; }
  const kw = e.target.closest('.kwx'); if (kw) { e.stopPropagation(); showKanaPop(kw); return; }
  if (document.querySelector('.kpop') && !e.target.closest('.kpop')) { closeWordPop(); e.stopPropagation(); e.preventDefault(); return; }   // first tap outside only dismisses the pop-up
  const op = e.target.closest('[data-open]'); if (op) { const inPop = !!op.closest('.kpop'); if (inPop) { e.stopPropagation(); closeWordPop(); } openSheet(op.dataset.open); return; }
  if (rb && document.body.classList.contains('furi-tap') && !e.target.closest('.choice')) { rb.classList.toggle('show'); e.stopPropagation(); }
}, true);
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('kcx')) { e.preventDefault(); showWordPop(e.target); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('kwx')) { e.preventDefault(); showKanaPop(e.target); return; }
  if (e.key === 'Escape' && document.querySelector('.kpop')) { e.preventDefault(); e.stopPropagation(); closeWordPop(); return; }
  if ($('#sheet').classList.contains('open')) {
    if (e.key === 'Escape') return App.closeSheet();
    if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && sheetStack.length > 1) { e.preventDefault(); return App.sheetBack(); }
    return;
  }
  if (e.key === 'Escape') return;
  const s = S.session; if (!s) return;
  if (s.mode === 'exam') { if (s.done) return; if (/^[1-4]$/.test(e.key)) examPick(+e.key - 1); else if (e.key === 'ArrowRight') examGo(1); else if (e.key === 'ArrowLeft') examGo(-1); return; }
  if (s.mode === 'cards' && s.done) { if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); back(); } return; }
  if (s.done) return;
  if (s.mode === 'cards') {
    if ((e.key === ' ' || e.key === 'Enter') && !s.flipped) { e.preventDefault(); flip(); }
    else if (/^[1-4]$/.test(e.key) && s.flipped) rate(+e.key - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'z') { e.preventDefault(); back(); }
    return;
  }
  if (/^[1-4]$/.test(e.key) && !s.answered) answer(+e.key - 1);
  else if ((e.key === 'Enter' || e.key === ' ') && s.answered) { e.preventDefault(); next(); }
});

applySettings();
boot().then(render, err => { console.error(err); render(); }).then(() => { loadLate(); return ankiBoot(); }).catch(e => console.error(e))
  .then(() => { if (DATA.mode === 'full') setTimeout(() => loadAllVocab().then(() => { FURIX = null; }).catch(() => {}), 4000); });   // every level's words, so furigana can cover any word in a sentence
