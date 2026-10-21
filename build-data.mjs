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
 *   Word audio          (CC BY-SA 4.0, Tofugu & WaniKani) tofugu/japanese-vocabulary-pronunciation-audio (optional)
 *   Word audio, more    (CC BY 4.0, Kanji alive)  example-word recordings for 1,235 kanji (optional)
 *   Sentence audio      (per recording, Tatoeba)   native recordings; only ones with a reuse licence (optional)
 *   Pictures            (CC BY-SA 4.0, OpenMoji)  pictures for words and kanji you can draw (optional)
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
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

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
const SENT_AUDIO = USE_TATOEBA && !flag('no-sentence-audio');
const MAX_SAUD = Math.max(0, +opt('max-sentence-audio', 6000));
const COMMERCIAL_ONLY = flag('commercial-audio-only');
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
    links: { urls: ['https://downloads.tatoeba.org/exports/per_language/jpn/jpn-eng_links.tsv.bz2'], local: /^jpn-eng_links\.tsv(\.bz2)?$/i },
    audio: { urls: ['https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2'], local: /^sentences_with_audio\.(tar\.bz2|tsv|csv)$/i }
  },
  kaData:  { urls: ['https://raw.githubusercontent.com/kanjialive/kanji-data-media/master/language-data/ka_data.csv'], local: /^ka_data\.csv$/i },
  kaAudio: { urls: ['https://media.kanjialive.com/examples_audio/audio-mp3.zip'], local: /^audio-mp3\.zip$/i }
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

