import { cacheGet, cacheSet, normQuery } from '../../../lib/serverCache';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

export default async function handler(req, res) {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length < 2) return res.status(400).json({ error: 'Missing q' });

    const qn = normQuery(q);
    const key = `anilist:anime:${qn}`;

    const cached = cacheGet(key);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).json(cached);
    }

    const query = `query ($search: String) {
      Page(page: 1, perPage: 12) {
        media(search: $search, type: ANIME) {
          id
          siteUrl
          title { romaji english native }
          coverImage { large medium }
        }
      }
    }`;

    const r = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { search: String(q).trim() } })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const data = await r.json();
    const media = data?.data?.Page?.media ?? [];

    const mapped = media.map((m) => ({
      _src: 'anilist',
      id: m.id,
      siteUrl: m.siteUrl,
      title: m?.title?.romaji || m?.title?.english || m?.title?.native || 'Sem título',
      cover: m?.coverImage?.large || m?.coverImage?.medium || null,
    }));

    cacheSet(key, mapped);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json(mapped);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message ?? e) });
  }
}
