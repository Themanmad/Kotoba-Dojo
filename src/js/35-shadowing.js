/* =====================================================================
   SHADOWING: hear a native speaker say a sentence, say it yourself into the
   microphone, then play the two back to back and compare their rhythm on a
   simple loudness line. Recordings stay in memory on this device: nothing is
   saved or sent anywhere. Without a microphone it still works: listen, repeat
   aloud, and mark how it went.
   ===================================================================== */
const SH_N = 8;
const shStats = () => store.get('shadow', {});
/** sentences with a native recording, at your level and below; words you're learning first */
function shPool() {
  const lv = LV.indexOf(userLevel()), seen = new Set(), out = [];
  for (const x of V) {
    if (LV.indexOf(x.lvl) > lv) continue;
    for (const e of x.ex || []) {
      if (!e.au || seen.has(e.au)) continue;
      const len = plain(e.j).length; if (len < 4 || len > 30) continue;
      seen.add(e.au); out.push({ x, e, mine: !!progress[x.id], len });
    }
  }
  return out;
}
const shAvailable = () => DATA.mode === 'full' && V.some(x => (x.ex || []).some(e => e.au));
function shStart() {
  const st = shStats(), pool = shPool();
  if (!pool.length) return toast('No sentence recordings at your level yet');
  // ones you've shadowed least, then words you're learning, then shorter sentences
  pool.sort((a, b) => ((st[a.e.au] || {}).n || 0) - ((st[b.e.au] || {}).n || 0) || (b.mine - a.mine) || a.len - b.len);
  const head = pool.slice(0, Math.max(SH_N * 3, SH_N));
  S.sh = { items: shuffle(head).slice(0, SH_N), i: 0, rec: null, url: null, rating: [], stage: 'listen', showEn: false, slow: false, micErr: '' };
  S.view = 'shadow'; render(); window.scrollTo(0, 0);
  setTimeout(() => shPlayNative(), 300);
}
function shCur() { const H = S.sh; return H && H.items[H.i]; }
function shPlayNative() {
  const c = shCur(); if (!c) return;
  const keep = settings.audioRate; settings.audioRate = S.sh.slow ? 0.75 : 1; playAudio('s' + c.e.au, true); settings.audioRate = keep;
  if (S.sh.stage === 'listen') { S.sh.stage = 'speak'; render(); }
}
function shPlayMine(after) {
  const H = S.sh; if (!H || !H.url) return;
  if (curAudio) { try { curAudio.pause(); } catch (e) {} }
  const a = new Audio(H.url); a.dataset.id = 'mine'; curAudio = a; const p = a.play(); if (p && p.catch) p.catch(() => {});
  if (after) a.onended = after;
}
/* ---------- recording ---------- */
async function shRecord() {
  const H = S.sh; if (!H || H.rec) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { H.micErr = 'This browser can’t record. Say the sentence aloud after the speaker, then mark how it went.'; render(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { H.micErr = e && e.name === 'NotAllowedError' ? 'Microphone access is off. Allow it in your browser’s site settings to record, or just say the sentence aloud and mark how it went.' : 'No microphone found. Say the sentence aloud after the speaker, then mark how it went.'; render(); return; }
  if (curAudio) { try { curAudio.pause(); } catch (e) {} }
  const chunks = [], mr = new MediaRecorder(stream);
  H.rec = { mr, stream, t0: Date.now() }; H.micErr = '';
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    if (H.url) URL.revokeObjectURL(H.url);
    const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
    H.blob = blob; H.url = URL.createObjectURL(blob); H.rec = null; H.stage = 'compare'; H.env = null;
    render(); shEnvelopes();
  };
  mr.start();
  H.recTimer = setTimeout(() => { if (H.rec) shStop(); }, 15000);   // a sentence never needs more than 15 seconds
  render();
}
function shStop() { const H = S.sh; if (!H || !H.rec) return; clearTimeout(H.recTimer); try { H.rec.mr.stop(); } catch (e) { H.rec = null; render(); } }
/* ---------- loudness lines (rhythm and length, not pronunciation scoring) ---------- */
/** loudness of the sound over time, in n steps, with the silence at each end trimmed */
function envelope(samples, rate, n = 60) {
  const win = Math.max(1, Math.round(rate * 0.02)), rms = [];
  for (let i = 0; i + win <= samples.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += samples[k] * samples[k]; rms.push(Math.sqrt(s / win)); }
  if (!rms.length) return { v: [], sec: 0 };
  const peak = Math.max(...rms) || 1, th = peak * 0.12;
  let a = rms.findIndex(v => v > th), b = rms.length - 1; while (b > a && rms[b] <= th) b--;
  if (a < 0) return { v: [], sec: 0 };
  const seg = rms.slice(a, b + 1), out = [];
  for (let i = 0; i < n; i++) { const lo = Math.floor(i * seg.length / n), hi = Math.max(lo + 1, Math.floor((i + 1) * seg.length / n)); out.push(Math.max(...seg.slice(lo, hi)) / peak); }
  return { v: out, sec: seg.length * 0.02 };
}
async function shEnvelopes() {
  const H = S.sh, c = shCur(); if (!H || !c || !H.blob) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC(), dec = buf => new Promise((res, rej) => { const p = ac.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); });
    const nat = await fetch(`data/saudio/${c.e.au}.mp3`).then(r => r.arrayBuffer()).then(dec);
    const mine = await H.blob.arrayBuffer().then(dec);
    const en = envelope(nat.getChannelData(0), nat.sampleRate), em = envelope(mine.getChannelData(0), mine.sampleRate);
    if (ac.close) ac.close();
    if (S.sh !== H || shCur() !== c) return;
    H.env = { nat: en, mine: em }; render();
  } catch (e) { /* the comparison line is a bonus: playback still works without it */ }
}
function shEnvSvg(env) {
  const W = 300, Hh = 34, bar = (v, i, n, y0, up) => { const w = W / n, h = Math.max(1, v * (Hh - 4)); return `<rect x="${(i * w).toFixed(1)}" y="${(up ? y0 - h : y0).toFixed(1)}" width="${Math.max(1, w - 1).toFixed(1)}" height="${h.toFixed(1)}" rx="1"/>`; };
  const longest = Math.max(env.nat.sec, env.mine.sec) || 1, scale = s => (s / longest);
  const row = (e, y0, up, cls) => `<g class="${cls}" transform="scale(${scale(e.sec).toFixed(3)},1)">${e.v.map((v, i) => bar(v, i, e.v.length, y0, up)).join('')}</g>`;
  const ratio = env.nat.sec ? env.mine.sec / env.nat.sec : 1;
  const pace = ratio > 1.35 ? 'You took noticeably longer: try keeping up with the speaker.' : ratio < 0.75 ? 'You were quicker than the speaker: slow down a little.' : 'Your pace is close to the speaker’s.';
  return `<div class="sh-env"><svg viewBox="0 0 ${W} ${Hh * 2 + 4}" role="img" aria-label="Loudness over time: speaker on top, you below. ${pace}">${row(env.nat, Hh, true, 'nat')}${row(env.mine, Hh + 4, false, 'mine')}</svg>
    <div class="sh-leg"><span><i class="nat"></i>Speaker ${env.nat.sec.toFixed(1)}s</span><span><i class="mine"></i>You ${env.mine.sec.toFixed(1)}s</span></div><p class="sh-pace">${pace}</p></div>`;
}
/* ---------- screens ---------- */
function vShadow() {
  const H = S.sh; if (!H) { S.view = 'home'; return vHome(); }
  if (H.i >= H.items.length) return vShadowDone();
  const c = shCur(), recording = !!H.rec;
  const credit = c.e.by ? `Recording: ${esc(c.e.by)}${c.e.lic ? ` (${esc(c.e.lic)})` : ''}, Tatoeba` : 'Recording from Tatoeba';
  return `<div class="qtop"><button class="ghost" onclick="App.shEnd()">✕ End</button><span class="muted">${H.i + 1} of ${H.items.length}</span></div>
  <div class="track" aria-hidden="true">${H.items.map((z, k) => `<i class="${k < H.i ? (H.rating[k] ? 'ok' : 'bad') : k === H.i ? 'cur' : ''}"></i>`).join('')}</div>
  <div class="card sh-card">
    <div class="sh-steps"><span class="${H.stage === 'listen' ? 'on' : 'done'}">1 Listen</span><span class="${H.stage === 'speak' ? 'on' : H.stage === 'compare' ? 'done' : ''}">2 Say it</span><span class="${H.stage === 'compare' ? 'on' : ''}">3 Compare</span></div>
    ${H.hide ? `<button class="sh-hidden" onclick="App.shHide()">Text hidden: listen first. Tap to show it.</button>` : `<div class="sh-j jp">${ruby(c.e.j)}</div>`}
    ${H.showEn ? `<div class="sh-en">${esc(c.e.e)}</div>` : `<button class="linkbtn sh-en-btn" onclick="App.shEn()">Show the English</button>`}
    <div class="sh-row"><button class="btn sec" onclick="App.shNative()">🔊 Speaker</button><button class="chip ${H.slow ? 'on' : ''}" onclick="App.shSlow()" aria-pressed="${H.slow}">Slower</button><button class="chip ${H.hideAll ? 'on' : ''}" onclick="App.shHideAll()" aria-pressed="${!!H.hideAll}">Hide text</button></div>
    <div class="sh-mic">${recording ? `<button class="btn sh-rec on" onclick="App.shStop()">■ Stop</button><span class="sh-live" role="status">Recording… say the sentence</span>`
      : `<button class="btn sh-rec" onclick="App.shRecord()">● ${H.url ? 'Record again' : 'Record yourself'}</button>`}</div>
    ${H.micErr ? `<p class="sh-err" role="status">${esc(H.micErr)}</p>` : ''}
    ${H.url && !recording ? `<div class="sh-row"><button class="btn sec" onclick="App.shMine()">▶ You</button><button class="btn sec" onclick="App.shBoth()">▶ Speaker, then you</button></div>${H.env ? shEnvSvg(H.env) : ''}` : ''}
    <div class="sh-src">${credit}</div>
  </div>
  <div class="sh-rate"><span>How close were you?</span><div class="btnrow"><button class="btn line" onclick="App.shRate(0)">Not yet</button><button class="btn" onclick="App.shRate(1)">Close</button></div></div>
  <p class="note">Shadowing: listen, then say it at the same speed and with the same rise and fall. Your recordings stay on this device and are deleted when you move on.</p>`;
}
function vShadowDone() {
  const H = S.sh, ok = H.rating.filter(Boolean).length;
  return `<h1>${ok} of ${H.items.length} close</h1><p class="sub">Shadowing works best a little every day. Sentences marked “Not yet” come back sooner.</p>
  <div class="card">${H.items.map((c, k) => `<div class="sh-res"><span class="jp">${ruby(c.e.j)}</span><span class="${H.rating[k] ? 'okc' : 'badc'}">${H.rating[k] ? 'close' : 'not yet'}</span></div>`).join('')}</div>
  <div class="btnrow"><button class="btn" onclick="App.shAgain()">Another ${SH_N}</button><button class="btn line" onclick="App.shEnd()">Done</button></div>`;
}
function shClear() { const H = S.sh; if (!H) return; if (H.rec) shStop(); if (H.url) URL.revokeObjectURL(H.url); H.url = null; H.blob = null; H.env = null; }
const shadowApp = {
  shadowStart() { shStart(); },
  shNative() { shPlayNative(); },
  shSlow() { S.sh.slow = !S.sh.slow; render(); },
  shEn() { S.sh.showEn = true; render(); },
  shHide() { S.sh.hide = false; render(); },
  shHideAll() { const H = S.sh; H.hideAll = !H.hideAll; H.hide = H.hideAll; render(); },
  shRecord() { shRecord(); },
  shStop() { shStop(); },
  shMine() { shPlayMine(); },
  shBoth() {
    const c = shCur(); if (!c) return;
    playAudio('s' + c.e.au, true);
    const a = curAudio; if (a) a.onended = () => { if (S.sh) shPlayMine(); };
  },
  shRate(ok) {
    const H = S.sh, c = shCur(); if (!H || !c) return;
    shClear(); H.rating[H.i] = ok ? 1 : 0;
    const st = shStats(), o = st[c.e.au] || { n: 0, ok: 0 }; o.n += ok ? 1 : 0.5; if (ok) o.ok++; o.t = Date.now(); st[c.e.au] = o; store.set('shadow', st);   // "not yet" counts half, so it comes back sooner
    logAct(false, 'vocab'); skillTick('shadow', 3);
    H.i++; H.stage = 'listen'; H.showEn = false; H.micErr = ''; H.hide = !!H.hideAll;
    render(); window.scrollTo(0, 0);
    if (H.i < H.items.length) setTimeout(() => shPlayNative(), 300);
  },
  shAgain() { shClear(); shStart(); },
  shEnd() { shClear(); if (curAudio) { try { curAudio.pause(); } catch (e) {} } S.sh = null; S.view = 'home'; render(); window.scrollTo(0, 0); }
};
Object.assign(App, shadowApp);
