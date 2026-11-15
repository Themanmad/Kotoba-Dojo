/* =====================================================================
   VIEWS
   ===================================================================== */
/* pictures: OpenMoji SVGs (hex ids), Tabler Icons ("t.name") and game-icons.net ("g.artist.name") once built;
   the device's emoji before that (or if an OpenMoji file is missing) */
const picChar = hex => String(hex || '').split('-').map(h => String.fromCodePoint(parseInt(h, 16))).join('');
let PIC3D = new Set();
const isHexPic = id => /^[0-9A-F]{2,}(-[0-9A-F]+)*$/i.test(String(id || ''));
const hanOf = w => [...new Set(String(w).match(/\p{Script=Han}/gu) || [])];
function picHtml(hex, cls = '') {
  if (!hex || !settings.pics) return '';
  const kind = isHexPic(hex) ? 'emoji' : 'icon';
  if (DATA.mode === 'full') {
    const p3 = kind === 'emoji' && settings.picStyle !== 'flat' && PIC3D.has(hex);
    return `<img class="pic ${kind}${p3 ? ' p3d' : ''} ${cls}" src="data/img/${esc(hex)}.${p3 ? 'png' : 'svg'}" alt="" loading="lazy" decoding="async" data-hex="${esc(hex)}" onerror="picFail(this)">`;
  }
  return isHexPic(hex) ? `<span class="pic emo ${cls}" aria-hidden="true">${picChar(hex)}</span>` : '';
}
function picFail(img) {
  if (!isHexPic(img.dataset.hex)) { img.remove(); return; }
  if (/\.png$/.test(img.getAttribute('src'))) { img.classList.remove('p3d'); img.src = `data/img/${img.dataset.hex}.svg`; return; }   // no 3D file: flat picture
  const sp = document.createElement('span'); sp.className = img.className.replace(/\b(emoji|icon)\b/g, '') + ' emo'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = picChar(img.dataset.hex); img.replaceWith(sp);
}
/* credit line for icons whose licence asks for the artist's name */
function picCredit(id) {
  const m = /^g\.([^.]+)\./.exec(String(id || ''));
  if (m) return `Picture: ${esc(m[1].split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '))}, game-icons.net (CC BY 3.0)`;
  if (/^t\./.test(String(id || ''))) return 'Picture: Tabler Icons (MIT)';
  return '';
}
/* a word's own picture (none when its meaning can't be drawn) */
function wordPic(x, cls) { return !settings.pics ? '' : x.dpic ? dpicHtml(x, cls) : x.pic ? picHtml(x.pic, cls) : ''; }
/* line colour for a JLPT level (N5 green … N1 magenta) */
const lcVar = l => /^N[1-5]$/.test(l) ? `var(--n${l[1]})` : 'var(--accent)';
function paintLevels(root) {
  root.querySelectorAll('.tag.lv, .lvl, .sign-no').forEach(el => {
    if (el.style.getPropertyValue('--lc')) return;
    const m = /N([1-5])/.exec(el.textContent); if (m) el.style.setProperty('--lc', `var(--n${m[1]})`);
  });
}
/* settings tucked into one row that summarises the current choice */
const optsBox = (key, summary, inner) => `<details class="opts"${S.open[key] || S.openAll ? ' open' : ''} ontoggle="S.open['${key}']=this.open"><summary><span class="ot">Options</span><span class="os">${summary}</span></summary><div class="ob">${inner}</div></details>`;
const labelOf = (opts, v) => ((opts.find(o => String(o[0]) === String(v)) || [])[1] || '').replace(/<[^>]+>.*$/, '');
/* 駅名標-style word sign */
function stationSign(x, mean) {
  const hasK = [...x.w].some(isK);
  return `<div class="sign" style="--lc:${lcVar(x.lvl)}">
    <div class="sign-top"><span class="sign-no">${esc(lvName(x.lvl))}</span><span class="sign-kana jp">${hasK ? esc(kata2hira(x.r) === x.r ? x.r : x.r) : ''}</span></div>${sayBtn(x.au)}
    ${hasPic(x) ? `<div class="sign-pic">${wordPic(x, 'lg')}</div>${!x.dpic && picCredit(x.pic) ? `<div class="pic-credit">${picCredit(x.pic)}</div>` : ''}` : ''}<div class="sign-word dword jp">${esc(x.w)}</div>
    <div class="sign-band">${esc(toRomaji(x.r))}</div>${mean ? `<div class="sign-mean">${esc(mean)}</div>` : ''}
  </div>`;
}
const seg = (opts, cur, fn) => `<div class="seg">${opts.map(([v, l]) => `<button class="${v === cur ? 'on' : ''}" onclick="${fn}('${v}')">${l}</button>`).join('')}</div>`;
const chips = (opts, cur, fn) => `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${(Array.isArray(cur) ? cur.includes(v) : String(v) === String(cur)) ? 'on' : ''}" onclick="${fn}('${v}')">${l}</button>`).join('')}</div>`;
const levelChips = () => chips(levelsAvail().map(l => [l, `<i class="lcdot" style="background:${lcVar(l)}"></i>${lvName(l)}<small>${fmtN(levelTotal('vocab', l))}</small>`]), settings.levels, 'App.lvToggle');
const loadingSel = () => settings.levels.some(l => !isLoaded('vocab', l));

function weakestSituation() {
  let best = SITUATIONS[0], bestR = 2;
  for (const x of SITUATIONS) { const it = sitItems(x); if (!it.length) continue; const r = it.filter(i => status(i.id) === 'known').length / it.length; if (r < bestR) { bestR = r; best = x; } }
  return best;
}
function vLibrary() {
  const tiles = [['kana', 'あ', 'Kana', 'Hiragana and katakana charts, stroke order and drills'], ['vocab', '語', 'Words', 'Flashcards, quizzes, word lists and everyday situations'], ['kanji', '字', 'Kanji', 'Every JLPT kanji with its story, parts and stroke order'], ['grammar', '文', 'Grammar', 'Grammar points N5–N1 with examples and drills'], ['books', '課', 'Textbooks', 'Genki I & II and Basic Kanji Book, lesson by lesson'], ['conj', '活', 'Conjugation', 'Verb and adjective forms, with the rule behind every answer'], ['read', '読', 'Reading', 'Short passages N5–N1 with exam-style questions'], ['vocab:sit', '場', 'Situations', 'Words grouped by where you’ll hear them'], ['search', '探', 'Search', 'Look up any word, kanji or grammar point']];
  return `<h1>Library</h1><p class="sub">Everything in the app, for looking things up or drilling a weak spot. Your lessons are on the Path.</p>
  <div class="libgrid">${tiles.map(([v, g, t, d]) => { const [view, tab] = v.split(':'); return `<button class="libtile" onclick="App.go('${view}'${tab ? `,'${tab}'` : ''})"><b class="jp">${g}</b><span class="lt-t">${t}</span><span class="lt-d">${d}</span></button>`; }).join('')}</div>`;
}
function vHome() {
  const due = dueCount(), tl = todayLog(), nl = newLeft('vocab'), fresh = vSel().filter(x => !progress[x.id]).length;
  const hK = KANA.filter(x => x.script === 'h'), hKnown = hK.filter(x => status(x.id) === 'known').length;
  const sit = weakestSituation(), lvl = userLevel();
  const examToday = store.get('exams', []).some(h => h.d === today());
  const newNow = Math.min(nl, fresh);
  const pu = nextUnit('jlpt'), tu = nextUnit('travel');
  const stops = [
    pathSt.place || Object.keys(pathSt.done).length
      ? { title: pu.exam ? pu.t : pu.cp ? pu.t : `Lesson: ${pu.t}`, sub: pu.exam || pu.cp ? `${unitLabel(pu)} · ${pu.s}` : `${unitLabel(pu)} · about 15 minutes`, done: flagged('lesson'), go: 'Start', act: `App.lesson('${pu.id}')` }
      : { title: 'Find your starting point', sub: '5-minute placement check', done: false, go: 'Start', act: 'App.placeStart()' },
    ...(settings.book && settings.book.id ? [{ title: `${settings.book.id === 'bkb' ? 'Basic Kanji Book' : 'Genki'} lesson ${settings.book.L}`, sub: settings.book.id === 'bkb' ? esc(BOOKDATA.bkb[settings.book.L - 1][0]) : esc(BK_THEME(settings.book.L)), done: false, go: 'Open', act: `App.bkOpen('${settings.book.id}',${settings.book.L})` }] : []),
    { title: due ? `Review ${fmtN(due)} card${due === 1 ? '' : 's'}` : 'Reviews', sub: due ? 'Words and kanji from your lessons, due today' : 'Nothing due. New words arrive with each lesson', done: !due, go: 'Review', act: "App.go('vocab','cards')" },
    ...(ANKI.decks.length && ankiUnits().length ? (() => { const au = nextUnit('anki'); return [{ title: `Deck extras: ${esc(au.t)}`, sub: `${esc(unitLabel(au))} · words from ${esc(au.deck)}`, done: unitDone(au) && flagged('lesson'), go: 'Start', act: `App.lesson('${au.id}')` }]; })() : []),
    { title: `Travel: ${tu.t}`, sub: tu.s, done: !!pathSt.done[tu.id] && flagged('lesson'), go: 'Open', act: `App.lesson('${tu.id}')` },
    { title: 'Mock exam', sub: examToday ? 'Taken today' : `${lvl} · JLPT-style, timed`, done: examToday, go: 'Sit it', act: "App.go('exam')" }
  ];
  const nextI = Math.max(0, stops.findIndex(x => !x.done)), allDone = stops.every(x => x.done);
  let lastDone = -1; stops.forEach((x, i) => { if (x.done) lastDone = i; });
  const frac = allDone ? 1 : Math.max(nextI, lastDone) / (stops.length - 1);
  const draw = !S.drew; S.drew = true;
  const lineRows = (kind, label) => {
    const rows = LV.filter(l => levelTotal(kind, l)).map(l => { const st = levelStats(kind, l), pk = st.total ? st.known / st.total * 100 : 0, pl = st.total ? st.learning / st.total * 100 : 0;
      return `<div class="lnrow" style="--lc:${lcVar(l)}"><span class="tag lv">${l}</span><div class="pbar"><i style="width:${pk}%"></i><i class="l" style="width:${pl}%"></i></div><span>${fmtN(st.known)} / ${fmtN(st.total)}</span></div>`; }).join('');
    return rows ? `<div><h3>${label}</h3>${rows}</div>` : '';
  };
  const kanaRows = [['h', 'あ', 'Hiragana'], ['k', 'ア', 'Katakana']].map(([sc, lab]) => { const all = KANA.filter(x => x.script === sc), k = all.filter(x => status(x.id) === 'known').length, l2 = all.filter(x => status(x.id) === 'learning').length;
    return `<div class="lnrow"><span class="tag lv jp" style="--lc:var(--accent)">${lab}</span><div class="pbar"><i style="width:${k / all.length * 100}%"></i><i class="l" style="width:${l2 / all.length * 100}%"></i></div><span>${k} / ${all.length}</span></div>`; }).join('');
  return `${DATA.mode === 'starter' ? `<div class="banner"><b>Starter set.</b> The full dictionaries haven't been built yet, so you're seeing ${V.length} built-in words. Once the GitHub Action has run, all JLPT levels load automatically.</div>` : ''}
  ${vacBanner()}<div class="home-grid"><div class="home-main">
    <h1 class="hello">おかえり<small>${allDone ? 'Every stop done today. Nice work.' : `Today's line has ${stops.length - stops.filter(x => x.done).length} stops left.`}</small></h1>
    <div class="badges"><span class="badge">🔥 <b>${streak()}</b> day streak</span><span class="badge"><b>${tl.r}</b> answers today</span></div>
    ${gameCard()}
    <div class="route${draw ? ' draw' : ''}" style="--run:calc((100% - 44px) * ${frac})"><span class="run"></span>
      ${stops.map((x, i) => `<button class="stop ${x.done ? 'done' : i === nextI && !allDone ? 'next' : ''}" onclick="${x.act}"><span class="pin">${x.done ? '✓' : i + 1}</span><span class="sb"><span class="t"><b>${x.title}</b><span>${x.sub}</span></span>${x.done ? '' : `<span class="go">${x.go}</span>`}</span></button>`).join('')}
    </div>
    <div class="label">Jump to</div>
    <div class="elsewhere"><button onclick="App.go('kanji')"><b>字</b>Kanji</button><button onclick="App.go('grammar')"><b>文</b>Grammar</button><button onclick="App.go('vocab','browse')"><b>一</b>Word list</button><button onclick="App.go('search')"><b>探</b>Search</button><button onclick="App.go('chat')"><b>話</b>Chat</button>${ANKI.decks.length ? `<button onclick="App.dquiz()"><b>問</b>Deck quiz</button>` : ''}</div>
  </div><div class="home-side">
    ${troubleCard()}${wotdCard()}
    ${quoteCard()}
    <div class="label">Your lines</div>
    <div class="card lines">${lineRows('vocab', 'Words')}${lineRows('kanji', 'Kanji')}<div><h3>Kana</h3>${kanaRows}</div>${lineRows('grammar', 'Grammar')}</div>
    <div class="legend"><span><i class="dot known"></i>Known: reviewed at 2+ week intervals</span><span><i class="dot learning"></i>Learning</span></div>
  </div></div>`;
}

/* ---------- word of the day ----------
   Picks from the level you're working on: the easiest selected JLPT level
   where you know under 90% of the words. Same word all day (saved), prefers
   common words you haven't studied yet that have an example sentence. */
function userLevel() {
  const sel = LV.filter(l => settings.levels.includes(l) && levelTotal('vocab', l));
  if (!sel.length) return LV.find(l => DATA.vocab[l] && DATA.vocab[l].length) || 'N5';
  for (const l of sel) { const st = levelStats('vocab', l); if (!st.total || st.known / st.total < 0.9) return l; }
  return sel[sel.length - 1];
}
function hashStr(t) { let h = 2166136261; for (const c of t) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function wordOfDay() {
  const l = userLevel(), d = today(), saved = store.get('wotd', null);
  if (saved && saved.d === d && saved.l === l && VMAP[saved.id]) return { x: VMAP[saved.id], l };
  const words = DATA.vocab[l] || []; if (!words.length) return null;
  const tiers = [x => x.dk && status(x.id) === 'new' && x.ex.length, x => status(x.id) === 'new' && x.freq >= 3 && x.ex.length, x => status(x.id) === 'new' && x.freq >= 3, x => status(x.id) !== 'known', () => true];
  let pool = [];
  for (const t of tiers) { pool = words.filter(t); if (pool.length) break; }
  pool.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const x = pool[hashStr(d + '|' + l) % pool.length];
  store.set('wotd', { d, l, id: x.id });
  return { x, l };
}
function wotdCard() {
  const w = wordOfDay(); if (!w) return '';
  const { x, l } = w, st = levelStats('vocab', l), pct = st.total ? Math.round(st.known / st.total * 100) : 0, isNew = !progress[x.id];
  return `<div class="label">Word of the day</div><div class="wotd force">
    ${stationSign(x, x.m)}
    ${x.ex[0] ? exHtml(x.ex[0]) : ''}
    <div class="btnrow"><button class="btn sec" data-open="${esc(x.id)}">Full entry</button><button class="btn" onclick="App.wotdAdd()" ${isNew ? '' : 'disabled'}>${isNew ? 'Add to flashcards' : 'In your reviews ✓'}</button></div>
    <p class="note">Picked from ${l}, where you know ${pct}% of the words. It moves up a level once you know 90%.</p>
  </div>`;
}

function filters(extra = '') {
  return `<div class="label">JLPT levels</div>${levelChips()}
  <div class="label">Word type</div>${chips(POS_FILTER, S.pos, 'App.posSet')}${extra}`;
}
function vVocab() {
  const modes = [['sit', '場', 'Situations'], ['cards', '札', 'Flashcards'], ['learn', '学', 'Learn'], ['test', '試', 'Test'], ['browse', '一', 'Word list']];
  const tabs = `<div class="vtabs">${modes.map(([v, ic, l]) => `<button class="mode ${S.vtab === v ? 'on' : ''}" onclick="App.vtab('${v}')"><b>${ic}</b>${l}</button>`).join('')}</div>`;
  if (S.vtab === 'sit') return vSituations(tabs);
  const busy = loadingSel(), n = vSel().length;
  const posL = labelOf(POS_FILTER, S.pos), lvL = settings.levels.map(lvName).join(', ');
  const fsum = `${lvL} · ${posL === 'All' ? 'all word types' : posL}`;
  const countNote = busy ? '<p class="note">Loading words…</p>' : '';
  const head = (title, sub) => `<h1>${title}</h1>${tabs}<p class="sub" style="margin-top:12px">${sub}</p>`;
  const DIRS = [['jp2en', 'Word → meaning'], ['en2jp', 'Meaning → word'], ...(settings.pics && V.some(picAsk) ? [['p2w', 'Picture → word']] : []), ...(V.some(x => x.au) ? [['hear', '🔊 Listen'], ['dict', '🔊 Dictation']] : []), ['type', '⌨︎ Type it'], ['mix', 'Mixed']];
  if (S.vtab === 'cards') {
    const now = Date.now(), sel = vSel(), due = sel.filter(x => isDue(x.id, now)).length, fresh = sel.filter(x => !progress[x.id]).length, nl = Math.min(newLeft('vocab'), fresh);
    return `${head('Words', 'See the card, recall it, then rate how well you knew it.')}
    ${optsBox('vcards', `${fsum} · ${settings.cardFront === 'jp' ? 'Japanese' : 'English'} front`, `${filters()}<div class="label">Card front</div>${seg([['jp', 'Japanese'], ['en', 'English']], settings.cardFront, 'App.cardFront')}`)}
    ${countNote || `<p class="note">${fmtN(due)} due · ${fmtN(nl)} new today · ${fmtN(fresh)} not seen yet</p>`}
    <button class="btn" onclick="App.startCards('vocab')" ${busy || !n ? 'disabled' : ''}>${due ? `Review ${fmtN(due)} due` : 'Start'}${nl ? ` + ${nl} new` : ''}</button>
    ${!due && !nl && n ? `<button class="btn sec" onclick="App.cram('vocab')">Practise anyway (20 random)</button>` : ''}`;
  }
  if (S.vtab === 'learn') {
    return `${head('Words', 'Rounds of 20 words. Answer, then see the full entry for each one.')}
    ${optsBox('vlearn', `${fsum} · ${labelOf(DIRS, S.vf.dir)}`, `<div class="label">Question type</div>${seg(DIRS, S.vf.dir, 'App.vfDir')}${filters()}`)}
    ${countNote || `<p class="note">${fmtN(n)} words selected. Words you're learning come first, then the most common new ones.</p>`}
    <button class="btn" onclick="App.startLearn('vocab')" ${busy || !n ? 'disabled' : ''}>Start a round</button>`;
  }
  if (S.vtab === 'test') {
    const kanjiDeck = S.tf.deck === 'kanji', gramDeck = S.tf.deck === 'grammar', kanaDeck = S.tf.deck === 'kana';
    const pool = kanjiDeck ? K.filter(k => settings.levels.includes(k.lvl)) : gramDeck ? G.filter(g => settings.levels.includes(g.lvl)) : kanaDeck ? kanaSel() : vSel();
    const dirs = kanaDeck ? [['k2r', 'Kana → romaji'], ['r2k', 'Romaji → kana'], ['pair', 'あ ↔ ア'], ['mix', 'Mixed']] : kanjiDeck ? [['k2m', 'Meaning'], ['m2k', 'Pick kanji'], ['k2r', 'Reading'], ['type', '⌨︎ Type it'], ['mix', 'Mixed']] : gramDeck ? [['gfill', 'Fill the blank'], ['g2m', 'Meaning'], ['m2g', 'Pick grammar'], ['mix', 'Mixed']] : DIRS;
    const scope = kanaDeck ? `${settings.kanaScript === 'h' ? 'Hiragana' : settings.kanaScript === 'k' ? 'Katakana' : 'Both scripts'}` : kanjiDeck || gramDeck ? lvL : fsum;
    const inner = `<div class="label">Question type</div>${seg(dirs, S.tf.dir, 'App.tfDir')}
      ${kanaDeck ? `<div class="label">Script</div>${seg([['h', 'Hiragana'], ['k', 'Katakana'], ['both', 'Both']], settings.kanaScript, 'App.kanaScript')}<div class="label">Characters</div>${chips(KANA_GROUPS.filter(g => settings.kanaScript !== 'h' || g[0] !== 'ext'), settings.kanaGroups, 'App.kanaGroup')}` : kanjiDeck || gramDeck ? `<div class="label">JLPT levels</div>${chips(LV.filter(l => levelTotal(gramDeck ? 'grammar' : 'kanji', l)).map(l => [l, `<i class="lcdot" style="background:${lcVar(l)}"></i>${l}<small>${fmtN(levelTotal(gramDeck ? 'grammar' : 'kanji', l))}</small>`]), settings.levels, 'App.lvToggle')}` : filters()}
      <div class="label">Questions</div>${chips([[10, '10'], [20, '20'], [30, '30'], [50, '50']], S.tf.count, 'App.tfCount')}`;
    return `${head('Words', 'No hints along the way. You get a full review at the end.')}
    <div class="label">What to test</div>${seg([['vocab', 'Words'], ['kanji', 'Kanji'], ['grammar', 'Grammar'], ['kana', 'Kana']], S.tf.deck, 'App.tfDeck')}
    ${optsBox('vtest', `${scope} · ${labelOf(dirs, S.tf.dir)} · ${S.tf.count} questions`, inner)}
    ${S.tf.deck === 'vocab' && busy ? countNote : `<p class="note">${Math.min(pool.length, S.tf.count)} questions from ${fmtN(pool.length)} available.</p>`}
    <button class="btn" onclick="App.startTest()" ${(S.tf.deck === 'vocab' && busy) || pool.length < 2 ? 'disabled' : ''}>Start test</button>`;
  }
  return `${head('Words', 'Tap any word for its full entry.')}
  ${optsBox('vbrowse', fsum, filters())}
  <div style="margin-top:12px">${seg([['freq', 'Most common'], ['level', 'Level'], ['kana', 'あいうえお']], S.browse.sort, 'App.bSort')}</div>
  <div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learning"></i>Learning</span><span><i class="dot known"></i>Known</span><span>${freqBadge(5, true)} how common</span></div>
  ${busy ? '<div class="loading">Loading words…</div>' : `<div class="list">${browseRows()}</div>`}`;
}
function vRow(x, showLvl = true) {
  return `<button class="row" data-open="${esc(x.id)}"><i class="dot ${status(x.id)}"></i>${hasPic(x) ? wordPic(x, 'sm') : (anyPic() ? '<span class="pic sm none"></span>' : '')}<span class="rw jp">${ruby(x.f)}</span><span class="rm">${esc(x.m)}</span>${showLvl ? `<span class="lvl">${lvName(x.lvl)}</span>` : ''}${freqBadge(x.freq, true)}</button>`;
}
function browseRows() {
  const rows = vSel().slice();
  if (S.browse.sort === 'freq') rows.sort((a, b) => b.freq - a.freq || LV.indexOf(a.lvl) - LV.indexOf(b.lvl));
  else if (S.browse.sort === 'level') rows.sort((a, b) => LV.indexOf(a.lvl) - LV.indexOf(b.lvl) || b.freq - a.freq);
  else rows.sort((a, b) => kata2hira(a.r).localeCompare(kata2hira(b.r), 'ja'));
  if (!rows.length) return '<p class="muted">No words match these filters.</p>';
  const shown = rows.slice(0, S.browse.limit);
  return shown.map(x => vRow(x, settings.levels.length > 1)).join('') +
    (rows.length > shown.length ? `<button class="btn sec" onclick="App.more()">Show more (${fmtN(rows.length - shown.length)} left)</button>` : '');
}

function vKanji() {
  const sel = kSelection(), sorted = kSorted();
  const ranges = [];
  for (let i = 0; i * K_CHUNK < sorted.length; i++) ranges.push([i, `${i * K_CHUNK + 1}–${Math.min(sorted.length, i * K_CHUNK + K_CHUNK)}`]);
  ranges.push(['all', 'All']);
  const now = Date.now(), due = sel.filter(k => isDue(k.id, now)).length;
  return `<h1>Kanji</h1><p class="sub">${fmtN(K.length)} kanji. Choose how to work through them.</p>
  ${optsBox('kanji', `${S.kf.order === 'freq' ? `Most frequent · ${labelOf(ranges, S.kf.range)}` : S.kf.jlpt} · ${labelOf([['k2m', 'Meaning'], ['m2k', 'Pick kanji'], ['k2r', 'Reading'], ['type', '⌨︎ Type it'], ['mix', 'Mixed']], S.kf.qt)}`, `<div class="label">Order</div>${seg([['freq', 'Most frequent first'], ['jlpt', 'JLPT level']], S.kf.order, 'App.kOrder')}
  <div class="label">${S.kf.order === 'freq' ? 'Frequency rank' : 'Level'}</div>
  ${S.kf.order === 'freq' ? chips(ranges, S.kf.range, 'App.kRange') : chips(LV.filter(l => levelTotal('kanji', l)).map(l => [l, `<i class="lcdot" style="background:${lcVar(l)}"></i>${l}<small>${fmtN(levelTotal('kanji', l))}</small>`]), S.kf.jlpt, 'App.kLv')}
  <div class="label">Quiz type</div>
  ${seg([['k2m', 'Meaning'], ['m2k', 'Pick kanji'], ['k2r', 'Reading'], ['type', '⌨︎ Type it'], ['mix', 'Mixed']], S.kf.qt, 'App.kQt')}`)}
  <div class="btnrow"><button class="btn" onclick="App.startCards('kanji')" ${sel.length ? '' : 'disabled'}>Flashcards${due ? ` · ${due} due` : ''}</button><button class="btn sec" onclick="App.startLearn('kanji')" ${sel.length > 1 ? '' : 'disabled'}>Quiz these ${fmtN(sel.length)}</button></div>
  ${DATA.mode === 'full' && sel.length ? `<button class="btn line wr-set" onclick="App.writePick()">✍ Write 10 from memory or by tracing</button>` : ''}
  <div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learning"></i>Learning</span><span><i class="dot known"></i>Known</span></div>
  <div class="tiles">${sel.map(k => `<button class="tile" data-open="${esc(k.id)}"><i class="dot ${status(k.id)}"></i>${picHtml(k.pic, 'xs')}<span class="tk jp">${k.k}</span><span class="tm">${esc(k.mean[0] || '')}</span>${freqBadge(k.freq, true)}</button>`).join('')}</div>`;
}

function vSearch() {
  return `<h1>Search</h1><p class="sub">Japanese, romaji or English, across every level.</p>
  <input class="search" id="q" placeholder="e.g. 食べる, taberu, eat, 駅" value="${esc(S.search.q)}" oninput="App.search(this.value)" autocomplete="off" autocapitalize="off" spellcheck="false">
  <div id="sres">${searchResults()}</div>`;
}
function searchResults() {
  const q0 = S.search.q.trim(); if (!q0) return `<p class="note">Tip: type romaji like <code>arigatou</code> or a single kanji to see words that use it.</p>`;
  if (S.search.busy) return '<div class="loading">Loading all levels…</div>';
  const q = q0.toLowerCase(), jp = /[぀-ヿ㐀-鿿]/.test(q0), qh = kata2hira(q0);
  const wordRe = new RegExp(`\\b${reEsc(q)}\\b`);
  const scored = [];
  for (const x of V) {
    let s = 0;
    if (jp) {
      const forms = [x.w, x.alt, x.r].filter(Boolean);
      if (forms.includes(q0) || kata2hira(x.r) === qh) s = 100;
      else if (forms.some(f => f.startsWith(q0)) || kata2hira(x.r).startsWith(qh)) s = 60;
      else if (forms.some(f => f.includes(q0))) s = 30;
    } else {
      const rom = x._rom || (x._rom = toRomaji(x.r));
      const gl = x._gl || (x._gl = x.senses.flatMap(s => s.g).map(g => g.toLowerCase()));
      const bare = gl.map(g => g.replace(/^to /, '').replace(/\s*\(.*?\)\s*/g, ' ').trim());
      if (rom === q) s = 95;
      else if (gl.includes(q) || bare.includes(q)) s = 90;
      else if (rom.startsWith(q) && q.length >= 2) s = 50;
      else if (gl.some(g => wordRe.test(g))) s = 40;
      else if (q.length >= 3 && gl.some(g => g.includes(q))) s = 15;
    }
    if (s) scored.push([s + x.freq * 2 - LV.indexOf(x.lvl), x]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  let kan = [];
  if (jp) kan = [...new Set([...q0].filter(c => KMAP[c]))].map(c => KMAP[c]);
  else if (q.length >= 2) kan = K.filter(k => k.mean.some(m => m.toLowerCase() === q)).slice(0, 12);
  const rows = scored.slice(0, 60).map(([, x]) => vRow(x)).join('');
  const gram = G.filter(g => jp ? g.t.includes(q0) || plain(g.t).includes(q0) : (q.length >= 3 && g.m.toLowerCase().includes(q))).slice(0, 8);
  return `${kan.length ? `<div class="label">Kanji</div><div class="tiles" style="margin-top:0">${kan.map(k => `<button class="tile" data-open="${esc(k.id)}"><i class="dot ${status(k.id)}"></i>${picHtml(k.pic, 'xs')}<span class="tk jp">${k.k}</span><span class="tm">${esc(k.mean[0] || '')}</span>${freqBadge(k.freq, true)}</button>`).join('')}</div>` : ''}
  ${gram.length ? `<div class="label">Grammar</div><div class="list" style="margin-top:0">${gram.map(gRow).join('')}</div>` : ''}
  <div class="label">Words ${scored.length ? `· ${scored.length > 60 ? 'top 60 of ' : ''}${fmtN(scored.length)}` : ''}</div>
  ${rows ? `<div class="list" style="margin-top:0">${rows}</div>` : '<p class="muted">No words found.</p>'}`;
}

function vSettings() {
  const sw = k => `<label class="sw"><input type="checkbox" ${settings[k] ? 'checked' : ''} onchange="App.set('${k}',this.checked)"><span></span></label>`;
  const m = DATA.meta;
  const credits = (m && m.licenses) || [
    { name: 'JMdict & KANJIDIC2', by: 'Electronic Dictionary Research and Development Group', license: 'CC BY-SA 4.0', url: 'https://www.edrdg.org/edrdg/licence.html' },
    { name: 'KanjiVG', by: 'Ulrich Apel and contributors', license: 'CC BY-SA 3.0', url: 'https://kanjivg.tagaini.net/' },
    { name: 'Tatoeba', by: 'Tatoeba contributors', license: 'CC BY 2.0 FR', url: 'https://tatoeba.org/' },
    { name: 'Kanji origin stories', by: 'Make Me a Hanzi (Shaunak Kishore), from Unihan and CJKlib', license: 'LGPL-3.0', url: 'https://github.com/skishore/makemeahanzi' },
    { name: 'Kanji types, sound parts, look-alikes', by: 'Kanjium (mifunetoshiro), built on EDRDG data; parts from KanjiVG', license: 'CC BY-SA 4.0', url: 'https://github.com/mifunetoshiro/kanjium' },
    { name: 'More look-alike kanji', by: 'Lars Yencken, “Orthographic support for passing the reading hurdle in Japanese” (PhD thesis, University of Melbourne, 2010): radical and stroke-edit similarity, as packaged by the Niai project', license: 'CC BY 3.0', url: 'https://github.com/mwil/wanikani-userscripts/tree/master/wanikani-similar-kanji' },
    { name: 'Modern quotes', by: 'Short catchphrases by Shuzo Matsuoka and from anime and manga, quoted briefly with credit; © their creators and publishers (shown on each quote). Switch them off above.', license: '© owners', url: 'https://en.wikipedia.org/wiki/Shuzo_Matsuoka' },
    { name: 'JLPT vocabulary lists', by: 'Jonathan Waller (tanos.co.uk)', license: 'CC BY', url: 'https://www.tanos.co.uk/jlpt/' },
    { name: 'Pitch accent', by: 'Kanjium accents.txt, pitch accent notation by Uros O.', license: 'CC BY-SA 4.0', url: 'https://github.com/mifunetoshiro/kanjium' }];
  return `<h1>Settings</h1><p class="sub">Saved on this device.</p>
  <div class="card">
    <div class="set" style="display:block"><b>Design</b><span>Pick a template for the whole app</span>
      <div class="skins">${SKINS.map(k => `<button class="skin ${settings.skin === k.id ? 'on' : ''}" onclick="App.skin('${k.id}')">
        <div class="pv" style="background:${k.bg};font-family:${k.font}"><b style="color:${k.ink}">${k.sample}</b><i style="background:${k.accent};width:70%;box-shadow:${k.glow}"></i><i style="background:${k.line};width:45%"></i></div>
        <span>${k.name}<br><small>${k.desc}</small></span></button>`).join('')}</div></div>
    <div class="set" style="display:block"><b>Appearance</b><span>${settings.skin === 'terminal' ? 'The Terminal design is always dark' : 'System follows your phone or computer setting'}</span>
      ${settings.skin === 'terminal' ? '' : `<div style="margin-top:10px">${seg([['system', 'System'], ['light', '☀️ Light'], ['dark', '🌙 Dark']], settings.theme, 'App.theme')}</div>`}</div>
    <div class="set"><div><b>Pictures</b><span>Show the pictures from your imported Anki decks</span></div><label class="sw"><input type="checkbox" ${settings.pics ? 'checked' : ''} onchange="App.set('pics',this.checked)"><span></span></label></div>
    <div class="set"><div><b>Learning style</b><span>Game adds belts, XP, stars, badges and celebrations. Normal keeps it calm.</span></div>${seg([['normal', 'Normal'], ['game', 'Game']], settings.style === 'game' ? 'game' : 'normal', 'App.styleSet')}</div>
    <div class="set"><div><b>Daily goal</b><span>Minutes of study a day. Counts time in lessons, quizzes and reviews</span></div>${seg([['15', '15 min'], ['20', '20 min'], ['30', '30 min']], String(settings.goalMin || 15), 'App.goalSet')}</div>
    <div class="set"><div><b>Modern quotes</b><span>Include Shuzo Matsuoka and anime catchphrases in Quote of the day</span></div><label class="sw"><input type="checkbox" ${settings.modernQuotes !== false ? 'checked' : ''} onchange="App.set('modernQuotes',this.checked)"><span></span></label></div>
    <div class="set" style="display:block"><b>Furigana</b><span>Reading shown above kanji</span>
      <div style="margin-top:10px">${seg([['on', 'Show'], ['tap', 'Tap to reveal'], ['off', 'Hide']], settings.furigana, 'App.furi')}</div></div>
    <div class="set"><div><b>Show romaji</b><span>Latin letters under words in questions</span></div>${sw('romaji')}</div>
    <div class="set"><div><b>Play the word on a correct answer</b><span>In tests and quizzes, hear the native recording when you get it right</span></div>${sw('playOnCorrect')}</div>
    <div class="set"><div><b>Auto-play recordings</b><span>Play native-speaker audio automatically when a word has a recording</span></div>${sw('autoSpeak')}</div>
    <div class="set"><div><b>Audio speed</b><span>Slow recordings down to catch every sound</span></div>${seg([['1', 'Normal'], ['0.85', 'Slower'], ['0.7', 'Slow']], String(settings.audioRate || 1), 'App.audioRate')}</div>
    <div class="set"><div><b>Vacation mode</b><span>Pause reviews and keep your streak while you're away. When you come back, nothing has piled up</span></div><label class="sw"><input type="checkbox" ${settings.vac ? 'checked' : ''} onchange="App.vacation(this.checked)"><span></span></label></div>
    <div class="set"><div><b>Pitch accent</b><span>Show where each word's pitch rises and falls (Tokyo Japanese)</span></div>${sw('pitch')}</div>
    <div class="set"><div><b>Stroke numbers</b><span>Number each stroke in kanji diagrams</span></div>${sw('strokeNums')}</div>
    <div class="set" style="display:block"><b>New flashcards per day</b>
      <div style="margin-top:10px">${chips([[5, '5'], [10, '10'], [20, '20'], [30, '30'], [50, '50']], settings.newPerDay, 'App.newPerDay')}</div></div>
    <div class="set" style="display:block"><b>How much to remember</b><span style="display:block">Reviews are timed by FSRS so you still remember each card when it comes back. Higher means more reviews; 90% suits most learners</span>
      <div style="margin-top:10px">${chips([['0.85', '85%'], ['0.9', '90%'], ['0.95', '95%']], String(settings.retention || 0.9), 'App.retention')}</div></div>
  </div>
  <div class="label">My words</div>
  <div class="card">
    <span class="muted" style="font-size:13px">One word per line: <code>word, reading, meaning</code> — e.g. <code>筋肉痛, きんにくつう, muscle soreness</code>. Use <code>;</code> or tabs if your meaning has commas.</span>
    <textarea id="cw" placeholder="筋肉痛, きんにくつう, muscle soreness"></textarea>
    <button class="btn" onclick="App.addWords()">Add words</button>
    <p class="note">${custom.length} custom word${custom.length === 1 ? '' : 's'}. They appear as the “My words” level.</p>
    ${custom.length ? `<button class="btn line" onclick="App.clearWords()">Remove my words</button>` : ''}
  </div>
  ${ankiSettingsCard()}
  <div class="label">Progress</div>
  <div class="card"><span class="muted" style="font-size:13px">Progress lives in this browser. Export it to back up or move to another device.</span>
    <div class="btnrow"><button class="btn sec" onclick="App.exportProgress()">Export</button><button class="btn sec" onclick="$('#imp').click()">Import</button></div>
    <input type="file" id="imp" accept="application/json,.json" style="display:none" onchange="App.importProgress(this.files[0])">
    <button class="btn danger" onclick="App.reset()">Reset all progress</button></div>
  <div class="label">Data</div>
  <div class="card credits">
    ${m ? `<div><b>Built</b> ${esc(new Date(m.built).toLocaleString())}</div>
    <div><b>Words</b> ${LV.map(l => `${l} ${fmtN(m.counts.vocab[l] || 0)}`).join(' · ')}</div>
    <div><b>Kanji</b> ${LV.map(l => `${l} ${fmtN(m.counts.kanji[l] || 0)}`).join(' · ')}</div>
    <div><b>Frequency</b> ${esc(m.sources.frequency || '')}</div>
    ${m.sources.jmdict ? `<div><b>JMdict</b> ${esc(m.sources.jmdict.dictDate || m.sources.jmdict.file || '')}</div>` : ''}
    ${(m.notes || []).map(n => `<div>⚠ ${esc(n)}</div>`).join('')}` : `<div>Using the built-in starter set (${V.length} words, ${K.length} kanji). Kanji frequency ranks there are approximate.</div>`}
  </div>
  <div class="label">Credits &amp; licences</div>
  <div class="card credits">${credits.map(c => `<div><b>${esc(c.name)}</b> — ${esc(c.by)}. <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.license)}</a></div>`).join('')}
    <div>Example sentences come from the Tatoeba Project; each one links to its source. Dictionary-derived data in <code>data/</code> is shared under CC BY-SA 4.0.</div>
    <div><b>Review timing</b> — the FSRS-5 algorithm and its default parameters, open-spaced-repetition. <a href="https://github.com/open-spaced-repetition/fsrs4anki" target="_blank" rel="noopener">MIT</a></div>
    <div><b>Reading passages, practice sentences, explanations</b> — written for this app.</div></div>
  <div class="label">Help make it better</div>
  <div class="card"><p style="margin:0 0 10px">Found a wrong reading, a bug or a confusing question? Kotoba Dojo is open source.</p>
    <a class="btn sec" href="https://github.com/Themanmad/Kotoba-Dojo/issues/new/choose" target="_blank" rel="noopener">Report a problem or suggest an idea</a></div>`;
}

/* ---------- detail cards ---------- */
/* Example sentences normally arrive with furigana from the build (kuromoji).
   If a sentence has none, annotate its kanji using readings from the word list:
   longest dictionary match first, verb/adjective stems (食べ-, 行-), and single
   kanji only when they stand alone (so 山 in 富士山 isn't read やま). */
let FURIX = null;
function furiIndex() {
  if (FURIX) return FURIX;
  const words = new Map(), stems = new Map(); let maxLen = 1;
  const add = (w, f) => { if (!words.has(w)) { words.set(w, f); maxLen = Math.max(maxLen, w.length); } };
  for (const x of V) {
    if (![...x.w].some(isK) || !x.f.includes('{')) continue;
    add(x.w, x.f);
    if ((x.pos === 'verb' || x.pos === 'i-adj') && /[ぁ-ん]$/.test(x.w) && x.f.endsWith(x.w.slice(-1))) {
      const stem = x.w.slice(0, -1), fs = x.f.slice(0, -1);
      if (stem.length >= 2 && /[ぁ-ん]$/.test(stem)) add(stem, fs);
      const m = /^\{(.)\|([^}]+)\}[ぁ-ん]/.exec(x.f);
      if (m && x.w[0] === m[1] && !'来'.includes(m[1]) && !stems.has(m[1])) stems.set(m[1], `{${m[1]}|${m[2]}}`);
    }
  }
  return (FURIX = { words, stems, maxLen });
}
function autoFuri(t, lead) {   // lead: the text just before t ended with a kanji word (t continues a sentence)
  if (![...t].some(isK)) return t;
  const { words, stems, maxLen } = furiIndex(); let out = '', end = lead ? 0 : -1;
  const prevK = i => i > 0 ? isK(t[i - 1]) : !!lead;
  for (let i = 0; i < t.length;) {
    if (!isK(t[i])) { out += t[i++]; continue; }
    let hit = null;
    for (let L = Math.min(maxLen, t.length - i); L >= 1 && !hit; L--) {
      const sub = t.slice(i, i + L), f = words.get(sub); if (!f) continue;
      // a one-kanji word inside a run of kanji is part of a compound or a suffix (食器類 is しょっきるい, not たぐい): leave it to kanjiGuess
      if (L === 1 && (prevK(i) || (t[i + 1] && isK(t[i + 1])))) continue;
      if (L === 1 && stems.has(t[i]) && /[ぁ-ん]/.test(t[i + 1] || '')) continue;
      hit = [L, f];
    }
    if (!hit && stems.has(t[i]) && /[ぁ-ん]/.test(t[i + 1] || '') && !prevK(i)) hit = [1, stems.get(t[i])];
    if (!hit) { const g = kanjiGuess(t, i, end === i, prevK(i)); if (g) hit = [1, `{${t[i]}|${g}}`]; }
    if (hit) { out += hit[1]; i += hit[0]; end = i; } else out += t[i++];
  }
  return out;
}
/** last resort for a kanji no known word covers, only where the reading is clear-cut:
    after a finished word, a kanji with a single on'yomi is a suffix read that way (類 るい, 的 てき, 性 せい);
    a kanji followed by kana whose kun'yomi all share one stem takes that stem (磨いた → みが). Otherwise none: no reading beats a wrong one. */
function kanjiGuess(t, i, afterWord, prevK) {
  const c = t[i], k = KMAP[c]; if (!k) return null;
  const next = t[i + 1] || '';
  if (isK(next)) return null;
  if (/[ぁ-ゖ]/.test(next) && !prevK) {
    const stems = [...new Set(k.kun.filter(r => r.includes('.')).map(r => r.replace(/^-/, '').split('.')[0]))];
    return stems.length === 1 && !k.kun.some(r => !r.includes('.')) ? stems[0] : null;
  }
  if (prevK && afterWord && k.on.length === 1) return kata2hira(k.on[0]).replace(/[^ぁ-ゖー]/g, '') || null;
  return null;
}
/** a sentence with {漢字|かな} groups: kanji outside the groups get readings too */
const fillFuri = j => !String(j).includes('{') ? autoFuri(String(j)) : String(j).split(/(\{[^|}]+\|[^}]+\})/).map((sg, n, a) => sg.startsWith('{') ? sg : autoFuri(sg, n > 0 && a[n - 1].startsWith('{'))).join('');
/* ---------- sentences with furigana and one special range ----------
   Quizzes and the exam blank out or underline part of a sentence. These keep the
   furigana on every other kanji (honouring the Show / Tap / Hide setting).        */
function rubyTag(t, r) { return settings.furigana === 'off' ? esc(t) : `<ruby>${esc(t)}<rt>${esc(r)}</rt></ruby>`; }
function segsOf(m) {
  m = fixMark(m); const out = []; let last = 0;
  for (const x of String(m).matchAll(MARK)) { if (x.index > last) out.push({ t: m.slice(last, x.index), r: null }); out.push({ t: x[1], r: x[2] }); last = x.index + x[0].length; }
  if (last < m.length) out.push({ t: m.slice(last), r: null });
  return out;
}
const exMarkup = e => fillFuri(e.j);
/** html of plain range [a, b) of a markup sentence, ruby on segments that lie fully inside it */
function rangeHtml(m, a, b) {
  let pos = 0, out = '';
  for (const sg of segsOf(m)) {
    const s0 = pos, s1 = pos + sg.t.length; pos = s1;
    if (s1 <= a || s0 >= b) continue;
    if (sg.r && s0 >= a && s1 <= b) out += rubyTag(sg.t, sg.r);
    else out += esc(sg.t.slice(Math.max(0, a - s0), Math.min(sg.t.length, b - s0)));
  }
  return joinRuby(out);
}
/** <ruby>周<rt>しゅう</rt></ruby><ruby>辺<rt>へん</rt></ruby> → one <ruby>周辺<rt>しゅうへん</rt></ruby>, so a long reading doesn't push the kanji apart */
const joinRuby = h => h.replace(/(?:<ruby>[^<]+<rt>[^<]+<\/rt><\/ruby>){2,}/g, run => {
  const ps = [...run.matchAll(/<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g)].map(m => [m[1], m[2]]), out = [];
  for (const p of ps) { const L = out[out.length - 1]; if (L && [...L[0] + p[0]].every(isK)) { L[0] += p[0]; L[1] += p[1]; } else out.push([...p]); }
  return out.map(([t, r]) => `<ruby>${t}<rt>${r}</rt></ruby>`).join(''); });
/** Sentence html with plain range [i, i+len) replaced by `html` (or by fn(rangeHtml) when html is a function). */
function sentHtml(m, i, len, html) {
  const total = plain(m).length, mid = typeof html === 'function' ? html(rangeHtml(m, i, i + len)) : html;
  return rangeHtml(m, 0, i) + mid + rangeHtml(m, i + len, total);
}
function exHtml(e, g) {
  let j = fillFuri(e.j);
  if (g) j = markGrammar(j, g);
  return `<div class="ex">${e.dpic && settings.pics ? `<img class="pic dpic exp" data-dpic="${esc(e.dpic)}" alt="">` : ''}<div style="flex:1"><div class="jp">${ruby(j, true).replace(/\u0001/g, '<mark class="gp">').replace(/\u0002/g, '</mark>')}</div>${e.r ? `<div class="en" style="font-style:italic">${esc(e.r)}</div>` : ''}<div class="en">${esc(e.e)}</div>${e.t ? `<a class="src" href="https://tatoeba.org/en/sentences/show/${encodeURIComponent(e.t)}" target="_blank" rel="noopener">Tatoeba #${esc(e.t)}</a>` : ''}${e.au && DATA.mode === 'full' ? `<span class="src"> · 🎙 <a class="src" href="${esc(e.al || 'https://tatoeba.org/en/user/profile/' + encodeURIComponent(e.by || ''))}" target="_blank" rel="noopener">${esc(e.by || 'Tatoeba')}</a>, ${esc(e.lic || '')}</span>` : ''}</div>${e.dk ? `<span class="src">From your deck: ${esc(e.dk)}</span>` : ''}${e.au ? sayBtn('s' + e.au) : e.dau ? sayBtn(e.dau) : ''}</div>`;
}
function vDetail(x) {
  const ks = [...new Set([...x.w].filter(c => KMAP[c]))];
  const p = progress[x.id];
  const uk = x.senses.some(s => (s.x || []).includes('uk'));
  return `<div class="detail force">
    ${stationSign(x)}
    ${pitchHtml(x)}
    ${x.alt ? `<div class="dread">Also written <span class="jp">${esc(x.alt)}</span></div>` : ''}
    <div class="tags"><span class="tag">${esc(POS_LABEL[x.pos] || x.pos)}</span>${x.common ? '<span class="tag cm">common word</span>' : ''}${uk ? '<span class="tag">usually kana</span>' : ''}${freqBadge(x.freq)}</div>
    ${x.senses.length > 1 ? `<ol class="senses">${x.senses.map((s, i) => `<li>${s.p && s.p.length && (i === 0 || s.p.join() !== x.senses[i - 1].p.join()) ? `<span class="pos">${esc(posLabel(s.p))}</span>` : ''}${esc(s.g.join('; '))}${s.i ? ` <span class="muted">(${esc(s.i)})</span>` : ''}</li>`).join('')}</ol>`
      : `<div class="dmean">${esc(x.senses[0].g.join('; '))}</div>${x.senses[0].p && x.senses[0].p.length && DATA.meta ? `<div class="muted" style="font-size:13px">${esc(posLabel(x.senses[0].p))}</div>` : ''}`}
    ${x.dk ? `<div class="dnote"><b>In your deck${(x.dks || []).length > 1 ? 's' : ''}</b> ${esc((x.dks || []).map(id => (ANKI.decks.find(d => d.id === id) || {}).name).filter(Boolean).join(', ') || x.dk)}${x.dnote ? `<span>${esc(x.dnote)}</span>` : ''}</div>` : ''}
    ${x.ex.length ? `<div class="kc-hint">Tap an underlined kanji to look up its word or the kanji.</div>` : ''}${x.ex.map(exHtml).join('')}
    ${ks.length ? `<div class="mini">Kanji in this word</div><div class="kchips">${ks.map(c => `<button class="kchip" data-open="k:${esc(c)}"><b>${c}</b>${esc(KMAP[c].mean[0] || '')}<span class="muted">${KMAP[c].lvl}</span></button>`).join('')}</div>` : ''}
    <div class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong · next review ${p.d > Date.now() ? 'in ' + fmtIv(p.d - Date.now()) : 'due now'}` : 'Not studied yet'}</div>
  </div>`;
}
/* ---------- how a kanji is built, and ways to remember it ---------- */
const POS_WORD = { left: 'on the left', right: 'on the right', top: 'on top', bottom: 'at the bottom', kamae: 'wrapped around it', kamaec: 'wrapped around it', tare: 'over the top-left', tarec: 'over the top-left', nyo: 'along the bottom-left', nyoc: 'along the bottom-left' };
const partMean = el => (KMAP[el] && KMAP[el].mean[0]) || (PARTS[el] && PARTS[el][0]) || '';
const partName = el => (PARTS[el] && PARTS[el][1]) || '';
const kataOf = r => String(r).replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
let knotes = store.get('knotes', {});
function kBuild(k) {
  const pt = k.pt || [], og = k.og || null, m0 = k.mean[0] || '';
  const S = og ? og.t === 'S' : k.ty === 'S', sem = (og && og.sem) || (S && k.rad) || '', pho = (og && og.pho) || (S && k.ph) || '';
  const radP = pt.find(p => p[0] === k.rad) || pt.find(p => p[2] === 'r');
  const isSnd = p => S && (p[0] === pho || (!pho && p[2] === 'p')), isMean = p => S && !isSnd(p) && (p[0] === sem || p === radP);
  const named = el => `${el}${partMean(el) ? ` (${partMean(el)})` : ''}`;
  const chip = p => { const role = isSnd(p) ? 'sound' : isMean(p) ? 'meaning' : '', n = (p === radP && partName(k.rad)) || partName(p[0]), tag = KMAP[p[0]] ? 'button' : 'div';
    return `<${tag}${tag === 'button' ? ` data-open="k:${esc(p[0])}"` : ''} class="kb-part${role ? ' ' + role : ''}"><b class="jp">${esc(p[0])}</b><span class="kb-pm">${esc(partMean(p[0]) || '—')}</span>${n ? `<span class="kb-pn jp">${esc(n)}</span>` : ''}${role ? `<span class="kb-role">${role === 'sound' ? `sound${k.phR && k.phR.length ? ' ' + esc(k.phR.slice(0, 2).join('・')) : ''}` : 'meaning'}</span>` : ''}</${tag}>`; };
  // the story itself
  let title = '', story = '', extra = '', trick = '';
  if (og && og.t === 'P') { title = 'Picture'; story = og.h ? `${og.h}.` : `A drawing of “${m0}”.`; extra = 'The drawing was simplified over centuries into the strokes you see now.'; }
  else if (og && og.t === 'C') { title = k.ty === 'I' ? 'Symbol' : 'Meanings combined'; story = og.h ? `${og.h}.` : ''; }
  else if (S) {
    title = 'Meaning + sound';
    const sm = (og && og.h) || partMean(sem), sounds = k.phR || [], hit = k.on.map(kataOf).find(o => sounds.includes(o));
    story = `${sem ? `${sem}${sm ? ` (${sm})` : ''} tells you what it's about` : 'One part tells you what it is about'}${pho ? `, and ${pho} was added for its sound${sounds.length ? ` (${sounds.join('・')})` : ''}` : ''}.${hit ? ` That's why ${k.k} is read ${hit}.` : k.on[0] && pho ? ` The sound has drifted since: today ${k.k} is read ${kataOf(k.on[0])}.` : ''}`;
    extra = 'More than half of all kanji were made this way: one part for the topic, one borrowed for its sound. Learn the sound parts and you can often guess a new kanji\'s reading.';
    const pm = partMean(pho), smn = partMean(sem);
    if (pm && smn) trick = `${smn} (${sem}) + ${pm} (${pho}) → ${m0}`;
  }
  else if (k.kk) { title = 'Made in Japan'; story = `This kanji was created in Japan rather than China.${pt.length ? ` ${pt.map(p => named(p[0])).join(' + ')} together give the idea of “${m0}”.` : ''}`; }
  else if (k.ty === 'P') { title = 'Picture'; story = `A drawing of “${m0}”, simplified over centuries.`; }
  else if (k.ty === 'I') { title = 'Symbol'; story = `A simple sign that points to an idea (“${m0}”) rather than a drawing of a thing.`; }
  else if (k.ty === 'C' && pt.length) { title = 'Meanings combined'; story = `${pt.map(p => named(p[0])).join(' + ')} together give the idea of “${m0}”.`; }
  const old = (og && og.old) || k.old;
  const oldLine = old && old !== k.k ? `<div class="kb-old"><b class="jp">${esc(old)}</b><span>Older form, used in Japan until the 1946 simplification${og && og.old ? '. The story above describes this form' : ''}.</span></div>` : '';
  // the parts row must agree with the story: every part has to appear in it (電 is 电 + 雨, not 雨 + 日)
  const told = og ? new Set([...String(og.h || '').matchAll(/[\p{Script=Han}\u2E80-\u2FDF]/gu)].map(m => m[0]).concat([og.sem, og.pho].filter(Boolean))) : null;
  const showEq = pt.length && !(og ? og.t === 'P' : k.ty === 'P') && k.ty !== 'I' && (!og || (!og.old && pt.every(p => told.has(p[0]))));   // a story about the older form (讀) doesn't match today's parts
  const eq = showEq ? `<div class="kb-eq">${pt.map(chip).join('<i class="kb-op">+</i>')}<i class="kb-op">=</i><div class="kb-part whole"><b class="jp">${esc(k.k)}</b><span class="kb-pm">${esc(m0)}</span></div></div>` : '';
  const rg = k.rad || (radP && radP[0]), rpos = radP && radP[1], rn = partName(rg) || (radP && partName(radP[0])), rm = partMean(rg) || (radP && partMean(radP[0]));
  const radLine = rg && (rm || rn) && rg !== k.k ? `<div class="kb-rad">Radical <b class="jp">${esc(rg)}</b>${rn ? ` <span class="jp">${esc(rn)}</span>` : ''}${rm ? `, “${esc(rm)}”` : ''}${POS_WORD[rpos] ? `, ${POS_WORD[rpos]}` : ''}.${rm && !/^(one|two|line|dot|slash|hook|second|lid|legs|eight|ten|cover|enclosure|open country|box|hiding enclosure)$/i.test(rm) ? ` Kanji with this radical often have something to do with “${esc(rm)}”.` : ''}</div>` : '';
  if (!story && !eq && !radLine) return '';
  return `<div class="mini">How it came to be</div><div class="kbuild">${title ? `<div class="kb-type">${title}</div>` : ''}
    ${story ? `<p class="kb-story">${esc(story)}</p>` : ''}${eq}${extra ? `<p class="kb-say">${esc(extra)}</p>` : ''}
    ${trick ? `<div class="kb-trick"><b>Memory trick</b><span>${esc(trick)}</span><small>A way to remember it, not the real history.</small></div>` : ''}
    ${oldLine}${radLine}</div>`;
}
function kRemember(k) {
  const fam = k.ty === 'S' && k.ph ? K.filter(x => x !== k && x.ph === k.ph).sort((a, b) => (a.r || 9999) - (b.r || 9999)).slice(0, 8) : [];
  const look = (k.lk || []).map(c => KMAP[c]).filter(Boolean);
  const inside = K.filter(x => x !== k && (x.pt || []).some(p => p[0] === k.k)).sort((a, b) => (a.r || 9999) - (b.r || 9999)).slice(0, 10);
  const kchip = (x, sub) => `<button class="kb-k" data-open="k:${esc(x.k)}"><b class="jp">${x.k}</b><span>${esc(sub)}</span></button>`;
  const pt = k.pt || [], hint = pt.length ? pt.map(p => partMean(p[0]) || p[0]).join(' + ') + ' → ' + (k.mean[0] || '') : (k.mean[0] || '');
  return `<div class="mini">Remember it</div><div class="kremember">
    ${fam.length ? `<div class="kr-row"><div class="kr-h">Same sound part <span class="jp">${esc(k.ph)}</span>, similar reading</div><div class="kb-ks">${fam.map(x => kchip(x, x.on[0] ? kataOf(x.on[0]) : (x.mean[0] || ''))).join('')}</div></div>` : ''}
    ${lookBlock(k)}
    ${inside.length ? `<div class="kr-row"><div class="kr-h">You'll find ${k.k} inside</div><div class="kb-ks">${inside.map(x => kchip(x, x.mean[0] || '')).join('')}</div></div>` : ''}
    <label class="kr-row kr-note"><div class="kr-h">Your memory story</div>
      <textarea rows="2" data-knote="${esc(k.k)}" placeholder="Make up a little story or picture, e.g. ${esc(hint)}" oninput="App.knote(this)">${esc(knotes[k.k] || '')}</textarea>
      <span class="kr-saved" aria-live="polite"></span></label>
  </div>`;
}
function kDetail0(k) {
  const p = progress[k.id];
  const words = k.ex.length ? k.ex : V.filter(x => x.w.includes(k.k)).slice(0, 5).map(x => ({ w: x.w, r: x.r, m: x.m, l: x.lvl }));
  return `<div class="detail force">
    <div class="khead"><div class="kbig jp strokes" data-k="${esc(k.k)}">${k.k}</div><div style="flex:1;min-width:0">${k.pic && settings.pics && !KPIC[k.k] ? `<div class="kpic">${picHtml(k.pic, 'md')}${picCredit(k.pic) ? `<span class="pic-credit">${picCredit(k.pic)}</span>` : ''}</div>` : ''}<div class="dmean" style="margin-top:0">${esc(k.mean.join('; '))}</div>
      <div class="tags"><span class="tag lv">${k.lvl}</span>${k.s ? `<span class="tag">${k.s} strokes</span>` : ''}${k.gr ? `<span class="tag">${k.gr <= 6 ? 'grade ' + k.gr : k.gr === 8 ? 'jōyō (secondary)' : 'jinmeiyō'}</span>` : ''}</div>
      <div>${freqBadge(k.freq)}${k.r ? ` <span class="muted" style="font-size:12px">· #${k.r} of the 2,500 most used</span>` : ''}</div></div></div>
    <div class="frames" data-frames="${esc(k.k)}"></div>
    ${kpStrip(k.k)}
    <div class="reads">
      <div class="read"><b>On'yomi</b><span class="jp">${k.on.length ? esc(k.on.join('、')) : '—'}</span><span class="muted" style="font-size:13px">${esc(k.on.map(toRomaji).join(', '))}</span></div>
      <div class="read"><b>Kun'yomi</b><span class="jp">${kunHtml(k.kun)}</span><span class="muted" style="font-size:13px">${esc(k.kun.map(toRomaji).join(', '))}</span></div>
    </div>
    ${kBuild(k)}
    ${kRemember(k)}
    ${(() => { const sim = similarKanji(k); return sim.length ? `<div class="mini">Different kanji with similar meaning</div><div class="simlist">${sim.map(({ x }) => `<button class="simrow" data-open="k:${esc(x.k)}"><span class="sk jp">${x.k}</span><span class="sm"><b>${esc(x.mean.slice(0, 3).join('; '))}</b><span>${esc(kRead(x))}${x.ex[0] ? ` · e.g. <span class="jp">${esc(x.ex[0].w)}</span> ${esc(x.ex[0].m)}` : ''}</span></span><span class="lvl">${x.lvl}</span></button>`).join('')}</div>
      <p class="note" style="margin-top:6px">Compare the example words to see how each one is used.</p>` : ''; })()}
    ${words.length ? `<div class="mini">Words using ${k.k}</div><div class="exlist">${words.map(e => { const v = VMAP['v:' + e.w + '|' + e.r];
      return `<button class="exrow" ${v ? `data-open="${esc(v.id)}"` : ''}><span class="jp">${ruby(furi(e.w, e.r), true)}</span><span class="m">${esc(e.m)}</span>${e.l ? `<span class="lvl" style="font-size:11px;color:var(--accent);font-weight:600">${e.l}</span>` : ''}</button>`; }).join('')}</div>` : ''}
    <div class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong · next review ${p.d > Date.now() ? 'in ' + fmtIv(p.d - Date.now()) : 'due now'}` : 'Not studied yet'}${DATA.mode === 'full' ? ' · Stroke order: KanjiVG' : ''}</div>
  </div>`;
}
const detail = item => item.kind === 'vocab' ? vDetail(item) : item.kind === 'grammar' ? gDetail(item) : item.kind === 'kana' ? kanaDetail(item) : kDetail(item);

