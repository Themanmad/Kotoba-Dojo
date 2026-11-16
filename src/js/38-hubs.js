/* =====================================================================
   HUBS AND DASHBOARD: the five destinations (Home, Learn, Practice, Library,
   Explore) and the pieces of the Home dashboard. Every tile opens an existing
   screen; nothing here keeps its own data. All numbers come from the learner's
   real progress (progress, actLog, pathSt).
   ===================================================================== */
/** a tile: icon, title, one line, and an action; `meta` is a small right-hand note (a count, a level) */
function hubTile({ ic, t, d, act, meta, primary }) {
  return `<button class="hub-tile${primary ? ' primary' : ''}" onclick="${act}"><span class="hub-ic">${ICON[ic] || ''}</span><span class="hub-tx"><b>${t}</b><span>${d}</span></span>${meta ? `<span class="hub-meta">${meta}</span>` : ''}</button>`;
}
const hubSection = (title, tiles, note) => tiles.length ? `<section class="hub-sec"><h2>${title}</h2>${note ? `<p class="hub-note">${note}</p>` : ''}<div class="hub-grid">${tiles.map(hubTile).join('')}</div></section>` : '';

/* ---------- numbers for the dashboard (all from stored progress) ---------- */
function learnerStats() {
  let words = 0, wordsKnown = 0, kanji = 0, kanjiKnown = 0;
  for (const id in progress) {
    const v = id.startsWith('v:'), k = id.startsWith('k:'); if (!v && !k) continue;
    const st = status(id); if (st === 'new') continue;
    if (v) { words++; if (st === 'known') wordsKnown++; } else { kanji++; if (st === 'known') kanjiKnown++; }
  }
  const l = userLevel(), parts = ['vocab', 'kanji', 'grammar'].map(kind => levelStats(kind, l)).filter(x => x.total);
  // overall progress at your level: known counts fully, learning counts half
  const overall = parts.length ? Math.round(100 * parts.reduce((a, x) => a + (x.known + x.learning * 0.5) / x.total, 0) / parts.length) : 0;
  return { words, wordsKnown, kanji, kanjiKnown, level: l, overall };
}
/** the last 7 days, oldest first: minutes studied and answers given */
function weekActivity() {
  const out = [], now = new Date();
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const e = actLog[key] || {};
    out.push({ key, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()], min: Math.floor((e.sec || 0) / 60), ans: e.r || 0, today: i === 0 });
  }
  return out;
}
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
function statTiles() {
  const s = learnerStats(), wk = weekActivity(), st = streak(), wkMin = wk.reduce((a, d) => a + d.min, 0);
  const tile = (ic, big, label, sub) => `<div class="stat"><span class="stat-ic">${ICON[ic]}</span><b>${big}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  return `<div class="stats">
    ${tile('flame', st, `day streak`, st ? 'Keep it going' : 'Study today to start one')}
    ${tile('cards', fmtN(s.words), 'words studied', s.words ? `${fmtN(s.wordsKnown)} known well` : 'Your first lesson adds some')}
    ${tile('pen', fmtN(s.kanji), 'kanji studied', s.kanji ? `${fmtN(s.kanjiKnown)} known well` : 'They come with the lessons')}
    ${tile('clock', fmtMin(wkMin), 'this week', `${fmtMin(wk[6].min)} today`)}
  </div>`;
}
function weekChart() {
  const wk = weekActivity(), goal = settings.goalMin || 15, useMin = wk.some(d => d.min > 0), val = d => useMin ? d.min : d.ans;
  const max = Math.max(useMin ? goal : 10, ...wk.map(val)), any = wk.some(d => val(d) > 0);
  const bars = wk.map(d => { const v = val(d), h = v ? Math.max(6, Math.round(v / max * 100)) : 0;
    return `<div class="wk-col${d.today ? ' today' : ''}${useMin && d.min >= goal ? ' met' : ''}"><span class="wk-v">${v || ''}</span><div class="wk-bar"><i style="height:${h}%"></i></div><span class="wk-d">${d.day}</span></div>`; }).join('');
  return `<section class="card wk" aria-label="Study activity over the last 7 days"><div class="wk-head"><h2>This week</h2><span>${useMin ? `minutes a day · goal ${goal}` : 'answers a day'}</span></div>
    <div class="wk-cols" role="img" aria-label="${wk.map(d => `${d.day} ${val(d)}`).join(', ')}">${useMin ? `<div class="wk-goal" style="bottom:calc(22px + (100% - 44px) * ${Math.min(1, goal / max)})"></div>` : ''}${bars}</div>
    ${any ? '' : '<p class="wk-empty">No study logged this week yet. Your first session shows up here.</p>'}</section>`;
}
/** the most prominent card: where you are in the course and the next lesson */
function continueCard() {
  const placed = pathSt.place || Object.keys(pathSt.done).length;
  if (!placed) return `<section class="card cont"><div class="cont-k">Start here</div><h2>Find your starting point</h2><p>A short check of your kana, words, kanji and grammar picks the right first lesson. New to Japanese? It starts you at the very beginning.</p>
    <div class="cont-row"><button class="btn" onclick="App.placeStart()">Take the 5-minute check</button><button class="btn line" onclick="App.go('kana')">Learn kana first</button></div></section>`;
  const u = nextUnit('jlpt'), l = u.lvl || userLevel(); let c = null; try { c = levelCoverage(l); } catch (e) {}
  const pct = c && c.lessons ? Math.round(100 * c.lessonsDone / c.lessons) : 0;
  let last = null; for (const id in pathSt.done) { const d = pathSt.done[id], x = unitById(id); if (x && x.lvl && !x.exam && (!last || d.d > last.d.d)) last = { u: x, d }; }
  const kind = u.exam ? 'Mock exam' : u.cp ? 'Checkpoint' : 'Next lesson';
  return `<section class="card cont" style="--lc:${lcVar(l)}"><div class="cont-top"><span class="tag lv">${esc(l)}</span><span class="cont-k">JLPT course · ${esc(LEVEL_NAME[l] || '')}</span></div>
    <div class="cont-next"><small>${kind} · ${esc(unitLabel(u))}</small><h2>${esc(u.t)}</h2><p>${esc(u.s || '')}</p></div>
    ${c ? `<div class="cont-prog"><div class="pbar"><i style="width:${pct}%"></i></div><span>${c.lessonsDone} of ${c.lessons} lessons · ${pct}%</span></div>` : ''}
    ${last ? `<div class="cont-last">${ICON.check}<span>Last finished: <b>${esc(last.u.t)}</b>${last.d.sc != null ? ` · ${last.d.sc}%` : ''}</span></div>` : ''}
    <div class="cont-row"><button class="btn" onclick="App.lesson('${u.id}')">${flagged('lesson') ? 'Do another lesson' : 'Continue learning'}</button><button class="btn line" onclick="App.go('path')">See the whole path</button></div></section>`;
}
const dojoGreeting = () => { const h = new Date().getHours(); return h < 11 ? ['おはよう', 'Good morning'] : h < 18 ? ['こんにちは', 'Hello'] : ['こんばんは', 'Good evening']; };
function quickAccess() {
  const q = [['search', 'Search', "App.go('search')"], ['cards', 'Flashcards', "App.go('vocab','cards')"], ['pen', 'Kanji', "App.go('kanji')"], ['forms', 'Grammar', "App.go('grammar')"], ['book', 'Reading', "App.go('read')"], ['chat', 'Chat', "App.go('chat')"]];
  return `<section class="hub-sec"><h2>Quick access</h2><div class="quick">${q.map(([ic, t, act]) => `<button onclick="${act}">${ICON[ic]}<span>${t}</span></button>`).join('')}</div></section>`;
}

/* ---------- Learn ---------- */
function vLearn() {
  const l = userLevel(), tu = nextUnit('travel'); let c = null; try { c = levelCoverage(l); } catch (e) {}
  const hk = KANA.filter(x => status(x.id) === 'known').length;
  const courses = [
    { ic: 'route', t: 'JLPT course', d: 'Lesson by lesson from N5 to N1, with checkpoints and a mock exam for each level', act: "S.ptab='jlpt';App.go('path')", meta: c && c.lessons ? `${l} · ${Math.round(100 * c.lessonsDone / c.lessons)}%` : l },
    { ic: 'plane', t: 'Travel Japanese', d: `Airport, trains, hotels, restaurants. Next: ${esc(tu.t)}`, act: "S.ptab='travel';App.go('path')" },
    { ic: 'book', t: 'Textbooks', d: 'Follow Genki I & II or Basic Kanji Book, lesson by lesson', act: "App.go('books')", meta: settings.book && settings.book.id ? `Lesson ${settings.book.L}` : '' },
    { ic: 'chat', t: 'Everyday situations', d: 'The words and phrases for shops, stations, doctors and more', act: "App.go('vocab','sit')" },
    ...(ANKI.decks.length ? [{ ic: 'deck', t: 'My Anki decks', d: 'Lessons built from the decks you imported', act: "S.ptab='anki';App.go('path')", meta: `${ANKI.decks.length} deck${ANKI.decks.length === 1 ? '' : 's'}` }] : [])
  ];
  const basics = [
    { ic: 'forms', t: 'Kana', d: 'Hiragana and katakana: charts, stroke order and drills', act: "App.go('kana')", meta: `${hk} / ${KANA.length}` }
  ];
  return `<h1>Learn</h1><p class="sub">Structured courses that teach in order. Pick one and follow it; your progress is shared across all of them.</p>
  ${continueCard()}
  ${hubSection('Courses', courses)}
  ${hubSection('The basics', basics, 'New to Japanese? Start with the two kana alphabets.')}`;
}

/* ---------- Practice ---------- */
function vPractice() {
  const due = dueCount(), full = DATA.mode === 'full', ts = todayStop();
  const review = [
    { ic: 'cards', t: due ? `Review ${fmtN(due)} card${due === 1 ? '' : 's'}` : 'Flashcards', d: due ? 'Due today, timed so you see each one just before you’d forget it' : 'Nothing is due. You can still study new cards', act: "App.go('vocab','cards')", meta: due ? 'Due' : '', primary: due > 0 },
    ...(ts && !ts.done ? [{ ic: 'check', t: ts.title.replace('Practice: ', 'Today: '), d: ts.sub, act: ts.act }] : [])
  ];
  const drills = [
    { ic: 'shuffle', t: 'Word quiz', d: 'Meanings, readings and typing, at the levels you choose', act: "App.go('vocab','test')" },
    { ic: 'pen', t: 'Kanji writing', d: 'Write kanji stroke by stroke, traced or from memory', act: full ? 'App.writePick()' : "App.go('kanji')" },
    { ic: 'forms', t: 'Grammar drills', d: 'Fill the gap, build the sentence, pick the pattern', act: "App.go('grammar')" },
    { ic: 'forms', t: 'Conjugation', d: 'Verb and adjective forms, with the rule behind every answer', act: "App.go('conj')" },
    { ic: 'book', t: 'Reading', d: 'Short passages with exam-style questions', act: "App.go('read')" }
  ];
  const audio = [
    ...(full && listenWords().length >= 8 ? [{ ic: 'ear', t: 'Listening', d: 'Hear words you’ve learned and pick the right one', act: 'App.todayListen()' }] : [{ ic: 'ear', t: 'Listening', d: 'Hear a word and pick or type it. Choose “Listen” as the question type', act: V.some(x => x.au) ? "S.tf.dir='hear';App.go('vocab','test')" : "App.go('vocab','test')" }]),
    ...(shAvailable() ? [{ ic: 'mic', t: 'Shadowing', d: 'Say sentences after a native speaker and compare', act: 'App.shadowStart()' }] : [])
  ];
  const exams = [
    { ic: 'exam', t: 'Mock exam', d: 'Timed, JLPT-style, scored against the real pass marks', act: "App.go('exam')", meta: userLevel() },
    ...(ANKI.decks.length ? [{ ic: 'deck', t: 'Deck quiz', d: 'Test yourself on everything in your Anki decks', act: 'App.dquiz()' }] : [])
  ];
  return `<h1>Practice</h1><p class="sub">Keep what you’ve learned. Start with what’s due, then drill a skill.</p>
  ${hubSection('Review', review)}${hubSection('Drills', drills)}${hubSection('Listening and speaking', audio)}${hubSection('Test yourself', exams)}
  ${troubleCard()}`;
}

/* ---------- Explore ---------- */
function vExplore() {
  const tiles = [
    { ic: 'chat', t: 'Chat with Yui', d: 'Practise real conversation in Japanese at your level, with corrections', act: "App.go('chat')" },
    { ic: 'town', t: 'Play: the town', d: 'Walk around a Japanese town and talk your way through shops, trains and cafés', act: "App.go('play')" }
  ];
  return `<h1>Explore</h1><p class="sub">Use your Japanese in freer settings, once the lessons feel comfortable.</p>
  ${hubSection('Try it out', tiles)}
  ${wotdCard()}${quoteCard()}`;
}

/* ---------- profile summary (top of Settings) ---------- */
function profileCard() {
  const s = learnerStats(), st = streak(), wkMin = weekActivity().reduce((a, d) => a + d.min, 0);
  return `<section class="card prof" style="--lc:${lcVar(s.level)}"><div class="prof-top"><span class="prof-av">${ICON.user}</span><div><b>Your dojo</b><span>Working on <span class="tag lv">${esc(s.level)}</span> · ${s.overall}% of this level</span></div></div>
    <div class="prof-stats"><span><b>${st}</b>day streak</span><span><b>${fmtN(s.words)}</b>words</span><span><b>${fmtN(s.kanji)}</b>kanji</span><span><b>${fmtMin(wkMin)}</b>this week</span></div></section>`;
}

/* ---------- Home customisation: which sections the dashboard shows ---------- */
const DASH_PARTS = [['stats', 'Statistics', 'Streak, words, kanji and study time'], ['plan', 'Today’s plan', 'The list of things to do today'], ['quick', 'Quick access', 'Shortcut buttons'], ['week', 'This week', 'The chart of your study time'],
  ['trouble', 'Trouble spots', 'Items you keep missing'], ['wotd', 'Word of the day', ''], ['levels', 'Progress by level', 'Bars for every JLPT level'], ['quote', 'Quote of the day', '']];
const dashOn = k => !(settings.dash && settings.dash[k] === false);
function dashCard() {
  return `<div class="label">Home screen</div><div class="card"><p class="dash-note">Choose what Home shows. The next lesson always stays at the top.</p>
    ${DASH_PARTS.map(([k, t, dsc]) => `<div class="set"><div><b>${t}</b>${dsc ? `<span>${dsc}</span>` : ''}</div><label class="sw"><input type="checkbox" ${dashOn(k) ? 'checked' : ''} onchange="App.dash('${k}',this.checked)" aria-label="Show ${t}"><span></span></label></div>`).join('')}</div>`;
}
Object.assign(App, { dash(k, on) { settings.dash = Object.assign({}, settings.dash, { [k]: !!on }); saveSettings(); render(); } });
