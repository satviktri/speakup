export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { text = '' } = req.body || {};
  const trimmed = text.trim();
  if (!trimmed) {
    return res.status(200).json({ improvedText: '' });
  }
  let improved = trimmed
    .replace(/\bgonna\b/gi, 'going to')
    .replace(/\bwanna\b/gi, 'want to')
    .replace(/\bkinda\b/gi, 'somewhat');
  if (!/[.!?]$/.test(improved)) {
    improved = `${improved}.`;
  }
  // TODO: Call real LLM here using process.env.OPENAI_API_KEY
  return res.status(200).json({ improvedText: improved });
}
