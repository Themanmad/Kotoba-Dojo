#!/usr/bin/env node
/*
 * Kotoba Dojo data builder
 * ------------------------
 * Downloads open Japanese datasets and turns them into small, level-split JSON
 * files the app loads on demand:
 *
 *   data/meta.json             build info, counts, sources, licences
 *   data/vocab-n5.json … n1    JLPT vocabulary matched to JMdict entries
 *   data/kanji-n5.json … n1    KANJIDIC2 readings/meanings + JLPT level + frequency
 *   data/strokes-n5.json … n1  KanjiVG stroke paths for each kanji
 *
 * Sources
 *   JMdict / KANJIDIC2  (EDRDG, CC BY-SA 4.0)  via scriptin/jmdict-simplified releases
 *   JMdict_e.gz         (EDRDG)                 frequency/priority tags (optional)
 *   KanjiVG             (CC BY-SA 3.0)          KanjiVG/kanjivg releases
 *   JLPT vocab lists    (Jonathan Waller, CC BY) stephenmk/yomitan-jlpt-vocab, fallback jamsinclair/open-anki-jlpt-decks
 *   Kanji JLPT levels   (MIT)                   davidluzgouveia/kanji-data
 *   Tatoeba sentences   (CC BY 2.0 FR)          linked JMdict examples + Tatoeba exports (optional)
 *   JLPT grammar        (hanabira.org, CC; link back required) hanabira.org-japanese-content grammar JSON (optional)
 *
 * Usage
 *   node build-data.mjs [--out data] [--cache .cache] [--from-dir DIR]
 *                       [--no-tatoeba] [--no-freq] [--max-examples 2]
 *
 *   --from-dir  use already-downloaded files from DIR instead of the network
 *               (file names are matched by pattern; see SOURCES below)
 *
 * Optional: `npm install kuromoji` first to add furigana to example sentences
 * and to find Tatoeba sentences by dictionary form (much better matches).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

/* ---------------------------------------------------------------- args */
const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = path.resolve(opt('out', 'data'));
const CACHE = path.resolve(opt('cache', '.cache'));
const FROM = opt('from-dir', null) ? path.resolve(opt('from-dir')) : null;
const MAX_EX = Math.max(0, +opt('max-examples', 2));
const USE_TATOEBA = !flag('no-tatoeba');
const USE_FREQ = !flag('no-freq');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`, ...a);
const warn = (...a) => console.warn('  ⚠', ...a);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

/* ---------------------------------------------------------------- sources */
const SOURCES = {
  jmdictExamples: { gh: { repo: 'scriptin/jmdict-simplified', pattern: /^jmdict-examples-eng-.*\.json\.(zip|tgz)$/ }, local: /^jmdict-examples-eng.*\.(json|zip|tgz)$/i },
  jmdict:         { gh: { repo: 'scriptin/jmdict-simplified', pattern: /^jmdict-eng-\d.*\.json\.(zip|tgz)$/ }, local: /^jmdict-eng-\d.*\.(json|zip|tgz)$/i },
  kanjidic:       { gh: { repo: 'scriptin/jmdict-simplified', pattern: /^kanjidic2-en-.*\.json\.(zip|tgz)$/ }, local: /^kanjidic2-en.*\.(json|zip|tgz)$/i },
  jmdictXml:      { urls: ['http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz', 'https://www.edrdg.org/pub/Nihongo/JMdict_e.gz'], local: /^JMdict_e(\.xml)?(\.gz)?$/i },
  kanjivg:        { gh: { repo: 'KanjiVG/kanjivg', pattern: /^kanjivg-\d+-main\.zip$/ }, gh2: { repo: 'KanjiVG/kanjivg', pattern: /^kanjivg-\d+-all\.zip$/ }, local: /^kanjivg.*\.zip$/i },
  kanjiLevels:    { urls: ['https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json'], local: /^kanji(-data)?\.json$/i },
  jlpt: lv => ({
    urls: [
      `https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n${lv}.csv`,
      `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n${lv}.csv`
    ],
    local: new RegExp(`^(jlpt-)?(vocab-)?n${lv}\\.csv$`, 'i')
  }),
  tatoeba: {
    jpn:   { urls: ['https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2'], local: /^jpn_sentences\.tsv(\.bz2)?$/i },
    eng:   { urls: ['https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2'], local: /^eng_sentences\.tsv(\.bz2)?$/i },
    links: { urls: ['https://downloads.tatoeba.org/exports/per_language/jpn/jpn-eng_links.tsv.bz2'], local: /^jpn-eng_links\.tsv(\.bz2)?$/i }
  }
};

/* ---------------------------------------------------------------- download helpers */
const ghHeaders = () => {
  const h = { 'User-Agent': 'kotoba-dojo-data-builder', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
};
const releaseCache = {};
async function findAsset(repo, pattern) {
  if (!releaseCache[repo]) {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, { headers: ghHeaders() });
    if (!r.ok) throw new Error(`GitHub API ${r.status} for ${repo}`);
    releaseCache[repo] = (await r.json()).filter(x => !x.draft);
  }
  for (const rel of releaseCache[repo]) {
    const a = (rel.assets || []).find(a => pattern.test(a.name));
    if (a) return { url: a.browser_download_url, name: a.name, release: rel.tag_name };
  }
  return null;
}
async function download(url, name) {
  const dest = path.join(CACHE, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { log(`  cached ${name}`); return dest; }
  log(`  downloading ${url}`);
  const r = await fetch(url, { headers: { 'User-Agent': 'kotoba-dojo-data-builder' }, redirect: 'follow' });
  if (!r.ok || !r.body) throw new Error(`HTTP ${r.status} for ${url}`);
  const tmp = dest + '.part';
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(tmp));
  fs.renameSync(tmp, dest);
  return dest;
}
/** Returns { file, label } or null (if optional). */
async function getSource(key, src, { required = true } = {}) {
  if (FROM) {
    const f = fs.readdirSync(FROM).find(n => src.local.test(n));
    if (f) { log(`  using local ${f}`); return { file: path.join(FROM, f), label: f }; }
    if (required) throw new Error(`--from-dir: no file for ${key} (pattern ${src.local})`);
    warn(`no local file for ${key}, skipping`); return null;
  }
  for (const g of [src.gh, src.gh2].filter(Boolean)) {
    try {
      const a = await findAsset(g.repo, g.pattern);
      if (a) return { file: await download(a.url, a.name), label: `${g.repo} ${a.name}` };
    } catch (e) { warn(`${key}: ${e.message}`); }
  }
  for (const u of src.urls || []) {
    try {
      const host = new URL(u).pathname.split('/').filter(Boolean).slice(0, 2).join('-');
      return { file: await download(u, `${key}--${host}--${path.basename(new URL(u).pathname)}`), label: u };
    } catch (e) { warn(`${key}: ${e.message}`); }
  }
  if (required) throw new Error(`Could not obtain ${key}`);
  warn(`${key} unavailable, continuing without it`);
  return null;
}

/* ---------------------------------------------------------------- grammar files (hanabira) */
const GRAMMAR_REPO = 'tristcoil/hanabira.org-japanese-content';
const GRAMMAR_FILE = /(^|\/)grammar_ja_N([1-5])[^/]*\.json$/i;
async function getGrammarFiles() {
  if (flag('no-grammar')) return [];
  const out = [];
  if (FROM) {
    for (const n of fs.readdirSync(FROM)) { const m = GRAMMAR_FILE.exec(n); if (m) out.push({ level: 'N' + m[2], file: path.join(FROM, n) }); }
    if (!out.length) warn('no local grammar_ja_N*.json files, skipping grammar');
    return out;
  }
  let paths = [], branch = 'main';
  try {
    const r = await fetch(`https://api.github.com/repos/${GRAMMAR_REPO}`, { headers: ghHeaders() });
    if (r.ok) branch = (await r.json()).default_branch || 'main';
    const t = await fetch(`https://api.github.com/repos/${GRAMMAR_REPO}/git/trees/${branch}?recursive=1`, { headers: ghHeaders() });
    if (!t.ok) throw new Error('GitHub API ' + t.status);
    paths = (await t.json()).tree.filter(x => x.type === 'blob' && GRAMMAR_FILE.test(x.path)).map(x => x.path);
  } catch (e) { warn('grammar: ' + e.message); }
  if (!paths.length) paths = [5, 4, 3, 2, 1].map(n => `grammar_json/grammar_ja_N${n}_full_alphabetical_0001.json`);
  for (const p of paths) {
    try {
      const file = await download(`https://raw.githubusercontent.com/${GRAMMAR_REPO}/${branch}/${p.split('/').map(encodeURIComponent).join('/')}`, 'grammar--' + p.replace(/[\/]/g, '_'));
      out.push({ level: 'N' + GRAMMAR_FILE.exec(p)[2], file });
    } catch (e) { warn(`grammar ${p}: ${e.message}`); }
  }
  return out;
}

