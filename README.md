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
- **Pictures** — a picture for every word and kanji whose meaning you can draw, shown in **3D** (Microsoft Fluent Emoji) by default, with flat OpenMoji drawings as an option (Settings → Picture style). Pictures come from OpenMoji's emoji set first, then Tabler Icons and game-icons.net for nouns OpenMoji doesn't have (exact name matches only). Picture-kanji like 日 山 川 木 get their origin picture. Every picture shows what the whole word means (大学 → 🎓); words whose meaning can't be drawn simply have no picture. Shown on word cards, lists, kanji tiles and flashcards, plus *Picture → word* and *Picture → kanji* quizzes. In dark mode pictures sit on a light tile so their outlines stay visible. Turn off in Settings.
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
- **Grammar** — JLPT N5–N1 grammar from **hanabira.org**: formation, explanation and example sentences with furigana. Flashcards, fill-in-the-blank quizzes and grammar tests.
- **Mock exam** — timed, JLPT-style exam per level: 漢字読み, 表記, 文脈規定, 言い換え, 文法形式, 文の組み立て (★) and 聴解 (listening). Scored against the official pass marks, with a review of every mistake and a history of attempts. Reading (読解) isn't included, so the score is an estimate.
- **Search** — Japanese, romaji or English across all levels: words, kanji and grammar.
- **Native audio** — word recordings by native speakers from Tofugu & WaniKani, with Kanji alive filling gaps, and native recordings of example sentences from Tatoeba (each one credited to its recorder). Every recording gets a little silence added before and after it, so phones and Bluetooth headphones don't cut off the first syllable. The build prefers example sentences that have a recording, and the mock exam's listening section uses them. There's no synthetic voice: items without a recording simply have no play button, and the listening section uses recorded sentences only.
- **Anki decks** — Settings → Add an Anki deck (.apkg). The importer reads both Anki package formats, finds the word, reading, meaning, sentence, audio and picture fields (you can correct them), and the dojo adapts: dictionary words get your deck's voice, sentence and picture; the deck's other words become a “My deck” level; your Anki progress marks words you already know so the Path skips lessons you don't need; and the Path gets a “My deck” track in the deck's order. The deck stays in your browser (IndexedDB) and is never uploaded. The libraries it uses live in `vendor/`.
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
7b. Reads each kanji's top-level parts from **KanjiVG**, its origin story from **Make Me a Hanzi** (`dictionary.txt`, looked up by the pre-1946 form where Japan simplified it), and **Kanjium**'s formation type, sound components, look-alikes and radical names (sparse git clones); writes `data/parts.json` with part meanings.
8. Matches **OpenMoji** pictures to words and kanji by meaning, then **Tabler Icons** and **game-icons.net** (sparse git clones) for nouns and kanji whose meaning is exactly an icon's name, recoloured to the app's ink. Each emoji picture is also copied in 3D from **Fluent Emoji** (sparse git clone of the 3D PNGs only). Copies only the files used.
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
Other flags: `--no-tatoeba`, `--no-freq`, `--no-kuromoji`, `--no-grammar`, `--no-audio`, `--audio-dir DIR`, `--no-kanjialive`, `--no-sentence-audio`, `--max-sentence-audio 6000`, `--commercial-audio-only`, `--no-pictures`, `--no-icons` (OpenMoji only), `--no-3d` (flat pictures only), `--no-structure` (no kanji origins or parts), `--no-origins` (parts only), `--openmoji-dir DIR`, `--max-examples 3`.

## Notes
- Progress is stored in your browser. Use **Settings → Export** to back it up.
- A word counts as **known** once its review interval reaches two weeks.
- Licences and credits are in [LICENSES.md](LICENSES.md) and on the app's Settings page.
