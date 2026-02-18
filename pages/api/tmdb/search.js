import { cacheGet, cacheSet, normQuery } from '../../../lib/serverCache';

export default async function handler(req, res) {
  try {
    const { q, type } = req.query;
    const v3 = process.env.TMDB_API_KEY; // 32-hex
    const v4 = process.env.TMDB_READ_TOKEN; // jwt

    if (!v3 && !v4) return res.status(500).json({ error: 'TMDB key not configured' });
    if (!q || String(q).trim().length < 2) return res.status(400).json({ error: 'Missing q' });

    const t = (type === 'movie' || type === 'tv') ? type : 'movie';
    const qn = normQuery(q);
    const key = `tmdb:${t}:${qn}`;

    const cached = cacheGet(key);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).json(cached);
    }

    const url = new URL(`https://api.themoviedb.org/3/search/${t}`);
    url.searchParams.set('query', String(q).trim());
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('page', '1');

    if (v3) url.searchParams.set('api_key', v3);

    const headers = { Accept: 'application/json' };
    if (v4) headers.Authorization = `Bearer ${v4}`;

    const r = await fetch(url.toString(), { headers });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const j = await r.json();
    cacheSet(key, j);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(j);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}
