# Data sources and licences

The app code (`index.html`, `build-data.mjs`) is yours to use and change.
The files in `data/` are built from the open datasets below and must keep
their attribution. Because JMdict, KANJIDIC2 and KanjiVG are share-alike, the
generated `data/` files are distributed under **CC BY-SA 4.0**.

| Data | By | Licence | Used for |
|---|---|---|---|
| [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) | Electronic Dictionary Research and Development Group (EDRDG) | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) | Word meanings, readings, parts of speech, frequency bands |
| [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) | EDRDG | [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html) | Kanji meanings, on/kun readings, stroke counts, frequency ranks |
| [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) | scriptin | CC BY-SA 4.0 (data) | JSON conversion of JMdict and KANJIDIC2 |
| [KanjiVG](https://kanjivg.tagaini.net/) | Ulrich Apel and contributors | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Stroke-order diagrams |
| [Tatoeba](https://tatoeba.org/) | Tatoeba contributors | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) | Example sentences and translations (each one links to its source page) |
| [JLPT vocabulary lists](https://www.tanos.co.uk/jlpt/) | Jonathan Waller | [CC BY](https://creativecommons.org/licenses/by/4.0/) | Which words belong to N5–N1 (via [yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab) or [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks)) |
| [kanji-data](https://github.com/davidluzgouveia/kanji-data) | David Luz Gouveia | MIT | Current (post-2010) JLPT levels for kanji |
| [hanabira.org](https://hanabira.org/) grammar ([content repo](https://github.com/tristcoil/hanabira.org-japanese-content)) | hanabira.org | Creative Commons (in-house content; link back to hanabira.org required). Code: MIT | JLPT N5–N1 grammar points, formation, explanations, examples. **Changes:** the app regroups the points into chapters, reorders them, shortens each explanation to one line plus English equivalents, and builds practice questions from the examples; the full original explanation is still shown under “The full explanation”. |
| [Japanese vocabulary pronunciation audio](https://github.com/tofugu/japanese-vocabulary-pronunciation-audio) | [Tofugu](https://www.tofugu.com) & [WaniKani](https://www.wanikani.com) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Native-speaker word recordings in `data/audio/` (copied unchanged, renamed by hash) |
| [Kanji alive](https://github.com/kanjialive/kanji-data-media) example-word audio | Kanji alive | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Native recordings for words the WaniKani set doesn't cover, in `data/audio/k*.mp3` |
| [Tatoeba](https://tatoeba.org/) sentence audio | Individual Tatoeba members (named on each sentence in the app) | Each recording's own licence (CC BY, CC BY-SA, CC BY-NC, CC0 …). Recordings without a reuse licence are never included; build with `--commercial-audio-only` to keep only licences that allow commercial use | Native recordings of example sentences in `data/saudio/` (copied unchanged) |

**Changes made to the recordings:** every word and sentence recording is re-encoded with 0.35 s of silence added before it and 0.25 s after it, so that phones and Bluetooth headphones don't cut off the first syllable. Nothing else in the recordings is changed. The padded files are shared under the same licence as the originals.
| [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) `dictionary.txt` | Shaunak Kishore, derived from Unihan and CJKlib | [LGPL-3.0](https://www.gnu.org/licenses/lgpl-3.0.html) | The origin story of each kanji (e.g. 休 "A person 亻 leaning against a tree 木") and its meaning/sound parts, stored in `data/kanji-*.json` (field `og`). Japanese simplified forms are matched through their pre-1946 form. One hint is corrected (氣). You may redistribute and modify this data under the LGPL-3.0; the original is at the link. |
| [Kanjium](https://github.com/mifunetoshiro/kanjium) | mifunetoshiro (built largely on EDRDG's KANJIDIC and KRADFILE) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | How each kanji was formed (picture, symbol, combined meanings, meaning + sound), sound components and their readings, look-alike kanji, radical names and meanings. Text data only; Kanjium's origin images (© Richard Sears, chineseetymology.org) are **not** used. Stored in `data/kanji-*.json` and `data/parts.json` |
| Look-alike kanji similarity ([Niai](https://github.com/mwil/wanikani-userscripts/tree/master/wanikani-similar-kanji) packaging) | Lars Yencken, *Orthographic support for passing the reading hurdle in Japanese*, PhD thesis, University of Melbourne (2010) | CC BY 3.0 | Extra visually similar kanji (radical and stroke-edit similarity), merged with Kanjium's look-alikes and limited to JLPT kanji; the tips for telling them apart are written for this app |
| [kuromoji.js](https://github.com/takuyaa/kuromoji.js) (build tool only) | Takuya Asano | Apache 2.0 | Furigana for example sentences |

The mock exam's questions are generated from the data above, not taken from JLPT papers (those are the Japan Foundation's copyright). Pass marks are the official ones published at [jlpt.jp](https://www.jlpt.jp/e/guideline/results.html).

Textbook lessons: which lesson of *Genki* (3rd edition, The Japan Times) teaches each word, kanji and grammar point follows Genki's published index, and the lesson kanji of *Basic Kanji Book* (Bonjinsha) follow its table of contents. Only these lists of which-lesson-teaches-what are used, with Genki's short English glosses for words that aren't in JMdict's JLPT lists. No dialogues, explanations, exercises, answers or audio from either book are included; meanings come from JMdict and the grammar notes and lesson goals are written for this app. Genki and Basic Kanji Book are trademarks of their publishers; this app is not affiliated with them.

The memory pictures for kana and 100 kanji, their captions, and the part pictures and one-line stories in the picture breakdowns were made for this app and are released with it. They are original drawings built on KanjiVG stroke paths (CC BY-SA 3.0, so the drawings that include those strokes are shared under CC BY-SA 3.0 too); the part pictures are standard emoji. They were inspired by the general idea of picture mnemonics, but no drawing, story or character list was taken from *Kanji Pict-O-Graphix* or any other book.

The starter grammar set and the Situations word lists built into `index.html` were written for this app. Quote of the day uses public-domain works (poems, classical texts and proverbs; each is credited in the app). It can also show a few short, famous catchphrases by Shuzo Matsuoka and from anime/manga (SLAM DUNK, ONE PIECE, NARUTO, Evangelion, Demon Slayer, Detective Conan, Fullmetal Alchemist). These are not public domain: they remain © their creators and publishers, are quoted as single lines with the speaker, work, creator and rights holder shown, and can be switched off in Settings → Modern quotes; the English translations were written for this app. Kana stroke order comes from KanjiVG (above).

The Japan Foundation doesn't publish official JLPT word lists. The N5–N1 levels
here follow the widely used community lists above.

This app uses the EDRDG files in conformance with the
[EDRDG licence](https://www.edrdg.org/edrdg/licence.html).

## Libraries for importing Anki decks

Loaded only when you add an Anki deck. They are stored in `vendor/`.

| Library | By | Licence |
|---|---|---|
| [JSZip](https://github.com/Stuk/jszip) 3.10.2 | Stuart Knightley and contributors | [MIT](https://github.com/Stuk/jszip/blob/main/LICENSE.markdown) (or GPLv3) |
| [sql.js](https://github.com/sql-js/sql.js) 1.15.1 (SQLite compiled to WebAssembly) | sql.js contributors; SQLite is public domain | [MIT](https://github.com/sql-js/sql.js/blob/master/LICENSE) |
| [fzstd](https://github.com/101arrowz/fzstd) 0.1.1 (Zstandard decompression) | Arjun Barrett | [MIT](https://github.com/101arrowz/fzstd/blob/master/LICENSE) |

A deck you import is your own copy: it is stored only in your browser and never uploaded or published with the site.

