/* =====================================================================
   CONJUGATION: verbs and adjectives, every form a textbook course teaches,
   with the reason behind each answer. Verb classes come from JMdict's tags
   (v1, v5k, vs …) or, for textbook words, from the class the textbook gives.
   ===================================================================== */
const CJ_A = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };
const CJ_I = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const CJ_E = { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' };
const CJ_O = { う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' };
const CJ_TE = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
/** JMdict tag → class. 1 ichidan · 5x godan ending x · iku 行く · aru いらっしゃる type · aru-i ある · u-s 問う · kureru くれる · suru · vs noun+する · kuru */
const CJ_TAG = { v1: '1', 'v1-s': 'kureru', v5aru: 'aru', 'v5k-s': 'iku', 'v5r-i': 'aru-i', 'v5u-s': 'u-s', vk: 'kuru', 'vs-i': 'suru', vs: 'vs',
  v5u: '5u', v5k: '5ku', v5g: '5gu', v5s: '5su', v5t: '5tsu', v5n: '5nu', v5b: '5bu', v5m: '5mu', v5r: '5ru' };
const CJ_ROW = { u: 'う', ku: 'く', gu: 'ぐ', su: 'す', tsu: 'つ', nu: 'ぬ', bu: 'ぶ', mu: 'む', ru: 'る' };

/* the forms, in the order a course teaches them */
const CJ_FORMS = [
  // id, label, what it means, verb | adj, textbook lesson (Genki)
  ['masu', 'polite present', 'do / will do (polite)', 'v', 3], ['masen', 'polite negative', 'don’t / won’t (polite)', 'v', 3],
  ['mashita', 'polite past', 'did (polite)', 'v', 4], ['masendeshita', 'polite past negative', 'didn’t (polite)', 'v', 4],
  ['mashou', 'let’s …', 'let’s do', 'v', 5],
  ['te', 'て-form', 'joins actions; requests with ください', 'v', 6],
  ['nai', 'short negative', 'don’t (casual)', 'v', 8], ['ta', 'short past', 'did (casual)', 'v', 9], ['nakatta', 'short past negative', 'didn’t (casual)', 'v', 9],
  ['tai', '〜たい', 'want to do', 'v', 11], ['nakereba', '〜なければ', 'must (〜なければいけない)', 'v', 12],
  ['pot', 'potential', 'can do', 'v', 13], ['vol', 'volitional', 'let’s (casual); I think I’ll', 'v', 15],
  ['tara', '〜たら', 'if / when', 'v', 17], ['ba', '〜ば', 'if', 'v', 18],
  ['pass', 'passive', 'is done (to someone)', 'v', 21], ['caus', 'causative', 'make / let someone do', 'v', 22], ['imp', 'command', 'do it! (blunt)', 'v', 22],
  ['causpass', 'causative-passive', 'is made to do', 'v', 23],
  ['a-neg', 'negative', 'is not', 'a', 5], ['a-past', 'past', 'was', 'a', 5], ['a-pastneg', 'past negative', 'was not', 'a', 5],
  ['a-te', 'て-form', 'joins adjectives: … and …', 'a', 7], ['a-adv', 'adverb', '…ly (with a verb)', 'a', 13],
  ['a-plain-neg', 'short negative', 'is not (casual)', 'a', 8], ['a-plain-past', 'short past', 'was (casual)', 'a', 9], ['a-plain-pastneg', 'short past negative', 'was not (casual)', 'a', 9]
];
const CJF = Object.fromEntries(CJ_FORMS.map(f => [f[0], { id: f[0], label: f[1], what: f[2], kind: f[3], lesson: f[4] }]));
/* forms a verb doesn't really have: 分かる can't be "can understand" (it already is), ある has no command, honorific verbs keep to the basics */
const CJ_BASIC = ['masu', 'masen', 'mashita', 'masendeshita', 'te', 'nai', 'ta', 'nakatta', 'tara', 'ba'];
const CJ_NOPOT = new Set(['分かる', '判る', 'わかる', '出来る', 'できる', '見える', 'みえる', '聞こえる', 'きこえる', '要る', '知る', 'しる', '似る', '似合う']);

function verbClass(x) {
  if (x.vc) return x.vc;
  for (const s of x.senses || []) for (const p of s.p || []) { if (CJ_TAG[p]) return CJ_TAG[p]; }
  return null;
}
const adjClass = x => x.pos === 'i-adj' ? 'i' : x.pos === 'na-adj' ? 'na' : null;

/** which forms make sense for this word */
function cjFormsFor(x) {
  const vc = verbClass(x);
  if (vc) {
    if (vc === 'aru' || vc === 'aru-i') return CJ_BASIC.slice();
    if (vc === 'kureru') return CJ_FORMS.filter(f => f[3] === 'v' && !['pot', 'pass', 'caus', 'causpass', 'vol'].includes(f[0])).map(f => f[0]);
    const base = String(x.w).replace(/[〜～]/g, '');
    const noPot = CJ_NOPOT.has(base) || CJ_NOPOT.has(x.r);
    return CJ_FORMS.filter(f => f[3] === 'v' && !(noPot && ['pot', 'pass', 'caus', 'causpass', 'vol', 'imp'].includes(f[0]))).map(f => f[0]);
  }
  const ac = adjClass(x);
  if (ac === 'i' && /[いイ]$/.test(x.r)) return CJ_FORMS.filter(f => f[3] === 'a').map(f => f[0]);
  if (ac === 'na') return CJ_FORMS.filter(f => f[3] === 'a').map(f => f[0]);
  return [];
}

/** apply one ending change to both the written form and the reading. f(s) gets the text and returns the new text. */

/** → { w, r, alt: [{ w, r, note }] } or null */
function conjugate(x, form) {
  const vc = verbClass(x);
  if (vc) return cjVerb(String(x.w), String(x.r), vc, form);
  const ac = adjClass(x);
  if (ac) return cjAdj(String(x.w), String(x.r), ac, form);
  return null;
}

function cjVerb(w, r, vc, form) {
  w = w.replace(/[〜～]/g, ''); r = r.replace(/[〜～]/g, '');
  if (vc === 'vs') { w += 'する'; r += 'する'; vc = 'suru'; }
  if (vc === 'suru' && !r.endsWith('する')) return null;
  const alt = [];
  /* する */
  if (vc === 'suru') {
    const S = { masu: 'します', masen: 'しません', mashita: 'しました', masendeshita: 'しませんでした', mashou: 'しましょう', te: 'して', ta: 'した', nai: 'しない', nakatta: 'しなかった',
      tai: 'したい', nakereba: 'しなければ', pot: 'できる', vol: 'しよう', tara: 'したら', ba: 'すれば', pass: 'される', caus: 'させる', imp: 'しろ', causpass: 'させられる' }[form];
    if (!S) return null;
    const res = { w: w.slice(0, -2) + S, r: r.slice(0, -2) + S, alt };
    if (form === 'imp') alt.push({ w: w.slice(0, -2) + 'せよ', r: r.slice(0, -2) + 'せよ', note: 'written style' });
    return res;
  }
  /* くる / 来る */
  if (vc === 'kuru') {
    const K = { masu: 'きます', masen: 'きません', mashita: 'きました', masendeshita: 'きませんでした', mashou: 'きましょう', te: 'きて', ta: 'きた', nai: 'こない', nakatta: 'こなかった',
      tai: 'きたい', nakereba: 'こなければ', pot: 'こられる', vol: 'こよう', tara: 'きたら', ba: 'くれば', pass: 'こられる', caus: 'こさせる', imp: 'こい', causpass: 'こさせられる' }[form];
    if (!K || !r.endsWith('くる')) return null;
    const rr = r.slice(0, -2) + K;
    const ww = w.endsWith('来る') ? w.slice(0, -2) + '来' + K.slice(1) : w.endsWith('くる') ? w.slice(0, -2) + K : null;
    if (!ww) return null;
    const res = { w: ww, r: rr, alt };
    if (form === 'pot') alt.push({ w: ww.replace(/られる$/, 'れる'), r: rr.replace(/られる$/, 'れる'), note: 'casual (ら-less)' });
    return res;
  }
  /* る-verbs (ichidan) */
  if (vc === '1' || vc === 'kureru') {
    if (!w.endsWith('る') || !r.endsWith('る')) return null;
    const st = s => s.slice(0, -1);
    const E = { masu: 'ます', masen: 'ません', mashita: 'ました', masendeshita: 'ませんでした', mashou: 'ましょう', te: 'て', ta: 'た', nai: 'ない', nakatta: 'なかった',
      tai: 'たい', nakereba: 'なければ', pot: 'られる', vol: 'よう', tara: 'たら', ba: 'れば', pass: 'られる', caus: 'させる', imp: vc === 'kureru' ? '' : 'ろ', causpass: 'させられる' }[form];
    if (E === undefined) return null;
    const res = { w: st(w) + E, r: st(r) + E, alt };
    if (form === 'pot') alt.push({ w: st(w) + 'れる', r: st(r) + 'れる', note: 'casual (ら-less)' });
    if (form === 'imp' && vc !== 'kureru') alt.push({ w: st(w) + 'よ', r: st(r) + 'よ', note: 'written style' });
    return res;
  }
  /* う-verbs (godan) and their special members */
  const last = r.slice(-1);
  if (!CJ_A[last] || w.slice(-1) !== last) return null;
  if (vc.startsWith('5') && CJ_ROW[vc.slice(1)] !== last) return null;
  const st = s => s.slice(0, -1);
  const A = s => st(s) + CJ_A[last], I = s => st(s) + CJ_I[last], Ee = s => st(s) + CJ_E[last], O = s => st(s) + CJ_O[last];
  const TE = CJ_TE[last];
  const te = s => vc === 'iku' ? st(s) + 'って' : vc === 'u-s' ? s + 'て' : st(s) + TE;
  const ta = s => te(s).replace(/て$/, 'た').replace(/で$/, 'だ');
  const stemI = s => vc === 'aru' ? st(s) + 'い' : I(s);
  if (vc === 'aru-i' && ['nai', 'nakatta', 'nakereba'].includes(form)) {
    const n = { nai: 'ない', nakatta: 'なかった', nakereba: 'なければ' }[form];
    return { w: w.slice(0, -2) + n, r: r.slice(0, -2) + n, alt };   // 人気がある → 人気がない
  }
  const F = {
    masu: s => stemI(s) + 'ます', masen: s => stemI(s) + 'ません', mashita: s => stemI(s) + 'ました', masendeshita: s => stemI(s) + 'ませんでした', mashou: s => stemI(s) + 'ましょう',
    te, ta, nai: s => A(s) + 'ない', nakatta: s => A(s) + 'なかった', tai: s => stemI(s) + 'たい', nakereba: s => A(s) + 'なければ',
    pot: s => Ee(s) + 'る', vol: s => O(s) + 'う', tara: s => ta(s) + 'ら', ba: s => Ee(s) + 'ば', pass: s => A(s) + 'れる', caus: s => A(s) + 'せる',
    imp: s => vc === 'aru' ? st(s) + 'い' : Ee(s), causpass: s => last === 'す' ? A(s) + 'せられる' : A(s) + 'される'
  }[form];
  if (!F) return null;
  const res = { w: F(w), r: F(r), alt };
  if (form === 'causpass' && last !== 'す') alt.push({ w: A(w) + 'せられる', r: A(r) + 'せられる', note: 'long form' });
  return res;
}

function cjAdj(w, r, ac, form) {
  const alt = [];
  if (ac === 'i') {
    if (!r.endsWith('い')) return null;
    // いい / かっこいい / 良い: every other form is built on よ
    const yo = s => /いい$/.test(s) ? s.slice(0, -2) + 'よ' : s.slice(0, -1);
    const kw = w.endsWith('良い') || w.endsWith('善い') ? w.slice(0, -1) : yo(w), kr = yo(r);
    const E = { 'a-neg': 'くないです', 'a-past': 'かったです', 'a-pastneg': 'くなかったです', 'a-te': 'くて', 'a-adv': 'く', 'a-plain-neg': 'くない', 'a-plain-past': 'かった', 'a-plain-pastneg': 'くなかった' }[form];
    if (!E) return null;
    if (form === 'a-neg') alt.push({ w: kw + 'くありません', r: kr + 'くありません', note: 'also correct' });
    if (form === 'a-pastneg') alt.push({ w: kw + 'くありませんでした', r: kr + 'くありませんでした', note: 'also correct' });
    return { w: kw + E, r: kr + E, alt };
  }
  const E = { 'a-neg': 'じゃないです', 'a-past': 'でした', 'a-pastneg': 'じゃなかったです', 'a-te': 'で', 'a-adv': 'に', 'a-plain-neg': 'じゃない', 'a-plain-past': 'だった', 'a-plain-pastneg': 'じゃなかった' }[form];
  if (!E) return null;
  const more = { 'a-neg': ['ではないです', 'じゃありません', 'ではありません'], 'a-pastneg': ['ではなかったです', 'じゃありませんでした', 'ではありませんでした'], 'a-plain-neg': ['ではない'], 'a-plain-pastneg': ['ではなかった'] }[form] || [];
  for (const m of more) alt.push({ w: w + m, r: r + m, note: 'also correct' });
  return { w: w + E, r: r + E, alt };
}

/** the rule that produced the answer, in plain words (shown after every answer) */
function cjWhy(x, form) {
  const vc = verbClass(x), r = String(x.r), w = String(x.w) + (vc === 'vs' ? 'する' : ''), last = r.slice(-1);
  const res = conjugate(x, form); if (!res) return '';
  const ex = `${w} → ${res.w}`;
  const ac = vc ? null : adjClass(x);
  if (ac === 'i') {
    const e = { 'a-neg': 'くない(です)', 'a-plain-neg': 'くない', 'a-past': 'かった(です)', 'a-plain-past': 'かった', 'a-pastneg': 'くなかった(です)', 'a-plain-pastneg': 'くなかった', 'a-te': 'くて', 'a-adv': 'く' }[form];
    return /いい$/.test(r) ? `いい is special: its other forms come from よい, so use よ + ${e}. ${ex}.` : `${w} is an い-adjective: drop the last い and add ${e}. ${ex}.`;
  }
  if (ac === 'na') {
    const e = { 'a-neg': 'じゃないです (or じゃありません)', 'a-plain-neg': 'じゃない', 'a-past': 'でした', 'a-plain-past': 'だった', 'a-pastneg': 'じゃなかったです', 'a-plain-pastneg': 'じゃなかった', 'a-te': 'で', 'a-adv': 'に' }[form];
    return `${w} is a な-adjective: keep it as it is and add ${e}.${/い$/.test(r) ? ` It ends in い, but that い is part of the word, so it doesn’t change.` : ''} ${ex}.`;
  }
  if (vc === 'suru' || vc === 'vs') return form === 'pot' ? `The potential of する is a different verb: できる. ${ex}.` : `する is irregular: learn its forms by heart (します, して, した, しない, しよう, すれば, させる …). ${ex}.`;
  if (vc === 'kuru') return `来る is irregular: the vowel changes, こ in ない/よう/られる/させる/い, き in ます/て/た, く in ば. ${ex}.`;
  if (vc === '1' || vc === 'kureru') {
    const look = { masu: 'drop る, add ます', masen: 'drop る, add ません', mashita: 'drop る, add ました', masendeshita: 'drop る, add ませんでした', mashou: 'drop る, add ましょう', te: 'drop る, add て', ta: 'drop る, add た', nai: 'drop る, add ない', nakatta: 'drop る, add なかった', tai: 'drop る, add たい', nakereba: 'drop る, add なければ', pot: 'drop る, add られる', vol: 'drop る, add よう', tara: 'drop る, add たら', ba: 'る → れば', pass: 'drop る, add られる', caus: 'drop る, add させる', imp: vc === 'kureru' ? 'but its command form is just くれ' : 'る → ろ', causpass: 'drop る, add させられる' }[form];
    return `${w} is a る-verb (ichidan)${vc === 'kureru' && form === 'imp' ? ',' : ':'} ${look}. ${ex}.`;
  }
  const looksRu = /[えけげせてねべめれいきぎしちにびみり]る$/.test(r) && last === 'る';
  const warn = looksRu ? ` Careful: ${w} ends in -${r.slice(-2)} like a る-verb, but it is an う-verb.` : '';
  if (vc === 'aru') return `${w} is an honorific う-verb: it uses い where you'd expect り (${res.w}).`;
  if (vc === 'aru-i') return form === 'nai' || form === 'nakatta' || form === 'nakereba' ? `ある is special: its negative is ない, not あらない. ${ex}.` : `${w} is an う-verb ending in る. ${ex}.`;
  if (form === 'te' || form === 'ta' || form === 'tara') {
    if (vc === 'iku') return `行く is the one exception to the く → いて rule: 行って, 行った. ${ex}.`;
    if (vc === 'u-s') return `${w} is an old-style verb: it keeps う (${res.w}).`;
    const rule = { う: 'う, つ, る → って', つ: 'う, つ, る → って', る: 'う, つ, る → って', む: 'む, ぶ, ぬ → んで', ぶ: 'む, ぶ, ぬ → んで', ぬ: 'む, ぶ, ぬ → んで', く: 'く → いて', ぐ: 'ぐ → いで', す: 'す → して' }[last];
    return `う-verb ending in ${last}: ${rule}${form === 'te' ? '' : form === 'ta' ? ' (same change, with た instead of て)' : ' (the た-form, then add ら)'}. ${ex}.${warn}`;
  }
  const row = { masu: 'i', masen: 'i', mashita: 'i', masendeshita: 'i', mashou: 'i', tai: 'i', nai: 'a', nakatta: 'a', nakereba: 'a', pass: 'a', caus: 'a', causpass: 'a', pot: 'e', ba: 'e', imp: 'e', vol: 'o' }[form];
  const vow = { i: CJ_I, a: CJ_A, e: CJ_E, o: CJ_O }[row];
  const extra = row === 'a' && last === 'う' ? ' (う becomes わ, not あ)' : '';
  const add = res.r.slice(r.length);
  return `${w} is an う-verb: ${last} → ${vow[last]}${extra}${add ? `, then add ${add}` : ''}. ${ex}.${warn}`;
}

