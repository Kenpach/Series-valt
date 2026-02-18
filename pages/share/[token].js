import { useMemo, useState } from 'react';
import { modalCardStyle, modalOverlayStyle } from '../../lib/modalStyles';

function statusLabel(s) {
  return ({ planned: 'Quero ver', watching: 'Assistindo', completed: 'Concluído', paused: 'Pausado', dropped: 'Dropado' }[s] || s);
}

const STATUS_TABS = [
  { v: 'ALL',       label: 'Todos' },
  { v: 'planned',   label: 'Quero ver' },
  { v: 'watching',  label: 'Assistindo' },
  { v: 'completed', label: 'Concluído' },
  { v: 'paused',    label: 'Pausado' },
  { v: 'dropped',   label: 'Dropado' },
];

const MOVIE_CATEGORIES = ['ALL', 'Ação', 'Comédia', 'Drama', 'Terror', 'Ficção', 'Romance', 'Documentário', 'Animação', 'Outros'];

export async function getServerSideProps(ctx) {
  try {
    const token = ctx.params?.token;
    const url   = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!token || !url || !anon) {
      return { props: { initial: null, initialError: 'Link inválido.' } };
    }

    const rpc = `${url.replace(/\/$/, '')}/rest/v1/rpc/get_shared_list`;
    const r   = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
      body: JSON.stringify({ p_token: token }),
    });

    const j = await r.json().catch(() => null);
    if (!j?.ok) {
      return { props: { initial: null, initialError: 'Link inválido ou revogado.' } };
    }

    // Read filter params from query string so the shared link pre-applies filters
    const initialType   = ctx.query?.type   || 'ALL';
    const initialStatus = ctx.query?.status || 'ALL';

    return { props: { initial: j, initialError: '', initialType, initialStatus } };
  } catch {
    return { props: { initial: null, initialError: 'Erro carregando compartilhamento.', initialType: 'ALL', initialStatus: 'ALL' } };
  }
}

