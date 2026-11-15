import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('FSRS-5 core formulas', () => {
  const { get } = loadApp();
  const fRetr = get('fRetr'), fIvlDays = get('fIvlDays'), fD0 = get('fD0');
  near(fRetr(10, 10), 0.9);                 // stability means 90% recall after s days
  near(fIvlDays(10, 0.9), 10);              // and the interval at 90% is s itself
  near(fD0(3), 7.1949 - Math.exp(0.5345 * 2) + 1);
  near(fD0(1), 7.1949);                     // again on a new card: hardest start
  assert.ok(fIvlDays(10, 0.95) < 10 && fIvlDays(10, 0.85) > 10);
});

test('new card: first grades use the default initial stabilities', () => {
  const { get } = loadApp();
  const o = get('fPreview')(null, Date.now());
  near(o[1].s, 0.40255); near(o[2].s, 1.18385); near(o[3].s, 3.173); near(o[4].s, 15.69105);
  assert.deepEqual([o[1].days, o[2].days, o[3].days, o[4].days], [0, 1, 3, 16]);
});

test('review outcomes are ordered and success grows stability', () => {
  const { get } = loadApp();
  const DAY = 86400e3, now = Date.now();
  for (const [s, f, ago] of [[3, 5, 3], [20, 8, 25], [100, 2, 90], [1, 9.5, 5], [0.5, 5, 0.2]]) {
    const o = get('fPreview')({ s, f, t: now - ago * DAY }, now);
    assert.ok(o[2].days <= o[3].days && o[3].days < o[4].days, JSON.stringify(o));
    assert.ok(o[1].s <= s, 'forgetting never raises stability');
    if (ago >= 1) assert.ok(o[3].s > s && o[4].s > o[3].s, 'remembering raises stability');
    for (const G of [1, 2, 3, 4]) assert.ok(o[G].f >= 1 && o[G].f <= 10);
    assert.ok(o[1].f > o[3].f && o[3].f > o[4].f, 'again makes a card harder, easy makes it easier');
  }
});

test('schedule(): flashcards update progress and keep the box for progress screens', () => {
  const { get, ctx } = loadApp();
  const item = { id: 'v:食べる|たべる', lvl: 'N5', kind: 'vocab' }, DAY = 86400e3;
  const schedule = get('schedule'), progress = get('progress');
  assert.equal(Math.round(schedule(item, 2, true) / DAY), 3);   // dry run changes nothing
  assert.equal(progress[item.id], undefined);
  schedule(item, 2);
  let p = progress[item.id];
  assert.equal(p.c, 1); near(p.s, 3.173); assert.equal(p.b, get('boxOfDays')(3)); assert.ok(p.d > Date.now() + 2.9 * DAY);
  // pretend 3 days passed, answer good again: interval grows a lot
  p.t -= 3 * DAY; p.d -= 3 * DAY;
  schedule(item, 2); p = progress[item.id];
  assert.ok(p.s > 8, 'stability after a second good review: ' + p.s);
  schedule(item, 0); p = progress[item.id];  // again
  assert.equal(p.w, 1); assert.ok(p.d - Date.now() <= 61e3);
  assert.equal(get('status')(item.id), 'learning');
});

test('cards from before FSRS keep their place', () => {
  const { get } = loadApp();
  const DAY = 86400e3, now = Date.now(), fState = get('fState');
  const st = fState({ c: 5, w: 1, b: 4, d: now + 2 * DAY, t: now - 12 * DAY });
  assert.equal(st.s, 14); assert.equal(st.f, 5); assert.equal(st.t, now - 12 * DAY);
  assert.equal(fState({ c: 0, w: 2, b: 0, d: now, t: now }), null);
  // a known card answered "good" when due stays known
  const o = get('fPreview')(st, now);
  assert.ok(get('boxOfDays')(o[3].days) >= 4);
});

test('quiz answers: right when not due does not reschedule; wrong is relearned in 10 minutes', () => {
  const { get } = loadApp();
  const rec = get('rec'), progress = get('progress'), DAY = 86400e3;
  const item = { id: 'k:日', lvl: 'N5', kind: 'kanji' };
  rec(item, true); const d1 = progress[item.id].d; near(progress[item.id].s, 3.173);
  rec(item, true); assert.equal(progress[item.id].d, d1);
  rec(item, false); const p = progress[item.id];
  assert.ok(p.d - Date.now() <= 10 * 60e3 + 1000 && p.d - Date.now() > 9 * 60e3);
});

test('retention setting changes intervals', () => {
  const a = loadApp({ retention: 0.95 }), b = loadApp({ retention: 0.85 });
  const st = { s: 30, f: 5, t: Date.now() - 30 * 86400e3 };
  assert.ok(a.get('fPreview')(st, Date.now())[3].days < b.get('fPreview')(st, Date.now())[3].days);
});

function loadApp(settings = {}) {
  return load(['js/03-progress-spaced-repetition.js'], { settings, progress: {}, actLog: {} });
}
