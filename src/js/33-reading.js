/* =====================================================================
   READING (読解): graded passages with JLPT-style questions. Each answer
   shows why it's right; the English translation opens once you've answered.
   The same passages give the mock exam its reading section.
   ===================================================================== */
const readStats = () => store.get('reading', {});
const readOf = id => READ.find(p => p.id === id);
/** a passage's text as paragraphs, with furigana by the user's setting */
const readParas = j => j.split('\n').map(l => `<p class="jp">${ruby(l)}</p>`).join('');
const RD_SIZES = [15, 17, 19, 22, 25];
const rdSize = () => RD_SIZES[Math.min(RD_SIZES.length - 1, Math.max(0, settings.readSize == null ? 2 : settings.readSize))];
/** reader controls: text size and furigana, kept between visits */
function readBar() {
  const i = settings.readSize == null ? 2 : settings.readSize, f = settings.furigana;
  return `<div class="rd-bar" role="group" aria-label="Reading display"><span class="rd-bar-g"><button onclick="App.rdSize(-1)" ${i <= 0 ? 'disabled' : ''} aria-label="Smaller text">A−</button><button onclick="App.rdSize(1)" ${i >= RD_SIZES.length - 1 ? 'disabled' : ''} aria-label="Larger text">A+</button></span>
    <span class="rd-bar-g">${[['on', 'Furigana'], ['tap', 'Tap to show'], ['off', 'None']].map(([v, l]) => `<button class="${f === v ? 'on' : ''}" aria-pressed="${f === v}" onclick="App.furi('${v}')">${l}</button>`).join('')}</span></div>`;
}
/** after answering: each paragraph with its translation underneath (when the two line up) */
function readPairs(p) {
  const js = p.j.split('\n'), es = p.e.split('\n');
  if (js.length !== es.length) return `<details class="rd-en"><summary>Show the English translation</summary>${es.map(l => `<p>${esc(l)}</p>`).join('')}</details>`;
  return `<details class="rd-en"><summary>Show the translation, paragraph by paragraph</summary>${js.map((l, i) => `<div class="rd-pair"><p class="jp">${ruby(l)}</p><p>${esc(es[i])}</p></div>`).join('')}</details>`;
}

function vRead() {
  if (S.rd) { const p = readOf(S.rd); if (p) return vReadPassage(p); S.rd = null; }
  const lvs = LV.filter(l => READ.some(p => p.lv === l));
  if (!lvs.includes(S.rdLv)) S.rdLv = lvs.includes(userLevel()) ? userLevel() : lvs[0];
  const st = readStats(), list = READ.filter(p => p.lv === S.rdLv);
  return `<h1>Reading</h1><p class="sub">Short passages at each JLPT level, with questions like the exam's reading section. Every answer comes with the reason, and the translation opens when you're done.</p>
  <div class="label">Level</div>${chips(lvs.map(l => [l, `${l}<small>${READ.filter(p => p.lv === l).length}</small>`]), S.rdLv, 'App.rdLv')}
  <div class="rd-list">${list.map(p => { const r = st[p.id];
    return `<button class="rd-row" onclick="App.rdOpen('${p.id}')"><span class="rd-t"><b class="jp">${ruby(p.jt)}</b><small>${esc(p.t)} · ${p.q.length} questions</small></span>${r ? `<span class="rd-score ${r.best === p.q.length ? 'okc' : ''}">${r.best}/${p.q.length}</span>` : '<span class="rd-go">Read ›</span>'}</button>`; }).join('')}</div>
  <p class="note">Written for this app, not taken from JLPT papers or textbooks. Words above the level are explained under each passage.</p>`;
}
function vReadPassage(p) {
  const ans = S.rdAns || [], done = ans.length === p.q.length && ans.every(a => a != null), ok = p.q.filter((q, i) => ans[i] === q[3]).length;
  const list = READ.filter(x => x.lv === p.lv), nx = list[list.indexOf(p) + 1];
  const qHtml = p.q.map((q, qi) => {
    const a = ans[qi], answered = a != null;
    return `<div class="rd-q"><div class="rd-qq"><span class="rd-qn">${qi + 1}</span><span><span class="jp">${ruby(q[0])}</span><small>${esc(q[1])}</small></span></div>
      <div class="choices">${q[2].map((o, oi) => { let c = 'choice'; if (answered) c += oi === q[3] ? ' ok' : oi === a ? ' bad' : ' dim'; if (answered && oi === a) c += ' picked';
        return `<button class="${c}" onclick="App.rdAns(${qi},${oi})"${answered ? ' tabindex="-1"' : ''}><span class="n">${oi + 1}</span><span class="jp">${ruby(o)}</span></button>`; }).join('')}</div>
      ${answered ? `<div class="rd-why ${a === q[3] ? 'ok' : 'no'}" role="status"><b>${a === q[3] ? 'Right.' : 'Not quite.'}</b> ${esc(q[4])}</div>` : ''}</div>`;
  }).join('');
  return `<button class="ghost backbtn" onclick="App.rdOpen(null)">‹ Reading</button>
  <div class="rd-head"><span class="tag lv" style="background:${lcVar(p.lv)}">${p.lv}</span><h1 class="jp">${ruby(p.jt)}</h1><div class="muted">${esc(p.t)}</div></div>
  ${readBar()}
  <p class="rd-tip">Tap an underlined word to look it up.</p>
  <div class="card rd-text" style="--rd:${rdSize()}px">${readParas(p.j)}</div>
  ${p.g.length ? `<div class="rd-gl"><div class="mini">Words to know</div>${p.g.map(([w, r, m]) => `<span class="rd-gw"><b class="jp">${esc(w)}</b> <span class="jp muted">${esc(r)}</span> ${esc(m)}</span>`).join('')}</div>` : ''}
  <div class="label">Questions</div>${qHtml}
  ${done ? `<div class="card rd-done"><b>${ok} of ${p.q.length}</b> ${ok === p.q.length ? 'Every one right.' : 'Read the reasons above, then try the passage again later.'}
    ${readPairs(p)}
    <div class="btnrow">${nx ? `<button class="btn" onclick="App.rdOpen('${nx.id}')">Next passage</button>` : ''}<button class="btn line" onclick="App.rdOpen('${p.id}')">Try again</button></div></div>` : ''}`;
}
/* ---------- words written in kana: tap to look up ----------
   Kanji words are found from the tapped kanji (see findWord). Kana has no such anchor, so only
   matches that are safe without a tokenizer are linked: a whole katakana run that is a word
   (テレビ, not the バー in バーベキュー), and hiragana words of three or more kana that start where a
   word can start: after kanji or punctuation, after a particle, or right after another match. */
