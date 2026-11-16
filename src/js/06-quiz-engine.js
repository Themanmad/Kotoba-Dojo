/* =====================================================================
   QUIZ ENGINE (learn + test) and FLASHCARDS
   ===================================================================== */
function distract(item, pool, key, same, n = 3) {
  const k0 = key(item), seen = new Set([k0]), out = [];
  const clash = item.kind === 'kanji' ? x => kanjiOverlap(item, x) : item.kind === 'grammar' ? x => grammarOverlap(item, x) : x => vocabOverlap(item, x);
  const others = pool.filter(x => x.id !== item.id && !clash(x));
  const near = shuffle(others.filter(same)).slice(0, 60), far = shuffle(others).slice(0, 60);
  for (const x of near.concat(far)) { if (out.length >= n) break; const kx = key(x); if (!seen.has(kx)) { seen.add(kx); out.push(x); } }
  return out;
}
function makeQ(kind, item, dir) {
  if (dir === 'type' && (kind === 'vocab' || kind === 'kanji')) return makeTypeQ(kind, item);
  if (kind === 'kana') return makeKanaQ(item, dir);
  if (kind === 'grammar') return makeGrammarQ(item, dir);
  if (kind === 'vocab') {
    const pool = V.length > 40 ? V.filter(x => x.lvl === item.lvl || Math.abs(LV.indexOf(x.lvl) - LV.indexOf(item.lvl)) <= 1) : V;
    if (dir === 'p2w' && picAsk(item)) {
      const ppool = pool.filter(x => picAsk(x) && picKey(x) !== picKey(item)), bigger = ppool.length >= 3 ? ppool : pool;
      const opts = shuffle([item, ...distract(item, bigger, x => x.w, x => x.pos === item.pos)]);
      return { item, dir, jp: false, say: wordSay(item.r), au: item.au, hint: 'Which word is this?',
        prompt: `<div class="ppic">${wordPic(item, 'xl')}</div>`, meta: `<span class="tag lv">${lvName(item.lvl)}</span>`, grid: true,
        opts: opts.map(x => ({ html: `<span class="jp cjp">${ruby(x.f)}</span>`, ok: x === item })) };
    }
    if (dir === 'p2w') dir = 'en2jp';
    /* listening: only words with a native recording. Options never share the word's reading,
       so a homophone (雨 / 飴) can't be a "wrong" answer that sounds exactly right. */
    if ((dir === 'hear' || dir === 'dict') && item.au) {
      const play = `<button class="listen big" data-audio="${esc(item.au)}" aria-label="Play the recording">🔊 Play</button><div class="proma">Tap to hear it again</div>`;
      if (dir === 'dict') return { item, dir, type: 'read', dict: true, jp: false, say: '', au: item.au, autoplay: item.au, prompt: play, grid: false, opts: [], msg: '', hinted: false,
        meta: `<span class="tag lv">${lvName(item.lvl)}</span><span class="tag">聴解 dictation</span>`, hint: 'Type the word you hear, in kana or romaji' };
      const hpool = pool.filter(x => hiraNorm(x.r) !== hiraNorm(item.r)), opts = shuffle([item, ...distract(item, hpool.length >= 3 ? hpool : pool.filter(x => x.r !== item.r), x => x.w, x => x.pos === item.pos)]);
      return { item, dir, jp: false, say: '', au: item.au, autoplay: item.au, hint: 'Which word do you hear?', prompt: play,
        meta: `<span class="tag lv">${lvName(item.lvl)}</span><span class="tag">聴解</span>`, grid: true,
        opts: opts.map(x => ({ html: `<span class="jp cjp">${ruby(x.f)}</span>`, ok: x === item })) };
    }
    if (dir === 'hear' || dir === 'dict') dir = 'jp2en';
    if (dir === 'jp2en') {
      const opts = shuffle([item, ...distract(item, pool, x => x.m, x => x.pos === item.pos)]);
      return { item, dir, jp: true, say: wordSay(item.r), au: item.au, hint: 'What does this mean?',
        prompt: `<div class="pword jp">${ruby(item.f)}</div>${settings.romaji ? `<div class="proma">${esc(toRomaji(item.r))}</div>` : ''}`,
        meta: `<span class="tag lv">${lvName(item.lvl)}</span>${freqBadge(item.freq)}`, grid: false, opts: opts.map(x => ({ html: esc(x.m), ok: x === item })) };
    }
    const opts = shuffle([item, ...distract(item, pool, x => x.w, x => x.pos === item.pos)]);
    return { item, dir, jp: false, say: wordSay(item.r), au: item.au, hint: 'Which word means this?',
      prompt: `<div class="pmean">${esc(item.m)}</div>`, meta: `<span class="tag lv">${lvName(item.lvl)}</span>${freqBadge(item.freq)}`, grid: true,
      opts: opts.map(x => ({ html: `<span class="jp cjp">${ruby(x.f)}</span>${settings.romaji ? `<span class="proma">${esc(toRomaji(x.r))}</span>` : ''}`, ok: x === item })) };
  }
  const meta = `<span class="tag lv">${item.lvl}</span>${freqBadge(item.freq)}`, say = wordSay(item.ex[0] ? item.ex[0].r : (item.kun.find(k => !k.startsWith('-')) || item.on[0] || '').split('.').join('')), au = item.ex[0] ? ((VMAP['v:' + item.ex[0].w + '|' + item.ex[0].r] || {}).au || null) : null;
  const pool = K.filter(x => x.lvl === item.lvl).length > 10 ? K.filter(x => x.lvl === item.lvl) : K;
  if (dir === 'p2k' && item.pic && settings.pics) {
    const ppool = K.filter(x => x.pic && x.pic !== item.pic), bigger = ppool.length >= 3 ? ppool : pool;
    const opts = shuffle([item, ...distract(item, bigger, x => x.k, () => true)]);
    return { item, dir, jp: false, say, au, hint: 'Which kanji is this?', prompt: `<div class="ppic">${picHtml(item.pic, 'xl')}</div>`, meta, grid: true, opts: opts.map(x => ({ html: `<span class="jp ckanji">${x.k}</span>`, ok: x === item })) };
  }
  if (dir === 'p2k') dir = 'm2k';
  if (dir === 'm2k') {
    const opts = shuffle([item, ...lookDistract(item, pool, x => x.k)]);
    return { item, dir, jp: false, say, au, hint: 'Which kanji has this meaning?', prompt: `<div class="pmean">${esc(item.m)}</div>`, meta, grid: true, opts: opts.map(x => ({ html: `<span class="jp ckanji">${x.k}</span>`, ok: x === item })) };
  }
  if (dir === 'k2r') {
    const opts = shuffle([item, ...distract(item, pool, kRead, () => true)]);
    return { item, dir, jp: false, say, au, hint: 'Which readings belong to this kanji?', prompt: `<div class="pkanji jp">${item.k}</div>`, meta, grid: false, opts: opts.map(x => ({ html: `<span class="jp">${esc(kRead(x))}</span>`, ok: x === item })) };
  }
  const opts = shuffle([item, ...lookDistract(item, pool, x => x.m)]);
  return { item, dir, jp: false, say, au, hint: 'What does this kanji mean?', prompt: `<div class="pkanji jp">${item.k}</div>`, meta, grid: false, opts: opts.map(x => ({ html: esc(x.m), ok: x === item })) };
}
/* ---------- Learn sessions ----------
   Each round is a deck of distinct items: words you're learning (most overdue first),
   then new ones (most common first), then a few known ones to keep them fresh.
   Nothing repeats in a round except an item you got wrong, which comes back a few
   questions later so you can try it again. Later rounds skip everything already shown. */
