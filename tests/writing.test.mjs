import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, root } from './load.mjs';

const { get } = load(['js/34-writing.js'], { App: {}, settings: {} });
const pathPoints = get('pathPoints'), strokeOk = get('strokeOk'), resample = get('resample');
// KanjiVG stroke data: a sample file kept with the tests (real paths from KanjiVG, CC BY-SA 3.0)
const data = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'strokes-sample.json'), 'utf8'));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/* a hand-drawn version: points every ~1.5 units, shifted, slightly stretched, with a smooth wobble (not per-point noise) */
function hand(pts, amt) {
  const R = resample(pts, Math.max(6, Math.round(get('wLen')(pts) / 1.5)));
  const ox = (rnd() - 0.5) * 6, oy = (rnd() - 0.5) * 6, sc = 0.92 + rnd() * 0.16, ph = rnd() * 6.28, cx = 54.5, cy = 54.5;
  return R.map(([x, y], k) => { const w = Math.sin(k / R.length * 6.28 + ph) * amt; return [cx + (x - cx) * sc + ox + w, cy + (y - cy) * sc + oy - w]; });
}

test('path parsing follows KanjiVG strokes', () => {
  const p = pathPoints('M31.5,24.5c1.12,1.12,1.74,2.75,1.74,4.75c0,1.6-0.16,38.11-0.09,53.5');
  assert.equal(JSON.stringify(p[0]), '[31.5,24.5]');
  const last = p[p.length - 1]; assert.ok(Math.abs(last[0] - (33.24 - 0.09)) < 1e-9 && Math.abs(last[1] - (29.25 + 53.5)) < 1e-9);
  const s = pathPoints('M10,10c5,0,10,5,10,10s5,10,10,10');   // smooth curve reflects the last control point
  assert.ok(Math.abs(s[s.length - 1][0] - 30) < 1e-9 && Math.abs(s[s.length - 1][1] - 30) < 1e-9);
  assert.equal(resample(p, 32).length, 32);
});

test('every stroke of every sample kanji: right strokes pass, reversed and wrong ones fail', () => {
  let n = 0, exact = 0, wob = 0, rev = 0, wrongAcc = 0, wrongN = 0;
  for (const [k, sd] of Object.entries(data)) {
    const S = sd.d.map(pathPoints);
    S.forEach((st, i) => {
      n++;
      if (strokeOk(st, S, i)) exact++;
      if (strokeOk(hand(st, 2.5), S, i)) wob++;
      if (strokeOk(hand(st, 1.5).reverse(), S, i)) rev++;
      S.forEach((other, j) => { if (j === i) return; wrongN++; if (strokeOk(other, S, i)) wrongAcc++; });
    });
  }
  const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
  console.log(`strokes ${n}: exact ${pct(exact, n)}, wobbly ${pct(wob, n)}, reversed accepted ${pct(rev, n)}, another stroke accepted ${pct(wrongAcc, wrongN)}`);
  assert.equal(exact, n, 'an exact stroke must always pass');
  assert.ok(wob / n > 0.97, 'a slightly wobbly stroke should pass');
  assert.ok(rev / n < 0.02, 'drawing a stroke backwards should fail');
  assert.ok(wrongAcc / wrongN < 0.03, 'drawing a different stroke should fail');
});
