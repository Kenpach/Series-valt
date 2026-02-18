import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500';

async function anilistSearch(q) {
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

  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { search: q } })
  });
  if (!res.ok) throw new Error('AniList search failed');
  const data = await res.json();
  return data?.data?.Page?.media ?? [];
}

function pickTitle(t) {
  return t?.romaji || t?.english || t?.native || 'Sem título';
}

export default function Search() {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('anime'); // anime | series | movie
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // status / temporada / episodio são definidos no card (catálogo), não na busca

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      if (!data?.session) window.location.href = '/login';
    });
  }, []);

  const userId = session?.user?.id;

  // optional: preload q from querystring (?q=Naruto)
  useEffect(() => {
    const m = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const qq = m?.get('q');
    if (qq && !q) setQ(qq);
  }, []);

  async function runSearch(e) {
    e?.preventDefault?.();
    if (!q.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      if (mode === 'anime') {
        const r = await fetch(`/api/anilist/search?q=${encodeURIComponent(q.trim())}`);
        if (!r.ok) throw new Error('AniList search failed');
        const mapped = await r.json();
        setResults(mapped);
      } else {
        const t = mode === 'series' ? 'tv' : 'movie';
        const r = await fetch(`/api/tmdb/search?type=${t}&q=${encodeURIComponent(q.trim())}`);
        if (!r.ok) throw new Error('TMDB search failed');
        const data = await r.json();
        const mapped = (data?.results ?? []).map((it) => ({
          _src: 'tmdb',
          id: it.id,
          siteUrl: `https://www.themoviedb.org/${t}/${it.id}`,
          title: it.name || it.title || 'Sem título',
          cover: it.poster_path ? `${TMDB_POSTER}${it.poster_path}` : null
        }));
        setResults(mapped);
      }
    } catch (err) {
      setMsg(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  }

  async function addToList(m, opts = { after: 'continue' }) {
    if (!userId) return;
    setBusy(true);
    setMsg('');

    const provider = m._src === 'tmdb' ? 'tmdb' : 'anilist';
    const mediaType = mode === 'anime' ? 'ANIME' : (mode === 'series' ? 'SERIES' : 'MOVIE');

    const title = m.title;
    const cover = m.cover;

    // upsert catalog
    const { data: cat, error: catErr } = await supabase
      .from('catalog_items')
      .upsert({
        provider,
        provider_id: m.id,
        media_type: mediaType,
        title,
        cover_image_url: cover,
        site_url: m.siteUrl
      }, { onConflict: 'provider,provider_id' })
      .select('id')
      .single();

    if (catErr) {
      setBusy(false);
      return setMsg(catErr.message);
    }

    // default interaction: create as T1 E1 (or movie defaults)
    const payload = {
      user_id: userId,
      catalog_item_id: cat.id,
      status: mediaType === 'MOVIE' ? 'planned' : 'watching',
      finished_at: null,
      season_number: mediaType === 'MOVIE' ? null : 1,
      episode_number: mediaType === 'MOVIE' ? null : 1,
      movie_category: null,
      movie_watched: false,
    };

    const { error: listErr } = await supabase
      .from('user_list_items')
      .upsert(payload, { onConflict: 'user_id,catalog_item_id' })
      .select('id')
      .single();

    setBusy(false);
    if (listErr) return setMsg(listErr.message);

    if (opts.after === 'catalog') window.location.href = '/';
    else setMsg('Adicionado.');
  }

  const api = useMemo(() => '', []);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Pesquisar</h1>
          {api ? <span className="badge">{api}</span> : null}
        </div>
        <a className="btn secondary" href="/">Voltar</a>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <button className={mode === 'anime' ? 'btn' : 'btn secondary'} type="button" onClick={() => setMode('anime')}>ANIME</button>
          <button className={mode === 'series' ? 'btn' : 'btn secondary'} type="button" onClick={() => setMode('series')}>SÉRIE</button>
          <button className={mode === 'movie' ? 'btn' : 'btn secondary'} type="button" onClick={() => setMode('movie')}>FILME</button>
        </div>

        <form className="row" onSubmit={runSearch}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." style={{ flex: 1, minWidth: 220 }} />
          <button className="btn" disabled={busy} type="submit">{busy ? '...' : 'Buscar'}</button>
        </form>

        <div style={{ height: 12 }} />

        {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
      </div>

      <div style={{ height: 12 }} />

      <div className="grid searchGrid">
        {results.map((m) => {
          return (
            <div key={`${m._src}:${m.id}`} className="posterCard">
              {m.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.cover} alt="cover" className="posterImg" />
              ) : (
                <div className="posterImg" style={{ background: '#0b1220' }} />
              )}
              <div className="posterMeta">
                <div className="posterTitle">{m.title}</div>
                <div style={{ height: 10 }} />
                <div className="row">
                  <button className="btn" disabled={busy} onClick={() => addToList(m, { after: 'continue' })}>
                    Adicionar
                  </button>
                  <button className="btn secondary" disabled={busy} onClick={() => addToList(m, { after: 'catalog' })}>
                    Adicionar e ir pro catálogo
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