/* ---------- similar-meaning kanji ----------
   Built from KANJIDIC meanings: kanji that share a meaning ("river"), a synonym
   group (river / stream / creek), or where one's meaning is the head word of the
   other's ("large river" ~ "river"). */
const SYN = [['eye','eyeball','eyes'],['tooth','teeth','fang'],['nose','snout'],['hair','fur','hairs'],['blood','gore'],['bone','skeleton'],['river','stream','creek','brook'],['big','large','great','huge','vast'],['small','little','tiny','minute'],['speak','talk','say','tell','speech','words','discuss'],['see','look','view','watch','observe','glance'],['think','consider','thought','ponder'],['road','way','street','path','route','avenue'],['house','home','dwelling','residence','abode'],['sea','ocean'],['begin','start','commence','beginning','origin'],['end','finish','terminate','conclude','close'],['fast','quick','rapid','swift','speedy'],['old','ancient','aged','former'],['tree','wood','timber','lumber'],['forest','woods','grove','thicket'],['stone','rock','boulder'],['red','crimson','scarlet'],['happy','glad','joy','pleasure','delight','rejoice'],['sad','sorrow','grief','grieve','mourning'],['fear','afraid','dread','fright','frightened'],['love','affection','fond'],['help','assist','aid','rescue','save'],['cold','chilly','frigid','freeze'],['hot','heat','swelter'],['warm','warmth','lukewarm'],['kill','slay','murder'],['buy','purchase'],['night','evening','dusk'],['mountain','peak','summit','hill'],['field','plain','meadow'],['cut','sever','chop','slice'],['wash','rinse','cleanse'],['stop','halt','cease'],['give','bestow','grant','confer'],['meet','encounter','interview'],['pull','tug','drag'],['push','shove','thrust'],['sound','noise','voice'],['country','nation','land','state'],['town','village','hamlet'],['shop','store','stall'],['picture','drawing','painting','paint','draw'],['door','gate','entrance'],['many','numerous','plenty','abundant'],['wide','broad','spacious'],['narrow','tight','cramped'],['deep','profound'],['shallow','superficial'],['fight','battle','war','struggle','combat'],['rule','law','regulation','statute'],['sell','sale'],['wait','await'],['correct','right','proper','justice'],['dark','gloomy','darkness','obscure'],['bright','brilliant','clear'],['hit','strike','beat'],['run','dash','race'],['walk','step','stroll'],['clothes','clothing','garment'],['grain','cereal'],['rice','rice plant'],['bird','fowl','chicken'],['dog','hound'],['jewel','gem','treasure'],['ship','boat','vessel'],['moist','wet','damp'],['dry','parch'],['fire','flame','blaze'],['light','shine','gleam','glitter'],['mind','heart','spirit'],['body','physique'],['wife','spouse'],['husband','man'],['woman','female','lady']];
const SYN_OF = new Map(); SYN.forEach((g, i) => g.forEach(w => SYN_OF.set(w, i)));
const MSTOP = new Set('a an the of to and or in on at for with by be as is it its one no not radical counter kana prefix suffix honorific sound used make become thing something'.split(' '));
const normM = m => String(m).toLowerCase().replace(/\(.*?\)/g, '').replace(/^(to|a|an|the)\s+/, '').replace(/[.,;:!?'"]/g, '').replace(/\s+/g, ' ').trim();
function mkeys(k) {
  if (k._mk) return k._mk;
  const full = new Set(), syn = new Set(), weak = new Set();
  for (const m of k.mean) {
    // bracketed hints count too: "pupil (eye)" is about the eye
    for (const [, inner] of String(m).toLowerCase().matchAll(/\(([^)]*)\)/g)) {
      const h = normM(inner);
      if (h && !/\d/.test(h) && h.split(' ').length <= 2 && !MSTOP.has(h) && !/radical|kana/.test(h)) { weak.add(h); if (SYN_OF.has(h)) syn.add(SYN_OF.get(h)); }
    }
    const n = normM(m); if (!n || /radical|katakana|hiragana/.test(n)) continue;
    full.add(n);
    const ws = n.split(' ').filter(w => w.length > 2 && !MSTOP.has(w));
    if (SYN_OF.has(n)) syn.add(SYN_OF.get(n));
    else if (ws.length === 1 && SYN_OF.has(ws[0])) syn.add(SYN_OF.get(ws[0]));
    // the head word of a phrase: "hair of the head" → hair, "large river" → river
    if (ws.length > 1) { const head = / of /.test(n) ? n.split(' of ')[0].split(' ').pop() : ws[ws.length - 1]; if (head && !MSTOP.has(head)) { weak.add(head); if (SYN_OF.has(head)) syn.add(SYN_OF.get(head)); } }
  }
  return (k._mk = { full, syn, weak });
}
let SIMIDX = null;
function simIndex() {
  if (SIMIDX) return SIMIDX;
  const full = new Map(), syn = new Map(), weak = new Map();
  const put = (m, key, k) => { const a = m.get(key); if (a) a.push(k); else m.set(key, [k]); };
  for (const k of K) { const mk = mkeys(k); mk.full.forEach(x => put(full, x, k)); mk.syn.forEach(x => put(syn, x, k)); mk.weak.forEach(x => put(weak, x, k)); }
  return (SIMIDX = { full, syn, weak });
}
function similarKanji(k, n = 6) {
  const idx = simIndex(), mk = mkeys(k), score = new Map();
  const add = (list, s) => (list || []).forEach(x => { if (x !== k) score.set(x, (score.get(x) || 0) + s); });
  mk.full.forEach(m => { add(idx.full.get(m), 3); add(idx.weak.get(m), 1); });
  mk.syn.forEach(g => add(idx.syn.get(g), 2));
  mk.weak.forEach(w => add(idx.full.get(w), 1));
  return [...score].sort((a, b) => b[1] - a[1] || (a[0].r || 9999) - (b[0].r || 9999)).slice(0, n).map(([x, s]) => ({ x, s }));
}
/** True when two kanji share a meaning closely enough to make a quiz ambiguous. */
function kanjiOverlap(a, b) {
  const A = mkeys(a), B = mkeys(b);
  for (const m of A.full) if (B.full.has(m)) return true;
  for (const g of A.syn) if (B.syn.has(g)) return true;
  return false;
}
const vgl = x => x._ng || (x._ng = new Set(x.senses.flatMap(s => s.g).map(normM).filter(Boolean)));
function vocabOverlap(a, b) { const B = vgl(b); for (const g of vgl(a)) if (B.has(g)) return true; return normM(a.m) === normM(b.m); }

/* ---------- KanjiVG stroke order ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function strokeSvg(sd, upto, cls) {
  const grid = '<g class="grid"><line x1="54.5" y1="0" x2="54.5" y2="109"/><line x1="0" y1="54.5" x2="109" y2="54.5"/></g>';
  if (cls === 'frame') return `<svg viewBox="0 0 109 109">${grid.replace('class="grid"', 'class="grid" style="stroke:var(--line);stroke-width:1;stroke-dasharray:3 3"')}<g class="fg">${sd.d.slice(0, upto).map((d, i) => `<path d="${esc(d)}" class="${i === upto - 1 ? 'cur' : ''}"/>`).join('')}</g></svg>`;
  return `<svg viewBox="0 0 109 109" class="ksvg">${grid}<g class="bg">${sd.d.map(d => `<path d="${esc(d)}"/>`).join('')}</g><g class="fg">${sd.d.map(d => `<path d="${esc(d)}"/>`).join('')}</g>${settings.strokeNums && sd.n.length ? `<g class="nums">${sd.n.map((p, i) => `<text x="${p[0]}" y="${p[1]}">${i + 1}</text>`).join('')}</g>` : ''}</svg>`;
}
function animate(el) {
  const paths = [...el.querySelectorAll('.fg path')]; let t = 0.15;
  paths.forEach(p => { let L = 100; try { L = p.getTotalLength(); } catch (e) {} p.style.transition = 'none'; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p._len = L; });
  el.getBoundingClientRect();
  paths.forEach(p => { const dur = Math.min(0.85, Math.max(0.25, p._len / 85)); p.style.transition = `stroke-dashoffset ${dur}s ease-in-out ${t}s`; p.style.strokeDashoffset = 0; t += dur + 0.12; });
}
/* tap a kanji in a sentence to open its details: example sentences, grammar examples, the quote of the day
   and the big word on a word card. Only kanji the app has data for are tappable; text inside buttons,
   links and furigana is left alone. */
const KANJI_ZONES = '.ex .jp, .qj, .sign-word, .lpts li';
function linkKanji(root) {
  root.querySelectorAll(KANJI_ZONES).forEach(zone => {
    if (zone.dataset.kl) return; zone.dataset.kl = 1;
    const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('rt, rp, button, a, .kcx') ? NodeFilter.FILTER_REJECT : /\p{Script=Han}/u.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const parts = n.nodeValue.split(/(\p{Script=Han})/u); if (!parts.some(t => KMAP[t])) continue;
      const frag = document.createDocumentFragment();
      for (const t of parts) {
        if (!t) continue;
        if (KMAP[t]) { const sp = document.createElement('span'); sp.className = 'kcx'; sp.dataset.open = 'k:' + t; sp.tabIndex = 0; sp.setAttribute('role', 'button'); sp.setAttribute('aria-label', `${t}: ${(KMAP[t].mean || []).slice(0, 2).join(', ')}`); sp.title = (KMAP[t].mean || []).slice(0, 3).join('; '); sp.textContent = t; frag.appendChild(sp); }
        else frag.appendChild(document.createTextNode(t));
      }
      n.replaceWith(frag);
    }
  });
}
/* ---------- tapping a kanji in a sentence: show the word it belongs to first ----------
   電車に乗る: tapping 電 or 車 offers 電車 (the word), then 電 and 車 to look at one by one.
   Words are found in the dictionary by longest match around the tapped kanji, including
   conjugated forms (食べた → 食べる) by matching the word's kanji stem and as much of its kana ending as fits. */
