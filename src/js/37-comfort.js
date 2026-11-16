/* =====================================================================
   COMFORT: things that make the app easier to use at any age.
   - Text size: the whole app scales (Normal / Large / Extra large).
   - Vibration: a short buzz for right, a double buzz for wrong (phones only).
   - Calm screen: switches off animations.
   - Swipe on flashcards: right for Good, left for Again; swipe the front to turn it over.
   ===================================================================== */
const TEXT_SIZES = [['m', 'Normal', 1], ['l', 'Large', 1.12], ['xl', 'Extra large', 1.25]];
/** safe to call during start-up, before this file has run (function declarations are hoisted, constants are not) */
function applyComfort() {
  const z = { l: 1.12, xl: 1.25 }[settings.textSize] || 1, el = document.documentElement;
  el.style.zoom = z === 1 ? '' : String(z);
  el.classList.toggle('calm', !!settings.calm);
  el.classList.toggle('ts-big', z > 1);
}
/** a short buzz on phones that support it; silent everywhere else */
function buzz(ok) {
  if (!settings.vibrate || typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(ok ? 18 : [28, 50, 28]); } catch (e) {}
}
function comfortCard() {
  return `<div class="label">Comfort</div>
  <div class="card">
    <div class="set" style="display:block"><b>Text size</b><span>Makes everything bigger: words, buttons and menus</span>
      <div style="margin-top:10px">${seg(TEXT_SIZES.map(t => [t[0], t[1]]), settings.textSize || 'm', 'App.textSize')}</div></div>
    <div class="set"><div><b>Vibration</b><span>A short buzz when you answer, on phones that support it</span></div><label class="sw"><input type="checkbox" ${settings.vibrate ? 'checked' : ''} onchange="App.set('vibrate',this.checked)"><span></span></label></div>
    <div class="set"><div><b>Calm screen</b><span>No animations or moving effects</span></div><label class="sw"><input type="checkbox" ${settings.calm ? 'checked' : ''} onchange="App.set('calm',this.checked)"><span></span></label></div>
  </div>`;
}
/** shown on Home until dismissed, so nobody has to hunt through Settings to read comfortably */
function comfortIntro() {
  if (settings.comfortSeen) return '';
  return `<div class="card cf-intro"><b>Is the text easy to read?</b>
    <div class="cf-sizes">${TEXT_SIZES.map(t => `<button class="cf-size ${(settings.textSize || 'm') === t[0] ? 'on' : ''}" onclick="App.textSize('${t[0]}')" aria-pressed="${(settings.textSize || 'm') === t[0]}"><span class="jp cf-${t[0]}">あ</span>${t[1]}</button>`).join('')}</div>
    <button class="btn sec sm" onclick="App.set('comfortSeen',true)">Looks good</button><small>You can change this any time in Settings.</small></div>`;
}
/* ---------- swipe on flashcards (touch and pen) ---------- */
const SWIPE_MIN = 80;
function comfortHydrate() {
  const s = S.session; if (!s || s.mode !== 'cards' || s.done) return;
  const card = document.querySelector('#app .card'); if (!card || card.dataset.swipe) return;
  card.dataset.swipe = '1'; card.classList.add('swipeable');
  if (s.flipped) card.insertAdjacentHTML('beforeend', '<span class="swl good" aria-hidden="true">Good</span><span class="swl again" aria-hidden="true">Again</span>');
  let st = null;
  const reset = () => { card.style.transition = 'transform .18s'; card.style.transform = ''; card.classList.remove('sw-r', 'sw-l'); card.style.removeProperty('--sw'); st = null; };
  card.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; st = { x: e.clientX, y: e.clientY, h: null }; card.style.transition = ''; });
  card.addEventListener('pointermove', e => {
    if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (st.h == null) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; st.h = Math.abs(dx) > Math.abs(dy) * 1.4; if (!st.h) { st = null; return; } }
    st.dx = dx; card.style.transform = `translateX(${dx}px) rotate(${(dx / 45).toFixed(2)}deg)`;
    card.classList.toggle('sw-r', dx > 0); card.classList.toggle('sw-l', dx < 0); card.style.setProperty('--sw', Math.min(1, Math.abs(dx) / SWIPE_MIN).toFixed(2));
  });
  const end = () => {
    if (!st) return; const dx = st.dx || 0, was = st.h; if (!was || Math.abs(dx) < SWIPE_MIN) return reset();
    st = null;
    // the click that follows a swipe mustn't also press what was under the finger
    const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, true), 350);
    if (!S.session.flipped) App.flip(); else App.rate(dx > 0 ? 2 : 0);
  };
  card.addEventListener('pointerup', end); card.addEventListener('pointercancel', reset);
}
const swipeTip = () => { const n = store.get('swipeTip', 0); if (n >= 6 || !('ontouchstart' in window)) return ''; return '<p class="hint sw-tip">Tip: swipe the card right for Good, left for Again.</p>'; };
const comfortApp = {
  textSize(t) { settings.textSize = t; saveSettings(); applyComfort(); render(); }
};
Object.assign(App, comfortApp);
applyComfort();
