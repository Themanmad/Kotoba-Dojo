/* =====================================================================
   KANJI READINGS IN USE: example words grouped by which reading the kanji takes in them,
   so you see when each on'yomi and kun'yomi is used. A word's reading is split kanji by
   kanji (with the sound changes: 学校 がっこう, 時々 ときどき, 手紙 てがみ); words whose
   reading can't be split that way are special readings (今日 きょう).
   ===================================================================== */
const RENDAKU = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢじ', つ: 'づず', て: 'で', と: 'ど', は: 'ばぱ', ひ: 'びぴ', ふ: 'ぶぷ', へ: 'べぺ', ほ: 'ぼぽ' };
/** every way a kanji's readings can appear in a word: [{ v: kana, src: the reading as listed, t: 'on'|'kun' }] */
function readVariants(k) {
  if (k._rv) return k._rv;
  const out = [], add = (v, src, t) => { if (v && !out.some(o => o.v === v && o.src === src)) out.push({ v, src, t }); };
  const soft = (v, src, t) => { add(v, src, t); for (const c of RENDAKU[v[0]] || '') add(c + v.slice(1), src, t); };
  for (const on of k.on || []) {
    const h = kata2hira(on); soft(h, on, 'on');
    if (h.length >= 2 && /[つちくき]$/.test(h)) soft(h.slice(0, -1) + 'っ', on, 'on');   // 学 がく → がっ in 学校
  }
  for (const kun of k.kun || []) {
    const s = kun.replace(/^-|-$/g, ''), stem = s.split('.')[0];
    soft(stem, kun, 'kun');
    if (s.includes('.')) {
      const oku = s.split('.')[1], I = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
      soft(stem + oku, kun, 'kun');
      if (oku.length > 1) soft(stem + oku.slice(0, -1), kun, 'kun');            // 下(さが)る, 上(あ)げ in 仕上げ
      if (I[oku.slice(-1)]) soft(stem + oku.slice(0, -1) + I[oku.slice(-1)], kun, 'kun');   // 売(う)り in 売り場
    }
  }
  return (k._rv = out.sort((a, b) => b.v.length - a.v.length));
}
/** split a word's reading over its characters → [{ c, r, k: isKanji, src, t }] or null.
    loose: other kanji (not target) may take any 1–4 kana when none of their readings fit */