const KANA_ZONES = '.rd-text p, .rd-pair p.jp';
const KW_STOP = new Set(['すると', 'たった']);   // にすると is usually する + と; たった is as often 経った or 立った as "only"
const isKata = c => /[ァ-ヺー]/.test(c || '');
let KWIDX = null, KWIDXn = -1;
function kanaIndex() {
  if (KWIDX && KWIDXn === V.length) return KWIDX;
  const m = new Map(), rank = x => { const i = LV.indexOf(x.lvl); return i < 0 ? 9 : i; };
  for (const x of V) for (const w of [x.w, x.alt]) {
    if (!w || KW_STOP.has(w) || !/^(?:[ぁ-ゟ]{3,}|[ァ-ヺー]{2,})$/.test(w)) continue;
    const o = m.get(w);
    if (!o || rank(x) < rank(o) || (rank(x) === rank(o) && (x.freq || 0) > (o.freq || 0))) m.set(w, x);
  }
  KWIDXn = V.length; return KWIDX = m;
}
/** kana words in a stretch of text as [start, end, word]; `before` is the character just ahead of it */
function kanaHits(text, before = '') {
  const idx = kanaIndex(), out = []; let i = 0, lastEnd = -1;
  while (i < text.length) {
    const c = text[i], prev = i ? text[i - 1] : before;
    if (isKata(c)) {
      let e = i; while (e < text.length && isKata(text[e])) e++;
      const x = !isKata(prev) && idx.get(text.slice(i, e)); if (x) { out.push([i, e, x]); lastEnd = e; }
      i = e; continue;
    }
    if (isHira(c)) {
      let hit = null;
      for (let e = Math.min(text.length, i + 8); e >= i + 3 && !hit; e--) { const x = idx.get(text.slice(i, e)); if (x) hit = [i, e, x]; }
      const starts = !prev || !isHira(prev) || i === lastEnd || 'はがをにでともへ'.includes(prev) || (prev === 'て' && hit && text.slice(hit[0], hit[1]) === 'ください');
      if (hit && starts) { out.push(hit); i = lastEnd = hit[1]; continue; }
    }
    i++;
  }
  return out;
}
function linkKana(root) {
  if (!V.length) return;
  root.querySelectorAll(KANA_ZONES).forEach(zone => {
    if (zone.dataset.kw) return; zone.dataset.kw = 1;
    const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('rt, rp') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = []; let text = ''; while (walker.nextNode()) { nodes.push([walker.currentNode, text.length]); text += walker.currentNode.nodeValue; }
    for (const [n, off] of nodes) {
      if (n.parentElement.closest('button, a, .kcx, ruby')) continue;
      const s = n.nodeValue, hits = kanaHits(s, text[off - 1] || ''); if (!hits.length) continue;
      const frag = document.createDocumentFragment(); let at = 0;
      for (const [a, b, x] of hits) {
        if (a > at) frag.appendChild(document.createTextNode(s.slice(at, a)));
        const sp = document.createElement('span'); sp.className = 'kwx'; sp.dataset.w = x.id; sp.tabIndex = 0; sp.setAttribute('role', 'button');
        sp.setAttribute('aria-label', `${s.slice(a, b)}: ${String(x.m || '').split(';').slice(0, 2).join(',')}`); sp.textContent = s.slice(a, b); frag.appendChild(sp); at = b;
      }
      if (at < s.length) frag.appendChild(document.createTextNode(s.slice(at)));
      n.replaceWith(frag);
    }
  });
}
function showKanaPop(el) {
  closeWordPop();
  const x = VMAP[el.dataset.w]; if (!x) return;
  el.classList.add('kc-sel');
  const pop = document.createElement('div'); pop.className = 'kpop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Look up');
  pop.innerHTML = `<button class="kp-word" data-open="${esc(x.id)}"><span class="kp-w jp">${ruby(x.f || (x.r && x.r !== x.w ? `{${x.w}|${x.r}}` : x.w), true)}</span><span class="kp-m">${esc(x.m || '')}</span><span class="kp-go">Word ›</span></button>`;
  document.body.appendChild(pop); placePop(pop, el);
  pop.querySelector('button').focus({ preventScroll: true });
}
const readApp = {
  rdLv(l) { S.rdLv = l; render(); },
  rdSize(dir) { const i = settings.readSize == null ? 2 : settings.readSize; settings.readSize = Math.min(RD_SIZES.length - 1, Math.max(0, i + dir)); saveSettings(); render(); },
  rdOpen(id) {
    S.rd = id; S.rdAns = []; render(); window.scrollTo(0, 0);
    // word lookup needs the words and kanji up to this passage's level
    const p = readOf(id);
    if (p && DATA.mode === 'full') {
      const need = LV.slice(0, LV.indexOf(p.lv) + 1).flatMap(l => [['vocab', l], ['kanji', l]]).filter(([k, l]) => !isLoaded(k, l));
      if (need.length) Promise.all(need.map(([k, l]) => load(k, l))).then(() => { if (S.rd === id && S.view === 'read') render(); }, () => {});
    }
  },
  rdAns(qi, oi) {
    const p = readOf(S.rd); if (!p) return; const ans = S.rdAns = S.rdAns || [];
    if (ans[qi] != null) return;
    ans[qi] = oi; logAct(false, 'grammar'); buzz(oi === p.q[qi][3]);
    if (p.q.every((q, i) => ans[i] != null)) {
      const ok = p.q.filter((q, i) => ans[i] === q[3]).length, st = readStats(), o = st[p.id] || { best: 0, n: 0 };
      o.best = Math.max(o.best, ok); o.last = ok; o.n++; st[p.id] = o; store.set('reading', st); skillTick('read', 1);
      if (typeof addXP === 'function') addXP(ok * 5);
    }
    render();
  }
};
Object.assign(App, readApp);

/* ---------- reading in the mock exam ---------- */
/** up to n questions, whole passages at a time, ones you haven't seen recently first */
function readExamQs(l, n) {
  const ps = freshFirst(READ.filter(p => p.lv === l).map(p => Object.assign({ id: 'rd:' + p.id }, { p })), 'rd'), out = [];
  for (const { p } of ps) {
    if (out.length >= n) break;
    p.q.forEach((q, qi) => {
      if (out.length >= n) return;
      const item = { id: 'rd:' + p.id, kind: 'reading', lvl: l, w: p.t };
      out.push({ item, noRec: true, ans: q[3], raw: q[2].map(plain), opts: q[2].map(o => `<span class="jp">${ruby(o)}</span>`),
        prompt: `<div class="rd-ex-pass jp">${readParas(p.j)}</div>${p.g.length ? `<div class="rd-ex-gl">${p.g.map(([w, r, m]) => `<span><b class="jp">${esc(w)}</b> <span class="jp">${esc(r)}</span> ${esc(m)}</span>`).join('')}</div>` : ''}<div class="rd-ex-q jp">${ruby(q[0])}</div>`,
        rd: { title: p.jt, q: q[0], why: q[4] } });
    });
  }
  return out;
}
