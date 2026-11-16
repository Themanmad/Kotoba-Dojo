/* =====================================================================
   PLAY: はじまりの町, a pixel-art N5 town to walk around.
   Pixel-art world, with the app's clean flat cards for talking, choices and quizzes.
   Buildings open the real app: the dojo teaches the next N5 Path lesson, the school runs
   your reviews, the station has the Travel lessons; the konbini and café are role-plays
   with staff; Yui chats like a friend; Sensei challenges you to a quiz battle; the old man
   on the bench has a word of the day; kanji are hidden where they came from (山 on the
   mountain, 川 by the river...). Everything you do counts in the app: XP, reviews, lessons.
   All art is drawn here in code (no outside images).
   ===================================================================== */
const TS = 16, MW = 48, MH = 32;   // tile size, map size in tiles
const TOWN = Object.assign({ x: 23.5 * TS, y: 12 * TS, dir: 'down', found: {}, beat: 0, met: {} }, store.get('town', {}));
const townSave = () => store.set('town', { x: TOWN.x, y: TOWN.y, dir: TOWN.dir, found: TOWN.found, beat: TOWN.beat, met: TOWN.met });
const TG = { world: null, solid: null, labels: [], spots: [], npcs: [], cv: null, ctx: null, raf: 0, keys: {}, scale: 3, talk: null, battle: null, walkT: 0, target: null, last: 0, near: null, toastT: 0 };

/* ---------- little pixel helpers ---------- */
const pxR = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const pxSprite = (c, rows, pal, x, y, flip) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) pxR(c, x + (flip ? r.length - 1 - i : i), y + j, 1, 1, pal[ch]); }));
let tSeed = 11; const tRnd = () => (tSeed = (tSeed * 16807) % 2147483647) / 2147483647;

