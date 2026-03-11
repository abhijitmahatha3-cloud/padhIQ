/* ============================================================
   PROJECT AAA — SCRIPT.JS  v3.0
   Personalized AI Tutor + Progress Tracker
   KEY: padhiq_progress
   ============================================================ */

/* ── STARS ──────────────────────────────────────── */
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
  window.addEventListener('resize',resize); resize(); requestAnimationFrame(draw);
})();

/* ── METEORS ────────────────────────────────────── */
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
  setInterval(spawn,600);
})();


/* ═══════════════════════════════════════════════════
   PROGRESS TRACKER — key: padhiq_progress
   ═══════════════════════════════════════════════════ */
const Progress = {
  KEY: 'padhiq_progress',

  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || this.defaultState(); }
    catch { return this.defaultState(); }
  },

  defaultState() {
    return {
      questionsAsked: 0,
      streak: { count:0, lastDate:null },
      totalSessions: 0,
      subjects: {
        Physics:0, Chemistry:0, Biology:0, Maths:0,
        History:0, Geography:0, Economics:0, English:0, Other:0
      },
      recentTopics: []
    };
  },

  save(d) { localStorage.setItem(this.KEY, JSON.stringify(d)); },

  detectSubject(text) {
    const t = text.toLowerCase();
    if (/physics|newton|force|motion|electric|magnet|light|optics|wave|energy|gravit|heat|thermodynamics|velocity|acceleration/.test(t)) return 'Physics';
    if (/chemistry|acid|base|atom|molecule|periodic|reaction|organic|bond|electron|valence|solution|salt/.test(t)) return 'Chemistry';
    if (/biology|cell|plant|animal|photosynthesis|respir|dna|gene|evolution|ecosystem|tissue|organ|blood/.test(t)) return 'Biology';
    if (/maths|math|algebra|geometry|trigonometry|calculus|equation|theorem|quadratic|probability|statistic|triangle|circle/.test(t)) return 'Maths';
    if (/history|war|revolution|independence|gandhi|mughal|british|empire|colonial|movement/.test(t)) return 'History';
    if (/geography|climate|soil|river|mountain|resource|map|population|agriculture|rainfall/.test(t)) return 'Geography';
    if (/economics|gdp|market|demand|supply|inflation|money|bank|trade|budget/.test(t)) return 'Economics';
    if (/english|grammar|essay|poem|prose|literature|writing|comprehension|tense|voice/.test(t)) return 'English';
    return 'Other';
  },

  getTopSubject(d) {
    return Object.entries(d.subjects).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a)[0]?.[0] || null;
  },

  getWeakSubjects(d) {
    return Object.entries(d.subjects).filter(([,v])=>v>0&&v<3).map(([k])=>k);
  },

  update(q) {
    const d = this.load();
    d.questionsAsked++;
    const today = new Date().toDateString();
    if (d.streak.lastDate !== today) {
      const yest = new Date(Date.now()-86400000).toDateString();
      d.streak.count = d.streak.lastDate===yest ? d.streak.count+1 : 1;
      d.streak.lastDate = today;
      d.totalSessions++;
    }
    const subj = this.detectSubject(q);
    d.subjects[subj] = (d.subjects[subj]||0) + 1;
    const shortQ = q.slice(0,60);
    d.recentTopics = [shortQ, ...d.recentTopics.filter(t=>t!==shortQ)].slice(0,5);
    this.save(d);
    return d;
  }
};


/* ═══════════════════════════════════════════════════
   AI ENGINE
   ═══════════════════════════════════════════════════ */
let conversationHistory = [];

