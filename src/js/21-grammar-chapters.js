/* =====================================================================
   GRAMMAR: chapters by what you want to say, a short lesson per point,
   a Meaning → Pattern (reverse) toggle, and a mixed workout.
   Content: hanabira.org (CC BY 4.0), reorganised and cleaned up here.
   ===================================================================== */
const GTHEMES = [   // listed in teaching order; `tst` is checked in TEST_ORDER below
  { id: 'basic', ico: '🧱', jp: '基本', en: 'Building blocks', s: 'Particles, です/ます, questions, negatives and the past' },
  { id: 'link', ico: '🔗', jp: 'つなぐ', en: 'Linking ideas', s: 'And, but, or, also' },
  { id: 'time', ico: '⏱️', jp: '時間', en: 'Time & order', s: 'Before, after, while, already, still' },
  { id: 'q', ico: '❓', jp: '疑問詞', en: 'Question words', s: 'Who, what, where, someone, nobody, anything' },
  { id: 'want', ico: '💭', jp: '気持ち', en: 'Wants & plans', s: 'Want to, plan to, try to, decide to' },
  { id: 'ask', ico: '🙏', jp: 'お願い', en: 'Asking & offering', s: 'Please, may I, let’s, shall we' },
  { id: 'must', ico: '🚦', jp: 'ルール', en: 'Must & mustn’t', s: 'Have to, don’t have to, should, not allowed' },
  { id: 'can', ico: '💪', jp: 'できる', en: 'Can & can’t', s: 'Ability and what’s possible' },
  { id: 'cmp', ico: '⚖️', jp: '比べる', en: 'Comparing', s: 'More than, the most, which one' },
  { id: 'freq', ico: '📏', jp: '程度', en: 'How much & how often', s: 'About, almost, always, sometimes, not very' },
  { id: 'why', ico: '🧭', jp: '理由', en: 'Reasons & purpose', s: 'Because, so, in order to, thanks to' },
  { id: 'if', ico: '🔀', jp: 'もし', en: 'If & when', s: 'If, even if, whenever, as long as' },
  { id: 'guess', ico: '🔍', jp: '推量', en: 'Guessing & hearsay', s: 'Seems, probably, I heard, apparently' },
  { id: 'chg', ico: '🔄', jp: '変化', en: 'Change & results', s: 'Become, end up, have done in advance' },
  { id: 'give', ico: '🎁', jp: 'あげる', en: 'Giving & receiving', s: 'Doing things for people' },
  { id: 'emph', ico: '🎯', jp: '強調', en: 'Focus & emphasis', s: 'Only, even, not at all, precisely' },
  { id: 'pol', ico: '🎎', jp: '敬語', en: 'Polite Japanese', s: 'Honorific and humble speech' },
  { id: 'more', ico: '📚', jp: 'その他', en: 'More patterns', s: 'Everything else at this level' }
];
const GT = Object.fromEntries(GTHEMES.map(t => [t.id, t]));
const GT_RE = [   // checked in this order: the more specific ideas first
  ['pol', /honorific|humble|keigo|respectful|very polite|formal (?:expression|way|speech)|superior|customer/],
  ['give', /\bgiv(?:e|es|ing)\b|\breceiv|someone gives|for (?:someone|me|you|others|him|her)\b|\bfavou?r|on (?:someone'?s|my|your) behalf/],
  ['if', /\bif\b|condition|even if|unless|whenever|every time|as long as|provided|in case|hypothet|no matter/],
  ['must', /\bmust\b|have to|has to|had to|\bshould(?! we)\b|ought|prohibit|not (?:be )?allowed|mustn|no need|(?:don'?t|doesn'?t) (?:have|need) to|obligat|necessar|need to|\badvi[cs]e|recommend|forbid|it is (?:best|better)/],
  ['ask', /please|request|ask(?:ing)? (?:someone|for|a)|permission|may i|let me|let (?:someone|him|her|them)|let'?s|shall (?:we|i)|invit|suggest|offer|command|instruct|how about|what do you think|opinion|how is\b/],
  ['cmp', /compar|superlative|the most|the best|the least|more than|less than|rather than|(?:more|less|better|worse|bigger|smaller|faster|longer) than|prefer|\bwhich (?:one|of)|a or b|as\b.{1,20}\bas\b|not as|same as|even more|(?:^|; )more\b/],
  ['q', /(?:^|; )(?:who|what|where|which|how|why|how come|how many|how much|someone|somewhere|something|anyone|anywhere|anything|nobody|no one|nowhere|nothing|whichever|any|everyone|everywhere|not any|not anything|not anywhere|what kind|what type)\b|interrogative|question word|asking (?:about )?'?(?:who|what|where|which)/],
  ['can', /\bcan\b|\bcan'?t\b|\bcannot\b|able to|abilit|possib|potential|capable/],
  ['guess', /seems?\b|looks? like|appear|probabl|maybe|perhaps|might|wonder|heard|hearsay|apparently|likely|guess|suppos|assum|rumou?r|according to|i think|conjectur|speculat/],
  ['want', /\bwant|wish|desire|\bhop(?:e|ing)\b|intend|intention|plan(?:ning|s)? to|decid|decision|choose|choice of|\btry|tried|attempt|determin|resolve/],
  ['freq', /approximat|\babout\b|around|roughly|almost|nearly|mostly|always|usually|sometimes|occasionally|often|frequen|not very|not much|not really|so-so|generally|immediately|right away|\bsoon\b|someday|degree|extent/],
  ['why', /because|reason|cause|due to|thanks to|therefore|consequen|so that|in order to|purpose|for the sake|as a result|that'?s why|since (?:it|i|you|he|she|they|we)/],
  ['time', /before|after|while|during|until|as soon as|moment|instant|already|still\b|yet\b|about to|in the middle|sequence|and then|then\b|\bwhen\b|\btime|began|beginning|start|finish|continu|keep (?:on )?|habit|recent|just (?:did|happened|finished|now)|short time ago|in progress|ongoing|is doing|be doing/],
  ['chg', /becom|chang|turn(?:s|ed)? into|ended? up|completely|unintention|regret|accident|\bstate\b|resulting|in advance|prepar|left (?:as|in)|has been|have been|experience|to make/],
  ['link', /\bbut\b|however|although|though|despite|in spite|also|in addition|besides|furthermore|moreover|either|contrast|on the other hand|connect|\blink|list(?:s|ing)?\b|such as|for example|etc\b|whereas|well then|in that case|and so on|as well/],
  ['emph', /\bonly\b|\beven\b|emphas|nothing but|at least|especially|particular|precisely|exactly|indeed|\bjust\b|merely|not at all|\bnever\b|whatsoever|totally|absolutely|certainly/],
  ['basic', /particle|topic|subject|object|marks?\b|marker|location|position|place|direction|destination|possessi|negative|past\b|polite|existence|exist|there (?:is|are)|counter|number|adjective|noun|\bverb|\bform\b|copula|\bis\b|this|that|these|those|\bwith\b|\bto\b|going|coming|return|difficult|well\b/]
];
const N5_ORDER = ['です', 'は', 'か', 'の', 'も', 'なに', 'なん', 'だれ', 'どこ', 'どれ', 'どの', 'いくつ', 'どちら', 'どんな', 'これ', 'それ', 'あれ', 'この', 'ここ', 'だれ', 'なに', 'ある', 'あります', 'いる', 'います', 'が', 'ます', 'ません', 'ました', 'ませんでした', 'を', 'に', 'で', 'へ', 'と', 'や', 'から', 'まで', 'ましょう', 'ませんか', 'たい', 'がほしい', 'ほしい', 'て', 'てください', 'ている', 'てもいい', 'てはいけない', 'ない', 'ないでください', 'なければならない', 'た', 'たことがある', 'たり', 'より', 'いちばん', 'ほうがいい', 'つもり', 'でしょう', 'なる', 'くなる', 'になる'];

/* ---------- reading a grammar point ---------- */
function gTheme(g) {
  if (g._th) return g._th;
  const jp = plain(gSplitTitle(g.t).jp || g.t).replace(/[〜～~…。、A-Za-z\s]/g, '');
  const gl = gGloss(g).join(' ; '), txt = String(g.m).toLowerCase().replace(/it can be translated[^.]*\.?|'[^']*'|"[^"]*"/g, ' ');
  let th = (gl && (GT_RE.find(([id, re]) => id !== 'basic' && re.test(gl)) || [])[0]) || (GT_RE.find(([, re]) => re.test(txt)) || [])[0];
  if (['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か', 'や', 'よ', 'ね', 'から', 'まで', 'より', 'には', 'では'].includes(jp) && !['why', 'time', 'if'].includes(th) && !/^[AＡ]\s*。/.test(g.t)) th = 'basic';   // a bare particle is a building block whatever its gloss says
  if (/^[AＡ]\s*。/.test(g.t)) th = 'link';   // "A。しかし、B。": joining two sentences
  return (g._th = th || 'more');
}
/** English equivalents: the quoted bits of the short explanation ('the most', 'the best'), or its short ;-pieces */
function gGloss(g) {
  if (g._gl) return g._gl;
  const m = String(g.m || ''), out = [];
  for (const x of m.matchAll(/(?:^|[\s(,;:])['‘“"]([^"“”]{1,40}?)['’”"](?=[\s,.;:)!?]|$)/g)) { const t = x[1].trim().replace(/[.,;]+$/, ''); if (t && /[a-z]/i.test(t) && !out.includes(t.toLowerCase())) out.push(t.toLowerCase()); }
  if (!out.length) { const ps = m.replace(/\.$/, '').split(/\s*;\s*/); if (ps.length > 1 && ps.every(p => p.split(/\s+/).length <= 5)) ps.forEach(p => out.push(p.toLowerCase())); }
  return (g._gl = out.slice(0, 4));
}
const gHideJp = (s, g) => { const vs = gVariants(g).map(v => v.v).filter(v => v.length > 1); return String(s).replace(/[぀-ヿ㐀-鿿〜～]+/g, r => r.length > 1 && vs.some(v => r.includes(v) || v.includes(r)) ? '〜' : r); };
/** One plain line on what the grammar is for: "To express the highest rank." */
function gPurpose(g) {
  if (g._pu != null) return gRev() ? gHideJp(g._pu, g) : g._pu;   // in Meaning → Pattern, the pattern itself never shows in the clue
  let s = '';
  const x = /\b(?:is |are )?used (to|when|for) ([^.;]{6,150})[.;]/i.exec(String(g.x || ''));
  if (x) s = (x[1].toLowerCase() === 'to' ? 'To ' : x[1].toLowerCase() === 'when' ? 'When ' : 'For ') + x[2].trim();
  if (!s) {
    s = String(g.m || '').replace(/['‘“"][^'’”"]{1,40}['’”"]/g, '').replace(/\bit can be translated[^.]*\.?/ig, '').replace(/\s*[;,:]\s*(?:or|and)?\s*(?=[;,.:]|$)/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').replace(/[\s;,:]+$/, '').trim();
    s = s.replace(/^(?:it is |is )?used to /i, 'To ').replace(/^(express|indicate|show|describe|emphasi[sz]e|present|connect|link|mark|state|give|make|ask|request)(?:es|s|ing)?\b/i, (m, v) => 'To ' + v.toLowerCase());
  }
  s = s.replace(/\s+/g, ' ').trim(); if (s && !/[.!?]$/.test(s)) s += '.';
  g._pu = s.charAt(0).toUpperCase() + s.slice(1);
  return gPurpose(g);
}
/** The pattern with clear placeholders: [N] が いちばん [adj] … instead of "A が いちばん～" or a bare "い-く +" */
function gPatParts(t) {
  let src = String(t).replace(/\s*[（(][^）)]*[）)]\s*/g, ' ').trim(), note = '';
  const ci = src.search(/:\s*[A-Za-z]/); if (ci > 0) { note = src.slice(ci + 1).trim(); src = src.slice(0, ci); }
  const out = [], re = /(い-?\s*adjective|な-?\s*adjective|i-adjective|na-adjective|adjective|verb(?:-?\s*[\u3040-\u30ffA-Za-z]+(?:\s?form)?)?|noun|statement|sentence|clause|question word|\b[AB]\b|[〜～~…]+|\.\.\.|\+|[\u3040-\u30ff\u3400-\u9fff、。？！ー・]+|[A-Za-z][A-Za-z\-]*)/gi;
  for (const m of src.matchAll(re)) {
    const w = m[1], lw = w.toLowerCase().replace(/\s+/g, '');
    if (w === '+') continue;
    if (/^(?:[〜～~…]+|\.\.\.)$/.test(w)) { if (!out.length || out[out.length - 1].k !== 'gap') out.push({ k: 'gap' }); continue; }
    if (/^い-?adjective$|^i-adjective$/.test(lw)) out.push({ k: 'a', t: 'い-adj' });
    else if (/^な-?adjective$|^na-adjective$/.test(lw)) out.push({ k: 'a', t: 'な-adj' });
    else if (lw === 'adjective') out.push({ k: 'a', t: 'adj' });
    else if (lw.startsWith('verb')) { const f = w.replace(/^verb-?\s*/i, '').replace(/\s?form$/i, '').trim(); out.push({ k: 'v', t: 'V' + (f ? '-' + f : '') }); }
    else if (lw === 'noun') out.push({ k: 'n', t: 'N' });
    else if (/^(?:statement|sentence|clause)$/.test(lw)) out.push({ k: 's', t: 'S' });
    else if (/^[ab]$/.test(lw)) out.push({ k: 's', t: w.toUpperCase() });
    else if (/[\u3040-\u30ff\u3400-\u9fff]/.test(w)) out.push({ k: 'j', t: w });
    else note = (note ? note + ' ' : '') + w;
  }
  // tidy: "A。けれども、～B。" reads as [A] けれども、 [B]: no stray 。 and no … next to a sentence slot
  for (const p of out) if (p.k === 'j') p.t = p.t.replace(/^[。？！]+|。+$/g, '');
  const tidy = out.filter((p, i) => !(p.k === 'j' && !p.t) && !(p.k === 'gap' && ((out[i - 1] && out[i - 1].k === 's') || (out[i + 1] && out[i + 1].k === 's'))));
  out.length = 0; out.push(...tidy);
  while (out.length && out[0].k === 'gap' && out.length > 1 && out[1].k !== 'j') out.shift();
  return { out, note };
}
function gPat(g) {
  if (g._pat) return g._pat;
  const { out, note } = gPatParts(g.t);
  const html = out.map(p => p.k === 'gap' ? '<i class="gph gap">…</i>' : p.k === 'j' ? `<b>${esc(p.t)}</b>` : `<i class="gph ph-${p.k}">${esc(p.t)}</i>`).join('');
  return (g._pat = `<span class="gpat2 jp">${html || esc(g.t)}</span>${note && !/[\u3040-\u30ff]/.test(note) && note.length < 30 ? `<span class="gpnote">${esc(note)}</span>` : ''}`);
}
const gPatText = g => gPatParts(g.t).out.map(p => p.k === 'gap' ? '…' : p.t).join(' ').replace(/ (?=[\u3040-\u30ff])|(?<=[\u3040-\u30ff]) /g, '');
/** Romaji / note under the pattern, e.g. "A ga ichiban" */
const gRomaji = g => (gSplitTitle(g.t).note || '').replace(/[〜～~]/g, '…');
/** The formation as colour-coded blocks, one line per alternative */
function gBlocks(fm) {
  const kind = p => /[぀-ヿ㐀-鿿]/.test(p) && !/[A-Za-z]/.test(p) ? 'gb-g' : /^\W*(?:verb|v-|v\b)/i.test(p) ? 'gb-v' : /noun|number|quantity|time|place|person|item|counter/i.test(p) ? 'gb-n' : /adj|い-|な-/i.test(p) ? 'gb-a' : /sentence|statement|clause|phrase|situation|action|question|a\b|b\b/i.test(p) ? 'gb-s' : 'gb-o';
  const lines = String(fm || '').split(/\n+|[,，、]\s*(?=(?:\(?\s*)?(?:Verb|V-|Noun|い-|な-|Adj|I-|Na-|Sentence|Statement|Item|Phrase|Clause|Number|Quantity|Time|Situation|[AB]\b|[぀-ヿ㐀-鿿]))|;\s*/).map(l => l.trim()).filter(l => l && /[+＋]|[぀-ヿ]/.test(l));
  const shown = lines.slice(0, 4);
  return shown.map(line => `<div class="gbline">${line.split(/\s*[+＋]\s*/).filter(Boolean).map(p => `<span class="gb ${kind(p)}${kind(p) === 'gb-g' ? ' jp' : ''}">${esc(p).replace(/[〜～~]/g, '…')}</span>`).join('<i class="gbp">+</i>')}</div>`).join('') + (lines.length > shown.length ? `<div class="gbmore">+ ${lines.length - shown.length} more way${lines.length - shown.length > 1 ? 's' : ''} in the details below</div>` : '');
}
/** markGrammar, then by reading too: いちばん lights up in {一番|いちばん} */
function markGrammar(j, g) {
  const m0 = markGrammar0(j, g); if (m0 !== j) return m0;
  const segs = []; for (const s of segsOf(j)) { if (s.r) segs.push(s); else for (const c of s.t) segs.push({ t: c, r: null }); }
  let rd = ''; const at = []; segs.forEach((s, k) => { for (const c of (s.r || s.t)) { rd += c; at.push(k); } });
  for (const { v } of gVariants(g).slice().sort((a, b) => b.v.length - a.v.length)) {
    if (v.length < 2) continue;
    const i = rd.indexOf(v); if (i < 0) continue;
    const k0 = at[i], k1 = at[i + v.length - 1];
    return segs.map((s, k) => (k === k0 ? '\u0001' : '') + (s.r ? `{${s.t}|${s.r}}` : s.t) + (k === k1 ? '\u0002' : '')).join('');
  }
  // the pattern written in kana, the sentence in kanji (いちばん → 一番): look the spelling up in the dictionary
  for (const { v } of gVariants(g).slice().sort((a, b) => b.v.length - a.v.length)) {
    if (v.length < 2 || !/^[\u3040-\u309f]+$/.test(v)) continue;
    g._kv = g._kv || {};
    const cands = g._kv[v] || (g._kv[v] = [...new Set(V.filter(x => x.r && x.r.length >= 2 && x.w !== x.r && v.includes(x.r) && /[\u3400-\u9fff]/.test(x.w)).map(x => v.replace(x.r, x.w)))].sort((a, b) => a.length - b.length).slice(0, 12));
    for (const w of cands) {
      let from = 0, idx;
      while ((idx = j.indexOf(w, from)) >= 0) {
        const before = j.slice(0, idx);
        if ((before.match(/\{/g) || []).length === (before.match(/\}/g) || []).length) return before + '\u0001' + w + '\u0002' + j.slice(idx + w.length);
        from = idx + 1;
      }
    }
  }
  return j;
}
/** Points you could mix this one up with: same chapter, overlapping English */
function gSimilar(g) {
  const words = x => new Set((gGloss(x).join(' ') + ' ' + String(x.m || '')).toLowerCase().match(/[a-z]{3,}/g) || []);
  const stop = new Set(['degree', 'least', 'about', 'some', 'meaning', 'sentence', 'between', 'two', 'the', 'and', 'express', 'expresses', 'used', 'that', 'something', 'someone', 'with', 'this', 'for', 'when', 'are', 'can', 'which', 'what', 'indicates', 'shows', 'used', 'action', 'situation', 'verb', 'noun', 'form']);
  const mine = [...words(g)].filter(w => !stop.has(w)), th = gTheme(g);
  return G.filter(x => x !== g && Math.abs(LV.indexOf(x.lvl) - LV.indexOf(g.lvl)) <= 1)
    .map(x => { const w = words(x); let s = mine.filter(t => w.has(t)).length; if (gTheme(x) === th) s += 1.5; if (gGloss(x).some(t => gGloss(g).includes(t))) s += 2; return [s, x]; })
    .filter(r => r[0] >= 2.5).sort((a, b) => b[0] - a[0]).slice(0, 3).map(r => r[1]);
}
/* ---------- chapters ---------- */
function gOrder(l) {
  const key = l + ':' + G.length;
  if (gOrder.c && gOrder.c[key]) return gOrder.c[key];
  const rank = new Map();
  try { for (const [i, u] of planUnits(l).entries()) for (const g of u.g || []) if (!rank.has(g.id)) rank.set(g.id, i); } catch (e) {}
  const n5 = g => { const vs = gVariants(g).map(v => v.v); const i = N5_ORDER.findIndex(o => vs.includes(o)); return i < 0 ? 999 : i; };
  const len = g => plain(gSplitTitle(g.t).jp || g.t).replace(/[〜～~…\s]/g, '').length;
  const pts = G.filter(g => g.lvl === l).map(g => [g, rank.has(g.id) ? rank.get(g.id) : 9999, l === 'N5' ? n5(g) : 999, len(g)]);
  pts.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[3] - b[3] || a[0].t.localeCompare(b[0].t, 'ja'));
  const out = GTHEMES.map(t => ({ t, pts: pts.filter(p => gTheme(p[0]) === t.id).map(p => p[0]) })).filter(c => c.pts.length);
  (gOrder.c = gOrder.c || {})[key] = out;
  return out;
}
const gLv = () => gSelLevels()[0];
const gNext = l => { for (const c of gOrder(l)) { const g = c.pts.find(g => !progress[g.id]); if (g) return g; } return null; };
const gRev = () => !!settings.grev;

/* ---------- the Grammar page ---------- */
function vGrammar() {
  if (S.gw) return vGWork();
  if (S.gp) { const g = G.find(x => x.id === S.gp); if (g) return vGPoint(g); S.gp = null; }
  const lvs = gLevels(), l = gLv(), busy = !isLoaded('grammar', l);
  if (busy) { loadGrammar([l]).then(render, render); }
  const pts = busy ? [] : G.filter(g => g.lvl === l), now = Date.now();
  const known = pts.filter(g => status(g.id) === 'known').length, learning = pts.filter(g => status(g.id) === 'learning').length, due = pts.filter(g => isDue(g.id, now)).length;
  const nx = busy ? null : gNext(l), q = (S.gf.q || '').trim().toLowerCase();
  const head = `<div class="gh-top"><div><h1>Grammar</h1><p class="sub">${grammarFull() ? `${fmtN(pts.length)} ${l} points, grouped by what you want to say.` : 'Starter grammar. The full N5–N1 set from hanabira.org loads once the GitHub Action has built it.'}</p></div>
    <div class="grev" role="group" aria-label="Study direction"><button class="${gRev() ? '' : 'on'}" onclick="App.gRev(0)"><b class="jp">文</b> Pattern → Meaning</button><button class="${gRev() ? 'on' : ''}" onclick="App.gRev(1)"><b>Aa</b> Meaning → Pattern</button></div></div>
    ${chips(lvs.map(x => [x, `<i class="lcdot" style="background:${lcVar(x)}"></i>${x}<small>${fmtN(levelTotal('grammar', x))}</small>`]), l, 'App.gLevel')}
    <button class="bk-conj" onclick="App.go('conj')"><b class="jp">活用</b><span><b>Conjugation drill</b><small>Practise the verb and adjective forms these patterns are built on</small></span></button>`;
  if (busy) return head + '<div class="loading">Loading grammar…</div>';
  const pct = pts.length ? Math.round(((known + learning * 0.5) / pts.length) * 100) : 0;
  const hero = `<div class="card ghero">
      <div class="gh-prog"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" class="gp-bg"/><circle cx="18" cy="18" r="15.9" class="gp-fg" style="stroke-dasharray:${pct} 100"/></svg><b>${pct}%</b></div>
      <div class="gh-next">${nx ? `<span class="gh-k">Next up · ${GT[gTheme(nx)].ico} ${esc(GT[gTheme(nx)].en)}</span>
        ${gRev() ? `<div class="gh-mean">${esc(gPurpose(nx))}</div>${gGloss(nx).length ? `<div class="gglos">${gGloss(nx).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}` : `<div class="gh-pat">${gPat(nx)}</div><div class="gh-mean sm">${esc(gGloss(nx).join(' · ') || gPurpose(nx))}</div>`}`
        : `<span class="gh-k">All ${l} points started 🎉</span><div class="gh-mean">Keep them fresh with a workout.</div>`}
        <div class="gh-stats">${fmtN(known)} known · ${fmtN(learning)} learning · ${fmtN(pts.length - known - learning)} new${due ? ` · <b>${fmtN(due)} due</b>` : ''}</div></div>
      <div class="gh-acts">${nx ? `<button class="btn" onclick="App.gOpen('${esc(nx.id)}', 1)">Learn it</button>` : ''}
        <button class="btn ${nx ? 'sec' : ''}" onclick="App.gWork()" ${known + learning < 1 && !nx ? 'disabled' : ''}>Workout${due ? ` · ${due} due` : ''}</button>
        <button class="btn line" onclick="App.startCards('grammar')">Flashcards</button></div></div>`;
  const search = `<input class="search" placeholder="Find grammar: たい, want, must, because…" value="${esc(S.gf.q)}" oninput="App.gSearch(this.value)" autocomplete="off" autocapitalize="off" spellcheck="false">`;
  return head + hero + search + `<div id="glist">${gChapters(l, q)}</div>`;
}
function gRow2(g) {
  const st = status(g.id), rev = gRev();
  return `<button class="grow" onclick="App.gOpen('${esc(g.id)}')"><i class="dot ${st}"></i>
    ${rev ? `<span class="gr-m">${esc(gGloss(g).join(' · ') || gPurpose(g))}</span><span class="gr-hid jp" aria-label="pattern hidden">${esc(gPatText(g))}</span>`
      : `<span class="gr-p">${gPat(g)}</span><span class="gr-m">${esc(gGloss(g).join(' · ') || gPurpose(g))}</span>`}
    <span class="gr-go">›</span></button>`;
}
function gChapters(l, q) {
  const ch = gOrder(l);
  if (q) {
    const hit = G.filter(g => g.lvl === l && (g.t.toLowerCase().includes(q) || plain(g.t).includes(q) || String(g.m).toLowerCase().includes(q) || gVariants(g).some(v => v.v.includes(q))));
    return hit.length ? `<div class="gchap open"><div class="gc-rows">${hit.slice(0, 80).map(gRow2).join('')}</div></div>` : '<p class="muted">No grammar matches. Try English (want, because) or kana (たい, から).</p>';
  }
  const firstOpen = ch.findIndex(c => c.pts.some(g => !progress[g.id]));
  return ch.map((c, i) => {
    const kn = c.pts.filter(g => status(g.id) === 'known').length, lr = c.pts.filter(g => status(g.id) === 'learning').length;
    const open = S.gopen && c.t.id in S.gopen ? S.gopen[c.t.id] : i === firstOpen;
    return `<div class="gchap ${open ? 'open' : ''}"><button class="gc-head" onclick="App.gChap('${c.t.id}', ${open ? 0 : 1})" aria-expanded="${open}">
      <span class="gc-ico">${c.t.ico}</span><span class="gc-t"><b>${esc(c.t.en)} <span class="jp">${c.t.jp}</span></b><small>${esc(c.t.s)}</small></span>
      <span class="gc-n">${kn + lr}/${c.pts.length}<i><s style="width:${((kn + lr * 0.5) / c.pts.length) * 100}%"></s></i></span><span class="gc-car">▾</span></button>
      ${open ? `<div class="gc-rows">${c.pts.map(gRow2).join('')}</div>` : ''}</div>`;
  }).join('');
}

/* ---------- one grammar point: a short lesson ---------- */
function gExample(e, g, hideJp) {
  const j = ruby(markGrammar(fillFuri(e.j), g), true).replace(/\u0001/g, '<mark class="gp">').replace(/\u0002/g, '</mark>');
  return `<div class="gex">${hideJp ? `<div class="gx-e big">${esc(e.e)}</div><div class="gx-j jp hid">${j}</div>` : `<div class="gx-j jp">${j}</div><div class="gx-e">${esc(e.e)}</div>`}</div>`;
}
function vGPoint(g) {
  const T = GT[gTheme(g)], rev = gRev() && !S.gshow, p = progress[g.id], sim = gSimilar(g), ex = g.ex.slice(0, 4);
  const back = `<div class="gp-nav"><button class="ghost" onclick="App.gBack()">‹ Grammar</button><span class="tag lv">${g.lvl}</span><span class="gp-ch">${T.ico} ${esc(T.en)}</span></div>`;
  const top = rev
    ? `<div class="card gp-hero rev"><span class="gp-k">What’s the Japanese pattern for…</span><div class="gp-purp big">${esc(gPurpose(g))}</div>
        ${gGloss(g).length ? `<div class="gglos">${gGloss(g).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        ${ex[0] ? `<div class="gp-k" style="margin-top:14px">As in</div><div class="gx-e big">“${esc(ex[0].e)}”</div>` : ''}
        <p class="hint">Think of the pattern (and how you’d say that sentence), then reveal.</p>
        <button class="btn" onclick="App.gShow()">Reveal the pattern</button></div>`
    : `<div class="card gp-hero"><div class="gp-pat">${gPat(g)}</div>${gRomaji(g) ? `<div class="gp-rom">${esc(gRomaji(g))}</div>` : ''}
        <div class="gp-purp">${esc(gPurpose(g))}</div>${gGloss(g).length ? `<div class="gglos">${gGloss(g).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
  if (rev) return back + top;
  /* the lesson always runs in the same order: what it means (the card above), how to form it,
     how it's used, examples, similar patterns, then practice. Sections without content are left out and the rest renumbered. */
  let n = 0; const num = () => ++n;
  const build = g.fm ? `<section class="gsec"><h3><span>${num()}</span>How to form it</h3><div class="gbuild">${gBlocks(g.fm)}</div>
      <div class="gkey"><span class="gb gb-n">Noun</span><span class="gb gb-v">Verb</span><span class="gb gb-a">Adjective</span><span class="gb gb-s">Sentence</span><span class="gb gb-g jp">grammar</span></div></section>` : '';
  const more = g.x ? `<details class="gsec gmore"${String(g.x).length < 500 ? ' open' : ''}><summary><span class="gnum">${num()}</span>How it’s used</summary><div class="gexpl">${gExplHtml(g.x)}</div>${g.fm ? `<div class="gform"><b>Formation, as written</b>${gFormHtml(g.fm)}</div>` : ''}</details>` : '';
  const gk = gkpForGrammar(g);
  const see = ex.length || gk ? `<section class="gsec"><h3><span>${num()}</span>Examples</h3>${ex.map(e => gExample(e, g)).join('')}${gk}</section>` : '';
  const mix = sim.length ? `<section class="gsec"><h3><span>${num()}</span>Compare with similar patterns</h3><div class="gsim">${sim.map(x => `<button class="gsim-b" onclick="App.gOpen('${esc(x.id)}')"><span class="gr-p">${gPat(x)}</span><small>${esc(gGloss(x).join(' · ') || gPurpose(x))}</small></button>`).join('')}</div></section>` : '';
  const T2 = S.gtry && S.gtry.id === g.id ? S.gtry : null;
  const tryIt = `<section class="gsec gtry" id="gtry"><h3><span>${num()}</span>Practice</h3>${T2 ? gTryHtml(T2) : `<p class="muted">Three quick questions on this pattern: one of them is a sentence to build.</p><button class="btn" onclick="App.gTry('${esc(g.id)}')">Start</button>`}</section>`;
  const nx = gNextAfter(g);
  const foot = `<div class="gp-foot"><span class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong` : 'Not studied yet'}${grammarFull() ? ' · from <a href="https://hanabira.org/" target="_blank" rel="noopener">hanabira.org</a>' : ''}</span>
    ${nx ? `<button class="btn sec sm" onclick="App.gOpen('${esc(nx.id)}', 1)">Next: ${gRev() ? esc(gGloss(nx)[0] || 'next point') : `<span class="jp">${esc(gPatText(nx))}</span>`} ›</button>` : ''}</div>`;
  return back + top + build + more + see + mix + tryIt + foot;
}
function gNextAfter(g) { const all = gOrder(g.lvl).flatMap(c => c.pts), i = all.indexOf(g); return all.slice(i + 1).find(x => !progress[x.id]) || all[i + 1] || null; }

/* ---------- questions (shared by Try it and the workout) ---------- */
function gPool(g) { const same = G.filter(x => x.lvl === g.lvl); return same.length >= 6 ? same : G; }
/** English → which Japanese sentence is right? The options differ only in the grammar. */
function gQPick(g) {
  const b = gBlank(g); if (!b || !b.e.e) return null;
  const wrong = gFillOpts(g, b.v, gPool(g)); if (wrong.length < 2) return null;
  const m = exMarkup(b.e), mk = v => `<span class="jp cjp">${sentHtml(m, b.i, b.v.v.length, `<mark class="gp">${esc(v)}</mark>`)}</span>`;
  return { t: 'pick', g, hint: 'Which Japanese says this?', prompt: `<div class="gq-en">“${esc(b.e.e)}”</div>`, opts: shuffle([{ html: mk(b.v.v), ok: true }, ...wrong.map(w => ({ html: mk(w), ok: false }))]), full: m };
}
/** Put the pieces of an example in order */
function gQBuild(g) {
  for (const e of shuffle(g.ex.filter(e => e.e && plain(e.j).length <= 34))) {
    const m = exMarkup(e), c = chunkSentence(plain(m)); let parts = c.parts.slice();
    while (parts.length > 6) { let k = 0; for (let i = 1; i < parts.length - 1; i++) if (parts[i].length + parts[i + 1].length < parts[k].length + parts[k + 1].length) k = i; parts.splice(k, 2, parts[k] + parts[k + 1]); }
    if (parts.length < 3 || new Set(parts).size !== parts.length) continue;
    let off = 0; const tiles = parts.map((t, i) => { const o = { i, t, html: rangeHtml(m, off, off + t.length) }; off += t.length; return o; });
    let order = shuffle(tiles.map(t => t.i)); for (let n = 0; n < 5 && order.every((v, i) => v === i); n++) order = shuffle(order);
    return { t: 'build', g, hint: 'Tap the pieces in order', prompt: `<div class="gq-en">“${esc(e.e)}”</div>`, tiles, order, end: c.end, picked: [], full: m };
  }
  return null;
}
function gQFill(g) { const q = makeGrammarQ(g, 'gfill'); return q && q.dir === 'gfill' ? { t: 'fill', g, hint: q.hint, prompt: q.prompt, opts: q.opts } : null; }
function gQMean(g) {
  const others = shuffle(gPool(g).filter(x => x !== g && x.m && !grammarOverlap(g, x) && !gGloss(x).some(t => gGloss(g).includes(t)))).slice(0, 3);
  if (others.length < 3) return null;
  const lab = x => esc(gGloss(x).join(' · ') || gPurpose(x));
  return { t: 'mean', g, hint: 'What does it mean?', prompt: `<div class="pword gq">${gPat(g)}</div>`, opts: shuffle([g, ...others]).map(x => ({ html: lab(x), ok: x === g })) };
}
function gQRev(g) {
  const others = shuffle(gPool(g).filter(x => x !== g && !grammarOverlap(g, x) && !gGloss(x).some(t => gGloss(g).includes(t)))).slice(0, 3);
  if (others.length < 3) return null;
  return { t: 'rev', g, hint: 'Which pattern is it?', prompt: `<div class="gq-purp">${esc(gPurpose(g))}</div>${gGloss(g).length ? `<div class="gglos c">${gGloss(g).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}`,
    opts: shuffle([g, ...others]).map(x => ({ html: `<span class="cjp">${gPat(x)}</span>`, ok: x === g })) };
}
const GQ = { pick: gQPick, build: gQBuild, fill: gQFill, mean: gQMean, rev: gQRev };
function gMakeQ(g, prefer) { for (const t of [...prefer, 'fill', 'mean', 'rev', 'pick', 'build']) { const q = GQ[t](g); if (q) return q; } return null; }

/** One question, interactive. `ns` is 'gt' (Try it) or 'gw' (workout). */
function gQHtml(q, ns) {
  const done = q.ans != null;
  let body;
  if (q.t === 'build') {
    const by = i => q.tiles[i], placed = q.picked.map(by), bank = q.order.filter(i => !q.picked.includes(i)).map(by);
    body = `<div class="gb-line ${done ? (q.ok ? 'ok' : 'bad') : ''}">${placed.map((t, k) => `<button class="gtile on jp" onclick="App.${ns}Undo(${k})" ${done ? 'disabled' : ''}>${t.html}</button>`).join('') || '<span class="gb-ph">Tap the pieces below</span>'}${placed.length === q.tiles.length ? `<span class="jp">${esc(q.end)}</span>` : ''}</div>
      <div class="gb-bank">${bank.map(t => `<button class="gtile jp" onclick="App.${ns}Tile(${t.i})" ${done ? 'disabled' : ''}>${t.html}</button>`).join('')}</div>
      ${done && !q.ok ? `<div class="gfix"><span class="gp-k">Right order</span><div class="jp">${ruby(markGrammar(fillFuri(q.full), q.g), true).replace(/\u0001/g, '<mark class="gp">').replace(/\u0002/g, '</mark>')}</div></div>` : ''}`;
  } else {
    body = `<div class="choices ${q.t === 'pick' || q.t === 'mean' ? '' : 'grid2'} gchoices">${q.opts.map((o, k) => `<button class="choice${done ? (o.ok ? ' ok' : k === q.ans ? ' bad' : ' dim') : ''}" onclick="App.${ns}Ans(${k})" ${done ? 'disabled' : ''}><span>${o.html}</span></button>`).join('')}</div>`;
  }
  return `<div class="gq"><div class="gq-p">${q.prompt}</div><p class="hint">${esc(q.hint)}</p>${body}</div>`;
}
function gAnswer(q, ok) { q.ok = ok; q.ans = q.ans != null ? q.ans : -1; rec(q.g, ok); }
function gTile(q, i) { if (q.ans != null || q.picked.includes(i)) return; q.picked.push(i); if (q.picked.length === q.tiles.length) { q.ans = 0; gAnswer(q, q.picked.every((v, k) => v === k)); } }

/* Try it: 3 questions inside the lesson */
function gTryHtml(T) {
  if (T.i >= T.qs.length) {
    const n = T.qs.filter(q => q.ok).length;
    return `<div class="gtry-end ${n >= 2 ? 'good' : ''}"><b>${n === T.qs.length ? 'Perfect! 完璧！' : n >= 2 ? 'Nice work! いいね！' : 'Keep at it. がんばって！'}</b><span>${n} of ${T.qs.length} right. ${n >= 2 ? 'This point is in your reviews now.' : 'Look at the examples again, then try once more.'}</span>
      <div class="btnrow"><button class="btn sec sm" onclick="App.gTry('${esc(T.id)}')">Try again</button>${(() => { const nx = gNextAfter(G.find(x => x.id === T.id)); return nx ? `<button class="btn sm" onclick="App.gOpen('${esc(nx.id)}', 1)">Next point ›</button>` : ''; })()}</div></div>`;
  }
  const q = T.qs[T.i];
  return `<div class="gtry-n">${T.qs.map((x, k) => `<i class="${k < T.i || x.ans != null ? (x.ok ? 'ok' : 'bad') : k === T.i ? 'cur' : ''}"></i>`).join('')}</div>${gQHtml(q, 'gt')}
    ${q.ans != null ? `<div class="gq-next"><span class="gq-res ${q.ok ? 'ok' : 'bad'}">${q.ok ? '正解! Correct' : 'おしい! Not quite'}</span><button class="btn sm" onclick="App.gtNext()">${T.i + 1 < T.qs.length ? 'Next ›' : 'Finish'}</button></div>` : ''}`;
}
function gTryStart(id) {
  const g = G.find(x => x.id === id); if (!g) return;
  const qs = [], seen = new Set();
  for (const pref of [['build'], gRev() ? ['pick', 'rev'] : ['fill', 'pick'], gRev() ? ['rev', 'fill'] : ['mean', 'rev']]) {
    const q = gMakeQ(g, pref.filter(t => !seen.has(t))); if (q && !seen.has(q.t)) { seen.add(q.t); qs.push(q); }
  }
  S.gtry = { id, qs, i: 0 };
}
const gtRefresh = () => { const el = $('#gtry'); if (el && S.gtry) { el.innerHTML = `<h3><span>✍︎</span>Try it</h3>${gTryHtml(S.gtry)}`; hydrate(el); } else render(); };

/* ---------- workout ---------- */
function gWorkStart() {
  const l = gLv(), now = Date.now(), lvPts = G.filter(g => g.lvl === l);
  const due = shuffle(lvPts.filter(g => isDue(g.id, now))), lrn = shuffle(lvPts.filter(g => progress[g.id] && !due.includes(g)));
  const fresh = gOrder(l).flatMap(c => c.pts).filter(g => !progress[g.id]).slice(0, 4);
  const pool = [...due, ...lrn, ...fresh].slice(0, 10);
  const types = gRev() ? ['rev', 'build', 'pick', 'pick', 'rev', 'fill'] : ['fill', 'mean', 'pick', 'build', 'fill', 'rev'];
  const qs = pool.map((g, i) => gMakeQ(g, [types[i % types.length]])).filter(Boolean);
  S.gw = { qs, i: 0, l }; S.gp = null; render(); window.scrollTo(0, 0);
}
function vGWork() {
  const W = S.gw, q = W.qs[W.i];
  if (!W.qs.length) return `<div class="card"><b>Nothing to practise yet</b><p class="muted">Learn a couple of points first, then come back.</p><button class="btn" onclick="App.gWorkEnd()">Back to Grammar</button></div>`;
  if (!q) {
    const n = W.qs.filter(x => x.ok).length;
    return `<div class="card score"><div class="arrive">お疲れ様!</div><div class="big">${n} / ${W.qs.length}</div><div class="muted">Grammar workout · ${W.l}${gRev() ? ' · Meaning → Pattern' : ''}</div></div>
      <div class="list">${W.qs.map(x => `<button class="grow" onclick="App.gWorkEnd();App.gOpen('${esc(x.g.id)}')"><i class="dot ${x.ok ? 'known' : 'learning'}"></i><span class="gr-p">${gPat(x.g)}</span><span class="gr-m">${x.ok ? '✓' : '✗ review it'}</span><span class="gr-go">›</span></button>`).join('')}</div>
      <div class="btnrow"><button class="btn" onclick="App.gWork()">Another round</button><button class="btn line" onclick="App.gWorkEnd()">Back to Grammar</button></div>`;
  }
  const names = { fill: 'Fill the blank', mean: 'Meaning', rev: 'Meaning → Pattern', pick: 'Pick the Japanese', build: 'Build the sentence' };
  return `<div class="qtop"><span class="qnav"><button class="ghost" onclick="App.gWorkEnd()">✕ End</button></span><span>${W.i + 1} of ${W.qs.length} · ${names[q.t]}</span></div>
    <div class="qbar"><i style="width:${(W.i / W.qs.length) * 100}%"></i></div>
    <div class="card gwq">${gQHtml(q, 'gw')}</div>
    ${q.ans != null ? `<div class="feedback ${q.ok ? 'good' : 'bad'}" role="status"><div class="fv">${q.ok ? pick(['正解! Correct', 'いいね! Nice', 'すごい! Great']) : 'おしい! Not quite'}<div class="fa">${gPat(q.g)} <span>${esc(gGloss(q.g).join(' · ') || gPurpose(q.g))}</span></div></div><button class="btn" onclick="App.gwNext()">${W.i + 1 < W.qs.length ? 'Next' : 'Finish'}</button></div>` : ''}`;
}

/* ---------- the pop-up sheet (search, lessons, flashcard backs) ---------- */
function gDetail(g) {
  const p = progress[g.id], sim = gSimilar(g);
  return `<div class="detail force gdet">
    <div class="dtop"><div class="gtitle">${gPat(g)}</div></div>${gRomaji(g) ? `<div class="gp-rom">${esc(gRomaji(g))}</div>` : ''}
    <div class="tags"><span class="tag lv">${g.lvl}</span><span class="tag">${GT[gTheme(g)].ico} ${esc(GT[gTheme(g)].en)}</span></div>
    <div class="gp-purp">${esc(gPurpose(g))}</div>${gGloss(g).length ? `<div class="gglos">${gGloss(g).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    ${g.fm ? `<div class="gbuild" style="margin-top:12px">${gBlocks(g.fm)}</div>` : ''}
    ${g.ex.length ? `<div class="mini">Examples</div>${g.ex.slice(0, 3).map(e => gExample(e, g)).join('')}` : ''}
    ${gkpForGrammar(g)}
    ${sim.length ? `<div class="mini">Don’t mix it up with</div><div class="gsim">${sim.map(x => `<button class="gsim-b" data-open="${esc(x.id)}"><span class="gr-p">${gPat(x)}</span><small>${esc(gGloss(x).join(' · ') || gPurpose(x))}</small></button>`).join('')}</div>` : ''}
    <div class="btnrow"><button class="btn sec" onclick="App.gOpen('${esc(g.id)}')">Open the lesson ›</button></div>
    <div class="mini">${p ? `Your record: ${p.c} right · ${p.w} wrong · next review ${p.d > Date.now() ? 'in ' + fmtIv(p.d - Date.now()) : 'due now'}` : 'Not studied yet'}${grammarFull() ? ' · Grammar from <a href="https://hanabira.org/" target="_blank" rel="noopener">hanabira.org</a>' : ''}</div>
  </div>`;
}

/* ---------- flashcards: front follows the toggle ---------- */
const gCardFront = g => gRev() ? `<div class="gq-purp">${esc(gPurpose(g))}</div>${gGloss(g).length ? `<div class="gglos c">${gGloss(g).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}${g.ex[0] && g.ex[0].e ? `<div class="proma">“${esc(g.ex[0].e)}”</div>` : ''}` : `<div class="pword gq">${gPat(g)}</div>`;

const grammarApp = {
  gRev(v) { settings.grev = !!+v; saveSettings(); S.gshow = false; if (S.gtry) S.gtry = null; render(); },
  gLevel(l) { settings.glevels = [l]; saveSettings(); S.gf.q = ''; S.gopen = null; render(); loadGrammar([l]).then(render, render); },
  gChap(id, v) { S.gopen = S.gopen || {}; S.gopen[id] = !!v; const el = $('#glist'); if (el) el.innerHTML = gChapters(gLv(), (S.gf.q || '').trim().toLowerCase()); },
  gSearch(v) { S.gf.q = v; const el = $('#glist'); if (el) el.innerHTML = gChapters(gLv(), v.trim().toLowerCase()); },
  gOpen(id, learn) { S.gp = id; S.gshow = false; S.gtry = null; S.gw = null; if (S.view !== 'grammar') S.view = 'grammar'; App.closeSheet && App.closeSheet(); render(); window.scrollTo(0, 0); },
  gBack() { S.gp = null; S.gtry = null; render(); },
  gShow() { S.gshow = true; render(); },
  gTry(id) { gTryStart(id); gtRefresh(); const el = $('#gtry'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
  gtAns(k) { const T = S.gtry, q = T && T.qs[T.i]; if (!q || q.ans != null) return; q.ans = k; gAnswer(q, !!q.opts[k].ok); gtRefresh(); },
  gtTile(i) { const T = S.gtry, q = T && T.qs[T.i]; if (q) { gTile(q, i); gtRefresh(); } },
  gtUndo(k) { const T = S.gtry, q = T && T.qs[T.i]; if (q && q.ans == null) { q.picked.splice(k, 1); gtRefresh(); } },
  gtNext() { const T = S.gtry; if (T) { T.i++; gtRefresh(); } },
  gWork() { gWorkStart(); },
  gWorkEnd() { S.gw = null; render(); },
  gwAns(k) { const W = S.gw, q = W && W.qs[W.i]; if (!q || q.ans != null) return; q.ans = k; gAnswer(q, !!q.opts[k].ok); render(); },
  gwTile(i) { const W = S.gw, q = W && W.qs[W.i]; if (q) { gTile(q, i); render(); } },
  gwUndo(k) { const W = S.gw, q = W && W.qs[W.i]; if (q && q.ans == null) { q.picked.splice(k, 1); render(); } },
  gwNext() { const W = S.gw; if (W) { W.i++; render(); window.scrollTo(0, 0); } }
};

