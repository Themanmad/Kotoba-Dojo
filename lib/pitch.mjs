/* Pitch accent from Kanjium's accents.txt (CC BY-SA 4.0, pitch data by Uros O.).
   Each line: word <tab> reading (empty when the word is written in kana) <tab> accents,
   e.g. "箸	はし	1", "寿司	すし	2,1", "２つ	ふたつ	(副)0,(名)3".
   An accent number is the mora after which the pitch drops: 0 = never drops (heiban), 1 = after the first mora, …
   Words are matched only on their exact spelling and reading: no guessing between homophones (雨 あめ 1, 飴 あめ 0). */
const kata2hira = s => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const POS = { '名': 'noun', '副': 'adverb', '形動': 'な-adjective', '代': 'pronoun', '感': 'interjection' };
/** number of morae in a kana reading (small ゃゅょぁぃぅぇぉゎ join the mora before; っ and ー count) */
export function moraCount(r) { return (kata2hira(r).match(/[^ゃゅょぁぃぅぇぉゎ]/g) || []).length; }
/** "0,2" → [{n:0},{n:2}]; "(副)0,(名)3" → [{n:0,q:'adverb'},{n:3,q:'noun'}]; null if anything is unreadable */
export function parseAccentField(f) {
  const out = []; let q = null;
  for (const part of String(f).split(',')) {
    const m = /^(?:\(([^)]+)\))?(\d+)$/.exec(part.trim()); if (!m) return null;
    if (m[1]) { const ls = m[1].split(';').map(x => POS[x]); if (ls.some(x => !x)) return null; q = ls.join(' / '); }
    out.push(q ? { n: +m[2], q } : { n: +m[2] });
  }
  return out.length ? out : null;
}
export function parseAccents(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const [w, r0, f] = line.replace(/\r$/, '').split('\t'); if (!w || f == null) continue;
    const r = kata2hira(r0 || w), acc = parseAccentField(f); if (!acc) continue;
    const mc = moraCount(r); if (!mc || acc.some(a => a.n > mc)) continue;   // a drop after the last mora at most
    const key = w + '|' + r; if (!map.has(key)) map.set(key, acc);
  }
  return map;
}
/** compact form stored in the data: [n, …] or, with parts of speech, [[n, label], …] */
export function pitchFor(map, w, r, alt) {
  const rr = kata2hira(r);
  const acc = map.get(w + '|' + rr) || (alt && map.get(alt + '|' + rr));
  if (!acc) return null;
  return acc.some(a => a.q) ? acc.map(a => [a.n, a.q || '']) : [...new Set(acc.map(a => a.n))];
}
