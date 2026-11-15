/* =====================================================================
   TEXTBOOKS: study alongside Genki I & II or Basic Kanji Book 1 & 2.
   Each lesson lists its words, kanji and grammar (which lesson teaches what is
   taken from the books' public indexes; meanings come from JMdict, and the short
   explanations are written for this app). Words you already study elsewhere in the
   app are the same cards here, so progress is shared.
   Also: a conjugation drill that explains every answer.
   ===================================================================== */
const BK = { gw: null, vref: null, seq: null, x: {} };
const BK_PART = { c: 'Lesson words', r: 'Reading & writing', x: 'Extra: useful words', g: 'Greetings' };
const BK_THEME = l => l === 0 ? 'Greetings' : (BOOKDATA.gl[l] || {}).t || '';

function gkWords() {
  if (BK.gw) return BK.gw;
  return (BK.gw = BOOKDATA.gw.map(a => ({ s: a[0] || null, w: a[1], r: a[2], m: a[3], g: a[4], vc: a[5] || null, su: !!a[6], l: a[7] || null,
    L: a[8].split(',').map(t => { const m = /^(G|\d+)([crxg])$/.exec(t); return m ? { n: m[1] === 'G' ? 0 : +m[1], t: m[2] } : null; }).filter(Boolean) })));
}
const bkId = e => 'v:' + e.w + '|' + e.r;
/** a textbook word that isn't in the JLPT lists becomes its own card */
function bkMake(e) {
  const id = bkId(e);
  if (BK.x[id]) return BK.x[id];
  const g = ['noun', 'verb', 'i-adj', 'na-adj', 'adverb', 'expression', 'particle'].includes(e.g) ? e.g : 'other';
  const x = normV({ i: e.s, w: e.w, r: e.r, f: furi(e.w, e.r), m: e.m, s: [{ p: [], g: e.m.split('; ') }], g, q: 3, ex: [] }, 'Extra');
  x.id = id; x.bk = 1; if (e.vc && !e.su) x.vc = e.vc;
  return (BK.x[id] = x);
}
/** called from rebuild(): textbook-only cards you have studied stay reachable for reviews */
function registerBookExtras() {
  for (const e of gkWords()) { if (e.l) continue; const id = bkId(e); if ((progress[id] || BK.x[id]) && !VMAP[id]) VMAP[id] = bkMake(e); }
}
const bookStudied = () => gkWords().filter(e => !e.l && progress[bkId(e)]).map(bkMake);
/** the app's card for a textbook word: the JLPT card with the same JMdict entry, or its own */
function bkItem(e) {
  if (BK.vref !== V) {
    BK.vref = V; BK.seq = new Map();
    for (const x of V) if (x.seq) { const a = BK.seq.get(x.seq); if (a) a.push(x); else BK.seq.set(x.seq, [x]); }
  }
  if (e.s && BK.seq.has(e.s)) { const a = BK.seq.get(e.s), rh = kata2hira(e.r); return a.find(x => kata2hira(x.r) === rh) || a[0]; }
  const id = bkId(e);
  if (VMAP[id] && !VMAP[id].bk) return VMAP[id];
  const x = bkMake(e); VMAP[id] = x; return x;
}
/** JLPT levels a set of textbook words needs loaded before their cards can be matched */
function bkNeed(es) { return [...new Set(es.map(e => e.l).filter(l => l && LV.includes(l)))].filter(l => !isLoaded('vocab', l) && !DATA.failed['vocab' + l]); }
function bkEnsure(es) {
  if (DATA.mode !== 'full') return true;
  const need = bkNeed(es), gneed = ['N5', 'N4', 'N3'].filter(l => !isLoaded('grammar', l) && !DATA.failed['grammar' + l]);
  if (!need.length && !gneed.length) return true;
  if (!S.bkLoading) { S.bkLoading = true; Promise.all([...need.map(l => load('vocab', l)), ...gneed.map(l => load('grammar', l))]).catch(() => {}).then(() => { S.bkLoading = false; if (S.view === 'books') render(); }); }
  return false;
}
const gkLessonWords = (n, part) => gkWords().filter(e => e.L.some(p => p.n === n && (!part || p.t === part)));
function bkSeen(items) {
  const known = items.filter(x => status(x.id) === 'known').length, lrn = items.filter(x => status(x.id) === 'learning').length;
  return { known, lrn, n: items.length, pct: items.length ? Math.round((known + lrn * 0.5) / items.length * 100) : 0 };
}
const bkKanji = s => [...s].map(c => KMAP[c] || { id: null, k: c, mean: [c === '々' ? 'repeat mark: says the kanji again (人々, 時々)' : ''] });
const bkBar = p => `<i class="bk-bar"><s style="width:${p}%"></s></i>`;

