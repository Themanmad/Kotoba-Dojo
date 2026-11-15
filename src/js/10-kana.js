/* =====================================================================
   KANA — hiragana & katakana charts, details and quizzes
   rows: [group, row label, romaji, hiragana, katakana]  ('-' = empty cell)
   ===================================================================== */
const KANA_ROWS = [
['basic','a','a i u e o','あ い う え お','ア イ ウ エ オ'],
['basic','k','ka ki ku ke ko','か き く け こ','カ キ ク ケ コ'],
['basic','s','sa shi su se so','さ し す せ そ','サ シ ス セ ソ'],
['basic','t','ta chi tsu te to','た ち つ て と','タ チ ツ テ ト'],
['basic','n','na ni nu ne no','な に ぬ ね の','ナ ニ ヌ ネ ノ'],
['basic','h','ha hi fu he ho','は ひ ふ へ ほ','ハ ヒ フ ヘ ホ'],
['basic','m','ma mi mu me mo','ま み む め も','マ ミ ム メ モ'],
['basic','y','ya - yu - yo','や - ゆ - よ','ヤ - ユ - ヨ'],
['basic','r','ra ri ru re ro','ら り る れ ろ','ラ リ ル レ ロ'],
['basic','w','wa - - - wo','わ - - - を','ワ - - - ヲ'],
['basic','nn','n - - - -','ん - - - -','ン - - - -'],
['dakuten','g','ga gi gu ge go','が ぎ ぐ げ ご','ガ ギ グ ゲ ゴ'],
['dakuten','z','za ji zu ze zo','ざ じ ず ぜ ぞ','ザ ジ ズ ゼ ゾ'],
['dakuten','d','da ji zu de do','だ ぢ づ で ど','ダ ヂ ヅ デ ド'],
['dakuten','b','ba bi bu be bo','ば び ぶ べ ぼ','バ ビ ブ ベ ボ'],
['dakuten','p','pa pi pu pe po','ぱ ぴ ぷ ぺ ぽ','パ ピ プ ペ ポ'],
['combo','ky','kya - kyu - kyo','きゃ - きゅ - きょ','キャ - キュ - キョ'],
['combo','sh','sha - shu - sho','しゃ - しゅ - しょ','シャ - シュ - ショ'],
['combo','ch','cha - chu - cho','ちゃ - ちゅ - ちょ','チャ - チュ - チョ'],
['combo','ny','nya - nyu - nyo','にゃ - にゅ - にょ','ニャ - ニュ - ニョ'],
['combo','hy','hya - hyu - hyo','ひゃ - ひゅ - ひょ','ヒャ - ヒュ - ヒョ'],
['combo','my','mya - myu - myo','みゃ - みゅ - みょ','ミャ - ミュ - ミョ'],
['combo','ry','rya - ryu - ryo','りゃ - りゅ - りょ','リャ - リュ - リョ'],
['combo','gy','gya - gyu - gyo','ぎゃ - ぎゅ - ぎょ','ギャ - ギュ - ギョ'],
['combo','j','ja - ju - jo','じゃ - じゅ - じょ','ジャ - ジュ - ジョ'],
['combo','by','bya - byu - byo','びゃ - びゅ - びょ','ビャ - ビュ - ビョ'],
['combo','py','pya - pyu - pyo','ぴゃ - ぴゅ - ぴょ','ピャ - ピュ - ピョ'],
['ext','f','fa fi - fe fo','- - - - -','ファ フィ - フェ フォ'],
['ext','ti','- ti tu - -','- - - - -','- ティ トゥ - -'],
['ext','di','- di du - -','- - - - -','- ディ ドゥ - -'],
['ext','wi','- wi - we wo','- - - - -','- ウィ - ウェ ウォ'],
['ext','sj','she je che - -','- - - - -','シェ ジェ チェ - -'],
['ext','v','va vi vu ve vo','- - - - -','ヴァ ヴィ ヴ ヴェ ヴォ']
];
const KANA_GROUPS = [['basic', 'Basic'], ['dakuten', '゛゜ sounds'], ['combo', 'Combinations'], ['ext', 'Extended (katakana)']];
/* lookalikes: used as tricky wrong answers and shown in the detail panel */
const KANA_LOOK = ['シツ', 'ソンノ', 'ぬめ', 'わねれ', 'るろ', 'はほ', 'あお', 'いり', 'さきち', 'こに', 'クタケ', 'コユロ', 'ウワフラ', 'チテ', 'マア', 'スヌ', 'セヒ', 'ハル', 'カヤ', 'ナメ', 'しつ', 'くへ', 'たな', 'まも', 'ぬね', 'ヲラ', 'エユ', 'ルレ', 'ケク'];
let KANA = [], KANAMAP = {};
(function buildKana() {
  for (const [group, row, ro, h, k] of KANA_ROWS) {
    const R = ro.split(' '), H = h.split(' '), Kt = k.split(' ');
    R.forEach((r, c) => {
      if (r === '-') return;
      for (const [script, ch, other] of [['h', H[c], Kt[c]], ['k', Kt[c], H[c]]]) {
        if (!ch || ch === '-') continue;
        const x = { id: 'a:' + ch, kind: 'kana', ch, ro: r, script, group, row, col: c, other: other && other !== '-' ? other : null,
          lvl: script === 'h' ? 'Hiragana' : 'Katakana', freq: 3, m: r };
        KANA.push(x); KANAMAP[ch] = x;
      }
    });
  }
})();
const kanaLooks = ch => { const out = new Set(); for (const g of KANA_LOOK) if (g.includes(ch)) for (const c of g) if (c !== ch && KANAMAP[c]) out.add(c); return [...out].map(c => KANAMAP[c]); };
function kanaSel() {
  const sc = settings.kanaScript, gs = settings.kanaGroups.length ? settings.kanaGroups : ['basic'];
  return KANA.filter(x => (sc === 'both' || x.script === sc) && gs.includes(x.group));
}
function kanaWords(x) {
  // real words that use this kana, most common first, recordings preferred
  const words = x.script === 'h'
    ? V.filter(v => kata2hira(v.r).includes(x.ch) && !/[ァ-ヶ]/.test(v.w))
    : V.filter(v => v.w.includes(x.ch));
  return words.sort((a, b) => (hasRec(b.au) - hasRec(a.au)) || (b.freq - a.freq) || (a.w.length - b.w.length)).slice(0, 4);
}
function kanaDetail(x) {
  const p = progress[x.id], other = x.other && KANAMAP[x.other], looks = kanaLooks(x.ch), words = kanaWords(x);
  return `<div class="detail force">
    <div class="khead"><div class="kbig jp strokes" data-k="${esc(x.ch)}">${esc(x.ch)}</div><div style="flex:1;min-width:0">
      <div class="dmean" style="margin-top:0;font-size:28px">${esc(x.ro)}</div>
      <div class="tags"><span class="tag lv">${x.script === 'h' ? 'Hiragana' : 'Katakana'}</span><span class="tag">${esc((KANA_GROUPS.find(g => g[0] === x.group) || [])[1] || '')}</span></div>
      ${other ? `<div class="mini" style="margin-top:6px">${x.script === 'h' ? 'Katakana' : 'Hiragana'}</div><button class="kchip" data-open="a:${esc(other.ch)}"><b>${esc(other.ch)}</b>${esc(other.ro)}</button>` : ''}
    </div></div>
    ${kanaArt(x.ch)}
    <div class="frames" data-frames="${esc(x.ch)}"></div>
    ${looks.length ? `<div class="mini">Don't confuse with</div><div class="kchips">${looks.map(l => `<button class="kchip" data-open="a:${esc(l.ch)}"><b>${esc(l.ch)}</b>${esc(l.ro)}</button>`).join('')}</div>` : ''}
    ${words.length ? `<div class="mini">Words using ${esc(x.ch)}</div><div class="exlist">${words.map(v => `<button class="exrow" data-open="${esc(v.id)}"><span class="jp">${ruby(v.f, true)}</span><span class="m">${esc(v.m.split('; ')[0])}</span>${hasRec(v.au) ? '<span class="lvl" title="Native recording">🔊</span>' : ''}</button>`).join('')}</div>` : ''}
    <div class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong · next review ${p.d > Date.now() ? 'in ' + fmtIv(p.d - Date.now()) : 'due now'}` : 'Not studied yet'}${DATA.mode === 'full' ? ' · Stroke order: KanjiVG' : ''}</div>
  </div>`;
}
function makeKanaQ(item, dir) {
  if (dir === 'pair' && !item.other) dir = 'k2r';
  const meta = `<span class="tag lv">${item.script === 'h' ? 'Hiragana' : 'Katakana'}</span>`;
  const sameScript = KANA.filter(x => x.script === item.script);
  const looks = new Set(kanaLooks(item.ch).map(x => x.id));
  const near = x => looks.has(x.id) || x.row === item.row || x.col === item.col;
  const clash = x => x.ro === item.ro;
  const pickWrong = (pool, key) => {
    const seen = new Set([key(item)]), out = [];
    const sameG = x => x.group === item.group;
    for (const x of [...shuffle(pool.filter(x => looks.has(x.id))), ...shuffle(pool.filter(x => sameG(x) && near(x) && !looks.has(x.id))), ...shuffle(pool.filter(sameG)), ...shuffle(pool)]) {
      if (out.length >= 3) break; if (x === item || clash(x)) continue;
      const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); }
    }
    return out;
  };
  if (dir === 'r2k') {
    const opts = shuffle([item, ...pickWrong(sameScript.filter(x => x.group === item.group || item.group !== 'basic'), x => x.ch)]);
    return { item, dir, jp: false, hint: `Which ${item.script === 'h' ? 'hiragana' : 'katakana'} is this?`, grid: true, meta,
      prompt: `<div class="pmean" style="font-size:40px">${esc(item.ro)}</div>`, opts: opts.map(x => ({ html: `<span class="jp ckanji">${esc(x.ch)}</span>`, ok: x === item })) };
  }
  if (dir === 'pair') {
    const target = KANAMAP[item.other], otherScript = KANA.filter(x => x.script === target.script);
    const wrong = pickWrong(sameScript, x => x.ch).map(x => x.other && KANAMAP[x.other]).filter(Boolean);
    const extra = shuffle(otherScript.filter(x => x !== target && x.ro !== target.ro && !wrong.includes(x)));
    const opts = shuffle([target, ...wrong.concat(extra).slice(0, 3)]);
    return { item, dir, jp: false, hint: `Which ${target.script === 'h' ? 'hiragana' : 'katakana'} makes the same sound?`, grid: true, meta,
      prompt: `<div class="pkanji jp">${esc(item.ch)}</div>`, opts: opts.map(x => ({ html: `<span class="jp ckanji">${esc(x.ch)}</span>`, ok: x === target })) };
  }
  const opts = shuffle([item, ...pickWrong(sameScript, x => x.ro)]);
  return { item, dir: 'k2r', jp: false, hint: 'How is this read?', grid: true, meta,
    prompt: `<div class="pkanji jp">${esc(item.ch)}</div>`, opts: opts.map(x => ({ html: `<span style="font-size:22px;font-weight:600">${esc(x.ro)}</span>`, ok: x === item })) };
}
function vKana() {
  const sc = settings.kanaScript, chartScript = sc === 'k' ? 'k' : 'h', sel = kanaSel(), now = Date.now(), due = sel.filter(x => isDue(x.id, now)).length;
  const known = s => KANA.filter(x => x.script === s && status(x.id) === 'known').length, total = s => KANA.filter(x => x.script === s).length;
  const cell = (row, c) => {
    const H = row[3].split(' ')[c], Kt = row[4].split(' ')[c], ch = chartScript === 'h' ? H : Kt;
    if (!ch || ch === '-') return '<span class="kcell empty"></span>';
    const x = KANAMAP[ch];
    return `<button class="kcell" data-open="${esc(x.id)}"><i class="dot ${status(x.id)}"></i><span class="kc jp">${esc(ch)}</span>${sc === 'both' && Kt !== '-' ? `<span class="ko jp">${esc(Kt)}</span>` : ''}<span class="kr">${esc(x.ro)}</span></button>`;
  };
  const chart = g => {
    const rows = KANA_ROWS.filter(r => r[0] === g[0] && (chartScript === 'k' || g[0] !== 'ext'));
    if (!rows.length) return '';
    return `<div class="label">${g[1]}</div><div class="kgrid">${rows.map(r => [0, 1, 2, 3, 4].map(c => cell(r, c)).join('')).join('')}</div>`;
  };
  return `<h1>Kana <span class="muted jp">かな</span></h1><p class="sub">The two Japanese alphabets. Tap any character for stroke order, lookalikes and real words that use it.</p>
  <div class="stats" style="grid-template-columns:1fr 1fr">
    <div class="stat"><b>${known('h')} / ${total('h')}</b><span>hiragana known</span></div>
    <div class="stat"><b>${known('k')} / ${total('k')}</b><span>katakana known</span></div></div>
  ${seg([['h', 'Hiragana'], ['k', 'Katakana'], ['both', 'Both']], sc, 'App.kanaScript')}
  ${optsBox('kana', `${settings.kanaGroups.map(g => labelOf(KANA_GROUPS, g)).join(', ')} · ${labelOf([['k2r', 'Kana → romaji'], ['r2k', 'Romaji → kana'], ['pair', 'あ ↔ ア'], ['mix', 'Mixed']], S.kanaQ)}`, `<div class="label">Characters to practise</div>${chips(KANA_GROUPS.filter(g => sc !== 'h' || g[0] !== 'ext'), settings.kanaGroups, 'App.kanaGroup')}
  <div class="label">Quiz type</div>${seg([['k2r', 'Kana → romaji'], ['r2k', 'Romaji → kana'], ['pair', 'あ ↔ ア'], ['mix', 'Mixed']], S.kanaQ, 'App.kanaQ')}`)}
  <div class="btnrow"><button class="btn" onclick="App.startCards('kana')" ${sel.length ? '' : 'disabled'}>Flashcards${due ? ` · ${due} due` : ''}</button><button class="btn sec" onclick="App.startLearn('kana')" ${sel.length > 3 ? '' : 'disabled'}>Quiz these ${sel.length}</button></div>
  <div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learning"></i>Learning</span><span><i class="dot known"></i>Known</span></div>
  ${KANA_GROUPS.map(chart).join('')}`;
}

