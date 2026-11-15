/* =====================================================================
   QUOTE OF THE DAY — public-domain Japanese sayings, poems and proverbs,
   each credited to its author (or as a proverb). Translations: Kotoba Dojo.
   { j: Japanese with {漢字|かな} furigana, e: English, who, whoJ, when, src, note }
   ===================================================================== */
const QUOTES = [
{ j: '{月日|つきひ}は{百代|はくたい}の{過客|かかく}にして、{行|ゆ}かふ{年|とし}も{又|また}{旅人|たびびと}{也|なり}。', e: 'The months and days are travellers of a hundred ages, and the years that come and go are travellers too.', who: 'Matsuo Bashō', whoJ: '松尾芭蕉', when: '1644–1694', src: 'The Narrow Road to the Deep North (おくのほそ道)', note: 'Classical Japanese: 也 (なり) means "is", and 行かふ is today\'s 行き交う.' },
{ j: '{古池|ふるいけ}や{蛙|かわず}{飛|と}び{込|こ}む{水|みず}の{音|おと}', e: 'An old pond. A frog jumps in: the sound of water.', who: 'Matsuo Bashō', whoJ: '松尾芭蕉', when: '1644–1694', src: 'haiku, 1686', note: 'In poetry 蛙 is read かわず; in everyday Japanese it\'s かえる.' },
{ j: '{為|な}せば{成|な}る　{為|な}さねば{成|な}らぬ{何事|なにごと}も　{成|な}らぬは{人|ひと}の{為|な}さぬなりけり', e: 'Try, and it can be done; don\'t try, and it can\'t. Whatever it is, if it isn\'t done, it\'s because no one did it.', who: 'Uesugi Yōzan', whoJ: '上杉鷹山', when: '1751–1822', src: 'waka poem' },
{ j: '{天|てん}は{人|ひと}の{上|うえ}に{人|ひと}を{造|つく}らず{人|ひと}の{下|した}に{人|ひと}を{造|つく}らずと{言|い}えり。', e: 'It is said that heaven does not create one person above another, nor one person below another.', who: 'Fukuzawa Yukichi', whoJ: '福沢諭吉', when: '1835–1901', src: 'An Encouragement of Learning (学問のすゝめ), 1872' },
{ j: '{初心|しょしん}{忘|わす}るべからず', e: 'Never forget the mind you had as a beginner.', who: 'Zeami', whoJ: '世阿弥', when: 'c. 1363–1443', src: 'Kakyō (花鏡), a treatise on Noh theatre', note: 'べからず is a classical "must not".' },
{ j: '{千日|せんにち}の{稽古|けいこ}を{鍛|たん}とし、{万日|まんにち}の{稽古|けいこ}を{錬|れん}とす。', e: 'A thousand days of practice to forge; ten thousand days of practice to polish.', who: 'Miyamoto Musashi', whoJ: '宮本武蔵', when: 'c. 1584–1645', src: 'The Book of Five Rings (五輪書)' },
{ j: '{我|われ}、{事|こと}において{後悔|こうかい}をせず。', e: 'I do not regret the things I have done.', who: 'Miyamoto Musashi', whoJ: '宮本武蔵', when: 'c. 1584–1645', src: 'The Way of Walking Alone (独行道), 1645' },
{ j: '{雨|あめ}ニモマケズ　{風|かぜ}ニモマケズ', e: 'Not beaten by the rain, not beaten by the wind.', who: 'Miyazawa Kenji', whoJ: '宮沢賢治', when: '1896–1933', src: 'poem written in 1931', note: 'Written in katakana, as in the original notebook: ニモマケズ = にも負けず.' },
{ j: '{柿|かき}くへば{鐘|かね}が{鳴|な}るなり{法隆寺|ほうりゅうじ}', e: 'I bite into a persimmon, and the bell rings out: Hōryū-ji.', who: 'Masaoka Shiki', whoJ: '正岡子規', when: '1867–1902', src: 'haiku, 1895', note: 'くへば is the old spelling of 食えば.' },
{ j: '{菜|な}の{花|はな}や{月|つき}は{東|ひがし}に{日|ひ}は{西|にし}に', e: 'A field of rapeseed flowers: the moon in the east, the sun in the west.', who: 'Yosa Buson', whoJ: '与謝蕪村', when: '1716–1784', src: 'haiku, 1774' },
{ j: '{痩蛙|やせがえる}まけるな{一茶|いっさ}{是|これ}に{有|あ}り', e: 'Skinny frog, don\'t give up! Issa is right here.', who: 'Kobayashi Issa', whoJ: '小林一茶', when: '1763–1828', src: 'haiku, 1816' },
{ j: '{春|はる}はあけぼの。', e: 'In spring, it is the dawn.', who: 'Sei Shōnagon', whoJ: '清少納言', when: 'c. 966–1025', src: 'The Pillow Book (枕草子)', note: 'The famous opening line: the best time of spring is daybreak.' },
{ j: '{少|すこ}しのことにも、{先達|せんだつ}はあらまほしき{事|こと}なり。', e: 'Even in small matters, it is good to have a guide.', who: 'Yoshida Kenkō', whoJ: '兼好法師', when: 'c. 1283–1352', src: 'Essays in Idleness (徒然草)' },
{ j: '{人|ひと}の{一生|いっしょう}は{重荷|おもに}を{負|お}うて{遠|とお}き{道|みち}を{行|ゆ}くが{如|ごと}し。{急|いそ}ぐべからず。', e: 'Life is like walking a long road with a heavy load. Do not hurry.', who: 'Tokugawa Ieyasu (attributed)', whoJ: '徳川家康', when: '1543–1616', src: 'Tōshōgū Ikun (東照公遺訓)' },
{ j: '{積小為大|せきしょういだい}', e: 'Small things, added up, become great.', who: 'Ninomiya Sontoku', whoJ: '二宮尊徳', when: '1787–1856', src: 'his teachings', note: 'A four-character saying: 小を積みて大と為す.' },
{ j: '{故|ふる}きを{温|たず}ねて{新|あたら}しきを{知|し}る', e: 'Study the old to understand the new.', who: 'Confucius', whoJ: '孔子', when: '551–479 BC', src: 'The Analects (論語)', note: 'The four-character form is 温故知新 (おんこちしん).' },
{ j: '{千里|せんり}の{道|みち}も{一歩|いっぽ}から', e: 'A journey of a thousand ri begins with a single step.', who: 'Japanese proverb, from Laozi', whoJ: '老子', when: '6th century BC', src: 'Tao Te Ching (道徳経)', note: 'One ri (里) is about 4 km.' },
{ j: '{七転|ななころ}び{八起|やお}き', e: 'Fall down seven times, get up eight.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{石|いし}の{上|うえ}にも{三年|さんねん}', e: 'Sit on a cold stone for three years and even it gets warm: patience pays off.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{塵|ちり}も{積|つ}もれば{山|やま}となる', e: 'Even dust, piled up, becomes a mountain.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{継続|けいぞく}は{力|ちから}なり', e: 'Keeping at it is strength.', who: 'Japanese saying', whoJ: '格言' },
{ j: '{急|いそ}がば{回|まわ}れ', e: 'If you\'re in a hurry, take the long way round.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{好|す}きこそ{物|もの}の{上手|じょうず}なれ', e: 'What you love doing, you become good at.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{笑|わら}う{門|かど}には{福|ふく}{来|きた}る', e: 'Good fortune comes to the house where people laugh.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{猿|さる}も{木|き}から{落|お}ちる', e: 'Even monkeys fall from trees: everyone makes mistakes.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{一期一会|いちごいちえ}', e: 'One time, one meeting: treasure every encounter, because it will never happen the same way again.', who: 'Sen no Rikyū\'s teachings', whoJ: '千利休', when: '1522–1591', src: 'the way of tea (茶道)' },
{ j: '{習|なら}うより{慣|な}れよ', e: 'Getting used to something teaches more than being taught it.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{十人十色|じゅうにんといろ}', e: 'Ten people, ten colours: everyone is different.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{雨|あめ}{降|ふ}って{地|じ}{固|かた}まる', e: 'After the rain, the ground grows firm.', who: 'Japanese proverb', whoJ: 'ことわざ' },
{ j: '{井|い}の{中|なか}の{蛙|かわず}{大海|たいかい}を{知|し}らず', e: 'A frog in a well knows nothing of the great sea.', who: 'Japanese proverb, from Zhuangzi', whoJ: '荘子', when: '4th century BC', src: 'Zhuangzi (荘子)' }
];
/* MODERN QUOTES: short, famous one-line catchphrases, quoted briefly for study
   with full credit. These are copyrighted by their creators (not public domain);
   they can be switched off in Settings. Translations: Kotoba Dojo. */
