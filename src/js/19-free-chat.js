/* =====================================================================
   FREE CHAT (no API, works offline): Yui texts the way a Japanese friend does on LINE.
   Hand-written conversations on everyday topics. You can type anything: the app reads
   yes / no, picks out the thing you mention (a food, a place, a name) and Yui reacts to it,
   or tap one of the suggested replies. It also checks your message and shows the casual
   version when you use textbook です/ます with a friend.
   Node: b = Yui's lines [jp, en, (jp, en without {x})]; o = suggested replies [jp, en, next];
   y / n / a = where a typed yes / no / anything else goes; cap = remember what they mention
   ('x') or their name; go = carry straight on; end = the topic is finished.
   ===================================================================== */
const OFF_TOPICS = [
  { id: 'intro', t: 'はじめまして', en: 'Meeting someone new', n: {
    start: { b: [['はじめまして〜！ゆいです😊', 'Nice to meet you! I’m Yui 😊'], ['{東京|とうきょう}で{大学生|だいがくせい}やってる！{名前|なまえ}なんていうの？', 'I’m a uni student in Tokyo! What’s your name?']], cap: 'name', o: [['よろしくね！', 'Nice to meet you!', 'from']], a: 'from' },
    from: { b: [['{name}ね！よろしく〜🙌', '{name}! Nice to meet you 🙌', 'よろしくね〜🙌', 'Nice to meet you 🙌'], ['どこ{出身|しゅっしん}？', 'Where are you from?']], cap: 'x', o: [['アメリカだよ', 'The US', 'from2'], ['イギリス！', 'The UK!', 'from2'], ['インドだよ〜', 'India~', 'from2']], a: 'from2' },
    from2: { b: [['{x}！いいな〜、{行|い}ってみたい✨', '{x}! Nice, I’d love to go ✨', 'そうなんだ！いいな〜✨', 'Oh really! Nice ✨'], ['{日本語|にほんご}どのくらい{勉強|べんきょう}してるの？', 'How long have you been studying Japanese?']], o: [['まだ{始|はじ}めたばっかり', 'I only just started', 'beg'], ['{一年|いちねん}くらい', 'About a year', 'mid'], ['{結構|けっこう}{長|なが}いよ', 'Quite a while', 'long']], a: 'mid' },
    beg: { b: [['え、{始|はじ}めたばっかりでこれ{打|う}てるの？すごっ！', 'Wait, you just started and you can type this? Wow!'], ['なんで{日本語|にほんご}やろうと{思|おも}ったの？', 'What made you want to learn Japanese?']], o: [['アニメが{好|す}きだから！', 'Because I love anime!', 'why_anime'], ['{日本|にほん}に{行|い}きたいから', 'Because I want to go to Japan', 'why_trip'], ['{仕事|しごと}で{使|つか}いたい', 'I want to use it for work', 'why_work']], a: 'why_other' },
    mid: { b: [['{一年|いちねん}！ちゃんと{続|つづ}いててえらい👏', 'A year! Great that you’ve kept it up 👏'], ['なんで{日本語|にほんご}やろうと{思|おも}ったの？', 'What made you want to learn Japanese?']], o: [['アニメが{好|す}きだから！', 'Because I love anime!', 'why_anime'], ['{日本|にほん}に{行|い}きたいから', 'Because I want to go to Japan', 'why_trip'], ['{仕事|しごと}で{使|つか}いたい', 'I want to use it for work', 'why_work']], a: 'why_other' },
    long: { b: [['まじで？どうりで{上手|じょうず}だと{思|おも}った笑', 'Really? No wonder you’re good lol'], ['なんで{日本語|にほんご}やろうと{思|おも}ったの？', 'What made you want to learn Japanese?']], o: [['アニメが{好|す}きだから！', 'Because I love anime!', 'why_anime'], ['{日本|にほん}に{行|い}きたいから', 'Because I want to go to Japan', 'why_trip'], ['{仕事|しごと}で{使|つか}いたい', 'I want to use it for work', 'why_work']], a: 'why_other' },
    why_anime: { b: [['わかる〜！アニメで{覚|おぼ}えた{言葉|ことば}とかある？笑', 'I get it! Any words you learned from anime? lol']], o: [['「やばい」とか笑', 'Stuff like “yabai” lol', 'end'], ['「なんで」とか', 'Like “nande”', 'end'], ['{特|とく}にないかも', 'Not really', 'end']], a: 'end' },
    why_trip: { b: [['いいね！{日本|にほん}{来|き}たら{案内|あんない}するよ〜😆', 'Nice! If you come to Japan I’ll show you around 😆']], o: [['ほんと？ありがとう！', 'Really? Thanks!', 'end'], ['{絶対|ぜったい}{行|い}く！', 'I’m definitely going!', 'end']], a: 'end' },
    why_work: { b: [['えらい！{仕事|しごと}で{使|つか}えたらかっこいいよね', 'Respect! It’s cool if you can use it at work']], o: [['がんばる！', 'I’ll do my best!', 'end'], ['まだまだだけどね笑', 'Still a long way to go lol', 'end']], a: 'end' },
    why_other: { b: [['なるほど〜！いいね', 'I see! Nice']], go: 'end' },
    end: { b: [['{日本語|にほんご}でチャットするの{楽|たの}しいね😊', 'Chatting in Japanese is fun 😊'], ['また{話|はな}そ〜！', 'Let’s talk again!']], end: true } } },
  { id: 'weekend', t: '{週末|しゅうまつ}', en: 'The weekend', n: {
    start: { b: [['ねえねえ', 'Hey hey'], ['{週末|しゅうまつ}なにしてた？', 'What did you do at the weekend?']], cap: 'x', o: [['{家|いえ}でゴロゴロしてた笑', 'Lazed around at home lol', 'home'], ['{友達|ともだち}と{出|で}かけた！', 'Went out with friends!', 'out'], ['ずっと{仕事|しごと}だった…', 'Worked the whole time…', 'work']], a: 'misc' },
    home: { b: [['わかる〜笑 {最高|さいこう}じゃん', 'Same lol, that’s the best'], ['なんか{見|み}た？', 'Watch anything?']], o: [['アニメ{見|み}てた', 'Watched anime', 'anime'], ['YouTubeばっかり笑', 'Just YouTube lol', 'yt'], ['{寝|ね}てた笑', 'Slept lol', 'sleep']], a: 'yt' },
    out: { b: [['いいね！どこ{行|い}ったの？', 'Nice! Where did you go?']], cap: 'x', o: [['カフェ{行|い}った', 'Went to a café', 'place'], ['{映画|えいが}{見|み}に{行|い}った', 'Went to see a movie', 'movie'], ['ショッピング！', 'Shopping!', 'place']], a: 'place' },
    place: { b: [['{x}いいな〜！{楽|たの}しかった？', '{x} sounds nice! Was it fun?', 'いいな〜！{楽|たの}しかった？', 'Nice! Was it fun?']], y: 'fun', n: 'notfun', o: [['めっちゃ{楽|たの}しかった！', 'Super fun!', 'fun'], ['まあまあかな', 'So-so', 'notfun']], a: 'fun' },
    movie: { b: [['え、なに{見|み}たの？', 'Oh, what did you see?']], cap: 'x', o: [['アクション{映画|えいが}', 'An action movie', 'movie2'], ['アニメの{映画|えいが}！', 'An anime movie!', 'movie2'], ['{忘|わす}れた笑', 'Forgot lol', 'movie2']], a: 'movie2' },
    movie2: { b: [['いいな〜！{最近|さいきん}{映画館|えいがかん}{行|い}ってないわ', 'Nice! I haven’t been to the cinema lately'], ['また{面白|おもしろ}いのあったら{教|おし}えて！', 'Tell me if you find a good one!']], go: 'end' },
    fun: { b: [['よかったじゃん😆', 'Glad to hear 😆'], ['{今度|こんど}{私|わたし}も{誘|さそ}ってよ〜笑', 'Invite me next time lol']], o: [['いいよ！{一緒|いっしょ}に{行|い}こう', 'Sure! Let’s go together', 'end'], ['じゃあ{来週|らいしゅう}どう？', 'How about next week?', 'end']], a: 'end' },
    notfun: { b: [['そっか〜笑 そういう{日|ひ}もあるよね', 'I see lol, some days are like that']], go: 'end' },
    work: { b: [['え、{週末|しゅうまつ}も？おつかれ〜😭', 'The weekend too? You must be tired 😭'], ['ちゃんと{休|やす}めてる？', 'Are you getting enough rest?']], y: 'rest', n: 'norest', o: [['うん、{大丈夫|だいじょうぶ}', 'Yeah, I’m fine', 'rest'], ['あんまり{休|やす}めてない…', 'Not really resting…', 'norest']], a: 'rest' },
    rest: { b: [['ならよかった！むりしないでね', 'Good! Don’t overdo it']], go: 'end' },
    norest: { b: [['えー{心配|しんぱい}…{今日|きょう}は{早|はや}く{寝|ね}なよ〜', 'Oh no, I’m worried… go to bed early today']], go: 'end' },
    anime: { b: [['なに{見|み}てたの？', 'What were you watching?']], cap: 'x', o: [['{新|あたら}しいアニメ', 'A new anime', 'anime2'], ['{昔|むかし}のアニメ', 'An old one', 'anime2'], ['ジブリ！', 'Ghibli!', 'anime2']], a: 'anime2' },
    anime2: { b: [['{x}いいね〜！{私|わたし}もアニメ{好|す}き🥰', '{x}, nice! I love anime too 🥰', 'いいね〜！{私|わたし}もアニメ{好|す}き🥰', 'Nice! I love anime too 🥰']], go: 'end' },
    yt: { b: [['わかる笑 {気|き}づいたら{夜|よる}になってるやつ', 'Same lol, before you know it it’s night']], go: 'end' },
    sleep: { b: [['{寝|ね}るの{大事|だいじ}！笑', 'Sleep is important! lol']], go: 'end' },
    misc: { b: [['へー！いいじゃん', 'Oh nice!'], ['{楽|たの}しかった？', 'Was it fun?']], y: 'fun', n: 'notfun', o: [['めっちゃ{楽|たの}しかった！', 'Super fun!', 'fun'], ['まあまあかな', 'So-so', 'notfun']], a: 'fun' },
    end: { b: [['{次|つぎ}の{週末|しゅうまつ}もいい{感|かん}じになるといいね〜✨', 'Hope next weekend’s a good one too ✨']], end: true } } },
  { id: 'food', t: 'ごはん', en: 'Food', n: {
    start: { b: [['お{腹|なか}すいた〜🍙', 'I’m hungry 🍙'], ['{今日|きょう}なに{食|た}べた？', 'What did you eat today?']], cap: 'x', o: [['ラーメン！', 'Ramen!', 'ate'], ['パンとコーヒー', 'Bread and coffee', 'ate'], ['まだなにも{食|た}べてない', 'Haven’t eaten anything yet', 'none']], n: 'none', a: 'ate' },
    ate: { b: [['{x}いいな〜！おいしかった？', '{x}, nice! Was it good?', 'いいな〜！おいしかった？', 'Nice! Was it good?']], y: 'good', n: 'bad', o: [['めっちゃおいしかった', 'Really good', 'good'], ['ふつうかな笑', 'Just okay lol', 'bad']], a: 'good' },
    none: { b: [['え、ちゃんと{食|た}べなきゃだめだよ〜！', 'Hey, you have to eat properly!'], ['なに{食|た}べたい？', 'What do you feel like eating?']], cap: 'x', o: [['すし！', 'Sushi!', 'want'], ['{焼肉|やきにく}', 'Yakiniku', 'want'], ['なんでもいい笑', 'Anything lol', 'want']], a: 'want' },
    want: { b: [['{x}いいね！{私|わたし}も{食|た}べたくなってきた笑', '{x}, nice! Now I want some too lol', 'いいね！{私|わたし}もお{腹|なか}すいてきた笑', 'Nice! Now I’m getting hungry too lol']], go: 'fav' },
    good: { b: [['いいな〜！{今度|こんど}{私|わたし}も{食|た}べてみる', 'Nice! I’ll try it next time']], go: 'fav' },
    bad: { b: [['そっか笑 そういう{日|ひ}もある', 'I see lol, it happens']], go: 'fav' },
    fav: { b: [['{日本|にほん}の{食|た}べ{物|もの}でなにが{一番|いちばん}{好|す}き？', 'What’s your favourite Japanese food?']], cap: 'x', o: [['すし', 'Sushi', 'fav2'], ['ラーメン', 'Ramen', 'fav2'], ['{食|た}べたことない…', 'Never had any…', 'never']], a: 'fav2' },
    fav2: { b: [['{x}わかる〜！{最高|さいこう}だよね', '{x}, same! It’s the best', 'わかる〜！{最高|さいこう}だよね', 'Same! It’s the best'], ['{私|わたし}はたこ{焼|や}き{派|は}笑', 'I’m team takoyaki lol']], go: 'end' },
    never: { b: [['えー！じゃあ{日本|にほん}{来|き}たら{絶対|ぜったい}{食|た}べてね', 'What! You have to try it when you come to Japan']], go: 'end' },
    end: { b: [['{話|はな}してたらお{腹|なか}すいた笑 なんか{食|た}べてくる〜', 'Talking about it made me hungry lol, off to eat']], end: true } } },
  { id: 'japan', t: '{日本|にほん}{旅行|りょこう}', en: 'Travelling to Japan', n: {
    start: { b: [['{日本|にほん}{来|き}たことある？', 'Have you been to Japan?']], y: 'yes', n: 'no', o: [['あるよ！', 'Yes!', 'yes'], ['まだない', 'Not yet', 'no']], a: 'no' },
    yes: { b: [['まじ？どこ{行|い}った？', 'Really? Where did you go?']], cap: 'x', o: [['{東京|とうきょう}', 'Tokyo', 'where'], ['{京都|きょうと}と{大阪|おおさか}', 'Kyoto and Osaka', 'where'], ['{北海道|ほっかいどう}', 'Hokkaido', 'where']], a: 'where' },
    where: { b: [['{x}いいじゃん！なにが{一番|いちばん}よかった？', '{x}, nice! What was the best part?', 'いいじゃん！なにが{一番|いちばん}よかった？', 'Nice! What was the best part?']], o: [['ごはん！', 'The food!', 'best'], ['{景色|けしき}がきれいだった', 'The views were beautiful', 'best'], ['みんな{優|やさ}しかった', 'Everyone was kind', 'best']], a: 'best' },
    best: { b: [['わかる〜！また{来|き}てね😊', 'I get that! Come again 😊']], go: 'end' },
    no: { b: [['そうなんだ！{行|い}ってみたいところある？', 'I see! Anywhere you want to go?']], cap: 'x', o: [['{東京|とうきょう}に{行|い}きたい', 'I want to go to Tokyo', 'plan'], ['{京都|きょうと}！', 'Kyoto!', 'plan'], ['{富士山|ふじさん}{見|み}たい', 'I want to see Mt Fuji', 'plan']], a: 'plan' },
    plan: { b: [['{x}いいね！', '{x}, nice!', 'いいね！', 'Nice!'], ['いつごろ{来|く}る{予定|よてい}？', 'When are you thinking of coming?']], o: [['{来年|らいねん}かな', 'Next year maybe', 'when'], ['お{金|かね}{貯|た}まったら笑', 'Once I’ve saved up lol', 'when'], ['まだわかんない', 'Don’t know yet', 'when']], a: 'when' },
    when: { b: [['{来|き}たら{連絡|れんらく}してね！おいしいお{店|みせ}{教|おし}える〜', 'Message me when you come! I’ll show you good places to eat']], go: 'end' },
    end: { b: [['{日本語|にほんご}{話|はな}せたら{旅行|りょこう}もっと{楽|たの}しくなるよ✨', 'Travel’s even more fun when you can speak Japanese ✨']], end: true } } },
  { id: 'gym', t: '{運動|うんどう}', en: 'Exercise', n: {
    start: { b: [['{最近|さいきん}{運動|うんどう}してる？', 'Been exercising lately?']], y: 'yes', n: 'no', o: [['ジム{行|い}ってる！', 'I go to the gym!', 'gym'], ['{走|はし}ってるよ', 'I run', 'run'], ['ぜんぜんしてない笑', 'Not at all lol', 'no']], a: 'yes' },
    yes: { b: [['えらい！なにしてるの？', 'Respect! What do you do?']], o: [['ジム{行|い}ってる', 'I go to the gym', 'gym'], ['{走|はし}ってる', 'I run', 'run']], a: 'gym' },
    gym: { b: [['ジムかっこいい！{週|しゅう}{何回|なんかい}{行|い}ってるの？', 'The gym, cool! How many times a week?']], o: [['{週|しゅう}{3回|さんかい}くらい', 'About 3 times a week', 'gym2'], ['ほぼ{毎日|まいにち}', 'Almost every day', 'gym2'], ['たまに笑', 'Sometimes lol', 'gym2']], a: 'gym2' },
    gym2: { b: [['すごっ！{私|わたし}も{行|い}かなきゃ…', 'Wow! I need to go too…'], ['{筋肉痛|きんにくつう}やばくない？笑', 'Isn’t the muscle soreness crazy? lol']], y: 'sore', n: 'nosore', o: [['やばい笑', 'It’s crazy lol', 'sore'], ['もう{慣|な}れた', 'I’m used to it', 'nosore']], a: 'sore' },
    sore: { b: [['だよね笑 がんばって💪', 'Right lol, keep it up 💪']], go: 'end' },
    nosore: { b: [['プロじゃん笑💪', 'You’re a pro lol 💪']], go: 'end' },
    run: { b: [['いいね！どのくらい{走|はし}るの？', 'Nice! How far do you run?']], o: [['5キロくらい', 'About 5 km', 'run2'], ['30{分|ぷん}くらい', 'About 30 minutes', 'run2'], ['{気分|きぶん}しだい笑', 'Depends on my mood lol', 'run2']], a: 'run2' },
    run2: { b: [['すごい！{私|わたし}1キロでもう{無理|むり}笑', 'Amazing! I’m done after 1 km lol']], go: 'end' },
    no: { b: [['わかる笑 {私|わたし}もぜんぜん…', 'Same lol, me neither…'], ['{今度|こんど}{一緒|いっしょ}に{散歩|さんぽ}でもしよ〜', 'Let’s at least go for a walk together sometime']], o: [['いいね！', 'Sounds good!', 'end'], ['{散歩|さんぽ}ならできる笑', 'A walk I can manage lol', 'end']], a: 'end' },
    end: { b: [['{体|からだ}{大事|だいじ}にしてこ〜✨', 'Let’s look after ourselves ✨']], end: true } } },
  { id: 'plans', t: '{遊|あそ}びの{約束|やくそく}', en: 'Making plans', n: {
    start: { b: [['ねえ、{今度|こんど}の{土曜日|どようび}ひま？', 'Hey, are you free this Saturday?']], y: 'free', n: 'busy', o: [['ひまだよ！', 'I’m free!', 'free'], ['ごめん、{予定|よてい}ある', 'Sorry, I’ve got plans', 'busy'], ['{夜|よる}ならいけるかも', 'Maybe in the evening', 'free']], a: 'free' },
    free: { b: [['やった！どっか{行|い}こうよ〜', 'Yay! Let’s go somewhere'], ['なにしたい？', 'What do you want to do?']], cap: 'x', o: [['カフェ{行|い}きたい', 'I want to go to a café', 'what'], ['カラオケ！', 'Karaoke!', 'what'], ['{買|か}い{物|もの}しよう', 'Let’s go shopping', 'what']], a: 'what' },
    busy: { b: [['そっか〜{残念|ざんねん}😢', 'Oh, that’s a shame 😢'], ['じゃあ{日曜日|にちようび}は？', 'What about Sunday then?']], y: 'free', n: 'later', o: [['{日曜日|にちようび}ならいいよ', 'Sunday works', 'free'], ['{日曜日|にちようび}もちょっと…', 'Sunday’s a bit…', 'later']], a: 'free' },
    later: { b: [['おけ！また{今度|こんど}にしよ〜', 'OK! Another time then']], go: 'end' },
    what: { b: [['{x}いいね！さんせい🙌', '{x}, nice! I’m in 🙌', 'いいね！さんせい🙌', 'Nice! I’m in 🙌'], ['{何時|なんじ}にする？', 'What time?']], o: [['1{時|じ}は？', 'How about 1?', 'time'], ['{午後|ごご}3{時|じ}くらい', 'Around 3pm', 'time'], ['{何時|なんじ}でもいいよ', 'Any time’s fine', 'time']], a: 'time' },
    time: { b: [['おけ！じゃあ{駅|えき}の{前|まえ}で{待|ま}ち{合|あ}わせね', 'OK! Let’s meet in front of the station'], ['{遅|おく}れないでよ〜笑', 'Don’t be late lol']], o: [['りょ！', 'Got it!', 'end'], ['{楽|たの}しみ！', 'Can’t wait!', 'end'], ['ゆいこそ笑', 'You too lol', 'end']], a: 'end' },
    end: { b: [['{楽|たの}しみにしてる〜😊', 'Looking forward to it 😊']], end: true } } },
  { id: 'day', t: '{学校|がっこう}・{仕事|しごと}', en: 'School and work', n: {
    start: { b: [['{今日|きょう}{学校|がっこう}か{仕事|しごと}だった？', 'Did you have school or work today?']], o: [['{仕事|しごと}だった', 'I had work', 'work'], ['{学校|がっこう}だった', 'I had school', 'school'], ['{休|やす}みだった！', 'I had the day off!', 'off']], a: 'work' },
    work: { b: [['おつかれさま〜！{忙|いそが}しかった？', 'Good work today! Was it busy?']], y: 'busy', n: 'calm', o: [['めっちゃ{忙|いそが}しかった', 'Really busy', 'busy'], ['そうでもない', 'Not really', 'calm']], a: 'busy' },
    busy: { b: [['えー{大変|たいへん}だったね😭', 'Oh no, that sounds rough 😭'], ['{今日|きょう}はゆっくり{休|やす}んでね', 'Take it easy tonight']], go: 'end' },
    calm: { b: [['いいな〜{平和|へいわ}な{日|ひ}笑', 'Nice, a peaceful day lol']], go: 'end' },
    school: { b: [['なに{勉強|べんきょう}してるの？', 'What are you studying?']], cap: 'x', o: [['{英語|えいご}', 'English', 'study'], ['{数学|すうがく}', 'Maths', 'study'], ['{日本語|にほんご}だよ！', 'Japanese!', 'study']], a: 'study' },
    study: { b: [['{x}かぁ！{難|むずか}しくない？', '{x}, huh! Isn’t it hard?', 'そうなんだ！{難|むずか}しくない？', 'Oh really! Isn’t it hard?']], y: 'hard', n: 'easy', o: [['{難|むずか}しい…', 'It’s hard…', 'hard'], ['{楽|たの}しいよ', 'It’s fun', 'easy']], a: 'hard' },
    hard: { b: [['わかる…でもがんばってるのえらい👏', 'I get it… but you’re working hard, respect 👏']], go: 'end' },
    easy: { b: [['{楽|たの}しいのが{一番|いちばん}だね！', 'Having fun is what matters!']], go: 'end' },
    off: { b: [['いいな〜！なにしてたの？', 'Lucky! What did you do?']], o: [['ずっと{寝|ね}てた笑', 'Slept the whole time lol', 'offx'], ['{日本語|にほんご}{勉強|べんきょう}してた', 'Studied Japanese', 'offx'], ['{出|で}かけてた', 'Went out', 'offx']], a: 'offx' },
    offx: { b: [['いい{休|やす}みじゃん😊', 'Sounds like a good day off 😊']], go: 'end' },
    end: { b: [['{明日|あした}もがんばろうね〜', 'Let’s do our best tomorrow too']], end: true } } },
  { id: 'hobby', t: '{趣味|しゅみ}', en: 'Hobbies', n: {
    start: { b: [['{最近|さいきん}ハマってることある？', 'Into anything lately?']], cap: 'x', o: [['ゲーム！', 'Games!', 'hobby'], ['{音楽|おんがく}', 'Music', 'music'], ['{料理|りょうり}', 'Cooking', 'hobby']], a: 'hobby' },
    hobby: { b: [['{x}いいね！どれくらいハマってるの？笑', '{x}, nice! How into it are you? lol', 'いいね！どれくらいハマってるの？笑', 'Nice! How into it are you? lol']], o: [['{毎日|まいにち}やってる笑', 'Every day lol', 'hobby2'], ['たまにかな', 'Now and then', 'hobby2']], a: 'hobby2' },
    hobby2: { b: [['いいな〜{好|す}きなことあるのって{大事|だいじ}だよね', 'Nice, having something you love matters']], go: 'end' },
    music: { b: [['どんな{音楽|おんがく}{聞|き}くの？', 'What kind of music do you listen to?']], cap: 'x', o: [['J-POP', 'J-pop', 'music2'], ['ロック', 'Rock', 'music2'], ['いろいろ', 'All sorts', 'music2']], a: 'music2' },
    music2: { b: [['{x}いいね〜！おすすめあったら{教|おし}えて🎧', '{x}, nice! Send me recommendations 🎧', 'いいね〜！おすすめあったら{教|おし}えて🎧', 'Nice! Send me recommendations 🎧']], go: 'end' },
    end: { b: [['{話|はな}せて{楽|たの}しかった〜！またね👋', 'That was fun! See you 👋']], end: true } } }
];
const OFF = Object.assign({ topic: null, node: null, slots: {}, tips: 0 }, store.get('chatoff', {}));
const offSave = () => store.set('chatoff', OFF);

