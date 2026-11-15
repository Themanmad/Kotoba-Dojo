/* =====================================================================
   WRITING PRACTICE: draw a kanji stroke by stroke. Each stroke is checked
   against KanjiVG (CC BY-SA 3.0): it has to start and end in the right
   places, go the right way, and come in the right order. Trace over a
   faint outline, or write from memory with hints after a few misses.
   ===================================================================== */
/* ---------- geometry (pure, no DOM: tested in tests/writing.test.mjs) ---------- */
/** an SVG path (KanjiVG uses M, C, S and their relative forms; L, H, V, Z handled too) → points */
function pathPoints(d) {
  const tok = String(d).match(/[MmCcSsLlHhVvZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const pts = []; let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx2 = null, cy2 = null;
  const num = () => +tok[i++];
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t;
      pts.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]); }
    cx2 = x2; cy2 = y2; x = x3; y = y3;
  };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; pts.push([x, y]); cmd = rel ? 'l' : 'L'; cx2 = null; }
    else if (C === 'L') { x = ox + num(); y = oy + num(); pts.push([x, y]); cx2 = null; }
    else if (C === 'H') { x = ox + num(); pts.push([x, y]); cx2 = null; }
    else if (C === 'V') { y = oy + num(); pts.push([x, y]); cx2 = null; }
    else if (C === 'C') { const a = [num(), num(), num(), num(), num(), num()]; cubic(ox + a[0], oy + a[1], ox + a[2], oy + a[3], ox + a[4], oy + a[5]); }
    else if (C === 'S') { const a = [num(), num(), num(), num()]; const x1 = cx2 == null ? x : 2 * x - cx2, y1 = cy2 == null ? y : 2 * y - cy2; cubic(x1, y1, ox + a[0], oy + a[1], ox + a[2], oy + a[3]); }
    else if (C === 'Z') { x = sx; y = sy; pts.push([x, y]); cx2 = null; }
    else i++;   // unknown token: skip it
  }
  return pts.filter(p => isFinite(p[0]) && isFinite(p[1]));
}
const wDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const wLen = pts => { let L = 0; for (let k = 1; k < pts.length; k++) L += wDist(pts[k - 1], pts[k]); return L; };
/** n points evenly spaced along the line */
function resample(pts, n = 32) {
  if (!pts.length) return [];
  const L = wLen(pts); if (!L) return Array.from({ length: n }, () => pts[0].slice());
  const out = [pts[0].slice()], step = L / (n - 1); let acc = 0, k = 1, prev = pts[0];
  while (out.length < n - 1 && k < pts.length) {
    const d = wDist(prev, pts[k]);
    if (acc + d >= step) { const t = (step - acc) / d, p = [prev[0] + (pts[k][0] - prev[0]) * t, prev[1] + (pts[k][1] - prev[1]) * t]; out.push(p); prev = p; acc = 0; }
    else { acc += d; prev = pts[k]; k++; }
  }
  while (out.length < n) out.push(pts[pts.length - 1].slice());
  return out;
}
/** how far a drawn line is from a KanjiVG stroke (in the 109×109 box), or Infinity when it can't be that stroke */
function strokeScore(user, target) {
  const lu = wLen(user), lt = wLen(target);
  if (lu < Math.min(4, lt * 0.5)) return Infinity;                              // a tap, not a stroke
  if (lu > Math.max(lt * 2.2, lt + 22) || lu < lt * 0.35) return Infinity;      // far too long or short
  const U = resample(user), T = resample(target);
  const s = wDist(U[0], T[0]), e = wDist(U[U.length - 1], T[T.length - 1]);
  const tol = Math.max(14, Math.min(24, lt * 0.35));
  if (s > tol + 6 || e > tol + 6) return Infinity;                              // wrong place or wrong way round
  // direction: the drawn line must head the same way as the stroke, overall and over its first half
  const cosOf = (a0, a1, b0, b1) => { const ux = a1[0] - a0[0], uy = a1[1] - a0[1], tx = b1[0] - b0[0], ty = b1[1] - b0[1], m = Math.hypot(ux, uy) * Math.hypot(tx, ty); return m ? (ux * tx + uy * ty) / m : 1; };
  const h = U.length >> 1;
  if (wDist(T[0], T[T.length - 1]) > 3 && cosOf(U[0], U[U.length - 1], T[0], T[T.length - 1]) < 0.5) return Infinity;
  if (cosOf(U[0], U[h], T[0], T[h]) < 0.3) return Infinity;
  const avg = U.reduce((a, p, k) => a + wDist(p, T[k]), 0) / U.length;
  return avg <= tol ? avg : Infinity;
}
/** is `user` stroke number `i` of `strokes` (point lists)? Rejected when it fits a later stroke better. */
function strokeOk(user, strokes, i) {
  const sc = strokeScore(user, strokes[i]); if (!isFinite(sc)) return false;
  for (let j = i + 1; j < strokes.length; j++) if (strokeScore(user, strokes[j]) < sc * 0.6) return false;
  return true;
}

