/* =====================================================================
   GRAMMAR (hanabira.org when built, starter set otherwise)
   ===================================================================== */
let G = [], GMAP = {};
function normG(x, lvl) {
  return { id: 'g:' + lvl + ':' + x.t, kind: 'grammar', t: x.t, m: x.m || '', x: x.x || '', fm: x.fm || '', ex: (x.ex || []).filter(e => !/\(Note|[$][0-9]|\bNote:/i.test(String(e.j) + ' ' + String(e.e || ''))), lvl, freq: 3 };
}
function starterGrammar() {
  const out = {};
  for (const l of LV) out[l] = (STARTER_GRAMMAR[l] || []).map(a => ({ t: a[0], m: a[1], fm: a[2], x: a[3], ex: a[4].map(([j, e]) => ({ j, e })) }));
  return out;
}
const grammarFull = () => DATA.mode === 'full' && DATA.meta && DATA.meta.counts && DATA.meta.counts.grammar && Object.values(DATA.meta.counts.grammar).some(n => n > 0);
const gLevels = () => LV.filter(l => levelTotal('grammar', l) > 0);
const gSelLevels = () => { const a = gLevels().filter(l => settings.glevels.includes(l)); return a.length ? a : gLevels().slice(0, 1); };
function loadGrammar(levels) { return Promise.all((levels || gSelLevels()).map(l => load('grammar', l))); }
function gSel() {
  const lv = gSelLevels(), q = (S.gf.q || '').trim().toLowerCase();
  return G.filter(g => lv.includes(g.lvl) && (!q || g.t.toLowerCase().includes(q) || g.m.toLowerCase().includes(q) || plain(g.t).includes(q)));
}

/** Japanese forms of a grammar point that can be found in (and blanked out of) a sentence.
    "〜てはいけない" → てはいけない, てはいけません; "だ / です" → だ, です; "たことがある" → …あります */
function gVariants(g) {
  if (g._v) return g._v;
  const base = plain(g.t).replace(/[（(][^）)]*[）)]/g, ' ').split(/[\/／・,、;…]|\.\.\.|\s+or\s+/)
    .map(x => x.replace(/[〜~～…。]|[A-Za-z+]+|\s+/g, '').trim()).filter(x => /[぀-ヿ㐀-鿿]/.test(x));
  const out = [], push = (v, tag) => { if (v && !out.some(o => o.v === v)) out.push({ v, tag }); };
  const U = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み' };
  for (const b of base) {
    push(b, 'plain');
    if (/(ます|です|ましょう|でしょう|ません|ました|でした)$/.test(b)) continue; // already conjugated
    if (/ならない$/.test(b)) push(b.replace(/ならない$/, 'なりません'), 'masen');
    else if (/ない$/.test(b)) push(b.replace(/ない$/, 'ません'), 'masen');
    if (/だ$/.test(b)) push(b.replace(/だ$/, 'です'), 'desu');
    if (/ある$/.test(b)) push(b.replace(/ある$/, 'あります'), 'masu');
    else if (/る$/.test(b)) push(b.slice(0, -1) + 'ます', 'masu');
    else if (U[b.slice(-1)]) push(b.slice(0, -1) + U[b.slice(-1)] + 'ます', 'masu');
  }
  return (g._v = out);
}
/** Find an example sentence containing one of the grammar's forms (longest match wins). */
function gBlank(g) {
  const vs = gVariants(g).slice().sort((a, b) => b.v.length - a.v.length);
  for (const e of shuffle(g.ex)) {
    const p = plain(e.j);
    for (const v of vs) { const i = p.indexOf(v.v); if (i >= 0) return { e, p, v, i }; }
  }
  return null;
}
const grammarOverlap = (a, b) => normM(a.m) === normM(b.m) || a.t === b.t;
/** Wrong options for a fill-in grammar question, in the same politeness as the blank. */
function gFillOpts(item, v, pool, sentence) {
  const cands = [], seen = new Set([v.v]), L = v.v.length;
  for (const x of shuffle(pool)) {
    if (x === item || grammarOverlap(item, x)) continue;
    const vs = gVariants(x); const c = vs.find(o => o.tag === v.tag) || vs[0];
    if (!c || seen.has(c.v) || c.v.includes(v.v) || v.v.includes(c.v) || /[。、？！?!,.]/.test(c.v)) continue;
    seen.add(c.v); cands.push({ v: c.v, score: Math.abs(c.v.length - L) + (c.tag === v.tag ? 0 : 2) });
  }
  // prefer options that look like the answer: similar length, same politeness
  return cands.sort((a, b) => a.score - b.score).slice(0, 3).map(c => c.v);
}
/* ---------- neat grammar display ----------
   Patterns as Japanese chips, English notes set apart, 〜 / … as placeholders,
   formation as building blocks, and the grammar highlighted inside examples. */