const ROUND = 20;
const basePool = kind => kind === 'kanji' ? kSelection() : kind === 'grammar' ? gSel() : kind === 'kana' ? kanaSel() : vSel().concat(bookStudied());
function learnDeck(kind, exclude, custom) {
  const all = (custom || basePool(kind)).filter(x => !exclude.has(x.id));
  const now = Date.now(), byDue = (a, b) => (progress[a.id].d || 0) - (progress[b.id].d || 0);
  const learning = all.filter(x => progress[x.id] && status(x.id) !== 'known').sort(byDue);
  const knownDue = all.filter(x => status(x.id) === 'known' && (progress[x.id].d || 0) <= now).sort(byDue);
  // a curated pool (situations) keeps its own most-to-least-common order; kana keeps chart order
  const fresh = custom || kind === 'kana' ? all.filter(x => !progress[x.id]) : freshFirst(all.filter(x => !progress[x.id]), 'learn').sort((a, b) => (deckRk(a) - deckRk(b)) || b.freq - a.freq);
  const known = freshFirst(all.filter(x => status(x.id) === 'known' && (progress[x.id].d || 0) > now), 'learn');
  const deck = [], add = list => { for (const x of list) { if (deck.length >= ROUND) break; if (!deck.includes(x)) deck.push(x); } };
  add(learning.slice(0, 12)); add(knownDue.slice(0, 4)); add(fresh); add(learning); add(knownDue); add(known);
  return shuffle(deck);
}
function startLearn(kind, carry, custom) {
  const used = carry ? carry.used : new Set(); custom = custom || (carry && carry.custom) || null;
  const pdir = kind === 'vocab' ? S.vf.dir : kind === 'kanji' ? S.kf.qt : '';
  if ((pdir === 'p2w' || pdir === 'p2k') && settings.pics) custom = (custom || basePool(kind)).filter(x => kind === 'vocab' ? picAsk(x) : x.pic);
  const deck = learnDeck(kind, used, custom);
  if (deck.length < 2 && !carry) return toast('Select at least two items');
  if (!deck.length) { toast("You've been through everything in this selection"); return; }
  deck.forEach(x => used.add(x.id)); markSeen(deck.map(x => ['learn', x.id]));
  dayFlag(custom ? 'sit' : kind === 'kana' ? 'kana' : 'learn');
  S.session = { mode: 'learn', kind, deck, idx: 0, unique: deck.length, dir: kind === 'vocab' ? S.vf.dir : kind === 'grammar' ? S.gq : kind === 'kana' ? S.kanaQ : S.kf.qt,
    seen: 0, correct: 0, streak: 0, first: new Map(), retries: new Map(), used, round: carry ? carry.round + 1 : 1, custom, back: carry ? carry.back : S.back };
  S.back = null;
  nextQ();
}
function startTest(items, custom) {
  const kind = custom ? 'vocab' : S.tf.deck;
  const pool = custom || (kind === 'vocab' ? vSel() : kind === 'grammar' ? G.filter(g => settings.levels.includes(g.lvl)) : kind === 'kana' ? kanaSel() : K.filter(k => settings.levels.includes(k.lvl)));
  if (pool.length < 2) return toast('Nothing to test');
  const picOnly = !custom && (S.tf.dir === 'p2w' || S.tf.dir === 'p2k') && settings.pics;
  const queue = items || freshFirst(picOnly ? pool.filter(x => kind === 'vocab' ? picAsk(x) : x.pic) : pool, 'test-' + kind).slice(0, S.tf.count);
  if (!items) markSeen(queue.map(x => ['test-' + kind, x.id]));
  S.session = { mode: 'test', kind, pool, queue, idx: 0, dir: custom ? 'mix' : S.tf.dir, results: [], back: S.back }; S.back = null;
  nextQ();
}
function nextQ() {
  const s = S.session; let item;
  const list = s.mode === 'test' ? s.queue : s.deck;
  if (s.idx >= list.length) { s.done = true; render(); window.scrollTo(0, 0); return; }
  item = list[s.idx];
  let dir = s.dir;
  if (dir === 'mix') dir = pick(s.kind === 'vocab' ? ['jp2en', 'en2jp', ...(picAsk(item) ? ['p2w'] : []), ...(item.au ? ['hear'] : [])] : s.kind === 'grammar' ? ['gfill', 'gfill', 'g2m', 'm2g'] : s.kind === 'kana' ? ['k2r', 'r2k', 'pair'] : ['k2m', 'm2k', 'k2r', ...(item.pic && settings.pics ? ['p2k'] : [])]);
  s.q = makeQ(s.kind, item, dir); s.answered = false; s.chosen = -1; s.undo = null;
  render(); window.scrollTo(0, 0); if (s.q.type) typeFocus();
  if (s.q.autoplay) setTimeout(() => { if (S.session === s && !s.answered) playAudio(s.q.autoplay); }, 250);
  else if (settings.autoSpeak && s.q.jp) playAudio(s.q.au);
}
function answer(i) {
  const s = S.session; if (!s || s.mode === 'cards' || s.mode === 'exam' || s.answered || s.done || !s.q.opts[i]) return;
  s.answered = true; s.chosen = i; const ok = s.q.opts[i].ok;
  if (s.q.dir === 'hear' || s.q.dir === 'dict') skillTick('listen', 8);
  buzz(ok);
  { const id = s.q.item.id; s.undo = { prev: progress[id] ? { ...progress[id] } : null, game: { ...game }, streak: s.streak, seen: s.seen, correct: s.correct, hadFirst: !!(s.first && s.first.has(id)), firstVal: s.first && s.first.get(id), retries: s.retries ? s.retries.get(id) || 0 : 0, deckLen: s.deck ? s.deck.length : 0, resLen: s.results ? s.results.length : 0 }; }
  rec(s.q.item, ok);
  // a correct answer plays the native recording of the word (tests & quizzes; not the mock exam)
  const sayNow = ok && settings.playOnCorrect && s.q.au;
  if (sayNow) playAudio(s.q.au);
  if (s.mode === 'learn') {
    s.seen++; if (ok) { s.correct++; s.streak++; } else s.streak = 0;
    const id = s.q.item.id; if (!s.first.has(id)) s.first.set(id, ok);
    // a missed item comes back a few questions later (at most twice), so you can try again
    if (!ok && (s.retries.get(id) || 0) < 2) { s.retries.set(id, (s.retries.get(id) || 0) + 1); s.deck.splice(Math.min(s.deck.length, s.idx + 4), 0, s.q.item); }
  }
  else s.results.push({ item: s.q.item, ok });
  render();
  if (s.mode === 'learn') { const a = $('.after'); if (a && a.scrollIntoView) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (settings.autoSpeak && !s.q.jp && !sayNow) playAudio(s.q.au); }
}
function next() { const s = S.session; if (!s) return; s.idx++; nextQ(); }

