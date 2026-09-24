import { buildLearningPlan, buildVidyaSystemPrompt } from './vidyabot-engine.js';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      messages,
      student = {},
      mode = null,
      // Backward compatibility with the uploaded Dhruv client/API contract.
      cls = null,
      subject = null
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const safeMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 3000) }));

    if (!safeMessages.length) {
      return res.status(400).json({ error: 'Invalid messages' });
    }

    const mergedStudent = {
      ...student,
      classLevel: student.classLevel || cls || 'Class 10',
      subject: student.subject || subject || 'any subject'
    };

    // VidyaBot decides the pedagogical action BEFORE the language model
    // generates the natural-language response.
    const plan = buildLearningPlan(safeMessages, mergedStudent);

    const baseContext = [
      `Class: ${mergedStudent.classLevel}`,
      `Subject: ${mergedStudent.subject}`,
      `Board: ${mergedStudent.board || 'CBSE/ICSE'}`,
      Array.isArray(mergedStudent.weakSubjects) && mergedStudent.weakSubjects.length
        ? `Weak subjects: ${mergedStudent.weakSubjects.join(', ')}`
        : '',
      Array.isArray(mergedStudent.strongSubjects) && mergedStudent.strongSubjects.length
        ? `Strong subjects: ${mergedStudent.strongSubjects.join(', ')}`
        : '',
      mode ? `UI mode: ${mode}` : ''
    ].filter(Boolean).join('\\n');

    const system = buildVidyaSystemPrompt(plan, baseContext) + `

OUTPUT CONTRACT:
For an academic doubt, use these four headings in this order:
## Explanation
## Indian Example
## Practice Questions
## Board Exam Tip

Keep each section concise and useful. Practice Questions must not include answers unless the student explicitly asks for them. For non-academic greetings, respond naturally without forcing these headings.
`;

    const modelMessages = [
      { role: 'system', content: system },
      ...safeMessages
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: modelMessages,
        max_tokens: 900,
        temperature: 0.55
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err?.error?.message || 'AI service error'
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return res.status(502).json({ error: 'Empty model response' });

    return res.status(200).json({
      text,
      learning: plan
    });
  } catch (err) {
    console.error('VidyaBot error:', err);
    return res.status(500).json({ error: 'VidyaBot service failed' });
  }
}
