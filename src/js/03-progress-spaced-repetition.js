/* =====================================================================
   PROGRESS / SPACED REPETITION
   Scheduling uses FSRS-5 (Free Spaced Repetition Scheduler, MIT licence,
   github.com/open-spaced-repetition) with its published default parameters.
   Each card keeps a stability s (days until recall drops to 90%) and a difficulty f (1–10).
   The old "box" (0–8) is still kept for everything that shows progress:
   it is derived from the current interval, and a card counts as "known" from box 4 (a 14-day interval).
   ===================================================================== */
const IV = [0, 1, 3, 7, 14, 30, 60, 120, 240];
const KNOWN_BOX = 4;
const save = () => store.set('progress', progress);
function box(p) { if (p.b !== undefined) return p.b; return p.c >= 3 && p.c >= p.w * 2 ? 3 : 1; }
function status(id) { const p = progress[id]; if (!p) return 'new'; return box(p) >= KNOWN_BOX ? 'known' : 'learning'; }
const isDue = (id, now = Date.now()) => { const p = progress[id]; return !!p && (p.d || 0) <= now; };
/** r = reviews today; nv / nk = new flashcards introduced today (words / kanji). */
function logAct(newCard, kind) { const d = today(); const e = actLog[d] || { r: 0 }; e.r = (e.r || 0) + 1; if (newCard) { const k = kind === 'kanji' ? 'nk' : kind === 'grammar' ? 'ng' : kind === 'kana' ? 'na' : 'nv'; e[k] = (e[k] || 0) + 1; } actLog[d] = e; store.set('log', actLog); }
const todayLog = () => actLog[today()] || { r: 0 };
const dayFlag = k => { const d = today(), f = store.get('dayflags', {}); if (f.d !== d) { f.d = d; f.v = {}; } f.v[k] = 1; store.set('dayflags', f); };
const flagged = k => { const f = store.get('dayflags', {}); return f.d === today() && !!(f.v || {})[k]; };
const newLeft = kind => Math.max(0, settings.newPerDay - (todayLog()[kind === 'kanji' ? 'nk' : kind === 'grammar' ? 'ng' : kind === 'kana' ? 'na' : 'nv'] || 0));
function streak() {
  let n = 0; const d = new Date();
  if (!actLog[today()]) d.setDate(d.getDate() - 1);
  for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; if (actLog[k] && actLog[k].r) { n++; d.setDate(d.getDate() - 1); } else if ((actLog[k] && actLog[k].vac) || (settings.vac && k >= new Date(settings.vac).toISOString().slice(0, 10))) d.setDate(d.getDate() - 1); else break; }   // vacation days keep the streak without adding to it
  return n;
}
/* ---------- FSRS-5 ---------- */
const FSRS_W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
const F_DECAY = -0.5, F_FACTOR = 19 / 81, F_MAX_IVL = 3650;
const fRetention = () => Math.min(0.97, Math.max(0.75, +settings.retention || 0.9));
/** probability of recall after t days with stability s */
const fRetr = (t, s) => Math.pow(1 + F_FACTOR * t / s, F_DECAY);
/** days until recall falls to the target retention r */
const fIvlDays = (s, r) => s / F_FACTOR * (Math.pow(r, 1 / F_DECAY) - 1);
const fClampD = d => Math.min(10, Math.max(1, d));
const fClampS = s => Math.max(0.01, s);
/** FSRS grade G: 1 again, 2 hard, 3 good, 4 easy */
const fD0 = G => fClampD(FSRS_W[4] - Math.exp(FSRS_W[5] * (G - 1)) + 1);
function fNextD(d, G) {
  const W = FSRS_W, d1 = d - W[6] * (G - 3) * (10 - d) / 9;   // linear damping: harder cards move less
  return fClampD(W[7] * fD0(4) + (1 - W[7]) * d1);              // mean reversion toward an easy card
}
function fRecallS(d, s, r, G) {
  const W = FSRS_W, hard = G === 2 ? W[15] : 1, easy = G === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
}
function fForgetS(d, s, r) {
  const W = FSRS_W;
  return Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]));
}
const fShortS = (s, G) => s * Math.exp(FSRS_W[17] * (G - 3 + FSRS_W[18]));   // a second review on the same day
const boxOfDays = days => { let b = 0; for (let i = 0; i < IV.length; i++) if (days >= IV[i]) b = i; return b; };
/** a card's FSRS memory state, or null when it has never really been learned.
    Cards from before FSRS (box only) start from their box's interval. */