function cardQueue(kind, cram, custom) {
  const pool = custom || basePool(kind);
  if (cram) return shuffle(pool).slice(0, 20);
  const now = Date.now();
  const due = pool.filter(x => isDue(x.id, now)).sort((a, b) => progress[a.id].d - progress[b.id].d);
  const left = newLeft(kind);
  const fresh = (custom || kind === 'kana' ? pool.filter(x => !progress[x.id]) : pool.filter(x => !progress[x.id]).sort((a, b) => (deckRk(a) - deckRk(b)) || b.freq - a.freq || (a.r || 0) - (b.r || 0))).slice(0, left);
  return due.concat(fresh);
}
function startCards(kind, cram, custom) {
  const queue = cardQueue(kind, cram, custom);
  if (!queue.length) { S.session = null; toast('All caught up — nothing due and no new cards left today'); render(); return; }
  S.session = { mode: 'cards', kind, queue, idx: 0, flipped: false, counts: [0, 0, 0, 0], total: queue.length, hist: [], custom, back: S.back }; S.back = null;
  render(); window.scrollTo(0, 0);
  const c = queue[0]; if (settings.autoSpeak && kind === 'vocab' && settings.cardFront === 'jp') playWord(c);
}
function flip() { const s = S.session; if (!s || s.mode !== 'cards' || s.flipped || s.done) return; s.flipped = true; render(); if (settings.autoSpeak && s.kind === 'vocab') playWord(s.queue[s.idx]); }
function rate(g) {
  const s = S.session; if (!s || s.mode !== 'cards' || !s.flipped) return;
  const item = s.queue[s.idx], day = today();
  buzz(g > 0); store.set('swipeTip', store.get('swipeTip', 0) + 1);
  // remember everything this rating changes, so "Back" can undo it exactly
  const h = { idx: s.idx, id: item.id, g, day, prev: progress[item.id] ? { ...progress[item.id] } : null, log: actLog[day] ? { ...actLog[day] } : null, inserted: -1 };
  schedule(item, g); s.counts[g]++;
  if (g === 0) { h.inserted = Math.min(s.queue.length, s.idx + 4); s.queue.splice(h.inserted, 0, item); }
  s.hist.push(h);
  s.idx++; s.flipped = false;
  if (s.idx >= s.queue.length) s.done = true;
  render(); window.scrollTo(0, 0);
  if (!s.done && settings.autoSpeak && s.kind === 'vocab' && settings.cardFront === 'jp') playWord(s.queue[s.idx]);
}