/* ---------------------------------------------------------------- word audio (WaniKani / Tofugu) */
const AUDIO_REPO = 'https://github.com/tofugu/japanese-vocabulary-pronunciation-audio';
/** Folder of mp3 files named like 読む【よむ】.mp3. Uses --audio-dir, a folder in --from-dir, or a sparse git clone. */
function getAudioDir() {
  if (flag('no-audio')) return null;
  const look = base => {
    for (const d of [base, path.join(base, 'lib', 'mp3'), path.join(base, 'mp3'), path.join(base, 'japanese-vocabulary-pronunciation-audio', 'lib', 'mp3')])
      if (fs.existsSync(d) && fs.statSync(d).isDirectory() && fs.readdirSync(d).some(n => /【.+】\.mp3$/.test(n))) return d;
    return null;
  };
  if (opt('audio-dir')) return look(path.resolve(opt('audio-dir')));
  if (FROM) { const d = look(FROM); if (!d) warn('no audio folder in --from-dir, skipping word audio'); return d; }
  const dest = path.join(CACHE, 'wk-audio');
  try {
    if (!look(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
      log('  cloning word audio (mp3 only)');
      execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', AUDIO_REPO, dest], { stdio: 'inherit' });
      execFileSync('git', ['-C', dest, 'sparse-checkout', 'set', 'lib/mp3'], { stdio: 'inherit' });
    } else log('  cached word audio');
    return look(dest);
  } catch (e) { warn('word audio: ' + e.message); return null; }
}

/* ---------------------------------------------------------------- pictures (OpenMoji, CC BY-SA 4.0)
   A word or kanji gets a picture only when its meaning is something you can draw.
   1) hand-picked table per part of speech (verbs / adjectives / nouns) — checked first
   2) for nouns and kanji only: an OpenMoji whose name is exactly the meaning ("dog", "train")
   Verbs and adjectives never fall through to name matching (that's how "to fly" becomes an insect). */
const PIC_VERB = 'eat:🍽️|drink:🥤|sleep:😴|wake up:⏰|get up:⏰|walk:🚶|run:🏃|swim:🏊|read:📖|write:✍️|listen:🎧|hear:👂|see:👀|look:👀|look at:👀|watch:📺|speak:🗣️|talk:💬|say:💬|buy:🛒|sell:🏷️|cook:🍳|study:📚|learn:📚|teach:🧑‍🏫|work:💼|think:🤔|laugh:😂|cry:😢|sing:🎤|dance:💃|drive:🚗|fly:✈️|call:📞|telephone:📞|wash:🧼|bathe:🛁|take a bath:🛁|open:🔓|close:🔒|shut:🔒|wait:⏳|take a photo:📸|photograph:📸|send:📤|receive:📥|pay:💳|rest:🛌|sit:🪑|sit down:🪑|stand:🧍|stand up:🧍|meet:🤝|give:🎁|love:❤️|like:👍|remember:💭|cut:✂️|climb:🧗|ride:🚃|get on:🚃|board:🚃|turn:↪️|cross:🚸|carry:📦|clean:🧹|smoke:🚬|fish:🎣|grow:🌱|be born:👶|marry:💍|get married:💍|win:🏆|begin:🏁|start:🏁|finish:🏁|end:🏁|hug:🤗|shower:🚿|draw:🎨|paint:🎨|worry:😟|be surprised:😲|get angry:😠|be angry:😠|get tired:😩|be tired:😩|tire:😩|throw:🤾|kick:⚽|push:👉|play:🎲|travel:✈️|exercise:🏋️|train:🏋️|stretch:🤸|lose weight:⚖️|gain weight:⚖️|rain:🌧️|snow:🌨️|shine:☀️|blow:🌬️|cool:🍃|heat:🔥|warm:🔥|sweat:💦|cough:😷|sneeze:🤧|smile:😊|kiss:💋|knock:✊|dress:👕|put on:👕|wear:👕|take off:👕|brush:🪥|cook rice:🍚|bake:🍞|boil:♨️|fry:🍳|pour:🫗|mix:🥣|ring:🔔|count:🔢|measure:📏|lock:🔒|knit:🧶|sew:🧵|plant:🌱|water:🚿|steal:🦹|fight:🥊|hit:🥊|search:🔍|look for:🔍|find:🔍';
const PIC_ADJ = 'okay:👌|all right:👌|fine:👌|hot:🥵|cold:🥶|warm:🌤️|cool:🍃|big:🐘|large:🐘|small:🐜|little:🐜|tall:🦒|high:🔝|expensive:💰|cheap:🏷️|delicious:😋|tasty:😋|sweet:🍬|spicy:🌶️|salty:🧂|sour:🍋|happy:😊|glad:😊|sad:😢|lonely:😔|scary:😱|frightening:😱|afraid:😱|fun:🎉|enjoyable:🎉|interesting:🤩|busy:⏱️|sleepy:😪|painful:🤕|sore:🤕|cute:🥰|beautiful:🌸|pretty:🌸|clean:✨|new:🆕|old:🏚️|young:🧒|fast:⚡|quick:⚡|slow:🐢|early:🌅|heavy:🏋️|light:🪶|strong:💪|bright:💡|dark:🌑|quiet:🤫|noisy:📢|loud:📢|healthy:💪|energetic:💪|famous:⭐|kind:😇|red:🔴|blue:🔵|white:⚪|black:⚫|yellow:🟡|green:🟢|brown:🟤|long:📏|short:🤏|near:📍|close:📍|far:🔭|wide:↔️|angry:😠|difficult:🧩|hard:🧩|easy:👌|convenient:👍|dangerous:⚠️|safe:🛡️|free:🆓|full:🈵|empty:🈳|round:⚪|sick:🤒|ill:🤒|tired:😩|embarrassed:😳|surprised:😲|cloudy:☁️|sunny:☀️|rainy:🌧️|thin:🥢|fat:🍔|good at:👍|skilful:👍|rich:💰|poor:🪙|delightful:😊|soft:🧸|hard (firm):🪨|wet:💦|dry:🏜️|deep:🌊|shallow:🏖️|round (shape):⚪|square:🟥|sharp:🔪|smelly:🦨|bitter:☕|lucky:🍀|sick (ill):🤒';
const PIC_NOUN = 'water:💧|tree:🌳|wood:🪵|person:🧑|people:👥|human:🧑|man:👨|woman:👩|child:🧒|children:🧒|kid:🧒|baby:👶|mother:👩|father:👨|parents:👪|family:👪|friend:🧑‍🤝‍🧑|teacher:🧑‍🏫|student:🧑‍🎓|doctor:🧑‍⚕️|police:👮|police officer:👮|police box:👮|hand:✋|foot:🦶|leg:🦵|face:🙂|body:🧍|tooth:🦷|teeth:🦷|hair:💇|heart:❤️|rain:🌧️|snow:❄️|cloud:☁️|wind:🌬️|sky:🌤️|river:🏞️|stream:🏞️|sea:🌊|ocean:🌊|wave:🌊|mountain:⛰️|moon:🌙|star:⭐|flower:🌸|cherry blossom:🌸|cherry blossoms:🌸|rice:🍚|cooked rice:🍚|rice (cooked):🍚|meal:🍱|breakfast:🍳|lunch:🍱|dinner:🍽️|bread:🍞|meat:🍖|fish:🐟|egg:🥚|eggs:🥚|vegetable:🥦|vegetables:🥦|fruit:🍎|apple:🍎|tea:🍵|green tea:🍵|coffee:☕|beer:🍺|alcohol:🍶|sake:🍶|milk:🥛|juice:🧃|house:🏠|home:🏠|school:🏫|station:🚉|railway station:🚉|train:🚃|bus:🚌|car:🚗|automobile:🚗|taxi:🚕|bicycle:🚲|bike:🚲|airplane:✈️|aeroplane:✈️|plane:✈️|airport:🛫|ship:🚢|boat:⛵|hotel:🏨|hospital:🏥|bank:🏦|shop:🏪|store:🏪|convenience store:🏪|department store:🏬|post office:🏣|park:🏞️|library:📚|toilet:🚻|restroom:🚻|bathroom:🛁|room:🚪|door:🚪|window:🪟|chair:🪑|bed:🛏️|book:📕|books:📚|newspaper:📰|letter:✉️|envelope:✉️|telephone:☎️|phone:📱|mobile phone:📱|smartphone:📱|computer:💻|television:📺|tv:📺|camera:📷|photograph:📷|photo:📷|picture:🖼️|painting:🖼️|drawing:🖼️|music:🎵|song:🎵|movie:🎬|film:🎬|game:🎮|sport:⚽|sports:⚽|soccer:⚽|baseball:⚾|money:💴|yen:💴|ticket:🎫|map:🗺️|umbrella:☂️|clothes:👕|clothing:👕|shirt:👕|shoes:👟|hat:👒|bag:👜|key:🔑|lock:🔒|clock:🕰️|watch:⌚|time:⏰|hour:⏰|morning:🌅|night:🌙|evening:🌆|today:📅|tomorrow:📅|yesterday:📅|day:📅|date:📅|calendar:📅|week:🗓️|month:🗓️|year:🗓️|spring:🌸|summer:🌻|autumn:🍁|fall:🍁|winter:⛄|weather:🌤️|sun:☀️|sunshine:☀️|fire:🔥|earth:🌍|world:🌍|globe:🌍|japan:🗾|island:🏝️|cat:🐈|dog:🐕|bird:🐦|horse:🐎|cow:🐄|pig:🐖|insect:🐛|bug:🐛|chopsticks:🥢|cup:🥤|glass:🥛|plate:🍽️|knife:🔪|spoon:🥄|medicine:💊|drug:💊|fever:🤒|cold:🤧|a cold:🤧|cold (illness):🤧|injury:🩹|wound:🩹|gift:🎁|present:🎁|souvenir:🎁|birthday:🎂|party:🎉|festival:🏮|temple:🛕|shrine:⛩️|castle:🏯|hot spring:♨️|hot springs:♨️|kimono:👘|sushi:🍣|ramen:🍜|noodles:🍜|curry:🍛|rice ball:🍙|boxed lunch:🍱|lunch box:🍱|bento:🍱|cake:🍰|sweets:🍬|candy:🍬|ice cream:🍦|salt:🧂|gym:🏋️|exercise:🏋️|training:🏋️|strength training:🏋️|muscle:💪|muscles:💪|muscle soreness:💪|sweat:💦|weight:⚖️|body weight:⚖️|number:🔢|east:🧭|west:🧭|south:🧭|north:🧭|direction:🧭|right:➡️|left:⬅️|up:⬆️|above:⬆️|top:⬆️|down:⬇️|below:⬇️|under:⬇️|entrance:🚪|exit:🚪|road:🛣️|way:🛣️|street:🛣️|bridge:🌉|traffic light:🚦|traffic lights:🚦|signal:🚦|language:🗣️|word:💬|words:💬|japanese:🗾|japanese language:🗾|english:🔤|question:❓|answer:💡|homework:📝|test:📝|exam:📝|examination:📝|job:💼|work:💼|company:🏢|office:🏢|meeting:👥|business card:📇|email:📧|e-mail:📧|mail:📧|document:📄|documents:📄|paper:📄|deadline:⏰|salary:💴|holiday:🏖️|vacation:🏖️|day off:🏖️|trip:🧳|travel:✈️|journey:🧳|passport:🛂|luggage:🧳|baggage:🧳|suitcase:🧳|reservation:📋|booking:📋|seat:💺|menu:📋|order:📝|bill:🧾|receipt:🧾|cash:💴|card:💳|credit card:💳|discount:🏷️|sale:🏷️|price:🏷️|size:📏|colour:🎨|color:🎨|ambulance:🚑|fire engine:🚒|earthquake:🫨|typhoon:🌀|cloudy weather:☁️|sunny weather:☀️|temperature:🌡️|rainy season:☔|hobby:🎨|cooking:🍳|cuisine:🍳|happiness:😊|worry:😟|nervousness:😬|relief:😌|love:❤️|dream:💭|idea:💡|light:💡|lamp:💡|electricity:⚡|picture book:📖|sound:🔊|noise:🔊|voice:🗣️|name:📛|okay:👌|ok:👌|all right:👌|grandfather:👴|grandmother:👵|bath:🛁|shower:🚿|mirror:🪞|soap:🧼|towel:🧺|box:📦|stamp:📮|pen:🖊️|pencil:✏️|notebook:📓|dictionary:📖|glasses:👓|eyeglasses:👓|nose:👃|ear:👂|eye:👁️|eyes:👀|mouth:👄|lips:👄|neck:🧣|finger:☝️|arm:💪|bone:🦴|blood:🩸|tooth decay:🦷|dentist:🦷|nurse:🧑‍⚕️|pharmacy:💊|chemist:💊|police station:🚓|fire station:🚒|stairs:🪜|elevator:🛗|lift:🛗|escalator:🛗|front desk:🛎️|reception:🛎️|towels:🧺|internet:🌐|website:🌐|smartphone app:📱|desk:🗄️|table:🍽️|kitchen:🍳|garden:🌷|grass:🌿|leaf:🍃|leaves:🍂|forest:🌲|woods:🌲|stone:🪨|rock:🪨|sand:🏖️|beach:🏖️|field:🌾|rice field:🌾|rice paddy:🌾|village:🏘️|town:🏘️|city:🏙️|capital:🏙️|building:🏢|tower:🗼|tokyo tower:🗼|mt fuji:🗻|mount fuji:🗻|fuji:🗻|bamboo:🎍|pine:🌲|maple:🍁|rose:🌹|sunflower:🌻|tulip:🌷|mushroom:🍄|potato:🥔|carrot:🥕|tomato:🍅|onion:🧅|garlic:🧄|corn:🌽|banana:🍌|grape:🍇|grapes:🍇|strawberry:🍓|peach:🍑|orange:🍊|mandarin orange:🍊|lemon:🍋|melon:🍈|watermelon:🍉|pear:🍐|cherry:🍒|chicken:🐔|chicken (meat):🍗|beef:🥩|pork:🥓|tofu:🍢|soup:🍲|miso soup:🍲|pizza:🍕|hamburger:🍔|sandwich:🥪|cookie:🍪|chocolate:🍫|honey:🍯|water bottle:🧴|bottle:🍾|can:🥫|snake:🐍|mouse:🐁|rat:🐀|rabbit:🐇|bear:🐻|monkey:🐒|elephant:🐘|lion:🦁|tiger:🐅|fox:🦊|frog:🐸|turtle:🐢|whale:🐋|dolphin:🐬|octopus:🐙|crab:🦀|shrimp:🦐|butterfly:🦋|bee:🐝|ant:🐜|spider:🕷️|duck:🦆|crow:🐦‍⬛|owl:🦉|dragon:🐉|ghost:👻|robot:🤖|king:🤴|queen:👸|prince:🤴|princess:👸|soldier:💂|army:🪖|war:⚔️|peace:☮️|god:⛩️|buddha:🛕|church:⛪|guitar:🎸|piano:🎹|drum:🥁|violin:🎻|singer:🎤|concert:🎤|ball:⚽|tennis:🎾|basketball:🏀|golf:⛳|swimming:🏊|skiing:🎿|marathon:🏃|bicycle race:🚴|race:🏁|trophy:🏆|medal:🥇|prize:🏆|ring:💍|wedding:💒|marriage:💍|jewel:💎|gem:💎|treasure:💎|crown:👑|scissors:✂️|hammer:🔨|tool:🔧|tools:🛠️|machine:⚙️|battery:🔋|candle:🕯️|flashlight:🔦|magnet:🧲|microscope:🔬|telescope:🔭|rocket:🚀|space:🌌|planet:🪐|satellite:🛰️|cigarette:🚬|newspaper article:📰|magazine:📰|novel:📖|story:📖|poem:📜|letter (alphabet):🔤|alphabet:🔤|kanji:🈁|calendar page:📅|one:1️⃣|two:2️⃣|three:3️⃣|four:4️⃣|five:5️⃣|six:6️⃣|seven:7️⃣|eight:8️⃣|nine:9️⃣|ten:🔟|hundred:💯|thousand:💴|ten thousand:💴|half:🌗|circle:⭕|yes:⭕|no:❌|ok:👌|danger:⚠️|help:🆘|sos:🆘|emergency:🚨|rice plant:🌾|grain:🌾|wheat:🌾|thread:🧵|cloth:🧶|silk:🧵|paper (sheet):📄|wall:🧱|roof:🏠|garden (japanese):🏯|pond:🪷|lake:🏞️|valley:🏞️|hill:⛰️|volcano:🌋|desert:🏜️|snowman:☃️|ice:🧊|steam:♨️|smoke:💨|thunder:⚡|lightning:⚡|rainbow:🌈|fog:🌫️|tornado:🌪️|sunrise:🌅|sunset:🌇|shadow:👤|crowd:👥|guest:🛎️|customer:🛎️|waiter:🧑‍🍳|chef:🧑‍🍳|cook:🧑‍🍳|farmer:🧑‍🌾|scientist:🧑‍🔬|artist:🧑‍🎨|pilot:🧑‍✈️|firefighter:🧑‍🚒|judge:🧑‍⚖️|office worker:🧑‍💼|company employee:🧑‍💼|boss:🧑‍💼|colleague:🧑‍💼|president:🧑‍💼|department manager:🧑‍💼';
/* emoji names that are the wrong sense of a common meaning, never matched by name */
const PIC_NAME_SKIP = new Set(['fly', 'bat', 'pen', 'fork', 'rose', 'jack', 'mail', 'can', 'bow', 'match', 'nail', 'seal', 'pound', 'bar', 'trunk', 'kite', 'spring', 'pitcher', 'tie', 'organ', 'palm', 'chip', 'chips', 'bill', 'jam', 'bank', 'date', 'trip', 'ring', 'cold', 'light', 'right', 'left', 'top', 'cut', 'drill', 'saw', 'file', 'rule', 'scale', 'sheet', 'net', 'ward', 'arms', 'lead', 'mine', 'rock']);
/* pictographic kanji: the picture the character grew out of */
const KANJI_PICS = new Map([...'日☀️月🌙山⛰️川🏞️木🌳林🌳森🌲火🔥水💧土🌱金💰人🧑口👄目👁️耳👂手✋足🦶田🌾雨🌧️女👩男👨子🧒車🚗門🚪犬🐕魚🐟鳥🐦馬🐎牛🐄竹🎋花🌸草🌿石🪨米🍚糸🧵貝🐚虫🐛雪❄️電⚡本📕力💪王👑玉💎刀🔪弓🏹矢🏹舟⛵船🚢心❤️羊🐑豚🐖象🐘竜🐉亀🐢皿🍽️箱📦傘☂️桜🌸梅🌸菊🌼星⭐空🌤️海🌊池🪷島🏝️橋🌉家🏠店🏪駅🚉'.matchAll(/(\p{Script=Han})([^\p{Script=Han}]+)/gu)].map(m => [m[1], m[2]]));
const parsePics = str => new Map(str.split('|').map(p => { const i = p.lastIndexOf(':'); return [p.slice(0, i), p.slice(i + 1)]; }));
/* more hand-picked pictures for common N5–N4 words (these win where both list a meaning) */
const PIC_NOUN_MORE = `university:🎓|college:🎓|graduation:🎓|classroom:🏫|junior high school:🏫|high school:🏫|elementary school:🏫|café:☕|cafe:☕|coffee shop:☕|tearoom:☕|cafeteria:🍽️|dining hall:🍽️|restaurant:🍽️|embassy:🏛️|museum:🏛️|art museum:🖼️|art gallery:🖼️|intersection:🚦|crossing:🚸|vase:🏺|flower vase:🏺|postage stamp:📮|postage stamps:📮|postal stamps:📮|postcard:📮|ashtray:🚬|refrigerator:🧊|fridge:🧊|greengrocer:🥬|vegetable store:🥬|barber:💈|barber's:💈|barbershop:💈|barber's shop:💈|zoo:🦁|doll:🪆|futon:🛏️|glove:🧤|gloves:🧤|comic:📖|comic book:📖|judo:🥋|diary:📔|journal:📔|injection:💉|drawer:🗄️|scenery:🏞️|landscape:🏞️|coast:🏖️|seashore:🏖️|inn:🏨|japanese inn:🏨|vehicle:🚗|express train:🚄|limited express:🚄|parking lot:🅿️|parking:🅿️|weather forecast:🌦️|broadcasting:📡|broadcast:📡|television program:📺|tv program:📺|countryside:🌾|rural area:🌾|buddhist temple:🛕|population:👥|science:🔬|mathematics:➗|math:➗|literature:📚|geography:🗺️|industry:🏭|telegram:📨|air:💨|cherry-blossom viewing:🌸|cherry blossom viewing:🌸|sightseeing:📸|hot water:♨️|dance:💃|dancing:💃|uncooked rice:🌾|husband:👨|wife:👩|daughter:👧|son:👦|uncle:👨|aunt:👩|adult:🧑|shopping:🛍️|food:🍱|drink:🥤|beverage:🥤|animal:🐾|animals:🐾|chicken meat:🍗|illness:🤒|sickness:🤒|disease:🤒|laundry:🧺|washing:🧺|cleaning:🧹|sweeping:🧹|suit:👔|men's suit:👔|business suit:👔|western-style clothes:👗|eye glasses:👓|spectacles:👓|black tea:🫖|rice bowl:🍚|zero:0️⃣|monday:🌙|tuesday:🔥|wednesday:💧|thursday:🌳|friday:💰|saturday:🌱|sunday:☀️|study:📚|practice:🏋️|practise:🏋️|homework:📝|shrine:⛩️|new year:🎍|new year's day:🎍|summer vacation:🏖️|summer holiday:🏖️|lunch break:🍱|zoo animal:🦁|science laboratory:🔬|laboratory:🔬|teacher's office:🏫|newspaper company:📰|driver:🚗|chauffeur:🚗|clerk:🧑‍💼|shop assistant:🧑‍💼|receptionist:🛎️|reception desk:🛎️|government worker:🧑‍💼|citizen:🧑|section manager:🧑‍💼|company president:🧑‍💼|principal:🧑‍🏫|headmaster:🧑‍🏫|girlfriend:👩|boyfriend:👨|rich person:💰|exhibition:🖼️|graduation ceremony:🎓|invitation:✉️|explanation:💬|opinion:💬|conversation:💬|consultation:💬|meeting:👥|conference:👥|conference room:👥|heating:🌡️|electric light:💡|light bulb:💡|water supply:🚰|water service:🚰|tap water:🚰|rule:📏|regulation:📏|plan:📋|schedule:📅|education:🧑‍🏫|culture:🎎|society:👥|experience:🧗|safety:🦺|security:🛡️|traffic:🚗|transportation:🚌|departure:🛫|attendance:🙋|pronunciation:🗣️|preparation:📋|review:📝|diary entry:📔|cotton:🧵|doll festival:🎎|camera:📷|tea ceremony:🍵`;
const PIC_VERB_MORE = `bloom:🌸|flower:🌸|answer:🙋|reply:💬|arrive:📍|arrive at:📍|reach:📍|go out:🚶|depart:🚶|leave:🚪|return something:↩️|give back:↩️|raise:🙋|lift:🏋️|take out:📤|show:🫴|display:🫴|stop:🛑|halt:🛑|come to a halt:🛑|cease:🛑|know:💡|understand:💡|become cloudy:☁️|get cloudy:☁️|step on:👣|tread on:👣|pray:🙏|wish:🙏|do one's best:💪|try one's best:💪|persevere:💪|compare:⚖️|help:🤝|assist:🤝|hurry:🏃|rush:🏃|rejoice:😊|be delighted:😊|be heard:👂|be audible:👂|be visible:👀|can be seen:👀|be found:🔍|be discovered:🔍|get dark:🌆|grow dark:🌆|burn:🔥|be burned:🔥|grow cold:🥶|get cold:🥶|cool down:🧊|be late:⏰|become late:⏰|add:➕|notify:📢|inform:📢|invite:✉️|explain:💬|consult:💬|graduate:🎓|attend:🙋|prepare:📋|practice:🏋️|practise:🏋️|review:📝|transfer:🔁|change trains:🔁|export:🚢|import:📦|catch:🫴|arrest:🚓|dry:☀️|get dry:☀️|break:💔|snap:💔|be broken:💔|crack:💔|switch on:💡|be switched on:💡|come on:💡`;
const PIC_ADJ_MORE = `it's ok:👌|it's okay:👌|it's all right:👌|important:❗|valuable:💎|serious:❗|very important:❗|lukewarm:🌡️|tepid:🌡️|polite:🙇|courteous:🙇|simple:👌|complex:🧩|complicated:🧩|inconvenient:🚫|enthusiastic:🔥|kind:😇|kindness:😇|diligent:📚|safe:🛡️|together:🤝|a little:🤏|a few:🤏|few:🤏|little:🤏|many:🔢|much:🔢|a lot:🔢|lots:🔢|happy:😊|glad:😊|blue:🔵|red:🔴|yellow:🟡|green:🟢|black:⚫|white:⚪|brown:🟤|famous:⭐|skillful:👍|skilful:👍|be good at:👍|unskillful:👎|bad at:👎|pitiful:🥺|pitiable:🥺|pathetic:🥺|poor thing:🥺|sorry for:🥺|pity:🥺|sympathy:🥺|compassion:🥺|miserable:😞|wretched:😞`;
const mergePics = (more, base) => new Map([...parsePics(base), ...parsePics(more)]);
const PICS = { verb: mergePics(PIC_VERB_MORE, PIC_VERB), adj: mergePics(PIC_ADJ_MORE, PIC_ADJ), noun: mergePics(PIC_NOUN_MORE, PIC_NOUN) };
const stripFE = s => String(s).replace(/️/g, '');
/** index OpenMoji by name and by emoji character */
function buildPicIndex(list) {
  const byName = new Map(), byChar = new Map();
  for (const x of list) {
    if (x.skintone || x.group === 'component') continue;
    byChar.set(stripFE(x.emoji), x.hexcode);
    if (x.group === 'flags' || x.group === 'extras-openmoji' || x.group === 'extras-unicode') continue;
    const a = String(x.annotation || '').toLowerCase().trim(); if (!a) continue;
    if (!byName.has(a)) byName.set(a, x.hexcode);
    const bare = a.replace(/ face$/, '');                       // "dog face" also answers "dog" (face drawings read best)
    if (bare !== a) byName.set(bare, x.hexcode);
  }
  return { byName, byChar };
}
const glossKeys = gs => {
  const out = [];
  for (const g of gs.slice(0, 2)) {
    const n = String(g).toLowerCase().replace(/\(.*?\)/g, '').replace(/^(to|a|an|the)\s+/, '').replace(/\s+/g, ' ').trim();
    if (n && !out.includes(n)) out.push(n);
    const full = String(g).toLowerCase().replace(/^(to|a|an|the)\s+/, '').trim();
    if (full !== n && !out.includes(full)) out.unshift(full);   // "cold (illness)" before "cold"
  }
  return out;
};
/** pos: 'verb' | 'i-adj' | 'na-adj' | 'noun' | other; kanji: true for kanji meanings */
/* per-word fixes where the first meaning picks the wrong picture (null = no picture) */
const WORD_PICS = { 'かわいそう': '🥺', '可哀想': '🥺', '可哀相': '🥺', '気の毒': '🥺', '貧しい': '🪙', '貧乏': '🪙', '弾く': '🎸', '丁度': null, 'ちょうど': null, '賑やか': '🎉', 'にぎやか': '🎉', '外': null, '他': null, '程': null };
function pictureFor(idx, glosses, pos, kanji, word) {
  if (word && word in WORD_PICS) { const w = WORD_PICS[word]; return w ? idx.byChar.get(stripFE(w)) || null : null; }
  const kind = pos === 'verb' ? 'verb' : (pos === 'i-adj' || pos === 'na-adj') ? 'adj' : 'noun';
  const keys = glossKeys(glosses), hex = e => e && idx.byChar.get(stripFE(e));
  if (kanji) {
    // kanji is the literal character: pictographs first, then each meaning in order across all tables
    const kp = KANJI_PICS.get(kanji); if (kp && hex(kp)) return hex(kp);
    for (const k of keys) for (const t of ['noun', 'adj', 'verb']) { const h = hex(PICS[t].get(k)); if (h) return h; }
  } else {
    for (const k of keys) { const h = hex(PICS[kind].get(k)); if (h) return h; }
    if (kind !== 'noun') return null;
    for (const k of keys) { const h = hex(PICS.adj.get(k)); if (h) return h; }   // 青 "blue", 一緒 "together" (not verbs: "the rest" isn't resting)
  }
  for (const k of keys) { if (PIC_NAME_SKIP.has(k) || k.length < 3) continue; const h = idx.byName.get(k); if (h) return h; }
  return null;
}

const OPENMOJI_REPO = 'https://github.com/hfg-gmuend/openmoji';
/** OpenMoji data + colour SVGs: --openmoji-dir, an "openmoji" folder in --from-dir, or a sparse git clone */
function getOpenMoji() {
  if (flag('no-pictures')) return null;
  const look = base => { const j = path.join(base, 'data', 'openmoji.json'), d = path.join(base, 'color', 'svg'); return fs.existsSync(j) && fs.existsSync(d) ? { json: j, svg: d } : null; };
  if (opt('openmoji-dir')) return look(path.resolve(opt('openmoji-dir')));
  if (FROM) { const r = look(path.join(FROM, 'openmoji')); if (!r) warn('no openmoji folder in --from-dir, skipping pictures'); return r; }
  const dest = path.join(CACHE, 'openmoji');
  try {
    if (!look(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
      log('  cloning OpenMoji (data + colour SVGs only)');
      execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', OPENMOJI_REPO, dest], { stdio: 'inherit' });
      execFileSync('git', ['-C', dest, 'sparse-checkout', 'set', 'data', 'color/svg'], { stdio: 'inherit' });
    } else log('  cached OpenMoji');
    return look(dest);
  } catch (e) { warn('pictures: ' + e.message); return null; }
}

/* ---------------------------------------------------------------- more pictures: Tabler Icons (MIT) + game-icons.net (CC BY 3.0)
   Used only when OpenMoji has nothing, and only for nouns/kanji whose meaning is exactly an icon's name
   (no tag or fuzzy matching: that's how "class" became a bicycle). Ids: "t.<name>" and "g.<author>.<name>". */
const TABLER_REPO = 'https://github.com/tabler/tabler-icons';
const GAMEICONS_REPO = 'https://github.com/game-icons/icons';
const ICON_INK = '#22408F';
const EXT_SKIP = new Set([...PIC_NAME_SKIP, 'mark', 'point', 'form', 'order', 'case', 'change', 'line', 'set', 'state', 'check', 'plus', 'minus', 'list', 'menu', 'filter', 'power', 'shape', 'box', 'well', 'smart', 'character', 'blank', 'private', 'catch', 'tank top', 'volume', 'record', 'article', 'exchange', 'present', 'time', 'body', 'gear', 'front', 'class', 'pitch', 'table', 'key', 'track', 'code', 'cross', 'report', 'stamp', 'fan', 'shell', 'strike', 'plant', 'figure', 'glass', 'press', 'charge', 'cell', 'post', 'stock', 'board', 'current', 'free', 'second', 'minute', 'yard', 'bolt', 'pupil', 'iris', 'crane', 'bass', 'racket', 'jet', 'court', 'fall', 'drive', 'dash', 'safe', 'shuttle', 'loop', 'frame', 'print', 'brand', 'pool', 'space', 'link', 'sign', 'ghost', 'alien', 'spade', 'club', 'diamond', 'bishop', 'knight', 'queen', 'king', 'rook', 'pawn', 'bomb', 'tank', 'notes', 'function', 'search', 'person', 'thing', 'matter', 'way', 'kind', 'type', 'part', 'side', 'one', 'self']);
function getIconSets() {
  const sets = { tabler: null, gi: null };
  if (flag('no-pictures') || flag('no-icons')) return sets;
  const okT = d => fs.existsSync(path.join(d, 'icons', 'outline')) ? path.join(d, 'icons', 'outline') : null;
  const okG = d => fs.existsSync(path.join(d, 'lorc')) ? d : null;
  if (FROM) { sets.tabler = okT(path.join(FROM, 'tabler-icons')); sets.gi = okG(path.join(FROM, 'game-icons')); return sets; }
  const clone = (repo, dest, sparse) => {
    if (fs.existsSync(dest)) return;
    log('  cloning ' + repo.replace('https://github.com/', ''));
    execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', ...(sparse ? ['--sparse'] : []), repo, dest], { stdio: 'inherit' });
    if (sparse) execFileSync('git', ['-C', dest, 'sparse-checkout', 'set', sparse], { stdio: 'inherit' });
  };
  try { const d = path.join(CACHE, 'tabler-icons'); if (!okT(d)) fs.rmSync(d, { recursive: true, force: true }); clone(TABLER_REPO, d, 'icons/outline'); sets.tabler = okT(d); } catch (e) { warn('Tabler Icons: ' + e.message); }
  try { const d = path.join(CACHE, 'game-icons'); if (!okG(d)) fs.rmSync(d, { recursive: true, force: true }); clone(GAMEICONS_REPO, d); sets.gi = okG(d); } catch (e) { warn('game-icons: ' + e.message); }
  return sets;
}
/** name → { id, file } for both sets (Tabler wins over game-icons; game-icons' generic "badges" folder is left out) */
function buildExtIndex(sets) {
  const byName = new Map();
  if (sets.tabler) for (const f of fs.readdirSync(sets.tabler)) if (f.endsWith('.svg')) { const n = f.slice(0, -4); const k = n.replace(/-/g, ' '); if (!byName.has(k)) byName.set(k, { id: 't.' + n, file: path.join(sets.tabler, f) }); }
  if (sets.gi) for (const a of fs.readdirSync(sets.gi).sort()) {
    const d = path.join(sets.gi, a); if (a === 'badges' || a.startsWith('.') || !fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.svg')) { const n = f.slice(0, -4); const k = n.replace(/-/g, ' '); if (!byName.has(k)) byName.set(k, { id: `g.${a}.${n}`, file: path.join(d, f) }); }
  }
  return byName;
}
const singular = k => k.endsWith('ies') ? k.slice(0, -3) + 'y' : k.endsWith('s') && !/(ss|us|is)$/.test(k) ? k.slice(0, -1) : k;
const extKeys = gs => { const out = []; for (const g of gs.slice(0, 2)) { const n = String(g).toLowerCase().replace(/\^/g, '').replace(/\(.*?\)/g, '').replace(/^(to|a|an|the)\s+/, '').replace(/[!?.~]/g, '').replace(/\s+/g, ' ').trim(); if (n && !out.includes(n)) out.push(n); } return out; };
/** second-chance picture for a noun or kanji meaning: exact icon name, then the head noun of a 2–3 word gloss ("electric train" → train) in OpenMoji */
function extPictureFor(idx, ext, glosses, pos) {
  if (pos !== 'noun') return null;
  const keys = extKeys(glosses);
  for (const k0 of keys) for (const k of new Set([k0, singular(k0)])) { if (EXT_SKIP.has(k) || k.length < 3) continue; const h = ext.get(k); if (h) return h.id; }
  for (const k of keys) {
    const ws = k.split(' '); if (ws.length < 2 || ws.length > 3) continue; const h = singular(ws[ws.length - 1]); if (h.length < 4 || EXT_SKIP.has(h)) continue;
    const c = PICS.noun.get(h); if (c && idx.byChar.get(stripFE(c))) return idx.byChar.get(stripFE(c));
    const o = idx.byName.get(h); if (o) return o;
  }
  return null;
}
/** icon SVG recoloured in the app's ink (Tabler: stroke; game-icons: drop the black square, fill the glyph) */
function iconSvg(id, file) {
  let t = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->\s*/g, '');
  if (id.startsWith('t.')) t = t.replace(/currentColor/g, ICON_INK).replace(/\swidth="24"\s+height="24"/, '');
  else t = t.replace(/<path d="M0 0h512v512H0z"\s*\/>/, '').replace(/fill="#fff(fff)?"/gi, `fill="${ICON_INK}"`);
  return t;
}
const hanOf = w => [...new Set(String(w).match(/\p{Script=Han}/gu) || [])];

/* ---------------------------------------------------------------- 3D pictures: Microsoft Fluent Emoji (MIT)
   Same emoji as OpenMoji, rendered in 3D. Only the 3D PNGs and metadata are fetched (sparse clone, ~75 MB).
   Each picture is stored as <hex>.png next to OpenMoji's <hex>.svg, so the app can switch styles. */
const FLUENT_REPO = 'https://github.com/microsoft/fluentui-emoji';
const normHex = h => String(h).toUpperCase().split(/[-\s_]+/).filter(x => x && x !== 'FE0F').join('-');
function getFluent3D() {
  if (flag('no-pictures') || flag('no-3d')) return null;
  const ok = d => fs.existsSync(path.join(d, 'assets')) ? d : null;
  let dir = null;
  if (FROM) dir = ok(path.join(FROM, 'fluentui-emoji'));
  else {
    const d = path.join(CACHE, 'fluentui-emoji');
    try {
      if (!ok(d)) {
        fs.rmSync(d, { recursive: true, force: true });
        log('  cloning Fluent Emoji (3D pictures only)');
        execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--no-checkout', FLUENT_REPO, d], { stdio: 'inherit' });
        execFileSync('git', ['-C', d, 'sparse-checkout', 'init', '--no-cone'], { stdio: 'inherit' });
        fs.writeFileSync(path.join(d, '.git', 'info', 'sparse-checkout'), '/assets/*/metadata.json\n/assets/*/3D/*\n/assets/*/Default/3D/*\n/LICENSE\n');
        execFileSync('git', ['-C', d, 'checkout'], { stdio: 'inherit' });
      } else log('  cached Fluent Emoji');
      dir = ok(d);
    } catch (e) { warn('Fluent Emoji: ' + e.message); }
  }
  if (!dir) return null;
  const byHex = new Map();
  for (const name of fs.readdirSync(path.join(dir, 'assets'))) {
    const base = path.join(dir, 'assets', name);
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
      for (const sub of ['3D', path.join('Default', '3D')]) {
        const d = path.join(base, sub); if (!fs.existsSync(d)) continue;
        const png = fs.readdirSync(d).find(f => f.endsWith('.png')); if (png) { byHex.set(normHex(meta.unicode), path.join(d, png)); break; }
      }
    } catch (e) {}
  }
  return byHex;
}

/* ---------------------------------------------------------------- kanji structure
   KanjiVG (CC BY-SA 3.0): the top-level parts of each kanji, where they sit, and which part is the
   radical / the sound part.  Kanjium (CC BY-SA 4.0): how the kanji was formed (pictograph, combined
   meanings, meaning + sound), its sound component and the readings it gives, look-alike kanji, and
   names and meanings for radicals and parts. */
const KANJIUM_REPO = 'https://github.com/mifunetoshiro/kanjium';
/** top-level parts of a KanjiVG drawing: [[part, position, role]] (role: 'r' radical, 'p' sound part) */
function kvgParts(svg, c) {
  const hex = c.codePointAt(0).toString(16).padStart(5, '0'), rootId = `kvg:${hex}`;
  const toks = [...svg.matchAll(/<g\b[^>]*>|<\/g>/g)].map(m => m[0]);
  let depth = 0, rootDepth = -1; const top = [];   // [tag, depth]
  for (const t of toks) {
    if (t === '</g>') { depth--; if (depth < rootDepth) break; continue; }
    depth++;
    if (rootDepth < 0) { if (new RegExp(`\\bid="${rootId}"`).test(t)) rootDepth = depth; continue; }
    if (depth === rootDepth + 1 || depth === rootDepth + 2) top.push([t, depth]);
  }
  const attr = (t, a) => { const m = new RegExp(`kvg:${a}="([^"]*)"`).exec(t); return m ? m[1] : null; };
  const out = [];
  for (let i = 0; i < top.length; i++) {
    const [t, d] = top[i]; if (d !== rootDepth + 1) continue;
    const el = attr(t, 'element'), pos = attr(t, 'position'), role = attr(t, 'radical') ? 'r' : attr(t, 'phon') ? 'p' : '';
    if (el) { if (attr(t, 'part') && attr(t, 'part') !== '1') continue; out.push([el, pos || '', role]); continue; }
    // a group with no name of its own (学's top): use its named children
    for (let j = i + 1; j < top.length && top[j][1] > d; j++) { const e2 = attr(top[j][0], 'element'); if (e2 && top[j][1] === d + 1 && !(attr(top[j][0], 'part') && attr(top[j][0], 'part') !== '1')) out.push([e2, pos || attr(top[j][0], 'position') || '', role]); }
  }
  return out.length > 1 ? out : null;   // a kanji that is one part (日, 木) has no breakdown
}
function getKanjium() {
  if (flag('no-structure')) return null;
  const ok = d => fs.existsSync(path.join(d, 'data', 'source_files', 'kanjidict.txt')) ? path.join(d, 'data', 'source_files') : null;
  if (FROM) return ok(path.join(FROM, 'kanjium'));
  const d = path.join(CACHE, 'kanjium');
  try {
    if (!ok(d)) {
      fs.rmSync(d, { recursive: true, force: true });
      log('  cloning Kanjium (text data only)');
      execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', KANJIUM_REPO, d], { stdio: 'inherit' });
      execFileSync('git', ['-C', d, 'sparse-checkout', 'set', 'data/source_files'], { stdio: 'inherit' });
    } else log('  cached Kanjium');
    return ok(d);
  } catch (e) { warn('Kanjium: ' + e.message); return null; }
}
const TYPE_CODE = { 'Pictograph': 'P', 'Ideograph': 'I', 'Compound ideograph': 'C', 'Phono-semantic compound': 'S' };
/** Kanjium tables → { info: kanji → {ty, ph, lk, rad}, partMeaning(el) } */
function readKanjium(dir) {
  const rows = f => fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
  const kd = new Map(rows('kanjidict.txt').map(r => [r[0], r]));
  const look = new Map(rows('lookalikes.txt').map(r => [r[0], (r[1] || '').split(/[,、]/).map(x => x.trim()).filter(Boolean)]));
  const phon = new Map(rows('phonetics.txt').map(r => [r[0], (r[1] || '').split('、').filter(Boolean)]));
  const radName = new Map();
  for (const f of ['radicals_variants.txt', 'radicals.txt']) for (const r of rows(f)) {   // variants first: 亻 is にんべん, not ひと
    const [a, b, , , names, meaning] = f === 'radicals.txt' ? r : [r[0], r[1], r[2], r[3], r[4], r[5]];
    const name = String(names || '').split('・')[0], m = String(meaning || '').split(',')[0].trim();
    for (const ch of [a, ...(f === 'radicals.txt' ? String(b || '').split(/[,、 ]/) : [])]) if (ch && !radName.has(ch)) radName.set(ch, { n: name, m });
  }
  const meaningOf = c => { const r = kd.get(c); return r ? String(r[17] || r[16] || '').split(';')[0].replace(/\s*\((kokuji|extended shinjitai|ghost character)\)/g, '').trim() : ''; };
  return {
    info: c => { const r = kd.get(c); if (!r) return null; return { ty: TYPE_CODE[r[5]] || '', rad: r[2] || r[1] || '', ph: r[3] || '', phR: (phon.get(r[3]) || []).slice(0, 4), lk: look.get(c) || [] }; },
    part: el => { const rn = radName.get(el), m = meaningOf(el); return { m: (rn && rn.m) || m, n: rn ? rn.n : '' }; }
  };
}

/* ---------------------------------------------------------------- file helpers */
function extractDir(file) {
  const dir = path.join(CACHE, 'x-' + path.basename(file).replace(/[^\w.-]/g, '_'));
  if (fs.existsSync(path.join(dir, '.done'))) return dir;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  if (/\.zip$/i.test(file)) execFileSync('unzip', ['-q', '-o', file, '-d', dir]);
  else if (/\.(tgz|tar\.gz)$/i.test(file)) execFileSync('tar', ['-xzf', file, '-C', dir]);
  else if (/\.tar\.bz2$/i.test(file)) execFileSync('tar', ['-xjf', file, '-C', dir]);
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

  /* ---- 4b. Tatoeba sentence audio index (licensed recordings only) */
  const SAUD = new Map(); // Japanese/any sentence id -> { a: audio id, u: user, l: licence, url }
  if (SENT_AUDIO) {
    log('Tatoeba sentence audio index');
    const sa = await getSource('tatoeba-audio', SOURCES.tatoeba.audio, { required: false });
    if (sa) {
      let f = sa.file;
      if (/\.tar\.bz2$/i.test(f)) f = walk(extractDir(f)).filter(p => /\.(tsv|csv)$/i.test(p))[0];
      if (f) {
        let all = 0;
        await eachLine(f, line => {
          const [sid, aid, user, lic, url] = line.split('\t'); all++;
          const L = (lic || '').trim(); if (!sid || !aid || !L || L === '\\N') return;            // empty licence = not reusable
          if (COMMERCIAL_ONLY && /NC/i.test(L)) return;
          if (!SAUD.has(sid)) SAUD.set(sid, { a: aid, u: user || '', l: L, url: url && url !== '\\N' ? url : '' });
        });
        log(`  ${SAUD.size} reusable recordings (of ${all} listed, all languages)`);
      }
    }
  }
  const hasAu = t => !!t && SAUD.has(String(t));

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
    let ex = [];
    if (jmHasExamples) {
      for (const s of w.sense || []) for (const e of s.examples || []) {
        const jp = (e.sentences || []).find(x => (x.land || x.lang) === 'jpn');
        const en = (e.sentences || []).find(x => (x.land || x.lang) === 'eng');
        if (jp && en && !ex.some(x => x.j === jp.text)) ex.push({ j: jp.text, e: en.text, t: e.source && e.source.type === 'tatoeba' ? String(e.source.value) : null });
      }
      // sentences with a native recording first (stable sort keeps sense order otherwise)
      ex = ex.map((x, k) => [x, k]).sort((a, b) => (hasAu(b[0].t) - hasAu(a[0].t)) || a[1] - b[1]).map(a => a[0]).slice(0, MAX_EX);
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
    const need = examplePool.filter(e => e.ex.length < MAX_EX || (SAUD.size && !e.ex.some(x => hasAu(x.t))));
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
      let swapped = 0;
      for (const [f, entries] of want) {
        const cands = (index.get(f) || []).map((i, k) => [i, k]).sort((a, b) => (hasAu(jpn[b[0]].id) - hasAu(jpn[a[0]].id)) || a[1] - b[1]).map(a => a[0]);
        for (const e of entries) {
          for (const i of cands) {
            const s = jpn[i]; const en = eng.get(link.get(s.id));
            if (!en || e.ex.some(x => x.j === s.text) || (useCount.get(i) || 0) >= 3) continue;
            if (e.ex.length >= MAX_EX) {
              // full already: swap the last example for one with a native recording, once
              if (e.ex.some(x => hasAu(x.t)) || !hasAu(s.id)) break;
              e.ex.pop(); swapped++;
            }
            e.ex.push({ j: s.text, e: en, t: s.id }); useCount.set(i, (useCount.get(i) || 0) + 1); filled++;
            if (e.ex.length >= MAX_EX && e.ex.some(x => hasAu(x.t))) break;
          }
        }
      }
      if (swapped) log(`  ${swapped} examples swapped for ones with native audio`);
      meta.sources.tatoeba = { files: [sj.label, se.label, sl.label], matching: tokenizer ? 'dictionary form (kuromoji)' : 'substring' };
      log(`  added ${filled} sentences`);
    }
  }
  /* ---- 6b. download the chosen sentences' recordings */
  if (SAUD.size) {
    log('Sentence audio (Tatoeba)');
    const order = LEVELS.flatMap(l => vocab[l].slice().sort((a, b) => b.q - a.q));
    const jobs = [], seen = new Set();
    for (const e of order) for (const x of e.ex) {
      if (!hasAu(x.t)) continue;
      const r = SAUD.get(String(x.t));
      if (!seen.has(r.a)) { if (seen.size >= MAX_SAUD) continue; seen.add(r.a); jobs.push(r.a); }
      x.au = r.a; x.by = r.u; x.lic = r.l; if (r.url) x.al = r.url;
    }
    const dir = path.join(CACHE, 'tatoeba-audio'), outDir = path.join(OUT, 'saudio');
    fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
    const ok = new Set(); let bytes = 0, fetched = 0, k = 0;
    const one = async id => {
      const c = path.join(dir, id + '.mp3');
      if (!(fs.existsSync(c) && fs.statSync(c).size > 500)) {
        if (FROM) return;
        for (let t = 0; t < 3; t++) {
          try {
            const r = await fetch(`https://tatoeba.org/audio/download/${id}`, { headers: { 'User-Agent': 'kotoba-dojo-data-builder (study app; github pages)' }, redirect: 'follow' });
            if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 500) { fs.writeFileSync(c, b); fetched++; break; } }
            if (r.status === 404) break;
          } catch (e) {}
          await new Promise(res => setTimeout(res, 800 * (t + 1)));
        }
      }
      if (fs.existsSync(c) && fs.statSync(c).size > 500) { fs.copyFileSync(c, path.join(outDir, id + '.mp3')); bytes += fs.statSync(c).size; ok.add(id); }
    };
    if (FROM) { const local = path.join(FROM, 'tatoeba-audio'); if (fs.existsSync(local)) for (const n of fs.readdirSync(local)) fs.copyFileSync(path.join(local, n), path.join(dir, n)); }
    await Promise.all(Array.from({ length: 6 }, async () => { while (k < jobs.length) { const id = jobs[k++]; await one(id); await new Promise(r => setTimeout(r, 60)); } }));
    for (const e of order) for (const x of e.ex) if (x.au && !ok.has(x.au)) { delete x.au; delete x.by; delete x.lic; delete x.al; }
    meta.counts.saudio = ok.size;
    meta.sources.sentenceAudio = 'Tatoeba recordings with a reuse licence' + (COMMERCIAL_ONLY ? ' (commercial-use licences only)' : '') + '; each credited in the app';
    log(`  ${ok.size} sentence recordings (${fetched} downloaded now, ${(bytes / 1e6).toFixed(1)} MB)`);
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
  const strokes = Object.fromEntries([...LEVELS, 'KANA'].map(l => [l, {}]));
  const kvgPartsOf = new Map();
  const kv = await getSource('kanjivg', SOURCES.kanjivg, { required: false });
  if (kv) {
    const files = new Map(walk(extractDir(kv.file)).filter(p => /\.svg$/i.test(p)).map(p => [path.basename(p).toLowerCase(), p]));
    let n = 0;
    // kanji, plus every hiragana / katakana character for the Kana section
    const targets = [...kanjiSet];
    for (let cp = 0x3041; cp <= 0x3096; cp++) targets.push([String.fromCodePoint(cp), 'KANA']);
    for (let cp = 0x30a1; cp <= 0x30fa; cp++) targets.push([String.fromCodePoint(cp), 'KANA']);
    for (const [c, l] of targets) {
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
      if (l !== 'KANA') { const pt = kvgParts(svg, c); if (pt) kvgPartsOf.set(c, pt); }
      n++;
    }
    meta.sources.kanjivg = kv.label;
    log(`  stroke data for ${n - Object.keys(strokes.KANA).length} kanji and ${Object.keys(strokes.KANA).length} kana`);
  } else meta.notes.push('KanjiVG unavailable: no stroke-order diagrams in this build.');

  /* ---- 8a. How each kanji is built (KanjiVG parts + Kanjium) */
  const partsDict = {};
  if (!flag('no-structure')) {
    log('Kanji structure (KanjiVG parts, Kanjium)');
    const kmDir = getKanjium(), km = kmDir ? readKanjium(kmDir) : null;
    const jlptSet = new Set(kanjiSet.keys()); let n = 0;
    for (const l of LEVELS) for (const k of kanji[l]) {
      const pt = kvgPartsOf.get(k.k), inf = km && km.info(k.k);
      if (pt) k.pt = pt;
      if (inf) {
        if (inf.ty) k.ty = inf.ty;
        if (inf.ph && inf.ph !== k.k) { k.ph = inf.ph; if (inf.phR.length) k.phR = inf.phR; }
        if (inf.rad) k.rad = inf.rad;
        const lk = inf.lk.filter(x => jlptSet.has(x) && x !== k.k).slice(0, 6); if (lk.length) k.lk = lk;
      }
      if (km) for (const el of [...(pt || []).map(p => p[0]), k.rad, k.ph].filter(Boolean)) if (!partsDict[el]) { const pm = km.part(el); if (pm.m || pm.n) partsDict[el] = [pm.m, pm.n]; }
      if (k.pt || k.ty) n++;
    }
    if (km) meta.sources.structure = 'KanjiVG component groups + Kanjium (kanjidict, phonetics, lookalikes, radicals)';
    else meta.notes.push('Kanjium unavailable: kanji origins come from KanjiVG parts only.');
    log(`  structure for ${n} kanji, ${Object.keys(partsDict).length} parts named`);
  }

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

  /* ---- 8c. Word audio (native recordings) */
  log('Word audio (WaniKani / Tofugu)');
  const audioDir = getAudioDir();
  if (audioDir) {
    const files = new Map();
    for (const n of fs.readdirSync(audioDir)) {
      const m = /^(.+?)【(.+)】\.mp3$/.exec(n); if (!m) continue;
      const key = m[1].replace(/^[〜~～]/, '') + '|' + kata2hira(m[2]);
      if (!files.has(key)) files.set(key, n);
    }
    fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
    let n = 0, bytes = 0;
    for (const l of LEVELS) for (const e of vocab[l]) {
      const r = kata2hira(e.r);
      const f = files.get(e.w + '|' + r) || (e.a && files.get(e.a + '|' + r));
      if (!f) continue;
      const id = crypto.createHash('sha1').update(f).digest('hex').slice(0, 12);
      const out = path.join(OUT, 'audio', id + '.mp3');
      if (!fs.existsSync(out)) { fs.copyFileSync(path.join(audioDir, f), out); bytes += fs.statSync(out).size; }
      e.au = id; n++;
    }
    meta.counts.audio = n;
    meta.sources.audio = 'tofugu/japanese-vocabulary-pronunciation-audio (native speakers, mp3)';
    log(`  ${n} words with native audio (${(bytes / 1e6).toFixed(1)} MB)`);
  } else meta.notes.push('WaniKani word audio unavailable in this build.');

  /* ---- 8d. Kanji alive recordings for words WaniKani doesn't cover */
  if (!flag('no-audio') && !flag('no-kanjialive')) {
    log('Word audio (Kanji alive)');
    const kd = await getSource('ka-data', SOURCES.kaData, { required: false });
    const kz = kd && await getSource('ka-audio', SOURCES.kaAudio, { required: false });
    if (kd && kz) {
      const files = new Map(walk(extractDir(kz.file)).filter(p => /\.mp3$/i.test(p)).map(p => [path.basename(p), p]));
      const rows = parseCSV(fs.readFileSync(kd.file, 'utf8').replace(/^\uFEFF/, ''));
      const head = rows[0], ci = n => head.indexOf(n), map = new Map();
      for (const r of rows.slice(1)) {
        let list; try { list = JSON.parse(r[ci('examples')]); } catch (e) { continue; }
        list.forEach((ex, i) => {
          const m = /^(.+?)（(.+?)）/.exec(String(ex[0] || '')); if (!m) return;
          const f = files.get(`${r[ci('kname')]}_06_${String.fromCharCode(97 + i)}.mp3`); if (!f) return;
          const w = m[1].trim(), rd = kata2hira(m[2].trim());
          // exact word + reading only: a 勉強する recording says "benkyou suru", so it must not be used for the noun 勉強
          if (w && !map.has(w + '|' + rd)) map.set(w + '|' + rd, f);
        });
      }
      fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
      let n = 0, bytes = 0;
      for (const l of LEVELS) for (const e of vocab[l]) {
        if (e.au) continue;
        const r = kata2hira(e.r), f = map.get(e.w + '|' + r) || (e.a && map.get(e.a + '|' + r)); if (!f) continue;
        const id = 'k' + crypto.createHash('sha1').update(f).digest('hex').slice(0, 11);
        const out = path.join(OUT, 'audio', id + '.mp3');
        if (!fs.existsSync(out)) { fs.copyFileSync(f, out); bytes += fs.statSync(out).size; }
        e.au = id; n++;
      }
      meta.counts.audioKA = n;
      meta.sources.audioKA = 'Kanji alive example-word recordings (mp3)';
      log(`  ${n} more words with native audio (${(bytes / 1e6).toFixed(1)} MB)`);
    }
  }
  const audioTotal = LEVELS.reduce((a, l) => a + vocab[l].filter(e => e.au).length, 0);
  if (!audioTotal) meta.notes.push('No native word audio in this build; words use the device voice.');

  /* ---- 8e. Pictures (OpenMoji) */
  if (!flag('no-pictures')) {
    log('Pictures (OpenMoji)');
    const om = getOpenMoji();
    if (om) {
      const idx = buildPicIndex(JSON.parse(fs.readFileSync(om.json, 'utf8')));
      const ext = buildExtIndex(getIconSets());
      log(`  ${ext.size} extra icons (Tabler Icons, game-icons.net)`);
      const used = new Set(); let nv = 0, nk = 0, nx = 0;
      for (const l of LEVELS) for (const k of kanji[l]) {
        const h = pictureFor(idx, k.m, 'noun', k.k) || extPictureFor(idx, ext, k.m, 'noun');
        if (h) { k.pic = h; used.add(h); nk++; }
      }
      for (const l of LEVELS) for (const e of vocab[l]) {
        const gl = (e.s[0] && e.s[0].g) || [e.m];
        let h = pictureFor(idx, gl, e.g, false, e.w);
        if (!h && !(e.w in WORD_PICS)) { h = extPictureFor(idx, ext, gl, e.g); if (h) nx++; }
        if (h) { e.pic = h; used.add(h); nv++; }
      }
      // pictures for the app's own Situations phrases (listed in index.html as SIT_PICS)
      try {
        const html = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');
        const m = /const SIT_PICS = (\{[^;]*\});/.exec(html); if (m) Object.values(JSON.parse(m[1])).forEach(h => used.add(h));
      } catch (e) {}
      fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
      const extFile = new Map([...ext.values()].map(v => [v.id, v.file]));
      let bytes = 0; const missing = new Set();
      for (const h of used) {
        const dest = path.join(OUT, 'img', h + '.svg');
        if (h.startsWith('t.') || h.startsWith('g.')) { const f = extFile.get(h); if (!f) { missing.add(h); continue; } const t = iconSvg(h, f); fs.writeFileSync(dest, t); bytes += t.length; continue; }
        const f = path.join(om.svg, h + '.svg'); if (fs.existsSync(f)) { fs.copyFileSync(f, dest); bytes += fs.statSync(f).size; } else missing.add(h);
      }
      if (missing.size) for (const l of LEVELS) {
        for (const e of vocab[l]) if (missing.has(e.pic)) delete e.pic;
        for (const k of kanji[l]) if (missing.has(k.pic)) delete k.pic;
      }
      // 3D versions of the emoji pictures (Fluent Emoji); the app falls back to the flat SVG where there's none
      const fl = getFluent3D(); const pics3d = [];
      if (fl) for (const h of used) {
        if (missing.has(h) || /^[tg]\./.test(h)) continue;
        const f = fl.get(normHex(h)); if (!f) continue;
        fs.copyFileSync(f, path.join(OUT, 'img', h + '.png')); bytes += fs.statSync(f).size; pics3d.push(h);
      }
      meta.pics3d = pics3d;
      if (fl) log(`  ${pics3d.length} pictures also in 3D (Fluent Emoji)`);
      meta.counts.pictures = { words: nv, wordsFromIcons: nx, kanji: nk, files: used.size - missing.size, in3d: pics3d.length };
      meta.sources.pictures = 'Fluent Emoji 3D, OpenMoji (colour SVG), Tabler Icons, game-icons.net';
      log(`  pictures for ${nv} words (${nx} from icon sets), ${nk} kanji (${used.size - missing.size} files, ${(bytes / 1e6).toFixed(1)} MB)`);
    } else meta.notes.push('OpenMoji unavailable: no pictures in this build.');
  }

  /* ---- 9. write */
  log('Writing files');
  let total = 0;
  for (const l of LEVELS) {
    vocab[l].sort((a, b) => b.q - a.q || (a.i || 9e9) - (b.i || 9e9));
    meta.counts.vocab[l] = vocab[l].length; meta.counts.kanji[l] = kanji[l].length;
    total += write(`vocab-${l.toLowerCase()}.json`, vocab[l]);
    total += write(`kanji-${l.toLowerCase()}.json`, kanji[l]);
    total += write(`strokes-${l.toLowerCase()}.json`, strokes[l]);
    if (l === LEVELS[LEVELS.length - 1]) total += write('strokes-kana.json', strokes.KANA);
    if (gCount) { (meta.counts.grammar = meta.counts.grammar || {})[l] = grammar[l].length; total += write(`grammar-${l.toLowerCase()}.json`, grammar[l]); }
  }
  meta.tags = Object.fromEntries([...usedTags].filter(t => tagNames[t]).map(t => [t, tagNames[t]]));
  meta.licenses = [
    { name: 'JMdict & KANJIDIC2', by: 'Electronic Dictionary Research and Development Group', license: 'CC BY-SA 4.0', url: 'https://www.edrdg.org/edrdg/licence.html' },
    { name: 'jmdict-simplified', by: 'scriptin', license: 'CC BY-SA 4.0 (data)', url: 'https://github.com/scriptin/jmdict-simplified' },
    { name: 'KanjiVG', by: 'Ulrich Apel and contributors', license: 'CC BY-SA 3.0', url: 'https://kanjivg.tagaini.net/' },
    { name: 'Kanji origins and parts', by: 'Kanjium (mifunetoshiro), built on EDRDG data', license: 'CC BY-SA 4.0', url: 'https://github.com/mifunetoshiro/kanjium' },
    { name: 'Tatoeba', by: 'Tatoeba contributors', license: 'CC BY 2.0 FR', url: 'https://tatoeba.org/' },
    { name: 'JLPT vocabulary lists', by: 'Jonathan Waller (tanos.co.uk)', license: 'CC BY', url: 'https://www.tanos.co.uk/jlpt/' },
    { name: 'Kanji JLPT levels', by: 'David Luz Gouveia (kanji-data)', license: 'MIT', url: 'https://github.com/davidluzgouveia/kanji-data' },
    { name: 'JLPT grammar', by: 'hanabira.org', license: 'Creative Commons (in-house content)', url: 'https://hanabira.org/' },
    { name: 'Word pronunciation audio', by: 'Tofugu & WaniKani', license: 'CC BY-SA 4.0', url: 'https://github.com/tofugu/japanese-vocabulary-pronunciation-audio' },
    { name: 'Example-word audio', by: 'Kanji alive', license: 'CC BY 4.0', url: 'https://github.com/kanjialive/kanji-data-media' },
    { name: 'Pictures', by: 'OpenMoji – the open-source emoji and icon project', license: 'CC BY-SA 4.0', url: 'https://openmoji.org/' },
    { name: '3D pictures', by: 'Fluent Emoji (Microsoft)', license: 'MIT', url: 'https://github.com/microsoft/fluentui-emoji' },
    { name: 'Icons', by: 'Tabler Icons (Paweł Kuna)', license: 'MIT', url: 'https://tabler.io/icons' },
    { name: 'Icons', by: 'game-icons.net (Lorc, Delapouite and contributors; each icon credits its artist)', license: 'CC BY 3.0', url: 'https://game-icons.net/' },
    { name: 'Sentence audio', by: 'Tatoeba contributors (credited on each sentence)', license: 'per recording', url: 'https://tatoeba.org/en/downloads' }
  ];
  if (Object.keys(partsDict).length) total += write('parts.json', partsDict);
  total += write('meta.json', meta);
  log(`Done: ${Object.values(meta.counts.vocab).reduce((a, b) => a + b, 0)} words, ${kanjiSet.size} kanji, ${(total / 1e6).toFixed(1)} MB in ${OUT}`);
  if (meta.notes.length) meta.notes.forEach(n => warn(n));
}

export { kvgParts, readKanjium, buildPicIndex, pictureFor, buildExtIndex, extPictureFor, iconSvg, hanOf };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('\nBuild failed:', e.message); process.exit(1); });
