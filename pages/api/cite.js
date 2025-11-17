import fetch from 'cross-fetch';

const formatAuthors = (authors = []) => {
  if (!authors.length) return 'Unknown';
  const getName = (author) => author.family || author.name || author.given || 'Unknown';
  if (authors.length === 1) return getName(authors[0]);
  if (authors.length === 2) return `${getName(authors[0])} & ${getName(authors[1])}`;
  return `${getName(authors[0])} et al.`;
};

const getYear = (item) => {
  const parts =
    item['published-print']?.['date-parts'] ||
    item['published-online']?.['date-parts'] ||
    item['issued']?.['date-parts'];
  return parts?.[0]?.[0] || 'n.d.';
};

const makeId = (item) => {
  if (item.DOI || item.doi) return item.DOI || item.doi;
  const base = (item.title?.[0] || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${base}-${getYear(item)}`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { query } = req.body || {};
  if (!query) {
    return res.status(200).json({ results: [] });
  }
  try {
    const response = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch citations');
    }
    const json = await response.json();
    const items = json.message?.items || [];
    const results = items.map((item) => ({
      title: item.title?.[0] || 'Untitled',
      authors: formatAuthors(item.author),
      year: getYear(item),
      journal: item['container-title']?.[0] || 'Unknown Journal',
      doi: makeId(item)
    }));
    return res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ results: [] });
  }
}
