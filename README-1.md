# Kotoba Dojo — Japanese vocab & kanji trainer

A single-page app for learning Japanese with multiple-choice questions. No build step, no server — it runs entirely in the browser, so it works on GitHub Pages as-is.

## Features
- **Learn mode** — pick the meaning from 4 choices, then see the full breakdown: reading, romaji, part of speech, JLPT level, example sentence, audio, and the kanji inside the word.
- **Test mode** — vocab or kanji, word → meaning, meaning → word, or mixed. No hints during the test; full review and "retest my mistakes" at the end.
- **Furigana** — show, tap-to-reveal, or hide (Settings).
- **Frequency bars** next to every word and kanji (5 bars = essential, 1 = rare).
- **Kanji section** — study by frequency rank (in groups of 25) or by JLPT level. Practise meaning, picking the kanji, or readings (on'yomi / kun'yomi).
- **Smart repetition** — new and missed items come up more often. Progress is saved in your browser.
- **My words** — paste your own vocab in Settings (`word, reading, meaning`).
- Audio via your device's Japanese text-to-speech voice. Works on phone and desktop, light and dark mode.

Starter content: 118 words (N5–N4, with travel phrases) and 115 kanji (all common N5 plus core N4).

## Put it on GitHub Pages
1. Create a new public repository on GitHub (e.g. `kotoba-dojo`).
2. Upload `index.html` (and this README) to the root of the repo — **Add file → Upload files** works fine from a phone.
3. Go to **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. After a minute your app is live at `https://<your-username>.github.io/<repo-name>/`.

Tip: on your phone, open the link and use **Add to Home Screen** so it opens like an app.

## Adding more content
Edit the `VOCAB` and `KANJI` arrays near the top of the `<script>` in `index.html`.

Vocab entry:
```js
["{食|た}べる","たべる","to eat","verb","N5",5,"Verbs","{何|なに}を{食|た}べますか。","What will you eat?"]
// word with furigana, reading, meaning, part of speech, JLPT, frequency 1-5, topic, example, translation
```
Furigana markup is `{漢字|かんじ}`.

Kanji entry:
```js
["日","day; sun; Japan","ニチ、ジツ","ひ、か","N5",1,4,"日本|にほん|Japan;毎日|まいにち|every day"]
// kanji, meaning, on'yomi, kun'yomi, JLPT, frequency rank, strokes, examples
```

## Notes
- Kanji frequency ranks are approximate (newspaper usage). JLPT levels follow common unofficial lists, since official lists aren't published.
- Progress lives in your browser's local storage, so it's per device/browser.