export default function SharedPage({ initial, initialError, initialType = 'ALL', initialStatus = 'ALL' }) {
  const [filterType,          setFilterType]          = useState(initialType);
  const [filterStatus,        setFilterStatus]        = useState(initialStatus);
  const [filterMovieCategory, setFilterMovieCategory] = useState('ALL');
  const [movieCatOpen,        setMovieCatOpen]        = useState(false);

  if (initialError) {
    return (
      <div className="container">
        <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, textAlign:'center' }}>
          <div style={{ fontSize:48, opacity:0.25 }}>🔒</div>
          <h2 style={{ fontWeight:900, fontSize:22 }}>Link inválido</h2>
          <p style={{ color:'var(--muted)', fontSize:14 }}>{initialError}</p>
          <a className="btn secondary" href="/login">Entrar na sua conta</a>
        </div>
      </div>
    );
  }

  const data  = initial;
  const items = data?.items || [];

  const allowedTypes = useMemo(() => {
    const t = [];
    if (data?.share_anime)  t.push('ANIME');
    if (data?.share_series) t.push('SERIES');
    if (data?.share_movie)  t.push('MOVIE');
    return t;
  }, [data?.share_anime, data?.share_series, data?.share_movie]);

  const typeTabs = useMemo(() => {
    const tabs = [{ v: 'ALL', label: 'Todos' }];
    for (const t of allowedTypes) {
      tabs.push({ v: t, label: t === 'ANIME' ? '⭐ Anime' : t === 'SERIES' ? '📺 Série' : '🎬 Filme' });
    }
    return tabs;
  }, [allowedTypes]);

  const filtered = useMemo(() => items
    .filter((it) => filterType === 'ALL' ? true : it.media_type === filterType)
    .filter((it) => filterStatus === 'ALL' ? true : it.status === filterStatus)
    .filter((it) => {
      if (filterType !== 'MOVIE') return true;
      if (filterMovieCategory === 'ALL') return true;
      return (it.movie_category ?? 'Outros') === filterMovieCategory;
    }),
  [items, filterType, filterStatus, filterMovieCategory]);

  const groups = {
    ANIME:  filtered.filter((i) => i.media_type === 'ANIME'),
    SERIES: filtered.filter((i) => i.media_type === 'SERIES'),
    MOVIE:  filtered.filter((i) => i.media_type === 'MOVIE'),
  };

  function section(label, arr) {
    if (!arr.length) return null;
    return (
      <div key={label}>
        <div className="sectionTitle">{label}</div>
        <div className="grid">
          {arr.map((it) => {
            const isMovie = it.media_type === 'MOVIE';
            const se      = !isMovie && (it.season_number || it.episode_number)
              ? `T${it.season_number ?? '-'} · E${it.episode_number ?? '-'}` : '';

            const dotColors = { planned:'var(--muted)', watching:'#6366f1', completed:'#22c55e', paused:'#f59e0b', dropped:'#ef4444' };
            const dotColor  = dotColors[it.status] || 'var(--muted)';

            return (
              <div key={it.id} className="posterCard">
                {it.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.cover_image_url} alt="cover" className="posterImg" loading="lazy" />
                ) : (
                  <div className="posterImg" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--faint)', fontSize:24 }}>✦</div>
                )}
                <div className="posterMeta">
                  <div className="posterTitle">{it.title}</div>
                  <div className="posterSub">
                    <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:dotColor, marginRight:5, verticalAlign:'middle', boxShadow: it.status !== 'planned' ? `0 0 6px ${dotColor}` : 'none' }} />
                    {statusLabel(it.status)}{se ? ` · ${se}` : ''}
                  </div>
                  {it.watch_url ? (
                    <div style={{ marginTop:7 }}>
                      <a className="btn secondary small" href={it.watch_url} target="_blank" rel="noreferrer">▶ Assistir</a>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* ── Header ── */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:20, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow:'0 4px 20px rgba(99,102,241,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✦</div>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-0.02em', background:'linear-gradient(135deg,#eef0fa 40%,#8892b0 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              {data?.public_title || 'Lista compartilhada'}
            </h1>
            <span style={{ fontSize:12, color:'var(--muted)', marginTop:3, display:'block' }}>Somente visualização</span>
          </div>
        </div>
        <a className="btn secondary" href="/login">Entrar</a>
      </header>

      {/* ── Filters ── */}
      <div className="card fadeUp" style={{ marginBottom:20 }}>
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontWeight:800, fontSize:11, letterSpacing:'0.14em', color:'var(--faint)', textTransform:'uppercase' }}>Filtros</span>
          <span className="badge">{filtered.length} itens</span>
        </div>

        {/* Type tabs — only show types that are shared */}
        <div className="chips" style={{ marginBottom:10 }}>
          {typeTabs.map((t) => (
            <button key={t.v} type="button"
              className={filterType === t.v ? 'chip active' : 'chip'}
              onClick={() => { setFilterType(t.v); if (t.v !== 'MOVIE') setFilterMovieCategory('ALL'); }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Status tabs */}
        <div className="chips">
          {STATUS_TABS.map((s) => (
            <button key={s.v} type="button"
              className={filterStatus === s.v ? 'chip active' : 'chip'}
              onClick={() => setFilterStatus(s.v)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Movie category button */}
        {filterType === 'MOVIE' && allowedTypes.includes('MOVIE') ? (
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <span style={{ fontWeight:700, fontSize:12, color:'var(--faint)' }}>Categoria</span>
            <button className="btn secondary" type="button" onClick={() => setMovieCatOpen(true)} style={{ fontSize:12 }}>
              {filterMovieCategory === 'ALL' ? 'Todas categorias' : filterMovieCategory}
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Empty result ── */}
      {filtered.length === 0 ? (
        <div className="card fadeIn">
          <div className="emptyState" style={{ padding:'48px 24px' }}>
            <div className="emptyIcon">🔎</div>
            <h3>Nenhum item encontrado</h3>
            <p>Tente mudar os filtros.</p>
          </div>
        </div>
      ) : null}

      {/* ── Content ── */}
      {filterType === 'ALL' ? (
        <>
          {data?.share_anime  ? section('ANIME',  groups.ANIME)  : null}
          {data?.share_series ? section('SÉRIE',  groups.SERIES) : null}
          {data?.share_movie  ? section('FILME',  groups.MOVIE)  : null}
        </>
      ) : (
        <>
          {filterType === 'ANIME'  ? section('ANIME',  groups.ANIME)  : null}
          {filterType === 'SERIES' ? section('SÉRIE',  groups.SERIES) : null}
          {filterType === 'MOVIE'  ? section('FILME',  groups.MOVIE)  : null}
        </>
      )}

      {/* ── Movie category modal ── */}
      {movieCatOpen ? (
        <div style={modalOverlayStyle} onClick={() => setMovieCatOpen(false)}>
          <div style={{ ...modalCardStyle, width:'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:900 }}>Categorias de Filme</div>
              <button className="btn secondary" type="button" onClick={() => setMovieCatOpen(false)}>✕</button>
            </div>
            <div style={{ height:12 }} />
            <div className="chips">
              {MOVIE_CATEGORIES.map((c) => (
                <button key={c} type="button"
                  className={filterMovieCategory === c ? 'chip active' : 'chip'}
                  onClick={() => { setFilterMovieCategory(c); setMovieCatOpen(false); }}>
                  {c === 'ALL' ? 'Todas categorias' : c}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