function buildSystemPrompt() {
  const d = Progress.load();
  const top  = Progress.getTopSubject(d);
  const weak = Progress.getWeakSubjects(d).join(', ');

  return `You are padhIQ Study Guide — a sharp, personalized AI tutor for Indian students in Classes 9–12 (CBSE/ICSE).

STUDENT PROFILE:
- Questions asked so far: ${d.questionsAsked}
- Study streak: ${d.streak.count} days
- Strong subject: ${top || 'not determined yet'}
- Needs more practice: ${weak || 'not determined yet'}

YOUR TEACHING METHOD — for EVERY concept question, follow this structure:
1. **Quick Explanation** — clear, simple, 3-5 lines
2. **Indian Example** — real-life example from Indian context
3. **Key Formula / Rule** — if applicable, write it clearly
4. **3 Practice Questions** — label them Easy / Medium / Hard. After listing them, add: "Reply with your answers and I'll check them!"
5. **💡 Board Exam Tip** — one specific tip for CBSE/ICSE exams

For NON-concept questions (study plans, motivation, tips), skip the practice questions and just answer helpfully.

PERSONALITY:
- Friendly like a brilliant senior student from India
- Encouraging, especially when student seems stuck
- Use Hinglish naturally if student uses it
- NCERT-aligned always
- Keep total response under 400 words

FORMATTING (renders as HTML):
- **bold** for key terms
- Bullet points with •
- Numbered lists with 1. 2. 3.
- Formulas as plain text: F = ma`;
}

/* ── Vercel Proxy → Groq ── */
async function tryProxy(messages) {
  const res = await fetch(`${window.location.origin}/api/chat`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages}), signal:AbortSignal.timeout(20000)
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error||`Proxy ${res.status}`); }
  const data = await res.json();
  if (!data.text) throw new Error('Empty proxy response');
  return data.text;
}

/* ── HuggingFace fallback ── */
async function tryHuggingFace(userMessage) {
  const history = conversationHistory.slice(-4).map(m=>
    (m.role==='user'?'Student':'Tutor')+': '+m.content).join('\n');
  const prompt = `<s>[INST] <<SYS>>\n${buildSystemPrompt()}\n<</SYS>>\n\n${history?history+'\n':''}Student: ${userMessage} [/INST] Tutor:`;
  for (const model of ['mistralai/Mistral-7B-Instruct-v0.2','HuggingFaceH4/zephyr-7b-beta']) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({inputs:prompt,parameters:{max_new_tokens:500,temperature:0.7,return_full_text:false}}),
        signal:AbortSignal.timeout(25000)
      });
      if (res.status===503||!res.ok) continue;
      const data = await res.json();
      let text = Array.isArray(data)?data[0]?.generated_text:data.generated_text;
      if (!text) continue;
      text = text.replace(/^(Tutor:|Assistant:)\s*/i,'').replace(/Student:[\s\S]*/i,'').trim();
      if (text.length>20) return text;
    } catch(e) { console.warn(model,e.message); }
  }
  throw new Error('HuggingFace unavailable');
}

/* ── Main caller ── */
async function callAI(userMessage) {
  const progressData = Progress.update(userMessage);
  const messages = [
    {role:'system', content:buildSystemPrompt()},
    ...conversationHistory.slice(-10),
    {role:'user', content:userMessage}
  ];
  try {
    const text = await tryProxy(messages);
    saveHistory(userMessage,text);
    updateProgressBar(progressData);
    return text;
  } catch(e) { console.warn('Proxy failed:',e.message); }
  try {
    const text = await tryHuggingFace(userMessage);
    saveHistory(userMessage,text);
    updateProgressBar(progressData);
    return text;
  } catch(e) { console.warn('HuggingFace failed:',e.message); }
  throw new Error('AI service unreachable. Please check your internet and try again.');
}

function saveHistory(userMsg, aiMsg) {
  conversationHistory.push({role:'user',content:userMsg});
  conversationHistory.push({role:'assistant',content:aiMsg});
  if (conversationHistory.length>20) conversationHistory=conversationHistory.slice(-20);
}

