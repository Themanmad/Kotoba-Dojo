/* =====================================================================
   CHAT: practise typing Japanese with a friend who texts like Japanese people really do
   (casual forms, dropped particles, 笑/w, emoji, まじ/やばい/それな), not textbook Japanese.
   It runs on Claude through the learner's own Anthropic API key: the key stays in this
   browser and messages go straight from the browser to Anthropic. Nothing passes through the site.
   Each reply comes with furigana, an English translation on tap, new words to save, and a gentle
   "more natural" suggestion when the learner's own message was off.
   ===================================================================== */
const CHAT_PEOPLE = {
  friend: { name: 'ゆい', av: '🌸', who: 'Yui, 22, a university student in Tokyo', how: 'casual タメ口 like close friends on LINE' },
  polite: { name: 'けんた', av: '🍙', who: 'Kenta, 27, an office worker in Yokohama you met recently', how: 'friendly light です/ます the way people text a newer acquaintance, relaxed and natural, never stiff' },
  kansai: { name: 'あかり', av: '🐙', who: 'Akari, 24, works at a café in Osaka', how: 'casual Kansai-ben (やん, めっちゃ, ほんま, 〜へん, 〜やで, なんでやねん) like close friends on LINE' }
};
const CHAT_MODELS = [['claude-haiku-5-5', 'Claude Haiku 5.5', 'Fast and cheapest'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5', 'More natural, costs more']];
const chatCfg = () => Object.assign({ model: 'claude-haiku-5-5', who: 'friend', mode: 'free' }, store.get('chatcfg', {}));
const chatMode = () => chatCfg().mode === 'ai' ? 'ai' : 'free';
const CHAT = { msgs: store.get(chatMode() === 'ai' ? 'chat' : 'chatfree', []), busy: false, err: '', setup: false, en: {}, roma: false };
const chatKeyGet = () => { try { return localStorage.getItem('kd-anthropic-key') || ''; } catch (e) { return ''; } };
const chatKeySet = k => { try { k ? localStorage.setItem('kd-anthropic-key', k) : localStorage.removeItem('kd-anthropic-key'); } catch (e) {} };
const chatSave = () => store.set(chatMode() === 'ai' ? 'chat' : 'chatfree', CHAT.msgs.slice(-80));

/** words the learner knows, so the friend writes at their level (deck words first) */
function chatKnown() {
  const pick = V.filter(x => status(x.id) === 'known' || (x.dk && progress[x.id]));
  return shuffle(pick).slice(0, 120).map(x => x.w).join('、');
}
function chatSystem() {
  const c = chatCfg(), p = CHAT_PEOPLE[c.who] || CHAT_PEOPLE.friend, lvl = userLevel(), known = chatKnown();
  return `You are ${p.who}. You are texting on LINE with a friend who is learning Japanese (around JLPT ${lvl}). Your style: ${p.how}.
Write the way Japanese people really text, not textbook Japanese:
- Short messages: usually one or two lines. Sometimes two short bubbles on separate lines.
- Natural spoken forms: drop particles where natives do (それ見た？ 明日ひま？), endings like よ ね じゃん けど かな わ, contractions like 〜てる 〜ちゃう 〜なきゃ 〜とく.
- Texting habits, used naturally and not in every message: 笑 or w, ！？, 〜, the odd emoji (😂🙏✨😭), words like まじ, やばい, それな, うける, ほんと？, めっちゃ, ちょっと→ちょい, おけ, りょ.
- Be warm and curious: react to what they said, share a little about yourself, and ask one thing back so the chat keeps going.
- Keep vocabulary mostly at their level, with at most one or two harder words per message.${known ? ` Words they already know include: ${known}.` : ''}
- Never use romaji. Never explain grammar inside your message. Don't switch to English: if they write in English or look stuck, answer in simple casual Japanese (the app shows them a translation).
- Stay in character as a real person. If asked whether you are an AI, say honestly that you're an AI chat partner in the app, then carry on chatting.
Reply with one JSON object and nothing else:
{"reply":"your message","furi":"the same message with the reading of every word containing kanji written as {漢字|かんじ}","en":"a natural English translation of your message","fix":null,"words":[]}
- "fix": only if their last message had a real mistake or sounded unnatural or textbook-stiff: {"better":"how a Japanese friend would write it","note":"one short, kind sentence in English saying why"}. Otherwise null.
- "words": up to 3 words from your message they might not know, as {"w":"word","r":"reading in hiragana","m":"short English meaning"}. Use [] if none.`;
}
function chatParse(text) {
  const t = String(text || '').trim(), a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { const j = JSON.parse(t.slice(a, b + 1)); if (j && j.reply) return j; } catch (e) {} }
  return { reply: t.replace(/^```(json)?|```$/g, '').trim(), furi: '', en: '', fix: null, words: [] };
}
async function chatSend(text, hidden) {
  const key = chatKeyGet(); if (!key) { CHAT.setup = true; render(); return; }
  if (CHAT.busy) return;
  const t = String(text || '').trim(); if (!t) return;
  CHAT.msgs.push({ me: 1, t, hidden: !!hidden, at: Date.now() }); CHAT.busy = true; CHAT.err = ''; chatSave(); render(); chatScroll();
  const hist = CHAT.msgs.slice(-24).map(m => m.me ? { role: 'user', content: m.t } : { role: 'assistant', content: JSON.stringify({ reply: m.reply, furi: m.furi || '', en: m.en || '', fix: null, words: [] }) });
  while (hist.length && hist[0].role !== 'user') hist.shift();
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: chatCfg().model, max_tokens: 700, system: chatSystem(), messages: hist })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data.error && data.error.message) || '';
      CHAT.err = r.status === 401 ? 'Anthropic didn’t accept this API key. Check it under ⚙︎ Chat settings.' : r.status === 429 ? 'Too many messages at once. Wait a moment and try again.'
        : r.status >= 500 ? 'Claude is busy right now. Try again in a moment.' : `Anthropic said: ${msg || 'error ' + r.status}`;
      CHAT.msgs.pop();   // let them resend it
    } else {
      const out = chatParse((data.content || []).filter(c => c.type === 'text').map(c => c.text).join(''));
      const last = CHAT.msgs[CHAT.msgs.length - 1];
      if (out.fix && out.fix.better && last && last.me && !last.hidden) last.fix = { better: String(out.fix.better), note: String(out.fix.note || '') };
      CHAT.msgs.push({ me: 0, reply: String(out.reply), furi: String(out.furi || ''), en: String(out.en || ''), words: Array.isArray(out.words) ? out.words.slice(0, 3).filter(w => w && w.w) : [], at: Date.now() });
    }
  } catch (e) { CHAT.err = 'Couldn’t reach Anthropic. Check your connection and try again.'; CHAT.msgs.pop(); }
  CHAT.busy = false; chatSave(); render(); chatScroll();
}
const chatScroll = () => setTimeout(() => { const el = $('#chatlog'); if (el) el.scrollTop = el.scrollHeight; window.scrollTo(0, document.body.scrollHeight); }, 30);