function vSituations(tabs) {
  const busy = DATA.mode === 'full' && LV.some(l => !isLoaded('vocab', l));
  if (busy) return `<h1>Words</h1>${tabs}<div class="loading">Loading words…</div>`;
  const sit = S.sit && SITUATIONS.find(x => x.id === S.sit);
  if (!sit) {
    return `<h1>Words</h1>${tabs}<p class="sub" style="margin-top:12px">Words and phrases grouped by occasion, ordered from what you'll hear most to least.</p>
    <div class="sitgrid">${SITUATIONS.map(x => { const it = sitItems(x), k = it.filter(i => status(i.id) === 'known').length;
      return `<button class="sitcard" onclick="App.sitOpen('${x.id}')"><span class="si">${x.icon}</span><b>${esc(x.name)}</b><span class="sj jp">${esc(x.jp)}</span>
        <span class="sm">${it.length} words · ${k} known</span><span class="pbar"><i style="width:${it.length ? k / it.length * 100 : 0}%"></i></span></button>`; }).join('')}</div>`;
  }
  const items = sitItems(sit);
  return `${tabs}<button class="ghost sheet-back" style="margin:12px 0 0 -8px" onclick="App.sitOpen(null)">‹ All situations</button>
  <h1>${sit.icon} ${esc(sit.name)} <span class="muted jp">${esc(sit.jp)}</span></h1><p class="sub">${esc(sit.desc)}. Ordered from most to least common.</p>
  <div class="btnrow"><button class="btn" onclick="App.sitStudy('learn')">Learn</button><button class="btn sec" onclick="App.sitStudy('cards')">Flashcards</button><button class="btn sec" onclick="App.sitStudy('test')">Test</button></div>
  <div class="legend"><span><i class="dot"></i>New</span><span><i class="dot learning"></i>Learning</span><span><i class="dot known"></i>Known</span><span>🔊 native recording</span></div>
  <div class="list">${items.map((x, i) => `<button class="row" data-open="${esc(x.id)}"><span class="rank">${i + 1}</span><i class="dot ${status(x.id)}"></i>${hasPic(x) ? wordPic(x, 'sm') : (anyPic() ? '<span class="pic sm none"></span>' : '')}<span class="rw jp">${ruby(x.f)}</span><span class="rm">${esc(x.m)}</span>${hasRec(x.au) ? '<span title="Native recording">🔊</span>' : ''}<span class="lvl">${lvName(x.lvl)}</span></button>`).join('')}</div>`;
}