/* ---------- sprites (16×16) ---------- */
const SPR = {
  pDown: ['................', '.....KKKKKK.....', '....KKKKKKKK....', '....KKKKKKKK....', '....KSSSSSSK....', '....SSKSSKSS....', '....SPSSSSPS....', '.....SSSSSS.....', '....RRRRRRRR....', '...SRRRRRRRRS...', '...SRRRRRRRRS...', '....RRRRRRRR....', '....BBBBBBBB....', '....BBB..BBB....', '....BBB..BBB....', '....KKK..KKK....'],
  pUp: ['................', '.....KKKKKK.....', '....KKKKKKKK....', '....KKKKKKKK....', '....KKKKKKKK....', '....KKKKKKKK....', '....SKKKKKKS....', '.....SSSSSS.....', '....RRRRRRRR....', '...SRRRRRRRRS...', '...SRRRRRRRRS...', '....RRRRRRRR....', '....BBBBBBBB....', '....BBB..BBB....', '....BBB..BBB....', '....KKK..KKK....'],
  pSide: ['................', '.....KKKKKK.....', '....KKKKKKKK....', '....KKKKKKKK....', '....KKSSSSSS....', '....KSSKSSSS....', '....KSSSSPSS....', '.....SSSSSS.....', '.....RRRRRR.....', '....RRRRRRSS....', '....RRRRRRSS....', '.....RRRRRR.....', '.....BBBBBB.....', '.....BBBBBB.....', '.....BB..BB.....', '.....KK..KK.....'],
  yui: ['................', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HHSSSSSSHH...', '...HSSKSSKSSH...', '...HSPSSSSPSH...', '...HHSSSSSSHH...', '...HWNNRRNNWH...', '...SWWWRRWWWS...', '....WWWWWWWW....', '....NNNNNNNN....', '...NNNNNNNNNN...', '.....SS..SS.....', '.....SS..SS.....', '.....KK..KK.....'],
  sensei: ['................', '.....GGGGGG.....', '....GGGGGGGG....', '....GSSSSSSG....', '....SSKSSKSS....', '....SSSSSSSS....', '....SWWWWWWS....', '.....WWWWWW.....', '....WWWNNWWW....', '...SWWWNNWWWS...', '...SWWNNNNWWS...', '....NNNNNNNN....', '....NNNNNNNN....', '....NNN..NNN....', '....NNN..NNN....', '....KKK..KKK....'],
  jii: ['................', '.....GGGGGG.....', '....GGGGGGGG....', '....SSSSSSSS....', '....SKKSSKKS....', '....SSSSSSSS....', '....SSWWWWSS....', '.....SSSSSS.....', '....OOOOOOOO....', '...SOOOOOOOOS...', '...SOOOOOOOOS...', '....OOOOOOOO....', '....BBBBBBBB....', '....BBB..BBB....', '....BBB..BBB....', '....KKK..KKK....'],
  dog: ['................', '................', '................', '................', '................', '..OO......OO....', '..OOO....OOO....', '..OOOOOOOOOO....', '..OWKOOOOKWO....', '..OOWWKKWWOO..O.', '...OWWWWWWO..OO.', '....OOOOOOOOOO..', '....OWWWWWWOO...', '....OOOOOOOOO...', '....OO.OO.OO....', '....KK.KK.KK....'],
  cat: ['................', '................', '................', '................', '................', '...G.....G......', '...GG...GG......', '...GGGGGGG......', '...GKGGGKG......', '...GGGPGGG...G..', '....GGGGG....G..', '....GGGGGGGGGG..', '....GGGGGGGGG...', '....GGGGGGGGG...', '....GG.G.G.GG...', '................']
};
const SPAL = { K: '#2B2B3A', S: '#F7CDA5', P: '#F29A9A', R: '#D94848', B: '#3B5BA5', H: '#9A5634', W: '#FFFFFF', N: '#2E3A6E', G: '#E8E8E8', O: '#D9893A' };
const CATPAL = { G: '#55555F', K: '#F2C744', P: '#F29A9A' };
const TREE = ['.....GGGGGG.....', '...GGGGLLGGGG...', '..GGGLLGGGGGGG..', '.GGGGGGGGGLGGGG.', '.GGLGGGGGGGGGGG.', 'GGGGGGGLGGGGGGGG', 'GGGGGGGGGGGGGLGG', '.GGGGLGGGGGGGGG.', '.GGGGGGGGGGLGGG.', '..GGGGGGGGGGGG..', '...DGGGGGGGGD...', '.....DDTTDD.....', '.......TT.......', '.......TT.......', '......TTTT......', '....SSSSSSSS....'];
const TGREEN = { G: '#3E8E41', L: '#63B35A', D: '#2D6B30', T: '#7A4E2B', S: '#4E9A2A' }, TPINK = { G: '#F2A7C3', L: '#FFD0E1', D: '#D47FA0', T: '#7A4E2B', S: '#4E9A2A' };

/* ---------- the town: drawn once into an offscreen canvas ---------- */
function townBuild() {
  const W = MW * TS, H = MH * TS, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); tSeed = 11;
  const solid = Array.from({ length: MH }, () => new Array(MW).fill(0));
  const block = (tx, ty, tw, th) => { for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) if (y >= 0 && y < MH && x >= 0 && x < MW) solid[y][x] = 1; };
  const labels = [], spots = [];
  // grass with speckles and flowers
  pxR(c, 0, 0, W, H, '#73C24A');
  for (let i = 0; i < 3200; i++) pxR(c, (tRnd() * W) | 0, (tRnd() * H) | 0, 1, 1, tRnd() < .5 ? '#62AE3D' : '#86D05A');
  for (let i = 0; i < 180; i++) { const x = (tRnd() * W) | 0, y = (tRnd() * H) | 0; pxR(c, x, y, 2, 2, ['#F7F1E1', '#F2C744', '#E86A8A'][i % 3]); pxR(c, x, y + 2, 1, 1, '#4E9A2A'); }
  // paths
  const path = (x, y, w, h) => { pxR(c, x, y, w, h, '#E2CB93'); for (let i = 0; i < w * h / 40; i++) pxR(c, x + ((tRnd() * w) | 0), y + ((tRnd() * h) | 0), 1, 1, '#CDB37A'); };
  path(0, 18 * TS, W, 2 * TS); pxR(c, 0, 18 * TS, W, 1, '#C4A86C'); pxR(c, 0, 20 * TS - 1, W, 1, '#C4A86C');
  path(22 * TS, 10 * TS, 3 * TS, 8 * TS);               // to the dojo
  path(17 * TS, 13 * TS, 13 * TS, 5 * TS);              // the plaza
  path(6 * TS, 16 * TS, 2 * TS, 2 * TS); path(6 * TS, 8 * TS, 2 * TS, 3 * TS); path(1 * TS, 10 * TS, 12 * TS, 1 * TS);
  path(42 * TS, 17 * TS, 2 * TS, 1 * TS); path(13 * TS, 20 * TS, 2 * TS, 2 * TS); path(5 * TS, 20 * TS, 2 * TS, 2 * TS);
  // river (east) with a bridge on the road
  pxR(c, 35 * TS, 0, 3 * TS, H, '#3F8FD6'); pxR(c, 35 * TS + 3, 0, 3 * TS - 6, H, '#5FB0EE');
  for (let y = 0; y < H; y += 9) pxR(c, 35 * TS + 8 + ((y * 7) % 24), y, 6, 1, '#BFE6FF');
  block(35, 0, 3, 18); block(35, 20, 3, 12);
  pxR(c, 35 * TS - 2, 18 * TS - 2, 3 * TS + 4, 2 * TS + 4, '#9A6234'); for (let x = 35 * TS; x < 38 * TS; x += 4) pxR(c, x, 18 * TS, 1, 2 * TS, '#7A4A25');
  pxR(c, 35 * TS - 2, 18 * TS - 3, 3 * TS + 4, 2, '#6B3E1F'); pxR(c, 35 * TS - 2, 20 * TS + 1, 3 * TS + 4, 2, '#6B3E1F');
  // mountain (north-east)
  c.fillStyle = '#7E8C6A'; c.beginPath(); c.moveTo(38 * TS, 7 * TS); c.lineTo(42 * TS, 0); c.lineTo(45 * TS, 3 * TS); c.lineTo(47 * TS, 0); c.lineTo(48 * TS, 0); c.lineTo(48 * TS, 7 * TS); c.fill();
  c.fillStyle = '#93A27C'; c.beginPath(); c.moveTo(39 * TS, 7 * TS); c.lineTo(42 * TS, 1 * TS); c.lineTo(44 * TS, 4 * TS); c.lineTo(45 * TS, 7 * TS); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(42 * TS, 0); c.lineTo(41 * TS, 2 * TS - 4); c.lineTo(42 * TS + 4, TS); c.lineTo(43 * TS, 2 * TS - 6); c.fill();
  block(38, 0, 10, 6);
  // pond (south)
  c.fillStyle = '#3F8FD6'; c.beginPath(); c.ellipse(28 * TS, 27 * TS, 3.2 * TS, 1.8 * TS, 0, 0, 7); c.fill();
  c.fillStyle = '#5FB0EE'; c.beginPath(); c.ellipse(28 * TS, 26.8 * TS, 2.6 * TS, 1.3 * TS, 0, 0, 7); c.fill();
  pxR(c, 27 * TS, 26 * TS, 10, 1, '#BFE6FF'); block(25, 26, 7, 3);
  // rice field 田 (south-east)
  pxR(c, 40 * TS, 22 * TS, 6 * TS, 6 * TS, '#8DBF5A'); pxR(c, 42 * TS + 8, 22 * TS, 3, 6 * TS, '#B98A5A'); pxR(c, 40 * TS, 24 * TS + 8, 6 * TS, 3, '#B98A5A');
  for (let i = 0; i < 90; i++) { const x = 40 * TS + 2 + ((tRnd() * 92) | 0), y = 22 * TS + 2 + ((tRnd() * 92) | 0); pxR(c, x, y, 1, 3, '#5FA052'); }
  pxR(c, 40 * TS - 2, 22 * TS - 2, 6 * TS + 4, 2, '#9C7B55'); pxR(c, 40 * TS - 2, 28 * TS, 6 * TS + 4, 2, '#9C7B55');
  block(40, 22, 6, 6);
  // buildings
  const building = (tx, ty, tw, th, f) => { f(tx * TS, ty * TS, tw * TS, th * TS); block(tx, ty, tw, th); };
  // dojo
  building(18, 3, 11, 7, (x, y, w, h) => {
    pxR(c, x, y + 20, w, h - 20, '#F1E2BC'); for (let i = x + 4; i < x + w; i += 8) pxR(c, i, y + 30, 1, h - 34, '#D9C59A'); for (let j = y + 36; j < y + h; j += 8) pxR(c, x, j, w, 1, '#D9C59A');
    pxR(c, x, y + 20, 4, h - 20, '#7A4A25'); pxR(c, x + w - 4, y + 20, 4, h - 20, '#7A4A25');
    c.fillStyle = '#3B4766'; c.beginPath(); c.moveTo(x - 10, y + 26); c.lineTo(x + 10, y); c.lineTo(x + w - 10, y); c.lineTo(x + w + 10, y + 26); c.fill();
    c.fillStyle = '#4F5E85'; c.beginPath(); c.moveTo(x - 4, y + 24); c.lineTo(x + 12, y + 3); c.lineTo(x + w - 12, y + 3); c.lineTo(x + w + 4, y + 24); c.fill();
    for (let i = x - 6; i < x + w + 6; i += 5) pxR(c, i, y + 23, 2, 3, '#2C3550');
    pxR(c, x + w / 2 - 14, y + h - 30, 28, 30, '#5A3A1C'); pxR(c, x + w / 2 - 1, y + h - 30, 2, 30, '#3D2712');
    pxR(c, x + w / 2 - 22, y + 28, 44, 12, '#6B3E1F');
  });
  labels.push({ x: 23.5 * TS, y: 3 * TS + 34, t: '道場', size: 9, col: '#FFF1D0' });
  // school
  building(2, 2, 10, 6, (x, y, w, h) => {
    pxR(c, x, y + 10, w, h - 10, '#F3EDE0'); pxR(c, x - 4, y + 4, w + 8, 8, '#C46A4A'); pxR(c, x - 4, y + 10, w + 8, 2, '#9C4E34');
    for (let i = 0; i < 4; i++) { pxR(c, x + 8 + i * 38, y + 20, 22, 14, '#9ED6EE'); pxR(c, x + 8 + i * 38, y + 46, 22, 14, '#9ED6EE'); }
    pxR(c, x + w / 2 - 12, y + h - 26, 24, 26, '#7FA6C9'); pxR(c, x + w / 2 - 1, y + h - 26, 2, 26, '#5E82A6');
    pxR(c, x + w / 2 - 6, y - 4, 12, 12, '#F7F1E1'); pxR(c, x + w / 2, y - 2, 1, 5, '#333'); pxR(c, x + w / 2, y + 2, 4, 1, '#333');
  });
  labels.push({ x: 7 * TS, y: 2 * TS + 8, t: '学校', size: 8, col: '#fff' });
  // konbini
  building(2, 11, 9, 5, (x, y, w, h) => {
    pxR(c, x, y + 8, w, h - 8, '#F6F6F2'); pxR(c, x, y, w, 9, '#DADAD4'); pxR(c, x, y + 9, w, 3, '#3FA34D'); pxR(c, x, y + 12, w, 2, '#F2C744');
    pxR(c, x + 6, y + 20, 40, 52, '#9ED6EE'); pxR(c, x + w - 46, y + 20, 40, 52, '#9ED6EE'); pxR(c, x + 7, y + 21, 10, 50, '#C8EBFA');
    pxR(c, x + w / 2 - 10, y + 22, 20, h - 22, '#7FC3E2'); pxR(c, x + w / 2 - 1, y + 22, 2, h - 22, '#5A9FC2');
  });
  labels.push({ x: 6.5 * TS, y: 11 * TS + 5, t: 'コンビニ', size: 7, col: '#2E8A45' });
  // vending machine
  pxR(c, 11 * TS + 2, 13 * TS, 12, 3 * TS - 4, '#D94040'); pxR(c, 11 * TS + 3, 13 * TS + 3, 10, 10, '#F7F1E1'); for (let i = 0; i < 4; i++) pxR(c, 11 * TS + 4 + i * 2, 13 * TS + 5, 1, 4, ['#4A90D9', '#F2C744', '#3FA34D', '#E86A8A'][i]); pxR(c, 11 * TS + 4, 13 * TS + 30, 8, 4, '#2B2B2B'); block(11, 13, 1, 3);
  // café
  building(12, 22, 6, 5, (x, y, w, h) => {
    pxR(c, x, y + 10, w, h - 10, '#F7E3C9'); for (let i = 0; i < w; i += 8) pxR(c, x + i, y + 4, 4, 8, '#C0392B'), pxR(c, x + i + 4, y + 4, 4, 8, '#FFF6E6');
    pxR(c, x + 8, y + 26, 26, 22, '#9ED6EE'); pxR(c, x + w - 30, y + 18, 22, h - 18, '#8B5A2B'); pxR(c, x + w - 20, y + 30, 2, 4, '#F2C744');
  });
  labels.push({ x: 15 * TS, y: 22 * TS - 2, t: 'カフェ', size: 7, col: '#8B3A2B' });
  // home
  building(3, 22, 6, 5, (x, y, w, h) => {
    pxR(c, x, y + 12, w, h - 12, '#FFF4E0'); c.fillStyle = '#B5523B'; c.beginPath(); c.moveTo(x - 6, y + 14); c.lineTo(x + w / 2, y - 6); c.lineTo(x + w + 6, y + 14); c.fill();
    pxR(c, x + 10, y + 30, 18, 16, '#9ED6EE'); pxR(c, x + w - 32, y + 26, 20, h - 26, '#8B5A2B');
  });
  labels.push({ x: 6 * TS, y: 22 * TS + 4, t: '家', size: 8, col: '#fff' });
  if (ANKI.decks.length) {   // the bookshop opens once you've added an Anki deck: your decks live here
    building(18, 21, 6, 4, (x, y, w, h) => {
      pxR(c, x, y + 10, w, h - 10, '#EADBC4'); pxR(c, x - 4, y + 2, w + 8, 10, '#2F6B5A'); for (let i = x - 4; i < x + w + 4; i += 6) pxR(c, i, y + 10, 3, 3, '#24564A');
      pxR(c, x + 6, y + 22, 34, 34, '#9ED6EE'); for (let i = 0; i < 5; i++) pxR(c, x + 8 + i * 6, y + 40, 4, 14, ['#D94848', '#F2C744', '#3B5BA5', '#3FA34D', '#E86A8A'][i]);
      pxR(c, x + w - 34, y + 20, 24, h - 20, '#7A4A25'); pxR(c, x + w - 24, y + 34, 2, 4, '#F2C744');
    });
    labels.push({ x: 21 * TS, y: 21 * TS + 7, t: '本屋', size: 8, col: '#fff' });
  }
  // station
  building(39, 11, 8, 6, (x, y, w, h) => {
    pxR(c, x, y + 14, w, h - 14, '#E9E2D6'); c.fillStyle = '#7E8794'; c.beginPath(); c.moveTo(x - 8, y + 16); c.lineTo(x + 6, y + 2); c.lineTo(x + w - 6, y + 2); c.lineTo(x + w + 8, y + 16); c.fill();
    pxR(c, x + 6, y + 40, 22, 30, '#9ED6EE'); pxR(c, x + w - 28, y + 40, 22, 30, '#9ED6EE'); pxR(c, x + w / 2 - 14, y + 40, 28, h - 40, '#4A5568'); pxR(c, x + w / 2 - 1, y + 40, 2, h - 40, '#2D3440');
    pxR(c, x + w / 2 - 26, y + 22, 52, 12, '#2E5AAC');
  });
  labels.push({ x: 43 * TS, y: 11 * TS + 28, t: '駅', size: 8, col: '#fff' });
  // bulletin board, bench, well, campfire, dojo gate
  pxR(c, 19 * TS, 13 * TS + 2, 20, 14, '#8B5A2B'); pxR(c, 19 * TS + 2, 13 * TS + 4, 16, 10, '#F7EBD0'); pxR(c, 19 * TS + 4, 13 * TS + 6, 5, 3, '#E86A8A'); pxR(c, 19 * TS + 10, 13 * TS + 9, 6, 3, '#4A90D9'); pxR(c, 19 * TS + 2, 14 * TS + 2, 2, 12, '#6B3E1F'); pxR(c, 20 * TS + 2, 14 * TS + 2, 2, 12, '#6B3E1F'); block(19, 13, 2, 1);
  labels.push({ x: 19.6 * TS, y: 13 * TS - 3, t: '掲示板', size: 6, col: '#4A2E14' });
  pxR(c, 26 * TS, 15 * TS + 6, 28, 5, '#9A6234'); pxR(c, 26 * TS + 2, 15 * TS + 11, 2, 5, '#6B3E1F'); pxR(c, 26 * TS + 24, 15 * TS + 11, 2, 5, '#6B3E1F'); block(26, 15, 2, 1);
  pxR(c, 29 * TS + 1, 14 * TS + 2, 14, 12, '#9AA0A6'); pxR(c, 29 * TS + 3, 14 * TS + 4, 10, 6, '#3F8FD6'); pxR(c, 29 * TS, 13 * TS + 2, 16, 2, '#6B3E1F'); block(29, 14, 1, 1);
  pxR(c, 33 * TS + 2, 23 * TS + 10, 12, 3, '#7A4E2B'); pxR(c, 33 * TS + 4, 23 * TS + 3, 8, 7, '#F28C28'); pxR(c, 33 * TS + 6, 23 * TS + 5, 4, 4, '#FFD34D'); block(33, 23, 1, 1);
  // trees: border + forest corner (森) + one big tree (木) + sakura
  const tree = (tx, ty, pal = TGREEN) => { pxSprite(c, TREE, pal, tx * TS, ty * TS); block(tx, ty + 0, 1, 1); };
  for (let x = 0; x < MW; x += 2) { if (x < 34 || x > 38) { if (![22, 23, 24].includes(x)) tree(x, 0); } }
  for (let y = 2; y < MH; y += 2) { if (y !== 18) tree(0, y); }
  for (let x = 0; x < 34; x += 2) if (![6, 13].includes(x)) tree(x, 30);
  for (let x = 38; x < MW; x += 2) tree(x, 30); for (let y = 8; y < MH; y += 2) if (y !== 18 && y !== 20) tree(47, y);
  [[1, 27], [2, 28], [3, 29], [1, 25], [2, 26]].forEach(([x, y]) => tree(x, y));
  [[16, 3], [30, 3], [16, 8], [31, 8]].forEach(([x, y]) => tree(x, y, TPINK));
  [[32, 11], [12, 18 - 3], [33, 26], [21, 26], [9, 18 + 3]].forEach(([x, y]) => tree(x, y));
  // where each kanji hides (a sparkle you can inspect)
  spots.push({ k: '山', tx: 41, ty: 7, hint: 'At the foot of the mountain' }, { k: '川', tx: 34, ty: 9, hint: 'By the river' }, { k: '木', tx: 32, ty: 12, hint: 'Under a big tree' },
    { k: '森', tx: 4, ty: 27, hint: 'In the little forest' }, { k: '田', tx: 39, ty: 25, hint: 'Next to the rice field' }, { k: '日', tx: 24, ty: 12, hint: 'A sunny spot' },
    { k: '火', tx: 33, ty: 22, hint: 'By the campfire' }, { k: '水', tx: 30, ty: 14, hint: 'At the well' }, { k: '門', tx: 22, ty: 11, hint: 'At the dojo gate' });
  TG.world = cv; TG.solid = solid; TG.labels = labels; TG.spots = spots;
}