/* ---------------------------------------------------------------- file helpers */
function extractDir(file) {
  const dir = path.join(CACHE, 'x-' + path.basename(file).replace(/[^\w.-]/g, '_'));
  if (fs.existsSync(path.join(dir, '.done'))) return dir;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  if (/\.zip$/i.test(file)) execFileSync('unzip', ['-q', '-o', file, '-d', dir]);
  else if (/\.(tgz|tar\.gz)$/i.test(file)) execFileSync('tar', ['-xzf', file, '-C', dir]);
  else throw new Error('Unknown archive ' + file);
  fs.writeFileSync(path.join(dir, '.done'), '');
  return dir;
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function readJsonSource(file) {
  let f = file;
  if (/\.(zip|tgz|tar\.gz)$/i.test(file)) {
    f = walk(extractDir(file)).filter(p => /\.json$/i.test(p)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    if (!f) throw new Error('No JSON inside ' + file);
  }
  log(`  parsing ${path.basename(f)} (${(fs.statSync(f).size / 1e6).toFixed(1)} MB)`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
function plainTextFile(file) {
  if (/\.bz2$/i.test(file)) {
    const out = path.join(CACHE, path.basename(file).replace(/\.bz2$/i, ''));
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(file).mtimeMs) {
      execFileSync('sh', ['-c', `bunzip2 -kc "$1" > "$2"`, 'sh', file, out]);
    }
    return out;
  }
  return file;
}
async function eachLine(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) if (line) fn(line);
}
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const write = (name, obj) => { fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj)); return fs.statSync(path.join(OUT, name)).size; };