/** Go back to the previous card and undo its rating, so it can be rated again. */
function back() {
  const s = S.session; if (!s || s.mode !== 'cards' || !s.hist || !s.hist.length) return;
  const h = s.hist.pop();
  if (h.prev) progress[h.id] = h.prev; else delete progress[h.id];
  if (h.log) actLog[h.day] = h.log; else delete actLog[h.day];
  save(); store.set('log', actLog);
  if (h.inserted >= 0) s.queue.splice(h.inserted, 1);
  s.counts[h.g]--; s.idx = h.idx; s.flipped = true; s.done = false;
  render(); window.scrollTo(0, 0);
}
function renderCards() {
  const s = S.session;
  if (s.done) {
    const [a, h, g, e] = s.counts;
    return `<div class="card score"><div class="muted">Session complete</div><div class="big">お疲れ様!</div><div>${s.total} card${s.total === 1 ? '' : 's'} · ${g + e} good/easy · ${h} hard · ${a} again</div></div>
    <button class="btn" onclick="App.cardsMore()">Check for more</button>${s.hist.length ? `<button class="btn sec" onclick="App.back()">‹ Back to last card</button>` : ''}<button class="btn line" onclick="App.endSession()">Done</button>`;
  }
  const item = s.queue[s.idx], vocab = s.kind === 'vocab';
  const frontJp = !vocab || settings.cardFront === 'jp';
  const front = vocab ? (frontJp ? `<div class="pword jp">${ruby(item.f)}</div>${settings.romaji ? `<div class="proma">${esc(toRomaji(item.r))}</div>` : ''}` : `${hasPic(item) ? `<div class="ppic">${wordPic(item, 'xl')}</div>` : ''}<div class="pmean">${esc(item.m)}</div>`)
    : s.kind === 'grammar' ? gCardFront(item) : s.kind === 'kana' ? `<div class="pkanji jp">${esc(item.ch)}</div>` : `<div class="pkanji jp">${item.k}</div>`;
  const remaining = s.queue.length - s.idx;
  const head = `<div class="qtop"><span class="qnav"><button class="ghost" onclick="App.endSession()">✕ End</button>${s.hist.length ? `<button class="ghost backbtn" onclick="App.back()" title="Previous card (undo its rating)">‹ Back</button>` : ''}</span><span>${remaining} left · ${progress[item.id] ? (isDue(item.id) ? 'review' : 'again') : '<b style="color:var(--accent)">new</b>'}</span></div>
    <div class="qbar"><i style="width:${(s.idx / s.queue.length) * 100}%"></i></div>`;
  if (!s.flipped) return `${head}<div class="card fcard" onclick="App.flip()"><span class="side">${vocab ? (frontJp ? 'Word' : 'Meaning') : s.kind === 'grammar' ? 'Grammar' : s.kind === 'kana' ? 'Kana' : 'Kanji'}</span>${front}<div class="pmeta"><span class="tag lv">${lvName(item.lvl)}</span>${s.kind === 'grammar' || s.kind === 'kana' ? '' : freqBadge(item.freq)}</div> ${frontJp && vocab ? sayBtn(item.au, 'say') : ''}</div>
    <p class="hint">${vocab ? (frontJp ? 'Recall the meaning (and reading).' : 'Recall the Japanese word.') : s.kind === 'grammar' ? (gRev() ? 'Recall the Japanese pattern, and how you’d say the example.' : 'Recall what it means and how it\'s formed.') : s.kind === 'kana' ? 'Say the sound out loud, then check.' : 'Recall the meaning and readings.'}</p>
    <button class="btn" onclick="App.flip()">Show answer</button>`;
  const lab = g => fmtIv(schedule(item, g, true));
  return `${head}<div class="card">${detail(item)}</div>
  <div class="rates">
    <button class="rate again" onclick="App.rate(0)">Again<small>${lab(0)}</small></button>
    <button class="rate" onclick="App.rate(1)">Hard<small>${lab(1)}</small></button>
    <button class="rate good" onclick="App.rate(2)">Good<small>${lab(2)}</small></button>
    <button class="rate easy" onclick="App.rate(3)">Easy<small>${lab(3)}</small></button>
  </div>${swipeTip()}<p class="note kbd" style="text-align:center">Keys: space to flip · 1–4 to rate · ← back</p>`;
}
function renderSession() {
  const s = S.session;
  if (s.mode === 'cards') return renderCards();
  if (s.mode === 'exam') return renderExam();
  if (s.done) return s.mode === 'learn' ? renderLearnDone() : renderResults();
  const q = s.q, test = s.mode === 'test', list = test ? s.queue : s.deck;
  const retry = !test && s.first.has(q.item.id) && !s.answered;
  const kindL = { vocab: 'Words', kanji: 'Kanji', grammar: 'Grammar', kana: 'Kana' }[s.kind] || '';
  const pos = test ? `${s.idx + 1} of ${s.queue.length}` : `${Math.min(s.first.size + (s.first.has(q.item.id) ? 0 : 1), s.unique)} of ${s.unique}`;
  const head = `<span class="qtitle">${test ? 'Test' : 'Learn'} · ${kindL} · ${pos}${retry ? ' · try again' : ''}</span>${s.mode === 'learn' && s.streak >= 2 ? `<span class="combo${s.answered && q.opts[s.chosen].ok ? ' bump' : ''}">×${s.streak}</span>` : '<span style="width:34px"></span>'}`;
  // route-style progress: one stop per question, filled green / red as you go
  let states;
  if (test) states = s.queue.map((_, i) => i < s.results.length ? (s.results[i].ok ? 'ok' : 'bad') : i === s.idx ? 'cur' : '');
  else { const order = []; for (const x of s.deck) if (!order.includes(x.id)) order.push(x.id); states = order.map(id => s.first.has(id) ? (s.first.get(id) ? 'ok' : 'bad') : id === q.item.id ? 'cur' : ''); }
  const track = states.length <= 30 ? `<div class="track" aria-hidden="true">${states.map(c => `<i class="${c}"></i>`).join('')}</div>` : `<div class="qbar"><i style="width:${(test ? s.idx / s.queue.length : s.first.size / s.unique) * 100}%"></i></div>`;
  const opts = q.opts.map((o, i) => {
    let c = 'choice';
    if (s.answered) c += (o.ok ? ' ok' : i === s.chosen ? ' bad' : ' dim') + (i === s.chosen ? ' picked' : '');
    return `<button class="${c}" onclick="App.answer(${i})"><span class="n">${i + 1}</span><span>${o.html}</span></button>`;
  }).join('');
  let after = '';
  if (s.answered) {
    const ok = q.opts[s.chosen].ok, last = s.idx + 1 >= list.length;
    const right = (q.opts.find(o => o.ok) || {}).html || '';
    after = `<div class="feedback ${ok ? 'good' : 'bad'}" role="status"><div class="fv">${ok ? (s.streak >= 3 ? `正解! ${s.streak} in a row` : pick(['正解! Correct', 'いいね! Nice one', 'すごい! Great'])) : 'おしい! Not quite'}<small>${ok ? '' : 'Answer: '}${right}</small>${!ok && s.undo ? '<button class="undo" onclick="App.undoAnswer()">↩ Undo, I misclicked</button>' : ''}</div>${hasRec(q.au) ? `<button class="vplay" data-audio="${esc(q.au)}" aria-label="Play the word">🔊</button>` : ''}<button class="btn" onclick="App.next()">${last ? 'See results' : 'Next'}</button></div>
      ${test ? qAfter(q, s.chosen) : `<div class="card" style="margin-top:12px">${detail(q.item)}</div>`}`;
  }
  return `<div class="qtop"><button class="ghost" onclick="App.endSession()">✕ End</button>${head}</div>
  ${track}
  <div class="card prompt">${q.prompt}<div class="pmeta">${q.meta}</div>${q.jp || s.answered ? sayBtn(q.au, 'say') : ''}</div>
  <div class="hint">${q.hint}${s.mode === 'learn' && !s.answered && !progress[q.item.id] && q.item.kind !== 'kana' ? ` <button class="ghost knowit" onclick="App.knowIt()">I already know this</button>` : ''}</div>
  ${q.type && !s.answered ? typeForm(q) : `<div class="choices ${q.grid ? 'grid2' : ''}">${opts}</div>`}
  <div class="after">${after}</div>`;
}
function renderLearnDone() {
  const s = S.session, n = s.first.size, ok = [...s.first.values()].filter(Boolean).length;
  const missed = [...s.first].filter(([, v]) => !v).map(([id]) => s.deck.find(x => x.id === id));
  const row = x => x.kind === 'vocab' ? vRow(x) : x.kind === 'grammar' ? gRow(x) : x.kind === 'kana' ? `<button class="row" data-open="${esc(x.id)}"><span class="rw jp" style="font-size:28px;min-width:44px">${esc(x.ch)}</span><span class="rm">${esc(x.ro)}</span></button>` : `<button class="row" data-open="${esc(x.id)}"><span class="rw jp" style="font-size:28px;min-width:44px">${x.k}</span><span class="rm">${esc(x.m)}</span></button>`;
  const left = learnDeck(s.kind, s.used, s.custom).length;
  return `<div class="card score"><div class="arrive">終点</div><div class="muted">Round ${s.round} complete · ${n} ${s.kind === 'kanji' ? 'kanji' : s.kind === 'grammar' ? 'grammar points' : s.kind === 'kana' ? 'characters' : 'words'}</div>
    <div class="big">${n ? Math.round(ok / n * 100) : 0}%</div><div>${ok} of ${n} right first time</div></div>
  ${missed.length ? `<div class="label">Missed this round (${missed.length}) — tap to review</div><div class="list">${missed.map(row).join('')}</div>` : '<p class="note" style="text-align:center">No misses this round.</p>'}
  ${left ? `<button class="btn" onclick="App.learnMore()">Next round · ${Math.min(left, ROUND)} new ${s.kind === 'vocab' ? 'words' : 'items'}</button>` : `<p class="note" style="text-align:center">You've been through every item in this selection.</p>`}
  <button class="btn line" onclick="App.endSession()">Done</button>`;
}
function renderResults() {
  const s = S.session, n = s.results.length, ok = s.results.filter(r => r.ok).length, pct = n ? Math.round(ok / n * 100) : 0;
  const msg = pct >= 90 ? '素晴らしい! Excellent' : pct >= 70 ? 'いいね! Good work' : pct >= 50 ? 'もう少し! Getting there' : 'がんばって! Keep practising';
  const missed = s.results.filter(r => !r.ok);
  const rows = missed.map(({ item: x }) => x.kind === 'kana' ? `<button class="row" data-open="${esc(x.id)}"><span class="rw jp" style="font-size:28px;min-width:44px">${esc(x.ch)}</span><span class="rm">${esc(x.ro)}</span></button>` : x.kind === 'vocab' ? vRow(x)
    : `<button class="row" data-open="${esc(x.id)}"><span class="rw jp" style="font-size:28px;min-width:44px">${x.k}</span><span class="rm">${esc(x.m)} · <span class="jp">${esc(kRead(x))}</span></span>${freqBadge(x.freq, true)}</button>`).join('');
  return `<div class="card score"><div class="muted">Your score</div><div class="big">${pct}%</div><div>${ok} of ${n} correct</div><div style="margin-top:6px;font-weight:600">${msg}</div></div>
  ${missed.length ? `<div class="label">To review (${missed.length}) — tap for details</div><div class="list force">${rows}</div>
  <button class="btn" onclick="App.retry()">Retest my mistakes</button>` : `<p class="note" style="text-align:center">Perfect run — nothing to review.</p>`}
  <button class="btn sec" onclick="App.newTest()">New test</button>
  <button class="btn line" onclick="App.endSession()">Done</button>`;
}

