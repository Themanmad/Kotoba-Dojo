# Kotoba Dojo — Japanese vocab & kanji trainer

A GitHub Pages app for learning Japanese vocabulary and kanji, JLPT N5 to N1.
Your repo builds the data itself: a GitHub Action downloads the open
dictionaries, turns them into small files and publishes the site. It refreshes
every Monday.

## What's inside
- **Vocabulary** — the JLPT N5–N1 lists matched to **JMdict** entries: all main meanings, parts of speech, alternative spellings and furigana.
- **Kanji** — every JLPT kanji from **KANJIDIC2** (meanings, on/kun readings, stroke count, frequency rank) with animated **KanjiVG** stroke order.
- **Example sentences** — **Tatoeba** sentences with English translations and furigana, each linking back to its Tatoeba page.
- **Frequency bars** on every word (from JMdict's newspaper frequency bands) and every kanji (KANJIDIC rank).
- **Filter by level** — pick any mix of N5, N4, N3, N2, N1 and your own words, plus word type.
- **Flashcards** — spaced repetition (Again / Hard / Good / Easy). Due cards first, then a daily allowance of new cards.
- **Learn** — 4-choice quizzes with the full entry after each answer.
- **Test** — no hints, score and review at the end, retest your mistakes. Works for vocab and kanji.
- **Search** — Japanese, romaji or English across all levels, plus kanji.
- **Progress** — per-level progress, reviews today, streak. Export/import to move between devices.
- Furigana on / tap-to-reveal / off, optional romaji, Japanese audio, light and dark mode.

## Set it up (about 5 minutes)

You need 4 files in your repo: `index.html`, `build-data.mjs`, `LICENSES.md` and
`.github/workflows/deploy.yml`.

1. **Create a repo** on GitHub (public, e.g. `kotoba-dojo`).
2. **Upload** `index.html`, `build-data.mjs`, `LICENSES.md` and this README: **Add file → Upload files → Commit**.
3. **Add the workflow.** GitHub's web upload doesn't keep folders, so create this one by hand: **Add file → Create new file**, type the name `.github/workflows/deploy.yml` (the slashes make the folders), paste in the contents of `deploy.yml`, and **Commit**.
   On a computer you can instead drag the whole unzipped folder in, or use `git push`.
4. **Turn on Pages:** **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Go to the **Actions** tab. If the workflow hasn't started, open **Build data and deploy** → **Run workflow**. The first run takes about 5–10 minutes (it downloads ~200 MB of dictionaries). Later runs reuse a cache.
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
6. Writes `data/vocab-n5.json … n1`, `data/kanji-*.json`, `data/strokes-*.json` and `data/meta.json`. The app loads a level only when you select it.

Every optional source fails soft. If Tatoeba, KanjiVG or the frequency file is
unreachable, the build still finishes and notes what's missing under **Settings → Data**.

Run it yourself:
```bash
npm install kuromoji        # optional, adds furigana + better sentence matching
node build-data.mjs --out data
# or, with files you've already downloaded:
node build-data.mjs --from-dir ./downloads --out data
```
Other flags: `--no-tatoeba`, `--no-freq`, `--no-kuromoji`, `--max-examples 3`.

## Notes
- Progress is stored in your browser. Use **Settings → Export** to back it up.
- A word counts as **known** once its review interval reaches two weeks.
- Licences and credits are in [LICENSES.md](LICENSES.md) and on the app's Settings page.