/* ---------- people and places ---------- */
const DOORS = [
  { tx: 23, ty: 10, id: 'dojo', name: '道場', en: 'Dojo' }, { tx: 7, ty: 8, id: 'school', name: '学校', en: 'School' }, { tx: 6, ty: 16, id: 'konbini', name: 'コンビニ', en: 'Konbini' },
  { tx: 16, ty: 21, id: 'cafe', name: 'カフェ', en: 'Café' }, { tx: 6, ty: 21, id: 'home', name: '家', en: 'Home' }, { tx: 43, ty: 17, id: 'station', name: '駅', en: 'Station' },
  { tx: 19, ty: 14, id: 'board', name: '掲示板', en: 'Notice board' }, { tx: 22, ty: 20, id: 'books', name: '本屋', en: 'Bookshop · your Anki decks' }
];
function townNpcs() {
  TG.npcs = [
    { id: 'yui', name: 'ゆい', spr: 'yui', x: 26 * TS, y: 20.5 * TS, home: [24 * TS, 20.5 * TS, 30 * TS], vx: .25 },
    { id: 'sensei', name: '先生', spr: 'sensei', x: 25.2 * TS, y: 10 * TS },
    { id: 'jii', name: 'おじいさん', spr: 'jii', x: 26.5 * TS, y: 14.6 * TS },
    { id: 'dog', name: 'ポチ', spr: 'dog', x: 9 * TS, y: 20.5 * TS, home: [8 * TS, 20.5 * TS, 12 * TS], vx: .35 },
    { id: 'cat', name: 'タマ', spr: 'cat', x: 10.5 * TS, y: 16.2 * TS }
  ];
}