/* ---------------------------------------------------------------- text helpers */
const KANJI_RE = /[㐀-䶿一-鿿豈-﫿々〆ヶ]/;
const isKanji = c => KANJI_RE.test(c);
const hasKanji = s => [...(s || '')].some(isKanji);
const kata2hira = s => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safe = s => String(s).replace(/[{]/g, '｛').replace(/[}]/g, '｝').replace(/[|]/g, '｜');
/** Align a word with its kana reading and emit {漢字|かな} furigana markup. */
function furigana(surface, reading) {
  surface = safe(surface);
  if (!reading || !hasKanji(surface)) return surface;
  const hr = kata2hira(reading);
  const segs = [];
  for (const ch of surface) { const k = isKanji(ch); const l = segs[segs.length - 1]; if (l && l.k === k) l.t += ch; else segs.push({ k, t: ch }); }
  const m = new RegExp('^' + segs.map(s => s.k ? '(.+?)' : reEsc(kata2hira(s.t))).join('') + '$').exec(hr);
  if (!m) return `{${surface}|${hr}}`;
  let g = 1;
  return segs.map(s => s.k ? `{${s.t}|${m[g++]}}` : s.t).join('');
}
const cleanForm = s => String(s || '')
  .replace(/[（(][^）)]*[）)]/g, '')      // drop (notes)
  .split(/[;；,、・／/]|\s+or\s+/)[0]    // first alternative
  .replace(/[〜~～]/g, '')
  .trim();

/* ---------------------------------------------------------------- optional kuromoji */
let tokenizer = null;
async function loadTokenizer() {
  if (flag('no-kuromoji')) return null;
  try {
    const require = createRequire(path.join(process.cwd(), 'noop.js'));
    const kuromoji = require('kuromoji');
    let dir = path.dirname(require.resolve('kuromoji'));
    while (dir !== path.dirname(dir) && !fs.existsSync(path.join(dir, 'dict'))) dir = path.dirname(dir);
    const dicPath = path.join(dir, 'dict');
    return await new Promise((res, rej) => kuromoji.builder({ dicPath }).build((e, t) => e ? rej(e) : res(t)));
  } catch (e) {
    warn('kuromoji not available — example sentences will have no furigana (run `npm install kuromoji` to enable)');
    return null;
  }
}
function sentenceFurigana(text) {
  if (!tokenizer) return safe(text);
  try {
    return tokenizer.tokenize(text).map(t => {
      const s = t.surface_form;
      return hasKanji(s) && t.reading && t.reading !== '*' ? furigana(s, t.reading) : safe(s);
    }).join('');
  } catch { return safe(text); }
}

/* ---------------------------------------------------------------- POS */
const POS_GROUP = tag => {
  if (/^v(1|5|k|s-i|s-s|z|r|n|4|2)/.test(tag) || tag === 'vi' || tag === 'vt' || tag === 'aux-v') return 'verb';
  if (tag === 'vs') return 'noun';
  if (/^adj-(i|ix)$/.test(tag)) return 'i-adj';
  if (tag === 'adj-na') return 'na-adj';
  if (/^n/.test(tag) && tag !== 'num') return 'noun';
  if (/^adv/.test(tag)) return 'adverb';
  if (tag === 'exp' || tag === 'int') return 'expression';
  if (tag === 'pn') return 'pronoun';
  if (tag === 'prt') return 'particle';
  if (tag === 'ctr' || tag === 'num') return 'counter';
  if (/^(conj|aux|pref|suf|adj-)/.test(tag)) return 'other';
  return 'other';
};