function splitReading(w, r, loose, target) {
  const cs = [...w], rd = kata2hira(r);
  const go = (i, j, acc) => {
    if (i === cs.length) return j === rd.length ? acc : null;
    const c = cs[i];
    if (!isK(c) && c !== '々') { const h = kata2hira(c); return rd[j] === h || (h === 'ー' && j < rd.length) ? go(i + 1, j + 1, [...acc, { c, r: rd[j] }]) : null; }
    const base = c === '々' ? KMAP[cs[i - 1]] : KMAP[c];
    if (base) for (const o of readVariants(base)) if (rd.startsWith(o.v, j)) { const g = go(i + 1, j + o.v.length, [...acc, { c, r: o.v, k: 1, src: o.src, t: o.t }]); if (g) return g; }
    if (base && (!loose || c === target)) return null;
    for (let n = 1; n <= 4 && j + n <= rd.length; n++) { const g = go(i + 1, j + n, [...acc, { c, r: rd.slice(j, j + n), k: 1 }]); if (g) return g; }
    return null;
  };
  return go(0, 0, []);
}
/** example words for kanji k, grouped by the reading it takes: [{ src, t, words: [{ x, segs }] }] */
function kReadGroups(k, per = 2) {
  if (k._rg && k._rgN === V.length) return k._rg;
  const seen = new Set(), cand = [];
  const push = (w, r, m, lvl, x) => { if (/する$/.test(r) && !/する$/.test(w)) r = r.slice(0, -2); const key = w + '|' + r; if (seen.has(key) || !w.includes(k.k)) return; seen.add(key); cand.push({ w, r, m, lvl, x: x || VMAP['v:' + key] || null }); };
  for (const e of k.ex || []) push(e.w, e.r, e.m, e.l);
  for (const x of V) if (x.w.includes(k.k) && x.w.length <= 6 && x.lvl !== 'MY') push(x.w, x.r, String(x.m).split(/[;,]/)[0], x.lvl, x);
  const lvRank = l => { const i = LV.indexOf(l); return i < 0 ? 9 : i; };
  cand.sort((a, b) => lvRank(a.lvl) - lvRank(b.lvl) || ((b.x && b.x.freq) || 0) - ((a.x && a.x.freq) || 0) || a.w.length - b.w.length);
  const groups = new Map([...(k.on || []).map(s => [s, { src: s, t: 'on', words: [] }]), ...(k.kun || []).map(s => [s, { src: s, t: 'kun', words: [] }])]);
  const special = { src: '', t: 'sp', words: [] };
  for (const c of cand) {
    const segs = splitReading(c.w, c.r) || splitReading(c.w, c.r, true, k.k), hit = segs && segs.find(s => s.c === k.k && s.src);
    const g = hit ? groups.get(hit.src) : segs ? null : special;
    if (g && g.words.length < per) g.words.push({ ...c, segs });
  }
  const all = [...groups.values()], out = all.filter(g => g.words.length);
  out.rare = all.filter(g => !g.words.length).map(g => g.src);
  if (special.words.length) out.push(special);
  k._rg = out; k._rgN = V.length;
  return out;
}
const kunShow = s => esc(s.replace(/^-|-$/g, '')).replace(/\.(.+)$/, '<span class="okr">$1</span>');
function kWordBtn(k, e) {
  const html = e.segs ? e.segs.map(s => s.k ? `<ruby${s.c === k.k ? ' class="hl"' : ''}>${esc(s.c)}<rt>${esc(s.r)}</rt></ruby>` : esc(s.c)).join('') : ruby(furi(e.w, e.r), true);
  return `<button class="kw" ${e.x ? `data-open="${esc(e.x.id)}"` : ''}><span class="kw-w jp">${html}</span><span class="kw-m">${e.lvl && LV.includes(e.lvl) ? `<span class="kw-l" style="--lc:${lcVar(e.lvl)}">${e.lvl}</span>` : ''}${esc(e.m || '')}</span></button>`;
}
/** Readings & words: each reading with words that use it */
function kReadings(k) {
  const gs = kReadGroups(k), hasOn = k.on.length, hasKun = k.kun.length;
  const rule = hasOn && hasKun ? `<p class="kr-rule"><b>On</b> (the Chinese reading) is mostly used when ${k.k} sits with other kanji in a word. <b>Kun</b> (the Japanese reading) when it stands alone or has kana after it.</p>`
    : hasOn ? `<p class="kr-rule">Only an on reading: you’ll meet ${k.k} inside words with other kanji.</p>` : `<p class="kr-rule">Only kun readings: ${k.k} is a native Japanese word.</p>`;
  return `${rule}<div class="krd">${gs.map(g => `<div class="krd-row ${g.t}">
      <div class="krd-h"><span class="krd-t">${g.t === 'on' ? 'On' : g.t === 'kun' ? 'Kun' : 'Special'}</span>${g.t === 'sp' ? '<span class="krd-r">read as a whole word</span>' : `<span class="krd-r jp">${g.t === 'on' ? esc(g.src) : kunShow(g.src)}</span><span class="krd-ro">${esc(toRomaji(kata2hira(g.src.replace(/[.\-]/g, ''))))}</span>`}</div>
      <div class="krd-ws">${g.words.map(e => kWordBtn(k, e)).join('')}</div></div>`).join('')}</div>
    ${gs.rare && gs.rare.length ? `<p class="kr-rare">Also read <span class="jp">${gs.rare.map(x => /[\u30a0-\u30ff]/.test(x) ? esc(x) : kunShow(x)).join('、')}</span>, rarely, in names or less common words.</p>` : ''}`;
}
/** the kanji page: a compact header, then tabs instead of one long scroll */
function kTabs(k, panes) {
  const ok = panes.filter(p => p[2]);
  const cur = ok.some(p => p[0] === S.ktab) ? S.ktab : ok[0][0];
  return `<div class="ktabs" role="tablist">${ok.map(([id, lab]) => `<button role="tab" class="${id === cur ? 'on' : ''}" aria-selected="${id === cur}" onclick="App.kTab(this,'${id}')">${lab}</button>`).join('')}</div>
    ${ok.map(([id, , html]) => `<div class="kpane" data-pane="${id}"${id === cur ? '' : ' hidden'}>${html}</div>`).join('')}`;
}
const kreadApp = {
  kTab(btn, id) {
    S.ktab = id; const d = btn.closest('.detail'); if (!d) return;
    d.querySelectorAll('.ktabs button').forEach(b => { const on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    d.querySelectorAll('.kpane').forEach(p => { p.hidden = p.dataset.pane !== id; });
  }
};

function kDetail(k) {
  const p = progress[k.id], sim = similarKanji(k);
  const head = `<div class="khead"><div class="kbig jp strokes" data-k="${esc(k.k)}">${k.k}</div><div style="flex:1;min-width:0">${k.pic && settings.pics && !hasArt(k.k) ? `<div class="kpic">${picHtml(k.pic, 'md')}${picCredit(k.pic) ? `<span class="pic-credit">${picCredit(k.pic)}</span>` : ''}</div>` : ''}<div class="dmean" style="margin-top:0">${esc(k.mean.join('; '))}</div>
      <div class="kq-reads"><span><b>On</b> <span class="jp">${k.on.length ? esc(k.on.join('、')) : '—'}</span></span><span><b>Kun</b> <span class="jp">${k.kun.length ? kunHtml(k.kun.slice(0, 5)) + (k.kun.length > 5 ? ` <span class="muted">+${k.kun.length - 5}</span>` : '') : '—'}</span></span></div>
      <div class="tags"><span class="tag lv">${k.lvl}</span>${k.s ? `<span class="tag">${k.s} strokes</span>` : ''}${k.gr ? `<span class="tag">${k.gr <= 6 ? 'grade ' + k.gr : k.gr === 8 ? 'jōyō (secondary)' : 'jinmeiyō'}</span>` : ''}</div>
      <div>${freqBadge(k.freq)}${k.r ? ` <span class="muted" style="font-size:12px">· #${k.r} of the 2,500 most used</span>` : ''}</div></div></div>`;
  const simTab = sim.length ? `<div class="simlist">${sim.map(({ x }) => `<button class="simrow" data-open="k:${esc(x.k)}"><span class="sk jp">${x.k}</span><span class="sm"><b>${esc(x.mean.slice(0, 3).join('; '))}</b><span>${esc(kRead(x))}${x.ex[0] ? ` · e.g. <span class="jp">${esc(x.ex[0].w)}</span> ${esc(x.ex[0].m)}` : ''}</span></span><span class="lvl">${x.lvl}</span></button>`).join('')}</div>
      <p class="note" style="margin-top:6px">Different kanji with a similar meaning. Compare their example words to see how each one is used.</p>` : '';
  return `<div class="detail force kdet">${head}
    ${kTabs(k, [['read', 'Readings & words', kReadings(k)], ['mem', 'Remember it', `${artStrip(k.k)}${kpdCard(k)}${kBuild(k)}${kRemember(k)}`], ['write', 'Writing', `<div class="frames kfr" data-frames="${esc(k.k)}"></div><p class="note">Stroke by stroke. Tap the big kanji at the top to watch it being written.</p>${DATA.mode === 'full' ? `<button class="btn wr-open" onclick="App.writeKanji('${esc(k.k)}')">✍ Practise writing it</button>` : ''}`], ['sim', 'Similar meaning', simTab]])}
    <div class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong · next review ${p.d > Date.now() ? 'in ' + fmtIv(p.d - Date.now()) : 'due now'}` : 'Not studied yet'}${DATA.mode === 'full' ? ' · Stroke order: KanjiVG' : ''}</div>
  </div>`;
}