/* ---------- the Textbooks page ---------- */
function vBooks() {
  const b = settings.book || {};
  if (S.gk) return vGkp();
  if (S.bk && S.bk.L != null) return S.bk.book === 'bkb' ? vBkbLesson(S.bk.L) : vGkLesson(S.bk.L);
  const which = S.bkTab || (b.id === 'bkb' ? 'bkb' : 'genki');
  const head = `<h1>Textbooks</h1><p class="sub">Studying with a textbook? Open its lesson here: the same words, kanji and grammar, as flashcards and quizzes that join your daily reviews.</p>
    ${seg([['genki', 'Genki I & II'], ['bkb', 'Basic Kanji Book']], which, 'App.bkTab')}`;
  if (which === 'bkb') {
    const rows = BOOKDATA.bkb.map(([t, ks], i) => {
      const L = i + 1, its = bkKanji(ks).filter(k => k.id), p = bkSeen(its);
      return `<button class="bk-row" onclick="App.bkOpen('bkb',${L})"><span class="bk-n">${L}</span><span class="bk-t"><b>${esc(t)}</b><span class="jp bk-ks">${esc(ks)}</span></span><span class="bk-p">${p.known}/${ks.length}${bkBar(p.pct)}</span></button>
        ${L % 5 === 0 ? `<button class="bk-rev" onclick="App.bkReview('bkb',${L - 4},${L})">Review lessons ${L - 4}–${L}<span>${BOOKDATA.bkb.slice(L - 5, L).reduce((a, x) => a + x[1].length, 0)} kanji</span></button>` : ''}`;
    }).join('');
    return `${head}<div class="bk-cur">${b.id === 'bkb' ? `You’re on lesson ${b.L}. <button class="linkbtn" onclick="App.bkOpen('bkb',${b.L})">Open it</button>` : 'Basic Kanji Book 1 & 2 teach 500 kanji in 45 lessons, a review after every five.'}</div><div class="bk-list">${rows}</div>
      <p class="note">Lesson contents follow the book’s table of contents. Kanji details (readings, meanings, stroke order) are the app’s own.</p>`;
  }
  const words = gkWords();
  const rows = [0, ...Array.from({ length: 23 }, (_, i) => i + 1)].map(L => {
    const ws = words.filter(e => e.L.some(p => p.n === L && p.t !== 'x')), ks = L ? BOOKDATA.gl[L].k : '';
    const its = ws.filter(e => DATA.mode !== 'full' || !e.l || isLoaded('vocab', e.l)).map(bkItem);
    const p = bkSeen(its);
    return `${L === 13 ? '<div class="bk-vol">Genki II</div>' : L === 0 ? '<div class="bk-vol">Genki I</div>' : ''}<button class="bk-row" onclick="App.bkOpen('genki',${L})"><span class="bk-n">${L || 'あ'}</span><span class="bk-t"><b>${esc(BK_THEME(L))}</b><small>${ws.length} words${ks ? ` · ${ks.length} kanji` : ''}${L ? ` · ${BOOKDATA.gl[L].gp.length} grammar points` : ''}</small></span><span class="bk-p">${its.length ? `${p.pct}%${bkBar(p.pct)}` : ''}</span></button>`;
  }).join('');
  return `${head}<div class="bk-cur">${b.id === 'genki' ? `You’re on lesson ${b.L}: ${esc(BK_THEME(b.L))}. <button class="linkbtn" onclick="App.bkOpen('genki',${b.L})">Open it</button>` : 'Genki I & II: 23 lessons of words, kanji, grammar and verb forms.'}</div>
    <button class="bk-conj" onclick="App.go('conj')"><b class="jp">活用</b><span><b>Conjugation drill</b><small>て-form, short forms, potential, passive … with the reason behind every answer</small></span></button>
    <div class="bk-list">${rows}</div><p class="note">Which lesson teaches each word, kanji and grammar point follows Genki’s published index. Meanings are from JMdict; explanations are written for this app.</p>`;
}

