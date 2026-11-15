import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

function app(extra = {}) {
  return load(['js/03-progress-spaced-repetition.js', 'js/36-today.js'], {
    settings: {}, progress: {}, actLog: {}, App: {}, READ: [{ lv: 'N5', id: 'a', q: [1] }], V: [], K: [],
    DATA: { mode: 'full' }, userLevel: () => 'N5', shAvailable: () => true, readStats: () => ({}), writeStats: () => ({}),
    hashStr: s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7), shuffle: a => a, LV: ['N5', 'N4', 'N3', 'N2', 'N1'], ...extra
  });
}

test('a skill is done only after enough practice, and only for today', () => {
  const { get } = app();
  get('skillTick')('listen', 3); get('skillTick')('listen', 3);
  assert.equal(get('flagged')('skill:listen'), false);
  get('skillTick')('listen', 3);
  assert.equal(get('flagged')('skill:listen'), true);
  assert.equal(get('skillCount')('listen'), 3);
});

test('today’s skill is one that is available, stays the same all day, and prefers the least recently done', () => {
  const a = app();
  const s1 = a.get('todaySkill'), first = s1();
  assert.ok(['read', 'shadow'].includes(first.id), 'only reading and shadowing are available here: ' + first.id);
  assert.equal(s1().id, first.id, 'same skill all day');
  // reading done yesterday, shadowing never: shadowing comes first on a new day
  const b = app();
  b.ctx.store.set('skillLast', { read: '2020-01-01' });
  assert.equal(b.get('todaySkill')().id, 'shadow');
});

test('the stop shows progress and ticks off', () => {
  const { get } = app({ shAvailable: () => false });
  const st = get('todayStop')();
  assert.equal(st.title, 'Practice: Reading'); assert.equal(st.done, false);
  get('skillTick')('read', 1);
  assert.equal(get('todayStop')().done, true);
});

test('loudness line: trims silence and measures the spoken length', () => {
  const { get } = load(['js/35-shadowing.js'], { App: {}, store: { get: (k, d) => d, set() {} } });
  const rate = 1000, s = new Float32Array(3000);   // 1 s silence, 1 s sound, 1 s silence
  for (let i = 1000; i < 2000; i++) s[i] = Math.sin(i / 3) * 0.5;
  const e = get('envelope')(s, rate, 20);
  assert.equal(e.v.length, 20);
  assert.ok(Math.abs(e.sec - 1) < 0.05, 'spoken length about 1 s: ' + e.sec);
  assert.ok(Math.max(...e.v) === 1);
  assert.equal(get('envelope')(new Float32Array(2000), rate).sec, 0);   // silence: nothing to show
});