/* ================================================================ BUILD */
async function main() {
  const meta = { built: new Date().toISOString(), sources: {}, counts: { vocab: {}, kanji: {} }, notes: [] };
  tokenizer = await loadTokenizer();
  meta.sources.furigana = tokenizer ? 'kuromoji (IPADIC)' : null;
  if (!tokenizer) meta.notes.push('kuromoji was not installed, so example sentences use the app\'s built-in furigana fallback.');

  /* ---- 1. JLPT vocabulary lists */
  log('JLPT vocabulary lists');
  const jlptRows = [];
  meta.sources.jlpt = {};
  for (const lv of [5, 4, 3, 2, 1]) {
    const s = await getSource(`jlpt-n${lv}`, SOURCES.jlpt(lv), { required: false });
    if (!s) continue;
    const rows = parseCSV(fs.readFileSync(s.file, 'utf8').replace(/^﻿/, ''));
    const head = rows[0].map(h => h.trim().toLowerCase());
    const col = (...names) => head.findIndex(h => names.includes(h));
    const ci = { seq: col('jmdict_seq', 'seq', 'jmdict_id', 'ent_seq'), kanji: col('kanji', 'expression', 'word', 'vocab'),
      kana: col('kana', 'reading', 'hiragana'), meaning: col('waller_definition', 'meaning', 'english', 'definition', 'glossary') };
    if (ci.kana < 0 && ci.kanji < 0) { warn(`n${lv}: unrecognised header ${head.join(',')}`); continue; }
    let n = 0;
    for (const r of rows.slice(1)) {
      const kanji = ci.kanji >= 0 ? cleanForm(r[ci.kanji]) : '';
      const kana = ci.kana >= 0 ? cleanForm(r[ci.kana]) : '';
      if (!kanji && !kana) continue;
      jlptRows.push({ level: 'N' + lv, seq: ci.seq >= 0 ? String(r[ci.seq]).trim() : '', kanji, kana: kana || kanji, meaning: ci.meaning >= 0 ? r[ci.meaning] : '' });
      n++;
    }
    meta.sources.jlpt['N' + lv] = s.label;
    log(`  N${lv}: ${n} rows`);
  }
  if (!jlptRows.length) throw new Error('No JLPT lists could be loaded');

  /* ---- 2. JMdict (with linked Tatoeba examples when available) */
  log('JMdict');
  let jm = await getSource('jmdict-examples', SOURCES.jmdictExamples, { required: false });
  let jmHasExamples = !!jm;
  if (!jm) jm = await getSource('jmdict', SOURCES.jmdict);
  const J = readJsonSource(jm.file);
  meta.sources.jmdict = { file: jm.label, dictDate: J.dictDate || null, version: J.version || null, examples: jmHasExamples };
  const tagNames = J.tags || {};
  const bySeq = new Map(), byText = new Map(), byHira = new Map();
  const push = (m, k, w) => { if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(w)) m.get(k).push(w); };
  for (const w of J.words) {
    bySeq.set(String(w.id), w);
    for (const f of w.kanji || []) push(byText, f.text, w);
    for (const f of w.kana || []) { push(byText, f.text, w); push(byHira, kata2hira(f.text), w); }
  }
  log(`  ${J.words.length} entries`);

  /* ---- 3. match JLPT rows to JMdict */
  log('Matching JLPT words to JMdict');
  const isCommon = w => (w.kanji || []).some(k => k.common) || (w.kana || []).some(k => k.common);
  const usuallyKana = w => (w.sense || []).length && w.sense.every(s => (s.misc || []).includes('uk'));
  function matchRow(row) {
    if (row.seq && bySeq.has(row.seq)) return bySeq.get(row.seq);
    const r = row.kana, k = row.kanji && row.kanji !== row.kana && hasKanji(row.kanji) ? row.kanji : null;
    const rh = kata2hira(r);
    const readsAs = w => (w.kana || []).some(x => x.text === r || kata2hira(x.text) === rh);
    let c;
    if (k) {
      c = (byText.get(k) || []).filter(w => (w.kanji || []).some(x => x.text === k));
      const both = c.filter(readsAs); if (both.length) c = both;
    } else {
      c = (byText.get(r) || []).filter(w => (w.kana || []).some(x => x.text === r));
      if (!c.length) c = (byHira.get(rh) || []).filter(readsAs);
      const kanaish = c.filter(w => !(w.kanji || []).length || usuallyKana(w)); if (kanaish.length) c = kanaish;
    }
    if (!c.length) return null;
    return c.slice().sort((a, b) => (isCommon(b) - isCommon(a)) || (+a.id - +b.id))[0];
  }
  const picked = new Map(); // seq -> {w,row}
  const unmatched = [];
  for (const row of jlptRows) {
    const w = matchRow(row);
    if (!w) { unmatched.push(row); continue; }
    if (!picked.has(String(w.id))) picked.set(String(w.id), { w, row });
  }
  log(`  matched ${picked.size}, unmatched ${unmatched.length}`);
  if (unmatched.length) meta.notes.push(`${unmatched.length} JLPT list rows had no JMdict match and use the list's own gloss.`);

  /* ---- 4. frequency from JMdict priority tags */
  const pri = new Map();
  if (USE_FREQ) {
    log('JMdict priority tags (frequency)');
    const s = await getSource('jmdict-xml', SOURCES.jmdictXml, { required: false });
    if (s) {
      let buf = fs.readFileSync(s.file);
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
      const xml = buf.toString('utf8'); buf = null;
      const re = /<entry>([\s\S]*?)<\/entry>/g; let m;
      while ((m = re.exec(xml))) {
        const seq = (/<ent_seq>(\d+)<\/ent_seq>/.exec(m[1]) || [])[1];
        if (!seq || !picked.has(seq)) continue;
        pri.set(seq, [...m[1].matchAll(/<(?:ke|re)_pri>([^<]+)<\/(?:ke|re)_pri>/g)].map(x => x[1]));
      }
      meta.sources.frequency = 'JMdict priority tags (newspaper frequency bands nf01–nf48, ichi, news, spec)';
      log(`  priority data for ${pri.size} words`);
    }
  }
  if (!pri.size) meta.sources.frequency = 'estimated from JMdict "common" flag and JLPT level';
  const LV_BONUS = { N5: 1, N4: 1, N3: 0, N2: 0, N1: -1 };
  function tier(seq, w, level) {
    const p = pri.get(seq);
    if (p) {
      let nf = 99; for (const t of p) { const x = /^nf(\d\d)$/.exec(t); if (x) nf = Math.min(nf, +x[1]); }
      if (nf <= 4) return 5; if (nf <= 12) return 4;
      if (nf <= 24 || p.some(t => /^(news1|ichi1|spec1)$/.test(t))) return 3;
      return p.length ? 2 : 1;
    }
    if (pri.size) return 1; // had priority data but none for this word → rare
    return Math.max(1, Math.min(5, (isCommon(w) ? 3 : 2) + (LV_BONUS[level] || 0)));
  }

  /* ---- 5. build vocab entries */
  log('Building vocabulary');
  const vocab = Object.fromEntries(LEVELS.map(l => [l, []]));
  const usedTags = new Set();
  const examplePool = []; // entries needing furigana/tatoeba fill
  for (const [seq, { w, row }] of picked) {
    const kanjiForms = (w.kanji || []).filter(k => !(k.tags || []).some(t => /^(sK|rK|iK|oK)$/.test(t)));
    let kanji = null;
    if (row.kanji && row.kanji !== row.kana && hasKanji(row.kanji)) kanji = (w.kanji || []).find(k => k.text === row.kanji)?.text || kanjiForms[0]?.text || null;
    else if (!row.kanji || row.kanji === row.kana) kanji = null;
    const kanaForms = (w.kana || []).filter(k => !(k.tags || []).some(t => /^(sk|ok|ik)$/.test(t)));
    const okFor = k => !kanji || !k.appliesToKanji || k.appliesToKanji.includes('*') || k.appliesToKanji.includes(kanji);
    const reading = (kanaForms.find(k => okFor(k) && (k.text === row.kana || kata2hira(k.text) === kata2hira(row.kana))) || kanaForms.find(okFor) || w.kana[0]).text;
    const display = kanji || reading;
    const alt = kanji ? null : (kanjiForms[0]?.text || null);

    let lastPos = [];
    const senses = [];
    for (const s of w.sense || []) {
      const pos = s.partOfSpeech && s.partOfSpeech.length ? s.partOfSpeech : lastPos; lastPos = pos;
      const ak = s.appliesToKanji || ['*'], ar = s.appliesToKana || ['*'];
      if (kanji && !ak.includes('*') && !ak.includes(kanji)) continue;
      if (!ar.includes('*') && !ar.includes(reading)) continue;
      const g = (s.gloss || []).filter(x => !x.lang || x.lang === 'eng').map(x => x.text).slice(0, 4);
      if (!g.length) continue;
      pos.forEach(t => usedTags.add(t)); (s.misc || []).forEach(t => usedTags.add(t));
      const sense = { p: pos, g };
      if ((s.misc || []).length) sense.x = s.misc;
      if ((s.info || []).length) sense.i = s.info.join('; ');
      senses.push(sense);
      if (senses.length >= 4) break;
    }
    if (!senses.length) continue;
    const ex = [];
    if (jmHasExamples) {
      for (const s of w.sense || []) for (const e of s.examples || []) {
        const jp = (e.sentences || []).find(x => (x.land || x.lang) === 'jpn');
        const en = (e.sentences || []).find(x => (x.land || x.lang) === 'eng');
        if (jp && en && ex.length < MAX_EX && !ex.some(x => x.j === jp.text)) ex.push({ j: jp.text, e: en.text, t: e.source && e.source.type === 'tatoeba' ? String(e.source.value) : null });
      }
    }
    const level = row.level;
    const entry = {
      i: +seq, w: display, r: reading, f: furigana(display, reading),
      m: senses[0].g.slice(0, 3).join('; '), s: senses, g: POS_GROUP(senses[0].p[0] || ''),
      q: tier(seq, w, level), ex
    };
    if (isCommon(w)) entry.c = 1;
    if (alt) entry.a = alt;
    vocab[level].push(entry);
    examplePool.push(entry);
  }
  for (const row of unmatched) {
    const display = row.kanji && hasKanji(row.kanji) ? row.kanji : row.kana;
    const m = String(row.meaning || '').trim(); if (!m) continue;
    const entry = { i: null, w: display, r: row.kana, f: furigana(display, row.kana), m, s: [{ p: [], g: [m] }], g: 'other', q: 2, ex: [] };
    vocab[row.level].push(entry); examplePool.push(entry);
  }

  /* ---- 6. Tatoeba supplement */
  if (USE_TATOEBA && MAX_EX > 0) {
    log('Tatoeba sentences');
    const need = examplePool.filter(e => e.ex.length < MAX_EX);
    const sj = await getSource('tatoeba-jpn', SOURCES.tatoeba.jpn, { required: false });
    const se = sj && await getSource('tatoeba-eng', SOURCES.tatoeba.eng, { required: false });
    const sl = se && await getSource('tatoeba-links', SOURCES.tatoeba.links, { required: false });
    if (sj && se && sl && need.length) {
      const link = new Map();
      await eachLine(plainTextFile(sl.file), l => { const [a, b] = l.split('\t'); if (a && b && !link.has(a)) link.set(a, b); });
      const jpn = [];
      await eachLine(plainTextFile(sj.file), l => {
        const [id, , text] = l.split('\t');
        if (text && link.has(id) && text.length >= 4 && text.length <= 32) jpn.push({ id, text });
      });
      const engNeeded = new Set(jpn.map(s => link.get(s.id)));
      const eng = new Map();
      await eachLine(plainTextFile(se.file), l => { const [id, , text] = l.split('\t'); if (engNeeded.has(id)) eng.set(id, text); });
      log(`  ${jpn.length} short Japanese sentences with English translations`);
      // forms we want sentences for
      const want = new Map(); // form -> [entries]
      for (const e of need) { const f = e.w; if (!want.has(f)) want.set(f, []); want.get(f).push(e); }
      const index = new Map(); // form -> [sentence idx]
      const add = (f, i) => { if (want.has(f)) { const a = index.get(f) || []; if (a[a.length - 1] !== i) a.push(i); index.set(f, a); } };
      jpn.sort((a, b) => a.text.length - b.text.length);
      if (tokenizer) {
        jpn.forEach((s, i) => { for (const t of tokenizer.tokenize(s.text)) { add(t.basic_form, i); add(t.surface_form, i); } });
      } else {
        // fallback: substring match, only for forms unlikely to give false hits
        for (const f of want.keys()) {
          if (!(hasKanji(f) ? [...f].length >= 2 : [...f].length >= 3)) continue;
          for (let i = 0; i < jpn.length; i++) if (jpn[i].text.includes(f)) { add(f, i); if ((index.get(f) || []).length >= 6) break; }
        }
      }
      let filled = 0; const useCount = new Map();
      for (const [f, entries] of want) {
        const cands = index.get(f) || [];
        for (const e of entries) {
          for (const i of cands) {
            if (e.ex.length >= MAX_EX) break;
            const s = jpn[i]; const en = eng.get(link.get(s.id));
            if (!en || e.ex.some(x => x.j === s.text) || (useCount.get(i) || 0) >= 3) continue;
            e.ex.push({ j: s.text, e: en, t: s.id }); useCount.set(i, (useCount.get(i) || 0) + 1); filled++;
          }
        }
      }
      meta.sources.tatoeba = { files: [sj.label, se.label, sl.label], matching: tokenizer ? 'dictionary form (kuromoji)' : 'substring' };
      log(`  added ${filled} sentences`);
    }
  }
  // furigana for every example sentence
  for (const e of examplePool) for (const x of e.ex) { x.j = sentenceFurigana(x.j); }

  /* ---- 7. KANJIDIC2 + JLPT kanji levels */
  log('KANJIDIC2');
  const kd = await getSource('kanjidic', SOURCES.kanjidic);
  const KD = readJsonSource(kd.file);
  meta.sources.kanjidic = { file: kd.label, version: KD.version || null, dictDate: KD.dictDate || null };
  let kLevels = {};
  const kl = await getSource('kanji-levels', SOURCES.kanjiLevels, { required: false });
  if (kl) {
    const d = JSON.parse(fs.readFileSync(kl.file, 'utf8'));
    for (const [c, v] of Object.entries(d)) if (v && v.jlpt_new) kLevels[c] = 'N' + v.jlpt_new;
    meta.sources.kanjiLevels = kl.label;
  } else {
    meta.notes.push('Kanji JLPT levels fell back to the pre-2010 KANJIDIC levels (old level 2 shown as N2).');
  }
  const OLD = { 4: 'N5', 3: 'N4', 2: 'N2', 1: 'N1' };
  const kanji = Object.fromEntries(LEVELS.map(l => [l, []]));
  const kanjiSet = new Map();
  const allVocab = LEVELS.flatMap(l => vocab[l].map(v => ({ v, l })));
  for (const ch of KD.characters) {
    const c = ch.literal, misc = ch.misc || {};
    const level = kLevels[c] || (!kl && misc.jlptLevel ? OLD[misc.jlptLevel] : null);
    if (!level) continue;
    const groups = (ch.readingMeaning && ch.readingMeaning.groups) || [];
    const rd = groups.flatMap(g => g.readings || []);
    const mn = groups.flatMap(g => g.meanings || []).filter(m => !m.lang || m.lang === 'en').map(m => m.value);
    if (!mn.length) continue;
    const rank = misc.frequency || null;
    const exs = allVocab.filter(({ v }) => v.w.includes(c) && v.i !== null)
      .sort((a, b) => LEVELS.indexOf(a.l) - LEVELS.indexOf(b.l) || b.v.q - a.v.q).slice(0, 5)
      .map(({ v, l }) => ({ w: v.w, r: v.r, m: v.m.split('; ')[0], l }));
    const entry = {
      k: c, m: mn.slice(0, 5), on: rd.filter(r => r.type === 'ja_on').map(r => r.value), kun: rd.filter(r => r.type === 'ja_kun').map(r => r.value),
      s: (misc.strokeCounts || [])[0] || null, r: rank, q: !rank ? 1 : rank <= 100 ? 5 : rank <= 500 ? 4 : rank <= 1000 ? 3 : rank <= 1800 ? 2 : 1, ex: exs
    };
    if (misc.grade) entry.gr = misc.grade;
    kanji[level].push(entry); kanjiSet.set(c, level);
  }
  for (const l of LEVELS) kanji[l].sort((a, b) => (a.r || 9999) - (b.r || 9999));
  log(`  ${kanjiSet.size} JLPT kanji`);

  /* ---- 8. KanjiVG stroke order */
  log('KanjiVG');
  const strokes = Object.fromEntries(LEVELS.map(l => [l, {}]));
  const kv = await getSource('kanjivg', SOURCES.kanjivg, { required: false });
  if (kv) {
    const files = new Map(walk(extractDir(kv.file)).filter(p => /\.svg$/i.test(p)).map(p => [path.basename(p).toLowerCase(), p]));
    let n = 0;
    for (const [c, l] of kanjiSet) {
      const hex = c.codePointAt(0).toString(16).padStart(5, '0');
      const f = files.get(hex + '.svg'); if (!f) continue;
      const svg = fs.readFileSync(f, 'utf8');
      const paths = [];
      for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
        const tag = m[0];
        const id = /\bid="kvg:[0-9a-f]+-s(\d+)"/i.exec(tag); const d = /\bd="([^"]+)"/.exec(tag);
        if (id && d) paths.push([+id[1], d[1].replace(/\s+/g, ' ').trim()]);
      }
      paths.sort((a, b) => a[0] - b[0]);
      const nums = [...svg.matchAll(/<text[^>]*transform="matrix\(1 0 0 1 ([\d.-]+) ([\d.-]+)\)"[^>]*>(\d+)<\/text>/g)]
        .sort((a, b) => +a[3] - +b[3]).map(m => [+(+m[1]).toFixed(1), +(+m[2]).toFixed(1)]);
      if (!paths.length) continue;
      strokes[l][c] = { d: paths.map(p => p[1]), n: nums.length === paths.length ? nums : [] };
      n++;
    }
    meta.sources.kanjivg = kv.label;
    log(`  stroke data for ${n} kanji`);
  } else meta.notes.push('KanjiVG unavailable: no stroke-order diagrams in this build.');

  /* ---- 8b. Grammar (hanabira.org, MIT) */
  log('Grammar (hanabira.org)');
  const grammar = Object.fromEntries(LEVELS.map(l => [l, []]));
  const gFiles = await getGrammarFiles();
  const strip = v => v == null ? '' : String(Array.isArray(v) ? v.join('\n') : v).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const pickF = (o, names) => { for (const n of names) if (o && o[n] != null && o[n] !== '') return o[n]; return null; };
  const listOf = j => {
    if (Array.isArray(j)) return j;
    if (j && typeof j === 'object') {
      for (const v of Object.values(j)) if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
      const ks = Object.keys(j);
      if (ks.length && ks.every(k => j[k] && typeof j[k] === 'object' && !Array.isArray(j[k]))) return ks.map(k => ({ title: k, ...j[k] }));
    }
    return [];
  };
  let gCount = 0;
  for (const { level, file } of gFiles) {
    let j; try { j = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { warn(`grammar ${path.basename(file)}: ${e.message}`); continue; }
    for (const o of listOf(j)) {
      const t = strip(pickF(o, ['title', 'grammar', 'grammar_point', 'name', 'point', 'pattern']));
      if (!t) continue;
      const tag = String(pickF(o, ['p_tag', 'jlpt', 'level', 'jlpt_level']) || '');
      const lv = (/N([1-5])/i.exec(tag) || /^([1-5])$/.exec(tag) || [])[1] ? 'N' + ((/N([1-5])/i.exec(tag) || /^([1-5])$/.exec(tag))[1]) : level;
      if (!grammar[lv] || grammar[lv].some(g => g.t === t)) continue;
      const rawEx = pickF(o, ['examples', 'example_sentences', 'sentences', 'example']) || [];
      const ex = (Array.isArray(rawEx) ? rawEx : [rawEx]).map(e => typeof e === 'string' ? { jp: e } : e || {})
        .map(e => ({ j: strip(pickF(e, ['jp', 'japanese', 'ja', 'sentence', 'jpn', 'text'])), e: strip(pickF(e, ['en', 'english', 'translation', 'eng', 'meaning'])), r: strip(pickF(e, ['romaji', 'romanization', 'romanized'])) }))
        .filter(e => e.j).slice(0, 6);
      const entry = { t, m: strip(pickF(o, ['short_explanation', 'meaning', 'short', 'summary', 'english', 'translation'])),
        x: strip(pickF(o, ['long_explanation', 'explanation', 'description', 'details', 'long', 'notes'])),
        fm: strip(pickF(o, ['formation', 'structure', 'form', 'usage', 'construction', 'conjugation'])),
        ex: ex.map(e => { const o2 = { j: sentenceFurigana(e.j), e: e.e }; if (e.r) o2.r = e.r; return o2; }) };
      if (!entry.m && !entry.x) continue;
      grammar[lv].push(entry); gCount++;
    }
  }
  if (gFiles.length) {
    meta.sources.grammar = 'hanabira.org-japanese-content (' + gFiles.map(f => path.basename(f.file).replace(/^grammar--.*?--/, '')).join(', ') + ')';
    log(`  ${gCount} grammar points`);
  } else meta.notes.push('Grammar data unavailable in this build; the app uses its built-in starter grammar.');

  /* ---- 9. write */
  log('Writing files');
  let total = 0;
  for (const l of LEVELS) {
    vocab[l].sort((a, b) => b.q - a.q || (a.i || 9e9) - (b.i || 9e9));
    meta.counts.vocab[l] = vocab[l].length; meta.counts.kanji[l] = kanji[l].length;
    total += write(`vocab-${l.toLowerCase()}.json`, vocab[l]);
    total += write(`kanji-${l.toLowerCase()}.json`, kanji[l]);
    total += write(`strokes-${l.toLowerCase()}.json`, strokes[l]);
    if (gCount) { (meta.counts.grammar = meta.counts.grammar || {})[l] = grammar[l].length; total += write(`grammar-${l.toLowerCase()}.json`, grammar[l]); }
  }
  meta.tags = Object.fromEntries([...usedTags].filter(t => tagNames[t]).map(t => [t, tagNames[t]]));
  meta.licenses = [
    { name: 'JMdict & KANJIDIC2', by: 'Electronic Dictionary Research and Development Group', license: 'CC BY-SA 4.0', url: 'https://www.edrdg.org/edrdg/licence.html' },
    { name: 'jmdict-simplified', by: 'scriptin', license: 'CC BY-SA 4.0 (data)', url: 'https://github.com/scriptin/jmdict-simplified' },
    { name: 'KanjiVG', by: 'Ulrich Apel and contributors', license: 'CC BY-SA 3.0', url: 'https://kanjivg.tagaini.net/' },
    { name: 'Tatoeba', by: 'Tatoeba contributors', license: 'CC BY 2.0 FR', url: 'https://tatoeba.org/' },
    { name: 'JLPT vocabulary lists', by: 'Jonathan Waller (tanos.co.uk)', license: 'CC BY', url: 'https://www.tanos.co.uk/jlpt/' },
    { name: 'Kanji JLPT levels', by: 'David Luz Gouveia (kanji-data)', license: 'MIT', url: 'https://github.com/davidluzgouveia/kanji-data' },
    { name: 'JLPT grammar', by: 'hanabira.org', license: 'Creative Commons (in-house content)', url: 'https://hanabira.org/' }
  ];
  total += write('meta.json', meta);
  log(`Done: ${Object.values(meta.counts.vocab).reduce((a, b) => a + b, 0)} words, ${kanjiSet.size} kanji, ${(total / 1e6).toFixed(1)} MB in ${OUT}`);
  if (meta.notes.length) meta.notes.forEach(n => warn(n));
}

main().catch(e => { console.error('\nBuild failed:', e.message); process.exit(1); });
