/* =====================================================================
   PITCH ACCENT: Tokyo pitch for each word, from Kanjium (CC BY-SA 4.0,
   pitch accent notation by Uros O.). Drawn as a line over the reading:
   high sounds have the line on top, low ones underneath, and the line steps
   where the pitch rises or falls. Shown only when the data has an exact match.
   ===================================================================== */
const PA_SMALL = 'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ';
/** a reading split into morae: small kana join the sound before; っ and ー are morae of their own */
function morae(r) { const out = []; for (const c of String(r)) { if (PA_SMALL.includes(c) && out.length) out[out.length - 1] += c; else out.push(c); } return out; }
/** is mora i (0-based) high for accent n? */
const paHigh = (n, i) => n === 0 ? i > 0 : n === 1 ? i === 0 : i > 0 && i < n;
function paName(n, len) {
  if (n === 0) return ['平板', 'Flat', 'starts low, rises, and stays high, even on a particle after it'];
  if (n === 1) return ['頭高', 'Head-high', 'high on the first sound, then low'];
  if (n === len) return ['尾高', 'Tail-high', 'rises and stays high to the end, then a particle after it drops'];
  return ['中高', 'Middle-high', `rises, then drops after the ${['', '1st', '2nd', '3rd'][n] || n + 'th'} sound`];
}
/** x.pa: [n, …] or [[n, part of speech], …] */
const paList = pa => (pa || []).map(a => Array.isArray(a) ? { n: a[0], q: a[1] || '' } : { n: a, q: '' });
function pitchLine(r, n, particle) {
  const ms = morae(r); if (!ms.length || n > ms.length) return '';
  const hs = ms.map((_, i) => paHigh(n, i));
  if (particle) { ms.push('が'); hs.push(n === 0); }   // what happens on the particle tells 平板 and 尾高 apart
  return `<span class="pa-line" aria-hidden="true">${ms.map((m, i) => `<span class="pa-m ${hs[i] ? 'h' : 'l'}${i && hs[i] !== hs[i - 1] ? ' step' : ''}${particle && i === ms.length - 1 ? ' pa-p' : ''}">${esc(m)}</span>`).join('')}</span>`;
}
function pitchHtml(x) {
  if (!settings.pitch) return '';
  const list = paList(x.pa); if (!list.length) return '';
  const len = morae(x.r).length, particle = x.pos === 'noun';
  const rows = list.filter(a => a.n <= len).map((a, i) => {
    const [jp, en, how] = paName(a.n, len);
    return `<div class="pa-row">${pitchLine(x.r, a.n, particle)}<span class="pa-name"><b>${a.q ? esc(a.q) + ': ' : i ? 'Also: ' : ''}${en}</b> <span class="jp">${jp}</span> · ${how}</span></div>`;
  });
  if (!rows.length) return '';
  return `<div class="pa" role="group" aria-label="Pitch accent">${rows.join('')}<div class="pa-src">Tokyo pitch accent · Kanjium (CC BY-SA 4.0)</div></div>`;
}