function vGkLesson(L) {
  const all = gkLessonWords(L);
  if (!bkEnsure(all)) return `<button class="ghost backbtn" onclick="App.bkOpen(null)">‹ Textbooks</button><div class="loading">Loading the lesson…</div>`;
  const parts = ['c', 'g', 'r', 'x'].map(t => [t, gkLessonWords(L, t).map(e => ({ e, x: bkItem(e) }))]).filter(p => p[1].length);
  const items = parts.filter(p => p[0] !== 'x').flatMap(p => p[1].map(o => o.x));
  const les = BOOKDATA.gl[L] || null, ks = les ? bkKanji(les.k) : [], kItems = ks.filter(k => k.id);
  const p = bkSeen(items), pk = bkSeen(kItems), cur = settings.book && settings.book.id === 'genki' && settings.book.L === L;
  const tab = S.bkLt || 'words';
  const tabs = [['words', `Words <small>${items.length}</small>`], ...(les ? [['kanji', `Kanji <small>${ks.length || '–'}</small>`], ['grammar', `Grammar <small>${les.gp.length}</small>`]] : [])];
  const wordsPane = parts.map(([t, list]) => `<div class="label">${BK_PART[t]}${t === 'x' ? ' <small>(not in the lesson’s main list)</small>' : ''}</div><div class="bk-words">${list.map(({ e, x }) => bkWordRow(e, x)).join('')}</div>`).join('');
  const kanjiPane = !les ? '' : L <= 2 ? `<div class="card bk-kana"><b>${L === 1 ? 'Hiragana' : 'Katakana'}</b><p>Genki’s reading-and-writing lesson ${L} is ${L === 1 ? 'hiragana' : 'katakana'}. Kanji start in lesson 3.</p><button class="btn sec" onclick="App.go('kana')">Open the kana charts</button></div>`
    : `<div class="tiles" style="margin-top:6px">${ks.map(k => k.id ? `<button class="tile" data-open="${esc(k.id)}"><i class="dot ${status(k.id)}"></i><span class="tk jp">${k.k}</span><span class="tm">${esc(k.mean[0] || '')}</span></button>` : `<span class="tile off"><span class="tk jp">${esc(k.k)}</span><span class="tm">${esc(k.mean[0] || '')}</span></span>`).join('')}</div>
      <div class="btnrow"><button class="btn" onclick="App.bkStudy('kanji','learn')">Learn these kanji</button><button class="btn sec" onclick="App.bkStudy('kanji','cards')">Flashcards</button><button class="btn sec" onclick="App.bkStudy('kanji','test')">Quiz</button></div>`;
  const gpx = les ? gkpOf(L) : [];
  const gramPane = !les ? '' : `${gpx.length ? `<div class="gkp-top"><p>Each point has example sentences written for this app. Practise them as exercises: fill in the blank, pick the right sentence, say what it means.</p><button class="btn" onclick="App.gkpStart(${L})">Practise this lesson’s grammar</button></div>` : ''}<div class="bk-gram">${les.gp.map(([pat, what, ids], gi) => { const gs = ids.map(id => GMAP[id]).filter(Boolean), xs = gpx.filter(x => x.gp === gi); return `<div class="bk-gp"><div class="bk-gpp jp">${esc(pat)}</div><div class="bk-gpe">${esc(what)}</div>${xs.length ? `<div class="gkp-list">${xs.map(gkpSent).join('')}</div>` : ''}<div class="bk-gpl">${gs.map(g => `<button class="chipbtn" data-open="${esc(g.id)}"><i class="dot ${status(g.id)}"></i>${esc(gSplitTitle(g.t).jp || g.t)}</button>`).join('')}${xs.length ? `<button class="chipbtn gkp-go" onclick="App.gkpStart(${L},${gi})">Practise ›</button>` : ''}</div></div>`; }).join('')}</div>
      ${gkForms(L).length ? `<div class="card bk-cf"><b>Verb and adjective forms in this lesson</b><div class="bk-cfs">${gkForms(L).map(bkFormChip).join('')}</div><button class="btn" onclick="App.conjStart({src:'genki',L:${L},forms:'lesson'})">Drill this lesson’s forms</button><button class="btn sec" onclick="App.conjStart({src:'genki',L:${L},forms:'upto'})">Everything up to lesson ${L}</button></div>` : ''}
      ${(() => { const gs = les.gp.flatMap(g => g[2]).map(id => GMAP[id]).filter(Boolean); return gs.length >= 2 ? `<button class="btn sec" onclick="App.bkGram(${L})">Learn the linked grammar cards</button>` : ''; })()}`;
  return `<button class="ghost backbtn" onclick="App.bkOpen(null)">‹ Genki</button>
    <div class="bk-hero"><span class="bk-big">${L || 'あ'}</span><div><div class="muted">Genki · ${L === 0 ? 'Before lesson 1' : `Lesson ${L}`}</div><h1>${esc(BK_THEME(L))}</h1>
      <div class="bk-stat">${p.known} of ${items.length} words known${kItems.length ? ` · ${pk.known} of ${kItems.length} kanji` : ''}</div></div></div>
    <div class="btnrow"><button class="btn" onclick="App.bkStudy('vocab','learn')">Learn the words</button><button class="btn sec" onclick="App.bkStudy('vocab','cards')">Flashcards</button><button class="btn sec" onclick="App.bkStudy('vocab','test')">Quiz</button></div>
    ${les && gkpOf(L).length ? (() => { const st = gkpStats()['L' + L]; return `<div class="gkp-test"><div><b>Lesson test</b><small>20 questions: grammar${L >= 3 ? ', words and verb forms' : ' and words'}${st ? ` · best ${st.best}%` : ''}</small></div><button class="btn sec" onclick="App.gkpTest(${L})">${st ? 'Take it again' : 'Start'}</button></div>`; })() : ''}
    <button class="linkbtn bk-set" onclick="App.bkSetCur('genki',${L})">${cur ? '✓ This is your current lesson' : 'Make this my current lesson'}</button>
    <div class="bk-tabs">${tabs.map(([id, l]) => `<button class="${id === tab ? 'on' : ''}" onclick="App.bkLt('${id}')">${l}</button>`).join('')}</div>
    <div class="bk-pane">${tab === 'kanji' ? kanjiPane : tab === 'grammar' ? gramPane : wordsPane}</div>`;
}
function bkWordRow(e, x) {
  const vs = e.su ? '<span class="bk-suru jp">する</span>' : '';
  return `<button class="row" data-open="${esc(x.id)}"><i class="dot ${status(x.id)}"></i><span class="rw jp">${ruby(x.f)}${vs}</span><span class="rm">${esc(e.m)}</span>${x.lvl && LV.includes(x.lvl) ? `<span class="lvl">${x.lvl}</span>` : ''}</button>`;
}
const bkFormChip = f => `<span class="bk-cfc"><b>${esc((CJF[f].kind === 'a' ? 'adjective ' : '') + CJF[f].label)}</b>${esc(CJF[f].what)}</span>`;
/** the forms Genki introduces in lesson L (or in lessons 1…L) */
const gkForms = (L, upto) => CJ_FORMS.filter(f => upto ? f[4] <= L : f[4] === L).map(f => f[0]);

