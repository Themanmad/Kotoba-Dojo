# Contributing to Kotoba Dojo

Thanks for helping. Reports of a wrong reading, a confusing question or a bug are as useful as code.

## Reporting a problem
Open an issue (Settings → Help make it better links straight to it). Please include:
- what you saw and where (screen, word or kanji, level),
- what you expected, and a screenshot if you can,
- your browser and device.

## Changing the app
1. Edit files in `src/` (never `index.html` directly). `src/index.html` lists every CSS and JS file in load order.
2. Run `node build.mjs` to rebuild `index.html`, and `node --test tests/*.test.mjs` to run the tests. Node 20 or newer, no install step.
3. Open `index.html` through a local server (`python3 -m http.server`) and try your change in light and dark mode and at phone width.
4. Commit `src/` and the rebuilt `index.html` together. CI fails if they don't match.

## Content rules
- Everything shipped must be free to share. Data from outside the project needs an open licence that allows it, credited in `LICENSES.md` and in Settings → Credits.
- Don't copy text, exercises or answers from textbooks, JLPT papers or paid courses. Write your own; it's fine to follow the same topics and order.
- Japanese text needs correct furigana (`{漢字|かんじ}`) and level-appropriate vocabulary. Words above a passage's level go in its glossary.
- Explanations are short, in plain English, and say *why*, not just *what*.

## Code style
- Plain JavaScript, no framework and no build-time dependencies.
- Keep logic that can be tested free of the DOM, and add a test in `tests/` for it.