function gSplitTitle(t) {
  const notes = [];
  let jp = String(t).replace(/[（(]([^）)]*)[）)]/g, (m, x) => { notes.push(x.trim()); return ' '; });
  // English words outside brackets ("Verb + たい") are notes too, unless there's no Japanese at all
  if (/[\u3040-\u30ff\u3400-\u9fff]/.test(jp)) jp = jp.replace(/\b(?:verb|noun|adj(?:ective)?|i-adj|na-adj|form|stem|plain|sentence|clause)\b\s*\+?\s*/gi, '');
  return { jp: jp.replace(/\s+/g, ' ').trim(), note: notes.filter(Boolean).join('; ') };
}
function gPatHtml(jp) {
  return esc(jp).replace(/\s*[\/／]\s*/g, '<span class="gsep">／</span>').replace(/\s*(?:…|\.\.\.)\s*/g, '<span class="ggap"></span>')
    .replace(/[〜～~]/g, '<span class="gtil"></span>').replace(/\s*\+\s*/g, '<span class="gplus">+</span>');
}
function gTitleHtml(t, withNote = true) {
  const { jp, note } = gSplitTitle(t);
  return `<span class="gpat jp ${[...(jp || t)].length > 6 ? 'long' : ''}">${gPatHtml(jp || t)}</span>${withNote && note ? `<span class="gnote">${esc(note)}</span>` : ''}`;
}
function gFormHtml(fm) {
  return String(fm).split(/\n+/).filter(l => l.trim()).map(line => `<div class="gfline">${line.split(/\s*[+＋]\s*/).filter(Boolean).map(part => {
    const j = /[\u3040-\u30ff\u3400-\u9fff]/.test(part), l = /[A-Za-z]/.test(part);
    return `<span class="gfc ${j && !l ? 'gfj jp' : j ? 'gfm' : 'gfw'}">${esc(part).replace(/[〜～~]/g, '<span class="gtil"></span>')}</span>`;
  }).join('<span class="gfplus">+</span>')}</div>`).join('');
}
const jpRuns = h => h.replace(/([\u3040-\u30ff\u3400-\u9fff〜～ー]+)/g, '<span class="jp gin">$1</span>');
function gExplHtml(x) { return String(x).split(/\n+/).filter(p => p.trim()).map(p => `<p>${jpRuns(esc(p))}</p>`).join(''); }
/** Mark the grammar inside a sentence (outside any {kanji|reading} block). */
function markGrammar0(j, g) {
  const vs = gVariants(g).slice().sort((a, b) => b.v.length - a.v.length);
  for (const { v } of vs) {
    let from = 0, idx;
    while ((idx = j.indexOf(v, from)) >= 0) {
      const before = j.slice(0, idx);
      if ((before.match(/\{/g) || []).length === (before.match(/\}/g) || []).length) return before + '\u0001' + v + '\u0002' + j.slice(idx + v.length);
      from = idx + 1;
    }
  }
  return j;
}
function gDetail0(g) {
  const p = progress[g.id], v0 = gVariants(g)[0];
  return `<div class="detail force">
    <div class="dtop"><div class="gtitle">${gTitleHtml(g.t)}</div></div>
    <div class="tags"><span class="tag lv">${g.lvl}</span><span class="tag">grammar</span></div>
    <div class="dmean">${esc(g.m)}</div>
    ${g.fm ? `<div class="gform"><b>Formation</b>${gFormHtml(g.fm)}</div>` : ''}
    ${g.x ? `<div class="gexpl">${gExplHtml(g.x)}</div>` : ''}
    ${g.ex.length ? `<div class="mini">Examples</div><div class="kc-hint">Tap an underlined kanji to look up its word or the kanji.</div>${g.ex.map(e => exHtml(e, g)).join('')}` : ''}
    <div class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong · next review ${p.d > Date.now() ? 'in ' + fmtIv(p.d - Date.now()) : 'due now'}` : 'Not studied yet'}${grammarFull() ? ' · Grammar from <a href="https://hanabira.org/" target="_blank" rel="noopener">hanabira.org</a>' : ''}</div>
  </div>`;
}
function gRow(g) {
  return `<button class="row" data-open="${esc(g.id)}"><i class="dot ${status(g.id)}"></i><span class="rw gt">${gTitleHtml(g.t)}</span><span class="rm">${esc(g.m)}</span><span class="lvl">${g.lvl}</span></button>`;
}
function gList() {
  const rows = gSel();
  if (!rows.length) return '<p class="muted">No grammar points match.</p>';
  const shown = rows.slice(0, S.gf.limit);
  return shown.map(gRow).join('') + (rows.length > shown.length ? `<button class="btn sec" onclick="App.gMore()">Show more (${rows.length - shown.length} left)</button>` : '');
}
function vGrammar0() {
  const lv = gLevels();
  const busy = gSelLevels().some(l => !isLoaded('grammar', l));
  const sel = busy ? [] : gSel(), now = Date.now(), due = sel.filter(g => isDue(g.id, now)).length;
  return `<h1>Grammar</h1><p class="sub">${grammarFull() ? `${fmtN(lv.reduce((a, l) => a + levelTotal('grammar', l), 0))} JLPT grammar points from hanabira.org.` : 'Starter grammar set. The full N5–N1 grammar from hanabira.org loads once the GitHub Action has built it.'} Tap one for formation, explanation and examples.</p>
  ${optsBox('grammar', `${gSelLevels().join(', ')} · ${labelOf([['gfill', 'Fill the blank'], ['g2m', 'Meaning'], ['m2g', 'Pick grammar'], ['mix', 'Mixed']], S.gq)}`, `<div class="label">JLPT levels</div>${chips(lv.map(l => [l, `<i class="lcdot" style="background:${lcVar(l)}"></i>${l}<small>${fmtN(levelTotal('grammar', l))}</small>`]), gSelLevels(), 'App.glvToggle')}
  <div class="label">Quiz type</div>${seg([['gfill', 'Fill the blank'], ['g2m', 'Meaning'], ['m2g', 'Pick grammar'], ['mix', 'Mixed']], S.gq, 'App.gqSet')}`)}
  <div class="btnrow"><button class="btn" onclick="App.startCards('grammar')" ${busy || !sel.length ? 'disabled' : ''}>Flashcards${due ? ` · ${due} due` : ''}</button><button class="btn sec" onclick="App.startLearn('grammar')" ${busy || sel.length < 2 ? 'disabled' : ''}>Quiz</button></div>
  <input class="search" style="margin-top:16px" placeholder="Filter, e.g. たい, want, must" value="${esc(S.gf.q)}" oninput="App.gSearch(this.value)" autocomplete="off" autocapitalize="off" spellcheck="false">
  <div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learning"></i>Learning</span><span><i class="dot known"></i>Known</span></div>
  ${busy ? '<div class="loading">Loading grammar…</div>' : `<div class="list" id="glist">${gList()}</div>`}`;
}
function makeGrammarQ(item, dir) {
  const same = G.filter(x => x.lvl === item.lvl), pool = same.length >= 6 ? same : G;
  const meta = `<span class="tag lv">${item.lvl}</span><span class="tag">grammar</span>`;
  if (dir === 'gfill') {
    const b = gBlank(item);
    if (b) {
      const wrong = gFillOpts(item, b.v, pool);
      if (wrong.length >= 2) {
        const opts = shuffle([{ html: `<span class="jp cjp">${esc(b.v.v)}</span>`, ok: true }, ...wrong.map(w => ({ html: `<span class="jp cjp">${esc(w)}</span>`, ok: false }))]);
        return { item, dir, jp: true, say: b.p, hint: 'Which grammar fits the blank?', grid: true, meta,
          prompt: `<div class="psent jp">${sentHtml(exMarkup(b.e), b.i, b.v.v.length, '<span class="blank">　</span>')}</div>${b.e.e ? `<div class="proma">${esc(b.e.e)}</div>` : ''}`, opts };
      }
    }
    dir = 'g2m';
  }
  const others = shuffle(pool.filter(x => x !== item && !grammarOverlap(item, x) && x.m)).slice(0, 3);
  if (dir === 'm2g') {
    const opts = shuffle([item, ...others]).map(x => ({ html: `<span class="cjp">${gTitleHtml(x.t, false)}</span>`, ok: x === item }));
    return { item, dir, jp: false, say: grammarSay((gVariants(item)[0] || {}).v), hint: 'Which grammar has this meaning?', grid: true, meta, prompt: `<div class="pmean">${esc(item.m)}</div>`, opts };
  }
  const opts = shuffle([item, ...others]).map(x => ({ html: esc(x.m), ok: x === item }));
  return { item, dir, jp: true, say: grammarSay((gVariants(item)[0] || {}).v), hint: 'What does this grammar mean?', grid: false, meta, prompt: `<div class="pword gq">${gTitleHtml(item.t, false)}</div>`, opts };
}

