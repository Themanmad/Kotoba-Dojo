import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const w = (id, word, lvl = 'N5', extra = {}) => ({ id, w: word, lvl, m: id, ...extra });
function app() {
  const V = [w('v1', 'テレビ'), w('v2', 'バー', 'N1'), w('v3', 'とても'), w('v4', 'きれい'), w('v5', 'ください'), w('v6', 'おかず', 'N2'),
    w('v7', 'およそ', 'N3'), w('v8', 'すると', 'N4'), w('v9', 'たった', 'N3'), w('v10', 'これ'), w('v11', 'たくさん'), w('v12', '出来る', 'N4', { alt: 'できる' }),
    w('v13', 'すぐに', 'N3', { freq: 1 }), w('v14', 'すぐに', 'N5'), w('v15', '食べる')];
  return load(['js/33-reading.js'], { V, LV: ['N5', 'N4', 'N3', 'N2', 'N1'], READ: [], App: {}, settings: {}, isHira: c => /[ぁ-ゟ]/.test(c) });
}
const found = (get, text, before) => Array.from(get('kanaHits')(text, before), ([a, b, x]) => text.slice(a, b) + '=' + x.id);

test('a katakana word is linked only when the whole run is that word', () => {
  const { get } = app();
  assert.deepEqual(found(get, 'テレビを'), ['テレビ=v1']);
  assert.deepEqual(found(get, 'のバーベキュー'), []);
  assert.deepEqual(found(get, 'レビ', 'テ'), [], 'a run that began before this stretch is not a whole word');
});

test('hiragana words need three kana and a place where a word can start', () => {
  const { get } = app();
  assert.deepEqual(found(get, 'はとてもきれいでした'), ['とても=v3', 'きれい=v4']);
  assert.deepEqual(found(get, 'がたくさんあります'), ['たくさん=v11']);
  assert.deepEqual(found(get, 'これは'), [], 'two-kana words are left alone');
  assert.deepEqual(found(get, 'そのままにしておかずに'), [], 'おかず inside しておかずに');
  assert.deepEqual(found(get, 'おおよそわかる'), [], 'およそ inside おおよそ');
  assert.deepEqual(found(get, 'えてください', '教'), ['ください=v5']);
});

test('ambiguous words are never linked, and kanji-written words match their kana spelling', () => {
  const { get } = app();
  assert.deepEqual(found(get, 'にすると'), []);
  assert.deepEqual(found(get, 'たった今', '月'), []);
  assert.deepEqual(found(get, 'できるだけ'), ['できる=v12']);
  assert.deepEqual(found(get, 'べる', '食'), []);
});

test('when two words share a spelling, the lower level wins', () => {
  const { get } = app();
  assert.deepEqual(found(get, 'すぐに'), ['すぐに=v14']);
});
