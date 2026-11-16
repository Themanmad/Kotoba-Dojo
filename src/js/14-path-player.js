/* =====================================================================
   PATH — guided units, the lesson player and the placement check
   ===================================================================== */
let pathSt = Object.assign({ done: {}, place: null }, store.get('path', {}));
const savePath = () => store.set('path', pathSt);
const PATHX = {};
/** a unit word as a vocab item: the dictionary entry if there is one (matching spelling variants such as ご飯 / 御飯), else a lesson-only entry */
function pathWord(w, r, m, lvl) {
  const id = 'v:' + w + '|' + r;
  if (VMAP[id]) return VMAP[id];
  const rh = kata2hira(r), ks = hanOf(w).filter(c => c !== '御');
  const hit = V.find(x => kata2hira(x.r) === rh && (x.w === w || x.alt === w || (ks.length && ks.every(c => x.w.includes(c)) && hanOf(x.w).filter(c => c !== '御').length === ks.length)));
  if (hit) return hit;
  if (!PATHX[id]) {
    const x = normV({ i: null, w, r, f: furi(w, r), m, s: [{ p: [], g: m.split(/;\s*|,\s*/) }], g: 'other', q: 3, ex: [] }, lvl);
    x.id = id; x.pic = null; PATHX[id] = x;
  }
  VMAP[id] = PATHX[id];
  return PATHX[id];
}
/* ---------- units ---------- */
/* ---------- the plan for each level ----------
   Every level's Path teaches the whole level: all of its JLPT words, kanji and grammar points.
   N5 starts with 23 hand-written core lessons; then coverage lessons (about 12 words and one or two
   grammar points each, with real example sentences) until nothing is left out. Every 8 lessons a
   checkpoint (80% to clear), and the level ends with a full mock exam. */
const STAGE = 8, WPU = 12, CP_PASS = 80;
/* which grammar points the hand-written N5 lessons already teach (matched against the grammar data's titles) */
const N5_GK = { 'n5-01': ['は', 'です', 'AはBです'], 'n5-02': ['か', 'じゃない', 'じゃありません', 'ではありません', '何', '誰'], 'n5-03': ['これ', 'それ', 'あれ', 'どれ', 'この', 'その', 'あの', 'どの', 'こそあど'], 'n5-04': ['の'],
  'n5-05': ['ここ', 'そこ', 'あそこ', 'どこ'], 'n5-06': ['いくら'], 'n5-07': ['から', 'まで', 'からまで'], 'n5-08': ['へ', 'ます', 'ません', 'に行く'], 'n5-09': ['を'], 'n5-10': ['で', 'に'],
  'n5-11': ['ました', 'ませんでした', 'と'], 'n5-12': ['い-adjectives', 'い形容詞', 'くない', 'とても', 'あまり'], 'n5-13': ['な-adjectives', 'な形容詞'], 'n5-14': ['あります', 'います', 'ある', 'いる', 'がある', 'がいる'],
  'n5-15': ['が', 'が好き', 'が上手', 'が分かる'], 'n5-16': ['たい', 'たいです'], 'n5-17': ['ませんか', 'ましょう', 'ましょうか'], 'n5-18': ['てください', 'て-form'], 'n5-19': ['ている', 'ています'],
  'n5-20': ['てもいい', 'てもいいです', 'てはいけない', 'てはいけません', 'ないでください'], 'n5-21': ['かった', 'でした'], 'n5-22': ['より', 'ほうが', 'のほうが', '一番', 'どちら'], 'n5-23': ['から', 'が', 'でも'] };
