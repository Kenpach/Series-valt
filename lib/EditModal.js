import { useEffect, useMemo, useState } from 'react';
import { modalCardStyle, modalOverlayStyle } from './modalStyles';

const STATUS = [
  { v: 'planned',   label: 'Quero ver' },
  { v: 'watching',  label: 'Assistindo' },
  { v: 'completed', label: 'Concluído' },
  { v: 'paused',    label: 'Pausado' },
  { v: 'dropped',   label: 'Dropado' },
];

const MOVIE_CATEGORIES = ['Ação', 'Comédia', 'Drama', 'Terror', 'Ficção', 'Romance', 'Documentário', 'Animação', 'Outros'];

const STREAMING = [
  { v: '',            label: '—' },
  { v: 'crunchyroll', label: 'Crunchyroll' },
  { v: 'netflix',     label: 'Netflix' },
  { v: 'prime',       label: 'Prime Video' },
  { v: 'max',         label: 'Max' },
  { v: 'disney',      label: 'Disney+' },
  { v: 'youtube',     label: 'YouTube' },
  { v: 'other',       label: 'Outro' },
];

const STREAMING_COLORS = {
  crunchyroll: '#f47521',
  netflix:     '#e50914',
  prime:       '#00a8e0',
  max:         '#002be2',
  disney:      '#0063e5',
  youtube:     '#ff0000',
  other:       'var(--accent)',
};

function searchUrl(provider, title) {
  const q = encodeURIComponent(title || '');
  if (provider === 'crunchyroll') return `https://www.crunchyroll.com/pt-br/search?q=${q}`;
  if (provider === 'netflix')     return `https://www.netflix.com/search?q=${q}`;
  if (provider === 'prime')       return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`;
  if (provider === 'max')         return `https://play.max.com/search?q=${q}`;
  if (provider === 'disney')      return `https://www.disneyplus.com/search/${q}`;
  if (provider === 'youtube')     return `https://www.youtube.com/results?search_query=${q}`;
  return '';
}

export default function EditModal({ open, item, mediaType, onClose, onSave }) {
  const [status,        setStatus]        = useState('watching');
  const [season,        setSeason]        = useState(1);
  const [episode,       setEpisode]       = useState(1);
  const [movieCategory, setMovieCategory] = useState('Outros');
  const [movieWatched,  setMovieWatched]  = useState(false);
  const [watchProvider, setWatchProvider] = useState('');
  const [watchUrl,      setWatchUrl]      = useState('');
  const [displayName,   setDisplayName]   = useState('');

  useEffect(() => {
    if (!open) return;
    setStatus(item?.status ?? (mediaType === 'MOVIE' ? 'planned' : 'watching'));
    setSeason(item?.season_number ?? 1);
    setEpisode(item?.episode_number ?? 1);
    setMovieCategory(item?.movie_category ?? 'Outros');
    setMovieWatched(Boolean(item?.movie_watched ?? false));
    setWatchProvider(item?.watch_provider ?? '');
    setWatchUrl(item?.watch_url ?? '');
    setDisplayName(item?.display_name ?? '');
  }, [open, item, mediaType]);

  const baseTitle = useMemo(() => item?.catalog_items?.title ?? '', [item]);
  const title     = useMemo(() => (displayName?.trim() ? displayName.trim() : baseTitle), [displayName, baseTitle]);

  if (!open) return null;

  function safeInt(v, fallback) {
    const n = parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  async function save() {
    const payload = {
      status,
      display_name:   (displayName && displayName.trim()) ? displayName.trim() : null,
      season_number:  mediaType === 'MOVIE' ? null : safeInt(season, 1),
      episode_number: mediaType === 'MOVIE' ? null : safeInt(episode, 1),
      movie_category: mediaType === 'MOVIE' ? movieCategory : null,
      movie_watched:  mediaType === 'MOVIE' ? Boolean(movieWatched) : false,
      watch_provider: watchProvider || null,
      watch_url:      watchUrl || null,
      finished_at:    status === 'completed' ? new Date().toISOString() : null,
    };
    await onSave(payload);
    onClose?.();
  }

  async function remove() {
    const ok = typeof window !== 'undefined' ? window.confirm('Remover este item da sua lista?') : false;
    if (!ok) return;
    await onSave({ __delete: true });
    onClose?.();
  }

  const streamingColor = STREAMING_COLORS[watchProvider] || 'var(--accent)';

  const divider = <div style={{ height:1, background:'var(--border)', margin:'4px 0 2px' }} />;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalCardStyle, maxHeight:'90vh', overflowY:'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:4 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:17, lineHeight:1.3, color:'var(--text)' }}>{title}</div>
            <div style={{ fontSize:11, color:'var(--faint)', fontWeight:600, marginTop:4, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              {mediaType === 'MOVIE' ? 'Filme' : mediaType === 'SERIES' ? 'Série' : 'Anime'}
            </div>
          </div>
          <button className="btn secondary" onClick={onClose} type="button" style={{ flexShrink:0 }}>✕</button>
        </div>

        {divider}

        {/* Display name */}
        <label className="modalLabel">Nome exibido (opcional)</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={baseTitle || 'Nome...'} />

        {/* Status */}
        <label className="modalLabel">Status</label>
        <div className="chips">
          {STATUS.map((s) => (
            <button key={s.v} type="button" className={status === s.v ? 'chip active' : 'chip'} onClick={() => setStatus(s.v)}>
              {s.label}
            </button>
          ))}
        </div>

        {divider}

        {/* Streaming */}
        <label className="modalLabel">Onde assistir</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {STREAMING.map((p) => (
            <button key={p.v} type="button"
              onClick={() => setWatchProvider(p.v)}
              style={{
                padding:'7px 12px', borderRadius:999, border:`1px solid ${watchProvider === p.v ? (STREAMING_COLORS[p.v] || 'var(--accent)') : 'var(--border)'}`,
                background: watchProvider === p.v ? `rgba(${watchProvider === p.v ? '0,0,0,0' : '0,0,0,0'})` : 'rgba(11,18,32,0.5)',
                backgroundColor: watchProvider === p.v ? `${STREAMING_COLORS[p.v] || 'var(--accent)'}22` : '',
                color: watchProvider === p.v ? (STREAMING_COLORS[p.v] || 'var(--accent)') : 'var(--muted)',
                fontFamily:'var(--font-body)', fontWeight:700, fontSize:12, cursor:'pointer',
                transition:'all 200ms ease',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
          <input className="input" style={{ flex:1, minWidth:200 }} value={watchUrl} onChange={(e) => setWatchUrl(e.target.value)} placeholder="https://..." />
          <button type="button" className="btn secondary" onClick={() => { const u = searchUrl(watchProvider, title); if (u) setWatchUrl(u); }} disabled={!watchProvider} style={{ whiteSpace:'nowrap', fontSize:12 }}>
            🔗 Gerar link
          </button>
          {watchUrl ? (
            <a className="btn secondary" href={watchUrl} target="_blank" rel="noreferrer" style={{ fontSize:12 }}>▶ Abrir</a>
          ) : null}
        </div>

        {divider}

        {/* Movie-specific */}
        {mediaType === 'MOVIE' ? (
          <>
            <label className="modalLabel">Categoria</label>
            <div className="chips">
              {MOVIE_CATEGORIES.map((c) => (
                <button key={c} type="button" className={movieCategory === c ? 'chip active' : 'chip'} onClick={() => setMovieCategory(c)}>{c}</button>
              ))}
            </div>

            <label className="modalLabel">Assistido?</label>
            <div className="row">
              <button type="button" className={movieWatched ? 'btn' : 'btn secondary'} onClick={() => setMovieWatched(true)}>✓ Assistido</button>
              <button type="button" className={!movieWatched ? 'btn secondary' : 'btn secondary'} onClick={() => setMovieWatched(false)}>Não visto</button>
            </div>
          </>
        ) : (
          <>
            <label className="modalLabel">Temporada</label>
            <div className="stepper">
              <button className="stepBtn" type="button" onClick={() => setSeason(Math.max(1, safeInt(season, 1) - 1))}>−</button>
              <div className="stepVal">T{safeInt(season, 1)}</div>
              <button className="stepBtn" type="button" onClick={() => setSeason(safeInt(season, 1) + 1)}>+</button>
              <input className="input" style={{ width:100, flex:'none' }} value={season} onChange={(e) => setSeason(e.target.value)} inputMode="numeric" />
            </div>

            <label className="modalLabel">Episódio</label>
            <div className="stepper">
              <button className="stepBtn" type="button" onClick={() => setEpisode(Math.max(1, safeInt(episode, 1) - 1))}>−</button>
              <div className="stepVal">E{safeInt(episode, 1)}</div>
              <button className="stepBtn" type="button" onClick={() => setEpisode(safeInt(episode, 1) + 1)}>+</button>
              <input className="input" style={{ width:100, flex:'none' }} value={episode} onChange={(e) => setEpisode(e.target.value)} inputMode="numeric" />
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ height:8 }} />
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center', paddingTop:8, borderTop:'1px solid var(--border)' }}>
          <button className="btn danger" type="button" onClick={remove}>🗑 Remover</button>
          <div className="row">
            <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
            <button className="btn" type="button" onClick={save}>Salvar →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
