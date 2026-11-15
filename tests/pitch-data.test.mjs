import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAccents, pitchFor, moraCount, parseAccentField } from '../lib/pitch.mjs';

const sample = ['箸\tはし\t1', '橋\tはし\t2', '端\tはし\t0', '雨\tあめ\t1', '飴\tあめ\t0', '寿司\tすし\t2,1',
  'テレビ\t\t1', 'コーヒー\t\t3', '２つ\tふたつ\t(副)0,(名)3', '変\tへん\t9', '壊れ\tこわれ\tx', '東京\tとうきょう\t0'].join('\n');
const map = parseAccents(sample);

test('morae: small kana join, っ and ー count', () => {
  assert.equal(moraCount('きょう'), 2); assert.equal(moraCount('がっこう'), 4); assert.equal(moraCount('コーヒー'), 4);
  assert.equal(moraCount('しゅっぱつ'), 4); assert.equal(moraCount('ファイル'), 3);
});
test('exact word + reading only, homophones stay apart', () => {
  assert.deepEqual(pitchFor(map, '箸', 'はし'), [1]);
  assert.deepEqual(pitchFor(map, '橋', 'はし'), [2]);
  assert.deepEqual(pitchFor(map, '端', 'はし'), [0]);
  assert.deepEqual(pitchFor(map, '雨', 'あめ'), [1]);
  assert.deepEqual(pitchFor(map, '飴', 'あめ'), [0]);
  assert.equal(pitchFor(map, 'あめ', 'あめ'), null);
});
test('kana words and katakana readings', () => {
  assert.deepEqual(pitchFor(map, 'テレビ', 'てれび'), [1]);
  assert.deepEqual(pitchFor(map, 'コーヒー', 'コーヒー'), [3]);
});
test('several accents, labelled ones, and bad rows are dropped', () => {
  assert.deepEqual(pitchFor(map, '寿司', 'すし'), [2, 1]);
  assert.deepEqual(pitchFor(map, '２つ', 'ふたつ'), [[0, 'adverb'], [3, 'noun']]);
  assert.equal(pitchFor(map, '変', 'へん'), null);        // 9 > 2 morae
  assert.equal(pitchFor(map, '壊れ', 'こわれ'), null);
  assert.deepEqual(parseAccentField('(名;形動)1'), [{ n: 1, q: 'noun / な-adjective' }]);
});
test('alternative spelling', () => { assert.deepEqual(pitchFor(map, 'とうきょう', 'とうきょう', '東京'), [0]); });