/* ---------- reading what they typed ---------- */
const OFF_NO = /(ううん|いいえ|いや(?!す)|ない(?!と)|ません|まだ|全然|ぜんぜん|だめ|ちがう|違う|むり|無理|\bno\b|\bnope\b)/i;
const OFF_YES = /(うん|はい|ええ|そう|ある|いる|した|行った|いった|もちろん|まあ|おう|いいよ|大丈夫|だいじょうぶ|好き|すき|\byes\b|\byeah\b|\byep\b)/i;
function offYesNo(t) { if (OFF_NO.test(t)) return 'n'; if (OFF_YES.test(t)) return 'y'; return ''; }
/** the thing they mention: the longest dictionary noun in their message, else a katakana word, else a kanji word */
function offThing(t) {
  const s = String(t).replace(/[。、！？!?…〜ー笑w\s]+$/g, '');
  let best = '';
  for (const x of V) { if (x.w.length < 2 || x.w.length <= best.length || !s.includes(x.w)) continue; if (!['noun', 'other', 'expression'].includes(x.pos) && x.lvl !== 'ANKI') continue; if (/^(ある|いる|する|なる|これ|それ|あれ|ここ|そこ|今日|昨日|明日|週末|最近|毎日|一緒|友達)$/.test(x.w)) continue; best = x.w; }
  if (best) return best;
  const k = s.match(/[ァ-ヶー]{2,}/g);
  if (!k && s.length <= 6 && /^[ぁ-んァ-ヶー一-龯々]+$/.test(s) && !offYesNo(s)) return s;   // a short answer like すし is the thing itself
  if (k) return k.sort((a, b) => b.length - a.length)[0];
  const h = s.match(/[一-龯々]{2,}/g); if (h) return h[0];
  return '';
}
function offName(t) {
  let s = String(t).replace(/(はじめまして|よろしく(お願いします|ね|〜|!|！)*|です|だよ|だ$|っていいます|と申します|といいます|って呼んで|って言います|。|、|！|!)/g, ' ').replace(/^(私|わたし|僕|ぼく|俺|おれ|名前|なまえ)(は|の名前は)?/, '').trim();
  s = s.split(/\s+/)[0] || '';
  return s && s.length <= 12 ? s : '';
}
/** pick the suggested reply they meant, if their message matches one */
function offMatchOpt(t, opts) {
  const p = plain(t).replace(/[。、！？!?…〜笑w\s]/g, '');
  let best = null, bs = 0;
  for (const o of opts || []) {
    const q = plain(o[0]).replace(/[。、！？!?…〜笑w\s]/g, ''); if (!q) continue;
    if (p.includes(q) || q.includes(p) && p.length >= 2) return o;
    const a = new Set(p), shared = [...q].filter(c => a.has(c)).length / q.length;
    if (shared > bs) { bs = shared; best = o; }
  }
  return bs >= 0.7 ? best : null;
}

