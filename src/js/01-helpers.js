/* =====================================================================
   HELPERS
   ===================================================================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
const isK = c => KANJI_RE.test(c);
const MARK = /\{([^|}]+)\|([^}]+)\}/g;
const plain = s => String(s).replace(MARK, '$1');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const DAY = 864e5;
const LV = ['N5', 'N4', 'N3', 'N2', 'N1'];
const kata2hira = s => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
/** Keep a reading on its kanji only. Kana caught inside a ruby base move out of it:
    {が赤|あか} → が{赤|あか} (the あ was sitting on が), {お茶|おちゃ} → お{茶|ちゃ}, {食べ|たべ} → {食|た}べ. */
const KLIKE = /[\u3400-\u9fff々〆ヵヶ]/;
function fixRuby(b, r) {
  let pre = '', post = '';
  const same = (a, c) => !!a && !!c && kata2hira(a) === kata2hira(c);
  while (b.length > 1 && !KLIKE.test(b[0])) { if (same(r[0], b[0]) && r.length > 1) r = r.slice(1); pre += b[0]; b = b.slice(1); }
  while (b.length > 1 && !KLIKE.test(b[b.length - 1]) && r.length > 1 && same(r[r.length - 1], b[b.length - 1])) { post = b[b.length - 1] + post; b = b.slice(0, -1); r = r.slice(0, -1); }
  return KLIKE.test(b) && r ? [pre, b, r, post] : null;
}
const fixMark = s => String(s).replace(MARK, (all, b, r) => { const f = fixRuby(b, r); return f ? `${f[0]}{${f[1]}|${f[2]}}${f[3]}` : all; });
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtN = n => Number(n).toLocaleString('en');

const store = {
  get(k, d) { try { const v = localStorage.getItem('kd_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kd_' + k, JSON.stringify(v)); } catch (e) {} }
};
let settings = Object.assign({ skin: 'washi', theme: 'system', furigana: 'on', romaji: false, autoSpeak: false, playOnCorrect: true, pics: true, picStyle: '3d', modernQuotes: true, style: 'normal', goalMin: 15, deckVoice: true, cardFront: 'jp', newPerDay: 10, strokeNums: true, pitch: true, writeMode: 'trace', levels: ['N5'], glevels: ['N5'], kanaScript: 'h', kanaGroups: ['basic'] }, store.get('settings', {}));
let progress = store.get('progress', {});
let custom = store.get('custom', []);
let actLog = store.get('log', {});

/** Align a word with its reading → {漢字|かな} markup (client copy of the builder's algorithm). */
function furi(surface, reading) {
  if (!reading || ![...surface].some(isK)) return surface;
  const hr = kata2hira(reading), segs = [];
  for (const ch of surface) { const k = isK(ch); const l = segs[segs.length - 1]; if (l && l.k === k) l.t += ch; else segs.push({ k, t: ch }); }
  const m = new RegExp('^' + segs.map(s => s.k ? '(.+?)' : reEsc(kata2hira(s.t))).join('') + '$').exec(hr);
  if (!m) return `{${surface}|${hr}}`;
  let g = 1; return segs.map(s => s.k ? `{${s.t}|${m[g++]}}` : s.t).join('');
}
function ruby(s, force) {
  const h = esc(fixMark(s));
  if (settings.furigana === 'off' && !force) return h.replace(MARK, '$1');
  // kanji read one by one next to each other (周|しゅう 辺|へん) share one reading, so a long reading doesn't push the kanji apart
  return h.replace(/(?:\{[^|}]+\|[^}]+\}){2,}/g, m => { const ps = [...m.matchAll(MARK)]; return ps.every(p => [...p[1]].every(isK)) ? `{${ps.map(p => p[1]).join('')}|${ps.map(p => p[2]).join('')}}` : m; })
    .replace(MARK, '<ruby>$1<rt>$2</rt></ruby>');
}