const isHan = c => /\p{Script=Han}|々/u.test(c), isHira = c => /[ぁ-ゟ]/.test(c);
let WIDX = null, WIDXn = -1;
function wordIndex() {
  const all = V.concat(Object.values(SITX || {}));
  if (WIDX && WIDXn === all.length) return WIDX;
  const ex = new Map(), stem = new Map(), add = (m, k, x) => { if (!m.has(k)) m.set(k, []); m.get(k).push(x); };
  for (const x of all) for (const w of [x.w, x.alt]) {
    if (!w) continue; add(ex, w, x);
    const m = /^(.*[\p{Script=Han}々])([ぁ-ゟ]+)$/u.exec(w); if (m) add(stem, m[1], { x, tail: m[2] });
  }
  // words listed under each kanji (names and words outside the JLPT lists): shown, but have no full entry
  for (const k of K) for (const e of k.ex || []) if (e.w && !ex.has(e.w)) add(ex, e.w, { pseudo: true, w: e.w, r: e.r, m: e.m, lvl: e.l });
  WIDXn = all.length; return WIDX = { ex, stem };
}
function zoneText(zone) {
  let text = ''; const pos = new Map(), spans = [], nodes = [];
  const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('rt, rp') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  while (walker.nextNode()) { const n = walker.currentNode, kc = n.parentElement.closest('.kcx'); if (kc) { pos.set(kc, text.length); spans[text.length] = kc; } nodes.push([n, text.length]); text += n.nodeValue; }
  return { text, pos, spans, nodes };
}
/* how a verb / i-adjective ending can change: 飲む → 飲み・飲ま・飲ん…, 高い → 高く・高かった… (る verbs just drop る) */
const CONJ_ROW = { う: 'わいうえおっ', く: 'かきくけこいっ', ぐ: 'がぎぐげごい', す: 'さしすせそ', つ: 'たちつてとっ', ぬ: 'なにぬねのん', ぶ: 'ばびぶべぼん', む: 'まみむめもん', る: 'らりるれろっ', い: 'くかけさそ' };
function findWord(text, t) {
  const { ex, stem } = wordIndex(); let best = null;
  const consider = (x, s, e, score) => { if (!best || score > best.score || (score === best.score && (x.freq || 0) > (best.x.freq || 0))) best = { x, s, e, score }; };
  for (let s = Math.max(0, t - 6); s <= t; s++) for (let e = t + 1; e <= Math.min(text.length, s + 10); e++) {
    const sub = text.slice(s, e);
    for (const x of ex.get(sub) || []) consider(x, s, e, sub.length * 10 + (x.pseudo ? 0 : 3));
    if (isHan(text[e - 1]) && isHira(text[e] || '')) for (const { x, tail } of stem.get(sub) || []) {
      let m = 0; while (m < tail.length && text[e + m] === tail[m]) m++;
      const rest = tail.slice(m), next = text[e + m] || '';
      const ok = !rest || rest === 'る' || (rest.length === 1 && (CONJ_ROW[rest] || '').includes(next));
      if (ok) consider(x, s, e + m + (rest && rest !== 'る' ? 1 : 0), (sub.length + m + 1) * 10 + 1);   // 食べた → 食べる, 飲みます → 飲む
    }
  }
  return best;
}
function closeWordPop() {
  const p = document.querySelector('.kpop'); if (p) p.remove();
  document.querySelectorAll('.kc-sel').forEach(el => el.classList.remove('kc-sel'));
  try { if (window.CSS && CSS.highlights) CSS.highlights.delete('kp-word'); } catch (e) {}
}
function placePop(pop, el) {
  const r = el.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight, w = Math.min(320, vw - 24);
  pop.style.width = w + 'px';
  const left = Math.max(12, Math.min(vw - w - 12, r.left + r.width / 2 - w / 2));
  pop.style.left = left + 'px';
  const h = pop.offsetHeight, below = r.bottom + 8 + h < vh - 8;
  pop.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + 'px';
  pop.classList.toggle('above', !below);
}
async function showWordPop(kc) {
  closeWordPop();
  const zone = kc.closest(KANJI_ZONES), c = kc.textContent;
  if (!zone || zone.matches('.sign-word')) { openSheet(kc.dataset.open); return; }   // the word card's own word: go straight to the kanji
  const pop = document.createElement('div'); pop.className = 'kpop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Look up');
  pop.innerHTML = '<div class="kp-load">Looking up…</div>'; document.body.appendChild(pop); placePop(pop, kc);
  if (DATA.mode === 'full' && LV.some(l => !isLoaded('vocab', l))) { try { await loadAllVocab(); } catch (e) {} }
  if (!pop.isConnected) return;
  const { text, pos, spans } = zoneText(zone), t = pos.get(kc), hit = t == null ? null : findWord(text, t);
  if (!hit) { closeWordPop(); openSheet(kc.dataset.open); return; }
  const x = hit.x, word = text.slice(hit.s, hit.e);
  for (let i = hit.s; i < hit.e; i++) if (spans[i]) spans[i].classList.add('kc-sel');
  try {
    if (window.CSS && CSS.highlights && window.Highlight) {
      const { nodes } = zoneText(zone), at = off => { for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i][1] <= off) return [nodes[i][0], off - nodes[i][1]]; };
      const [sn, so] = at(hit.s), [en, eo] = at(hit.e - 1), range = document.createRange(); range.setStart(sn, so); range.setEnd(en, eo + 1);
      CSS.highlights.set('kp-word', new Highlight(range)); document.body.classList.add('has-hl');
    }
  } catch (e) {}
  const ks = [...new Set([...(x.w || word)].filter(ch => KMAP[ch]))];
  const head = `<span class="kp-w jp">${ruby(x.f || (x.r && x.r !== x.w ? `{${x.w}|${x.r}}` : x.w), true)}</span><span class="kp-m">${esc(x.m || '')}</span>`;
  pop.innerHTML = `${x.pseudo ? `<div class="kp-word static">${head}</div>` : `<button class="kp-word" data-open="${esc(x.id)}">${head}<span class="kp-go">Word ›</span></button>`}
    ${word !== x.w && !x.pseudo ? `<div class="kp-note">In the sentence as <span class="jp">${esc(word)}</span></div>` : ''}
    ${ks.length ? `<div class="kp-label">${ks.length > 1 ? 'Kanji in this word' : 'Kanji'}</div><div class="kp-kanji">${ks.map(ch => `<button data-open="k:${esc(ch)}" class="${ch === c ? 'on' : ''}"><b class="jp">${ch}</b><span>${esc((KMAP[ch].mean || [])[0] || '')}</span></button>`).join('')}</div>` : ''}`;
  placePop(pop, kc);
  const first = pop.querySelector('button'); if (first) first.focus({ preventScroll: true });
}
window.addEventListener('resize', closeWordPop);
document.addEventListener('scroll', closeWordPop, true);
function hydrate(root = document) {
  linkKanji(root); kpdHydrate(root);
  root.querySelectorAll('img[data-dpic]:not([src])').forEach(img => ankiMediaUrl(img.dataset.dpic).then(u => { if (u) img.src = u; else img.remove(); }));
  root.querySelectorAll('.strokes[data-k]:not([data-done])').forEach(el => {
    const c = el.dataset.k, k = KMAP[c] || (KANAMAP[c] && { lvl: 'KANA' }); el.dataset.done = 1;
    if (!k || DATA.mode !== 'full' || c.length > 1) return;
    load('strokes', k.lvl).then(obj => {
      const sd = obj && obj[c]; if (!sd) return;
      el.innerHTML = strokeSvg(sd) + '<button class="replay" aria-label="Replay stroke order">▶ replay</button>';
      el.querySelector('.replay').onclick = e => { e.stopPropagation(); animate(el); };
      animate(el);
      const fr = (el.closest('.detail') || root).querySelector(`[data-frames="${CSS.escape(c)}"]`);
      if (fr && sd.d.length <= 30) fr.innerHTML = sd.d.map((_, i) => strokeSvg(sd, i + 1, 'frame')).join('');
    }).catch(() => {});
  });
}