/* ---------- friendly corrections (the textbook → chat version) ---------- */
const GODAN_RU = new Set(['帰る', '入る', '走る', '知る', '切る', '要る', '減る', '喋る', '蹴る', '滑る', '握る', '参る', '限る', '焦る', '混じる', 'かえる', 'はいる', 'はしる', 'しる', 'きる', 'いる']);
function verbClass(x) {
  const tags = (x.senses || []).flatMap(s => s.p || []);
  const t = tags.find(g => /^v(1|5|k|s|z)/.test(g));
  if (t) return t.startsWith('v1') ? 'v1' : t === 'vk' ? 'vk' : /^vs/.test(t) ? 'vs' : t;
  if (x.w === 'する') return 'vs'; if (x.w === '来る' || x.w === 'くる') return 'vk';
  if (/[えけげせぜてでねへべぺめれいきぎしじちぢにひびぴみり]る$/.test(x.r) && !GODAN_RU.has(x.w)) return 'v1';
  return 'v5' + ({ う: 'u', く: 'k', ぐ: 'g', す: 's', つ: 't', ぬ: 'n', ぶ: 'b', む: 'm', る: 'r' }[x.w.slice(-1)] || 'r');
}
const ROWI = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' }, ROWA = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };
const TA = { う: 'った', つ: 'った', る: 'った', む: 'んだ', ぶ: 'んだ', ぬ: 'んだ', く: 'いた', ぐ: 'いだ', す: 'した' };
let MASU = null;
function masuIndex() {
  if (MASU) return MASU; MASU = new Map();
  for (const x of V) {
    if (x.pos !== 'verb' || !/[うくぐすつぬぶむる]$/.test(x.w)) continue;
    const c = verbClass(x), base = x.w.slice(0, -1), last = x.w.slice(-1);
    let forms;
    if (c === 'vs' || /する$/.test(x.w)) { const b = x.w.replace(/する$/, ''); forms = { stem: b + 'し', ta: b + 'した', nai: b + 'しない', nakatta: b + 'しなかった' }; }
    else if (c === 'vk' || /^(来る|くる)$/.test(x.w)) { const k = x.w === 'くる' ? '' : '来'; forms = { stem: k ? '来' : 'き', ta: k ? '来た' : 'きた', nai: k ? '来ない' : 'こない', nakatta: k ? '来なかった' : 'こなかった' }; }
    else if (c === 'v1') forms = { stem: base, ta: base + 'た', nai: base + 'ない', nakatta: base + 'なかった' };
    else { const ta = c === 'v5k-s' || /^(行く|いく)$/.test(x.w) ? base + 'った' : base + TA[last]; forms = { stem: base + ROWI[last], ta, nai: x.w === 'ある' ? 'ない' : base + ROWA[last] + 'ない', nakatta: x.w === 'ある' ? 'なかった' : base + ROWA[last] + 'なかった' }; }
    forms.dict = x.w;
    if (!MASU.has(forms.stem)) MASU.set(forms.stem, forms);
  }
  return MASU;
}
/** their message in casual chat style, or null if it already is */
function offCasual(t) {
  const m = /^(.*?)(ませんでした|ました|ません|ましょう|ます|でした|です)(か)?([。！？!?…〜w笑]*)$/.exec(String(t).trim());
  if (!m) return null;
  let [, before, end, ka, punct] = m, out = null;
  if (/^(です|でした)$/.test(end)) {
    const b = before.replace(/(じゃない|ではない|じゃありません)$/, 'じゃない');
    if (end === 'でした') out = /(かった|くなかった)$/.test(b) ? b : b + 'だった';
    else {   // 好きです → 好き, おいしいです → おいしい, 学生です → 学生だよ
      let w = null; for (const x of V) if (b.endsWith(x.w) && (!w || x.w.length > w.w.length)) w = x;
      out = /(い|ない|たい)$/.test(b) || (w && w.pos === 'na-adj') || /(好き|嫌い|上手|下手|大丈夫|元気|暇|ひま|きれい|好き)$/.test(b) ? b : b + 'だよ';
    }
  } else {
    const idx = masuIndex(); let hit = null;
    for (let L = Math.min(8, before.length); L >= 1 && !hit; L--) { const f = idx.get(before.slice(-L)); if (f) hit = [L, f]; }
    if (!hit) return { better: '', note: 'Friends usually drop です/ます in chats: use the plain form (行きます → 行く, 行きました → 行った).' };
    const [L, f] = hit, head = before.slice(0, -L);
    out = head + (end === 'ます' ? f.dict : end === 'ました' ? f.ta : end === 'ません' ? f.nai : end === 'ませんでした' ? f.nakatta : f.stem + 'よう');
    if (end === 'ましょう') out = head + (f.dict.endsWith('る') && verbClass({ w: f.dict, r: f.dict, senses: [] }) === 'v1' ? f.dict.slice(0, -1) + 'よう' : f.dict.slice(0, -1) + ({ う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' }[f.dict.slice(-1)] || 'ろ') + 'う');
  }
  const q = ka || /[？?]/.test(punct);
  return { better: out + (q ? '？' : punct.replace(/。$/, '') || ''), note: ka ? 'With friends, drop です/ます and the question か: just raise the tone with ？.' : 'With friends, drop です/ます: plain forms sound natural in chats.' };
}

/* ---------- running a conversation ---------- */
const offTopic = id => OFF_TOPICS.find(t => t.id === id);
function offLine(l) {
  const x = OFF.slots.x, name = OFF.slots.name;
  let jp = l[0], en = l[1];
  if ((jp.includes('{x}') && !x) || (jp.includes('{name}') && !name)) { jp = l[2] || jp.replace(/\{x\}|\{name\}/g, ''); en = l[3] || en; }
  const fill = s => s.replace(/\{x\}/g, x || '').replace(/\{name\}/g, name || '');
  return { j: fill(jp), e: fill(en) };
}
function offBot(lines) {
  const ms = lines.map(offLine);
  ms.forEach((m, k) => setTimeout(() => {
    CHAT.msgs.push({ me: 0, reply: plain(m.j), furi: m.j, en: m.e, words: offWords(m.j), off: 1, at: Date.now() });
    if (k === ms.length - 1) CHAT.busy = false;
    chatSave(); if (S.view === 'chat') { render(); chatScroll(); }
  }, 650 + k * 750));
  CHAT.busy = true;
}
/** up to two words in her line you don't know yet, to save */
function offWords(j) {
  const p = plain(j), out = [];
  for (const x of V) { if (out.length >= 1) break; if (x.w.length < 2 || !hanOf(x.w).length || !p.includes(x.w) || status(x.id) === 'known' || !x.m) continue; if (out.some(o => o.w.includes(x.w) || x.w.includes(o.w))) continue; out.push({ w: x.w, r: x.r, m: String(x.m).split(/[;,]/)[0] }); }
  return out;
}
function offEnter(id) {
  const t = offTopic(id) || OFF_TOPICS[0], node = t.n[id === OFF.topic && OFF.node ? OFF.node : 'start'];
  OFF.topic = t.id; OFF.node = 'start'; OFF.slots = { name: OFF.slots.name };
  offSave(); offBot(t.n.start.b);
}
function offGo(key) {
  const t = offTopic(OFF.topic); if (!t) return;
  let node = t.n[key]; if (!node) return;
  OFF.node = key; let lines = [...node.b];
  while (node.go) { node = t.n[node.go]; OFF.node = Object.keys(t.n).find(k => t.n[k] === node); lines = lines.concat(node.b); }
  if (node.end) OFF.done = Object.assign(OFF.done || {}, { [t.id]: 1 });
  offSave(); offBot(lines);
}
function offReply(text) {
  const t = offTopic(OFF.topic); const node = t && t.n[OFF.node];
  CHAT.msgs.push({ me: 1, t: text, at: Date.now() });
  const me = CHAT.msgs[CHAT.msgs.length - 1];
  // their message: casual-style tip, romaji / English nudges
  const fix = offCasual(text);
  if (fix && (fix.better || OFF.tips < 3)) { me.fix = fix; OFF.tips++; }
  else if (/^[\x00-\x7F\s]+$/.test(text) && /[a-z]{3,}/i.test(text)) me.fix = { better: '', note: /^(hi|hello|hey|yes|no|ok)\b/i.test(text) ? 'Try it in Japanese! Tap A next to the box to type in romaji and get kana.' : 'Try writing it in Japanese, or tap one of the suggested replies.' };
  chatSave();
  if (!node || node.end) { render(); chatScroll(); offBot([['{話|はな}そ〜！{下|した}から{話題|わだい}{選|えら}んでね😊', 'Let’s chat! Pick a topic below 😊']]); return; }
  if (!/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) {   // no Japanese at all: she nudges and waits on the same question
    render(); chatScroll(); offBot([['{日本語|にほんご}でいいよ〜笑 {下|した}のから{選|えら}んでもOK！', 'Japanese is fine lol, you can pick one below too!']]); return;
  }
  if (node.cap === 'name') { const n = offName(text); if (n) OFF.slots.name = n; }
  if (node.cap === 'x') OFF.slots.x = offThing(text) || '';
  const o = offMatchOpt(text, node.o), yn = offYesNo(text);
  let next = o ? o[2] : yn === 'y' && node.y ? node.y : yn === 'n' && node.n ? node.n : node.a || (node.o && node.o[0] && node.o[0][2]);
  if (o && node.cap === 'x' && !OFF.slots.x) OFF.slots.x = '';
  render(); chatScroll();
  if (next) offGo(next);
}


/* more everyday topics for Free chat (same format as OFF_TOPICS) */
OFF_TOPICS.push(
  { id: 'weather', t: '{天気|てんき}', en: 'The weather', n: {
    start: { b: [['{今日|きょう}めっちゃ{暑|あつ}くない？🥵', 'Isn’t it super hot today? 🥵']], y: 'hot', n: 'nothot', o: [['{暑|あつ}い！とけそう', 'So hot! I’m melting', 'hot'], ['こっちは{寒|さむ}いよ', 'It’s cold here', 'cold'], ['ちょうどいいかな', 'It’s just right', 'nice']], a: 'there' },
    hot: { b: [['だよね〜😭 エアコンないと{無理|むり}', 'Right? 😭 Can’t survive without AC'], ['{暑|あつ}い{日|ひ}なに{飲|の}む？', 'What do you drink on hot days?']], cap: 'x', o: [['アイスコーヒー', 'Iced coffee', 'drink'], ['{冷|つめ}たいお{茶|ちゃ}', 'Cold tea', 'drink'], ['{水|みず}ばっかり', 'Just water', 'drink']], a: 'drink' },
    drink: { b: [['{x}いいね！{私|わたし}は{麦茶|むぎちゃ}{派|は}', '{x}, nice! I’m team barley tea', 'いいね！{私|わたし}は{麦茶|むぎちゃ}{派|は}', 'Nice! I’m team barley tea'], ['{水分|すいぶん}とってね〜', 'Stay hydrated~']], go: 'end' },
    nothot: { b: [['え、そうなの？いいな〜', 'Oh really? Lucky'], ['そっちの{天気|てんき}どう？', 'How’s the weather there?']], cap: 'x', o: [['{雨|あめ}ふってる', 'It’s raining', 'rain'], ['{晴|は}れてるよ', 'It’s sunny', 'nice'], ['くもり', 'Cloudy', 'nice']], a: 'there' },
    there: { b: [['そっちの{天気|てんき}どう？', 'How’s the weather where you are?']], o: [['{雨|あめ}ふってる', 'It’s raining', 'rain'], ['{晴|は}れてるよ', 'It’s sunny', 'nice'], ['{寒|さむ}い〜', 'Cold~', 'cold']], a: 'nice' },
    cold: { b: [['{寒|さむ}いのも{大変|たいへん}だね🥶', 'Cold is tough too 🥶'], ['あったかくしてね！', 'Keep warm!']], go: 'end' },
    rain: { b: [['{雨|あめ}か〜☔ {傘|かさ}{持|も}ってる？', 'Rain, huh ☔ Got an umbrella?']], y: 'umb', n: 'noumb', o: [['{持|も}ってる！', 'I do!', 'umb'], ['{忘|わす}れた笑', 'Forgot it lol', 'noumb']], a: 'umb' },
    umb: { b: [['えらい！{雨|あめ}の{日|ひ}は{家|いえ}でゴロゴロしたいよね', 'Good! On rainy days you just want to stay home, right?']], go: 'end' },
    noumb: { b: [['あらら笑 コンビニで{買|か}っちゃお', 'Oops lol, just buy one at a konbini']], go: 'end' },
    nice: { b: [['いいね〜{気持|きも}ちいい{日|ひ}じゃん☀️', 'Nice, sounds like a lovely day ☀️'], ['{散歩|さんぽ}{日和|びより}だね', 'Perfect weather for a walk']], go: 'end' },
    end: { b: [['{天気|てんき}いいと{気分|きぶん}も{上|あ}がるよね〜', 'Good weather lifts your mood, doesn’t it']], end: true } } },
  { id: 'morning', t: '{朝|あさ}・{眠|ねむ}い', en: 'Mornings and sleep', n: {
    start: { b: [['おはよ〜☀️', 'Morning ☀️'], ['ちゃんと{寝|ね}れた？', 'Did you sleep okay?']], y: 'slept', n: 'tired', o: [['よく{寝|ね}れた！', 'Slept well!', 'slept'], ['{眠|ねむ}い…', 'I’m sleepy…', 'tired'], ['{全然|ぜんぜん}{寝|ね}てない', 'Barely slept', 'tired']], a: 'slept' },
    slept: { b: [['いいな〜！{何時|なんじ}に{起|お}きたの？', 'Lucky! What time did you get up?']], o: [['6{時|じ}', '6', 'early'], ['8{時|じ}くらい', 'Around 8', 'mid'], ['お{昼|ひる}{前|まえ}笑', 'Just before noon lol', 'late']], a: 'mid' },
    early: { b: [['はやっ！えらすぎ👏', 'So early! Impressive 👏']], go: 'breakfast' },
    mid: { b: [['ちょうどいいね！', 'Just right!']], go: 'breakfast' },
    late: { b: [['{休|やす}みの{日|ひ}あるある笑', 'Classic day off lol']], go: 'breakfast' },
    tired: { b: [['えー{大丈夫|だいじょうぶ}？{昨日|きのう}{何時|なんじ}に{寝|ね}たの？', 'Oh no, are you OK? What time did you go to bed?']], o: [['2{時|じ}くらい…', 'Around 2…', 'late2'], ['ずっとスマホ{見|み}てた笑', 'I was on my phone the whole time lol', 'phone']], a: 'late2' },
    late2: { b: [['それは{眠|ねむ}いわ笑 {今日|きょう}は{早|はや}く{寝|ね}よ', 'No wonder you’re sleepy lol, go to bed early tonight']], go: 'breakfast' },
    phone: { b: [['わかる〜{気|き}づいたら{朝|あさ}なんだよね笑', 'Same, before you know it it’s morning lol']], go: 'breakfast' },
    breakfast: { b: [['{朝|あさ}ごはん{食|た}べた？', 'Did you have breakfast?']], y: 'ate', n: 'skip', o: [['{食|た}べた！', 'Yep!', 'ate'], ['コーヒーだけ', 'Just coffee', 'skip'], ['{食|た}べてない', 'Didn’t eat', 'skip']], a: 'ate' },
    ate: { b: [['えらい！{朝|あさ}ごはん{大事|だいじ}だよね', 'Good! Breakfast is important']], go: 'end' },
    skip: { b: [['わかる、{朝|あさ}は{時間|じかん}ないよね〜', 'I get it, there’s no time in the morning']], go: 'end' },
    end: { b: [['{今日|きょう}も{一日|いちにち}がんばろ〜💪', 'Let’s make it a good day 💪']], end: true } } },
  { id: 'family', t: '{家族|かぞく}', en: 'Family', n: {
    start: { b: [['そういえば{兄弟|きょうだい}いる？', 'By the way, do you have any brothers or sisters?']], y: 'yes', n: 'only', o: [['{兄|あに}がいる', 'I have an older brother', 'older'], ['{妹|いもうと}がいるよ', 'I have a younger sister', 'younger'], ['ひとりっこ', 'I’m an only child', 'only']], a: 'yes' },
    yes: { b: [['いいな〜！{上|うえ}？{下|した}？', 'Nice! Older or younger?']], o: [['{上|うえ}だよ', 'Older', 'older'], ['{下|した}！', 'Younger!', 'younger']], a: 'older' },
    older: { b: [['お{兄|にい}ちゃんかお{姉|ねえ}ちゃんいるの{羨|うらや}ましい〜', 'I’m jealous you have an older sibling'], ['{仲|なか}いい？', 'Do you get on?']], y: 'close', n: 'notclose', o: [['{仲|なか}いいよ！', 'We get on well!', 'close'], ['まあまあかな笑', 'So-so lol', 'notclose']], a: 'close' },
    younger: { b: [['{下|した}の{子|こ}かわいいよね〜', 'Younger siblings are cute, right?'], ['{仲|なか}いい？', 'Do you get on?']], y: 'close', n: 'notclose', o: [['{仲|なか}いいよ！', 'We get on well!', 'close'], ['よくケンカする笑', 'We fight a lot lol', 'notclose']], a: 'close' },
    only: { b: [['そうなんだ！{私|わたし}も{一人|ひとり}っ{子|こ}だよ〜', 'Oh really! I’m an only child too'], ['{自由|じゆう}でいいよね笑', 'It’s nice and free lol']], go: 'live' },
    close: { b: [['いいね〜{素敵|すてき}', 'Aw, that’s lovely']], go: 'live' },
    notclose: { b: [['{兄弟|きょうだい}ってそんなもんだよね笑', 'That’s siblings for you lol']], go: 'live' },
    live: { b: [['{今|いま}{家族|かぞく}と{一緒|いっしょ}に{住|す}んでるの？', 'Do you live with your family now?']], y: 'together', n: 'alone', o: [['うん、{一緒|いっしょ}', 'Yeah, together', 'together'], ['{一人暮|ひとりぐ}らし', 'I live alone', 'alone']], a: 'together' },
    together: { b: [['にぎやかでいいね😊', 'Lively, that’s nice 😊']], go: 'end' },
    alone: { b: [['{一人暮|ひとりぐ}らしか〜{自由|じゆう}だけど{料理|りょうり}{大変|たいへん}じゃない？', 'Living alone, huh. Free, but isn’t cooking a pain?']], go: 'end' },
    end: { b: [['{家族|かぞく}{大事|だいじ}にしよ〜😊', 'Family’s important 😊']], end: true } } },
  { id: 'pets', t: 'ペット', en: 'Pets', n: {
    start: { b: [['ねえ、ペット{飼|か}ってる？🐶', 'Hey, do you have a pet? 🐶']], y: 'yes', n: 'no', o: [['{犬|いぬ}{飼|か}ってる！', 'I have a dog!', 'dog'], ['{猫|ねこ}がいるよ', 'I have a cat', 'cat'], ['{飼|か}ってない', 'No pets', 'no']], a: 'yes' },
    yes: { b: [['いいな〜！なに{飼|か}ってるの？', 'Lucky! What kind?']], o: [['{犬|いぬ}', 'A dog', 'dog'], ['{猫|ねこ}', 'A cat', 'cat']], a: 'dog' },
    dog: { b: [['わんちゃん！かわいい🥺', 'A doggy! So cute 🥺'], ['{名前|なまえ}なんていうの？', 'What’s its name?']], cap: 'x', a: 'name', o: [['ポチ笑', 'Pochi lol', 'name'], ['ないしょ笑', 'It’s a secret lol', 'name']] },
    cat: { b: [['ねこちゃん！かわいい🥺', 'A kitty! So cute 🥺'], ['{名前|なまえ}なんていうの？', 'What’s its name?']], cap: 'x', a: 'name', o: [['タマ笑', 'Tama lol', 'name'], ['ないしょ笑', 'It’s a secret lol', 'name']] },
    name: { b: [['{x}ちゃん！かわいい{名前|なまえ}〜', '{x}! What a cute name', 'かわいい〜！', 'So cute!'], ['{今度|こんど}{写真|しゃしん}{見|み}せて📸', 'Show me a photo next time 📸']], o: [['いいよ！', 'Sure!', 'end'], ['{写真|しゃしん}いっぱいある笑', 'I have loads of photos lol', 'end']], a: 'end' },
    no: { b: [['そっか〜{飼|か}うならなにがいい？', 'I see. If you could have one, what would it be?']], cap: 'x', o: [['{犬|いぬ}がいい！', 'A dog!', 'want'], ['{猫|ねこ}かな', 'A cat, I think', 'want'], ['ハムスター', 'A hamster', 'want']], a: 'want' },
    want: { b: [['{x}いいね〜！{私|わたし}は{猫|ねこ}{派|は}🐱', '{x}, nice! I’m a cat person 🐱', 'いいね〜！{私|わたし}は{猫|ねこ}{派|は}🐱', 'Nice! I’m a cat person 🐱']], go: 'end' },
    end: { b: [['{動物|どうぶつ}って{癒|い}やされるよね〜', 'Animals are so soothing']], end: true } } },
  { id: 'shopping', t: '{買|か}い{物|もの}', en: 'Shopping', n: {
    start: { b: [['{最近|さいきん}なんか{買|か}った？🛍️', 'Bought anything lately? 🛍️']], cap: 'x', o: [['{服|ふく}{買|か}った！', 'Bought clothes!', 'clothes'], ['{新|あたら}しいスマホ', 'A new phone', 'thing'], ['なにも{買|か}ってない', 'Nothing', 'none']], n: 'none', a: 'thing' },
    clothes: { b: [['いいね！どんなの？', 'Nice! What kind?']], o: [['{白|しろ}いシャツ', 'A white shirt', 'clothes2'], ['{黒|くろ}いジャケット', 'A black jacket', 'clothes2'], ['{靴|くつ}も{買|か}った', 'Shoes too', 'clothes2']], a: 'clothes2' },
    clothes2: { b: [['おしゃれ〜！{今度|こんど}{着|き}てるとこ{見|み}せて笑', 'Stylish! Show me you wearing it next time lol']], go: 'where' },
    thing: { b: [['{x}いいな〜！{高|たか}かった？', '{x}, nice! Was it expensive?', 'いいな〜！{高|たか}かった？', 'Nice! Was it expensive?']], y: 'pricey', n: 'cheap', o: [['ちょっと{高|たか}かった', 'A bit pricey', 'pricey'], ['セールで{安|やす}かった！', 'Cheap in a sale!', 'cheap']], a: 'pricey' },
    pricey: { b: [['でもいいもの{買|か}うと{気分|きぶん}あがるよね', 'But buying something good feels great']], go: 'where' },
    cheap: { b: [['セール{最高|さいこう}！ラッキーじゃん', 'Sales are the best! Lucky you']], go: 'where' },
    none: { b: [['{節約|せつやく}えらい笑', 'Saving money, respect lol'], ['{欲|ほ}しいものある？', 'Anything you want?']], cap: 'x', o: [['{新|あたら}しいイヤホン', 'New earphones', 'wish'], ['{旅行|りょこう}したい', 'I want to travel', 'wish'], ['{特|とく}にない', 'Not really', 'end']], a: 'wish' },
    wish: { b: [['{x}いいね〜！{買|か}えるといいね', '{x}, nice! Hope you get it', 'いいね〜！{買|か}えるといいね', 'Nice! Hope you get it']], go: 'end' },
    where: { b: [['ネットで{買|か}う{派|は}？お{店|みせ}{派|は}？', 'Team online or team shops?']], o: [['ネット{派|は}', 'Online', 'end'], ['お{店|みせ}で{見|み}たい', 'I like to see things in the shop', 'end']], a: 'end' },
    end: { b: [['{私|わたし}も{今度|こんど}{買|か}い{物|もの}{行|い}きたいな〜', 'I want to go shopping soon too']], end: true } } },
  { id: 'drama', t: 'ドラマ・{映画|えいが}', en: 'Shows and films', n: {
    start: { b: [['{最近|さいきん}なんか{面白|おもしろ}いドラマ{見|み}た？', 'Seen any good shows lately?']], y: 'yes', n: 'no', o: [['{見|み}たよ！', 'Yes!', 'yes'], ['アニメばっかり', 'Just anime', 'anime'], ['{最近|さいきん}{見|み}てない', 'Haven’t watched anything lately', 'no']], a: 'yes' },
    yes: { b: [['なに{見|み}たの？', 'What did you watch?']], cap: 'x', o: [['{韓国|かんこく}ドラマ', 'A Korean drama', 'genre'], ['{日本|にほん}のドラマ', 'A Japanese drama', 'genre'], ['{海外|かいがい}の{映画|えいが}', 'A foreign film', 'genre']], a: 'genre' },
    genre: { b: [['{x}いいね！どんな{話|はなし}？', '{x}, nice! What’s it about?', 'いいね！どんな{話|はなし}？', 'Nice! What’s it about?']], o: [['{恋愛|れんあい}もの', 'A love story', 'story'], ['ミステリー', 'A mystery', 'story'], ['こわいやつ', 'A scary one', 'scary']], a: 'story' },
    story: { b: [['{気|き}になる〜！{今度|こんど}{見|み}てみる', 'Sounds interesting! I’ll check it out']], go: 'end' },
    scary: { b: [['こわいの{無理|むり}〜😱 {夜|よる}{寝|ね}れなくなる笑', 'I can’t do scary 😱 I wouldn’t sleep lol']], go: 'end' },
    anime: { b: [['アニメいいじゃん！どんなジャンルが{好|す}き？', 'Anime’s great! What genre do you like?']], o: [['バトルもの', 'Action', 'story'], ['{日常系|にちじょうけい}', 'Slice of life', 'story'], ['ラブコメ', 'Romcom', 'story']], a: 'story' },
    no: { b: [['{忙|いそが}しいとなかなか{見|み}れないよね〜', 'When you’re busy you can never find time']], go: 'end' },
    end: { b: [['おすすめあったらまた{教|おし}えて！', 'Tell me if you find something good!']], end: true } } },
  { id: 'games', t: 'ゲーム', en: 'Games', n: {
    start: { b: [['ゲームする？🎮', 'Do you play games? 🎮']], y: 'yes', n: 'no', o: [['する！', 'I do!', 'yes'], ['スマホのゲームだけ', 'Just phone games', 'phone'], ['あんまりしない', 'Not really', 'no']], a: 'yes' },
    yes: { b: [['なにやってるの？', 'What are you playing?']], cap: 'x', o: [['RPG', 'An RPG', 'play'], ['オンラインゲーム', 'An online game', 'play'], ['いろいろ', 'All sorts', 'play']], a: 'play' },
    play: { b: [['{x}いいね！{一日|いちにち}どのくらいやるの？笑', '{x}, nice! How long do you play a day? lol', 'いいね！{一日|いちにち}どのくらいやるの？笑', 'Nice! How long do you play a day? lol']], o: [['1{時間|じかん}くらい', 'About an hour', 'end'], ['{気|き}づいたら{朝|あさ}笑', 'Suddenly it’s morning lol', 'allnight'], ['{週末|しゅうまつ}だけ', 'Only at weekends', 'end']], a: 'end' },
    allnight: { b: [['わかる笑 あと{一回|いっかい}だけ…ってなるやつ', 'I know lol, the “just one more round” thing']], go: 'end' },
    phone: { b: [['スマホのゲームってついやっちゃうよね笑', 'Phone games are so easy to get hooked on lol']], go: 'end' },
    no: { b: [['そっか〜{私|わたし}もそんなにしないかも', 'I see, I don’t play much either']], go: 'end' },
    end: { b: [['{今度|こんど}{一緒|いっしょ}にやろ〜！', 'Let’s play together sometime!']], end: true } } },
  { id: 'birthday', t: '{誕生日|たんじょうび}', en: 'Birthdays', n: {
    start: { b: [['そういえば{誕生日|たんじょうび}いつ？🎂', 'By the way, when’s your birthday? 🎂']], cap: 'x', o: [['3{月|がつ}だよ', 'March', 'when'], ['もうすぐ！', 'Soon!', 'soon'], ['ないしょ笑', 'It’s a secret lol', 'secret']], a: 'when' },
    when: { b: [['おっけー{覚|おぼ}えとく！', 'OK, I’ll remember!'], ['{誕生日|たんじょうび}はいつもなにするの？', 'What do you usually do on your birthday?']], o: [['{家族|かぞく}とごはん', 'Dinner with family', 'party'], ['{友達|ともだち}とパーティー', 'A party with friends', 'party'], ['とくになにも笑', 'Nothing special lol', 'nothing']], a: 'party' },
    soon: { b: [['えっ、もうすぐ！？なにか{欲|ほ}しいものある？', 'What, soon?! Anything you want?']], cap: 'x', o: [['ケーキ！', 'Cake!', 'gift'], ['{新|あたら}しい{服|ふく}', 'New clothes', 'gift'], ['なんでもうれしい', 'I’d be happy with anything', 'gift']], a: 'gift' },
    gift: { b: [['{x}ね、{覚|おぼ}えとく笑', '{x}, got it lol', 'おっけー、{考|かんが}えとく笑', 'OK, I’ll think about it lol']], go: 'end' },
    secret: { b: [['えー{気|き}になる笑 {教|おし}えてよ〜', 'Aw, now I’m curious lol, tell me'], ['{誕生日|たんじょうび}はいつもなにするの？', 'What do you usually do on your birthday?']], o: [['{家族|かぞく}とごはん', 'Dinner with family', 'party'], ['{友達|ともだち}とパーティー', 'A party with friends', 'party'], ['とくになにも笑', 'Nothing special lol', 'nothing']], a: 'party' },
    party: { b: [['いいね〜{楽|たの}しそう🎉', 'Nice, sounds fun 🎉']], go: 'end' },
    nothing: { b: [['じゃあ{今年|ことし}は{私|わたし}がお{祝|いわ}いする！', 'Then this year I’ll celebrate you!']], go: 'end' },
    end: { b: [['{誕生日|たんじょうび}きたらおめでとう{言|い}うね😊', 'I’ll say happy birthday when it comes 😊']], end: true } } },
  { id: 'sick', t: '{体調|たいちょう}', en: 'Feeling unwell', n: {
    start: { b: [['{元気|げんき}？なんか{声|こえ}{疲|つか}れてない？笑', 'You OK? You sound tired lol'], ['{体調|たいちょう}どう？', 'How are you feeling?']], y: 'fine', n: 'bad', o: [['{元気|げんき}だよ！', 'I’m good!', 'fine'], ['ちょっと{風邪|かぜ}ひいた', 'I’ve caught a bit of a cold', 'cold'], ['{頭|あたま}{痛|いた}い…', 'My head hurts…', 'head']], a: 'fine' },
    fine: { b: [['よかった〜！{安心|あんしん}した', 'Phew, good to hear!']], go: 'end' },
    bad: { b: [['えー{大丈夫|だいじょうぶ}？どこか{悪|わる}いの？', 'Oh no, are you OK? What’s wrong?']], o: [['{風邪|かぜ}っぽい', 'Feels like a cold', 'cold'], ['{頭|あたま}が{痛|いた}い', 'Headache', 'head'], ['お{腹|なか}{痛|いた}い', 'Stomach ache', 'stomach']], a: 'cold' },
    cold: { b: [['{風邪|かぜ}か〜😷 {熱|ねつ}ある？', 'A cold 😷 Do you have a fever?']], y: 'fever', n: 'nofever', o: [['ちょっとある', 'A little', 'fever'], ['{熱|ねつ}はない', 'No fever', 'nofever']], a: 'nofever' },
    fever: { b: [['{無理|むり}しないで{今日|きょう}は{休|やす}んで！', 'Don’t push it, rest today!'], ['{病院|びょういん}{行|い}ったほうがいいかも', 'Maybe you should see a doctor']], go: 'end' },
    nofever: { b: [['ならよかった。あったかくして{寝|ね}てね', 'Good. Keep warm and get some sleep']], go: 'end' },
    head: { b: [['{頭痛|ずつう}つらいよね…{薬|くすり}{飲|の}んだ？', 'Headaches are the worst… did you take something?']], y: 'med', n: 'nomed', o: [['{飲|の}んだ', 'I did', 'med'], ['まだ', 'Not yet', 'nomed']], a: 'med' },
    stomach: { b: [['えー{心配|しんぱい}…{何|なに}か{変|へん}なもの{食|た}べた？', 'Oh no… did you eat something bad?']], o: [['{食|た}べすぎたかも笑', 'Maybe I ate too much lol', 'med'], ['わかんない', 'No idea', 'nomed']], a: 'med' },
    med: { b: [['ゆっくり{休|やす}んでね', 'Take it easy']], go: 'end' },
    nomed: { b: [['{無理|むり}しないでね、{水|みず}もちゃんと{飲|の}んで！', 'Don’t push yourself, and drink some water!']], go: 'end' },
    end: { b: [['お{大事|だいじ}にね🍀', 'Get well soon 🍀']], end: true } } },
  { id: 'exam', t: 'テスト・{勉強|べんきょう}', en: 'Tests and studying', n: {
    start: { b: [['ねえ、{最近|さいきん}テストとかある？📚', 'Hey, any tests coming up? 📚']], y: 'yes', n: 'no', o: [['{来週|らいしゅう}ある…', 'Next week…', 'soon'], ['JLPT{受|う}けるよ！', 'I’m taking the JLPT!', 'jlpt'], ['{特|とく}にない', 'Not really', 'no']], a: 'soon' },
    yes: { b: [['いつ？', 'When?']], o: [['{来週|らいしゅう}', 'Next week', 'soon'], ['{来月|らいげつ}', 'Next month', 'soon']], a: 'soon' },
    soon: { b: [['うわ〜がんばって！{勉強|べんきょう}してる？', 'Ah, good luck! Are you studying?']], y: 'study', n: 'nostudy', o: [['{毎日|まいにち}してる', 'Every day', 'study'], ['まだ{全然|ぜんぜん}…', 'Not at all yet…', 'nostudy']], a: 'study' },
    jlpt: { b: [['すごい！{何級|なんきゅう}{受|う}けるの？', 'Amazing! Which level?']], cap: 'x', o: [['N5', 'N5', 'level'], ['N4', 'N4', 'level'], ['N3', 'N3', 'level']], a: 'level' },
    level: { b: [['{x}かぁ！{絶対|ぜったい}{受|う}かるよ〜💪', '{x}! You’ll definitely pass 💪', '{絶対|ぜったい}{受|う}かるよ〜💪', 'You’ll definitely pass 💪'], ['{勉強|べんきょう}はどう？', 'How’s the studying going?']], o: [['{漢字|かんじ}が{難|むずか}しい', 'Kanji is hard', 'kanji'], ['{文法|ぶんぽう}がやばい笑', 'Grammar’s a nightmare lol', 'grammar'], ['{順調|じゅんちょう}だよ', 'It’s going well', 'study']], a: 'study' },
    kanji: { b: [['{漢字|かんじ}は{日本人|にほんじん}も{忘|わす}れるから{大丈夫|だいじょうぶ}笑', 'Even Japanese people forget kanji, you’re fine lol']], go: 'end' },
    grammar: { b: [['{文法|ぶんぽう}むずいよね〜でも{毎日|まいにち}ちょっとずつだよ！', 'Grammar’s tough, but a little every day!']], go: 'end' },
    study: { b: [['えらい！その{調子|ちょうし}👏', 'Great, keep it up 👏']], go: 'end' },
    nostudy: { b: [['まだ{間|ま}に{合|あ}う！{今日|きょう}から{一緒|いっしょ}にがんばろ', 'There’s still time! Let’s start today together']], go: 'end' },
    no: { b: [['いいな〜{自由|じゆう}だね笑', 'Lucky, you’re free lol']], go: 'end' },
    end: { b: [['{応援|おうえん}してる📣', 'I’m rooting for you 📣']], end: true } } },
  { id: 'baito', t: 'バイト', en: 'Part-time jobs', n: {
    start: { b: [['{今日|きょう}バイトだった〜疲れた😮‍💨', 'Had my part-time job today, so tired 😮‍💨'], ['バイトとかしてる？', 'Do you have a part-time job or anything?']], y: 'yes', n: 'no', o: [['してるよ！', 'I do!', 'yes'], ['{普通|ふつう}に{働|はたら}いてる', 'I work full-time', 'job'], ['してない', 'No', 'no']], a: 'yes' },
    yes: { b: [['なんのバイト？', 'What kind?']], cap: 'x', o: [['カフェ', 'At a café', 'what'], ['コンビニ', 'At a konbini', 'what'], ['{塾|じゅく}の{先生|せんせい}', 'Teaching at a cram school', 'what']], a: 'what' },
    what: { b: [['{x}いいね！{楽|たの}しい？', '{x}, nice! Is it fun?', 'いいね！{楽|たの}しい？', 'Nice! Is it fun?']], y: 'fun', n: 'hard', o: [['{楽|たの}しいよ', 'It’s fun', 'fun'], ['{大変|たいへん}…', 'It’s tough…', 'hard']], a: 'fun' },
    fun: { b: [['いいな〜{職場|しょくば}の{人|ひと}がいいと{楽|たの}しいよね', 'Nice, it’s fun when the people are good']], go: 'end' },
    hard: { b: [['わかる…{私|わたし}もお{客|きゃく}さん{多|おお}い{日|ひ}は{死|し}ぬ笑', 'I know… on busy days I’m dead lol']], go: 'end' },
    job: { b: [['{社会人|しゃかいじん}だ！おつかれさまです笑', 'A working adult! Respect lol'], ['{仕事|しごと}{忙|いそが}しい？', 'Is work busy?']], y: 'hard', n: 'fun', o: [['{忙|いそが}しい…', 'Busy…', 'hard'], ['そうでもない', 'Not really', 'fun']], a: 'hard' },
    no: { b: [['そうなんだ！{勉強|べんきょう}に{集中|しゅうちゅう}できていいね', 'I see! Good, you can focus on studying']], go: 'end' },
    end: { b: [['お{互|たが}いがんばろ〜💪', 'Let’s both hang in there 💪']], end: true } } },
  { id: 'cooking', t: '{料理|りょうり}', en: 'Cooking', n: {
    start: { b: [['{料理|りょうり}する？🍳', 'Do you cook? 🍳']], y: 'yes', n: 'no', o: [['よくする！', 'Often!', 'yes'], ['たまに', 'Sometimes', 'yes'], ['{全然|ぜんぜん}しない笑', 'Never lol', 'no']], a: 'yes' },
    yes: { b: [['すごい！{得意|とくい}な{料理|りょうり}なに？', 'Nice! What’s your best dish?']], cap: 'x', o: [['カレー', 'Curry', 'dish'], ['パスタ', 'Pasta', 'dish'], ['{卵焼|たまごや}き', 'Rolled omelette', 'dish']], a: 'dish' },
    dish: { b: [['{x}おいしそう〜！{今度|こんど}{作|つく}ってよ笑', '{x} sounds delicious! Make me some next time lol', 'おいしそう〜！{今度|こんど}{作|つく}ってよ笑', 'Sounds delicious! Make me some next time lol']], o: [['いいよ！', 'Sure!', 'end'], ['{自信|じしん}ない笑', 'Not confident lol', 'end']], a: 'end' },
    no: { b: [['わかる笑 {外食|がいしょく}かコンビニ{派|は}？', 'Same lol. Team eating out or team konbini?']], o: [['コンビニ{派|は}', 'Konbini', 'konbini'], ['{外食|がいしょく}が{多|おお}い', 'I eat out a lot', 'out']], a: 'konbini' },
    konbini: { b: [['コンビニ{最強|さいきょう}だよね笑 おにぎりなに{派|は}？', 'Konbini are the best lol. Which onigiri?']], o: [['ツナマヨ', 'Tuna mayo', 'end'], ['{鮭|さけ}', 'Salmon', 'end'], ['{梅|うめ}', 'Pickled plum', 'end']], a: 'end' },
    out: { b: [['いいな〜お{金|かね}かかるけど{楽|らく}だよね', 'Nice, costs money but it’s easy']], go: 'end' },
    end: { b: [['お{腹|なか}すいてきた笑', 'Now I’m hungry lol']], end: true } } },
  { id: 'holiday', t: '{休|やす}み・{連休|れんきゅう}', en: 'Days off and holidays', n: {
    start: { b: [['{次|つぎ}の{連休|れんきゅう}なにするの？', 'What are you doing over the next long weekend?']], cap: 'x', o: [['{旅行|りょこう}に{行|い}く！', 'Going on a trip!', 'trip'], ['{実家|じっか}に{帰|かえ}る', 'Going back to my parents’ place', 'home'], ['{家|いえ}でゆっくりする', 'Relaxing at home', 'relax']], a: 'relax' },
    trip: { b: [['いいな〜！どこ{行|い}くの？', 'Lucky! Where to?']], cap: 'x', o: [['{海|うみ}', 'The beach', 'trip2'], ['{山|やま}', 'The mountains', 'trip2'], ['{海外|かいがい}！', 'Abroad!', 'trip2']], a: 'trip2' },
    trip2: { b: [['{x}いいね〜！お{土産|みやげ}よろしく笑', '{x}, nice! Bring me a souvenir lol', 'いいね〜！お{土産|みやげ}よろしく笑', 'Nice! Bring me a souvenir lol']], o: [['まかせて！', 'Leave it to me!', 'end'], ['{考|かんが}えとく笑', 'I’ll think about it lol', 'end']], a: 'end' },
    home: { b: [['{家族|かぞく}に{会|あ}えるのいいね😊', 'Nice that you get to see your family 😊']], go: 'end' },
    relax: { b: [['それが{一番|いちばん}{最高|さいこう}だよ笑', 'That’s honestly the best lol']], go: 'end' },
    end: { b: [['{休|やす}み{楽|たの}しんでね〜✨', 'Enjoy your time off ✨']], end: true } } },
  { id: 'season', t: '{季節|きせつ}', en: 'Seasons', n: {
    start: { b: [['{季節|きせつ}でいつが{一番|いちばん}{好|す}き？', 'Which season do you like best?']], o: [['{春|はる}！', 'Spring!', 'spring'], ['{夏|なつ}', 'Summer', 'summer'], ['{秋|あき}', 'Autumn', 'autumn'], ['{冬|ふゆ}', 'Winter', 'winter']], a: 'spring' },
    spring: { b: [['{春|はる}いいよね🌸 {日本|にほん}だとお{花見|はなみ}するよ', 'Spring’s lovely 🌸 In Japan we do hanami'], ['お{花見|はなみ}したことある？', 'Ever done hanami?']], y: 'did', n: 'didnt', o: [['ある！', 'Yes!', 'did'], ['ない、してみたい', 'No, I’d love to', 'didnt']], a: 'didnt' },
    summer: { b: [['{夏|なつ}といえば{花火|はなび}とお{祭|まつ}り🎆', 'Summer means fireworks and festivals 🎆'], ['{浴衣|ゆかた}{着|き}てみたくない？', 'Wouldn’t you love to wear a yukata?']], y: 'did', n: 'didnt', o: [['{着|き}てみたい！', 'I’d love to!', 'didnt'], ['{着|き}たことある', 'I have before', 'did']], a: 'didnt' },
    autumn: { b: [['わかる〜{秋|あき}はごはんがおいしい笑🍠', 'Same, food is so good in autumn lol 🍠'], ['{紅葉|こうよう}{見|み}たことある？', 'Ever seen the autumn leaves?']], y: 'did', n: 'didnt', o: [['ある！きれいだった', 'Yes! It was beautiful', 'did'], ['ない', 'No', 'didnt']], a: 'didnt' },
    winter: { b: [['{冬|ふゆ}{派|は}めずらしい！{雪|ゆき}{好|す}き？⛄', 'Team winter, that’s rare! Do you like snow? ⛄']], y: 'did', n: 'didnt', o: [['{好|す}き！', 'I love it!', 'did'], ['{寒|さむ}いのは{苦手|にがて}笑', 'I’m not great with cold lol', 'didnt']], a: 'did' },
    did: { b: [['いいね〜！{楽|たの}しいよね', 'Nice! It’s fun, right?']], go: 'end' },
    didnt: { b: [['{日本|にほん}{来|き}たら{一緒|いっしょ}にしよ！', 'Let’s do it together when you come to Japan!']], go: 'end' },
    end: { b: [['{季節|きせつ}ごとに{楽|たの}しみがあるのいいよね', 'It’s nice that every season has something to look forward to']], end: true } } },
  { id: 'commute', t: '{電車|でんしゃ}・{通勤|つうきん}', en: 'Getting around', n: {
    start: { b: [['{学校|がっこう}とか{仕事|しごと}まで{何|なに}で{行|い}ってるの？', 'How do you get to school or work?']], o: [['{電車|でんしゃ}', 'By train', 'train'], ['{車|くるま}', 'By car', 'car'], ['{歩|ある}いて', 'On foot', 'walk']], a: 'train' },
    train: { b: [['{電車|でんしゃ}か〜！{混|こ}んでる？', 'The train! Is it crowded?']], y: 'packed', n: 'empty', o: [['めっちゃ{混|こ}んでる😭', 'Super crowded 😭', 'packed'], ['{座|すわ}れるよ', 'I can get a seat', 'empty']], a: 'packed' },
    packed: { b: [['わかる、{東京|とうきょう}の{朝|あさ}の{電車|でんしゃ}{地獄|じごく}だよ笑', 'I know, Tokyo trains in the morning are hell lol']], go: 'time' },
    empty: { b: [['いいな〜{座|すわ}れるの{最高|さいこう}', 'Lucky, getting a seat is the best']], go: 'time' },
    car: { b: [['{車|くるま}いいね！{運転|うんてん}{好|す}き？', 'A car, nice! Do you like driving?']], y: 'time', n: 'time', o: [['{好|す}き！', 'I do!', 'time'], ['{渋滞|じゅうたい}がいや笑', 'I hate the traffic lol', 'time']], a: 'time' },
    walk: { b: [['{近|ちか}いのいいな〜！{健康的|けんこうてき}じゃん', 'Lucky it’s close! Healthy too']], go: 'time' },
    time: { b: [['どのくらいかかるの？', 'How long does it take?']], o: [['10{分|ぷん}くらい', 'About 10 minutes', 'end'], ['1{時間|じかん}…', 'An hour…', 'long'], ['30{分|ぷん}くらい', 'About 30 minutes', 'end']], a: 'end' },
    long: { b: [['{遠|とお}っ！{毎日|まいにち}おつかれ…', 'That’s far! Respect for doing it every day…']], go: 'end' },
    end: { b: [['{移動中|いどうちゅう}に{日本語|にほんご}の{勉強|べんきょう}できるね笑', 'You can study Japanese on the way lol']], end: true } } },
  { id: 'stress', t: '{疲|つか}れた・ストレス', en: 'Feeling tired or stressed', n: {
    start: { b: [['{今日|きょう}どうだった？', 'How was today?']], o: [['{疲|つか}れた〜', 'Exhausting', 'tired'], ['ストレスやばい', 'So stressed', 'stress'], ['いい{日|ひ}だった！', 'A good day!', 'good']], a: 'tired' },
    tired: { b: [['おつかれさま〜😢 {何|なに}かあった？', 'You poor thing 😢 Did something happen?']], o: [['{仕事|しごと}が{多|おお}すぎて', 'Too much work', 'work'], ['{寝不足|ねぶそく}', 'Not enough sleep', 'sleep'], ['なんとなく', 'Not sure why', 'relax']], a: 'relax' },
    stress: { b: [['えー{大丈夫|だいじょうぶ}？{話|はなし}{聞|き}くよ', 'Oh no, are you OK? I’m listening']], o: [['{仕事|しごと}が{大変|たいへん}', 'Work is rough', 'work'], ['{人間関係|にんげんかんけい}', 'People stuff', 'people'], ['ありがとう', 'Thank you', 'relax']], a: 'relax' },
    work: { b: [['それはしんどいね…{無理|むり}しすぎないでね', 'That sounds rough… don’t push yourself too hard']], go: 'relax' },
    sleep: { b: [['{寝不足|ねぶそく}はつらいよね、{今日|きょう}は{早|はや}く{寝|ね}よ', 'Lack of sleep is the worst, go to bed early today']], go: 'relax' },
    people: { b: [['{人間関係|にんげんかんけい}が{一番|いちばん}{疲|つか}れるよね…', 'People stuff is the most tiring…']], go: 'relax' },
    relax: { b: [['ストレス{解消法|かいしょうほう}とかある？', 'Got any ways to de-stress?']], cap: 'x', o: [['{音楽|おんがく}{聞|き}く', 'Listen to music', 'way'], ['{寝|ね}る笑', 'Sleep lol', 'way'], ['{甘|あま}いもの{食|た}べる', 'Eat something sweet', 'way']], a: 'way' },
    way: { b: [['いいね！{今日|きょう}はそれしよ', 'Nice! Do that today']], go: 'end' },
    good: { b: [['えーいいじゃん！なにがあったの？', 'Aw, nice! What happened?']], o: [['{仕事|しごと}がうまくいった', 'Work went well', 'yay'], ['おいしいもの{食|た}べた', 'Ate something good', 'yay'], ['なんとなく', 'Just because', 'yay']], a: 'yay' },
    yay: { b: [['よかったね〜！{私|わたし}までうれしい😊', 'That’s great! Now I’m happy too 😊']], go: 'end' },
    end: { b: [['いつでも{話|はな}してね🍀', 'Talk to me any time 🍀']], end: true } } },
  { id: 'sns', t: 'スマホ・SNS', en: 'Phones and social media', n: {
    start: { b: [['インスタとかやってる？📱', 'Are you on Instagram or anything? 📱']], y: 'yes', n: 'no', o: [['やってるよ！', 'I am!', 'yes'], ['{見|み}るだけ', 'I just look', 'look'], ['やってない', 'No', 'no']], a: 'yes' },
    yes: { b: [['なに{載|の}せてるの？', 'What do you post?']], o: [['ごはんの{写真|しゃしん}', 'Food photos', 'post'], ['{旅行|りょこう}の{写真|しゃしん}', 'Travel photos', 'post'], ['あんまり{載|の}せない', 'I don’t post much', 'look']], a: 'post' },
    post: { b: [['いいね〜{今度|こんど}フォローさせて笑', 'Nice, let me follow you sometime lol']], go: 'time' },
    look: { b: [['わかる、{見|み}る{専|せん}{多|おお}いよね笑', 'Same, lots of people just scroll lol']], go: 'time' },
    no: { b: [['えらい！スマホ{見|み}すぎない？', 'Good for you! Do you not overuse your phone?']], go: 'time' },
    time: { b: [['{一日|いちにち}どのくらいスマホ{見|み}てる？笑', 'How long are you on your phone a day? lol']], o: [['2{時間|じかん}くらい', 'About 2 hours', 'end'], ['{言|い}いたくない笑', 'Don’t want to say lol', 'lots'], ['ずっと笑', 'All the time lol', 'lots']], a: 'end' },
    lots: { b: [['{私|わたし}も笑 {気|き}をつけよ〜', 'Me too lol, let’s be careful']], go: 'end' },
    end: { b: [['{日本語|にほんご}のアカウントフォローすると{勉強|べんきょう}になるよ！', 'Following Japanese accounts helps you study!']], end: true } } },
  { id: 'dinner', t: '{晩|ばん}ごはん', en: 'What’s for dinner', n: {
    start: { b: [['{今日|きょう}の{晩|ばん}ごはんなに？', 'What’s for dinner tonight?']], cap: 'x', o: [['まだ{決|き}めてない', 'Haven’t decided', 'undecided'], ['カレー！', 'Curry!', 'menu'], ['{外|そと}で{食|た}べる', 'Eating out', 'out']], a: 'menu' },
    menu: { b: [['{x}いいな〜！{自分|じぶん}で{作|つく}るの？', '{x}, nice! Are you making it yourself?', 'いいな〜！{自分|じぶん}で{作|つく}るの？', 'Nice! Are you making it yourself?']], y: 'make', n: 'buy', o: [['{作|つく}る！', 'Yep!', 'make'], ['{買|か}ってきた笑', 'I bought it lol', 'buy']], a: 'make' },
    make: { b: [['えらすぎ！{料理|りょうり}できる{人|ひと}{尊敬|そんけい}する', 'So impressive! I respect people who can cook']], go: 'end' },
    buy: { b: [['それが{一番|いちばん}{楽|らく}だよね笑', 'That’s the easiest lol']], go: 'end' },
    undecided: { b: [['じゃあ{一緒|いっしょ}に{考|かんが}えよ！{何系|なにけい}の{気分|きぶん}？', 'Let’s decide together! What are you in the mood for?']], o: [['{和食|わしょく}', 'Japanese', 'idea'], ['がっつり{肉|にく}', 'Something meaty', 'idea'], ['{軽|かる}いもの', 'Something light', 'idea']], a: 'idea' },
    idea: { b: [['いいね！{決|き}まったら{教|おし}えて笑', 'Nice! Tell me when you decide lol']], go: 'end' },
    out: { b: [['いいな〜！どこ{行|い}くの？', 'Lucky! Where are you going?']], o: [['ラーメン{屋|や}', 'A ramen shop', 'end'], ['{焼肉|やきにく}', 'Yakiniku', 'end'], ['ファミレス', 'A family restaurant', 'end']], a: 'end' },
    end: { b: [['おいしく{食|た}べてね〜😋', 'Enjoy your dinner 😋']], end: true } } },
  { id: 'late', t: '{遅刻|ちこく}・ごめん', en: 'Running late, apologising', n: {
    start: { b: [['ごめん！ちょっと{遅|おく}れる🙏', 'Sorry! I’m running a bit late 🙏']], o: [['{大丈夫|だいじょうぶ}だよ', 'No worries', 'ok'], ['どのくらい？', 'How late?', 'how'], ['{待|ま}ってるね', 'I’ll wait', 'ok']], a: 'ok' },
    how: { b: [['10{分|ぷん}くらい…ほんとごめん😭', 'About 10 minutes… really sorry 😭']], o: [['{大丈夫|だいじょうぶ}、ゆっくりでいいよ', 'It’s fine, take your time', 'ok'], ['カフェで{待|ま}ってる', 'I’ll wait in a café', 'cafe']], a: 'ok' },
    ok: { b: [['ありがとう〜{優|やさ}しい🥺', 'Thank you, you’re so kind 🥺'], ['{電車|でんしゃ}{遅|おく}れちゃって…', 'The train was delayed…']], o: [['よくあるよね', 'It happens a lot', 'end'], ['{気|き}をつけて{来|き}てね', 'Get here safely', 'end']], a: 'end' },
    cafe: { b: [['ありがとう！{着|つ}いたら{連絡|れんらく}する', 'Thanks! I’ll message you when I get there']], go: 'end' },
    end: { b: [['{着|つ}いた！どこにいる？', 'I’m here! Where are you?']], end: true } } },
  { id: 'home', t: '{住|す}んでるところ', en: 'Where you live', n: {
    start: { b: [['{住|す}んでるとこってどんな{感|かん}じ？', 'What’s the place you live like?']], o: [['{都会|とかい}だよ', 'It’s a city', 'city'], ['{田舎|いなか}', 'The countryside', 'country'], ['{海|うみ}の{近|ちか}く', 'Near the sea', 'sea']], a: 'city' },
    city: { b: [['{便利|べんり}でいいね！{家|いえ}の{近|ちか}くになにがある？', 'Convenient! What’s near your place?']], cap: 'x', o: [['スーパー', 'A supermarket', 'near'], ['{大|おお}きい{公園|こうえん}', 'A big park', 'near'], ['カフェがいっぱい', 'Lots of cafés', 'near']], a: 'near' },
    near: { b: [['{x}いいな〜！{住|す}みやすそう', '{x}, nice! Sounds easy to live in', 'いいな〜！{住|す}みやすそう', 'Nice! Sounds easy to live in']], go: 'room' },
    country: { b: [['{田舎|いなか}いいな〜{空気|くうき}おいしそう', 'The countryside, nice! The air must be fresh'], ['{静|しず}かでいいよね', 'It must be peaceful']], go: 'room' },
    sea: { b: [['{海|うみ}{近|ちか}いの{最高|さいこう}じゃん！🌊', 'Living near the sea is the best! 🌊']], go: 'room' },
    room: { b: [['{部屋|へや}は{広|ひろ}い？', 'Is your room big?']], y: 'big', n: 'small', o: [['{結構|けっこう}{広|ひろ}い', 'Pretty big', 'big'], ['せまい笑', 'Tiny lol', 'small']], a: 'small' },
    big: { b: [['いいな〜！{東京|とうきょう}の{部屋|へや}はせまいよ笑', 'Lucky! Tokyo rooms are tiny lol']], go: 'end' },
    small: { b: [['わかる笑 {私|わたし}の{部屋|へや}もめっちゃせまい', 'Same lol, my room’s really tiny too']], go: 'end' },
    end: { b: [['いつか{遊|あそ}びに{行|い}きたいな〜', 'I’d love to visit someday']], end: true } } },
  { id: 'sports', t: 'スポーツ', en: 'Watching sports', n: {
    start: { b: [['スポーツ{見|み}る？⚽', 'Do you watch sports? ⚽']], y: 'yes', n: 'no', o: [['サッカー{見|み}る！', 'I watch football!', 'which'], ['{野球|やきゅう}', 'Baseball', 'which'], ['{見|み}ない', 'I don’t', 'no']], a: 'yes' },
    yes: { b: [['なに{見|み}るの？', 'Which sport?']], cap: 'x', o: [['サッカー', 'Football', 'which'], ['バスケ', 'Basketball', 'which'], ['テニス', 'Tennis', 'which']], a: 'which' },
    which: { b: [['いいね！{好|す}きなチームとかある？', 'Nice! Got a favourite team?']], y: 'team', n: 'noteam', o: [['あるよ！', 'Yes!', 'team'], ['{特|とく}にない', 'Not really', 'noteam']], a: 'team' },
    team: { b: [['{試合|しあい}の{日|ひ}はテンション{上|あ}がるよね笑', 'Match days must get you hyped lol']], go: 'end' },
    noteam: { b: [['{見|み}るだけでも{楽|たの}しいよね', 'It’s fun just to watch']], go: 'end' },
    no: { b: [['そっか〜{私|わたし}もオリンピックくらいしか{見|み}ないかも笑', 'I see, I only really watch the Olympics lol']], go: 'end' },
    end: { b: [['{今度|こんど}{一緒|いっしょ}に{見|み}よ〜！', 'Let’s watch together sometime!']], end: true } } },
  { id: 'manga', t: '{漫画|まんが}・{本|ほん}', en: 'Manga and books', n: {
    start: { b: [['{漫画|まんが}{読|よ}む？📖', 'Do you read manga? 📖']], y: 'yes', n: 'books', o: [['{読|よ}む！', 'I do!', 'yes'], ['{本|ほん}のほうが{好|す}き', 'I prefer books', 'books'], ['あんまり', 'Not much', 'no']], a: 'yes' },
    yes: { b: [['{日本語|にほんご}で{読|よ}んでるの？', 'Do you read them in Japanese?']], y: 'jp', n: 'en', o: [['{頑張|がんば}って{読|よ}んでる', 'I’m trying!', 'jp'], ['{英語|えいご}で{読|よ}んでる', 'In English', 'en']], a: 'en' },
    jp: { b: [['すごっ！ふりがなあると{読|よ}みやすいよね', 'Wow! Furigana makes it easier, right?']], go: 'end' },
    en: { b: [['{今度|こんど}{日本語|にほんご}で{読|よ}んでみなよ！{勉強|べんきょう}になるよ', 'Try one in Japanese sometime! Great practice']], go: 'end' },
    books: { b: [['{本|ほん}{好|す}きなんだ！どんなの{読|よ}むの？', 'You like books! What kind?']], o: [['{小説|しょうせつ}', 'Novels', 'end'], ['ビジネス{書|しょ}', 'Business books', 'end'], ['いろいろ', 'All sorts', 'end']], a: 'end' },
    no: { b: [['そっか〜{読|よ}みたくなったらおすすめ{教|おし}えるね', 'I see, I’ll recommend some if you ever want to']], go: 'end' },
    end: { b: [['{本屋|ほんや}さん{行|い}きたくなってきた笑', 'Now I want to go to a bookshop lol']], end: true } } },
  { id: 'future', t: '{将来|しょうらい}・{夢|ゆめ}', en: 'Dreams and the future', n: {
    start: { b: [['ねえ、{将来|しょうらい}の{夢|ゆめ}とかある？✨', 'Hey, do you have any dreams for the future? ✨']], cap: 'x', o: [['{日本|にほん}で{働|はたら}きたい', 'I want to work in Japan', 'japan'], ['{世界中|せかいじゅう}を{旅行|りょこう}したい', 'I want to travel the world', 'travel'], ['まだわかんない', 'Don’t know yet', 'unsure']], a: 'dream' },
    japan: { b: [['えー{素敵|すてき}！{日本|にほん}{来|き}たら{絶対|ぜったい}{会|あ}おうね', 'That’s lovely! We have to meet when you come'], ['どんな{仕事|しごと}したい？', 'What kind of work?']], cap: 'x', o: [['IT', 'IT', 'dream'], ['{通訳|つうやく}', 'Interpreting', 'dream'], ['なんでもいい笑', 'Anything lol', 'dream']], a: 'dream' },
    travel: { b: [['いいね！{最初|さいしょ}はどこ{行|い}きたい？', 'Nice! Where first?']], cap: 'x', o: [['{日本|にほん}！', 'Japan!', 'dream'], ['ヨーロッパ', 'Europe', 'dream']], a: 'dream' },
    dream: { b: [['{x}いいじゃん！{応援|おうえん}してる📣', '{x}, love it! I’m rooting for you 📣', 'いいじゃん！{応援|おうえん}してる📣', 'Love it! I’m rooting for you 📣']], go: 'end' },
    unsure: { b: [['{大丈夫|だいじょうぶ}、{私|わたし}もまだわかんない笑', 'It’s fine, I don’t know yet either lol']], go: 'end' },
    end: { b: [['お{互|たが}い{夢|ゆめ}かなえようね✨', 'Let’s both make our dreams come true ✨']], end: true } } },
  { id: 'gift', t: 'お{土産|みやげ}・ありがとう', en: 'Gifts and thanks', n: {
    start: { b: [['この{前|まえ}はありがとう！めっちゃうれしかった😊', 'Thanks for the other day! It made me so happy 😊']], o: [['どういたしまして！', 'You’re welcome!', 'welcome'], ['こちらこそ！', 'Thank you too!', 'welcome'], ['え、なんのこと？笑', 'Huh, for what? lol', 'what']], a: 'welcome' },
    what: { b: [['お{土産|みやげ}くれたじゃん！笑', 'You gave me a souvenir! lol']], go: 'welcome' },
    welcome: { b: [['お{礼|れい}になにかしたいな〜', 'I want to do something to thank you'], ['なにか{欲|ほ}しいものある？', 'Anything you’d like?']], cap: 'x', o: [['{気|き}にしないで！', 'Don’t worry about it!', 'end'], ['じゃあごはんおごって笑', 'Then buy me dinner lol', 'treat'], ['{日本|にほん}のお{菓子|かし}！', 'Japanese snacks!', 'snack']], a: 'end' },
    treat: { b: [['おっけー！どこがいい？笑', 'Deal! Where do you want to go? lol']], go: 'end' },
    snack: { b: [['まかせて！おいしいの{送|おく}るね🍫', 'Leave it to me! I’ll send you some good ones 🍫']], go: 'end' },
    end: { b: [['ほんとにありがとね〜😊', 'Thanks so much 😊']], end: true } } },
  { id: 'learn', t: '{日本語|にほんご}の{勉強|べんきょう}', en: 'Learning Japanese', n: {
    start: { b: [['{日本語|にほんご}の{勉強|べんきょう}どう？', 'How’s your Japanese study going?']], o: [['{楽|たの}しい！', 'It’s fun!', 'fun'], ['{難|むずか}しい…', 'It’s hard…', 'hard'], ['まあまあかな', 'So-so', 'hard']], a: 'hard' },
    fun: { b: [['いいね〜！{楽|たの}しいのが{一番|いちばん}', 'Nice! Having fun is the main thing'], ['{何|なに}が{一番|いちばん}{難|むずか}しい？', 'What’s the hardest part?']], o: [['{漢字|かんじ}', 'Kanji', 'kanji'], ['{敬語|けいご}', 'Polite language', 'keigo'], ['{聞|き}き{取|と}り', 'Listening', 'listen']], a: 'kanji' },
    hard: { b: [['わかる、{日本語|にほんご}むずいよね😂', 'I know, Japanese is tough 😂'], ['{何|なに}が{一番|いちばん}{難|むずか}しい？', 'What’s the hardest part?']], o: [['{漢字|かんじ}', 'Kanji', 'kanji'], ['{敬語|けいご}', 'Polite language', 'keigo'], ['{聞|き}き{取|と}り', 'Listening', 'listen']], a: 'kanji' },
    kanji: { b: [['{漢字|かんじ}は{毎日|まいにち}ちょっとずつがいいよ！', 'Kanji is best a little every day!']], go: 'end' },
    keigo: { b: [['{敬語|けいご}は{日本人|にほんじん}も{間違|まちが}えるから{大丈夫|だいじょうぶ}笑', 'Even Japanese people get keigo wrong, you’re fine lol']], go: 'end' },
    listen: { b: [['アニメとかドラマ{見|み}ると{耳|みみ}が{慣|な}れるよ', 'Watching anime or dramas gets your ears used to it']], go: 'end' },
    end: { b: [['{今|いま}こうやってチャットできてるのすごいよ👏', 'You’re chatting like this right now, that’s amazing 👏']], end: true } } },
  { id: 'night', t: 'おやすみ', en: 'Saying good night', n: {
    start: { b: [['そろそろ{寝|ね}る？', 'Going to bed soon?']], y: 'yes', n: 'no', o: [['うん、{眠|ねむ}い', 'Yeah, I’m sleepy', 'yes'], ['まだ{起|お}きてる', 'I’m still up', 'no']], a: 'yes' },
    yes: { b: [['{明日|あした}{早|はや}いの？', 'Early start tomorrow?']], y: 'early', n: 'free', o: [['うん、{早|はや}い', 'Yeah, early', 'early'], ['{休|やす}み！', 'Day off!', 'free']], a: 'early' },
    early: { b: [['じゃあ{早|はや}く{寝|ね}なきゃ！', 'Then you’d better sleep!']], go: 'end' },
    free: { b: [['いいな〜ゆっくり{寝|ね}れるね', 'Lucky, you can sleep in']], go: 'end' },
    no: { b: [['{夜|よる}ふかしはほどほどにね笑', 'Don’t stay up too late lol'], ['なにしてるの？', 'What are you doing?']], o: [['{日本語|にほんご}の{勉強|べんきょう}', 'Studying Japanese', 'study'], ['{動画|どうが}{見|み}てる', 'Watching videos', 'end']], a: 'end' },
    study: { b: [['こんな{時間|じかん}まで{勉強|べんきょう}えらすぎ！', 'Studying this late, so impressive!']], go: 'end' },
    end: { b: [['おやすみ〜🌙 また{明日|あした}ね', 'Good night 🌙 See you tomorrow']], end: true } } }
);
/* groups for the topic picker */
const OFF_GROUPS = [['Everyday', ['intro', 'weather', 'morning', 'dinner', 'food', 'day', 'commute', 'night']], ['People', ['family', 'pets', 'home', 'birthday', 'gift', 'late']], ['Free time', ['weekend', 'hobby', 'drama', 'games', 'manga', 'sports', 'sns', 'shopping', 'cooking', 'gym']], ['Plans and travel', ['plans', 'holiday', 'japan', 'season']], ['Study and work', ['learn', 'exam', 'baito', 'future']], ['Feelings', ['stress', 'sick']]];


