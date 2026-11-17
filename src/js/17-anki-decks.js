/* =====================================================================
   ANKI DECKS: import an .apkg and the dojo adapts to it.
   The deck stays in this browser (IndexedDB) and is never uploaded anywhere.
   Reads both Anki package formats (collection.anki2 / .anki21 and the newer
   zstd-compressed collection.anki21b), works out which field is the word,
   reading, meaning, sentence, audio and picture, and lets the learner correct it.
   Then:
   - deck words that are dictionary words get the deck's voice, sentence and picture;
   - the rest become a "My deck" level (flashcards, tests, search, browse);
   - Anki review history marks the words you already know, so the Path skips
     lessons you don't need and your reviews start where Anki left off;
   - a "My deck" Path track teaches the deck in its own order, 12 words a lesson.
   Rule-based and on-device: nothing is sent to a server or an AI service.
   ===================================================================== */
const ANKI = { decks: [], items: [], extra: [], known: new Set(), rank: new Map(), krank: new Map(), planKey: '', urls: new Map(), sig: '', ver: 0, busy: '', draft: null, done: null, units: null, unitsSig: '', pending: null };
const ankiDb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('kotoba-anki', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('decks')) d.createObjectStore('decks', { keyPath: 'id' }); if (!d.objectStoreNames.contains('media')) d.createObjectStore('media'); };
    r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
  }));
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => { const t = d.transaction(store, mode), req = fn(t.objectStore(store)); t.oncomplete = () => res(req && 'result' in req ? req.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Storage aborted')); });
  };
  return {
    get: (st, k) => tx(st, 'readonly', s => s.get(k)),
    all: st => tx(st, 'readonly', s => s.getAll()),
    put: (st, v, k) => tx(st, 'readwrite', s => k === undefined ? s.put(v) : s.put(v, k)),
    del: (st, k) => tx(st, 'readwrite', s => s.delete(k)),
    delPrefix: (st, p) => tx(st, 'readwrite', s => s.delete(IDBKeyRange.bound(p, p + '￿'))),
    putMany: (st, rows) => tx(st, 'readwrite', s => { let last = null; for (const [k, v] of rows) last = s.put(v, k); return last; })
  };
})();

