/* ============================================================
   PROJECT AAA — SCRIPT.JS
   AI Study Guide — Groq via Vercel proxy (free, no CORS issues)
   ============================================================ */

/* ── STARS ────────────────────────────────────────── */
(function initStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; stars = [];
    for (let i = 0; i < Math.floor((canvas.width*canvas.height)/6000); i++)
      stars.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height,
        r:Math.random()*1.2+0.2, o:Math.random()*0.7+0.2, spd:Math.random()*0.003+0.001 });
  }
  function draw(t) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    stars.forEach(s => {
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${s.o*(0.8+0.2*Math.sin(t*s.spd*1000))})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize); resize(); requestAnimationFrame(draw);
})();

/* ── METEORS ──────────────────────────────────────── */
(function initMeteors() {
  const container = document.getElementById('meteorContainer');
  if (!container) return;
  function spawn() {
    const m = document.createElement('div'); m.className = 'meteor';
    const big = Math.random()>0.75, h = big?120+Math.random()*80:60+Math.random()*60;
    const dur = (2+Math.random()*2).toFixed(1);
    m.style.cssText=`left:${Math.random()*window.innerWidth}px;top:0;height:${h}px;width:${big?3:2}px;animation-duration:${dur}s;`;
    container.appendChild(m); setTimeout(()=>m.remove(), dur*1000+200);
  }
  setInterval(spawn, 600);
})();


/* ═══════════════════════════════════════════════════
   AI ENGINE
   Calls /api/chat (your Vercel proxy → Groq)
   Falls back to HuggingFace if proxy unavailable
   ═══════════════════════════════════════════════════ */

let conversationHistory = [];

const SYSTEM_PROMPT = `You are AAA Study Guide — an expert AI tutor for Indian students in Classes 9 to 12 (CBSE and ICSE boards).

Be friendly and encouraging like a brilliant senior student. Use Indian context and examples. Stay NCERT-aligned. Always be board-exam focused — mention exam tips and common mistakes.

Formatting (renders as HTML so keep it clean):
- Use **bold** for key terms
- Use bullet points with • character  
- Numbered steps with 1. 2. 3.
- Keep answers 150-300 words
- End with a 💡 Exam Tip when relevant
- Write formulas as plain text: F = ma, not LaTeX
- Hindi/Hinglish is totally fine if student uses it`;

/* ── Primary: Your Vercel proxy → Groq ── */
async function tryProxy(messages) {
  // Auto-detect proxy URL (works on Vercel deployment + localhost)
  const base = window.location.origin;
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || `Proxy error ${res.status}`);
  }
  const data = await res.json();
  if (!data.text) throw new Error('Empty proxy response');
  return data.text;
}

/* ── Fallback: HuggingFace (no key needed) ── */
async function tryHuggingFace(userMessage) {
  const history = conversationHistory.slice(-4).map(m =>
    (m.role==='user'?'Student':'Tutor') + ': ' + m.content
  ).join('\n');

  const prompt = `<s>[INST] <<SYS>>\n${SYSTEM_PROMPT}\n<</SYS>>\n\n${history?history+'\n':''}Student: ${userMessage} [/INST] Tutor:`;

  const models = [
    'mistralai/Mistral-7B-Instruct-v0.2',
    'HuggingFaceH4/zephyr-7b-beta'
  ];

  for (const model of models) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens:400, temperature:0.7, return_full_text:false }
        }),
        signal: AbortSignal.timeout(25000)
      });
      if (res.status === 503) continue; // model loading
      if (!res.ok) continue;
      const data = await res.json();
      let text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
      if (!text) continue;
      text = text.replace(/^(Tutor:|Assistant:)\s*/i,'').replace(/Student:[\s\S]*/i,'').trim();
      if (text.length > 20) return text;
    } catch(e) { console.warn(model, e.message); }
  }
  throw new Error('HuggingFace unavailable');
}

/* ── Main caller ── */
async function callAI(userMessage) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage }
  ];

  // Try proxy (Groq) first
  try {
    const text = await tryProxy(messages);
    saveHistory(userMessage, text);
    return text;
  } catch(e) { console.warn('Proxy failed:', e.message); }

  // Fallback to HuggingFace
  try {
    const text = await tryHuggingFace(userMessage);
    saveHistory(userMessage, text);
    return text;
  } catch(e) { console.warn('HuggingFace failed:', e.message); }

  throw new Error('All AI services are currently unreachable. Please check your internet connection.');
}

function saveHistory(userMsg, aiMsg) {
  conversationHistory.push({ role:'user', content:userMsg });
  conversationHistory.push({ role:'assistant', content:aiMsg });
  if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);
}


/* ── CHAT UI ──────────────────────────────────────── */
function getEls() {
  return {
    box:    document.getElementById('chatBox'),
    input:  document.getElementById('userInput'),
    btn:    document.getElementById('sendBtn'),
    btnTxt: document.getElementById('sendBtnText')
  };
}

