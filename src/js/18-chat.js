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
