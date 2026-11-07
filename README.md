# Kotoba Dojo — Japanese vocab & kanji trainer

A GitHub Pages app for learning Japanese vocabulary and kanji, JLPT N5 to N1.
Your repo builds the data itself: a GitHub Action downloads the open
dictionaries, turns them into small files and publishes the site. It refreshes
every Monday.

## What's inside
- **Kana** — full hiragana and katakana charts (basic, ゛゜ sounds, combinations like きゃ, extended katakana like ファ) with KanjiVG stroke order, lookalike warnings (シ/ツ, ぬ/め…) and real words that use each character. Quizzes: kana → romaji, romaji → kana and hiragana ↔ katakana, with lookalikes as the wrong answers; plus flashcards and tests.
- **Path (the main way to learn)** — each level's Path teaches the whole level: every JLPT word, kanji and grammar point. Lessons take about 15 minutes: one or two grammar points, about 12 words, the kanji inside them (each with its story), a reading built from real example sentences (with native audio where recorded), and mixed practice that includes JLPT-style questions. N5 opens with 23 hand-written lessons (introductions through て-form, ている, comparisons and から／が), then generated lessons cover the rest (simplest grammar first). Every 8 lessons a **checkpoint** (80% clears it), and each level ends with a **full mock exam** — the aim is 80%+, well above the pass mark. Sizes with the full data: N5 ≈ 80 lessons, N4 ≈ 62, N3 ≈ 179, N2 ≈ 159, N1 ≈ 225. The Path page shows how many of the level's words and kanji you've covered.
- **Simple explanations** — the hand-written lessons explain each pattern in plain words with everyday comparisons (は is a pointing finger, です is a polite full stop, へ is an arrow), plus a one-line hook saying what you'll be able to do after the lesson. Generated lessons highlight the grammar inside each example sentence.
- **Game mode or normal mode** (Settings → Learning style) — game mode adds dojo belts earned with XP (white → black belt, then dan grades), 1–3 stars per lesson, 13 badges, answer combos and small celebrations. Normal mode keeps the same lessons without any of it. XP and badges are counted either way, so switching shows what you've already earned.
- **Daily goal** (15, 20 or 30 minutes) — counts real study time in lessons, quizzes and reviews (not idle time), shown on Home in both modes.
- **Placement check** — about 10 minutes of JLPT-style questions (kanji reading, writing, word in context, paraphrase, grammar form, sentence order, reading comprehension, listening with the full data) after a kana check. It moves up a level each time you score 75%+, recommends a lesson part-way into the level you stopped at, and points out whether grammar, kanji or reading lags behind your vocabulary.
- **Travel Japanese** — a separate 8-unit track: airport, hotel, trains, directions, restaurants, shopping, sightseeing manners, and help/emergencies.
- **Library** — Kana, Words, Kanji, Grammar, Situations and Search, for looking things up or drilling a weak spot.
- **How each kanji came to be** — every kanji page tells its origin story (休: "a person leaning against a tree", 電: "a thunderbolt cast by a storm cloud", 日: "the sun"), says whether it began as a picture, a symbol, combined meanings, or a meaning part plus a sound part (with the reading the sound part gives, and a clearly-labelled memory trick), shows its parts and radical, its pre-1946 form where it changed, kanji with the same sound part, look-alikes, and kanji that contain it. You can write your own memory story for each kanji; it's saved on your device and included in Export.
- **Pictures** — words show the pictures from your own imported Anki decks (Settings → Pictures turns them off). The app has no built-in word or kanji pictures: matching emoji to meanings gave too many misleading ones. The drawn memory pictures and picture breakdowns below are separate and always on.
- **Quote of the day** — a public-domain saying, haiku or proverb on Home (Bashō, Musashi, Zeami, Fukuzawa…), with furigana, an English translation and the author credited. Optionally mixes in short credited catchphrases from Shuzo Matsuoka and anime/manga (Settings → Modern quotes).
- **Situations** — words and phrases grouped by occasion (greetings, restaurant, convenience store, shopping, train & travel, hotel, directions, time, numbers, family, health & emergencies, work, weather, small talk, feelings, gym), each ordered from what you'll hear most to least. Study any situation with Learn, Flashcards or Test.
- **Vocabulary** — the JLPT N5–N1 lists matched to **JMdict** entries: all main meanings, parts of speech, alternative spellings and furigana.
- **Kanji** — every JLPT kanji from **KANJIDIC2** (meanings, on/kun readings, stroke count, frequency rank) with animated **KanjiVG** stroke order.
- **Example sentences** — **Tatoeba** sentences with English translations and furigana, each linking back to its Tatoeba page.
- **Frequency bars** on every word (from JMdict's newspaper frequency bands) and every kanji (KANJIDIC rank).
- **Filter by level** — pick any mix of N5, N4, N3, N2, N1 and your own words, plus word type.
- **Flashcards** — spaced repetition (Again / Hard / Good / Easy). Due cards first, then a daily allowance of new cards.
- **Learn** — 4-choice quizzes with the full entry after each answer.
- **Test** — no hints, score and review at the end, retest your mistakes. Works for vocab and kanji.
- **Grammar** — JLPT N5–N1 grammar from **hanabira.org**, grouped into chapters by what you want to say (Comparing, Wants & plans, Must & mustn’t, If & when…) and ordered like a textbook, with progress per chapter and a “Learn next” button. Each point is a short lesson: what it’s for in one line, its English equivalents, a colour-coded “how to build it” formula, examples with the grammar highlighted, similar points not to mix up, and a 3-question “Try it” with a sentence to build from tiles. A **Meaning → Pattern** toggle flips the whole section (lists, lessons, flashcards and workouts) so you see what to say first and recall the pattern yourself. The **Workout** mixes fill the blank, build the sentence, pick the right Japanese for an English sentence (options differ only in the grammar) and meaning ↔ pattern, due points first.
- **Mock exam** — timed, JLPT-style exam per level: 漢字読み, 表記, 文脈規定, 言い換え, 文法形式, 文の組み立て (★) and 聴解 (listening). Scored against the official pass marks, with a review of every mistake and a history of attempts. Reading (読解) isn't included, so the score is an estimate.
- **Textbooks** — follow Genki I & II (23 lessons) or Basic Kanji Book 1 & 2 (45 lessons, 500 kanji) lesson by lesson. Each Genki lesson has its words (main list, reading section and extras), its kanji, its grammar points linked to the app's grammar lessons, and the verb and adjective forms it introduces. Learn, flashcards and quizzes use the same cards as the rest of the app, so progress is shared; words that aren't in the JLPT lists get their own cards and join your reviews once studied. Pick a current lesson and it appears on the home screen. Every Genki grammar point has 3–7 practice sentences written for this app, using only that lesson's level of Japanese, shown under the point and on the matching grammar card anywhere in the app. They become exercises (fill in the blank, pick the sentence that says the English, say what a sentence means), each with the answer and the reason, and each lesson has a 20-question test mixing its grammar, words and verb forms, with your best score kept.
- **Conjugation drill** — every form a beginner course teaches (polite, short forms, て/た, たい, potential, volitional, たら, ば, passive, causative, command, causative-passive, and い/な-adjective forms). Type the answer (romaji or kana) or choose it. Every answer comes with the rule behind it, and a wrong answer is named: the other verb group, the wrong て sound, a neighbouring form, きれい treated as an い-adjective. Drill Genki words up to a lesson or your JLPT levels; your weakest forms are tracked. Verb classes come from JMdict's tags; the engine was checked against a separately written conjugator on every JLPT verb and adjective in every form (68,000+ conjugations, no differences).
- **Memory pictures** — every hiragana and katakana, and 100 picture-like kanji (山, 川, 鳥, 北, 門…), has an original drawing that turns into the character: the picture, then the picture with the character's strokes drawn over it in red, then the plain character (tap *Watch it change* to replay). ゛ and ゜ forms reuse the base character's picture. Drawn for this app as SVG over KanjiVG strokes; nothing is copied from any book.
- **Picture breakdowns** — every other kanji made of two or more parts shows as a little equation: the kanji with each part's strokes in its own colour, = part + part, each with a picture and its meaning, and one line tying them together (校 = 木 tree + 交 mix: the tree says what it's about, 交 lends its sound こう). Tap a part to open it. Built from KanjiVG's part groups and Make Me a Hanzi's origin data.
- **Look-alike kanji** — like WaniKani's visually similar kanji: every kanji page shows the kanji you might mix it up with, side by side, with a tip for telling them apart (hand-written for the classic pairs such as 未/末, 土/士, 問/間/聞; built from the parts each kanji is made of for the rest). Kanji quizzes use look-alikes as wrong options, and if you pick one, the answer card says so and shows the difference.
- **Type it** — a question type for words and kanji where you type the answer instead of picking it: the reading (romaji turns into kana) or the meaning in English. Small typos in meanings are forgiven, a reading one sound off gets a second try, and typing the meaning where the reading was asked (or the other way round) gets a nudge instead of a wrong answer.
- **Review helpers** — Trouble spots on Home (the items you keep missing, with a drill), “Undo, I misclicked” on a wrong answer, “I already know this” for new items, Vacation mode (reviews pause, the streak is kept and nothing piles up), slower audio (0.85× / 0.7×), and the app can be installed on a phone's home screen and opens offline.
- **Search** — Japanese, romaji or English across all levels: words, kanji and grammar.
- **Native audio** — word recordings by native speakers from Tofugu & WaniKani, with Kanji alive filling gaps, and native recordings of example sentences from Tatoeba (each one credited to its recorder). Every recording gets a little silence added before and after it, so phones and Bluetooth headphones don't cut off the first syllable. The build prefers example sentences that have a recording, and the mock exam's listening section uses them. There's no synthetic voice: items without a recording simply have no play button, and the listening section uses recorded sentences only.
- **Anki decks** — Settings → Add an Anki deck (.apkg). The importer reads both Anki package formats, finds the word, reading, meaning, sentence, audio and picture fields (you can correct them), and the dojo adapts: dictionary words get your deck's voice, sentence and picture; the deck's other words become a “My deck” level; your Anki progress marks words you already know so the Path skips lessons you don't need; and the Path gets a “My deck” track in the deck's order. The deck stays in your browser (IndexedDB) and is never uploaded. The libraries it uses live in `vendor/`.
- **Several decks at once** — every deck you add syncs into the same words: a word in two decks stays one word, with both decks' sentences (and their pictures) and the best Anki progress from either. **Deck quiz** (Path → My decks, or Home) tests you on your decks with mixed questions: meaning, word, reading, listening to the deck's voice, pictures, fill-the-blank on your deck's sentences and sentence meaning. Answers update your reviews.
- **Chat** — text with Yui, a Japanese friend who writes like people really text (casual forms, 笑, emoji, まじ/それな). **Free chat** works offline with no account: 34 hand-written conversations on everyday topics (weather, mornings, meals, family, pets, shopping, shows, games, birthdays, feeling unwell, tests, part-time work, holidays, seasons, commuting, stress, social media, running late, saying thanks, good night and more). Type your own reply or tap a suggestion; she picks up yes/no and the thing you mention, and a tip shows the casual version when you write textbook です/ます. **AI chat** (optional) talks about anything, in casual, polite-casual or Kansai style, using your own Anthropic API key, which stays in your browser. Both have furigana, English on tap, words to save and a romaji-to-kana switch.
- **Play** — はじまりの町, a pixel-art N5 town you walk around (keyboard, on-screen pad or tap), with clean cards for talking and quizzes. The dojo opens your next N5 lesson, the school runs your reviews, the station has the Travel lessons; shop at the konbini and order at the café in real Japanese; chat with Yui; beat Sensei in a quiz battle; the old man on the bench has a word of the day; and nine kanji are hidden where they came from (山 by the mountain, 川 by the river, 田 by the rice field…). Once you add an Anki deck, the town follows it: Sensei battles you on your deck words (the due and shaky ones first, with your deck's recordings and sentences), and a bookshop (本屋) opens with your deck stats, a quick deck quiz, the full Deck quiz and your Deck extras lessons. Everything counts in the app: XP, reviews and lessons. All the art is drawn in code.
- **Progress** — per-level progress, reviews today, streak. Export/import to move between devices.
- Furigana on / tap-to-reveal / off, optional romaji, native-speaker audio, light and dark mode.

## Set it up (about 5 minutes)

You need 4 files in your repo: `index.html`, `build-data.mjs`, `LICENSES.md` and
`.github/workflows/deploy.yml`.

1. **Create a repo** on GitHub (public, e.g. `kotoba-dojo`).
2. **Upload** `index.html`, `build-data.mjs`, `LICENSES.md` and this README: **Add file → Upload files → Commit**.
3. **Add the workflow.** GitHub's web upload doesn't keep folders, so create this one by hand: **Add file → Create new file**, type the name `.github/workflows/deploy.yml` (the slashes make the folders), paste in the contents of `deploy.yml`, and **Commit**.
   On a computer you can instead drag the whole unzipped folder in, or use `git push`.
4. **Turn on Pages:** **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Go to the **Actions** tab. If the workflow hasn't started, open **Build data and deploy** → **Run workflow**. The first run takes about 15–25 minutes (it downloads the dictionaries and a few thousand audio recordings). Later runs reuse a cache and are much quicker.
6. Your app is live at `https://<username>.github.io/<repo>/`. On your phone, **Add to Home Screen** to open it like an app.

Until the first build finishes, or if you open `index.html` straight from your
files, the app runs on a small built-in starter set so it still works.

## How the data is built

`build-data.mjs` (Node 20+, no dependencies; `kuromoji` optional):

1. Loads the JLPT N5–N1 word lists (`jmdict_seq` IDs when available, otherwise matching by spelling + reading).
2. Matches each word to **JMdict** (the `jmdict-examples-eng` release from jmdict-simplified, which already links Tatoeba sentences to senses).
3. Reads JMdict's priority tags (`nf01`–`nf48`, `news1`, `ichi1`…) for word frequency.
4. Tops up example sentences from the **Tatoeba** exports, matching by dictionary form with kuromoji, and adds furigana.
5. Builds kanji from **KANJIDIC2**, with current JLPT levels from kanji-data and stroke paths from **KanjiVG**.
6. Copies native recordings for matching words from **tofugu/japanese-vocabulary-pronunciation-audio** (sparse git clone of `lib/mp3`, matched on word + reading), then **Kanji alive** for the rest, and downloads Tatoeba recordings for the chosen example sentences (licensed ones only, cached between runs).
   Recordings are padded with silence with ffmpeg (the workflow installs it). Example sentences go through a translation check: when the Japanese names an exact family member (弟 younger brother, 姉 older sister, 祖母 grandmother …), the English must say so. Where a plain "brother" can be made exact it is corrected; otherwise the sentence is dropped. Examples whose English actually uses the word's meaning are preferred.
7. Adds JLPT grammar from **hanabira.org**'s content repo (`grammar_ja_N*.json`), with furigana on the examples.
7b. Reads each kanji's top-level parts from **KanjiVG** (and which part each stroke belongs to, stored as `g` in `data/strokes-*.json` for the coloured picture breakdowns), its origin story from **Make Me a Hanzi** (`dictionary.txt`, looked up by the pre-1946 form where Japan simplified it), and **Kanjium**'s formation type, sound components, look-alikes and radical names (sparse git clones); writes `data/parts.json` with part meanings.
8. (Off unless you pass `--pictures`.) Matches **OpenMoji** pictures to words and kanji by meaning. The app no longer shows them.
9. Writes `data/vocab-n5.json … n1`, `data/kanji-*.json`, `data/strokes-*.json`, `data/grammar-*.json`, `data/audio/*.mp3`, `data/saudio/*.mp3`, `data/img/*.svg` and `data/meta.json`. The app loads a level only when you select it.

Every optional source fails soft. If Tatoeba, KanjiVG or the frequency file is
unreachable, the build still finishes and notes what's missing under **Settings → Data**.

Run it yourself:
```bash
npm install kuromoji        # optional, adds furigana + better sentence matching
node build-data.mjs --out data
# or, with files you've already downloaded:
node build-data.mjs --from-dir ./downloads --out data
```
Other flags: `--no-tatoeba`, `--no-freq`, `--no-kuromoji`, `--no-grammar`, `--no-audio`, `--audio-dir DIR`, `--no-kanjialive`, `--no-sentence-audio`, `--max-sentence-audio 6000`, `--commercial-audio-only`, `--pictures`, `--no-icons` (OpenMoji only), `--no-3d` (flat pictures only), `--no-structure` (no kanji origins or parts), `--no-origins` (parts only), `--openmoji-dir DIR`, `--max-examples 3`.

## Notes
- Progress is stored in your browser. Use **Settings → Export** to back it up.
- A word counts as **known** once its review interval reaches two weeks.
- Licences and credits are in [LICENSES.md](LICENSES.md) and on the app's Settings page.