const ROMA = {あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',ゐ:'i',ゑ:'e',を:'o',ん:'n',が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',ゔ:'vu',ゎ:'wa'};
const YOON = {ゃ:'ya',ゅ:'yu',ょ:'yo'};
const SMALLV = {ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o'};
function toRomaji(s) {
  s = String(s).replace(/[.\-]/g, '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { const nx = toRomaji(s.slice(i + 1, i + 2)); out += nx && /[a-z]/.test(nx[0]) ? (nx.startsWith('ch') ? 't' : nx[0]) : ''; continue; }
    if (c === 'ー') { const v = out.match(/[aeiou]$/); out += v ? v[0] : ''; continue; }
    let r = ROMA[c];
    if (r === undefined) { out += c === '、' ? ', ' : c; continue; }
    if (n && YOON[n] && r.length > 1 && r.endsWith('i')) {
      const y = YOON[n];
      if (r === 'shi') r = 'sh' + y[1]; else if (r === 'chi') r = 'ch' + y[1]; else if (r === 'ji') r = 'j' + y[1]; else r = r.slice(0, -1) + y;
      i++;
    } else if (n && SMALLV[n] && r.length > 1 && !'ぁぃぅぇぉ'.includes(c)) { r = (r === 'fu' ? 'f' : r === 'tsu' ? 'ts' : r.slice(0, -1)) + SMALLV[n]; i++; }
    out += r;
  }
  return out;
}
/* Device voices often read a hiragana word starting with は / へ / を as a particle
   (はし → "washi"). Single words are therefore spoken in katakana (ハシ → "hashi");
   full sentences stay as written, where the voice reads particles correctly. */
const hira2kata = s => String(s).replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const wordSay = r => hira2kata(String(r || '').replace(/[.\-]/g, ''));
const grammarSay = v => ({ は: 'わ', へ: 'え', を: 'お' })[v] || String(v || '').replace(/([てでにと])は/g, '$1わ');
/* Audio = native recordings only (Tofugu / WaniKani, Kanji alive, Tatoeba).
   No synthetic device voice: where there is no recording, no play button is shown. */
let curAudio = null;
const hasRec = id => !!id && (String(id).startsWith('a:') || DATA.mode === 'full');
function playAudio(id, again) {
  if (!hasRec(id)) return;                       // nothing to play: let the current recording finish
  // the same recording asked for twice in a row (autoplay + tap): don't restart it halfway through
  if (!again && curAudio && curAudio.dataset.id === id && !curAudio.ended && !curAudio.paused && curAudio.currentTime < 0.6) return;
  if (!again && ANKI.pending === id) return;
  if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
  if (String(id).startsWith('a:')) {   // a recording from the learner's own Anki deck
    ANKI.pending = id;
    ankiMediaUrl(id).then(url => {
      if (ANKI.pending !== id) return; ANKI.pending = null;
      if (!url) { toast('Recording unavailable'); return; }
      const a = new Audio(url); a.dataset.id = id; curAudio = a; a.playbackRate = +settings.audioRate || 1; const pr = a.play(); if (pr && pr.catch) pr.catch(() => {});
    });
    return;
  }
  ANKI.pending = null;
  try {
    const a = new Audio(id[0] === 's' ? `data/saudio/${id.slice(1)}.mp3` : `data/audio/${id}.mp3`); a.dataset.id = id; a.preload = 'auto'; curAudio = a; a.playbackRate = +settings.audioRate || 1;
    a.onerror = () => toast('Recording unavailable');
    const pr = a.play(); if (pr && pr.catch) pr.catch(e => { if (e && e.name === 'NotSupportedError') toast('Recording unavailable'); });
  } catch (e) {}
}
const playWord = x => x && playAudio(x.au);
const sayBtn = (id, cls = 'say inl') => hasRec(id) ? `<button class="${cls}" data-audio="${esc(id)}" aria-label="Play recording" title="Native recording">🔊</button>` : '';
const FREQ_LABEL = ['', 'Rare', 'Uncommon', 'Common', 'Very common', 'Essential'];
function freqBadge(n, compact) {
  n = Math.max(1, Math.min(5, n | 0));
  let b = ''; for (let i = 1; i <= 5; i++) b += `<i class="${i <= n ? 'on' : ''}"></i>`;
  return `<span class="freq f${n}" title="Frequency: ${FREQ_LABEL[n]}"><span class="bars">${b}</span>${compact ? '' : `<span>${FREQ_LABEL[n]}</span>`}</span>`;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }

