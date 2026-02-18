import { useMemo, useState } from 'react';
import { modalCardStyle, modalOverlayStyle } from '../../lib/modalStyles';

function statusLabel(s) {
  return ({ planned: 'Quero ver', watching: 'Assistindo', completed: 'Concluído', paused: 'Pausado', dropped: 'Dropado' }[s] || s);
}

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

export async function getServerSideProps(ctx) {
  try {
    const token = ctx.params?.token;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!token || !url || !anon) {
      return { props: { initial: null, initialError: 'Link inválido.' } };
    }

    const rpc = `${url.replace(/\/$/, '')}/rest/v1/rpc/get_shared_list`;
    const r = await fetch(rpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ p_token: token }),
    });

    const j = await r.json().catch(() => null);
    if (!j?.ok) {
      return { props: { initial: null, initialError: 'Link inválido ou revogado.' } };
    }

    return { props: { initial: j, initialError: '' } };
  } catch (e) {
    return { props: { initial: null, initialError: 'Erro carregando compartilhamento.' } };
  }
}

export default function SharedPage({ initial, initialError }) {
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMovieCategory, setFilterMovieCategory] = useState('ALL');
  const [movieCatOpen, setMovieCatOpen] = useState(false);

  if (initialError) {
    return (
      <div className="container">
        <h1>Compartilhamento</h1>
        <div className="card"><p style={{ margin: 0 }}>{initialError}</p></div>
      </div>
    );
  }

  const data = initial;
  const items = data?.items || [];

  const allowedTypes = useMemo(() => {
    const t = [];
    if (data?.share_anime) t.push('ANIME');
    if (data?.share_series) t.push('SERIES');
    if (data?.share_movie) t.push('MOVIE');
    return t;
  }, [data?.share_anime, data?.share_series, data?.share_movie]);

  const typeTabs = useMemo(() => {
    const tabs = [{ v: 'ALL', label: 'Todos' }];
    for (const t of allowedTypes) {
      tabs.push({ v: t, label: t === 'ANIME' ? 'Anime' : (t === 'SERIES' ? 'Série' : 'Filme') });
    }
    return tabs;
  }, [allowedTypes]);

  const filtered = useMemo(() => {
    return items
      .filter((it) => {
        if (filterType === 'ALL') return true;
        return it.media_type === filterType;
      })
      .filter((it) => (filterStatus === 'ALL' ? true : it.status === filterStatus))
      .filter((it) => {
        if (filterType !== 'MOVIE') return true;
        if (filterMovieCategory === 'ALL') return true;
        return (it.movie_category ?? 'Outros') === filterMovieCategory;
      });
  }, [items, filterType, filterStatus, filterMovieCategory]);

  const groups = {
    ANIME: filtered.filter((i) => i.media_type === 'ANIME'),
    SERIES: filtered.filter((i) => i.media_type === 'SERIES'),
    MOVIE: filtered.filter((i) => i.media_type === 'MOVIE'),
  };

  function section(label, arr) {
    if (!arr.length) return null;
    return (
      <>
        <div className="sectionTitle">{label}</div>
        <div className="grid">
          {arr.map((it) => {
            const isMovie = it.media_type === 'MOVIE';
            const se = (!isMovie && (it.season_number || it.episode_number)) ? `T${it.season_number ?? '-'} · E${it.episode_number ?? '-'}` : '';
            return (
              <div key={it.id} className="posterCard">
                {it.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.cover_image_url} alt="cover" className="posterImg" />
                ) : (
                  <div className="posterImg" style={{ background: '#0b1220' }} />
                )}
                <div className="posterMeta">
                  <div className="posterTitle">{it.title}</div>
                  <div className="posterSub">{statusLabel(it.status)}{se ? ` · ${se}` : ''}</div>
                  {it.watch_url ? (
                    <div style={{ marginTop: 6 }}>
                      <a className="btn secondary small" href={it.watch_url} target="_blank" rel="noreferrer">Assistir</a>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>{data?.public_title || 'Minha lista'}</h1>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>Somente visualização</div>
        </div>
        <a className="btn secondary" href="/login">Entrar</a>
      </div>

      <div style={{ height: 14 }} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>Filtros</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>{filtered.length} itens</div>
        </div>
        <div style={{ height: 10 }} />

        <div className="chips">
          {typeTabs.map((t) => (
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
            <button
              key={s.v}
              type="button"
              className={filterStatus === s.v ? 'chip active' : 'chip'}
              onClick={() => setFilterStatus(s.v)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {filterType === 'MOVIE' && allowedTypes.includes('MOVIE') ? (
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

      {filterType === 'ALL' ? (
        <>
          {data?.share_anime ? section('ANIME', groups.ANIME) : null}
          {data?.share_series ? section('SÉRIE', groups.SERIES) : null}
          {data?.share_movie ? section('FILME', groups.MOVIE) : null}
        </>
      ) : (
        <>
          {filterType === 'ANIME' ? section('ANIME', groups.ANIME) : null}
          {filterType === 'SERIES' ? section('SÉRIE', groups.SERIES) : null}
          {filterType === 'MOVIE' ? section('FILME', groups.MOVIE) : null}
        </>
      )}
    </div>
  );
}
