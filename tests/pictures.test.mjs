import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPicIndex, pictureFor } from '../build-data.mjs';

const E = (emoji, annotation, hexcode) => ({ emoji, annotation, hexcode, group: 'x' });
const idx = buildPicIndex([
  E('🚲', 'bicycle', '1F6B2'), E('🏊', 'person swimming', '1F3CA'), E('🔭', 'telescope', '1F52D'), E('🧭', 'compass', '1F9ED'),
  E('🗄️', 'file cabinet', '1F5C4'), E('💴', 'yen banknote', '1F4B4'), E('🏢', 'office building', '1F3E2'), E('🥛', 'glass of milk', '1F95B'),
  E('☀️', 'sun', '2600'), E('🐕', 'dog', '1F415'), E('🍶', 'sake', '1F376'), E('✉️', 'envelope', '2709')
]);
const word = (w, glosses, pos = 'noun') => pictureFor(idx, glosses, pos, false, w);

test('a word keeps its picture when the emoji is named after the meaning', () => {
  assert.equal(word('自転車', ['bicycle', 'bike']), '1F6B2');
  assert.equal(word('泳ぐ', ['to swim'], 'verb'), '1F3CA');
  assert.equal(word('牛乳', ["(cow's) milk"]), '1F95B');
});

test('a picture that is only an association is dropped', () => {
  assert.equal(word('遠い', ['far', 'distant'], 'i-adj'), null, 'telescope is not "far"');
  assert.equal(word('北', ['north']), null, 'compass is not "north"');
  assert.equal(word('机', ['desk']), null, 'file cabinet is not a desk');
});

test('hand-checked pairs are kept, and only for the meaning they were checked for', () => {
  assert.equal(word('お金', ['money']), '1F4B4');
  assert.equal(word('会社', ['company', 'corporation', 'firm']), '1F3E2');
  assert.equal(word('仲間', ['company', 'fellow', 'colleague']), null, 'company as in companions');
});

test('words blocked by hand never get a picture', () => {
  assert.equal(word('ガラス', ['glass', 'pane']), null);
  assert.equal(word('文字', ['letter (of alphabet)', 'character']), null);
});

test('kanji: pictographs keep their picture, other kanji only for their first meaning', () => {
  assert.equal(pictureFor(idx, ['day', 'sun', 'japan'], 'noun', '日'), '2600');
  assert.equal(pictureFor(idx, ['dog'], 'noun', '犬'), '1F415');
  assert.equal(pictureFor(idx, ['do', 'change', 'sake'], 'noun', '為'), null);
});