/* ---------- conversations (role-plays with staff use the same engine as Free chat) ---------- */
const TOWN_TALKS = {
  konbini: { who: '店員', av: '🏪', n: {
    start: { b: [['いらっしゃいませ〜', 'Welcome!'], ['お{弁当|べんとう}、{温|あたた}めますか？', 'Shall I heat up your bento?']], y: 'bag', n: 'bag', o: [['はい、お{願|ねが}いします', 'Yes, please', 'bag'], ['{大丈夫|だいじょうぶ}です', 'No, it’s fine', 'bag']], a: 'bag' },
    bag: { b: [['{袋|ふくろ}はご{利用|りよう}ですか？', 'Would you like a bag?']], y: 'chop', n: 'chop', o: [['はい', 'Yes', 'chop'], ['いいえ、{大丈夫|だいじょうぶ}です', 'No, I’m fine', 'chop']], a: 'chop' },
    chop: { b: [['お{箸|はし}はおつけしますか？', 'Would you like chopsticks?']], o: [['お{願|ねが}いします', 'Please', 'pay'], ['いりません', 'I don’t need them', 'pay']], a: 'pay' },
    pay: { b: [['{全部|ぜんぶ}で{580円|ごひゃくはちじゅうえん}です', 'That’s 580 yen in total'], ['お{支払|しはら}いは？', 'How would you like to pay?']], o: [['カードで', 'By card', 'card'], ['{現金|げんきん}で', 'In cash', 'cash']], a: 'card' },
    card: { b: [['こちらにタッチお{願|ねが}いします', 'Please tap here']], go: 'end' },
    cash: { b: [['{1000円|せんえん}お{預|あず}かりします', 'Out of 1,000 yen'], ['{420円|よんひゃくにじゅうえん}のお{返|かえ}しです', 'Here’s 420 yen change']], go: 'end' },
    end: { b: [['ありがとうございました〜', 'Thank you very much!']], end: true } } },
  cafe: { who: '店員', av: '☕', n: {
    start: { b: [['いらっしゃいませ！{店内|てんない}でお{召|め}し{上|あ}がりですか？', 'Welcome! Eating in?']], o: [['はい、{店内|てんない}で', 'Yes, eating in', 'order'], ['{持|も}ち{帰|かえ}りで', 'To take away', 'order']], a: 'order' },
    order: { b: [['ご{注文|ちゅうもん}はお{決|き}まりですか？', 'Are you ready to order?']], cap: 'x', o: [['コーヒーをください', 'A coffee, please', 'size'], ['{抹茶|まっちゃ}ラテをお{願|ねが}いします', 'A matcha latte, please', 'size'], ['おすすめは{何|なん}ですか？', 'What do you recommend?', 'rec']], a: 'size' },
    rec: { b: [['{季節限定|きせつげんてい}のさくらラテがおすすめです🌸', 'The seasonal sakura latte is our recommendation 🌸']], o: [['じゃあ、それで', 'I’ll have that then', 'size'], ['コーヒーにします', 'I’ll have a coffee', 'size']], a: 'size' },
    size: { b: [['サイズはどうなさいますか？', 'What size would you like?']], o: [['Sで', 'Small', 'hot'], ['Mで', 'Medium', 'hot'], ['Lで', 'Large', 'hot']], a: 'hot' },
    hot: { b: [['ホットとアイス、どちらにしますか？', 'Hot or iced?']], o: [['ホットで', 'Hot', 'pay'], ['アイスで', 'Iced', 'pay']], a: 'pay' },
    pay: { b: [['{450円|よんひゃくごじゅうえん}です', 'That’s 450 yen'], ['{少々|しょうしょう}お{待|ま}ちください', 'Just a moment please']], go: 'end' },
    end: { b: [['お{待|ま}たせしました！ごゆっくりどうぞ', 'Thank you for waiting! Enjoy']], end: true } } }
};