/* ---------- the practice screen ---------- */
const WRITE_HINT_AFTER = 2;
const writeStats = () => store.get('write', {});
async function writeStart(chars, title) {
  const ks = chars.map(c => KMAP[c]).filter(Boolean);
  if (DATA.mode !== 'full') return toast('Writing practice needs the full data (stroke order)');
  const lv = [...new Set(ks.map(k => k.lvl))];
  try { await Promise.all(lv.map(l => load('strokes', l))); } catch (e) { return toast('Could not load stroke order'); }
  const items = ks.map(k => ({ k, sd: (DATA.strokes[k.lvl] || {})[k.k] })).filter(x => x.sd && x.sd.d.length);
  if (!items.length) return toast('No stroke data for these kanji yet');
  S.wr = { title, items, i: 0, mode: settings.writeMode || 'trace', results: [] };
  writeBegin(); S.view = 'write'; render(); window.scrollTo(0, 0);
}
function writeBegin() {
  const W = S.wr, it = W.items[W.i];
  W.pts = it.sd.d.map(pathPoints); W.done = 0; W.miss = 0; W.hints = 0; W.strokeMiss = 0; W.flash = -1; W.finished = false;
}
function vWrite() {
  const W = S.wr; if (!W) { S.view = 'kanji'; return vKanji(); }
  if (W.i >= W.items.length) return vWriteDone();
  const it = W.items[W.i], k = it.k, n = it.sd.d.length;
  const ghost = W.mode === 'trace' || W.finished;
  const svg = `<svg id="wpad" class="wpad" viewBox="0 0 109 109" aria-label="Writing pad: draw stroke ${Math.min(W.done + 1, n)} of ${n}">
    <g class="grid"><line x1="54.5" y1="0" x2="54.5" y2="109"/><line x1="0" y1="54.5" x2="109" y2="54.5"/></g>
    ${ghost ? `<g class="wghost">${it.sd.d.map(d => `<path d="${esc(d)}"/>`).join('')}</g>` : ''}
    <g class="wdone">${it.sd.d.slice(0, W.done).map(d => `<path d="${esc(d)}"/>`).join('')}</g>
    ${W.flash >= 0 ? `<path class="wflash" d="${esc(it.sd.d[W.flash])}"/>` : ''}
    <path id="wink" class="wink" d=""/></svg>`;
  return `<div class="qtop"><button class="ghost" onclick="App.writeEnd()">✕ End</button><span class="muted">${W.i + 1} of ${W.items.length}</span></div>
  <div class="wr-head"><div><b class="jp">${W.finished || W.mode === 'trace' ? esc(k.k) : '？'}</b></div><div class="wr-meta"><span>${esc(k.m || (k.mean || []).slice(0, 3).join(', '))}</span><span class="jp muted">${esc(kRead(k))}</span></div></div>
  <div class="wr-pad">${svg}</div>
  <div class="wr-status" role="status">${W.finished ? (W.miss ? `Done, with ${W.miss} miss${W.miss === 1 ? '' : 'es'}${W.hints ? ` and ${W.hints} hint${W.hints === 1 ? '' : 's'}` : ''}.` : 'Perfect: every stroke right first time.')
    : W.msg ? esc(W.msg) : `Stroke ${W.done + 1} of ${n}`}</div>
  <div class="btnrow">${W.finished ? `<button class="btn" onclick="App.writeNext()">${W.i + 1 < W.items.length ? 'Next kanji' : 'See results'}</button><button class="btn line" onclick="App.writeRetry()">Write it again</button>`
    : `<button class="btn sec" onclick="App.writeHint()">Show the next stroke</button>`}</div>
  <div class="wr-mode">${seg([['trace', 'Trace'], ['memory', 'From memory']], W.mode, 'App.writeMode')}</div>
  <p class="note">Strokes are checked for position, direction and order against KanjiVG.</p>`;
}
function vWriteDone() {
  const W = S.wr, perfect = W.results.filter(r => !r.miss && !r.hints).length;
  return `<h1>${perfect} of ${W.results.length} perfect</h1><p class="sub">${esc(W.title)}</p>
  <div class="card">${W.results.map(r => `<div class="wr-res"><b class="jp">${esc(r.k)}</b><span class="${!r.miss && !r.hints ? 'okc' : r.hints ? 'badc' : ''}">${!r.miss && !r.hints ? 'perfect' : `${r.miss} miss${r.miss === 1 ? '' : 'es'}${r.hints ? `, ${r.hints} hint${r.hints === 1 ? '' : 's'}` : ''}`}</span></div>`).join('')}</div>
  <div class="btnrow"><button class="btn" onclick="App.writeAgain()">Practise these again</button><button class="btn line" onclick="App.writeEnd()">Done</button></div>`;
}
/* drawing: pointer events on the pad, in the pad's own 109×109 units */
function writeHydrate() {
  const pad = $('#wpad'), W = S.wr; if (!pad || !W || W.finished) return;
  let cur = null;
  const at = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 109, (e.clientY - r.top) / r.height * 109]; };
  const ink = () => { const p = $('#wink'); if (p && cur) p.setAttribute('d', 'M' + cur.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L')); };
  pad.onpointerdown = e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); cur = [at(e)]; ink(); };
  pad.onpointermove = e => { if (!cur) return; const p = at(e), q = cur[cur.length - 1]; if (wDist(p, q) > 0.8) { cur.push(p); ink(); } };
  pad.onpointerup = pad.onpointercancel = () => { if (!cur) return; const pts = cur; cur = null; writeStroke(pts); };
}
function writeStroke(pts) {
  const W = S.wr, it = W.items[W.i];
  if (strokeOk(pts, W.pts, W.done)) {
    W.done++; W.strokeMiss = 0; W.flash = -1; W.msg = '';
    if (W.done >= W.pts.length) writeFinish();
  } else {
    W.miss++; W.strokeMiss++;
    W.msg = W.strokeMiss >= WRITE_HINT_AFTER ? 'Here’s that stroke: follow it from the start.' : 'Not quite: check where it starts, which way it goes, and the stroke order.';
    if (W.strokeMiss >= WRITE_HINT_AFTER) { W.flash = W.done; W.hints++; }
  }
  render();
}
function writeFinish() {
  const W = S.wr, k = W.items[W.i].k; W.finished = true;
  W.results.push({ k: k.k, miss: W.miss, hints: W.hints });
  const st = writeStats(), o = st[k.k] || { n: 0, p: 0 }; o.n++; if (!W.miss && !W.hints) o.p++; o.t = Date.now(); st[k.k] = o; store.set('write', st);
  logAct(false, 'kanji'); skillTick('write', 3);
}
const writeApp = {
  writeKanji(c) { S.wrBack = S.view === 'write' ? (S.wrBack || 'kanji') : S.view; App.closeSheet(); writeStart([c], `Writing ${c}`); },
  /** ten kanji from the Kanji page's selection: ones you're learning first, least recently written first */
  writePick() {
    const st = writeStats(), sel = kSelection(), mine = sel.filter(k => progress[k.id]), pool = (mine.length >= 5 ? mine : sel).slice();
    pool.sort((a, b) => ((st[a.k] || {}).t || 0) - ((st[b.k] || {}).t || 0));
    S.wrBack = 'kanji'; writeStart(pool.slice(0, 10).map(k => k.k), 'Kanji writing practice');
  },
  writeSet(chars, title) { writeStart(chars, title); },
  writeMode(m) { settings.writeMode = m; saveSettings(); if (S.wr) { S.wr.mode = m; if (!S.wr.finished) writeBegin(); } render(); },
  writeHint() { const W = S.wr; if (!W || W.finished) return; W.flash = W.done; W.hints++; W.msg = 'Follow the red stroke from its start.'; render(); },
  writeNext() { const W = S.wr; W.i++; if (W.i < W.items.length) writeBegin(); render(); window.scrollTo(0, 0); },
  writeRetry() { const W = S.wr; W.results.pop(); writeBegin(); render(); },
  writeAgain() { const W = S.wr; W.i = 0; W.results = []; writeBegin(); render(); window.scrollTo(0, 0); },
  writeEnd() { const back = S.wrBack || 'kanji'; S.wr = null; S.view = back; render(); window.scrollTo(0, 0); }
};
Object.assign(App, writeApp);
