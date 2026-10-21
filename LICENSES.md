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
| [hanabira.org](https://hanabira.org/) grammar ([content repo](https://github.com/tristcoil/hanabira.org-japanese-content)) | hanabira.org | Creative Commons (in-house content; link back to hanabira.org required). Code: MIT | JLPT N5–N1 grammar points, formation, explanations, examples |
| [Japanese vocabulary pronunciation audio](https://github.com/tofugu/japanese-vocabulary-pronunciation-audio) | [Tofugu](https://www.tofugu.com) & [WaniKani](https://www.wanikani.com) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Native-speaker word recordings in `data/audio/` (copied unchanged, renamed by hash) |
| [Kanji alive](https://github.com/kanjialive/kanji-data-media) example-word audio | Kanji alive | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Native recordings for words the WaniKani set doesn't cover, in `data/audio/k*.mp3` |
| [Tatoeba](https://tatoeba.org/) sentence audio | Individual Tatoeba members (named on each sentence in the app) | Each recording's own licence (CC BY, CC BY-SA, CC BY-NC, CC0 …). Recordings without a reuse licence are never included; build with `--commercial-audio-only` to keep only licences that allow commercial use | Native recordings of example sentences in `data/saudio/` (copied unchanged) |
| [kuromoji.js](https://github.com/takuyaa/kuromoji.js) (build tool only) | Takuya Asano | Apache 2.0 | Furigana for example sentences |

The mock exam's questions are generated from the data above, not taken from JLPT papers (those are the Japan Foundation's copyright). Pass marks are the official ones published at [jlpt.jp](https://www.jlpt.jp/e/guideline/results.html).

The starter grammar set and the Situations word lists built into `index.html` were written for this app. Kana stroke order comes from KanjiVG (above).

The Japan Foundation doesn't publish official JLPT word lists. The N5–N1 levels
here follow the widely used community lists above.

This app uses the EDRDG files in conformance with the
[EDRDG licence](https://www.edrdg.org/edrdg/licence.html).
