import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const TMDB_POSTER = 'https://image.tmdb.org/t/p/w500';

export default function Search() {
  const [session, setSession] = useState(null);
  const [mode, setMode]       = useState('anime');
  const [q, setQ]             = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState('');
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      if (!data?.session) window.location.href = '/login';
    });
  }, []);

  const userId = session?.user?.id;

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
    setResults([]);
    try {
      if (mode === 'anime') {
        const r = await fetch(`/api/anilist/search?q=${encodeURIComponent(q.trim())}`);
        if (!r.ok) throw new Error('AniList search failed');
        setResults(await r.json());
      } else {
        const t = mode === 'series' ? 'tv' : 'movie';
        const r = await fetch(`/api/tmdb/search?type=${t}&q=${encodeURIComponent(q.trim())}`);
        if (!r.ok) throw new Error('TMDB search failed');
        const data = await r.json();
        setResults((data?.results ?? []).map((it) => ({
          _src: 'tmdb',
          id: it.id,
          siteUrl: `https://www.themoviedb.org/${t}/${it.id}`,
          title: it.name || it.title || 'Sem título',
          cover: it.poster_path ? `${TMDB_POSTER}${it.poster_path}` : null,
        })));
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

    const provider  = m._src === 'tmdb' ? 'tmdb' : 'anilist';
    const mediaType = mode === 'anime' ? 'ANIME' : mode === 'series' ? 'SERIES' : 'MOVIE';

    const { data: cat, error: catErr } = await supabase
      .from('catalog_items')
      .upsert({ provider, provider_id: m.id, media_type: mediaType, title: m.title, cover_image_url: m.cover, site_url: m.siteUrl }, { onConflict: 'provider,provider_id' })
      .select('id').single();

    if (catErr) { setBusy(false); return setMsg(catErr.message); }

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

    const { error: listErr } = await supabase.from('user_list_items').upsert(payload, { onConflict: 'user_id,catalog_item_id' }).select('id').single();
    setBusy(false);
    if (listErr) return setMsg(listErr.message);

    setAddedIds((prev) => new Set([...prev, `${m._src ?? 'anilist'}:${m.id}`]));
    if (opts.after === 'catalog') window.location.href = '/';
    else setMsg(`"${m.title}" adicionado à lista!`);
  }

  const modeOptions = [
    { v: 'anime',  label: 'Anime',  icon: '⭐' },
    { v: 'series', label: 'Série',  icon: '📺' },
    { v: 'movie',  label: 'Filme',  icon: '🎬' },
  ];

  return (
    <div className="container">
      {/* ── Header ── */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:20, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow:'0 4px 20px rgba(99,102,241,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔍</div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-0.02em', background:'linear-gradient(135deg,#eef0fa 40%,#8892b0 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Pesquisar
          </h1>
        </div>
        <a className="btn secondary" href="/">← Voltar</a>
      </header>

      {/* ── Search panel ── */}
      <div className="card fadeUp" style={{ marginBottom:24 }}>
        {/* Mode switcher */}
        <div style={{ display:'flex', gap:6, marginBottom:18 }}>
          {modeOptions.map((o) => (
            <button key={o.v} type="button"
              className={mode === o.v ? 'btn' : 'btn secondary'}
              style={{ gap:6 }}
              onClick={() => { setMode(o.v); setResults([]); setMsg(''); }}>
              <span>{o.icon}</span> {o.label}
            </button>
          ))}
        </div>

        <form className="row" onSubmit={runSearch} style={{ gap:10 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Buscar ${mode === 'anime' ? 'anime' : mode === 'series' ? 'série' : 'filme'}…`}
            style={{ flex:1, minWidth:200 }} autoFocus />
          <button className="btn" disabled={busy} type="submit" style={{ whiteSpace:'nowrap' }}>
            {busy ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {msg ? (
          <div className="fadeIn" style={{ marginTop:12, padding:'10px 14px', borderRadius:10, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', fontSize:13, fontWeight:600 }}>
            {msg}
          </div>
        ) : null}
      </div>

      {/* ── Results ── */}
      {results.length > 0 ? (
        <>
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <span style={{ fontWeight:700, fontSize:13, color:'var(--muted)' }}>{results.length} resultados</span>
          </div>
          <div className="grid searchGrid">
            {results.map((m) => {
              const uid  = `${m._src ?? 'anilist'}:${m.id}`;
              const done = addedIds.has(uid);
              return (
                <div key={uid} className="posterCard fadeUp">
                  {m.cover ? (
                    <img src={m.cover} alt="cover" className="posterImg" loading="lazy" />
                  ) : (
                    <div className="posterImg" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--faint)', fontSize:28 }}>✦</div>
                  )}
                  <div className="posterMeta">
                    <div className="posterTitle">{m.title}</div>
                    <div style={{ height:10 }} />
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      <button className={done ? 'btn secondary small' : 'btn small'} disabled={busy}
                        onClick={() => addToList(m, { after: 'continue' })} style={{ justifyContent:'center' }}>
                        {done ? '✓ Adicionado' : '+ Adicionar'}
                      </button>
                      <button className="btn secondary small" disabled={busy}
                        onClick={() => addToList(m, { after: 'catalog' })} style={{ justifyContent:'center' }}>
                        Ir ao catálogo →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {!busy && results.length === 0 && q && !msg ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--muted)' }}>
          <div style={{ fontSize:36, opacity:0.3, marginBottom:12 }}>🔍</div>
          <p style={{ fontWeight:600 }}>Nenhum resultado. Tente outro termo.</p>
        </div>
      ) : null}
    </div>
  );
}
