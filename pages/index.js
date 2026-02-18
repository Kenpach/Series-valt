import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import EditModal from '../lib/EditModal';
import ShareModal from '../lib/ShareModal';
import { modalCardStyle, modalOverlayStyle } from '../lib/modalStyles';

function statusLabel(s) {
  return ({ planned: 'Quero ver', watching: 'Assistindo', completed: 'Concluído', paused: 'Pausado', dropped: 'Dropado' }[s] || s);
}

const TYPE_TABS = [
  { v: 'ALL', label: 'Todos' },
  { v: 'ANIME', label: 'Anime' },
  { v: 'SERIES', label: 'Série' },
  { v: 'MOVIE', label: 'Filme' },
];

const STATUS_TABS = [
  { v: 'ALL', label: 'Todos' },
  { v: 'planned', label: 'Quero ver' },
  { v: 'watching', label: 'Assistindo' },
  { v: 'completed', label: 'Concluído' },
  { v: 'paused', label: 'Pausado' },
  { v: 'dropped', label: 'Dropado' },
];

const MOVIE_CATEGORIES = [
  'ALL',
  'Ação',
  'Comédia',
  'Drama',
  'Terror',
  'Ficção',
  'Romance',
  'Documentário',
  'Animação',
  'Outros',
];

export default function Home() {
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMovieCategory, setFilterMovieCategory] = useState('ALL');
  const [movieCatOpen, setMovieCatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      if (!data?.session) window.location.href = '/login';
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) window.location.href = '/login';
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

  // hide infra details in UI
  const header = useMemo(() => '', []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function saveEdit(payload) {
    if (!editItem?.id) return;

    if (payload && payload.__delete) {
      const { error } = await supabase
        .from('user_list_items')
        .delete()
        .eq('id', editItem.id);
      if (!error) {
        setEditOpen(false);
        setEditItem(null);
        await load();
      }
      return;
    }

    const { error } = await supabase
      .from('user_list_items')
      .update(payload)
      .eq('id', editItem.id);
    if (!error) {
      setEditOpen(false);
      setEditItem(null);
      await load();
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Minha lista</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <span className="badge">{session?.user?.email}</span>
            {header ? <span className="badge">{header}</span> : null}
          </div>
        </div>
        <div className="row">
          <a className="btn" href="/search">Pesquisar</a>
          <button className="btn secondary" type="button" onClick={() => setShareOpen(true)}>Compartilhar</button>
          <button className="btn secondary" onClick={signOut}>Sair</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading ? <p>Carregando...</p> : null}

      {/* Filters */}
      {!loading && items.length > 0 ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>Filtros</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>{items.length} itens</div>
          </div>
          <div style={{ height: 10 }} />

          <div className="chips">
            {TYPE_TABS.map((t) => (
              <button
                key={t.v}
                type="button"
                className={filterType === t.v ? 'chip active' : 'chip'}
                onClick={() => {
                  setFilterType(t.v);
                  if (t.v !== 'MOVIE') setFilterMovieCategory('ALL');
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ height: 10 }} />

          <div className="chips">
            {STATUS_TABS.map((s) => (
              <button key={s.v} type="button" className={filterStatus === s.v ? 'chip active' : 'chip'} onClick={() => setFilterStatus(s.v)}>
                {s.label}
              </button>
            ))}
          </div>

          {filterType === 'MOVIE' ? (
            <>
              <div style={{ height: 10 }} />
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.85 }}>Categoria</div>
                <button className="btn secondary" type="button" onClick={() => setMovieCatOpen(true)}>
                  {filterMovieCategory === 'ALL' ? 'Todas categorias' : filterMovieCategory}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>Sua lista está vazia.</p>
          <p style={{ opacity: 0.85, marginTop: 6 }}>Busque algo pra adicionar em ANIME, SÉRIE ou FILME.</p>
          <div style={{ height: 10 }} />
          <a className="btn" href="/search">Pesquisar</a>
          <div style={{ height: 10 }} />
          <div className="row">
            <button className="btn secondary" onClick={() => (window.location.href = '/search?q=Naruto')}>Naruto</button>
            <button className="btn secondary" onClick={() => (window.location.href = '/search?q=Breaking%20Bad')}>Breaking Bad</button>
            <button className="btn secondary" onClick={() => (window.location.href = '/search?q=Batman')}>Batman</button>
          </div>
        </div>
      ) : null}

      {(() => {
        const filtered = items
          .filter((it) => filterType === 'ALL' ? true : ((it.catalog_items?.media_type ?? 'ANIME') === filterType))
          .filter((it) => filterStatus === 'ALL' ? true : (it.status === filterStatus))
          .filter((it) => {
            if (filterType !== 'MOVIE') return true;
            if (filterMovieCategory === 'ALL') return true;
            const cat = (it.movie_category ?? 'Outros');
            return cat === filterMovieCategory;
          })
          .slice()
          .sort((a, b) => {
            const ta = (a.display_name || a.catalog_items?.title || '').toLocaleLowerCase('pt-BR');
            const tb = (b.display_name || b.catalog_items?.title || '').toLocaleLowerCase('pt-BR');
            return ta.localeCompare(tb, 'pt-BR');
          });

        if (!loading && filtered.length === 0 && items.length > 0) {
          return (
            <div className="card">
              <p style={{ margin: 0 }}>Nenhum item encontrado para esse filtro.</p>
            </div>
          );
        }

        // When type=ALL, keep 3 sections; otherwise show one grid
        const typesToShow = filterType === 'ALL' ? ['ANIME', 'SERIES', 'MOVIE'] : [filterType];

        return typesToShow.map((type) => {
          const label = type === 'ANIME' ? 'ANIME' : (type === 'SERIES' ? 'SÉRIE' : 'FILME');
          const subset = filtered.filter((it) => (it.catalog_items?.media_type ?? 'ANIME') === type);
          if (subset.length === 0) return null;

          return (
            <div key={type}>
              <div className="sectionTitle">{label}</div>
              <div className="grid">
                {subset.map((it) => {
                  const c = it.catalog_items;
                  const cover = c?.cover_image_url;
                  const isMovie = (c?.media_type === 'MOVIE');
                  const se = (!isMovie && (it.season_number || it.episode_number)) ? `T${it.season_number ?? '-'} · E${it.episode_number ?? '-'}` : '';
                  return (
                    <div
                      key={it.id}
                      className="posterCard"
                      role="button"
                      tabIndex={0}
                      onClick={() => { setEditItem(it); setEditOpen(true); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setEditItem(it); setEditOpen(true); } }}
                      style={{ cursor: 'pointer' }}
                      title="Editar"
                    >
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="cover" className="posterImg" />
                      ) : (
                        <div className="posterImg" style={{ background: '#0b1220' }} />
                      )}
                      <div className="posterMeta">
                        <div className="posterTitle">{it.display_name || c?.title}</div>
                        <div className="posterSub">{statusLabel(it.status)}{se ? ` · ${se}` : ''}</div>
                        {it.watch_url ? (
                          <div style={{ marginTop: 6 }}>
                            <a
                              className="btn secondary small"
                              href={it.watch_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Assistir
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}
      {/* Movie category picker */}
      {movieCatOpen ? (
        <div style={modalOverlayStyle} onClick={() => setMovieCatOpen(false)}>
          <div style={{ ...modalCardStyle, width: 'min(520px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 900 }}>Categorias (Filme)</div>
              <button className="btn secondary" type="button" onClick={() => setMovieCatOpen(false)}>Fechar</button>
            </div>
            <div style={{ height: 10 }} />
            <div className="chips">
              {MOVIE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={filterMovieCategory === c ? 'chip active' : 'chip'}
                  onClick={() => { setFilterMovieCategory(c); setMovieCatOpen(false); }}
                >
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
