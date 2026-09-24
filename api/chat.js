import { buildLearningPlan, buildVidyaSystemPrompt } from './vidyabot-engine.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      messages,
      student = {},
      mode = null
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    // VidyaBot decides the pedagogical action BEFORE asking the language model
    // to produce words. This is the first separation between pedagogy and LLM.
    const plan = buildLearningPlan(messages, student);
    const baseContext = [
      student.classLevel ? `Class: ${student.classLevel}` : '',
      student.board ? `Board: ${student.board}` : '',
      Array.isArray(student.weakSubjects) && student.weakSubjects.length
        ? `Weak subjects: ${student.weakSubjects.join(', ')}`
        : '',
      Array.isArray(student.strongSubjects) && student.strongSubjects.length
        ? `Strong subjects: ${student.strongSubjects.join(', ')}`
        : '',
      mode ? `UI mode: ${mode}` : ''
    ].filter(Boolean).join('\\n');

    const system = buildVidyaSystemPrompt(plan, baseContext);
    const modelMessages = [
      { role: 'system', content: system },
      ...messages.slice(-12).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: modelMessages,
        max_tokens: 700,
        temperature: 0.55
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return res.status(502).json({ error: 'Empty model response' });

    // Return the learning decision as structured metadata. The UI can use this
    // in later iterations to render practice/revision/check cards.
    return res.status(200).json({
      text,
      learning: plan
    });

  } catch (err) {
    console.error('VidyaBot error:', err);
    return res.status(500).json({ error: 'VidyaBot service failed' });
  }
}
