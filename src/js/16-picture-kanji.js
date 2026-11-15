/* =====================================================================
   PICTURE KANJI: picture → picture with the kanji traced over it → kanji.
   Drawn for this app (no outside artwork). Each drawing sits in a 100×100 box and is
   laid out so the kanji's strokes land on the parts of the picture they came from.
   r: 1 = the kanji really began as a drawing of this (pictograph, or a mark on one);
      0 = a memory picture only. The true origin is in "How it came to be".
   ===================================================================== */
const KP_INK = '#3B3127';
const kpO = `stroke="${KP_INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const kpP = (d, fill = 'none') => `<path d="${d}" fill="${fill}" ${kpO}/>`;
const kpL = (d, col, w = 6) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const kpC = (cx, cy, r, fill, ol = true) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${ol ? kpO : ''}/>`;
const kpE = (cx, cy, rx, ry, fill, ol = true, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${ol ? kpO : ''}${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const KPC = { leaf: '#7DBB6A', leaf2: '#5FA052', bark: '#8B5A2B', sky: '#DCEEFB', water: '#4A90D9', sun: '#F6C744', fire: '#F28C28', flame: '#FFD34D', skin: '#F2C9A5', soil: '#B98A5A', gold: '#E8B923', stone: '#A9A39A', red: '#E25B4F', grass: '#A9D18E' };
/** a tree laid out like 木: trunk, a branch across, two roots, leaves on top */
function kpTree(cx, top, w, h) {
  const b = top + h * 0.3, r0 = top + h * 0.42, bot = top + h, rl = w * 0.17;
  return kpC(cx - w * 0.3, top + h * 0.17, rl, KPC.leaf, false) + kpC(cx + w * 0.3, top + h * 0.17, rl, KPC.leaf, false) + kpC(cx, top + h * 0.08, rl * 1.1, KPC.leaf2, false)
    + kpL(`M${cx} ${top} V${bot}`, KPC.bark, w * 0.13) + kpL(`M${cx - w / 2} ${b} H${cx + w / 2}`, KPC.bark, w * 0.09)
    + kpL(`M${cx} ${r0} L${cx - w * 0.45} ${bot - h * 0.12}`, KPC.bark, w * 0.09) + kpL(`M${cx} ${r0} L${cx + w * 0.45} ${bot - h * 0.12}`, KPC.bark, w * 0.09);
}
const kpGround = (y = 93) => kpL(`M4 ${y} H96`, '#9C7B55', 3);
const KPIC = {
  '一': { r: 1, c: 'One counting stick', d: () => kpL('M14 50 H86', KPC.bark, 9) + kpL('M14 50 H86', '#C49A6C', 4) },
  '二': { r: 1, c: 'Two counting sticks', d: () => kpL('M22 30 H78', KPC.bark, 9) + kpL('M10 74 H90', KPC.bark, 9) },
  '三': { r: 1, c: 'Three counting sticks', d: () => kpL('M20 20 H80', KPC.bark, 9) + kpL('M26 50 H74', KPC.bark, 9) + kpL('M10 82 H90', KPC.bark, 9) },
  '山': { r: 1, c: 'A mountain with three peaks', d: () => kpP('M4 90 L20 38 L31 62 L50 8 L69 62 L80 38 L96 90 Z', '#9CC77E') + kpP('M50 8 L42 27 L47 24 L51 29 L55 25 L58 27 Z', '#fff') + kpGround(90) },
  '川': { r: 1, c: 'Water flowing between its banks', d: () => `<path d="M8 4 H92 L96 96 H4 Z" fill="${KPC.sky}"/>` + kpL('M24 8 C 20 35, 27 55, 13 90', KPC.water, 7) + kpL('M50 18 C 47 40, 53 55, 50 74', KPC.water, 7) + kpL('M78 6 C 81 40, 75 62, 80 92', KPC.water, 7) },
  '木': { r: 1, c: 'A tree: its branches above and roots below', d: () => kpTree(50, 6, 76, 88) + kpGround(94) },
  '林': { r: 1, c: 'Two trees together: a grove', d: () => kpTree(27, 10, 42, 82) + kpTree(73, 10, 42, 82) + kpGround(93) },
  '森': { r: 1, c: 'Three trees together: a forest', d: () => kpTree(50, 3, 40, 44) + kpTree(27, 50, 40, 44) + kpTree(73, 50, 40, 44) + kpGround(95) },
  '本': { r: 1, c: 'A tree with a mark at its roots: the root, the origin. It also means “book”', d: () => kpTree(50, 6, 76, 88) + kpL('M30 76 H70', KPC.red, 6) + kpGround(94) },
  '日': { r: 1, c: 'The sun', d: () => [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const t = a * Math.PI / 180; return kpL(`M${50 + 36 * Math.cos(t)} ${50 + 36 * Math.sin(t)} L${50 + 46 * Math.cos(t)} ${50 + 46 * Math.sin(t)}`, KPC.fire, 4); }).join('') + kpC(50, 50, 30, KPC.sun) + kpL('M40 50 H60', '#C98A0E', 4) },
  '月': { r: 1, c: 'A crescent moon', d: () => `<rect x="4" y="4" width="92" height="92" rx="14" fill="#2E3B66"/>` + kpC(18, 20, 1.6, '#fff', false) + kpC(84, 30, 1.4, '#fff', false) + kpC(80, 78, 1.8, '#fff', false) + kpP('M64 8 C 18 20, 18 80, 64 94 C 42 76, 42 26, 64 8 Z', '#F3E6A0') + kpL('M33 42 H45', '#C9B860', 3) + kpL('M33 58 H44', '#C9B860', 3) },
  '明': { r: 1, c: 'The sun and the moon together: bright', d: () => kpC(26, 50, 18, KPC.sun) + kpL('M18 50 H34', '#C98A0E', 3) + `<rect x="50" y="6" width="46" height="88" rx="10" fill="#2E3B66"/>` + kpP('M80 10 C 50 22, 50 78, 80 90 C 64 74, 64 26, 80 10 Z', '#F3E6A0') },
  '火': { r: 1, c: 'A fire with sparks flying up', d: () => kpL('M16 92 L74 70', KPC.bark, 8) + kpL('M84 92 L26 70', KPC.bark, 8) + kpP('M50 10 C 64 30, 76 46, 67 66 C 62 79, 38 79, 33 66 C 26 48, 44 36, 50 10 Z', KPC.fire) + kpP('M50 38 C 57 50, 60 58, 56 68 C 53 74, 47 74, 44 68 C 41 58, 46 50, 50 38 Z', KPC.flame) + kpP('M24 26 C 30 32, 30 40, 24 42 C 18 40, 19 32, 24 26 Z', KPC.flame) + kpP('M76 22 C 82 28, 82 36, 76 38 C 70 36, 71 28, 76 22 Z', KPC.flame) },
  '水': { r: 1, c: 'Water flowing, with drops splashing to each side', d: () => `<path d="M4 70 Q 50 60 96 70 V96 H4 Z" fill="${KPC.sky}"/>` + kpL('M50 6 V82 Q 50 90 42 86', KPC.water, 8) + kpL('M40 40 L14 76', KPC.water, 6) + kpL('M56 42 L88 84', KPC.water, 6) + kpL('M78 26 L62 44', KPC.water, 5) + kpC(26, 30, 3.5, KPC.water, false) + kpC(20, 50, 3, KPC.water, false) },
  '金': { r: 0, c: 'Memory picture: nuggets of gold 丷 buried under a mountain 人', d: () => kpP('M8 50 L50 8 L92 50 V92 H8 Z', '#C9A46B') + kpL('M28 52 H72', '#8E6A3A', 3) + kpL('M22 70 H78', '#8E6A3A', 3) + kpL('M12 90 H88', '#8E6A3A', 3) + kpC(32, 76, 6, KPC.gold) + kpC(68, 76, 6, KPC.gold) + kpC(50, 62, 3.5, KPC.gold) },
  '土': { r: 1, c: 'A mound of earth on the ground, a sprout growing from it', d: () => kpP('M18 88 Q 50 50 82 88 Z', KPC.soil) + kpL('M50 84 V18', KPC.leaf2, 5) + kpP('M50 44 C 40 34, 26 38, 22 46 C 32 52, 44 52, 50 44 Z', KPC.leaf) + kpP('M50 44 C 60 34, 74 38, 78 46 C 68 52, 56 52, 50 44 Z', KPC.leaf) + kpL('M6 88 H94', '#7A5A35', 4) },
  '生': { r: 1, c: 'A plant growing out of the ground: life, to be born', d: () => kpL('M8 90 H92', '#7A5A35', 4) + kpL('M50 90 V12', KPC.leaf2, 5) + kpP('M50 38 C 38 26, 22 30, 18 40 C 30 46, 44 46, 50 38 Z', KPC.leaf) + kpP('M50 62 C 62 52, 78 56, 82 64 C 70 70, 56 70, 50 62 Z', KPC.leaf) + kpP('M50 12 C 44 6, 36 10, 36 16 C 42 18, 48 16, 50 12 Z', KPC.leaf) },
  '田': { r: 1, c: 'A rice field divided by paths', d: () => kpP('M12 12 H88 V88 H12 Z', KPC.grass) + kpL('M50 14 V86', '#B98A5A', 5) + kpL('M14 50 H86', '#B98A5A', 5) + [[26, 26], [70, 26], [26, 70], [70, 70]].map(([x, y]) => kpL(`M${x} ${y + 8} V${y - 4} M${x - 5} ${y + 8} L${x - 7} ${y} M${x + 5} ${y + 8} L${x + 7} ${y}`, KPC.leaf2, 2.5)).join('') },
  '人': { r: 1, c: 'A person seen from the side, walking', d: () => kpC(56, 12, 7, KPC.skin) + kpL('M54 20 C 52 34, 46 48, 38 60 L12 90', KPC.red, 7) + kpL('M44 50 L88 90', '#4A5A8C', 7) + kpL('M52 30 L68 44', KPC.red, 5) },
  '大': { r: 1, c: 'A person standing with arms stretched wide: big', d: () => kpC(50, 13, 8, KPC.skin) + kpL('M10 36 H90', KPC.red, 7) + kpL('M50 22 V52', KPC.red, 8) + kpL('M50 52 L14 92', '#4A5A8C', 7) + kpL('M50 52 L86 92', '#4A5A8C', 7) },
  '天': { r: 1, c: 'A person 大 with the sky above their head', d: () => `<path d="M6 4 H94 V24 H6 Z" fill="${KPC.sky}"/>` + kpL('M18 20 H82', KPC.water, 6) + kpC(50, 32, 7, KPC.skin) + kpL('M12 46 H88', KPC.red, 7) + kpL('M50 39 V60', KPC.red, 8) + kpL('M50 60 L16 94', '#4A5A8C', 7) + kpL('M50 60 L84 94', '#4A5A8C', 7) },
  '立': { r: 1, c: 'A person standing on the ground', d: () => kpC(50, 12, 7, KPC.skin) + kpL('M20 28 H80', KPC.red, 6) + kpL('M50 20 V54', KPC.red, 7) + kpL('M50 54 L34 84', '#4A5A8C', 6) + kpL('M50 54 L66 84', '#4A5A8C', 6) + kpL('M6 88 H94', '#7A5A35', 5) },
  '休': { r: 1, c: 'A person 亻 resting against a tree 木', d: () => kpC(20, 14, 6, KPC.skin) + kpL('M20 20 C 20 40, 22 60, 24 92', KPC.red, 6) + kpL('M20 30 L36 22', KPC.red, 4) + kpTree(68, 8, 54, 84) + kpGround(93) },
  '口': { r: 1, c: 'An open mouth', d: () => kpP('M20 26 Q 50 16 80 26 Q 86 54 80 80 Q 50 90 20 80 Q 14 54 20 26 Z', KPC.red) + kpP('M28 36 Q 50 30 72 36 Q 76 54 72 70 Q 50 76 28 70 Q 24 54 28 36 Z', '#6B1E1E') + kpP('M32 38 H68 V44 H32 Z', '#fff') },
  '目': { r: 1, c: 'An eye, turned on its side', d: () => kpP('M50 6 C 82 28, 82 72, 50 94 C 18 72, 18 28, 50 6 Z', '#fff') + kpC(50, 50, 15, '#5B8DB8') + kpC(50, 50, 6, '#1E2A3A', false) + kpC(46, 45, 2.5, '#fff', false) },
  '見': { r: 1, c: 'A big eye 目 on legs 儿: to see', d: () => kpP('M50 6 C 72 18, 72 46, 50 58 C 28 46, 28 18, 50 6 Z', '#fff') + kpC(50, 32, 9, '#5B8DB8') + kpC(50, 32, 4, '#1E2A3A', false) + kpL('M42 58 C 40 74, 30 86, 14 90', '#4A5A8C', 7) + kpL('M58 58 V82 Q 60 90 86 88', '#4A5A8C', 7) },
  '耳': { r: 1, c: 'An ear', d: () => kpP('M34 10 C 72 2, 92 30, 80 56 C 74 70, 62 72, 60 84 C 58 94, 40 96, 34 86', KPC.skin) + kpP('M34 10 C 24 30, 26 60, 34 86', KPC.skin) + kpL('M44 26 C 62 22, 72 36, 64 50 C 58 58, 50 56, 48 64', '#C98B6B', 4) },
  '手': { r: 1, c: 'A hand with its fingers spread', d: () => kpE(48, 68, 24, 20, KPC.skin) + [[30, 52, 26, 18], [42, 50, 40, 8], [54, 50, 56, 8], [66, 54, 70, 20]].map(([x1, y1, x2, y2]) => kpL(`M${x1} ${y1} L${x2} ${y2}`, KPC.skin, 9) + kpL(`M${x1} ${y1} L${x2} ${y2}`, '#C98B6B', 1.2)).join('') + kpL('M70 70 L90 56', KPC.skin, 9) },
  '足': { r: 1, c: 'A knee 口 above the leg and foot', d: () => kpC(50, 24, 16, KPC.skin) + kpC(50, 24, 7, '#E6B48E', false) + kpL('M50 40 V76', KPC.skin, 14) + kpL('M50 80 L86 88', KPC.skin, 12) + kpL('M50 76 Q 44 88 14 90', '#4A5A8C', 5) },
  '子': { r: 1, c: 'A baby wrapped up, waving its arms', d: () => kpC(50, 20, 14, KPC.skin) + kpL('M12 50 H88', KPC.skin, 8) + kpP('M38 36 H62 C 64 56, 56 76, 50 90 Q 44 96 36 88 C 44 74, 40 52, 38 36 Z', '#9DC3E6') },
  '女': { r: 1, c: 'A woman kneeling with her arms crossed', d: () => kpC(52, 12, 8, KPC.skin) + kpL('M50 20 C 40 40, 34 60, 26 88', '#C0507A', 7) + kpL('M50 20 C 60 44, 66 60, 74 88', '#C0507A', 7) + kpL('M12 52 H88', KPC.skin, 6) + kpL('M30 40 L70 70', KPC.skin, 5) },
  '雨': { r: 1, c: 'Rain falling from the clouds in the sky', d: () => kpL('M8 10 H92', KPC.water, 5) + kpP('M14 32 Q 18 18 34 22 Q 44 12 58 20 Q 76 14 84 28 Q 90 36 84 40 H16 Q 10 38 14 32 Z', '#D5DCE6') + [[32, 56], [68, 56], [32, 78], [68, 78]].map(([x, y]) => kpP(`M${x} ${y - 9} C ${x + 6} ${y}, ${x + 5} ${y + 7}, ${x} ${y + 7} C ${x - 5} ${y + 7}, ${x - 6} ${y}, ${x} ${y - 9} Z`, KPC.water)).join('') + kpL('M50 40 V92', '#9FB2C8', 3) },
  '門': { r: 1, c: 'A gate with two doors', d: () => kpP('M12 8 H46 V92 H12 Z', '#B7834F') + kpP('M54 8 H88 V92 H54 Z', '#B7834F') + [24, 40, 56, 72].map(y => kpL(`M16 ${y} H42 M58 ${y} H84`, '#8B5A2B', 2.5)).join('') + kpC(42, 52, 2, '#3B3127', false) + kpC(58, 52, 2, '#3B3127', false) },
  '車': { r: 1, c: 'A cart seen from above: two wheels, the axle and the box', d: () => kpL('M50 4 V96', KPC.bark, 6) + kpP('M30 34 H70 V66 H30 Z', '#C49A6C') + kpL('M30 50 H70', KPC.bark, 3) + [16, 84].map(y => kpP(`M18 ${y - 6} H82 V${y + 6} H18 Z`, '#555') + kpL(`M26 ${y} H74`, '#999', 2)).join('') },
  '魚': { r: 1, c: 'A fish standing on its tail: head, scaly body, tail fins', d: () => kpP('M50 4 L30 30 H70 Z', '#7FB3D5') + kpE(50, 52, 24, 24, '#7FB3D5') + kpL('M50 30 V76 M28 52 H72', '#4E86B0', 3) + kpC(44, 20, 2.5, '#1E2A3A', false) + [22, 40, 60, 78].map(x => kpP(`M${x} 80 L${x - 6} 94 H${x + 6} Z`, '#4E86B0')).join('') },
  '竹': { r: 1, c: 'Two bamboo stalks with leaves', d: () => [26, 72].map(x => kpL(`M${x} 30 V94`, '#6BAF5B', 8) + kpL(`M${x - 5} 52 H${x + 5} M${x - 5} 74 H${x + 5}`, '#3F7D35', 3) + kpP(`M${x} 30 C ${x - 10} 22, ${x - 20} 14, ${x - 22} 6 C ${x - 10} 10, ${x - 2} 18, ${x} 30 Z`, KPC.leaf) + kpP(`M${x} 30 C ${x + 8} 26, ${x + 18} 24, ${x + 22} 18 C ${x + 14} 30, ${x + 6} 32, ${x} 30 Z`, KPC.leaf)).join('') },
  '米': { r: 1, c: 'Grains of rice around a stalk', d: () => kpL('M50 6 V94', '#C2A15A', 5) + kpL('M10 46 H90', '#C2A15A', 5) + [[30, 22, -30], [70, 22, 30], [26, 74, 40], [74, 74, -40]].map(([x, y, a]) => kpE(x, y, 6, 11, '#F4ECD0', true, a)).join('') },
  '糸': { r: 1, c: 'A twisted bundle of silk thread', d: () => kpP('M50 6 C 30 16, 66 26, 44 36 C 26 46, 70 52, 50 62', 'none') + kpL('M50 6 C 30 16, 66 26, 44 36 C 26 46, 70 52, 50 62', '#E7A6C1', 6) + kpL('M50 62 V94 M50 66 L28 88 M50 66 L72 88', '#E7A6C1', 5) },
  '貝': { r: 1, c: 'A cowrie shell (shells were once used as money)', d: () => kpP('M50 6 C 78 6, 82 64, 50 74 C 18 64, 22 6, 50 6 Z', '#F2DDC1') + kpL('M50 14 C 46 30, 54 48, 50 66', '#8B6A4A', 3) + [26, 40, 54].map(y => kpL(`M42 ${y} H46 M54 ${y} H58`, '#8B6A4A', 2.5)).join('') + kpL('M38 74 L22 92 M62 74 L78 92', '#8B6A4A', 5) },
  '心': { r: 1, c: 'A heart', d: () => kpP('M50 88 C 18 66, 6 44, 18 26 C 28 12, 46 16, 50 32 C 54 16, 72 12, 82 26 C 94 44, 82 66, 50 88 Z', KPC.red) + kpL('M40 22 C 38 12, 44 6, 50 8', '#A8323A', 4) + kpC(64, 36, 4, '#F28C8C', false) },
  '石': { r: 1, c: 'A rock 口 at the foot of a cliff 厂', d: () => kpP('M4 14 H96 V22 H22 C 16 50, 12 74, 4 94 Z', '#9C8F80') + kpP('M38 56 Q 60 46 82 56 Q 90 74 82 90 Q 60 96 38 90 Q 30 74 38 56 Z', KPC.stone) + kpL('M46 66 L56 72', '#7E776E', 2) },
  '牛': { r: 1, c: 'A cow’s head from the front: horns and ears', d: () => kpL('M18 30 C 22 14, 32 10, 40 22 M82 30 C 78 14, 68 10, 60 22', '#E8DCC4', 6) + kpP('M38 22 H62 C 66 50, 62 82, 50 92 C 38 82, 34 50, 38 22 Z', '#C49A6C') + kpL('M8 56 H38 M62 56 H92', '#C49A6C', 9) + kpC(44, 40, 2.5, '#1E2A3A', false) + kpC(56, 40, 2.5, '#1E2A3A', false) + kpE(50, 82, 9, 6, '#E8B4A0') },
  '上': { r: 1, c: 'A mark above a line: up, above', d: () => kpL('M6 88 H94', '#7A5A35', 6) + kpL('M46 88 V36', '#666', 2.5) + kpC(46, 26, 13, KPC.red) + kpL('M46 56 L66 52', '#666', 2) + kpP('M66 46 L80 52 L66 58 Z', KPC.sun) },
  '下': { r: 1, c: 'A mark below a line: down, below', d: () => kpL('M6 12 H94', KPC.bark, 7) + kpL('M48 12 V58', '#666', 2.5) + kpP('M36 58 H60 V84 Q 48 92 36 84 Z', KPC.red) + kpC(70, 40, 6, KPC.sun) },
  '中': { r: 1, c: 'A pole through the middle of a box: the middle', d: () => kpP('M18 32 H82 V70 H18 Z', '#E8D5A8') + kpL('M50 4 V96', KPC.bark, 6) + kpP('M50 6 L74 12 L50 18 Z', KPC.red) },
  '小': { r: 1, c: 'Tiny things: small grains', d: () => kpL('M50 8 V84 Q 50 92 42 88', '#C2A15A', 6) + kpE(24, 52, 7, 11, '#E8DCC0', true, 30) + kpE(76, 52, 7, 11, '#E8DCC0', true, -30) + kpC(50, 8, 4, '#E8DCC0') }
};
/** picture → traced → kanji strip */
function kpStrip(k, cls = '') {
  const p = KPIC[k]; if (!p) return '';
  const art = p.d(), bg = `<rect x="0" y="0" width="100" height="100" rx="12" fill="#FBF7EE"/>`;
  const glyph = op => `<text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-size="86" fill="${op ? '#C0392B' : KP_INK}" ${op ? 'fill-opacity=".92"' : ''} style="font-family:var(--ffj)">${esc(k)}</text>`;
  const svg = (inner, lab) => `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(lab)}">${bg}${inner}</svg>`;
  return `<div class="kps ${cls}" data-kps="${esc(k)}">
    <div class="kps-row"><figure>${svg(art, p.c)}</figure><span class="kps-a">→</span>
      <figure class="kps-mid">${svg(`<g class="kps-art">${art}</g><g class="kps-g">${glyph(true)}</g>`, 'The kanji traced over the picture')}</figure><span class="kps-a">→</span>
      <figure>${svg(glyph(false), k)}</figure></div>
    <div class="kps-cap"><span>${p.r ? '' : '<b class="kps-tag">Memory picture</b> '}${esc(p.r ? p.c : p.c.replace(/^Memory picture:\s*/, ''))}</span><button class="ghost kps-play" onclick="App.kpPlay(this)">▶ Watch it change</button></div>
  </div>`;
}