const gKey = g => String(gSplitTitle(g.t).jp || g.t).replace(/[〜～…・\s()（）＋+]/g, '').split(/[\/／,、]/)[0];
const coreCovers = g => { const k = gKey(g).replace(/(です)?[。.]$/, ''); return !!k && Object.values(N5_GK).some(ts => ts.includes(k)); };
let PLAN = {};
function planUnits(l) {
  // a word listed twice (in this level, or already in an easier one) is taught once
  const lower = new Set(LV.slice(0, LV.indexOf(l)).flatMap(k => [...(DATA.vocab[k] || []).map(x => x.id), ...planUnits(k).flatMap(u => (u.items || []).map(x => x.id))])), once = new Set();
  const words = (DATA.vocab[l] || []).filter(x => x.w && x.m && !lower.has(x.id) && !once.has(x.id) && once.add(x.id)), gram = (DATA.grammar[l] || []).filter(g => g.m), kan = K.filter(k => k.lvl === l);
  const dkey = ANKI.items.length ? ANKI.planKey : '';
  const sig = [words.length, gram.length, kan.length, V.length, dkey].join(':');
  if (PLAN[l] && PLAN[l].sig === sig) return PLAN[l].units;
  const taught = new Set(), core = [];
  if (l === 'N5') PATH_N5.forEach(u => { Object.assign(u, { lvl: 'N5', tr: 'jlpt', core: true, g: [] }); u.items = u.w.map(([w, r, m]) => pathWord(w, r, m, 'N5')); u.items.forEach(x => taught.add(x.id)); core.push(u); });
  // grammar comes alphabetically from the source; teach it simplest first: short patterns with short, plain examples
  const gDiff = g => { const ex = g.ex.map(e => plain(e.j)); const len = ex.length ? ex.reduce((a, t) => a + t.length, 0) / ex.length : 30; const hard = ex.join('').split('').filter(c => isK(c) && (!KMAP[c] || LV.indexOf(KMAP[c].lvl) < LV.indexOf(l))).length / Math.max(1, ex.length); return len + gKey(g).length * 3 + hard * 4; };
  const restG = gram.filter(g => !(l === 'N5' && coreCovers(g))).map(g => [g, gDiff(g)]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const restW = words.filter(x => !taught.has(x.id)).sort((a, b) => b.freq - a.freq || (a.seq || 0) - (b.seq || 0));
  let lessons, known = [], baseCount = 0;
  const base = genLessons(l, restG, restW, words, 'c');
  if (!dkey) lessons = core.concat(base);
  else {
    /* With an Anki deck the level is re-planned around it:
       - lessons you've already finished stay exactly as they were;
       - words you already know in Anki count as covered and aren't taught again;
       - the deck's other words come first, in the deck's order, so the Path teaches what you're studying in Anki now. */
    baseCount = core.length + base.length;
    const kept = base.filter(u => pathSt.done[u.id]);
    const usedW = new Set(kept.flatMap(u => u.items.map(x => x.id))), usedG = new Set(kept.flatMap(u => u.g));
    known = restW.filter(x => !usedW.has(x.id) && ANKI.known.has(x.id));
    const kn = new Set(known.map(x => x.id)), rk = x => ANKI.rank.has(x.id) ? ANKI.rank.get(x.id) : 1e9;
    const todo = restW.filter(x => !usedW.has(x.id) && !kn.has(x.id)).map((x, i) => [x, i]).sort((a, b) => (rk(a[0]) - rk(b[0])) || a[1] - b[1]).map(a => a[0]);
    lessons = core.concat(kept, genLessons(l, restG.filter(g => !usedG.has(g)), todo, words, 'a'));
  }
  // kanji: each one taught with the first lesson that has a word using it; any left over join the lessons with the fewest
  const kset = new Set(kan.map(k => k.k)), kdone = new Set();
  lessons.forEach(u => { u.kan = [...new Set(u.items.flatMap(x => hanOf(x.w)))].filter(c => kset.has(c) && !kdone.has(c)).slice(0, 6); u.kan.forEach(c => kdone.add(c)); });
  const leftK = kan.filter(k => !kdone.has(k.k));
  const gen = lessons.filter(u => u.gen), tgt = gen.length ? gen : lessons;
  leftK.forEach(k => { const u = tgt.slice().sort((a, b) => a.kan.length - b.kan.length)[0]; if (u) { u.kan.push(k.k); kdone.add(k.k); } });
  lessons.forEach((u, i) => { u.n = i + 1; u.kanji = u.kan.map(c => KMAP[c]).filter(Boolean); });
  // stages with a checkpoint after each, then the level's mock exam
  const units = [];
  for (let i = 0, s = 1; i < lessons.length; i += STAGE, s++) {
    const members = lessons.slice(i, i + STAGE); members.forEach(u => { u.stage = s; units.push(u); });
    const same = members.every(m => m.core || /-c\d/.test(m.id));   // a stage made only of unchanged lessons keeps its checkpoint (and your score)
    units.push({ id: `${l.toLowerCase()}-${same ? '' : 'a'}cp${String(s).padStart(2, '0')}`, cp: true, lvl: l, tr: 'jlpt', stage: s, members, t: `Checkpoint ${s}`, s: `Review lessons ${members[0].n}–${members[members.length - 1].n}. Score ${CP_PASS}% to clear it.` });
  }
  if (lessons.length) units.push({ id: `${l.toLowerCase()}-exam`, exam: true, lvl: l, tr: 'jlpt', t: `${l} mock exam`, s: `A full JLPT-style ${l} exam. Aim for 80% or more before the real thing.` });
  PLAN[l] = { sig, units, known, stats: { words: words.length, kanji: kan.length, grammar: gram.length, lessons: lessons.length, known: known.length, saved: dkey ? Math.max(0, baseCount - lessons.length) : 0, deckFirst: dkey ? lessons.filter(u => !u.core && u.items.some(x => x.dk)).length : 0 } };
  return units;
}
/** coverage lessons for a level: about 12 words and one or two grammar points each, with real example sentences */
function genLessons(l, restG, restW, words, pre) {
  const nGen = Math.max(restG.length ? Math.ceil(restG.length / 2) : 0, Math.ceil(restW.length / WPU));
  const gen = Array.from({ length: nGen }, (_, i) => ({ id: `${l.toLowerCase()}-${pre}${String(i + 1).padStart(3, '0')}`, gen: true, lvl: l, tr: 'jlpt', g: [], items: [] }));
  restG.forEach((g, i) => gen[Math.floor(i * nGen / restG.length)].g.push(g));
  const pool = new Set(restW);
  gen.forEach(u => {   // words used in the lesson's grammar examples first, so the reading makes sense
    const text = u.g.flatMap(g => g.ex.map(e => plain(e.j))).join('\n');
    for (const x of pool) { if (u.items.length >= 4) break; if (x.w.length >= ([...x.w].some(isK) ? 1 : 3) && text.includes(x.w)) { u.items.push(x); pool.delete(x); } }
  });
  const rest = [...pool];
  const target = Math.ceil(restW.length / Math.max(1, nGen));
  gen.forEach(u => u.items.push(...rest.splice(0, Math.max(0, target - u.items.length))));
  if (rest.length && gen.length) rest.forEach((x, i) => gen[i % gen.length].items.push(x));
  // a grammar-only lesson still practises a few already-taught words that appear in its examples
  gen.filter(u => !u.items.length).forEach(u => { const text = u.g.flatMap(g => g.ex.map(e => plain(e.j))).join('\n'); u.review = words.filter(x => x.w.length >= 2 && text.includes(x.w)).slice(0, 6); });
  gen.forEach(u => {
    u.t = u.g.length ? u.g.map(g => String(gSplitTitle(g.t).jp || g.t).replace(/\s*[+＋]\s*$/, '').replace(/\s+/g, '').trim()).join('・') : u.items.slice(0, 3).map(x => x.w).join('・');
    u.s = u.g.length ? u.g.map(g => g.m).join(' / ') : `Words: ${u.items.slice(0, 4).map(x => x.m.split(/[;,]/)[0]).join(', ')}`;
  });
  return gen;
}
function travelUnits() {
  const seen = new Set();
  return PATH_TRAVEL.map((u, i) => {
    Object.assign(u, { lvl: 'N5', n: i + 1, tr: 'travel', g: [] });
    u.items = u.w.map(([w, r, m]) => pathWord(w, r, m, 'N5'));
    u.kanji = [...new Set(u.items.flatMap(x => hanOf(x.w)))].filter(c => KMAP[c] && !seen.has(c)).slice(0, 5).map(c => KMAP[c]);
    u.kanji.forEach(k => seen.add(k.k));
    return u;
  });
}
const trackUnits = tr => tr === 'travel' ? travelUnits() : tr === 'anki' ? ankiUnits() : LV.flatMap(planUnits);
const unitById = id => trackUnits(id.startsWith('tr-') ? 'travel' : id.startsWith('ak') ? 'anki' : 'jlpt').find(u => u.id === id);
function unitItems(u) {
  if (u.cp) return { words: u.members.flatMap(m => m.items), kanji: u.members.flatMap(m => m.kanji || []) };
  return { words: (u.items && u.items.length ? u.items : u.review) || [], kanji: u.kanji || [] };
}
const unitLabel = u => u.quiz ? 'Deck quiz' : u.tr === 'anki' ? (u.cp ? `Deck extras · Checkpoint ${u.stage}` : `Deck extras · Lesson ${u.n}`) : u.tr === 'travel' ? `Travel ${u.n}` : u.cp ? `${u.lvl} · Checkpoint ${u.stage}` : u.exam ? `${u.lvl} · Mock exam` : `${u.lvl} · Lesson ${u.n}`;
const bestExam = l => store.get('exams', []).filter(h => h.l === l && h.max).reduce((b, h) => Math.max(b, Math.round(h.total / h.max * 100)), -1);
const unitDone = u => u.exam ? bestExam(u.lvl) >= 80 : u.cp ? !!pathSt.done[u.id] && pathSt.done[u.id].sc >= CP_PASS : !!pathSt.done[u.id];
function nextUnit(tr) {
  const us = trackUnits(tr), pu = tr === 'jlpt' && pathSt.place && pathSt.place.unit;
  let start = pu ? us.findIndex(u => u.id === pu) : 0;
  if (start < 0) {   // the placement lesson was re-planned (an Anki deck was added): start at the same point of its level
    const m = /^(n\d)-[ca](\d+)$/.exec(pu), lv = us.filter(u => u.lvl && pu.startsWith(u.lvl.toLowerCase() + '-'));
    const gen = lv.filter(u => u.gen), at = m ? gen[Math.min(gen.length - 1, +m[2] - 1)] : null;
    start = Math.max(0, us.indexOf(at || lv[0]));
  }
  const need = u => !unitDone(u) && !unitKnown(u);   // lessons whose words you already know are skipped
  return us.slice(start).find(need) || us.find(need) || us.find(u => !unitDone(u)) || us[us.length - 1];
}
const loadPathData = () => DATA.mode === 'full' ? Promise.all([loadAllVocab(), loadGrammar(LV)]).catch(() => {}) : Promise.resolve();
/** how much of a level the finished lessons have taught */
function levelCoverage(l) {
  planUnits(l); const P = PLAN[l]; if (!P) return null;
  const done = P.units.filter(u => !u.cp && !u.exam && pathSt.done[u.id]);
  const w = new Set([...done.flatMap(u => u.items.filter(x => x.lvl === l).map(x => x.id)), ...(P.known || []).map(x => x.id)]).size;   // words known from an Anki deck count as covered
  const k = new Set(done.flatMap(u => u.kan)).size;
  const g = done.reduce((a, u) => a + (u.core ? (N5_GK[u.id] ? 1 : 0) : u.g.length), 0);
  return { w, k, g, ...P.stats, lessonsDone: done.length };
}

/* ---------- Path view ---------- */
const LEVEL_NAME = { N5: 'Foundations', N4: 'Everyday Japanese', N3: 'Bridging to real Japanese', N2: 'Newspapers and work', N1: 'Fluent reading' };
/** which skills a lesson covers, from what it actually contains */
function unitSkills(u) {
  if (u.exam || u.cp) return '';
  const sk = [(u.core || (u.g || []).length) && 'Grammar', (u.items || []).length && 'Words', (u.kan || []).length && 'Kanji', (u.tk || []).length && 'Speaking'].filter(Boolean);
  return sk.length ? `<span class="usk">${sk.map(s => `<i>${s}</i>`).join('')}</span>` : '';
}
function vPath() {
  const tr = S.ptab === 'anki' && !ANKI.decks.length ? 'jlpt' : S.ptab || 'jlpt', us = trackUnits(tr), cur = us.length ? nextUnit(tr) : null;
  const pl = pathSt.place;
  const placeCard = tr !== 'jlpt' ? '' : pl
    ? `<div class="card pcheck done"><div><b>Placement: start at ${esc(pl.label)}</b><span>${esc(pl.note || '')}</span></div><button class="btn line sm" onclick="App.placeStart()">Retake</button></div>`
    : `<div class="card pcheck"><div><b>Not sure where to start?</b><span>A 10-minute JLPT-style check of your kana, words, kanji, grammar and reading finds the right lesson for you.${(() => { if (!ANKI.known.size) return ''; const best = LV.map(l => { planUnits(l); const P = PLAN[l]; return P && P.stats.words ? [l, Math.round(P.stats.known / P.stats.words * 100)] : null; }).filter(Boolean).sort((a, b) => b[1] - a[1])[0]; return best && best[1] >= 25 ? ` Your Anki deck shows you already know ${best[1]}% of ${best[0]} words, so the check may start you further along.` : ''; })()}</span></div><button class="btn sm" onclick="App.placeStart()">Take the check</button></div>`;
  const row = u => {
    const d = pathSt.done[u.id], ok = unitDone(u), isCur = u === cur, kn = !ok && !isCur && unitKnown(u);
    const mark = u.exam ? '試' : u.cp ? (ok ? '✓' : '★') : ok || kn ? '✓' : u.n;
    const right = isCur ? 'Start' : kn ? 'Known' : u.exam ? (bestExam(u.lvl) >= 0 ? `Best ${bestExam(u.lvl)}%` : '') : d ? (gameOn() ? starHtml(game.stars[u.id] || starsFor(d.sc)) : `${d.sc}%`) : '';
    return `<button class="unit${ok ? ' done' : ''}${kn ? ' known' : ''}${isCur ? ' cur' : ''}${u.cp ? ' cp' : ''}${u.exam ? ' exam' : ''}" onclick="App.lesson('${u.id}')" style="--lc:${lcVar(u.lvl)}"><span class="un">${mark}</span><span class="ut"><b>${esc(u.t)}</b><span>${esc(u.s)}</span>${unitSkills(u)}</span><span class="ugo">${right}</span></button>`;
  };
  let body;
  if (tr === 'travel') body = `<div class="ulist boxed">${us.map(row).join('')}</div>`;
  else if (tr === 'anki') body = `<div class="card dq-cta"><div><b>Quiz my decks</b><span>Test yourself on everything in your Anki decks: meaning, reading, listening, pictures and sentences.</span></div><button class="btn sm" onclick="App.dquiz()">Start</button></div>` + ANKI.decks.map(d => { const du = us.filter(u => u.deck === d.name), st = [...new Set(du.map(u => u.stage))], all = ANKI.items.filter(x => inDecks(x, new Set([d.id]))), kn = all.filter(x => status(x.id) === 'known').length;
      const ex = all.filter(x => x.lvl === 'ANKI'), knx = ex.filter(x => status(x.id) === 'known').length;
      return `<div class="card ak-sum"><b>${esc(d.name)}</b><span>${fmtN(all.length - ex.length)} of its words are JLPT words: the JLPT course teaches them (your deck’s first), so nothing is taught twice. ${ex.length ? `The other ${fmtN(ex.length)} are here, in your deck’s order${knx ? `; ${fmtN(knx)} you already know are skipped` : ''}.` : 'It has no other words, so there’s nothing extra to learn here.'}</span></div>
        ${st.map(s => `<div class="stage-h">Stage ${s}</div><div class="ulist">${du.filter(u => u.stage === s).map(row).join('')}</div>`).join('')}`; }).join('');
  else body = LV.map(l => {
    const lu = us.filter(u => u.lvl === l), c = lu.length ? levelCoverage(l) : null, open = lu.includes(cur) || (S.popen || {})[l];
    const empty = !lu.length ? `<p class="note">${DATA.mode === 'full' ? 'Loading this level…' : `${l} lessons are built from the full word, kanji and grammar data, which loads once the GitHub Action has run.`}</p>` : '';
    const bar = (lab, a, b) => `<div class="cov"><span>${lab}</span><div class="pbar"><i style="width:${b ? a / b * 100 : 0}%"></i></div><b>${a} / ${b}</b></div>`;
    const stages = [...new Set(lu.filter(u => u.stage).map(u => u.stage))];
    return `<details class="plevel" style="--lc:${lcVar(l)}"${open ? ' open' : ''} ontoggle="(S.popen=S.popen||{})['${l}']=this.open"><summary><span class="tag lv">${l}</span><b>${LEVEL_NAME[l]}</b><span class="pl-n">${c ? `${c.lessonsDone} / ${c.lessons} lessons · ${c.lessons ? Math.round(100 * c.lessonsDone / c.lessons) : 0}%` : ''}</span></summary>${empty}
      ${c ? `<div class="pl-plan"><p>Covers every ${l} word, kanji and grammar point: ${c.lessons} lessons in ${stages.length} stage${stages.length === 1 ? '' : 's'}, a checkpoint after each stage, then a full mock exam. About ${Math.round(c.lessons * 15 / 60)} hours at 15 minutes a lesson.</p>${bar('Words', c.w, c.words)}${bar('Kanji', c.k, c.kanji)}${c.known || c.deckFirst ? `<p class="note ak-note"><b>Planned around your Anki deck.</b> ${c.known ? `${fmtN(c.known)} words you already know there count as covered and aren’t taught again${c.saved ? `, so this level is ${fmtN(c.saved)} lesson${c.saved === 1 ? '' : 's'} shorter` : ''}. ` : ''}${c.deckFirst ? `The coming lessons teach your deck’s other ${l} words first, in your deck’s order.` : ''} Lessons you’ve finished stay as they were.</p>` : ''}</div>` : ''}
      ${stages.map(s => `<div class="stage-h">Stage ${s}</div><div class="ulist">${lu.filter(u => u.stage === s).map(row).join('')}</div>`).join('')}
      ${lu.filter(u => u.exam).map(u => `<div class="ulist">${row(u)}</div>`).join('')}</details>`;
  }).join('');
  return `<button class="ghost backbtn" onclick="App.go('learn')">‹ Learn</button><h1>Path</h1><p class="sub">Short lessons that teach one pattern, the words that go with it and their kanji, then let you read them together. Finish a level’s Path and you’re ready for that JLPT exam.</p>
  ${placeCard}
  <div class="seg ptabs"><button class="${tr === 'jlpt' ? 'on' : ''}" onclick="App.ptab('jlpt')">JLPT course</button><button class="${tr === 'travel' ? 'on' : ''}" onclick="App.ptab('travel')">Travel Japanese</button>${ANKI.decks.length ? `<button class="${tr === 'anki' ? 'on' : ''}" onclick="App.ptab('anki')">My decks</button>` : ''}</div>
  ${cur ? `<div class="card pnext" style="--lc:${lcVar(cur.lvl)}"><div class="pn-k">${unitDone(cur) ? 'Review' : 'Up next'} · ${esc(unitLabel(cur))}</div><div class="pn-t">${esc(cur.t)}</div><div class="pn-s">${esc(cur.s)}</div><button class="btn" onclick="App.lesson('${cur.id}')">${cur.exam ? 'Start the mock exam' : cur.cp ? 'Start the checkpoint' : 'Start lesson · about 15 min'}</button></div>` : ''}
  ${body}`;
}

const STEP_NAME = { pat: 'Pattern', words: 'Words', kanji: 'Kanji', read: 'Read', talk: 'Talk', quiz: 'Practice', done: 'Done' };
/* after a sentence question the word card doesn't help (the answer is the sentence, not the word): show the whole sentence in order instead, if it isn't on screen yet */
const qAfter = (q, chosen) => !q.noCard ? answerCard(q.item, lookPicked(q, chosen)) : q.fullM ? `<div class="ansc anss"><div class="ac-body"><div class="ac-sent jp">${ruby(fillFuri(q.fullM), true)}</div></div></div>` : '';
/* compact answer card after a quiz question: how to say it, what it means, a word to hang it on */
function answerCard(x, wrong) {
  if (!x) return '';
  let inner = '';
  if (x.kind === 'kanji') {
    const ex = (x.ex || [])[0], on = x.on.slice(0, 3), kun = x.kun.slice(0, 3);
    inner = `<div class="ac-big jp">${esc(x.k)}</div><div class="ac-body"><div class="ac-m">${esc(x.mean.slice(0, 3).join('; '))}</div>
      ${on.length ? `<div class="ac-r"><b>On</b><span class="jp">${esc(on.join('、'))}</span><span class="ac-ro">${esc(on.map(toRomaji).join(', '))}</span></div>` : ''}
      ${kun.length ? `<div class="ac-r"><b>Kun</b><span class="jp">${kunHtml(kun)}</span><span class="ac-ro">${esc(kun.map(r => toRomaji(r)).join(', '))}</span></div>` : ''}
      ${ex ? `<div class="ac-ex">e.g. <span class="jp">${ruby(furi(ex.w, ex.r), true)}</span> <span class="ac-ro">${esc(toRomaji(ex.r))}</span> ${esc(String(ex.m || '').split(/[;,]/)[0])}</div>` : ''}${lookLine(x, wrong)}</div>`;
  } else if (x.kind === 'vocab') {
    inner = `<div class="ac-big jp ac-word">${ruby(x.f || x.w, true)}</div><div class="ac-body"><div class="ac-r"><span class="jp">${esc(x.r)}</span><span class="ac-ro">${esc(toRomaji(x.r))}</span>${sayBtn(x.au)}</div><div class="ac-m">${esc(x.m)}</div></div>`;
  } else if (x.kind === 'grammar') {
    inner = `<div class="ac-body"><div class="ac-g">${gTitleHtml(x.t)}</div><div class="ac-m">${esc(x.m)}</div>${x.fm ? `<div class="ac-ro">${esc(x.fm)}</div>` : ''}</div>`;
  } else if (x.kind === 'kana') {
    inner = `<div class="ac-big jp">${esc(x.ch)}</div><div class="ac-body"><div class="ac-m">${esc(x.ro)}</div>${x.other ? `<div class="ac-ro">${x.script === 'h' ? 'Katakana' : 'Hiragana'}: <span class="jp">${esc(x.other)}</span></div>` : ''}</div>`;
  }
  return inner ? `<button class="ansc" data-open="${esc(x.id)}" title="Open the full entry">${inner}<span class="ac-more">Full entry ›</span></button>` : '';
}
function startLesson(id) {
  const u = unitById(id); if (!u) return;
  if (u.exam) { S.examLv = u.lvl; S.view = 'exam'; render(); return startExam({ type: 'full' }); }
  const { words, kanji } = unitItems(u);
  const steps = u.cp ? ['quiz', 'done'] : [...(u.core || u.g.length ? ['pat'] : []), ...(words.length ? ['words'] : []), ...(kanji.length ? ['kanji'] : []), ...(lessonLines(u).length ? ['read'] : []), ...(u.tk && u.tk.length ? ['talk'] : []), 'quiz', 'done'];
  S.lesson = { u, words, kanji, steps, i: 0, showEn: {}, quiz: null, xp0: game.xp };
  S.view = 'lesson'; render(); window.scrollTo(0, 0);
}
/** reading lines: the hand-written text, or the grammar's examples plus real example sentences for the lesson's words (with native audio where there is a recording) */
function lessonLines(u) {
  if (u.rd) return u.rd.map(([j, e]) => ({ j, e }));
  if (u.lines) return u.lines;
  const out = [];
  u.g.forEach(g => g.ex.slice(0, 2).forEach(e => out.push({ j: e.j, e: e.e || '' })));
  for (const x of u.items) { if (out.length >= 7) break; const e = (x.ex || []).find(e => e.e && plain(e.j).length <= 40); if (e) out.push({ j: e.j, e: e.e, au: e.au ? 's' + e.au : e.dau || null, p: e.dpic || null, w: x }); }
  return out;
}
/** JLPT-style question from the exam generators, in the lesson's question format */
function examStyleQ(key, x, l, pool) {
  const g = EXAM_GEN[key]; if (!g) return null;
  const q = g(x, l, pool); if (!q) return null;
  const sec = EXAM_SECTIONS.find(s => s.key === key);
  return { item: q.item, noCard: key === 'ord' || key === 'li', fullM: q.fullM, au: (q.item && q.item.au) || null, hint: sec ? sec.instrEn : '', grid: key !== 'ik' && key !== 'li', meta: sec ? `<span class="tag">${sec.jp}</span>` : '',
    prompt: `${sec ? `<div class="exinstr jp">${sec.instr}</div>` : ''}${q.prompt}`, opts: q.opts.map((h, i) => ({ html: h, ok: i === q.ans })), sk: key };
}
/** reading comprehension: which English matches this sentence? */
function readQ(x, pool) {
  // the easiest fitting sentence: fewest kanji above the word's level, then the shortest
  const li = Math.max(0, LV.indexOf(x.lvl)), hard = j => [...plain(j)].filter(c => isK(c) && !(KMAP[c] && LV.indexOf(KMAP[c].lvl) >= 0 && LV.indexOf(KMAP[c].lvl) <= li)).length;
  const e = (x.ex || []).filter(e => e.e && plain(e.j).length >= 8 && plain(e.j).length <= 45).map(e => [hard(e.j), plain(e.j).length, e]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(r => r[2])[0]; if (!e) return null;
  const others = shuffle(pool.filter(y => y !== x).map(y => (y.ex || []).find(f => f.e && f.e !== e.e)).filter(Boolean)).slice(0, 3);
  if (others.length < 3) return null;
  const opts = shuffle([{ html: esc(e.e), ok: true }, ...others.map(f => ({ html: esc(f.e), ok: false }))]);
  return { item: x, noCard: true, hint: 'What does this sentence mean?', grid: false, meta: '<span class="tag">読解</span>', prompt: `<div class="psent jp">${ruby(exMarkup(e), true)}</div>`, opts, sk: 'r', au: e.dau ? e.dau : e.au ? 's' + e.au : null };
}
function lessonQuiz(L) {
  const u = L.u, qs = [], add = q => q && qs.push(q);
  const pool = (DATA.vocab[u.lvl] || V).filter(x => x.w), words = L.words;
  if (u.cp) {
    // checkpoint: everything from the stage, JLPT-style where possible
    shuffle(words).slice(0, 6).forEach((x, i) => add(makeQ('vocab', x, i % 2 ? 'en2jp' : 'jp2en')));
    shuffle(words).slice(0, 4).forEach(x => add(examStyleQ('kr', x, u.lvl, pool) || makeQ('vocab', x, 'jp2en')));
    shuffle(words).slice(0, 2).forEach(x => add(examStyleQ('bm', x, u.lvl, pool)));
    shuffle(L.kanji).slice(0, 4).forEach(k => add(makeQ('kanji', k, 'k2m')));
    const gs = u.members.flatMap(m => m.g || []); shuffle(gs).slice(0, 3).forEach(g => add(makeGrammarQ(g, 'gfill')));
    u.members.filter(m => m.cz).forEach(m => add(clozeQ(pick(m.cz))));
    shuffle(words).slice(0, 3).forEach(x => add(readQ(x, pool)));
    return { qs: shuffle(qs).slice(0, 22), i: 0, answered: false, chosen: -1, ok: 0, n: 0, missed: [] };
  }
  // a couple of words from earlier lessons in this track, so they keep coming back
  const earlier = trackUnits(u.tr).filter(p => p !== u && !p.cp && !p.exam && pathSt.done[p.id]).flatMap(p => unitItems(p).words);
  shuffle(earlier.filter(x => !progress[x.id] || isDue(x.id))).slice(0, 2).forEach(x => { const q = makeQ('vocab', x, 'jp2en'); q.review = true; qs.push(q); });
  if (u.cz) u.cz.forEach(c => add(clozeQ(c)));
  (u.g || []).forEach(g => add(makeGrammarQ(g, 'gfill')));
  shuffle(words).slice(0, 5).forEach((x, i) => add(makeQ('vocab', x, i % 2 ? 'en2jp' : 'jp2en')));
  add(shuffle(words).map(x => examStyleQ('kr', x, u.lvl, pool)).find(Boolean));
  L.kanji.slice(0, 2).forEach(k => add(makeQ('kanji', k, 'k2m')));
  return { qs, i: 0, answered: false, chosen: -1, ok: 0, n: 0, missed: [] };
}
function clozeQ(c) {
  const [sent, opts, ai, en] = c, order = shuffle(opts.map((_, i) => i));
  return { cloze: true, hint: 'Fill the blank', grid: true, meta: '', jp: false,
    prompt: `<div class="psent jp">${ruby(sent.replace('＿', '\u0007'), true).replace('\u0007', '<span class="blank">　</span>')}</div><div class="proma">${esc(en)}</div>`,
    opts: order.map(i => ({ html: `<span class="jp cjp">${ruby(opts[i], true)}</span>`, ok: i === ai })) };
}
const jpLine = j => `<span class="jp">${ruby(fillFuri(j), true)}</span>`;
function vLesson() {
  const L = S.lesson; if (!L) return vPath();
  const u = L.u, step = L.steps[L.i];
  const dots = L.steps.map((s, i) => `<i class="${i < L.i ? 'ok' : i === L.i ? 'cur' : ''}" title="${STEP_NAME[s]}"></i>`).join('');
  const head = `<div class="qtop"><button class="ghost" onclick="App.lessonClose()">✕ Close</button><span class="qtitle">${esc(unitLabel(u))} · ${STEP_NAME[step]}</span><span style="width:34px"></span></div><div class="track lsteps" aria-hidden="true">${dots}</div>`;
  let body = '', next = 'Next';
  if (step === 'pat') {
    const pats = u.core ? null : u.g;
    body = !u.core
      ? `<div class="ls-h"><div class="ls-k">This lesson</div><h2>${esc(u.t)}</h2><p class="hook">Read what it means, look at how it’s built, then find the highlighted part in each example. Spotting it in real sentences is how it sticks.</p></div>${pats.map(g => `<div class="card lpat"><div class="lp-t">${gTitleHtml(g.t)}</div><div class="lp-m">${esc(g.m)}</div>${g.fm ? `<div class="gform">${gFormHtml(g.fm)}</div>` : ''}${g.ex.slice(0, 2).map(e => exHtml(e, g)).join('')}</div>`).join('')}`
      : `<div class="ls-h"><div class="ls-k">${esc(u.t)}</div><h2>${esc(u.s)}</h2>${SIMPLE[u.id] ? `<p class="hook">${esc(SIMPLE[u.id].hook)}</p>` : ''}</div>
        <div class="card lpat"><div class="lp-t jp">${ruby(u.pat, true)}</div><div class="lp-m">${esc(u.pm)}</div></div>
        <ul class="lpts">${((SIMPLE[u.id] || {}).pts || u.pts).map(p => `<li>${ruby(p, true)}</li>`).join('')}</ul>
        <div class="label">Examples</div>${u.ex.map(([j, e]) => `<div class="lex ex"><div class="jp">${ruby(j, true)}</div><span class="en">${esc(e)}</span></div>`).join('')}`;
  } else if (step === 'words') {
    body = `<div class="ls-h"><div class="ls-k">${u.items && !u.items.length ? 'Words in this lesson’s examples' : 'New words'}</div><h2>${L.words.length} words for this lesson</h2><p class="note">Say each one out loud. Tap a card for the full entry.</p></div>
      <div class="lwords">${L.words.map(x => `<button class="lword" data-open="${esc(x.id)}">${hasPic(x) ? `<span class="lw-pic">${wordPic(x, 'md')}</span>` : (anyPic() ? '<span class="lw-pic none"></span>' : '')}<span class="lw-w jp">${ruby(x.f || x.w, true)}</span><span class="lw-r">${esc(toRomaji(x.r))}</span><span class="lw-m">${esc(x.m)}</span>${status(x.id) === 'known' ? '<span class="lw-known">✓ you know this</span>' : ''}${sayBtn(x.au)}</button>`).join('')}</div>`;
  } else if (step === 'kanji') {
    body = `<div class="ls-h"><div class="ls-k">Kanji in these words</div><h2>${L.kanji.map(k => k.k).join(' ')}</h2><p class="note">Learn each kanji through a word you already know. Tap one for its story, parts and stroke order.</p></div>
      <div class="lkanji">${L.kanji.map(k => { const w = L.words.find(x => x.w.includes(k.k));
        return `<button class="lk" data-open="k:${esc(k.k)}"><span class="lk-k jp">${k.k}</span><span class="lk-b"><b>${esc(k.mean.slice(0, 2).join(', '))}</b><span class="jp">${esc([...k.on.slice(0, 1).map(kataOf), ...k.kun.slice(0, 1)].join('・'))}</span>${k.og ? (k.og.t === 'S' ? (k.og.sem || k.og.pho ? `<span class="lk-o">${k.og.sem ? `${esc(k.og.sem)} gives the meaning` : ''}${k.og.sem && k.og.pho ? ', ' : ''}${k.og.pho ? `${esc(k.og.pho)} gives the sound` : ''}</span>` : '') : k.og.h ? `<span class="lk-o">${esc(k.og.h)}</span>` : '') : ''}${w ? `<span class="lk-w">in <span class="jp">${esc(w.w)}</span> ${esc(w.m.split(/[;,]/)[0])}</span>` : ''}</span></button>${kpStrip(k.k, 'sm')}`; }).join('')}</div>`;
  } else if (step === 'read') {
    const lines = lessonLines(u).map(x => [x.j, x.e, x.au, x.p]);
    body = `<div class="ls-h"><div class="ls-k">Read</div><h2>Read it out loud</h2><p class="note">Try each line first. Tap “English” only if you need it, and tap any kanji to look it up.</p></div>
      <div class="lread">${lines.map(([j, e, au, pic], i) => `<div class="lline ex">${pic && settings.pics ? `<img class="pic dpic exp" data-dpic="${esc(pic)}" alt="">` : ''}<div class="jp">${u.core || u.rd ? ruby(j, true) : jpLine(j)}${au ? sayBtn(au) : ''}</div>${e ? `<button class="ghost len${L.showEn[i] ? ' on' : ''}" onclick="App.lessonEn(${i})">${L.showEn[i] ? esc(e) : 'English'}</button>` : ''}</div>`).join('')}</div>`;
  } else if (step === 'talk') {
    body = `<div class="ls-h"><div class="ls-k">Conversation</div><h2>Hear it in a conversation</h2><p class="note">Read both parts. Then cover one side and say it yourself.</p></div>
      <div class="ltalk">${u.tk.map(([who, j, e], i) => { const me = who === 'B' || who === 'You'; return `<div class="bub${me ? ' me' : ''}"><span class="who">${esc(who)}</span><div class="ex"><div class="jp">${ruby(j, true)}</div></div><button class="ghost len${L.showEn['t' + i] ? ' on' : ''}" onclick="App.lessonEn('t${i}')">${L.showEn['t' + i] ? esc(e) : 'English'}</button></div>`; }).join('')}</div>`;
  } else if (step === 'quiz') {
    if (!L.quiz) L.quiz = lessonQuiz(L);
    const Q = L.quiz, q = Q.qs[Q.i];
    if (!q) { L.i++; return vLesson(); }
    const opts = q.opts.map((o, i) => { let c = 'choice'; if (Q.answered) c += (o.ok ? ' ok' : i === Q.chosen ? ' bad' : ' dim') + (i === Q.chosen ? ' picked' : ''); return `<button class="${c}" onclick="App.lessonAns(${i})"${Q.answered ? ' disabled' : ''}><span class="n">${i + 1}</span><span>${o.html}</span></button>`; }).join('');
    const ok = Q.answered && q.opts[Q.chosen].ok, right = (q.opts.find(o => o.ok) || {}).html || '';
    body = `<div class="ls-h"><div class="ls-k">Practice · ${Q.i + 1} of ${Q.qs.length}${q.review ? ' · from an earlier unit' : ''}</div></div>
      <div class="card prompt">${q.prompt}${q.meta ? `<div class="pmeta">${q.meta}</div>` : ''}${Q.answered ? sayBtn(q.au, 'say') : ''}</div>
      <div class="hint">${q.hint || ''}</div><div class="choices ${q.grid ? 'grid2' : ''}">${opts}</div>
      ${Q.answered ? qAfter(q, Q.chosen) : ''}${Q.answered ? `<div class="feedback ${ok ? 'good' : 'bad'}" role="status"><div class="fv">${ok ? pick(['正解! Correct', 'いいね! Nice', 'すごい! Great']) + (gameOn() && game.combo >= 2 ? ` · ×${game.combo} combo` : '') : 'おしい! Not quite'}<small>${ok ? '' : 'Answer: '}${ok ? '' : right}</small></div><button class="btn" onclick="App.lessonQNext()">${Q.i + 1 < Q.qs.length ? 'Next' : 'Finish'}</button></div>` : ''}`;
    return `${head}<div class="lesson">${body}</div>`;
  } else if (step === 'done') {
    const Q = L.quiz || { ok: 0, n: 0, missed: [] }, pct = Q.n ? Math.round(Q.ok / Q.n * 100) : 100;
    if (!L.saved) finishLesson(L, pct);
    const nu = nextUnit(u.tr);
    body = `<div class="card score"><div class="arrive">${u.cp ? (pct >= CP_PASS ? '合格' : 'もう少し') : '終点'}</div><div class="muted">${esc(unitLabel(u))} ${u.cp ? (pct >= CP_PASS ? 'cleared' : 'not cleared yet') : 'complete'}</div>${gameOn() ? `<div class="big stars-big">${starHtml(L.stars || starsFor(pct))}</div><div class="xpline">+${L.xp || 0} XP · ${esc(beltOf(game.xp).name)}</div>` : ''}<div class="big">${pct}%</div><div>${Q.ok} of ${Q.n} right${u.cp ? ` · ${CP_PASS}% clears it` : ' in practice'}</div></div>
      <p class="note" style="text-align:center">${u.quiz ? 'Every answer updated that word’s review schedule. Words you missed come back sooner.' : u.cp ? (pct >= CP_PASS ? 'Stage cleared. Everything in it stays in your reviews.' : 'Look over the items below, do your reviews, then try the checkpoint again. Missed items are already back in your reviews.') : `${L.words.length} words${L.kanji.length ? ` and ${L.kanji.length} kanji` : ''} from this lesson are now in your reviews. They’ll come back on Home when they’re due.`}</p>
      ${Q.missed.length ? `<div class="label">Worth another look</div><div class="list">${[...new Set(Q.missed)].map(x => x.kind === 'kanji' ? `<button class="row" data-open="${esc(x.id)}"><span class="rw jp" style="font-size:24px">${x.k}</span><span class="rm">${esc(x.m)}</span></button>` : vRow(x)).join('')}</div>` : ''}
      ${u.cp && pct < CP_PASS ? `<button class="btn" onclick="App.lesson('${u.id}')">Try the checkpoint again</button>` : ''}${!u.quiz && nu && nu !== u && !unitDone(nu) ? `<button class="btn${u.cp && pct < CP_PASS ? ' line' : ''}" onclick="App.lesson('${nu.id}')">Next: ${esc(nu.t)}</button>` : ''}
      ${u.quiz ? `<button class="btn" onclick="App.dquiz()">Another deck quiz</button>` : ''}${S.fromPlay ? `<button class="btn line" onclick="S.fromPlay=false;S.lesson=null;App.go('play')">🏯 Back to town</button>` : `<button class="btn line" onclick="App.go('path')">Back to Path</button>`}`;
    return `${head}<div class="lesson">${body}</div>`;
  }
  return `${head}<div class="lesson">${body}</div>
    <div class="lnav">${L.i ? `<button class="btn line" onclick="App.lessonStep(-1)">‹ Back</button>` : '<span></span>'}<button class="btn" onclick="App.lessonStep(1)">${L.steps[L.i + 1] === 'quiz' ? 'Practice' : next} ›</button></div>`;
}
function finishLesson(L, pct) {
  if (L.u.quiz) { L.saved = true; L.stars = starsFor(pct); L.xp = game.xp - (L.xp0 ?? game.xp); dayFlag('quiz'); if (gameOn()) setTimeout(() => celebrate(pct >= 90 ? 'すごい! Great quiz' : 'Quiz done', `${L.stars} ★ · +${L.xp} XP`), 150); return; }   // a deck quiz: answers already updated each word's reviews
  L.saved = true;
  schedule.silent = true; for (const x of [...L.words, ...L.kanji]) if (!progress[x.id]) schedule(x, 2); schedule.silent = false;   // new words and kanji join the review schedule
  const prev = pathSt.done[L.u.id];
  pathSt.done[L.u.id] = { d: today(), sc: Math.max(pct, prev ? prev.sc : 0) }; savePath(); if (!L.u.cp || pct >= CP_PASS) dayFlag('lesson');
  L.stars = gameLesson(L.u, pct); L.xp = game.xp - (L.xp0 ?? game.xp);
  if (gameOn()) setTimeout(() => celebrate(L.u.cp ? (pct >= CP_PASS ? 'Stage cleared!' : 'Almost there') : ['よくできました! Well done', 'すごい! Great job', 'やった! Lesson complete'][L.stars - 1] || 'Lesson complete', `${L.stars} ★ · +${L.xp} XP`), 150);
}

/* ---------- placement check ----------
   JLPT-style questions from the mock-exam generators (kanji reading, writing, word in context,
   paraphrase, grammar form, sentence order), reading comprehension and, with the full data, listening.
   About 13 per level, from N5 up; it stops at the first level under 75%. */
const PLACE_COUNTS = { kr: 2, hy: 1, bm: 2, ik: 1, gf: 3, ord: 1 }, PLACE_PASS = 0.75;
const PLACE_SKILL = { kr: 'v', hy: 'v', bm: 'v', ik: 'v', gf: 'g', ord: 'g', li: 'l', r: 'r' };
function placeQs(l) {
  const words = (DATA.vocab[l] || []).filter(x => x.w && x.m), gram = G.filter(g => g.lvl === l), qs = [], used = new Set();
  const common = words.slice().sort((a, b) => b.freq - a.freq).slice(0, 150);
  for (const [key, n] of Object.entries(PLACE_COUNTS)) {
    let k = n;
    const cands = shuffle(key === 'gf' || key === 'ord' ? (key === 'ord' ? gram.concat(common) : gram) : common);
    const pool = key === 'gf' ? (gram.length >= 6 ? gram : G) : words;
    for (const it of cands) { if (k <= 0) break; if (used.has(key + it.id)) continue; const q = examStyleQ(key, it, l, pool); if (q) { q.sk = key; qs.push(q); used.add(key + it.id); k--; } }
  }
  for (const x of shuffle(common)) { if (qs.filter(q => q.sk === 'r').length >= 2) break; const q = readQ(x, common); if (q) qs.push(q); }
  if (DATA.mode === 'full') for (const x of shuffle(common)) { const q = examStyleQ('li', x, l, words); if (q) { q.sk = 'li'; qs.push(q); break; } }
  // kanji: a word written in kanji → its reading, and a kanji → its meaning
  shuffle(K.filter(k => k.lvl === l)).slice(0, 1).forEach(k => { const q = makeQ('kanji', k, 'k2m'); q.sk = 'kj'; qs.push(q); });
  return shuffle(qs);
}
function vPlace() {
  const P = S.place; if (!P) return vPath();
  const head = `<div class="qtop"><button class="ghost" onclick="App.placeQuit()">✕ Close</button><span class="qtitle">Placement check${P.stage === 'run' ? ` · ${P.lv}` : ''}</span><span style="width:34px"></span></div>`;
  if (P.stage === 'intro') return `${head}<div class="lesson"><div class="ls-h"><div class="ls-k">About 10 minutes</div><h2>Let’s find where you should start</h2>
    <p class="note">These are JLPT-style questions: readings, writing, words in context, grammar, sentence order and short reading, plus listening once the full data is built. It starts at N5 and moves up a level each time you score 75% or more, so it gets harder as you go. Don’t guess: “I don’t know” gives a truer result.</p></div>
    <div class="label">Do you know hiragana and katakana?</div>
    <div class="choices"><button class="choice" onclick="App.placeKana(true)"><span>Yes, check me</span></button><button class="choice" onclick="App.placeKana(false)"><span>Not yet, or only some</span></button></div></div>`;
  if (P.stage === 'loading') return `${head}<div class="lesson"><p class="note">Getting ${esc(P.lv)} questions ready…</p></div>`;
  if (P.stage === 'done') {
    const r = P.result;
    return `${head}<div class="lesson"><div class="card score"><div class="arrive">Start here</div><div class="big" style="font-size:34px">${esc(r.label)}</div><div>${esc(r.note)}</div></div>
      ${r.rows.length ? `<div class="label">How you did</div><div class="card placerows">${r.rows.map(x => `<div class="lnrow" style="--lc:${lcVar(x.l)}"><span class="tag lv">${x.l}</span><div class="pbar"><i style="width:${x.pct}%"></i></div><span>${x.pct}%</span></div><div class="psk">${x.parts}</div>`).join('')}</div>` : ''}
      ${r.tip ? `<p class="note">${esc(r.tip)}</p>` : ''}
      ${r.kana ? `<button class="btn" onclick="App.go('kana')">Learn kana first</button>` : ''}
      <button class="btn${r.kana ? ' line' : ''}" onclick="App.lesson('${r.unit}')">Start ${esc(r.label)}</button>
      <button class="btn line" onclick="App.go('path')">See the whole Path</button></div>`;
  }
  const q = P.qs[P.i]; if (!q) return `${head}<div class="lesson"><p class="note">…</p></div>`;
  const opts = q.opts.map((o, i) => { let c = 'choice'; if (P.answered) c += (o.ok ? ' ok' : i === P.chosen ? ' bad' : ' dim'); return `<button class="${c}" onclick="App.placeAns(${i})"${P.answered ? ' disabled' : ''}><span class="n">${i + 1}</span><span>${o.html}</span></button>`; }).join('');
  return `${head}<div class="track lsteps" aria-hidden="true">${P.qs.map((_, i) => `<i class="${i < P.i ? 'ok' : i === P.i ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="lesson"><div class="card prompt">${q.prompt}${q.meta ? `<div class="pmeta">${q.meta}</div>` : ''}${q.sk === 'li' ? sayBtn(q.au, 'say') : ''}</div><div class="hint">${q.hint || ''}</div>
    <div class="choices ${q.grid ? 'grid2' : ''}">${opts}<button class="choice idk${P.answered && P.chosen === -1 ? ' bad' : ''}" onclick="App.placeAns(-1)"${P.answered ? ' disabled' : ''}><span>I don’t know</span></button></div>
    ${P.answered ? `${qAfter(q, P.chosen)}<div class="lnav"><span></span><button class="btn" onclick="App.placeNext()">Next ›</button></div>` : ''}</div>`;
}
async function placeLevel() {
  const P = S.place, l = P.lv;
  P.stage = 'loading'; render();
  if (DATA.mode === 'full') { try { await Promise.all([load('vocab', l), load('grammar', l)]); } catch (e) {} }
  P.qs = placeQs(l); P.i = 0; P.answered = false; P.chosen = -1; P.stage = 'run';
  if (P.qs.length < 5) return placeFinish();   // not enough data for this level (starter set): stop here
  render();
}
function placeFinish() {
  const P = S.place, lab = { v: 'Words', kj: 'Kanji', g: 'Grammar', r: 'Reading', l: 'Listening' };
  const rows = Object.entries(P.tally).map(([l, t]) => ({ l, pct: t.n ? Math.round(t.ok / t.n * 100) : 0, t,
    parts: Object.entries(lab).filter(([k]) => t[k] && t[k][1]).map(([k, n]) => `${n} ${t[k][0]}/${t[k][1]}`).join(' · ') }));
  const last = rows[rows.length - 1], us = trackUnits('jlpt');
  let unit, label, note, tip = '';
  const startIn = (l, pct) => {   // where in a level to start: further in the better you did
    const ls = us.filter(u => u.lvl === l && !u.cp && !u.exam); if (!ls.length) return null;
    const f = Math.max(0, Math.min(0.6, (pct - 40) / 60)), u = ls[Math.floor(f * ls.length)];
    return { u, label: `${l} · Lesson ${u.n}` };
  };
  if (P.kanaWeak) { unit = us[0].id; label = 'N5 · Lesson 1'; note = 'Your kana needs a little more work first. Learn it in the Kana section, then start Lesson 1.'; }
  else if (last && last.pct >= PLACE_PASS * 100) {
    const nl = LV[LV.indexOf(last.l) + 1], s = nl && startIn(nl, 0);
    if (s) { unit = s.u.id; label = s.label; note = `You passed ${last.l} comfortably. ${nl} is where you start.`; }
    else { const e = us.find(u => u.exam && u.lvl === last.l) || us[0]; unit = e.id; label = `${last.l} mock exam`; note = DATA.mode === 'full' ? 'You passed every level. Try the N1 mock exam, or review any lesson you like.' : 'Higher levels need the full data. Start the Path or explore the Library meanwhile.'; }
  } else {
    const l = last ? last.l : 'N5', pct = last ? last.pct : 0, s = startIn(l, pct) || { u: us[0], label: 'N5 · Lesson 1' };
    unit = s.u.id; label = s.label;
    note = pct >= 55 ? `You know a fair amount of ${l}. Start part-way in; earlier lessons stay open if you want to fill gaps.` : l === 'N5' ? 'Start from the first lesson. The early ones go quickly if you already know some of it.' : `You’re solid up to ${LV[LV.indexOf(l) - 1]}. ${l} starts here.`;
  }
  const t = last && last.t, r = k => t && t[k] && t[k][1] ? t[k][0] / t[k][1] : null, rv = r('v');
  if (rv !== null && r('g') !== null && r('g') < rv - 0.25) tip = 'Grammar is behind your vocabulary. Take the Pattern step of each lesson slowly and read every line out loud.';
  else if (rv !== null && r('kj') !== null && r('kj') < rv - 0.25) tip = 'Kanji is behind your vocabulary. Open each kanji’s story in the Kanji step; it makes them stick.';
  else if (rv !== null && r('r') !== null && r('r') < rv - 0.25) tip = 'Reading whole sentences is harder for you than single words. The Read step in each lesson is where that improves.';
  P.result = { unit, label, note, tip, rows, kana: !!P.kanaWeak };
  pathSt.place = { d: today(), unit, label, note }; savePath();
  P.stage = 'done'; render();
}

/* simple explanations for the hand-written lessons: a hook ("why this is fun / useful") and short points a child could follow.
   Furigana markup {漢字|かな} as elsewhere. Facts unchanged from the earlier points; only the wording is simpler. */
const SIMPLE = {
'n5-01': { hook: 'After this lesson you can introduce yourself to anyone in Japan.',
  pts: ['は is a pointing finger. It points at who or what you’re talking about. It’s written は but you say “wa”.', 'です is a polite full stop. Put it at the end and your sentence sounds friendly and polite.', 'So {私|わたし}は {学生|がくせい}です means “Me → student.” = I am a student.', 'Japanese loves to skip the obvious. Everyone knows you mean yourself, so you can just say {学生|がくせい}です.', 'Say さん after other people’s names, like “Mr” or “Ms”. Never after your own name.'] },
'n5-02': { hook: 'One tiny sound turns any sentence into a question.',
  pts: ['Add か to the end and the sentence becomes a question, like raising your voice in English. {学生|がくせい}ですか = Are you a student?', 'Answer with はい (yes) or いいえ (no).', 'To say “not”, swap です for じゃないです. {学生|がくせい}じゃないです = I’m not a student.', 'Question words sit where the answer will go: あの{人|ひと}は {誰|だれ}ですか → あの{人|ひと}は {田中|たなか}さんです.'] },
'n5-03': { hook: 'Point at anything in a shop and ask what it is.',
  pts: ['これ = this thing, close to me.', 'それ = that thing, close to you.', 'あれ = that thing over there, far from both of us.', 'どれ = which one?', 'Glued to a noun they become この, その, あの, どの: この {本|ほん} = this book.'] },
'n5-04': { hook: 'の is one of the most common words in Japanese. You’ll see it everywhere.',
  pts: ['の is like an apostrophe-s. {私|わたし}の {本|ほん} = my book (me’s book).', 'It also means “about” or “of”: {日本語|にほんご}の {先生|せんせい} = a teacher of Japanese.', '{誰|だれ}の = whose?', 'If everyone knows the thing, drop it: {私|わたし}のです = it’s mine.'] },
'n5-05': { hook: 'Never get lost again: ask where anything is.',
  pts: ['ここ = here, そこ = there (near you), あそこ = over there, どこ = where?', 'Notice they match これ, それ, あれ, どれ. Same pattern, for places.', 'Ask: [place] は どこですか. Answer: [place] は あそこです.', 'Start politely with すみません, “excuse me”.'] },
'n5-06': { hook: 'Shopping and prices: numbers you’ll use every single day in Japan.',
  pts: ['Numbers are built like blocks: {十|じゅう} 10, {二十|にじゅう} 20 (two tens), {二十三|にじゅうさん} 23.', 'A few sounds change to be easier to say: {三百|さんびゃく} 300, {六百|ろっぴゃく} 600, {八百|はっぴゃく} 800, {三千|さんぜん} 3,000.', 'Big numbers count in ten-thousands: {一万|いちまん} = 10,000. So {一万円|いちまんえん} is ten thousand yen.', 'いくらですか = how much is it?'] },
'n5-07': { hook: 'Know when the shop opens, when the train leaves, and when to meet.',
  pts: ['{時|じ} = o’clock. {三時|さんじ} = three o’clock. {半|はん} = half past.', 'Three times sound a little different. Learn them as special: {四時|よじ}, {七時|しちじ}, {九時|くじ}.', '{午前|ごぜん} = a.m. and {午後|ごご} = p.m. They go in front: {午後|ごご} {二時|にじ} = 2 p.m.', 'から = from, まで = until. {九時|くじ}から {五時|ごじ}まで = from 9 to 5.'] },
'n5-08': { hook: 'Your first verbs: go, come and go home.',
  pts: ['Polite verbs end in ます. {行|い}く (go) becomes {行|い}きます.', 'To say you don’t: ません. {行|い}きません = I don’t go / won’t go.', 'へ marks where you’re heading, like an arrow →. It’s written へ but you say “e”. に works too.', 'The verb always comes last: {学校|がっこう}へ {行|い}きます = school → go.'] },
'n5-09': { hook: 'Eat, drink, watch, read: talk about your day.',
  pts: ['を marks the thing you do the action to. パンを {食|た}べます = bread ← eat. You say を like “o”.', 'Two easy kinds of verbs to start with:', 'Verbs ending in -eru or -iru usually just drop る: {食|た}べる → {食|た}べます, {見|み}る → {見|み}ます.', 'Most other verbs change their last sound from u to i: {飲|の}む → {飲|の}みます, {買|か}う → {買|か}います.', 'A few sneaky verbs look like the first kind but follow the second: {帰|かえ}る → {帰|かえ}ります, {入|はい}る → {入|はい}ります. The word cards tell you which is which.'] },
'n5-10': { hook: 'Three tiny words that tell where, how and when.',
  pts: ['で = where something happens: {図書館|としょかん}で {勉強|べんきょう}します (study at the library).', 'で also = how you do it: {電車|でんしゃ}で {行|い}きます (go by train).', 'に = at a clock time: {七時|しちじ}に {起|お}きます (get up at seven).', 'Words like {今日|きょう}, {明日|あした}, {毎日|まいにち} don’t need に. They’re already “when” words.'] },
'n5-11': { hook: 'Tell stories about yesterday.',
  pts: ['Past tense is easy: ます → ました. {食|た}べました = I ate.', 'Didn’t: ません → ませんでした. {行|い}きませんでした = I didn’t go.', 'と = with someone: {友達|ともだち}と = with a friend.', 'Time words: {昨日|きのう} yesterday, {先週|せんしゅう} last week, {去年|きょねん} last year.'] },
'n5-12': { hook: 'Describe things: big, small, cheap, delicious.',
  pts: ['These describing words end in い: {高|たか}い (expensive), {安|やす}い (cheap), おいしい (tasty).', 'Put them right before a thing: {高|たか}い {時計|とけい} = an expensive watch.', 'To end a sentence, add です: {高|たか}いです.', 'To say “not”, change い to くない: {高|たか}くないです. One odd one: いい (good) → よくないです.', 'とても = very. あまり … ない = not very.'] },
'n5-13': { hook: 'The other family of describing words.',
  pts: ['Some describing words need な before a thing: {静|しず}かな {町|まち} = a quiet town.', 'At the end of a sentence they act like nouns: {静|しず}かです, {静|しず}かじゃないです.', 'Trick word: きれい ends in い but it’s a な word: きれいな {部屋|へや}.'] },
'n5-14': { hook: 'Say what’s where: in, on, under, next to.',
  pts: ['あります = there is (things that can’t move by themselves: books, shops, trees).', 'います = there is (living things that move: people, cats, dogs).', '[place] に [thing] が あります: {机|つくえ}の {上|うえ}に {本|ほん}が あります = on the desk there is a book.', 'Position words use の: {机|つくえ}の {上|うえ} (on), {下|した} (under), {中|なか} (inside), {前|まえ} (front), {後|うし}ろ (behind), {隣|となり} (next to).'] },
'n5-15': { hook: 'Talk about what you love, hate and are good at.',
  pts: ['With “like” and “good at” words, the thing gets が, not を: {音楽|おんがく}が {好|す}きです.', 'The same for {嫌|きら}い (dislike), {上手|じょうず} (good at), {下手|へた} (bad at), {分|わ}かる (understand).', '{大好|だいす}き = really love. {好|す}きじゃないです is a softer way to say you don’t like something.', 'Japanese people are modest: never call yourself {上手|じょうず}. Say {少|すこ}し {分|わ}かります instead.'] },
'n5-16': { hook: 'Wishes and dreams: “I want to go to Japan!”',
  pts: ['Take a ます verb, swap ます for たいです: {行|い}きます → {行|い}きたいです (want to go).', 'Don’t want to: たくないです.', 'Use it for your own wishes. To ask someone else: {何|なに}を したいですか.'] },
'n5-17': { hook: 'Make plans and invite friends.',
  pts: ['〜ませんか is a polite invitation: “won’t you …?” {行|い}きませんか = won’t you come?', '〜ましょう = let’s … {行|い}きましょう = let’s go!', '〜ましょうか = shall we? or shall I?', 'To say no kindly, just say ちょっと… and let it trail off. Everyone understands.'] },
'n5-18': { hook: 'The て-form is a super-power: you’ll use it in dozens of later lessons.',
  pts: ['て-form + ください = please do it. {待|ま}ってください = please wait.', 'Making it, part 1: -eru / -iru verbs swap る for て: {食|た}べる → {食|た}べて, {見|み}る → {見|み}て.', 'Making it, part 2 (other verbs), by last sound: う・つ・る → って; む・ぶ・ぬ → んで; く → いて; ぐ → いで; す → して.', 'Rule-breakers: {行|い}く → {行|い}って, する → して, {来|く}る → {来|き}て.', 'Tip: sing the endings to a tune. Lots of learners remember them as a little song.'] },
'n5-19': { hook: 'Say what’s happening right now.',
  pts: ['て-form + います = happening now: {雨|あめ}が {降|ふ}っています = it’s raining.', 'It also means a state that keeps going: {東京|とうきょう}に {住|す}んでいます = I live in Tokyo.', 'Same idea: {働|はたら}いています (I work), {結婚|けっこん}しています (I’m married), {知|し}っています (I know).', 'Watch out: “I don’t know” is {知|し}りません.'] },
'n5-20': { hook: 'Ask “may I?” and understand signs and rules.',
  pts: ['て-form + も いいですか = may I …? {座|すわ}っても いいですか = may I sit?', 'Yes: はい、どうぞ (go ahead).', 'て-form + は いけません = you must not … {撮|と}っては いけません = no photos.', 'On signs you’ll often see 〜ないでください = please don’t.'] },
'n5-21': { hook: 'How was it? Talk about your trip, a film, a meal.',
  pts: ['い words: drop い, add かったです. {楽|たの}しい → {楽|たの}しかったです (it was fun).', 'Wasn’t: くなかったです. {寒|さむ}くなかったです (it wasn’t cold).', 'な words and nouns: でした. {静|しず}かでした (it was quiet).', 'いい is the odd one again: よかったです (it was good).'] },
'n5-22': { hook: 'Bigger, faster, best: compare things.',
  pts: ['A より B のほうが … = B is more … than A. バスより {電車|でんしゃ}のほうが {速|はや}いです.', 'Ask which of two: A と B と どちらが …ですか.', 'The best of a group: [group] の {中|なか}で [thing] が {一番|いちばん} … .', 'The describing word never changes. より and {一番|いちばん} do all the work.'] },
'n5-23': { hook: 'Join your ideas: because, and but.',
  pts: ['から = because. Reason から, result: {雨|あめ}ですから、{行|い}きません (it’s raining, so I won’t go).', 'Answer “why?” (どうして) with … からです.', 'が = but, joining two sentences: {高|たか}いですが、おいしいです (expensive but tasty).', 'でも = but, starting a new sentence.'] }
};