/* a talk runs one node at a time: her lines appear one by one, then your choices (or type your own) */
function talkStart(kind, id) {
  let topic, who, av;
  if (kind === 'yui') { topic = offTopic(id) || OFF_TOPICS[(Math.random() * OFF_TOPICS.length) | 0]; who = 'ゆい'; av = '🌸'; }
  else { const t = TOWN_TALKS[id]; topic = { id, n: t.n }; who = t.who; av = t.av; }
  TG.talk = { topic, who, av, node: 'start', lines: [], shown: 0, slots: { name: OFF.slots.name }, mine: null, end: false };
  talkGo('start');
}
function talkGo(key) {
  const T = TG.talk, n = T.topic.n; let node = n[key]; let lines = [...node.b]; T.node = key;
  while (node.go) { node = n[node.go]; T.node = Object.keys(n).find(k => n[k] === node); lines = lines.concat(node.b); }
  const save = OFF.slots; OFF.slots = T.slots; T.lines = lines.map(offLine); OFF.slots = save;
  T.shown = 1; T.end = !!node.end; townUI();
}
function talkReply(text) {
  const T = TG.talk; if (!T) return; const node = T.topic.n[T.node];
  T.mine = { t: text, fix: offCasual(text) && T.who === 'ゆい' ? offCasual(text) : null };
  if (node.cap === 'name') { const nm = offName(text); if (nm) T.slots.name = nm; }
  if (node.cap === 'x') T.slots.x = offThing(text) || '';
  const o = offMatchOpt(text, node.o), yn = offYesNo(text);
  const next = o ? o[2] : yn === 'y' && node.y ? node.y : yn === 'n' && node.n ? node.n : node.a || (node.o && node.o[0][2]);
  logAct(false, 'vocab'); addXP(5);
  talkGo(next);
}

/* ---------- quiz battle with Sensei: 3 hits to win, 3 misses and you lose ---------- */
function battleStart() {
  const qs = [];
  if (ANKI.items.length >= 8) {
    // your Anki deck words: due and shaky ones first, then any; every Deck quiz question type, with your deck's voice and sentences
    const now = Date.now(), its = ANKI.items, due = shuffle(its.filter(x => progress[x.id] && (isDue(x.id, now) || status(x.id) === 'learning')));
    const weak = its.filter(x => progress[x.id] && progress[x.id].w > 0 && !due.includes(x)).sort((a, b) => progress[b.id].w - progress[a.id].w);
    const rest = shuffle(its.filter(x => !due.includes(x) && !weak.includes(x)));
    for (const x of [...due, ...weak, ...rest]) { if (qs.length >= 12) break; const q = ankiQuizQ(x, its); if (q) qs.push(q); }
  }
  if (qs.length < 5) {
    const pool = (DATA.vocab.N5 || []).filter(x => x.w && x.m);
    for (const x of shuffle(pool).slice(0, 12)) { const q = makeQ('vocab', x, pick(['jp2en', 'en2jp'])); if (q) qs.push(q); }
  }
  TG.battle = { qs, i: 0, me: 3, foe: 3, answered: -1, ok: null, done: false, deck: ANKI.items.length >= 8 && qs.some(q => q.item && q.item.dk) };
  townUI(); battleSay();
}
const battleSay = () => { const B = TG.battle, q = B && !B.done && B.qs[B.i]; if (q && q.autoplay) setTimeout(() => playAudio(q.autoplay), 300); };
function battleAns(k) {
  const B = TG.battle; if (!B || B.answered >= 0) return; const q = B.qs[B.i], ok = !!q.opts[k].ok;
  B.answered = k; B.ok = ok; if (ok) B.foe--; else B.me--;
  rec(q.item, ok);
  if (B.foe <= 0 || B.me <= 0) { B.done = true; if (B.foe <= 0) { TOWN.beat++; townSave(); addXP(60); } }
  townUI();
  const el = $(ok ? '.tb-foe' : '.tb-me'); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
}
function battleNext() { const B = TG.battle; if (!B) return; if (B.done || B.i + 1 >= B.qs.length) { TG.battle = null; townUI(); return; } B.i++; B.answered = -1; B.ok = null; townUI(); battleSay(); }

/* ---------- interacting ---------- */
function townInteract() {
  if (TG.talk || TG.battle || TG.card) return;
  const n = TG.near; if (!n) return;
  TG.keys = {};
  if (n.type === 'npc') {
    const id = n.o.id; TOWN.met[id] = 1; townSave();
    if (id === 'yui') { TG.card = { k: 'yuiTopics' }; townUI(); }
    else if (id === 'sensei') { TG.card = { k: 'sensei' }; townUI(); }
    else if (id === 'jii') { const w = wordOfDay(); TG.card = { k: 'jii', w: w && w.x }; townUI(); if (w && w.x && w.x.au) playAudio(w.x.au); }
    else if (id === 'dog') { TG.card = { k: 'pet', who: 'ポチ', say: 'わん！わんわん！🐕', en: 'Woof! Woof woof!', word: ['犬', 'いぬ', 'dog'] }; townUI(); }
    else if (id === 'cat') { TG.card = { k: 'pet', who: 'タマ', say: 'にゃ〜ん🐈', en: 'Meow~', word: ['猫', 'ねこ', 'cat'] }; townUI(); }
  } else if (n.type === 'spot') {
    const s = n.o, first = !TOWN.found[s.k]; TOWN.found[s.k] = today(); townSave(); if (first) addXP(20);
    TG.card = { k: 'kanji', s, first }; townUI();
  } else if (n.type === 'door') {
    const d = n.o;
    if (d.id === 'konbini' || d.id === 'cafe') { talkStart('staff', d.id); return; }
    TG.card = { k: 'door', d }; townUI();
  }
}
function townDoorGo(id) {
  TG.card = null; townUI();
  S.fromPlay = true; townSave();
  if (id === 'dojo') { const us = planUnits('N5'), u = us.find(x => !unitDone(x) && !unitKnown(x)) || us[0]; if (u) App.lesson(u.id); else App.go('path'); }
  else if (id === 'station') { App.lesson(nextUnit('travel').id); }
  else if (id === 'school') { S.fromPlay = false; S.view = 'play'; S.back = { view: 'play' }; startCards('vocab'); render(); }   // the review session comes back to the town
  else if (id === 'home') { S.fromPlay = false; App.go('home'); }
  else if (id === 'quick') { S.dq = { sel: ANKI.decks.map(d => d.id), n: 10, focus: 'mix' }; ankiStartQuiz(); }
  else if (id === 'dquiz') { App.dquiz(); }
  else if (id === 'extras') { const u = nextUnit('anki'); if (u) App.lesson(u.id); }
  else if (id === 'board') { App.go('home'); }
}

