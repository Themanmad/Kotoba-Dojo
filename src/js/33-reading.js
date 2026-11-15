/* =====================================================================
   READING (読解): graded passages with JLPT-style questions. Each answer
   shows why it's right; the English translation opens once you've answered.
   The same passages give the mock exam its reading section.
   ===================================================================== */
const readStats = () => store.get('reading', {});
const readOf = id => READ.find(p => p.id === id);
/** a passage's text as paragraphs, with furigana by the user's setting */
const readParas = j => j.split('\n').map(l => `<p class="jp">${ruby(l)}</p>`).join('');

function vRead() {
  if (S.rd) { const p = readOf(S.rd); if (p) return vReadPassage(p); S.rd = null; }
  const lvs = LV.filter(l => READ.some(p => p.lv === l));
  if (!lvs.includes(S.rdLv)) S.rdLv = lvs.includes(userLevel()) ? userLevel() : lvs[0];
  const st = readStats(), list = READ.filter(p => p.lv === S.rdLv);
  return `<h1>Reading</h1><p class="sub">Short passages at each JLPT level, with questions like the exam's reading section. Every answer comes with the reason, and the translation opens when you're done.</p>
  <div class="label">Level</div>${chips(lvs.map(l => [l, `${l}<small>${READ.filter(p => p.lv === l).length}</small>`]), S.rdLv, 'App.rdLv')}
  <div class="rd-list">${list.map(p => { const r = st[p.id];
    return `<button class="rd-row" onclick="App.rdOpen('${p.id}')"><span class="rd-t"><b class="jp">${ruby(p.jt)}</b><small>${esc(p.t)} · ${p.q.length} questions</small></span>${r ? `<span class="rd-score ${r.best === p.q.length ? 'okc' : ''}">${r.best}/${p.q.length}</span>` : '<span class="rd-go">Read ›</span>'}</button>`; }).join('')}</div>
  <p class="note">Written for this app, not taken from JLPT papers or textbooks. Words above the level are explained under each passage.</p>`;
}
function vReadPassage(p) {
  const ans = S.rdAns || [], done = ans.length === p.q.length && ans.every(a => a != null), ok = p.q.filter((q, i) => ans[i] === q[3]).length;
  const list = READ.filter(x => x.lv === p.lv), nx = list[list.indexOf(p) + 1];
  const qHtml = p.q.map((q, qi) => {
    const a = ans[qi], answered = a != null;
    return `<div class="rd-q"><div class="rd-qq"><span class="rd-qn">${qi + 1}</span><span><span class="jp">${ruby(q[0])}</span><small>${esc(q[1])}</small></span></div>
      <div class="choices">${q[2].map((o, oi) => { let c = 'choice'; if (answered) c += oi === q[3] ? ' ok' : oi === a ? ' bad' : ' dim'; if (answered && oi === a) c += ' picked';
        return `<button class="${c}" onclick="App.rdAns(${qi},${oi})"${answered ? ' tabindex="-1"' : ''}><span class="n">${oi + 1}</span><span class="jp">${ruby(o)}</span></button>`; }).join('')}</div>
      ${answered ? `<div class="rd-why ${a === q[3] ? 'ok' : 'no'}" role="status"><b>${a === q[3] ? 'Right.' : 'Not quite.'}</b> ${esc(q[4])}</div>` : ''}</div>`;
  }).join('');
  return `<button class="ghost backbtn" onclick="App.rdOpen(null)">‹ Reading</button>
  <div class="rd-head"><span class="tag lv" style="background:${lcVar(p.lv)}">${p.lv}</span><h1 class="jp">${ruby(p.jt)}</h1><div class="muted">${esc(p.t)}</div></div>
  <div class="card rd-text">${readParas(p.j)}</div>
  ${p.g.length ? `<div class="rd-gl"><div class="mini">Words to know</div>${p.g.map(([w, r, m]) => `<span class="rd-gw"><b class="jp">${esc(w)}</b> <span class="jp muted">${esc(r)}</span> ${esc(m)}</span>`).join('')}</div>` : ''}
  <div class="label">Questions</div>${qHtml}
  ${done ? `<div class="card rd-done"><b>${ok} of ${p.q.length}</b> ${ok === p.q.length ? 'Every one right.' : 'Read the reasons above, then try the passage again later.'}
    <details class="rd-en"><summary>Show the English translation</summary>${p.e.split('\n').map(l => `<p>${esc(l)}</p>`).join('')}</details>
    <div class="btnrow">${nx ? `<button class="btn" onclick="App.rdOpen('${nx.id}')">Next passage</button>` : ''}<button class="btn line" onclick="App.rdOpen('${p.id}')">Try again</button></div></div>` : ''}`;
}
const readApp = {
  rdLv(l) { S.rdLv = l; render(); },
  rdOpen(id) { S.rd = id; S.rdAns = []; render(); window.scrollTo(0, 0); },
  rdAns(qi, oi) {
    const p = readOf(S.rd); if (!p) return; const ans = S.rdAns = S.rdAns || [];
    if (ans[qi] != null) return;
    ans[qi] = oi; logAct(false, 'grammar');
    if (p.q.every((q, i) => ans[i] != null)) {
      const ok = p.q.filter((q, i) => ans[i] === q[3]).length, st = readStats(), o = st[p.id] || { best: 0, n: 0 };
      o.best = Math.max(o.best, ok); o.last = ok; o.n++; st[p.id] = o; store.set('reading', st); skillTick('read', 1);
      if (typeof addXP === 'function') addXP(ok * 5);
    }
    render();
  }
};
Object.assign(App, readApp);

/* ---------- reading in the mock exam ---------- */
/** up to n questions, whole passages at a time, ones you haven't seen recently first */
function readExamQs(l, n) {
  const ps = freshFirst(READ.filter(p => p.lv === l).map(p => Object.assign({ id: 'rd:' + p.id }, { p })), 'rd'), out = [];
  for (const { p } of ps) {
    if (out.length >= n) break;
    p.q.forEach((q, qi) => {
      if (out.length >= n) return;
      const item = { id: 'rd:' + p.id, kind: 'reading', lvl: l, w: p.t };
      out.push({ item, noRec: true, ans: q[3], raw: q[2].map(plain), opts: q[2].map(o => `<span class="jp">${ruby(o)}</span>`),
        prompt: `<div class="rd-ex-pass jp">${readParas(p.j)}</div>${p.g.length ? `<div class="rd-ex-gl">${p.g.map(([w, r, m]) => `<span><b class="jp">${esc(w)}</b> <span class="jp">${esc(r)}</span> ${esc(m)}</span>`).join('')}</div>` : ''}<div class="rd-ex-q jp">${ruby(q[0])}</div>`,
        rd: { title: p.jt, q: q[0], why: q[4] } });
    });
  }
  return out;
}
