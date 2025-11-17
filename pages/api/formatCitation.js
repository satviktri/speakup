export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { item, style } = req.body || {};
  if (!item) {
    return res.status(400).json({ error: 'Missing citation item' });
  }
  const { title = 'Untitled', authors = 'Unknown', year = 'n.d.', journal = 'Unknown Journal', doi = '' } =
    item;
  if (style !== 'APA') {
    return res.status(200).json({
      inText: `${authors}, ${year}`,
      full: `${authors} (${year}). ${title}. ${journal}. ${doi ? `https://doi.org/${doi}` : ''}`.trim()
    });
  }
  const inText = `${authors}, ${year}`;
  const full = `${authors} (${year}). ${title}. ${journal}. ${doi ? `https://doi.org/${doi}` : ''}`.trim();
  return res.status(200).json({ inText, full });
}