/* ── Progress bar in chat ── */
function updateProgressBar(data) {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  const topSub = Progress.getTopSubject(data);
  bar.innerHTML = `
    <div class="prog-item">🔥 <strong>${data.streak.count}</strong> day streak</div>
    <div class="prog-divider"></div>
    <div class="prog-item">🧠 <strong>${data.questionsAsked}</strong> questions</div>
    ${topSub?`<div class="prog-divider"></div><div class="prog-item">⭐ Strong in <strong>${topSub}</strong></div>`:''}
    <a href="dashboard.html" class="prog-dash-link">View Dashboard →</a>
  `;
  bar.style.display='flex';
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
  const {box} = getEls(); if (!box) return null;
  const wrap = document.createElement('div');
  wrap.className = role==='user'?'user-message':'ai-message';
  const icon = document.createElement('div');
  icon.className='msg-icon';
  icon.textContent = role==='user'?'👤':'🤖';
  const bubble = document.createElement('div');
  bubble.className='msg-content';
  if (isTyping) {
    bubble.innerHTML=`<div class="thinking-wrap">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      <span class="thinking-lbl" id="thinkingLabel">Thinking...</span>
    </div>`;
  } else {
    bubble.innerHTML=renderMd(content);
  }
  wrap.appendChild(icon); wrap.appendChild(bubble);
  box.appendChild(wrap); box.scrollTop=box.scrollHeight;
  return bubble;
}

function renderMd(text) {
  if (!text) return '';
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g,(_,c)=>`<pre class="code-block">${esc(c.trim())}</pre>`)
    .replace(/`([^`\n]+)`/g,(_,c)=>`<code class="inline-code">${esc(c)}</code>`)
    .replace(/\*\*(.*?)\*\*/g,'<strong class="ai-bold">$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/^[•\-] (.+)$/gm,'<div class="ai-bullet">$1</div>')
    .replace(/^(\d+)\. (.+)$/gm,'<div class="ai-numbered"><span class="ai-num">$1</span>$2</div>')
    .replace(/\n\n/g,'<div class="ai-gap"></div>')
    .replace(/\n/g,'<br>');
}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

const thinkingSteps=['Thinking...','Analyzing question...','Preparing explanation...','Almost ready...'];

async function sendMessage() {
  const {box,input,btn,btnTxt}=getEls();
  if (!input) return;
  const msg=input.value.trim(); if(!msg) return;
  input.value=''; input.disabled=true; btn.disabled=true;
  if(btnTxt) btnTxt.textContent='...';
  appendMessage('user',msg);
  const typing=appendMessage('assistant','',true);
  let si=0;
  const ticker=setInterval(()=>{
    si=(si+1)%thinkingSteps.length;
    const lbl=typing?.querySelector('#thinkingLabel');
    if(lbl) lbl.textContent=thinkingSteps[si];
  },2000);
  try {
    const reply=await callAI(msg);
    clearInterval(ticker);
    if(typing) typing.innerHTML=renderMd(reply);
  } catch(err) {
    clearInterval(ticker);
    if(typing) typing.innerHTML=renderMd(`⚠️ **${err.message}**`);
  }
  if(box) box.scrollTop=box.scrollHeight;
  input.disabled=false; btn.disabled=false;
  if(btnTxt) btnTxt.textContent='Send ✦';
  input.focus();
}

function clearChat() {
  const {box}=getEls(); if(!box) return;
  conversationHistory=[];
  box.innerHTML='';
  appendMessage('assistant',buildWelcomeMessage());
}

function buildWelcomeMessage() {
  const data=Progress.load();
  const topSub=Progress.getTopSubject(data);
  if(data.questionsAsked===0) {
    return `Namaste! 👋 I'm your **padhIQ Study Guide** for Classes 9–12.\n\nAsk me any question and I'll give you:\n• Clear explanation\n• Indian example\n• 3 practice questions to test yourself\n• Board exam tip\n\nWhat would you like to study today? 🚀`;
  }
  return `Welcome back! 🎯 You've asked **${data.questionsAsked} questions** and have a **${data.streak.count}-day streak**.\n\n${topSub?`You're strongest in **${topSub}**. `:''}What shall we study today?`;
}