/* ---------- the overlay: flat-style cards on top of the pixel town ---------- */
function townUI() {
  const box = $('#townui'); if (!box) return;
  const hud = `<div class="th-l"><b>はじまりの町</b><span class="tag lv" style="--lc:var(--n5)">N5</span></div>
    <div class="th-r"><span title="Kanji found">字 ${Object.keys(TOWN.found).length}/${TG.spots.length}</span><span>⭐ ${fmtN(game.xp)}</span><button class="ghost" onclick="App.go('home')" title="Leave the town" aria-label="Leave the town">✕</button></div>`;
  let card = '';
  const T = TG.talk, B = TG.battle, C = TG.card;
  if (T) {
    const line = T.lines[T.shown - 1] || { j: '', e: '' }, last = T.shown >= T.lines.length, node = T.topic.n[T.node];
    card = `<div class="tcard"><div class="tc-av">${T.av}<b>${esc(T.who)}</b></div><div class="tc-body">
      <div class="tc-say jp">${ruby(fillFuri(line.j), true)}</div><button class="ghost len" onclick="this.textContent=this.dataset.e;this.classList.add('on')" data-e="${esc(line.e)}">English</button>
      ${T.mine && T.shown === 1 && T.mine.fix && T.mine.fix.better ? `<div class="cfix"><span class="cf-k">More natural</span><span class="jp">${esc(T.mine.fix.better)}</span></div>` : ''}
      <div class="tc-acts">${!last ? `<button class="btn sm" onclick="App.townTalkNext()">Next ▶</button>`
        : T.end ? `<button class="btn sm" onclick="App.townClose()">Bye! またね</button>`
        : `${(node.o || []).map((o, k) => `<button class="copt" onclick="App.townOpt(${k})"><span class="jp">${ruby(o[0], true)}</span><small>${esc(o[1])}</small></button>`).join('')}
           <form class="tc-type" onsubmit="event.preventDefault();App.townType(this.q.value)"><input name="q" lang="ja" placeholder="…or type your reply" autocomplete="off"><button class="btn sm">Send</button></form>`}</div></div></div>`;
  } else if (B) {
    const q = B.qs[B.i], hearts = n => '❤️'.repeat(Math.max(0, n)) + '🤍'.repeat(3 - Math.max(0, n));
    card = `<div class="tcard tbattle"><div class="tb-top"><div class="tb-me"><b>You</b>${hearts(B.me)}</div><b class="tb-vs">VS</b><div class="tb-foe"><b>先生</b>${hearts(B.foe)}</div></div>
      ${B.done ? `<div class="tb-end">${B.foe <= 0 ? '<b>勝ち！ You win!</b><span>+60 XP. 先生: 「よくできました！」</span>' : '<b>負け… You lost</b><span>先生: 「また<ruby>挑戦<rt>ちょうせん</rt></ruby>しなさい」 Try again any time.</span>'}</div><div class="tc-acts"><button class="btn sm" onclick="App.townBattleNext()">Back to town</button><button class="btn sm line" onclick="App.townBattle()">Rematch</button></div>`
        : `<div class="tb-q">${q.prompt}</div><div class="hint">${esc(q.hint || '')}</div><div class="choices grid2">${q.opts.map((o, k) => `<button class="choice${B.answered >= 0 ? (o.ok ? ' ok' : k === B.answered ? ' bad' : ' dim') : ''}" onclick="App.townAns(${k})"${B.answered >= 0 ? ' disabled' : ''}><span>${o.html}</span></button>`).join('')}</div>
        ${B.answered >= 0 ? `<div class="tc-acts"><span class="tb-res">${B.ok ? '💥 Hit!' : '😵 Ouch!'}</span><button class="btn sm" onclick="App.townBattleNext()">Next ▶</button></div>` : ''}`}</div>`;
  } else if (C) {
    if (C.k === 'kanji') card = `<div class="tcard"><div class="tc-body" style="width:100%"><div class="ls-k">${C.first ? 'Kanji found! +20 XP' : 'You found this one already'} · ${esc(C.s.hint)}</div>${kpStrip(C.s.k)}
      <div class="tc-acts"><button class="btn sm line" onclick="App.townKanji('${C.s.k}')">Open ${C.s.k}</button><button class="btn sm" onclick="App.townClose()">OK</button></div></div></div>`;
    else if (C.k === 'door') card = `<div class="tcard"><div class="tc-av">${C.d.id === 'dojo' ? '🥋' : C.d.id === 'school' ? '🏫' : C.d.id === 'station' ? '🚉' : C.d.id === 'home' ? '🏠' : C.d.id === 'books' ? '📚' : '📋'}<b>${esc(C.d.name)}</b></div><div class="tc-body">
      <div class="tc-say">${C.d.id === 'dojo' ? (() => { const us = planUnits('N5'), u = us.find(x => !unitDone(x) && !unitKnown(x)); return u ? `Next N5 lesson: <b>${esc(u.t)}</b><br><span class="muted">${esc(u.s)}</span>` : 'You’ve finished every N5 lesson!'; })()
        : C.d.id === 'school' ? `${dueCount() ? `<b>${fmtN(dueCount())}</b> reviews are due.` : 'Nothing due right now.'} Review your words with flashcards.`
        : C.d.id === 'station' ? `Travel Japanese: <b>${esc(nextUnit('travel').t)}</b>`
        : C.d.id === 'home' ? 'Back home: leave the town and go to the main app.'
        : C.d.id === 'books' ? (() => { const its = ANKI.items, kn = its.filter(x => status(x.id) === 'known').length, du = its.filter(x => isDue(x.id)).length, ex = ANKI.extra.length;
            return `<b>いらっしゃいませ！</b> Your Anki decks: ${ANKI.decks.map(d => esc(d.name)).join(', ')}<br><span class="muted">${fmtN(its.length)} words · ${fmtN(kn)} known · ${fmtN(du)} due${ex ? ` · ${fmtN(ex)} extra words not on the JLPT lists` : ''}</span>`; })()
        : `<b>今日のしごと · Today’s jobs</b><br>${dueCount() ? `📚 ${fmtN(dueCount())} reviews at the school<br>` : ''}🥋 A lesson at the dojo<br>💬 Chat with Yui in the plaza<br>${ANKI.decks.length ? '📚 Quiz your Anki decks at the bookshop<br>' : ''}字 Find the hidden kanji (${Object.keys(TOWN.found).length}/${TG.spots.length})`}</div>
      <div class="tc-acts">${C.d.id === 'board' ? '' : C.d.id === 'books' ? `<button class="btn sm" onclick="App.townDoor('quick')">Quick deck quiz · 10</button><button class="btn sm line" onclick="App.townDoor('dquiz')">Choose a quiz</button>${ankiUnits().length ? `<button class="btn sm line" onclick="App.townDoor('extras')">Deck extras lesson</button>` : ''}` : `<button class="btn sm" onclick="App.townDoor('${C.d.id}')">${C.d.id === 'home' ? 'Go home' : 'Go in'}</button>`}<button class="btn sm line" onclick="App.townClose()">${C.d.id === 'board' ? 'OK' : 'Not now'}</button></div></div></div>`;
    else if (C.k === 'yuiTopics') card = `<div class="tcard"><div class="tc-av">🌸<b>ゆい</b></div><div class="tc-body"><div class="tc-say jp">あ、おはよ〜！なに{話|はな}す？`.replace('{話|はな}', '<ruby>話<rt>はな</rt></ruby>') + `</div>
      <div class="tc-topics">${shuffle(OFF_TOPICS).slice(0, 6).map(t => `<button class="chip" onclick="App.townYui('${t.id}')"><span class="jp">${ruby(t.t, true)}</span><small>${esc(t.en)}</small></button>`).join('')}</div>
      <div class="tc-acts"><button class="btn sm line" onclick="App.townClose()">またね</button></div></div></div>`;
    else if (C.k === 'sensei') card = `<div class="tcard"><div class="tc-av">🥋<b>先生</b></div><div class="tc-body"><div class="tc-say">「{勝負|しょうぶ}だ！」 ${ANKI.items.length >= 8 ? 'A quiz battle on <b>your Anki deck words</b>, the ones due or you get wrong first: meaning, reading, listening and your deck’s sentences.' : 'A quiz battle on N5 words.'} 3 right answers wins, 3 wrong and you lose.${TOWN.beat ? ` <span class="muted">You’ve won ${TOWN.beat} time${TOWN.beat === 1 ? '' : 's'}.</span>` : ''}`.replace('{勝負|しょうぶ}', '<ruby>勝負<rt>しょうぶ</rt></ruby>') + `</div>
      <div class="tc-acts"><button class="btn sm" onclick="App.townBattle()">はい！ Fight</button><button class="btn sm line" onclick="App.townClose()">Not now</button></div></div></div>`;
    else if (C.k === 'jii') card = `<div class="tcard"><div class="tc-av">👴<b>おじいさん</b></div><div class="tc-body"><div class="tc-say">今日の言葉じゃ… <span class="muted">Today’s word:</span></div>
      ${C.w ? `<div class="tc-word jp">${ruby(C.w.f || C.w.w, true)} ${sayBtn(C.w.au)}</div><div class="muted">${esc(C.w.m)}</div>` : ''}<div class="tc-acts">${C.w ? `<button class="btn sm line" onclick="App.townWord('${esc(C.w.id)}')">Open the word</button>` : ''}<button class="btn sm" onclick="App.townClose()">ありがとう！</button></div></div></div>`;
    else if (C.k === 'intro') card = `<div class="tcard"><div class="tc-av">🏯<b>はじまりの町</b></div><div class="tc-body"><div class="tc-say">ようこそ！ Welcome to your N5 town.</div>
      <div class="muted" style="line-height:1.6">🥋 The <b>dojo</b> teaches your next lesson · 🏫 the <b>school</b> runs your reviews · 🚉 the <b>station</b> has Travel lessons<br>🏪 Shop at the <b>konbini</b> and order at the <b>café</b> in real Japanese · 🌸 chat with <b>Yui</b> · 🥋 beat <b>Sensei</b> in a quiz battle<br>✨ Sparkles hide kanji where they came from: find all ${TG.spots.length}!</div>
      <div class="tc-acts"><button class="btn sm" onclick="App.townClose()">Let’s go!</button></div></div></div>`;
    else if (C.k === 'pet') card = `<div class="tcard"><div class="tc-av">${C.who === 'ポチ' ? '🐕' : '🐈'}<b>${C.who}</b></div><div class="tc-body"><div class="tc-say jp">${esc(C.say)}</div><div class="muted">${esc(C.en)} · <span class="jp">${ruby(`{${C.word[0]}|${C.word[1]}}`, true)}</span> = ${C.word[2]}</div><div class="tc-acts"><button class="btn sm" onclick="App.townClose()">かわいい！</button></div></div></div>`;
  }
  const n = TG.near, prompt = !card && n ? `<button class="tprompt" onclick="App.townA()"><b>A</b> ${n.type === 'npc' ? `Talk to ${esc(n.o.name)}` : n.type === 'spot' ? 'Look closer ✨' : `${esc(n.o.name)} · ${esc(n.o.en)}`}</button>` : '';
  box.innerHTML = `<div class="thud">${hud}</div>${prompt}${card ? `<div class="twrap">${card}</div>` : ''}
    <div class="tpad${card ? ' hide' : ''}" aria-hidden="true"><div class="dpad">${['up', 'left', 'right', 'down'].map(d => `<button data-d="${d}" class="d-${d}">${{ up: '▲', left: '◀', right: '▶', down: '▼' }[d]}</button>`).join('')}</div><button class="abtn" onclick="App.townA()">A</button></div>`;
  hydrate(box);
  box.querySelectorAll('.dpad button').forEach(b => {
    const d = b.dataset.d, on = e => { e.preventDefault(); TG.keys[d] = 1; TG.target = null; }, off = e => { e.preventDefault(); TG.keys[d] = 0; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  const inp = box.querySelector('.tc-type input'); if (inp && CHAT.roma) inp.addEventListener('input', () => { inp.value = romaToKana(inp.value); });
}

/* ---------- movement, camera, drawing ---------- */
const walkable = (px, py) => { const tx = Math.floor(px / TS), ty = Math.floor(py / TS); return tx >= 0 && ty >= 0 && tx < MW && ty < MH && !TG.solid[ty][tx]; };
function townStep(dt) {
  if (TG.talk || TG.battle || TG.card) return;
  let dx = 0, dy = 0; const k = TG.keys;
  if (k.left) dx -= 1; if (k.right) dx += 1; if (k.up) dy -= 1; if (k.down) dy += 1;
  if (!dx && !dy && TG.target) { const tx = TG.target[0] - TOWN.x, ty = TG.target[1] - TOWN.y; if (Math.abs(tx) + Math.abs(ty) < 3) TG.target = null; else { dx = Math.abs(tx) > 2 ? Math.sign(tx) : 0; dy = Math.abs(ty) > 2 ? Math.sign(ty) : 0; } }
  const sp = 1.4 * dt / 16.7;
  if (dx || dy) {
    if (dx && dy) { dx *= .72; dy *= .72; }
    TOWN.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    const nx = TOWN.x + dx * sp, ny = TOWN.y + dy * sp, feet = (x, y) => walkable(x - 5, y - 2) && walkable(x + 5, y - 2) && walkable(x - 5, y + 3) && walkable(x + 5, y + 3) && !TG.npcs.some(n => Math.abs(n.x - x) < 9 && Math.abs(n.y - y) < 6);
    let moved = false;
    if (feet(nx, TOWN.y)) { TOWN.x = nx; moved = true; } if (feet(TOWN.x, ny)) { TOWN.y = ny; moved = true; }
    if (!moved) TG.target = null;
    TG.walkT += dt;
  } else TG.walkT = 0;
  // wandering people and the dog
  for (const n of TG.npcs) if (n.home) { n.x += n.vx * dt / 16.7; if (n.x < n.home[0] || n.x > n.home[2]) n.vx = -n.vx; n.flip = n.vx > 0; if (Math.abs(n.x - TOWN.x) < 14 && Math.abs(n.y - TOWN.y) < 10) n.x -= n.vx * dt / 16.7; }
  // what's next to you
  const near = (x, y, r) => Math.abs(x - TOWN.x) < r && Math.abs(y - TOWN.y) < r;
  let found = null;
  for (const n of TG.npcs) if (near(n.x, n.y, 20)) { found = { type: 'npc', o: n }; break; }
  if (!found) for (const d of DOORS) if ((d.id !== 'books' || ANKI.decks.length) && near(d.tx * TS + 8, d.ty * TS + 8, 21)) { found = { type: 'door', o: d }; break; }
  if (!found) for (const s of TG.spots) if (near(s.tx * TS + 8, s.ty * TS + 8, 16)) { found = { type: 'spot', o: s }; break; }
  if ((found && found.o) !== (TG.near && TG.near.o)) { TG.near = found; townUI(); }
}
function townDraw(now) {
  const c = TG.ctx, cv = TG.cv; if (!c) return;
  const S2 = TG.scale, vw = cv.width / S2, vh = cv.height / S2;
  const camX = Math.max(0, Math.min(MW * TS - vw, TOWN.x - vw / 2)), camY = Math.max(0, Math.min(MH * TS - vh, TOWN.y - vh / 2));
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#62AE3D'; c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(TG.world, camX, camY, vw, vh, 0, 0, vw * S2, vh * S2);
  // sparkles on kanji you haven't found
  for (const s of TG.spots) { if (TOWN.found[s.k]) continue; const tw = (Math.sin(now / 220 + s.tx) + 1) / 2, x = (s.tx * TS + 8 - camX) * S2, y = (s.ty * TS + 8 - camY) * S2;
    c.fillStyle = `rgba(255,248,180,${.5 + tw * .5})`; const r = (2 + tw * 2) * S2; c.fillRect(x - r, y - S2 / 2, r * 2, S2); c.fillRect(x - S2 / 2, y - r, S2, r * 2); }
  // people, sorted so lower ones are in front
  const step = TG.walkT ? Math.floor(TG.walkT / 140) % 2 : 0;
  const pl = { me: 1, y: TOWN.y, x: TOWN.x };
  const all = [...TG.npcs, pl].sort((a, b) => a.y - b.y);
  for (const o of all) {
    const bob = o.me ? 0 : Math.round(Math.sin(now / 400 + o.x) * .6);
    const sx = Math.round(o.x - 8 - camX), sy = Math.round(o.y - 14 - camY) + bob;
    let rows, pal = o.spr === 'cat' ? CATPAL : SPAL, flip = false;
    if (o.me) { rows = TOWN.dir === 'up' ? SPR.pUp : TOWN.dir === 'down' ? SPR.pDown : SPR.pSide; flip = TOWN.dir === 'right';
      if (step) rows = rows.map((r, j) => j >= 13 ? (j === 15 ? r.replace('KKK..KKK', '.KKK.KK.').replace('KK..KK', 'KK...K') : r) : r); }
    else { rows = SPR[o.spr]; flip = !!o.flip; }
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect((sx + 3) * S2, (sy + 15) * S2, 10 * S2, 2 * S2);
    drawRows(c, rows, pal, sx, sy, S2, flip);
  }
  // signs (crisp text at screen size)
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const l of TG.labels) { const x = (l.x - camX) * S2, y = (l.y - camY) * S2; if (x < -60 || y < -20 || x > cv.width + 60 || y > cv.height + 20) continue;
    c.font = `700 ${l.size * S2}px "Zen Kaku Gothic New","Noto Sans JP",sans-serif`; c.fillStyle = l.col; c.fillText(l.t, x, y); }
  // names over people you're next to
  if (TG.near && TG.near.type === 'npc') { const n = TG.near.o, x = (n.x - camX) * S2, y = (n.y - 22 - camY) * S2; c.font = `700 ${6 * S2}px "Zen Kaku Gothic New","Noto Sans JP",sans-serif`;
    const w = c.measureText(n.name).width + 6 * S2; c.fillStyle = 'rgba(30,34,54,.85)'; c.fillRect(x - w / 2, y - 5 * S2, w, 10 * S2); c.fillStyle = '#fff'; c.fillText(n.name, x, y); }
}
const drawRows = (c, rows, pal, x, y, s, flip) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const col = pal[r[i]]; if (!col) continue; c.fillStyle = col; c.fillRect((x + (flip ? r.length - 1 - i : i)) * s, (y + j) * s, s, s); } });
function townLoop(now) {
  if (S.view !== 'play' || S.session || !TG.cv || !document.body.contains(TG.cv)) { TG.raf = 0; townSave(); return; }
  const dt = Math.min(50, now - (TG.last || now)); TG.last = now;
  townStep(dt); townDraw(now);
  if (now - (TG.saveT || 0) > 3000) { TG.saveT = now; townSave(); }
  TG.raf = requestAnimationFrame(townLoop);
}
function townMount() {
  const cv = $('#towncv'); if (!cv) return;
  if (!TG.world || TG.decks !== ANKI.decks.length) { TG.decks = ANKI.decks.length; townBuild(); if (!TG.npcs.length) townNpcs(); }   // redraw when decks are added or removed
  const wrap = cv.parentElement, W = wrap.clientWidth, H = wrap.clientHeight;
  TG.scale = W < 520 ? 2 : 3;
  cv.width = W; cv.height = H; TG.cv = cv; TG.ctx = cv.getContext('2d');
  cv.onpointerdown = e => { if (TG.talk || TG.battle || TG.card) return; const r = cv.getBoundingClientRect(), S2 = TG.scale, vw = cv.width / S2, vh = cv.height / S2;
    const camX = Math.max(0, Math.min(MW * TS - vw, TOWN.x - vw / 2)), camY = Math.max(0, Math.min(MH * TS - vh, TOWN.y - vh / 2));
    const wx = (e.clientX - r.left) / S2 + camX, wy = (e.clientY - r.top) / S2 + camY;
    if (TG.near && Math.abs(wx - TOWN.x) < 18 && Math.abs(wy - TOWN.y) < 18) { townInteract(); return; }
    TG.target = [wx, wy]; };
  if (!TOWN.met.intro) { TOWN.met.intro = 1; townSave(); TG.card = { k: 'intro' }; }
  townUI();
  if (!TG.raf) { TG.last = 0; TG.raf = requestAnimationFrame(townLoop); }
}
document.addEventListener('keydown', e => {
  if (S.view !== 'play' || S.session || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
  const d = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[e.code];
  if (d) { TG.keys[d] = 1; TG.target = null; e.preventDefault(); }
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); if (TG.talk) { const T = TG.talk; if (T.shown < T.lines.length) App.townTalkNext(); } else if (TG.card || TG.battle) {} else townInteract(); }
  if (e.code === 'Escape') App.townClose();
});
document.addEventListener('keyup', e => { const d = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[e.code]; if (d) TG.keys[d] = 0; });
window.addEventListener('resize', () => { if (S.view === 'play' && !S.session) townMount(); });