function fState(p) {
  if (!p) return null;
  if (p.s > 0) return { s: p.s, f: fClampD(p.f || 5), t: p.lr || p.t || Date.now() };
  const b = box(p); if (b <= 0) return null;
  return { s: IV[b], f: fClampD((p.w || 0) > (p.c || 0) ? 7 : 5), t: p.lr || p.t || (p.d ? p.d - IV[b] * DAY : Date.now()) };
}
/** the four possible outcomes { s, f, days } for grades 1..4; days is 0 for "again" (seen again in a minute) */
function fPreview(st, now) {
  const out = {};
  for (let G = 1; G <= 4; G++) {
    let s, f;
    if (!st) { s = FSRS_W[G - 1]; f = fD0(G); }
    else {
      const t = Math.max(0, (now - st.t) / DAY);
      f = fNextD(st.f, G);
      if (t < 1) s = fShortS(st.s, G);
      else { const r = fRetr(t, st.s); s = G === 1 ? fForgetS(st.f, st.s, r) : fRecallS(st.f, st.s, r, G); }
    }
    s = fClampS(s);
    out[G] = { s, f, days: G === 1 ? 0 : Math.min(F_MAX_IVL, Math.max(1, Math.round(fIvlDays(s, fRetention())))) };
  }
  // keep the buttons in order: hard ≤ good < easy
  out[2].days = Math.min(out[2].days, out[3].days);
  out[3].days = Math.max(out[3].days, out[2].days + (st ? 1 : 0));
  out[4].days = Math.max(out[4].days, out[3].days + 1);
  return out;
}
/** apply grade G to card p (mutates p) and return the due time */
function fApply(p, G, now) {
  const o = fPreview(fState(p), now)[G];
  p.s = Math.round(o.s * 1000) / 1000; p.f = Math.round(o.f * 100) / 100; delete p.lr;
  p.d = G === 1 ? now : now + o.days * DAY;
  p.b = G === 1 ? Math.min(boxOfDays(o.s), Math.max(0, box(p) - 2)) : boxOfDays(o.days);
  return p.d;
}
/** Quiz / test answers. Correct answers only advance the schedule when the item is due (or new). */
function rec(item, ok) {
  const now = Date.now(), isNew = !progress[item.id];
  const p = progress[item.id] || { c: 0, w: 0, b: 0, d: 0 };
  p.b = box(p); p.l = item.lvl;
  if (ok) { p.c++; if (isNew || now >= (p.d || 0)) fApply(p, 3, now); }
  else { p.w++; fApply(p, 1, now); p.d = now + 10 * 60e3; }
  p.t = now; progress[item.id] = p; save(); logAct(false, item.kind);
  if (!rec.silent) gameAnswer(ok);
}
/** Flashcard grades: 0 again, 1 hard, 2 good, 3 easy. dry: return the interval in ms without changing anything. */
function schedule(item, g, dry) {
  const now = Date.now(), p0 = progress[item.id], G = g + 1;
  if (dry) { const o = fPreview(fState(p0), now)[G]; return G === 1 ? 60e3 : o.days * DAY; }
  const p = Object.assign({ c: 0, w: 0, b: 0, d: 0 }, p0 || {}); p.b = p0 ? box(p0) : 0;
  if (G === 1) p.w++; else p.c++;
  fApply(p, G, now); if (G === 1) p.d = now + 60e3;
  p.t = now; p.l = item.lvl; progress[item.id] = p; save(); logAct(!p0, item.kind);
  if (!schedule.silent) gameAnswer(g >= 1);
}
const fmtIv = ms => ms < 3600e3 ? `${Math.max(1, Math.round(ms / 60e3))}m` : ms < DAY ? `${Math.round(ms / 3600e3)}h` : ms < 30 * DAY ? `${Math.round(ms / DAY)}d` : ms < 365 * DAY ? `${Math.round(ms / (30 * DAY))}mo` : `${Math.round(ms / (365 * DAY) * 10) / 10}y`;
function levelStats(kind, l) {
  const pre = kind === 'vocab' ? 'v:' : kind === 'kanji' ? 'k:' : 'g:'; let k = 0, n = 0;
  for (const [id, p] of Object.entries(progress)) if (id.startsWith(pre) && p.l === l) { n++; if (box(p) >= KNOWN_BOX) k++; }
  return { known: k, learning: n - k, total: levelTotal(kind, l) };
}
function dueCount() { const now = Date.now(); return Object.values(progress).filter(p => (p.d || 0) <= now).length; }