function setInput(text){const{input}=getEls();if(input){input.value=text;input.focus();}}
function askTool(p){setInput(p);const s=document.getElementById('chat');if(s)s.scrollIntoView({behavior:'smooth'});setTimeout(sendMessage,500);}
function goToTool(p){localStorage.setItem('aaa_tool_prompt',p);window.location.href='study-guide.html';}


/* ── STYLES ───────────────────────────────────────── */
(function injectStyles(){
  const s=document.createElement('style');
  s.textContent=`
  .thinking-wrap{display:flex;align-items:center;gap:8px}
  .thinking-lbl{font-size:.7rem;color:var(--muted,#64748b);font-family:'JetBrains Mono',monospace;animation:thinkerFade 2s ease-in-out infinite}
  @keyframes thinkerFade{0%,100%{opacity:.4}50%{opacity:1}}
  .ai-bold{color:#fff}
  .ai-bullet{padding:2px 0 2px 1.2rem;position:relative}
  .ai-bullet::before{content:'•';position:absolute;left:0;color:var(--cyan,#00f0ff);font-weight:700}
  .ai-numbered{padding:2px 0 2px 2rem;position:relative}
  .ai-num{position:absolute;left:0;color:var(--cyan,#00f0ff);font-weight:700;font-family:'JetBrains Mono',monospace;font-size:.85em}
  .ai-gap{height:.55rem}
  .code-block{background:rgba(0,240,255,.06);border:1px solid rgba(0,240,255,.15);border-radius:8px;padding:.75rem 1rem;overflow-x:auto;margin:.5rem 0;font-family:'JetBrains Mono',monospace;font-size:.8rem;line-height:1.6;white-space:pre}
  .inline-code{background:rgba(0,240,255,.1);padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.82em;color:var(--cyan,#00f0ff)}
  #progressBar{
    display:none;align-items:center;gap:.6rem;flex-wrap:wrap;
    padding:.6rem 1.5rem;background:rgba(0,240,255,.04);
    border-bottom:1px solid rgba(0,240,255,.1);
    font-size:.75rem;font-family:'Syne',sans-serif;
  }
  .prog-item{color:var(--muted,#64748b)}.prog-item strong{color:var(--cyan,#00f0ff)}
  .prog-divider{width:1px;height:14px;background:rgba(255,255,255,.1)}
  .prog-dash-link{margin-left:auto;font-family:'Syne',sans-serif;font-size:.72rem;font-weight:700;
    color:rgba(0,240,255,.6);text-decoration:none;padding:.2rem .7rem;border-radius:999px;
    border:1px solid rgba(0,240,255,.2);transition:all .2s}
  .prog-dash-link:hover{color:var(--cyan,#00f0ff);border-color:rgba(0,240,255,.4)}
  `;
  document.head.appendChild(s);
})();


/* ── INIT ─────────────────────────────────────────── */
window.addEventListener('load',()=>{
  const box=document.getElementById('chatBox');
  if(!box) return;
  if(!box.querySelector('.ai-message')) appendMessage('assistant',buildWelcomeMessage());
  const data=Progress.load();
  if(data.questionsAsked>0) updateProgressBar(data);
  const prompt=localStorage.getItem('aaa_tool_prompt');
  if(prompt){
    localStorage.removeItem('aaa_tool_prompt');
    const input=document.getElementById('userInput');
    if(input){input.value=prompt;setTimeout(sendMessage,800);}
  }
});

/* ── SCROLL REVEAL ────────────────────────────────── */
(function initScrollReveal(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';}
  }),{threshold:.1});
  document.querySelectorAll('.feature-card,.market-card').forEach(el=>{
    el.style.cssText='opacity:0;transform:translateY(30px);transition:opacity .6s ease,transform .6s ease';
    obs.observe(el);
  });
})();