const QUOTES_MODERN = [
{ j: '{諦|あきら}めんなよ！', e: 'Don\'t give up!', who: 'Shuzo Matsuoka', whoJ: '松岡修造', when: 'former professional tennis player, born 1967', src: 'one of his best-known catchphrases', copy: 'Shuzo Matsuoka', note: '諦めんな is a casual, spoken form of 諦めるな ("don\'t give up").' },
{ j: '{崖|がけ}っぷちありがとう！', e: 'Thank you, cliff edge!', who: 'Shuzo Matsuoka', whoJ: '松岡修造', when: 'former professional tennis player, born 1967', src: 'one of his best-known catchphrases', copy: 'Shuzo Matsuoka', note: '崖っぷち means "the edge of a cliff": being pushed to the limit is a chance to grow.' },
{ j: '{今日|きょう}から{君|きみ}は{富士山|ふじさん}だ！', e: 'From today, you are Mount Fuji!', who: 'Shuzo Matsuoka', whoJ: '松岡修造', when: 'former professional tennis player, born 1967', src: 'one of his best-known catchphrases', copy: 'Shuzo Matsuoka', note: 'Stand tall and steady, like Japan\'s highest mountain.' },
{ j: 'もっと{熱|あつ}くなれよ！', e: 'Get more fired up!', who: 'Shuzo Matsuoka', whoJ: '松岡修造', when: 'former professional tennis player, born 1967', src: 'one of his best-known catchphrases', copy: 'Shuzo Matsuoka', note: '熱くなる: to get heated, to become passionate. なれよ is a strong, friendly command.' },
{ j: 'あきらめたらそこで{試合|しあい}{終了|しゅうりょう}ですよ', e: 'If you give up, that\'s when the game is over.', who: 'Coach Anzai', whoJ: '安西先生', work: 'SLAM DUNK', by: 'Takehiko Inoue', byJ: '井上雄彦', copy: 'Takehiko Inoue / Shueisha', note: 'Polite ですよ from the gentle coach: たら = "if/when".' },
{ j: '{海賊王|かいぞくおう}におれはなる！', e: 'I\'m going to be King of the Pirates!', who: 'Monkey D. Luffy', whoJ: 'モンキー・D・ルフィ', work: 'ONE PIECE', by: 'Eiichiro Oda', byJ: '尾田栄一郎', copy: 'Eiichiro Oda / Shueisha', note: 'Normal order is おれは海賊王になる; putting 海賊王に first adds emphasis.' },
{ j: 'まっすぐ{自分|じぶん}の{言葉|ことば}は{曲|ま}げねェ　それがオレの{忍道|にんどう}だ', e: 'I never go back on my word. That\'s my ninja way.', who: 'Naruto Uzumaki', whoJ: 'うずまきナルト', work: 'NARUTO', by: 'Masashi Kishimoto', byJ: '岸本斉史', copy: 'Masashi Kishimoto / Shueisha', note: '曲げねェ is rough speech for 曲げない ("won\'t bend").' },
{ j: '{逃|に}げちゃダメだ', e: 'I mustn\'t run away.', who: 'Shinji Ikari', whoJ: '碇シンジ', work: 'Neon Genesis Evangelion (新世紀エヴァンゲリオン)', by: 'Hideaki Anno', byJ: '庵野秀明', copy: 'khara', note: '〜ちゃダメ is the spoken form of 〜てはだめ ("must not").' },
{ j: '{心|こころ}を{燃|も}やせ', e: 'Set your heart on fire.', who: 'Kyojuro Rengoku', whoJ: '煉獄杏寿郎', work: 'Demon Slayer (鬼滅の刃)', by: 'Koyoharu Gotouge', byJ: '吾峠呼世晴', copy: 'Koyoharu Gotouge / Shueisha', note: '燃やせ is the plain command form of 燃やす ("to burn").' },
{ j: '{真実|しんじつ}はいつもひとつ！', e: 'There is only ever one truth!', who: 'Conan Edogawa', whoJ: '江戸川コナン', work: 'Detective Conan (名探偵コナン)', by: 'Gosho Aoyama', byJ: '青山剛昌', copy: 'Gosho Aoyama / Shogakukan' },
{ j: '{立|た}って{歩|ある}け　{前|まえ}へ{進|すす}め', e: 'Stand up and walk. Keep moving forward.', who: 'Edward Elric', whoJ: 'エドワード・エルリック', work: 'Fullmetal Alchemist (鋼の錬金術師)', by: 'Hiromu Arakawa', byJ: '荒川弘', copy: 'Hiromu Arakawa / Square Enix', note: 'Two plain commands: 歩け (walk) and 進め (advance).' }
];
const quotePool = () => settings.modernQuotes === false ? QUOTES : QUOTES.concat(QUOTES_MODERN);
function quoteOfDay(offset = 0) {
  const pool = quotePool(), d = today(); let h = 0; for (const c of d) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[(h + offset) % pool.length];
}
function quoteCard() {
  const q = quoteOfDay(S.quoteOff || 0);
  let credit;
  if (q.work) credit = `${esc(q.who)} <span class="jp">${esc(q.whoJ)}</span><span class="qsrc">in ${esc(q.work)}, created by ${esc(q.by)} <span class="jp">${esc(q.byJ)}</span></span>`;
  else if (q.whoJ === 'ことわざ' || q.whoJ === '格言') credit = esc(q.who);
  else credit = `${esc(q.who)} <span class="jp">${esc(q.whoJ)}</span>${q.when ? ` (${esc(q.when)})` : ''}${q.src ? `<span class="qsrc">${esc(q.src)}</span>` : ''}`;
  return `<div class="label">Quote of the day</div>
  <figure class="quote force">
    <blockquote class="qj jp">${ruby(q.j, true)}</blockquote>
    <p class="qe">${esc(q.e)}</p>
    <figcaption>— ${credit}</figcaption>
    ${q.copy ? `<p class="qcopy">© ${esc(q.copy)}. Quoted briefly for study; translation by Kotoba Dojo.</p>` : ''}
    ${q.note ? `<p class="qnote">${esc(q.note)}</p>` : ''}
    <button class="ghost qnext" onclick="App.quoteNext()">Another quote</button>
  </figure>`;
}