/* ---------- libraries (loaded only when someone imports a deck) ---------- */
const loadScript = src => new Promise((res, rej) => {
  if (document.querySelector(`script[data-src="${src}"]`)) return res();
  const s = document.createElement('script'); s.src = src; s.dataset.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s);
});
let ankiLibsP = null;
function ankiLibs() {
  return ankiLibsP || (ankiLibsP = (async () => {
    for (const f of ['jszip.min.js', 'sql-wasm.js', 'fzstd.js']) await loadScript('vendor/' + f);
    return initSqlJs({ locateFile: f => 'vendor/' + f });
  })().catch(e => { ankiLibsP = null; throw e; }));
}
const isZstd = u => u && u.length > 4 && u[0] === 0x28 && u[1] === 0xB5 && u[2] === 0x2F && u[3] === 0xFD;
const unz = u => isZstd(u) ? fzstd.decompress(u) : u;
/** the new-format media list: protobuf MediaEntries { repeated MediaEntry { string name = 1; uint32 size = 2; bytes sha1 = 3; uint32 legacy_zip_filename = 255 } } */
function ankiPbMedia(u8) {
  let i = 0; const out = [], td = new TextDecoder();
  const varint = () => { let r = 0, s = 0, b; do { b = u8[i++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80 && i < u8.length); return r; };
  const skip = w => { if (w === 0) varint(); else if (w === 1) i += 8; else if (w === 2) { const n = varint(); i += n; } else if (w === 5) i += 4; else throw new Error('Unreadable media list'); };
  while (i < u8.length) {
    const tag = varint(), f = Math.floor(tag / 8), w = tag & 7;
    if (f !== 1 || w !== 2) { skip(w); continue; }
    const len = varint(), end = i + len, e = {};
    while (i < end) {
      const t2 = varint(), f2 = Math.floor(t2 / 8), w2 = t2 & 7;
      if (f2 === 1 && w2 === 2) { const n = varint(); e.name = td.decode(u8.subarray(i, i + n)); i += n; }
      else if (f2 === 255 && w2 === 0) e.legacy = varint();
      else skip(w2);
    }
    i = end; out.push(e);
  }
  return out;
}

/* Anki 2.1.28+ collections sort names with its own "unicase" collation, which plain SQLite doesn't have:
   any query on those tables fails ("no query solution" / "no such collation sequence: unicase").
   Strip the collation from the schema and drop the indexes built with it, then reopen the copy in memory.
   (Reading only; the deck file itself is never changed.) */
function ankiOpenDb(SQL, bytes) {
  let db = new SQL.Database(bytes);
  const n = db.exec("select count(*) from sqlite_master where sql like '%unicase%'");
  if (!n.length || !n[0].values[0][0]) return db;
  db.exec(`PRAGMA writable_schema = ON;
    DELETE FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL AND tbl_name IN (SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE '%unicase%');
    UPDATE sqlite_master SET sql = replace(replace(replace(sql, ' COLLATE unicase', ''), ' collate unicase', ''), ' COLLATE UNICASE', '') WHERE sql LIKE '%unicase%';
    PRAGMA writable_schema = OFF;`);
  const fixed = db.export(); db.close();
  return new SQL.Database(fixed);
}

/* ---------- reading a package ---------- */
async function ankiRead(file, step) {
  step('Loading the deck reader…');
  const SQL = await ankiLibs();
  step('Opening the package…');
  const zip = await JSZip.loadAsync(file);
  const colName = ['collection.anki21b', 'collection.anki21', 'collection.anki2'].find(n => zip.file(n));
  if (!colName) throw new Error('There is no Anki collection inside this file. Export it from Anki as “Anki Deck Package (.apkg)”.');
  const colBytes = unz(await zip.file(colName).async('uint8array'));
  const media = {};   // file name used in the cards → entry in the zip
  const mf = zip.file('media');
  if (mf) {
    const raw = unz(await mf.async('uint8array'));
    const head = new TextDecoder().decode(raw.subarray(0, 16)).trim();
    if (head.startsWith('{')) { const j = JSON.parse(new TextDecoder().decode(raw)); for (const [k, v] of Object.entries(j)) media[v] = k; }
    else ankiPbMedia(raw).forEach((e, i) => { if (e.name) media[e.name] = String(e.legacy ?? i); });
  }
  step('Reading the cards…');
  const db = ankiOpenDb(SQL, colBytes);
  try {
    const q = sql => { const r = db.exec(sql); if (!r.length) return []; const { columns, values } = r[0]; return values.map(v => Object.fromEntries(columns.map((c, i) => [c, v[i]]))); };
    const has = t => q(`select name from sqlite_master where type='table' and name='${t}'`).length > 0;
    const col = q('select * from col')[0] || {};
    const types = new Map(), deckNames = new Map();
    if (has('notetypes') && has('fields')) {
      for (const r of q('select id, name from notetypes')) types.set(String(r.id), { id: String(r.id), name: r.name, fields: [] });
      for (const r of q('select ntid, ord, name from fields order by ntid, ord')) { const t = types.get(String(r.ntid)); if (t) t.fields[r.ord] = r.name; }
    } else if (col.models) {
      for (const [id, m] of Object.entries(JSON.parse(col.models))) types.set(String(id), { id: String(id), name: m.name, fields: (m.flds || []).slice().sort((a, b) => a.ord - b.ord).map(f => f.name) });
    }
    if (has('decks')) for (const r of q('select id, name from decks')) deckNames.set(String(r.id), String(r.name).split('\x1f').join('::'));
    else if (col.decks) for (const [id, d] of Object.entries(JSON.parse(col.decks))) deckNames.set(String(id), d.name);
    const cards = new Map(), didCount = new Map();
    for (const c of q('select nid, did, type, queue, due, ivl, reps, lapses from cards')) {
      const k = String(c.nid), prev = cards.get(k);
      if (!prev || (c.ivl || 0) > (prev.ivl || 0)) cards.set(k, c);
      didCount.set(String(c.did), (didCount.get(String(c.did)) || 0) + 1);
    }
    for (const n of q('select id, mid, flds, tags from notes order by id')) {
      const t = types.get(String(n.mid)); if (!t) continue;
      (t.notes = t.notes || []).push({ id: String(n.id), f: String(n.flds).split('\x1f'), tags: String(n.tags || '').trim(), card: cards.get(String(n.id)) || null });
    }
    const list = [...types.values()].filter(t => t.notes && t.notes.length).sort((a, b) => b.notes.length - a.notes.length);
    if (!list.length) throw new Error('This deck has no notes in it.');
    const did = [...didCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const full = (did && deckNames.get(did[0])) || file.name.replace(/\.apkg$/i, '');
    return { file: file.name, name: full.split('::').pop().trim() || full, crt: +col.crt || 0, types: list, media, zip };
  } finally { db.close(); }
}

/* ---------- field text ---------- */
const HAS_JP = /[぀-ヿ㐀-鿿々]/, HAS_LATIN = /[A-Za-z]/;
function ankiText(html) {
  const s = String(html || '').replace(/\[sound:[^\]]*\]/g, ' ')
    .replace(/<ruby>(?:<rb>)?(.*?)(?:<\/rb>)?<rt>(.*?)<\/rt>\s*<\/ruby>/gi, ' $1[$2]')
    .replace(/<br\s*\/?>|<\/(div|p|li)>/gi, ' ');
  const doc = new DOMParser().parseFromString(`<body>${s}</body>`, 'text/html');   // inert: nothing in the deck's HTML runs or loads
  return (doc.body.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}
/** Anki furigana ("食[た]べる", "日本 語[ご]") → [[text, reading|null] …]; a base runs back to the previous space */
function ankiSegs(s) {
  const out = [], re = /([^\s\[\]]*)\[([^\]]*)\]/g; let m, last = 0;
  s = String(s || '');
  while ((m = re.exec(s))) {
    if (m.index > last) out.push([s.slice(last, m.index).replace(/ $/, ''), null]);
    out.push([m[1], m[2]]); last = re.lastIndex;
  }
  if (last < s.length) out.push([s.slice(last), null]);
  return out.map(([b, r]) => [b.replace(/^ /, ''), r]);
}
const jpJoin = s => s.replace(/(?<=[^\x00-\x7f]) +| +(?=[^\x00-\x7f])/g, '');
const ankiFuri = s => fixMark(jpJoin(ankiSegs(s).map(([b, r]) => r && [...b].some(isK) ? `{${b}|${r}}` : b).join('')));   // a base without its space (が赤[あか]) is split back to が{赤|あか}
const ankiReading = s => kata2hira(ankiSegs(s).map(([b, r]) => r || b).join('').replace(/\s+/g, ''));
const ankiBase = s => jpJoin(ankiSegs(s).map(([b]) => b).join('')).trim();
const soundOf = html => { const m = /\[sound:([^\]]+)\]/.exec(String(html || '')); return m ? m[1].trim() : ''; };
const imgOf = html => { const m = /<img[^>]+src\s*=\s*["']?([^"'\s>]+)/i.exec(String(html || '')); return m ? decodeURIComponent(m[1]) : ''; };

/* ---------- which field is which ---------- */
const ANKI_ROLES = [
  ['word', 'Word', 'The Japanese word (kanji or kana)'], ['reading', 'Reading', 'Kana reading, or furigana like 食[た]べる'], ['meaning', 'Meaning', 'English meaning'],
  ['wordFuri', 'Word furigana', 'Optional: the word with furigana'], ['wordAudio', 'Word audio', 'The word’s recording'],
  ['sentence', 'Sentence', 'Example sentence in Japanese'], ['sentFuri', 'Sentence furigana', 'Optional: the sentence with furigana'], ['sentMeaning', 'Sentence meaning', 'English for the sentence'],
  ['sentAudio', 'Sentence audio', 'The sentence’s recording'], ['picture', 'Picture', 'An image for the word'], ['notes', 'Notes', 'Extra notes to show with the word']
];
function ankiProfile(t) {
  const sample = t.notes.slice(0, 60);
  return t.fields.map((name, i) => {
    const vals = sample.map(n => n.f[i] || ''), txt = vals.map(ankiText), n = Math.max(1, vals.length);
    const frac = f => vals.filter(f).length / n;
    return { i, name: String(name || `Field ${i + 1}`), n: String(name || '').toLowerCase(),
      sound: frac(v => /\[sound:/.test(v)), img: frac(v => /<img/i.test(v)), jp: txt.filter(v => HAS_JP.test(v)).length / n,
      latin: txt.filter(v => HAS_LATIN.test(v) && !HAS_JP.test(v)).length / n, br: txt.filter(v => /[^\s\[\]]\[[^\]]+\]/.test(v)).length / n,
      kana: txt.filter(v => v && /^[぀-ヿー・\s]+$/.test(v)).length / n, len: txt.reduce((a, v) => a + v.length, 0) / n, filled: vals.filter(v => String(v).trim()).length / n };
  });
}
function ankiAutoMap(t) {
  const P = ankiProfile(t), used = new Set(), map = {};
  const take = (role, test, min = 0.2) => { if (map[role] !== undefined && map[role] >= 0) return; const f = P.find(p => !used.has(p.i) && p.filled > min && test(p)); if (f) { map[role] = f.i; used.add(f.i); } };
  const sent = p => /sentence|example|expression ?sentence|^ex\b|context/.test(p.n);
  const mean = p => /meaning|english|definition|gloss|translation|^back$|^en\b/.test(p.n);
  // by name
  take('wordAudio', p => p.sound > 0.3 && !sent(p));
  take('sentAudio', p => p.sound > 0.3 && sent(p));
  take('picture', p => p.img > 0.3 || (/picture|image|^pic|photo/.test(p.n) && p.img > 0), 0);
  take('sentMeaning', p => sent(p) && mean(p) && p.latin > 0.5);
  take('sentFuri', p => sent(p) && /furigana|reading|kana/.test(p.n) && p.jp > 0.5);
  take('sentence', p => sent(p) && !mean(p) && p.sound < 0.3 && p.jp > 0.5);
  take('wordFuri', p => /furigana/.test(p.n) && p.jp > 0.5);
  take('reading', p => /reading|kana|yomi|hiragana|pronunciation/.test(p.n) && !/pitch|accent/.test(p.n) && p.jp > 0.5);
  take('meaning', p => mean(p) && p.latin > 0.4);
  take('word', p => /^(word|vocab|vocabulary|expression|kanji|term|japanese|front|target ?word|key|vocab-kanji|vocabulary-kanji)$/.test(p.n) && p.jp > 0.5);
  take('word', p => /word|vocab|expression|kanji|term/.test(p.n) && !/audio|meaning|reading|furigana|sentence|picture|note|pitch/.test(p.n) && p.jp > 0.5);
  take('notes', p => /^notes?$|^comment/.test(p.n) && p.sound < 0.1, 0);
  // by content when names didn't say
  take('word', p => p.jp > 0.8 && p.len <= 12 && p.sound < 0.1 && p.img < 0.1);
  take('reading', p => p.kana > 0.6 && p.len <= 14);
  take('meaning', p => p.latin > 0.6 && p.len <= 90);
  take('sentence', p => p.jp > 0.6 && p.len > 8 && p.sound < 0.1);
  take('sentMeaning', p => p.latin > 0.6 && p.len > 12);
  take('wordAudio', p => p.sound > 0.3);
  take('sentAudio', p => p.sound > 0.3);
  for (const [r] of ANKI_ROLES) if (map[r] === undefined) map[r] = -1;
  // furigana in the word field itself (食[た]べる): reading comes from it
  if (map.wordFuri < 0 && map.word >= 0 && P[map.word].br > 0.3) map.wordFuri = map.word;
  return { map, P };
}
function ankiNote(n, map) {
  const raw = r => map[r] >= 0 ? n.f[map[r]] || '' : '', txt = r => ankiText(raw(r));
  const wordT = txt('word'), furiT = map.wordFuri >= 0 ? txt('wordFuri') : '';
  let w = /\[/.test(wordT) ? ankiBase(wordT) : wordT.replace(/\s+/g, '');
  let r = txt('reading'); if (/\[/.test(r)) r = ankiReading(r); r = (r.match(/[぀-ヿー]+/g) || []).join('');   // kana only (drops romaji, pitch numbers)
  if (!r && furiT) r = ankiReading(furiT);
  if (!r && /\[/.test(wordT)) r = ankiReading(wordT);
  if (!r && w && !hanOf(w).length) r = w;
  if (!w && furiT) w = ankiBase(furiT);
  const f = furiT && /\[/.test(furiT) ? ankiFuri(furiT) : /\[/.test(wordT) ? ankiFuri(wordT) : (w && r ? furi(w, r) : w);
  const m = txt('meaning').slice(0, 160);
  const sRaw = map.sentFuri >= 0 ? txt('sentFuri') : txt('sentence'), sj = /\[/.test(sRaw) ? ankiFuri(sRaw) : sRaw;
  const c = n.card || {};
  return { nid: n.id, w, r, f, m, sj: sj.slice(0, 200), se: txt('sentMeaning').slice(0, 240), wa: soundOf(raw('wordAudio')), sa: soundOf(raw('sentAudio')), pic: imgOf(raw('picture')),
    note: txt('notes').slice(0, 300), ty: c.type || 0, ivl: c.ivl || 0, due: c.due || 0, reps: c.reps || 0, lapses: c.lapses || 0 };
}

/* ---------- storing a deck ---------- */
const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', flac: 'audio/flac', webm: 'audio/webm',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' };
async function ankiSave(D, step) {
  const t = D.types[D.ti], map = D.map, old = ANKI.decks.find(d => d.name === D.name && d.type === t.name), id = old ? old.id : 'd' + Date.now().toString(36);
  if (old) { await ankiDb.delPrefix('media', id + '/'); for (const [k, u] of ANKI.urls) if (k.startsWith('a:' + id + '/')) { URL.revokeObjectURL(u); ANKI.urls.delete(k); } }   // the same deck again: update it, don't add a copy
  const notes = t.notes.map(n => ankiNote(n, map)).filter(x => x.w && x.m);
  const want = new Set(); notes.forEach(x => { if (D.opts.voices) { if (x.wa) want.add(x.wa); if (x.sa) want.add(x.sa); } if (D.opts.pics && x.pic) want.add(x.pic); });
  const names = [...want].filter(nm => D.media[nm] !== undefined && D.zip.file(D.media[nm]));
  let stored = 0, batch = [];
  for (const nm of names) {
    const ext = (nm.split('.').pop() || '').toLowerCase();
    if (!MIME[ext]) continue;
    if (ext === 'svg') continue;   // pictures as data only: no SVG (it can carry scripts)
    const bytes = unz(await D.zip.file(D.media[nm]).async('uint8array'));
    batch.push([id + '/' + nm, new Blob([bytes], { type: MIME[ext] })]); stored++;
    if (batch.length >= 80) { step(`Saving recordings and pictures… ${stored} of ${names.length}`); await ankiDb.putMany('media', batch); batch = []; }
  }
  if (batch.length) await ankiDb.putMany('media', batch);
  const have = new Set(names.map(String));
  notes.forEach(x => { if (!have.has(x.wa)) x.wa = ''; if (!have.has(x.sa)) x.sa = ''; if (!have.has(x.pic)) x.pic = ''; });
  const deck = { id, name: D.name, file: D.file, type: t.name, imported: Date.now(), crt: D.crt, opts: D.opts, notes, media: stored, skipped: t.notes.length - notes.length };
  await ankiDb.put('decks', deck);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  return deck;
}

/* ---------- applying decks to the dojo ---------- */
async function ankiBoot() {
  try { ANKI.decks = (await ankiDb.all('decks')) || []; } catch (e) { ANKI.decks = []; }
  if (!ANKI.decks.length) return;
  if (DATA.mode === 'full') await loadAllVocab().catch(() => {});
  ANKI.sig = ''; ankiApply(); render();
}
function ankiApply() {
  const base = V.filter(x => x.lvl !== 'ANKI'), sig = base.length + ':' + ANKI.decks.map(d => d.id).join(',') + ':' + (settings.deckVoice !== false);
  if (sig === ANKI.sig) return;
  ANKI.sig = sig;
  // every object that can stand for a dictionary word: the data, Path-only words and situation phrases
  const pool = [...base, ...Object.values(PATHX), ...Object.values(SITX)], byId = new Map();
  for (const x of pool) { if (!byId.has(x.id)) byId.set(x.id, []); if (!byId.get(x.id).includes(x)) byId.get(x.id).push(x); }
  // undo the previous pass
  for (const x of pool) if (x.dk) { if ('au0' in x) x.au = x.au0; delete x.au0; delete x.dk; delete x.dkId; delete x.dks; delete x.dau; delete x.dpic; delete x.dnote; x.ex = x.ex.filter(e => !e.dk); }
  const byR = new Map(); for (const x of base) { const k = kata2hira(x.r); if (!byR.has(k)) byR.set(k, []); byR.get(k).push(x); }
  const items = [], extra = [], seen = new Set(), known = new Set();
  for (const d of ANKI.decks) for (const n of d.notes) {
    const rh = kata2hira(n.r || n.w), cands = byR.get(rh) || [], id0 = 'v:' + n.w + '|' + n.r;
    let x = (byId.get(id0) || [])[0];
    if (!x) x = cands.find(c => c.w === n.w || c.alt === n.w) || (hanOf(n.w).length ? null : cands.find(c => c.w === c.r || (c.senses || []).some(s => (s.x || []).includes('uk'))));
    const dau = d.opts.voices && n.wa ? `a:${d.id}/${n.wa}` : null, sau = d.opts.voices && n.sa ? `a:${d.id}/${n.sa}` : null;
    const sent = d.opts.sentences && n.sj ? { j: n.sj, e: n.se || '', dau: sau, dk: d.name, dkId: d.id } : null;
    if (sent && d.opts.pics && n.pic) sent.dpic = `a:${d.id}/${n.pic}`;   // the card's picture goes with its sentence too
    const pic = d.opts.pics && n.pic ? `a:${d.id}/${n.pic}` : null;
    /* add this card to a word: the first deck sets the voice and picture; every deck adds its sentence
       (so two decks with the same word give it two example sentences, never two copies of the word) */
    const merge = y => {
      if (!y.dk) { y.dk = d.name; y.dkId = d.id; y.au0 = y.au; y.dks = []; }
      if (!y.dks.includes(d.id)) y.dks.push(d.id);
      if (dau && !y.dau) { y.dau = dau; if (!y.au || settings.deckVoice !== false) y.au = dau; }   // the word plays your deck's voice everywhere
      if (sent && !y.ex.some(e => plain(e.j) === plain(sent.j))) { const k = y.ex.filter(e => e.dk).length; y.ex = [...y.ex.slice(0, k), sent, ...y.ex.slice(k)]; }
      if (pic && !y.dpic) y.dpic = pic;
      if (n.note && !y.dnote) y.dnote = n.note;
    };
    if (x) (byId.get(x.id) || [x]).forEach(merge);
    else {
      x = extra.find(e => e.id === id0);
      if (!x) {
        x = normV({ i: null, w: n.w, r: n.r || n.w, f: n.f || furi(n.w, n.r || n.w), m: n.m, s: [{ p: [], g: n.m.split(/;\s*/).filter(Boolean) }], g: 'other', q: 3, ex: [] }, 'ANKI');
        x.id = id0; x.au = null; extra.push(x);
      }
      merge(x);
    }
    if (!seen.has(x.id)) { seen.add(x.id); items.push(x); }
    if (d.opts.progress && n.ty === 2 && n.ivl >= 14) known.add(x.id);   // learned in Anki when the deck was added (a 2-week interval or more)
  }
  ANKI.items = items; ANKI.extra = extra; ANKI.ver++; ANKI.known = known;
  ANKI.rank = new Map(items.map((x, i) => [x.id, i])); ANKI.krank = new Map();
  items.forEach((x, i) => hanOf(x.w).forEach(c => { if (!ANKI.krank.has(c)) ANKI.krank.set(c, i); }));
  ANKI.planKey = ANKI.decks.map(d => d.id).join(',') + ':' + items.length + ':' + known.size;
  V = base.concat(extra); VMAP = {}; V.forEach(x => { if (!VMAP[x.id]) VMAP[x.id] = x; }); for (const [id, x] of Object.entries(PATHX)) if (!VMAP[id]) VMAP[id] = x;
  registerSituationExtras(); registerBookExtras(); FURIX = null; WIDX = null;
  if (!ANKI.decks.length && settings.levels.includes('ANKI')) { settings.levels = settings.levels.filter(l => l !== 'ANKI'); if (!settings.levels.length) settings.levels = ['N5']; saveSettings(); }
}
/** Anki's review history → this app's schedule. Never lowers what you've already done here. */
function ankiSeed(d) {
  const now = Date.now(); let n = 0;
  for (const x of ANKI.items) {
    if (!(x.dks || [x.dkId]).includes(d.id)) continue;   // every deck the word is in brings its progress
    const note = d.notes.find(m => (VMAP['v:' + m.w + '|' + m.r] === x) || (m.w === x.w && kata2hira(m.r) === kata2hira(x.r))) || null;
    if (!note || !note.ivl || note.ty === 0) continue;
    const b = note.ivl >= 240 ? 8 : note.ivl >= 120 ? 7 : note.ivl >= 60 ? 6 : note.ivl >= 30 ? 5 : note.ivl >= 14 ? 4 : note.ivl >= 7 ? 3 : note.ivl >= 3 ? 2 : 1;
    const p0 = progress[x.id]; if (p0 && box(p0) >= b) continue;
    let due = note.ty === 2 && d.crt ? (d.crt + note.due * 86400) * 1000 + 4 * 3600e3 : note.due > 1e9 ? note.due * 1000 : now + note.ivl * DAY;
    if (!(due > 0) || due > now + 400 * DAY) due = now + note.ivl * DAY;
    progress[x.id] = Object.assign({ c: 0, w: 0 }, p0 || {}, { b, d: Math.max(now - DAY, due), t: now, s: Math.max(1, note.ivl), f: fClampD(5 + Math.min(3, note.lapses || 0)), lr: Math.min(now, due - Math.max(1, note.ivl) * DAY), l: x.lvl, c: Math.max((p0 || {}).c || 0, note.reps || 1), w: Math.max((p0 || {}).w || 0, note.lapses || 0), ak: 1 });
    n++;
  }
  save(); return n;
}
async function ankiRemove(id) {
  const d = ANKI.decks.find(x => x.id === id); if (!d) return;
  await ankiDb.del('decks', id); await ankiDb.delPrefix('media', id + '/');
  for (const [k, u] of ANKI.urls) if (k.startsWith('a:' + id + '/')) { URL.revokeObjectURL(u); ANKI.urls.delete(k); }
  ANKI.decks = ANKI.decks.filter(x => x.id !== id); ANKI.sig = ''; ankiApply();
}

/* ---------- media: recordings get 0.35 s of silence in front (phones cut the first syllable otherwise) ---------- */
async function ankiMediaUrl(id) {
  if (!id) return null;
  if (ANKI.urls.has(id)) return ANKI.urls.get(id);
  const blob = await ankiDb.get('media', id.slice(2)).catch(() => null); if (!blob) return null;
  let url;
  if (/^audio\//.test(blob.type)) { try { url = URL.createObjectURL(await padWav(blob)); } catch (e) { url = URL.createObjectURL(blob); } }
  else url = URL.createObjectURL(blob);
  ANKI.urls.set(id, url); return url;
}
async function padWav(blob) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) throw new Error('no audio decoder');
  const ctx = new OAC(1, 1, 22050), ab = await ctx.decodeAudioData(await blob.arrayBuffer());
  const rate = ab.sampleRate, pre = Math.round(0.35 * rate), post = Math.round(0.25 * rate), len = ab.length, chs = ab.numberOfChannels;
  const pcm = new Int16Array(pre + len + post), data = [...Array(chs)].map((_, c) => ab.getChannelData(c));
  for (let i = 0; i < len; i++) { let v = 0; for (let c = 0; c < chs; c++) v += data[c][i]; v /= chs; pcm[pre + i] = Math.max(-1, Math.min(1, v)) * 0x7fff; }
  const buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
}
const hasPic = x => settings.pics && !!(x.dpic || x.pic);
/** a picture can stand in for the word only when the word is a thing: 犬 is a dog, but a picture for 引っ張る "to pull"
    or こらえる "to endure" fits a dozen words. Pictures from your own deck were chosen for that word, so they always count. */
/** any pictures at all? if not, lists drop the empty picture column */
let _anyPic = [-1, false];
const anyPic = () => { if (!settings.pics) return false; if (_anyPic[0] !== V.length) _anyPic = [V.length, V.some(x => x.dpic || x.pic)]; return _anyPic[1]; };
const picAsk = x => hasPic(x) && (!!x.dpic || x.pos === 'noun');
const picKey = x => x.dpic || x.pic || '';   // the deck's picture wins over the dojo's
const dpicHtml = (x, cls) => `<img class="pic dpic ${cls}" data-dpic="${esc(x.dpic)}" alt="">`;

/* ---------- the "My deck" Path track ---------- */
function ankiUnits() {
  const sig = ANKI.ver + ':' + ANKI.items.length + ':' + K.length;
  if (ANKI.unitsSig === sig && ANKI.units) return ANKI.units;
  const units = [];
  for (const d of ANKI.decks) {
    const its = ANKI.items.filter(x => x.dkId === d.id && x.lvl === 'ANKI');   // JLPT words are taught in the JLPT course: nothing is taught twice
    const lessons = [], seenK = new Set(), short = d.id.slice(-4);
    for (let i = 0; i < its.length; i += WPU) {
      const items = its.slice(i, i + WPU), n = lessons.length + 1;
      const kan = [];   // every JLPT kanji is taught in the JLPT course
      const lines = items.map(x => { const e = (x.ex || []).find(e => e.dkId === d.id) || (x.ex || []).find(e => e.e && plain(e.j).length <= 40); return e ? { j: e.j, e: e.e, au: e.dau || (e.au ? 's' + e.au : null), p: e.dpic || null } : null; }).filter(Boolean).slice(0, 8);
      const lvc = {}; items.forEach(x => { if (LV.includes(x.lvl)) lvc[x.lvl] = (lvc[x.lvl] || 0) + 1; });
      const lvl = Object.entries(lvc).sort((a, b) => b[1] - a[1]).map(e => e[0])[0] || 'N5';
      lessons.push({ id: `ak${short}-${String(n).padStart(3, '0')}`, tr: 'anki', deck: d.name, n, lvl, g: [], items, kan, kanji: kan.map(c => KMAP[c]), lines,
        t: items.slice(0, 3).map(x => x.w).join('・'), s: `Words: ${items.slice(0, 4).map(x => String(x.m).split(/[;,]/)[0]).join(', ')}` });
    }
    for (let i = 0, s = 1; i < lessons.length; i += STAGE, s++) {
      const members = lessons.slice(i, i + STAGE); members.forEach(u => { u.stage = s; units.push(u); });
      units.push({ id: `ak${short}-cp${String(s).padStart(2, '0')}`, cp: true, tr: 'anki', deck: d.name, lvl: members[0].lvl, stage: s, members, t: `Checkpoint ${s}`, s: `Review lessons ${members[0].n}–${members[members.length - 1].n}. Score ${CP_PASS}% to clear it.` });
    }
  }
  ANKI.units = units; ANKI.unitsSig = sig; return units;
}
/** a lesson whose words (and kanji) you already know: the Path skips past it */
/** the deck's order for new cards: words (and their kanji) from your deck come first */
const deckRk = x => x.kind === 'kanji' ? (ANKI.krank.has(x.k) ? ANKI.krank.get(x.k) : 1e9) : ANKI.rank.has(x.id) ? ANKI.rank.get(x.id) : 1e9;
const unitKnown = u => !u.cp && !u.exam && !u.core && !(u.g && u.g.length) && !!(u.items && u.items.length) && u.items.every(x => status(x.id) === 'known') && (u.kanji || []).every(k => status(k.id) === 'known');
function ankiCoverage(l) {
  const ws = ANKI.items.filter(x => x.lvl === l); return { n: ws.length, known: ws.filter(x => status(x.id) === 'known').length };
}

/* ---------- the import page ---------- */
function vAnki() {
  const D = ANKI.draft;
  if (ANKI.busy) return `<h1>Anki deck</h1><div class="card ak-busy"><div class="spin" aria-hidden="true"></div><p>${esc(ANKI.busy)}</p></div>`;
  if (ANKI.done) {
    const r = ANKI.done;
    return `<h1>${r.replaced ? 'Deck updated' : 'Deck added'}</h1><div class="card ak-done"><b>${esc(r.name)}</b>
      <ul class="ak-stats"><li><b>${fmtN(r.notes)}</b> words synced. <b>${fmtN(r.matched)}</b> are words the dojo already has, so they stay one word each, now with your deck’s sentence${r.voices && r.voiced ? ` and voice (${fmtN(r.voiced)} recordings)` : ''}</li>
        ${r.extra ? `<li><b>${fmtN(r.extra)}</b> words aren’t on the JLPT lists. They’re in My decks on the Path and the “My deck” word level</li>` : ''}
        ${r.seeded ? `<li><b>${fmtN(r.seeded)}</b> words keep your Anki progress: same review schedule, no starting over</li>` : ''}
        ${r.plan.map(p => `<li><b>${p.l} Path re-planned:</b> ${p.known ? `${fmtN(p.known)} words you already know won’t be taught again${p.saved ? ` (${fmtN(p.saved)} fewer lessons)` : ''}` : ''}${p.known && p.first ? '; ' : ''}${p.first ? `your deck’s other ${p.l} words come first, over the next ${fmtN(p.first)} lessons` : ''}</li>`).join('')}</ul>
      <div class="btnrow"><button class="btn" onclick="App.ptab('jlpt');App.go('path')">See your Path</button>${r.extra ? `<button class="btn line" onclick="App.ptab('anki');App.go('path')">Deck extras</button>` : ''}<button class="btn line" onclick="App.go('home')">Home</button></div></div>`;
  }
  if (!D) return `<h1>Anki deck</h1><div class="card"><p>Choose an .apkg file exported from Anki.</p><button class="btn" onclick="$('#ankiFile').click()">Choose a deck</button></div>`;
  const t = D.types[D.ti], P = D.P, opt = i => i < 0 ? '' : esc(P[i].name);
  const sel = role => `<select onchange="App.ankiMap('${role}', this.value)"><option value="-1"${D.map[role] < 0 ? ' selected' : ''}>(none)</option>${P.map(p => `<option value="${p.i}"${D.map[role] === p.i ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`;
  const prev = t.notes.slice(0, 4).map(n => ankiNote(n, D.map));
  const ok = prev.filter(x => x.w && x.m).length;
  const card = x => `<div class="ak-prev"><div class="ak-w jp">${x.f ? ruby(x.f, true) : esc(x.w || '—')}</div><div class="ak-r">${esc(x.r || '')}${x.r ? ` · ${esc(toRomaji(x.r))}` : ''}</div><div class="ak-m">${esc(x.m || '(no meaning found)')}</div>${x.sj ? `<div class="ak-s jp">${ruby(x.sj, true)}</div><div class="ak-se">${esc(x.se)}</div>` : ''}<div class="ak-media">${x.wa ? '<span>🔊 word</span>' : ''}${x.sa ? '<span>🔊 sentence</span>' : ''}${x.pic ? '<span>🖼 picture</span>' : ''}${x.ivl ? `<span>Anki: every ${x.ivl} d</span>` : ''}</div></div>`;
  const reviewed = t.notes.filter(n => n.card && n.card.type > 0).length;
  return `<h1>Add “${esc(D.name)}”</h1>
    <p class="sub">${fmtN(t.notes.length)} notes${D.types.length > 1 ? ` of type “${esc(t.name)}”` : ''}. Check that each part of the card was found correctly, then add the deck. It stays on this device and is never uploaded.</p>
    ${D.types.length > 1 ? `<div class="card"><b>Note type</b> <select onchange="App.ankiType(this.value)">${D.types.map((x, i) => `<option value="${i}"${i === D.ti ? ' selected' : ''}>${esc(x.name)} (${fmtN(x.notes.length)})</option>`).join('')}</select></div>` : ''}
    <div class="ak-grid"><div class="card ak-map"><div class="label" style="margin-top:0">Fields</div>${ANKI_ROLES.map(([r, lab, hint]) => `<label class="ak-row"><span><b>${lab}</b><small>${hint}</small></span>${sel(r)}</label>`).join('')}</div>
    <div><div class="label" style="margin-top:0">Preview</div>${prev.map(card).join('')}${ok < prev.length ? `<p class="note warn">Some cards have no word or meaning with these fields. Pick the right fields on the left.</p>` : ''}</div></div>
    <div class="card ak-opts">
      <label><input type="checkbox" ${D.opts.voices ? 'checked' : ''} onchange="App.ankiOpt('voices', this.checked)"> <span><b>Use the deck’s recordings</b><small>Your deck’s words play its voice everywhere, including words the dojo already has</small></span></label>
      <label><input type="checkbox" ${D.opts.sentences ? 'checked' : ''} onchange="App.ankiOpt('sentences', this.checked)"> <span><b>Use the deck’s sentences</b><small>Shown first in each word’s examples and in lessons</small></span></label>
      <label><input type="checkbox" ${D.opts.pics ? 'checked' : ''} onchange="App.ankiOpt('pics', this.checked)"> <span><b>Use the deck’s pictures</b><small>They replace the dojo’s picture for those words everywhere: word cards, lessons, flashcards and picture quizzes</small></span></label>
      <label><input type="checkbox" ${D.opts.progress ? 'checked' : ''} onchange="App.ankiOpt('progress', this.checked)"> <span><b>Bring my Anki progress</b><small>${fmtN(reviewed)} of these cards have been studied in Anki. Words you’ve learned there count as known, and the Path skips lessons where you already know everything</small></span></label>
    </div>
    <div class="btnrow"><button class="btn" onclick="App.ankiSave()"${ok ? '' : ' disabled'}>Add the deck</button><button class="btn line" onclick="App.ankiCancel()">Cancel</button></div>`;
}
function ankiSettingsCard() {
  return `<div class="label">Anki decks</div>
  <div class="card"><span class="muted" style="font-size:13px">Add an Anki deck (.apkg) and the dojo syncs to it: the JLPT Path is re-planned around it (words you know aren’t taught again, the rest come in your deck’s order), your deck’s voices and sentences go on the same words here, and Anki progress carries over. Adding the same deck again updates it. The deck stays on this device.</span>
    ${ANKI.decks.map(d => `<div class="ak-deck"><div><b>${esc(d.name)}</b><span>${fmtN(d.notes.length)} words${d.media ? ` · ${fmtN(d.media)} recordings and pictures` : ''} · added ${new Date(d.imported).toLocaleDateString()}</span></div><button class="btn line sm" onclick="App.ankiRemove('${d.id}')">Remove</button></div>`).join('')}
    ${ANKI.decks.length ? `<div class="set" style="padding:10px 0 0"><div><b>Use my deck’s voice</b><span>Words in your deck play your deck’s recording everywhere. Turn off to keep the dojo’s own recording where it has one</span></div><label class="sw"><input type="checkbox" ${settings.deckVoice !== false ? 'checked' : ''} onchange="App.deckVoice(this.checked)"><span></span></label></div>` : ''}
    <div class="btnrow"><button class="btn sec" onclick="$('#ankiFile').click()">Add an Anki deck</button>${ANKI.decks.length ? `<button class="btn line" onclick="App.dquiz()">Quiz my decks</button>` : ''}</div>
    <input type="file" id="ankiFile" accept=".apkg,.colpkg,application/zip" style="display:none" onchange="App.ankiPick(this.files[0]); this.value=''">
  </div>`;
}
const ankiApp = {
  async ankiPick(file) {
    if (!file) return;
    if (!window.indexedDB) { toast('This browser can’t store decks'); return; }
    ANKI.done = null; ANKI.draft = null; S.view = 'anki'; S.session = null; App.closeSheet();
    const step = t => { ANKI.busy = t; if (S.view === 'anki') render(); };
    try {
      const r = await ankiRead(file, step);
      const { map, P } = ankiAutoMap(r.types[0]);
      ANKI.draft = Object.assign(r, { ti: 0, map, P, opts: { voices: true, sentences: true, pics: true, progress: true } });
    } catch (e) { toast('Couldn’t read that deck: ' + (e && e.message ? e.message : 'unknown error')); console.error(e); S.view = 'settings'; }
    ANKI.busy = ''; render(); window.scrollTo(0, 0);
  },
  ankiType(i) { const D = ANKI.draft; if (!D) return; D.ti = +i; const a = ankiAutoMap(D.types[D.ti]); D.map = a.map; D.P = a.P; render(); },
  ankiMap(role, v) { const D = ANKI.draft; if (!D) return; D.map[role] = +v; render(); },
  ankiOpt(k, v) { const D = ANKI.draft; if (!D) return; D.opts[k] = !!v; render(); },
  ankiCancel() { ANKI.draft = null; App.go('settings'); },
  async ankiSave() {
    const D = ANKI.draft; if (!D) return;
    const step = t => { ANKI.busy = t; render(); };
    try {
      step('Saving your deck…');
      const deck = await ankiSave(D, step);
      if (DATA.mode === 'full') { step('Matching words to the dictionary…'); await loadAllVocab().catch(() => {}); }
      const replaced = ANKI.decks.some(x => x.id === deck.id);
      ANKI.decks = ANKI.decks.filter(x => x.id !== deck.id).concat(deck); ANKI.sig = ''; ankiApply();
      const mine = ANKI.items.filter(x => (x.dks || [x.dkId]).includes(deck.id));
      const seeded = D.opts.progress ? ankiSeed(deck) : 0;
      if (!settings.levels.includes('ANKI')) { settings.levels.push('ANKI'); saveSettings(); }
      const plan = LV.map(l => { if (!(DATA.vocab[l] || []).length) return null; planUnits(l); const st = PLAN[l].stats; return st.known || st.deckFirst ? { l, known: st.known, first: st.deckFirst, saved: st.saved } : null; }).filter(Boolean);
      ANKI.done = { name: deck.name, replaced, notes: deck.notes.length, matched: mine.filter(x => x.lvl !== 'ANKI').length, extra: mine.filter(x => x.lvl === 'ANKI').length, voiced: mine.filter(x => x.lvl !== 'ANKI' && x.dau).length, media: deck.media, voices: D.opts.voices, seeded, plan };
      ANKI.draft = null;
    } catch (e) { console.error(e); toast(e && e.name === 'QuotaExceededError' ? 'Not enough storage space on this device for the deck' : 'Could not save the deck: ' + (e && e.message || e)); }
    ANKI.busy = ''; render(); window.scrollTo(0, 0);
  },
  async ankiRemove(id) { const d = ANKI.decks.find(x => x.id === id); if (!d || !confirm(`Remove “${d.name}” from this device? Your progress on its words stays.`)) return; await ankiRemove(id); toast('Deck removed'); render(); },
  deckVoice(v) { settings.deckVoice = !!v; saveSettings(); ANKI.sig = ''; ankiApply(); render(); }
};

/* ---------- Deck quiz: test yourself on your Anki decks instead of flipping cards ----------
   Mixed question types from each card: meaning, word, reading, listening (the deck's voice),
   picture, your deck's sentence with the word blanked out, and what the sentence means.
   Every answer updates that word's review schedule. */
const inDecks = (x, ids) => (x.dks || [x.dkId]).some(d => ids.has(d));
function ankiQuizPool(sel, focus) {
  const ids = new Set(sel), now = Date.now();
  let pool = ANKI.items.filter(x => inDecks(x, ids));
  if (focus === 'due') pool = pool.filter(x => progress[x.id] && (isDue(x.id, now) || status(x.id) === 'learning'));
  else if (focus === 'weak') pool = pool.filter(x => progress[x.id] && progress[x.id].w > 0).sort((a, b) => progress[b.id].w / (progress[b.id].c + 1) - progress[a.id].w / (progress[a.id].c + 1));
  else if (focus === 'new') pool = pool.filter(x => !progress[x.id]);
  return pool;
}
const deckSent = (x, needWord) => (x.ex || []).find(e => e.dk && e.e && plain(e.j).length <= 60 && (!needWord || plain(e.j).includes(x.w)));
function ankiQ(kind, x, pool) {
  const others = (n, f) => shuffle(pool.filter(y => y !== x && y.id !== x.id && f(y))).slice(0, n);
  if (kind === 'mean') return makeQ('vocab', x, 'jp2en');
  if (kind === 'word') return makeQ('vocab', x, 'en2jp');
  if (kind === 'pic') return makeQ('vocab', x, 'p2w');
  if (kind === 'read') {
    const wrong = [...new Set([...mutateReading(x.r), ...others(6, y => y.r !== x.r && Math.abs(y.r.length - x.r.length) <= 1).map(y => y.r)])].filter(r => r !== x.r).slice(0, 3);
    if (wrong.length < 3) return null;
    return { item: x, au: x.au, hint: 'How do you read this word?', grid: true, meta: '<span class="tag">読み</span>', prompt: `<div class="pword jp">${esc(x.w)}</div>`,
      opts: shuffle([x.r, ...wrong]).map(r => ({ html: `<span class="jp cjp">${esc(r)}</span>`, ok: r === x.r })) };
  }
  if (kind === 'listen') {
    if (!x.au) return null;
    const ws = others(3, y => y.w !== x.w); if (ws.length < 3) return null;
    return { item: x, au: x.au, autoplay: x.au, hint: 'Which word do you hear?', grid: true, meta: '<span class="tag">聴解</span>', prompt: `<button class="listen" data-audio="${esc(x.au)}">🔊 Play</button><div class="proma">Tap to hear it again</div>`,
      opts: shuffle([x, ...ws]).map(y => ({ html: `<span class="jp cjp">${esc(y.w)}</span>`, ok: y === x })) };
  }
  if (kind === 'cloze') {
    const e = deckSent(x, true); if (!e) return null;
    const p = plain(e.j), i = p.indexOf(x.w); let ws = others(3, y => y.w !== x.w && posBucket(y.pos) === posBucket(x.pos) && !p.includes(y.w));
    if (ws.length < 3) ws = others(3, y => y.w !== x.w && !p.includes(y.w));   // same kind of word if possible
    if (i < 0 || ws.length < 3) return null;
    const sent = sentHtml(fillFuri(e.j), i, x.w.length, '<span class="blank">　</span>');   // keeps the deck's own furigana around the blank
    return { item: x, au: e.dau || x.au, hint: 'Fill the blank', grid: true, meta: '<span class="tag">文</span>', prompt: `<div class="psent jp">${sent}</div><div class="proma">${esc(e.e)}</div>`,
      opts: shuffle([x, ...ws]).map(y => ({ html: `<span class="jp cjp">${ruby(y.f || y.w)}</span>`, ok: y === x })) };
  }
  if (kind === 'sent') {
    const e = deckSent(x); if (!e) return null;
    const wrong = shuffle(pool.filter(y => y !== x).map(y => deckSent(y)).filter(f => f && f.e !== e.e)).slice(0, 3);
    if (wrong.length < 3) return null;
    return { item: x, noCard: true, au: e.dau || null, hint: 'What does this sentence mean?', grid: false, meta: '<span class="tag">読解</span>', prompt: `<div class="psent jp">${ruby(fillFuri(e.j), true)}</div>`,
      opts: shuffle([{ html: esc(e.e), ok: true }, ...wrong.map(f => ({ html: esc(f.e), ok: false }))]) };
  }
  return null;
}
function ankiQuizQ(x, pool) {
  const kinds = ['mean', 'word'];
  if (hanOf(x.w).length && x.r && x.r !== x.w) kinds.push('read', 'read');
  if (x.au) kinds.push('listen', 'listen');
  if (picAsk(x)) kinds.push('pic');
  if (deckSent(x, true)) kinds.push('cloze', 'cloze');
  if (deckSent(x)) kinds.push('sent');
  for (const k of shuffle(kinds)) { const q = ankiQ(k, x, pool); if (q) return q; }
  return null;
}
function ankiStartQuiz() {
  const D = S.dq || {}, sel = D.sel && D.sel.length ? D.sel : ANKI.decks.map(d => d.id);
  const pool = ankiQuizPool(sel, D.focus || 'mix');
  if (!pool.length) { toast('No words for that choice yet. Try “Mixed”'); return; }
  const n = D.n || 20, picked = (D.focus === 'weak' ? pool : shuffle(pool)).slice(0, n);
  const all = ANKI.items.length >= 8 ? ANKI.items : V;
  const qs = picked.map(x => ankiQuizQ(x, all)).filter(Boolean);
  if (!qs.length) { toast('Not enough words in your decks for a quiz yet'); return; }
  const u = { id: 'deck-quiz', tr: 'quiz', quiz: true, lvl: 'N5', t: 'Deck quiz', s: '', g: [], items: picked };
  S.lesson = { u, words: picked, kanji: [], steps: ['quiz', 'done'], i: 0, showEn: {}, quiz: { qs, i: 0, answered: false, chosen: -1, ok: 0, n: 0, missed: [] }, xp0: game.xp };
  S.session = null; S.view = 'lesson'; render(); window.scrollTo(0, 0);
  if (qs[0].autoplay) setTimeout(() => playAudio(qs[0].autoplay), 300);
}
function vDquiz() {
  if (!ANKI.decks.length) return `<h1>Deck quiz</h1><div class="card"><p>Add an Anki deck first (Settings → Anki decks). Then you can quiz yourself on it here.</p><button class="btn" onclick="App.go('settings')">Open Settings</button></div>`;
  const D = S.dq = S.dq || { sel: ANKI.decks.map(d => d.id), n: 20, focus: 'mix' };
  D.sel = D.sel.filter(id => ANKI.decks.some(d => d.id === id)); if (!D.sel.length) D.sel = ANKI.decks.map(d => d.id);
  const cnt = f => ankiQuizPool(D.sel, f).length;
  const focus = [['mix', 'Mixed', 'Any word from your decks'], ['due', 'Due', 'Words due for review or still being learned'], ['weak', 'Weak spots', 'Words you’ve got wrong before, worst first'], ['new', 'New', 'Words you haven’t studied yet']];
  return `<h1>Deck quiz</h1><p class="sub">Test what you know from your Anki decks with mixed questions: meaning, word, reading, listening to your deck’s voice, pictures and your deck’s sentences. Every answer updates that word’s reviews.</p>
    <div class="card dq"><div class="label" style="margin-top:0">Decks</div>
      <div class="chips">${ANKI.decks.map(d => `<button class="chip ${D.sel.includes(d.id) ? 'on' : ''}" onclick="App.dqDeck('${d.id}')">${esc(d.name)} <span class="muted">${fmtN(ANKI.items.filter(x => inDecks(x, new Set([d.id]))).length)}</span></button>`).join('')}</div>
      <div class="label">What to practise</div>
      <div class="dq-focus">${focus.map(([k, l, h]) => { const c = cnt(k); return `<button class="dq-f ${D.focus === k ? 'on' : ''}" onclick="App.dqSet('focus','${k}')"${c ? '' : ' disabled'}><b>${l}</b><span>${h}</span><i>${fmtN(c)}</i></button>`; }).join('')}</div>
      <div class="label">Questions</div>${seg([['10', '10'], ['20', '20'], ['30', '30'], ['50', '50']], String(D.n), 'App.dqN')}
      <button class="btn" style="margin-top:16px" onclick="App.dqStart()">Start the quiz</button></div>`;
}
Object.assign(ankiApp, {
  dquiz() { App.closeSheet(); S.session = null; S.lesson = null; S.view = 'dquiz'; render(); window.scrollTo(0, 0); },
  dqDeck(id) { const D = S.dq; const i = D.sel.indexOf(id); if (i >= 0) { if (D.sel.length > 1) D.sel.splice(i, 1); } else D.sel.push(id); render(); },
  dqSet(k, v) { S.dq[k] = v; render(); },
  dqN(v) { S.dq.n = +v; render(); },
  dqStart() { ankiStartQuiz(); }
});