/* ---------- typing in romaji: ka → か, KA → カ, kka → っか, nn → ん ---------- */

/* ---------- the page ---------- */
function vChat() {
  const c = chatCfg(), mode = chatMode(), free = mode === 'free', key = chatKeyGet();
  const p = free ? CHAT_PEOPLE.friend : CHAT_PEOPLE[c.who] || CHAT_PEOPLE.friend;
  const setup = `<div class="card chat-setup"><b>AI chat settings</b>
    <p class="muted" style="font-size:13.5px">AI chat uses Claude, Anthropic’s AI, so it can talk about anything. It needs your own Anthropic API key (console.anthropic.com → API keys). The key is saved only in this browser, and messages go straight from this browser to Anthropic. Use is billed to your Anthropic account. Free chat needs none of this.</p>
    <label class="cs-row"><span>API key</span><input id="chatKey" type="password" autocomplete="off" placeholder="sk-ant-…" value="${key ? '••••••••' + esc(key.slice(-4)) : ''}" onfocus="if(this.value.startsWith('••'))this.value=''"></label>
    <label class="cs-row"><span>Model</span><select onchange="App.chatCfg('model', this.value)">${CHAT_MODELS.map(([v, l, h]) => `<option value="${v}"${c.model === v ? ' selected' : ''}>${l}: ${h}</option>`).join('')}</select></label>
    <div class="cs-row"><span>Chat with</span>${seg(Object.entries(CHAT_PEOPLE).map(([k, v]) => [k, v.name]), c.who, 'App.chatWho')}</div>
    <div class="muted" style="font-size:13px;margin:4px 0 10px">${esc((CHAT_PEOPLE[c.who] || p).who)}. Texts in ${esc((CHAT_PEOPLE[c.who] || p).how)}.</div>
    <div class="btnrow"><button class="btn" onclick="App.chatKeySave()">Save</button>${key ? `<button class="btn line" onclick="App.chatKeyDel()">Remove key</button>` : ''}</div></div>`;
  const starters = ['こんにちは！', '週末なにしてた？', '好きなアニメある？', '最近なに食べた？', '日本行ったことある？', 'おすすめの曲ある？'];
  const bubble = (m, i) => {
    if (m.hidden) return '';
    if (m.me) return `<div class="bub me"><div class="bt jp">${esc(m.t)}</div></div>${m.fix ? `<div class="cfix"><span class="cf-k">${m.fix.better ? 'More natural' : 'Tip'}</span>${m.fix.better ? `<span class="jp">${esc(m.fix.better)}</span>` : ''}${m.fix.note ? `<small>${esc(m.fix.note)}</small>` : ''}</div>` : ''}`;
    const show = CHAT.en[i];
    return `<div class="bub"><span class="who">${p.av} ${esc(p.name)}</span><div class="bt jp">${(m.furi && m.furi.includes('{') ? ruby(fillFuri(m.furi), true) : ruby(fillFuri(m.reply), true)).replace(/\n/g, '<br>')}</div>
      ${m.en ? `<button class="ghost len${show ? ' on' : ''}" onclick="App.chatEn(${i})">${show ? esc(m.en) : 'English'}</button>` : ''}
      ${(m.words || []).length ? `<div class="cwords">${m.words.map((w, j) => `<button class="cword" onclick="App.chatWord(${i}, ${j})" title="Add to My words"><b class="jp">${esc(w.w)}</b> ${w.r && w.r !== w.w ? `<span class="jp">${esc(w.r)}</span>` : ''} ${esc(w.m || '')} <span class="cw-add">＋</span></button>`).join('')}</div>` : ''}</div>`;
  };
  const shown = CHAT.msgs.filter(m => !m.hidden);
  const t = free ? offTopic(OFF.topic) : null, node = t && t.n[OFF.node];
  const tchip = x => `<button class="chip${OFF.topic === x.id && node && !node.end ? ' on' : ''}${(OFF.done || {})[x.id] ? ' did' : ''}" onclick="App.chatTopic('${x.id}')" title="${esc(x.en)}"><span class="jp">${ruby(x.t, true)}</span></button>`;
  const topics = `<div class="ctopics">${OFF_TOPICS.map(tchip).join('')}</div>`;
  const grouped = `<div class="ctgroups">${OFF_GROUPS.map(([g, ids]) => `<div class="ctg"><b>${esc(g)}</b><div class="ctopics">${ids.map(id => offTopic(id)).filter(Boolean).map(x => tchip(x).replace('</span></button>', `</span><small>${esc(x.en)}</small></button>`)).join('')}</div></div>`).join('')}</div>`;
  const opts = free && node && !node.end && !CHAT.busy && node.o ? `<div class="copts">${node.o.map((o, k) => `<button class="copt" onclick="App.chatOpt(${k})"><span class="jp">${ruby(o[0], true)}</span><small>${esc(o[1])}</small></button>`).join('')}</div>` : '';
  const empty = free
    ? `<div class="chat-empty"><p>Pick something to talk about with ${p.av} ${esc(p.name)}:</p>${grouped}</div>`
    : `<div class="chat-empty"><p>Say hi, or pick something to start with:</p><div class="chips">${starters.map(x => `<button class="chip" onclick="App.chatSay('${x}')">${x}</button>`).join('')}</div></div>`;
  return `<div class="chat-head"><div><h1>Chat</h1><p class="sub">${free ? `Text with ${p.av} ${esc(p.name)} the way Japanese friends really text. Type your own reply or tap a suggestion. Tap “English” if you’re stuck.` : `Text with ${p.av} ${esc(p.name)} about anything. Tap “English” if you’re stuck.`}</p></div>
      <div class="ch-tools">${!free ? `<button class="ghost" onclick="App.chatSetup()">⚙︎ AI settings</button>` : ''}${shown.length ? `<button class="ghost" onclick="App.chatClear()">New chat</button>` : ''}</div></div>
    ${seg([['free', 'Free chat'], ['ai', 'AI chat (your API key)']], mode, 'App.chatModeSet')}
    ${!free && (!key || CHAT.setup) ? setup : ''}
    ${free && shown.length ? topics : ''}
    <div class="chatlog" id="chatlog">${shown.length ? CHAT.msgs.map(bubble).join('') : empty}
      ${CHAT.busy ? `<div class="bub typing"><span class="who">${p.av} ${esc(p.name)}</span><div class="bt"><i></i><i></i><i></i></div></div>` : ''}</div>
    ${CHAT.err ? `<p class="note warn">${esc(CHAT.err)}</p>` : ''}
    ${opts}${free && node && node.end && !CHAT.busy ? `<p class="note" style="text-align:center">Pick another topic above to keep chatting.</p>` : ''}
    <div class="chat-in"><textarea id="chatIn" rows="1" lang="ja" placeholder="${CHAT.roma ? 'Type romaji: genki? → げんき？' : 'メッセージを入力…'}" oninput="App.chatType(this)" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();App.chatGo()}"></textarea>
      <button class="ghost roma${CHAT.roma ? ' on' : ''}" onclick="App.chatRoma()" title="Type in romaji and it turns into kana">${CHAT.roma ? 'あ' : 'A'}</button>
      <button class="btn" onclick="App.chatGo()"${CHAT.busy ? ' disabled' : ''}>Send</button></div>
    <p class="note" style="font-size:12px">No Japanese keyboard? Tap <b>A</b> to type in romaji: <i>arigatou</i> → ありがとう, capitals give katakana: <i>KO-HI-</i> → コーヒー.</p>`;
}
const chatApp = {
  chatSetup() { CHAT.setup = !CHAT.setup; render(); },
  chatKeySave() { const v = ($('#chatKey') || {}).value || ''; if (v && !v.startsWith('••')) chatKeySet(v.trim()); CHAT.setup = false; CHAT.err = ''; render(); toast(chatKeyGet() ? 'Chat is ready' : 'Add your API key to chat'); },
  chatKeyDel() { if (!confirm('Remove your API key from this browser?')) return; chatKeySet(''); render(); },
  chatCfg(k, v) { const c = chatCfg(); c[k] = v; store.set('chatcfg', c); render(); },
  chatWho(v) { App.chatCfg('who', v); },
  chatClear() { if (!confirm('Start a new chat? This one will be cleared.')) return; CHAT.msgs = []; CHAT.en = {}; CHAT.err = ''; if (chatMode() === 'free') { OFF.topic = null; OFF.node = null; offSave(); } chatSave(); render(); },
  chatModeSet(v) { const c = chatCfg(); c.mode = v; store.set('chatcfg', c); CHAT.msgs = store.get(v === 'ai' ? 'chat' : 'chatfree', []); CHAT.en = {}; CHAT.err = ''; CHAT.busy = false; render(); },
  chatTopic(id) { if (CHAT.busy) return; offEnter(id); render(); chatScroll(); },
  chatOpt(k) { const t = offTopic(OFF.topic), node = t && t.n[OFF.node], o = node && node.o && node.o[k]; if (!o || CHAT.busy) return; offReply(plain(o[0])); },
  chatEn(i) { CHAT.en[i] = !CHAT.en[i]; render(); },
  chatRoma() { CHAT.roma = !CHAT.roma; render(); setTimeout(() => { const t = $('#chatIn'); if (t) t.focus(); }, 0); },
  chatType(el) { if (CHAT.roma) { const v = romaToKana(el.value); if (v !== el.value) el.value = v; } el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; },
  chatGo() { const el = $('#chatIn'); if (!el || CHAT.busy) return; const v = (CHAT.roma ? romaToKana(el.value, true) : el.value).trim(); if (!v) return; el.value = ''; if (chatMode() === 'free') { if (!OFF.topic) offEnter('intro'); offReply(v); } else chatSend(v); },
  chatSay(t) { chatSend(t); },
  chatWord(i, j) {
    const m = CHAT.msgs[i], x = m && (m.words || [])[j]; if (!x) return;
    if (VMAP['v:' + x.w + '|' + (x.r || x.w)] || custom.some(c => plain(c[0]) === x.w)) { toast('Already in your words'); return; }
    custom.push([furi(x.w, x.r || x.w), x.r || x.w, x.m || '', 'custom', 'MY', 3]); store.set('custom', custom); rebuild();
    if (!settings.levels.includes('MY')) { settings.levels.push('MY'); saveSettings(); }
    toast(`Added ${x.w} to My words`);
  }
};
Object.assign(App, chatApp);   // this file loads after the main script
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
function chatVerbClass(x) {
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
    const c = chatVerbClass(x), base = x.w.slice(0, -1), last = x.w.slice(-1);
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
    if (end === 'ましょう') out = head + (f.dict.endsWith('る') && chatVerbClass({ w: f.dict, r: f.dict, senses: [] }) === 'v1' ? f.dict.slice(0, -1) + 'よう' : f.dict.slice(0, -1) + ({ う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' }[f.dict.slice(-1)] || 'ろ') + 'う');
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
