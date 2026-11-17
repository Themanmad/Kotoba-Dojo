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
/* line icons used by the navigation and hubs (defined early: the theme button needs them at start-up) */
const ICON = {"home":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3.5 11.2 12 4l8.5 7.2\"/><path d=\"M5.5 10v9.5h13V10\"/><path d=\"M10 19.5v-5h4v5\"/></svg>","learn":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 6.2C9.8 4.8 7 4.4 4 4.8v13c3-.4 5.8 0 8 1.4 2.2-1.4 5-1.8 8-1.4v-13c-3-.4-5.8 0-8 1.4z\"/><path d=\"M12 6.2v13\"/></svg>","practice":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"4.5\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"currentColor\"/></svg>","library":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"4\" width=\"4.2\" height=\"16\" rx=\"1\"/><rect x=\"10\" y=\"4\" width=\"4.2\" height=\"16\" rx=\"1\"/><path d=\"m16.8 6.5 3.4 13\"/></svg>","explore":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8.7\"/><path d=\"m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z\"/></svg>","search":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"11\" cy=\"11\" r=\"6.3\"/><path d=\"m15.8 15.8 4.4 4.4\"/></svg>","settings":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 7.5h9M18.5 7.500H20M4 16.5h1.500M11 16.5h9\"/><circle cx=\"15.7\" cy=\"7.5\" r=\"2.3\"/><circle cx=\"8.3\" cy=\"16.5\" r=\"2.3\"/></svg>","sun":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4\"/></svg>","moon":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z\"/></svg>","user":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8.5\" r=\"3.5\"/><path d=\"M5 20c.8-3.6 3.5-5.5 7-5.5s6.200 1.900 7 5.500\"/></svg>","cards":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"4\" y=\"7\" width=\"13\" height=\"12\" rx=\"2\"/><path d=\"M8 4h10a2 2 0 0 1 2 2v10\"/></svg>","pen":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m4 20 1-4L16.500 4.500a2.100 2.100 0 0 1 3 3L8 19z\"/><path d=\"m14.500 6.500 3 3\"/></svg>","ear":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 9a5 5 0 0 1 10 0c0 3-3 3.500-3 6.500a3 3 0 0 1-5.500 1.500\"/><path d=\"M9.500 9.500a2.500 2.500 0 0 1 5 0\"/></svg>","mic":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"9\" y=\"3.500\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v2.500\"/></svg>","exam":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"5\" y=\"3.500\" width=\"14\" height=\"17\" rx=\"2\"/><path d=\"m8.500 9 1.500 1.500L13 7.500M8.500 15.500h7M15 9.500h.5\"/></svg>","route":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"6\" cy=\"18\" r=\"2.200\"/><circle cx=\"18\" cy=\"6\" r=\"2.200\"/><path d=\"M8.200 18H14a3.500 3.500 0 0 0 0-7h-4a3.500 3.500 0 0 1 0-7h5.800\"/></svg>","book":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 4h11a1 1 0 0 1 1 1v15H7.500A1.500 1.500 0 0 1 6 18.500z\"/><path d=\"M6 18.500A1.500 1.500 0 0 1 7.500 17H18M9.500 8h5\"/></svg>","plane":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m3.500 12.500 17-8-6 16-3-6.500z\"/><path d=\"m11.500 14 3-3.500\"/></svg>","chat":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4.500 5.500h15v10.500h-8l-4.500 3.500v-3.500h-2.500z\"/></svg>","town":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20V9l5-4 5 4v11M14 20v-8h6v8M3 20h18M8 20v-4h2v4\"/></svg>","shuffle":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 7h3.500c5 0 4 10 9 10H20M4 17h3.500c1.500 0 2.400-.9 3.100-2.200M20 7h-3.500c-1.500 0-2.400.9-3.100 2.200M17.500 4.500 20 7l-2.500 2.500M17.500 14.500 20 17l-2.500 2.500\"/></svg>","forms":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 6h6M8 6v12M13.500 18l3.250-9 3.250 9M14.700 15h4.100\"/></svg>","check":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m5 12.500 4.500 4.500L19 7.500\"/></svg>","flame":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3.500c.5 3.500 5 5.500 5 10.500a5 5 0 0 1-10 0c0-2 1-3.500 2-4.500.300 1.500 1 2.500 2 3 0-3 0-6 1-9z\"/></svg>","clock":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"8.500\"/><path d=\"M12 7.500V12l3 2\"/></svg>","deck":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 8.500 12 5l7 3.500-7 3.500z\"/><path d=\"m5 12 7 3.500 7-3.500M5 15.500 12 19l7-3.500\"/></svg>"};
let settings = Object.assign({ skin: 'dojo', theme: 'system', furigana: 'on', romaji: false, autoSpeak: false, playOnCorrect: true, pics: true, modernQuotes: true, style: 'normal', goalMin: 15, deckVoice: true, cardFront: 'jp', newPerDay: 10, textSize: 'm', vibrate: true, calm: false, strokeNums: true, pitch: true, writeMode: 'trace', levels: ['N5'], glevels: ['N5'], kanaScript: 'h', kanaGroups: ['basic'] }, store.get('settings', {}));
/* the Dojo design became the default: move people off the old default once (Station stays available in Settings) */
if (!settings.skinV) { if (settings.skin === 'washi') settings.skin = 'dojo'; settings.skinV = 2; store.set('settings', settings); }
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
/* ---------- typing romaji and getting kana (typed answers, conjugation drill, chat) ---------- */
const ROMA_K = (() => {
  const t = {}, add = (r, k) => { t[r] = k; };
  const base = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
  Object.entries(base).forEach(([r, k]) => add(r, k));
  const rows = { k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', y: 'や_ゆ_よ', r: 'らりるれろ', w: 'わ__を', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
  Object.entries(rows).forEach(([c, ks]) => 'aiueo'.split('').forEach((v, i) => { if (ks[i] !== '_') add(c + v, ks[i]); }));
  Object.assign(t, { shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', wo: 'を', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ', xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', ltu: 'っ', xtu: 'っ', lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', ti: 'てぃ', di: 'でぃ', tu: 'つ', si: 'し', zi: 'じ', 'n\'': 'ん', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ', sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ', va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ', '-': 'ー', '.': '。', ',': '、', '?': '？', '!': '！', '~': '〜' });
  ['k', 'g', 'n', 'h', 'b', 'p', 'm', 'r'].forEach(c => { const i = rows[c][1]; add(c + 'ya', i + 'ゃ'); add(c + 'yu', i + 'ゅ'); add(c + 'yo', i + 'ょ'); });
  Object.assign(t, { sya: 'しゃ', syu: 'しゅ', syo: 'しょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ' });
  return t;
})();
function romaToKana(s, final) {
  let out = '', i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (!/[A-Za-z\-.,?!~']/.test(ch)) { out += ch; i++; continue; }
    const up = /[A-Z]/.test(ch), low = s.slice(i).toLowerCase();
    // double consonant → っ
    if (/^([bcdfghjklmpqrstvwxyz])\1/.test(low) && low[0] !== 'n') { out += up ? 'ッ' : 'っ'; i++; continue; }
    let hit = null;
    if (low[0] === 'n' && !/^n[aiueoy']/.test(low)) {   // ん: "nn" before a consonant or at the end, a lone n before a consonant ("konnichiha", "kouenni", "shinbun")
      if (low === 'nn' && !final) { out += s.slice(i); break; }   // wait for the next key: nn+i is んに, nn+k is んk
      if (low[1] === 'n' && !/^nn[aiueoy]/.test(low)) hit = ['nn', 'ん'];
      else if (low.length > 1) hit = ['n', 'ん'];
      else if (final) hit = ['n', 'ん'];
    }
    if (!hit) for (const n of [4, 3, 2, 1]) { const k = low.slice(0, n); if (ROMA_K[k]) { hit = [k, ROMA_K[k]]; break; } }
    if (!hit) { out += s.slice(i); break; }   // an unfinished syllable: leave it for the next key
    out += up && /[ぁ-ゖ]/.test(hit[1]) ? hit[1].replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)) : hit[1];
    i += hit[0].length;
  }
  return out;
}
