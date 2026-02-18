import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import EditModal from '../lib/EditModal';
import ShareModal from '../lib/ShareModal';
import { modalCardStyle, modalOverlayStyle } from '../lib/modalStyles';

function statusLabel(s) {
  return ({ planned: 'Quero ver', watching: 'Assistindo', completed: 'Concluído', paused: 'Pausado', dropped: 'Dropado' }[s] || s);
}

const TYPE_TABS  = [{ v: 'ALL', label: 'Todos' }, { v: 'ANIME', label: 'Anime' }, { v: 'SERIES', label: 'Série' }, { v: 'MOVIE', label: 'Filme' }];
const STATUS_TABS = [{ v: 'ALL', label: 'Todos' }, { v: 'planned', label: 'Quero ver' }, { v: 'watching', label: 'Assistindo' }, { v: 'completed', label: 'Concluído' }, { v: 'paused', label: 'Pausado' }, { v: 'dropped', label: 'Dropado' }];
const MOVIE_CATEGORIES = ['ALL', 'Ação', 'Comédia', 'Drama', 'Terror', 'Ficção', 'Romance', 'Documentário', 'Animação', 'Outros'];

export default function Home() {
  const [session, setSession]   = useState(null);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType]               = useState('ALL');
  const [filterStatus, setFilterStatus]           = useState('ALL');
  const [filterMovieCategory, setFilterMovieCategory] = useState('ALL');
  const [movieCatOpen, setMovieCatOpen] = useState(false);
  const [shareOpen, setShareOpen]       = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);
  const userId = session?.user?.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      if (!data?.session) window.location.href = '/login';
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) window.location.href = '/login';
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  async function load() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('user_list_items')
      .select('id,status,display_name,season_number,episode_number,movie_category,movie_watched,watch_provider,watch_url,updated_at, catalog_items ( id,media_type,title,cover_image_url,site_url,provider_id )')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [userId]);

  // Presence heartbeat + online count (last 60 minutes)
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    async function beat() {
      try {
        // upsert presence
        await supabase.from('user_presence').upsert({ user_id: userId, last_seen_at: new Date().toISOString() });
        // fetch count
        const { data, error } = await supabase.rpc('get_online_count', { p_window_minutes: 60 });
        if (!error && alive) setOnlineCount(data);
      } catch {
        // ignore (RLS/network); UI will just not show the count
      }
    }

    beat();
    const t = setInterval(beat, 45000);
    return () => { alive = false; clearInterval(t); };
  }, [userId]);

  async function signOut() { await supabase.auth.signOut(); }

  async function saveEdit(payload) {
    if (!editItem?.id) return;
    if (payload?.__delete) {
      const { error } = await supabase.from('user_list_items').delete().eq('id', editItem.id);
      if (!error) { setEditOpen(false); setEditItem(null); await load(); }
      return;
    }
    const { error } = await supabase.from('user_list_items').update(payload).eq('id', editItem.id);
    if (!error) { setEditOpen(false); setEditItem(null); await load(); }
  }

  const filtered = useMemo(() => items
    .filter((it) => filterType === 'ALL' ? true : (it.catalog_items?.media_type ?? 'ANIME') === filterType)
    .filter((it) => filterStatus === 'ALL' ? true : it.status === filterStatus)
    .filter((it) => {
      if (filterType !== 'MOVIE') return true;
      if (filterMovieCategory === 'ALL') return true;
      return (it.movie_category ?? 'Outros') === filterMovieCategory;
    })
    .slice()
    .sort((a, b) => {
      const ta = (a.display_name || a.catalog_items?.title || '').toLocaleLowerCase('pt-BR');
      const tb = (b.display_name || b.catalog_items?.title || '').toLocaleLowerCase('pt-BR');
      return ta.localeCompare(tb, 'pt-BR');
    }),
  [items, filterType, filterStatus, filterMovieCategory]);

  const stats = useMemo(() => ({
    anime:    items.filter((i) => i.catalog_items?.media_type === 'ANIME').length,
    series:   items.filter((i) => i.catalog_items?.media_type === 'SERIES').length,
    movies:   items.filter((i) => i.catalog_items?.media_type === 'MOVIE').length,
    watching: items.filter((i) => i.status === 'watching').length,
  }), [items]);

  const typesToShow = filterType === 'ALL' ? ['ANIME', 'SERIES', 'MOVIE'] : [filterType];

  const statusDotStyle = {
    planned: { bg: 'var(--muted)',  glow: '' },
    watching: { bg: '#6366f1', glow: '0 0 6px #6366f1' },
    completed: { bg: '#22c55e', glow: '0 0 6px #22c55e' },
    paused: { bg: '#f59e0b', glow: '0 0 6px #f59e0b' },
    dropped: { bg: '#ef4444', glow: '0 0 6px #ef4444' },
  };

  function StatusDot({ status }) {
    const s = statusDotStyle[status] || statusDotStyle.planned;
    return <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:s.bg, boxShadow:s.glow, marginRight:5, verticalAlign:'middle' }} />;
  }

  return (
    <div className="container">
      {/* ── Header ── */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:20, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow:'0 4px 20px rgba(99,102,241,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✦</div>
          <div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-0.02em', background:'linear-gradient(135deg,#eef0fa 40%,#8892b0 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Minha lista
            </h1>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
              <span className="badge" style={{ display:'inline-flex' }}>{session?.user?.email}</span>
              {typeof onlineCount === 'number' ? (
                <span className="badge" style={{ display:'inline-flex' }}>Online (1h): {onlineCount}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="row">
          <a className="btn" href="/search">🔍 Pesquisar</a>
          <button className="btn secondary" type="button" onClick={() => setShareOpen(true)}>Compartilhar</button>
          <button className="btn secondary" onClick={signOut}>Sair</button>
        </div>
      </header>

      {/* ── Stats ── */}
      {!loading && items.length > 0 ? (
        <div className="fadeUp" style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Anime',      value:stats.anime,    color:'#6366f1' },
            { label:'Série',      value:stats.series,   color:'#a855f7' },
            { label:'Filme',      value:stats.movies,   color:'#06b6d4' },
            { label:'Assistindo', value:stats.watching, color:'#22c55e' },
          ].map((s) => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:13, padding:'10px 16px', flex:'1 1 110px', backdropFilter:'blur(10px)' }}>
              <div style={{ width:4, height:28, borderRadius:4, background:s.color, boxShadow:`0 0 10px ${s.color}80` }} />
              <div>
                <div style={{ fontSize:22, fontWeight:900, lineHeight:1, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginTop:2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Loading ── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:36, opacity:0.3, marginBottom:12 }}>✦</div>
          <p style={{ fontWeight:600 }}>Carregando…</p>
        </div>
      ) : null}

      {/* ── Filters ── */}
      {!loading && items.length > 0 ? (
        <div className="card fadeUp" style={{ marginBottom:20 }}>
          <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontWeight:800, fontSize:11, letterSpacing:'0.14em', color:'var(--faint)', textTransform:'uppercase' }}>Filtros</span>
            <span className="badge">{filtered.length} / {items.length}</span>
          </div>
          <div className="chips" style={{ marginBottom:10 }}>
            {TYPE_TABS.map((t) => (
              <button key={t.v} type="button" className={filterType === t.v ? 'chip active' : 'chip'}
                onClick={() => { setFilterType(t.v); if (t.v !== 'MOVIE') setFilterMovieCategory('ALL'); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="chips">
            {STATUS_TABS.map((s) => (
              <button key={s.v} type="button" className={filterStatus === s.v ? 'chip active' : 'chip'} onClick={() => setFilterStatus(s.v)}>
                {s.label}
              </button>
            ))}
          </div>
          {filterType === 'MOVIE' ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight:700, fontSize:12, color:'var(--faint)', marginBottom:8 }}>Categoria</div>
              <button
                className="btn secondary"
                type="button"
                onClick={() => setMovieCatOpen(true)}
                style={{ fontSize:12, width: 'fit-content', maxWidth: '100%' }}
              >
                {filterMovieCategory === 'ALL' ? 'Todas categorias' : filterMovieCategory}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Empty state ── */}
      {!loading && items.length === 0 ? (
        <div className="card fadeUp">
          <div className="emptyState">
            <div className="emptyIcon">📺</div>
            <h3>Sua lista está vazia</h3>
            <p>Busque anime, séries ou filmes para adicionar à sua lista.</p>
            <a className="btn" href="/search" style={{ marginTop:4 }}>🔍 Pesquisar</a>
            <div className="row" style={{ justifyContent:'center' }}>
              {['Naruto', 'Breaking Bad', 'Batman'].map((q) => (
                <button key={q} className="btn secondary small" onClick={() => window.location.href = `/search?q=${encodeURIComponent(q)}`}>{q}</button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && items.length > 0 && filtered.length === 0 ? (
        <div className="card fadeIn">
          <div className="emptyState" style={{ padding:'40px 24px' }}>
            <div className="emptyIcon">🔎</div>
            <h3>Nenhum item encontrado</h3>
            <p>Tente mudar os filtros.</p>
          </div>
        </div>
      ) : null}

      {/* ── Poster grids ── */}
      {typesToShow.map((type) => {
        const label  = type === 'ANIME' ? 'ANIME' : type === 'SERIES' ? 'SÉRIE' : 'FILME';
        const subset = filtered.filter((it) => (it.catalog_items?.media_type ?? 'ANIME') === type);
        if (subset.length === 0) return null;
        return (
          <div key={type}>
            <div className="sectionTitle">{label}</div>
            <div className="grid">
              {subset.map((it) => {
                const c = it.catalog_items;
                const cover   = c?.cover_image_url;
                const isMovie = c?.media_type === 'MOVIE';
                const se = !isMovie && (it.season_number || it.episode_number) ? `T${it.season_number ?? '-'} · E${it.episode_number ?? '-'}` : '';
                return (
                  <div key={it.id} className="posterCard" role="button" tabIndex={0} style={{ cursor:'pointer' }}
                    onClick={() => { setEditItem(it); setEditOpen(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setEditItem(it); setEditOpen(true); } }}>
                    {cover
                      ? <img src={cover} alt="cover" className="posterImg" loading="lazy" />
                      : <div className="posterImg" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--faint)', fontSize:24 }}>✦</div>
                    }
                    <div className="posterMeta">
                      <div className="posterTitle">{it.display_name || c?.title}</div>
                      <div className="posterSub">
                        <StatusDot status={it.status} />
                        {statusLabel(it.status)}{se ? ` · ${se}` : ''}
                      </div>
                      {it.watch_url ? (
                        <div style={{ marginTop:7 }}>
                          <a className="btn secondary small" href={it.watch_url} target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}>▶ Assistir</a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Movie category modal ── */}
      {movieCatOpen ? (
        <div style={modalOverlayStyle} onClick={() => setMovieCatOpen(false)}>
          <div style={{ ...modalCardStyle, width:'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:900 }}>Categorias de Filme</div>
              <button className="btn secondary" type="button" onClick={() => setMovieCatOpen(false)}>Fechar</button>
            </div>
            <div style={{ height:12 }} />
            <div className="chips">
              {MOVIE_CATEGORIES.map((c) => (
                <button key={c} type="button" className={filterMovieCategory === c ? 'chip active' : 'chip'}
                  onClick={() => { setFilterMovieCategory(c); setMovieCatOpen(false); }}>
                  {c === 'ALL' ? 'Todas categorias' : c}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <EditModal
        open={editOpen}
        item={editItem}
        mediaType={editItem?.catalog_items?.media_type ?? 'ANIME'}
        onClose={() => { setEditOpen(false); setEditItem(null); }}
        onSave={saveEdit}
      />
    </div>
  );
}