function vBkbLesson(L) {
  const [t, ks] = BOOKDATA.bkb[L - 1], kk = bkKanji(ks), its = kk.filter(k => k.id), p = bkSeen(its), cur = settings.book && settings.book.id === 'bkb' && settings.book.L === L;
  return `<button class="ghost backbtn" onclick="App.bkOpen(null)">‹ Basic Kanji Book</button>
    <div class="bk-hero"><span class="bk-big">${L}</span><div><div class="muted">Basic Kanji Book ${L <= 22 ? 1 : 2} · Lesson ${L}</div><h1>${esc(t)}</h1><div class="bk-stat">${p.known} of ${its.length} kanji known</div></div></div>
    <div class="btnrow"><button class="btn" onclick="App.bkStudy('kanji','learn')">Learn these kanji</button><button class="btn sec" onclick="App.bkStudy('kanji','cards')">Flashcards</button><button class="btn sec" onclick="App.bkStudy('kanji','test')">Quiz</button></div>
    <button class="linkbtn bk-set" onclick="App.bkSetCur('bkb',${L})">${cur ? '✓ This is your current lesson' : 'Make this my current lesson'}</button>
    <div class="tiles">${kk.map(k => k.id ? `<button class="tile" data-open="${esc(k.id)}"><i class="dot ${status(k.id)}"></i><span class="tk jp">${k.k}</span><span class="tm">${esc(k.mean[0] || '')}</span></button>` : `<span class="tile off"><span class="tk jp">${esc(k.k)}</span><span class="tm">${esc(k.mean[0] || '')}</span></span>`).join('')}</div>
    ${its.some(k => k.ex && k.ex.length) ? `<div class="label">Words with these kanji</div><div class="bk-words">${its.flatMap(k => (k.ex || []).slice(0, 2).map(e => VMAP['v:' + e.w + '|' + e.r]).filter(Boolean)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 30).map(x => vRow(x)).join('')}</div>` : ''}`;
}
/** the cards a lesson page studies */
function bkPool(kind) {
  const b = S.bk; if (!b) return [];
  if (b.book === 'bkb') return bkKanji(BOOKDATA.bkb[b.L - 1][1]).filter(k => k.id);
  if (kind === 'kanji') return bkKanji((BOOKDATA.gl[b.L] || { k: '' }).k).filter(k => k.id);
  return gkWords().filter(e => e.L.some(p => p.n === b.L && p.t !== 'x')).map(bkItem).filter((x, i, a) => a.indexOf(x) === i);
}
function bkGo(kind, mode, items) {
  if (items.length < 2) return toast('Nothing to study here yet');
  S.back = { view: 'books' };
  if (mode === 'learn') return startLearn(kind, null, items);
  if (mode === 'cards') return startCards(kind, false, items);
  const prev = S.tf.deck; S.tf.deck = kind; startTest(shuffle(items).slice(0, Math.min(items.length, 20)), kind === 'vocab' ? items : null); S.tf.deck = prev;
}

