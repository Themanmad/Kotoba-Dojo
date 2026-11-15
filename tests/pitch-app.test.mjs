import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';
import { moraCount } from '../lib/pitch.mjs';

const { get } = load(['js/31-pitch-accent.js'], { settings: { pitch: true }, esc: s => String(s) });
const shape = (r, n) => get('morae')(r).map((_, i) => get('paHigh')(n, i) ? 'H' : 'L').join('');

test('morae match the build-side count', () => {
  for (const r of ['きょう', 'がっこう', 'コーヒー', 'しゅっぱつ', 'ファイル', 'でんしゃ', 'ありがとう'])
    assert.equal(get('morae')(r).length, moraCount(r), r);
  assert.equal(JSON.stringify(get('morae')('きょう')), '["きょ","う"]');
});
test('the four patterns', () => {
  assert.equal(shape('さかな', 0), 'LHH');   // 魚 平板
  assert.equal(shape('はし', 1), 'HL');      // 箸 頭高
  assert.equal(shape('はし', 2), 'LH');      // 橋 尾高 (the particle drops)
  assert.equal(shape('たべる', 2), 'LHL');   // 食べる 中高
  assert.equal(shape('せんせい', 3), 'LHHL');
});
test('heiban vs odaka differ only on the particle', () => {
  const flat = get('pitchLine')('はし', 0, true), tail = get('pitchLine')('はし', 2, true);
  assert.match(flat, /pa-m h pa-p">が/);
  assert.match(tail, /pa-m l step pa-p">が/);
});
test('names and data forms', () => {
  assert.equal(get('paName')(0, 3)[0], '平板'); assert.equal(get('paName')(1, 2)[0], '頭高');
  assert.equal(get('paName')(2, 2)[0], '尾高'); assert.equal(get('paName')(2, 3)[0], '中高');
  assert.equal(get('pitchHtml')({ r: 'すし', pa: [2, 1], pos: 'noun' }).match(/pa-row/g).length, 2);
  assert.match(get('pitchHtml')({ r: 'ふたつ', pa: [[0, 'adverb'], [3, 'noun']], pos: 'noun' }), /adverb: Flat/);
  assert.equal(get('pitchHtml')({ r: 'へん', pa: [9] }), '');
  assert.equal(get('pitchHtml')({ r: 'へん' }), '');
});