function appendMessage(role, content, isTyping) {
  const { box } = getEls(); if (!box) return null;
  const wrap = document.createElement('div');
  wrap.className = role==='user' ? 'user-message' : 'ai-message';
  const icon = document.createElement('div');
  icon.className = 'msg-icon';
  icon.textContent = role==='user' ? '👤' : '🤖';
  const bubble = document.createElement('div');
  bubble.className = 'msg-content';
  if (isTyping) {
    bubble.innerHTML = `<div class="thinking-wrap">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      <span class="thinking-lbl" id="thinkingLabel">Thinking...</span>
    </div>`;
  } else {
    bubble.innerHTML = renderMd(content);
  }
  wrap.appendChild(icon); wrap.appendChild(bubble);
  box.appendChild(wrap); box.scrollTop = box.scrollHeight;
  return bubble;
}

function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_,c)=>`<pre class="code-block">${esc(c.trim())}</pre>`)
    .replace(/`([^`\n]+)`/g,             (_,c)=>`<code class="inline-code">${esc(c)}</code>`)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="ai-bold">$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/^[•\-] (.+)$/gm, '<div class="ai-bullet">$1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="ai-numbered"><span class="ai-num">$1</span>$2</div>')
    .replace(/\n\n/g, '<div class="ai-gap"></div>')
    .replace(/\n/g,   '<br>');
}
function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const thinkingSteps = ['Thinking...','Processing...','Generating answer...','Almost ready...'];

async function sendMessage() {
  const { box, input, btn, btnTxt } = getEls();
  if (!input) return;
  const msg = input.value.trim(); if (!msg) return;
  input.value=''; input.disabled=true; btn.disabled=true;
  if (btnTxt) btnTxt.textContent='...';

  appendMessage('user', msg);
  const typing = appendMessage('assistant','',true);

  let si=0;
  const ticker = setInterval(()=>{
    si=(si+1)%thinkingSteps.length;
    const lbl=typing?.querySelector('#thinkingLabel');
    if(lbl) lbl.textContent=thinkingSteps[si];
  }, 2000);

  try {
    const reply = await callAI(msg);
    clearInterval(ticker);
    if (typing) typing.innerHTML = renderMd(reply);
  } catch(err) {
    clearInterval(ticker);
    if (typing) typing.innerHTML = renderMd(`⚠️ **${err.message}**`);
  }

  if (box) box.scrollTop=box.scrollHeight;
  input.disabled=false; btn.disabled=false;
  if (btnTxt) btnTxt.textContent='Send ✦';
  input.focus();
}

function clearChat() {
  const { box } = getEls(); if (!box) return;
  conversationHistory=[];
  box.innerHTML='';
  appendMessage('assistant','🧹 **Chat cleared!** Namaste! 👋 Ask me anything about your Class 9–12 subjects!');
}

function setInput(text) {
  const { input } = getEls();
  if (input) { input.value=text; input.focus(); }
}
function askTool(prompt) {
  setInput(prompt);
  const sec=document.getElementById('chat');
  if(sec) sec.scrollIntoView({behavior:'smooth'});
  setTimeout(sendMessage,500);
}
function goToTool(prompt) {
  localStorage.setItem('aaa_tool_prompt', prompt);
  window.location.href='study-guide.html';
}


/* ── CHAT STYLES ──────────────────────────────────── */
(function injectStyles(){
  const s=document.createElement('style');
  s.textContent=`
    .thinking-wrap{display:flex;align-items:center;gap:8px;}
    .thinking-lbl{font-size:0.7rem;color:var(--muted,#64748b);font-family:'JetBrains Mono',monospace;margin-left:4px;animation:thinkerFade 2s ease-in-out infinite;}
    @keyframes thinkerFade{0%,100%{opacity:0.4}50%{opacity:1}}
    .ai-bold{color:#fff;}
    .ai-bullet{padding:2px 0 2px 1.2rem;position:relative;}
    .ai-bullet::before{content:'•';position:absolute;left:0;color:var(--cyan,#00f0ff);font-weight:700;}
    .ai-numbered{padding:2px 0 2px 2rem;position:relative;}
    .ai-num{position:absolute;left:0;color:var(--cyan,#00f0ff);font-weight:700;font-family:'JetBrains Mono',monospace;font-size:0.85em;}
    .ai-gap{height:0.55rem;}
    .code-block{background:rgba(0,240,255,0.06);border:1px solid rgba(0,240,255,0.15);border-radius:8px;padding:0.75rem 1rem;overflow-x:auto;margin:0.5rem 0;font-family:'JetBrains Mono',monospace;font-size:0.8rem;line-height:1.6;white-space:pre;}
    .inline-code{background:rgba(0,240,255,0.1);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.82em;color:var(--cyan,#00f0ff);}
  `;
  document.head.appendChild(s);
})();


/* ── SCROLL REVEAL ────────────────────────────────── */
(function initScrollReveal(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';}
  }),{threshold:0.1});
  document.querySelectorAll('.feature-card,.market-card').forEach(el=>{
    el.style.opacity='0';el.style.transform='translateY(30px)';
    el.style.transition='opacity 0.6s ease,transform 0.6s ease';
    obs.observe(el);
  });
})();
