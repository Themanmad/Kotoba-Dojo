/* =====================================================================
   STATE
   ===================================================================== */
const S = {
  view: 'home', vtab: 'cards', pos: 'all',
  vf: { dir: 'jp2en' },
  kf: { order: 'freq', range: 0, jlpt: 'N5', qt: 'k2m' },
  tf: { deck: 'vocab', dir: 'mix', count: 10 },
  browse: { sort: 'freq', limit: 100 },
  search: { q: '', busy: false },
  gf: { q: '', limit: 100 }, open: {}, openAll: false, drew: false, gq: 'gfill', kanaQ: 'k2r', sit: null, back: null, examLv: null, examMode: 'full', examN: 10,
  session: null
};
const vSel = () => { const seen = new Set(); return V.filter(x => (settings.levels.includes(x.lvl) || (x.dk && settings.levels.includes('ANKI'))) && (S.pos === 'all' || posBucket(x.pos) === S.pos) && !seen.has(x.id) && seen.add(x.id)); };   // one card per word, even when a list has it twice
const kSorted = () => K.slice().sort((a, b) => (a.r || 9999) - (b.r || 9999) || LV.indexOf(a.lvl) - LV.indexOf(b.lvl));
const K_CHUNK = 100;
function kSelection() {
  if (S.kf.order === 'freq') { const s = kSorted(); return S.kf.range === 'all' ? s : s.slice(S.kf.range * K_CHUNK, S.kf.range * K_CHUNK + K_CHUNK); }
  return kSorted().filter(k => k.lvl === S.kf.jlpt);
}
const kRead = x => {
  const on = x.on[0] || '';
  const kun = x.kun.find(k => !k.startsWith('-')) || x.kun[0] || '';
  const ks = kun.replace(/^-|-$/g, '').replace(/\.(.+)$/, '($1)');
  return [on, ks].filter(Boolean).join(' · ') || '—';
};
const kunHtml = kun => kun.length ? kun.map(r => { const [a, b] = r.split('.'); return esc(a) + (b ? `<span class="oku">${esc(b)}</span>` : ''); }).join('、') : '—';
const posLabel = tags => {
  const T = (DATA.meta && DATA.meta.tags) || {};
  return tags.map(t => T[t] ? T[t].replace(/\s*\(.*?\)/g, '').replace(/^noun$/, 'noun') : t).filter(Boolean).join(', ');
};