function vPlay() {
  return `<div class="town"><canvas id="towncv" aria-label="The town: walk with the arrow keys or the pad, press A or Space to talk"></canvas><div id="townui"></div></div>
    <p class="note town-help">Walk with the arrow keys / WASD, the pad, or tap where to go. Talk and go in with <b>Space</b>, <b>Enter</b> or <b>A</b>.</p>`;
}
const townApp = {
  townA() { if (TG.talk) { const T = TG.talk; if (T.shown < T.lines.length) { App.townTalkNext(); return; } } townInteract(); },
  townClose() { TG.talk = null; TG.card = null; TG.battle = null; townUI(); },
  townTalkNext() { const T = TG.talk; if (!T) return; T.shown = Math.min(T.lines.length, T.shown + 1); townUI(); },
  townOpt(k) { const T = TG.talk; const node = T && T.topic.n[T.node]; if (!node || !node.o || !node.o[k]) return; talkReply(plain(node.o[k][0])); },
  townType(v) { const t = String(v || '').trim(); if (t) talkReply(CHAT.roma ? romaToKana(t, true) : t); },
  townYui(id) { TG.card = null; talkStart('yui', id); },
  townBattle() { TG.card = null; battleStart(); },
  townAns: battleAns, townBattleNext: battleNext,
  townDoor: townDoorGo,
  townKanji(k) { App.townClose(); openSheet('k:' + k); },
  townWord(id) { App.townClose(); openSheet(id); }
};
Object.assign(App, townApp);   // this file loads after the main script
