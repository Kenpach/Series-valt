import { useEffect, useMemo, useState } from 'react';
import { modalCardStyle, modalOverlayStyle } from './modalStyles';

const STATUS = [
  { v: 'planned', label: 'Quero ver' },
  { v: 'watching', label: 'Assistindo' },
  { v: 'completed', label: 'Concluído' },
  { v: 'paused', label: 'Pausado' },
  { v: 'dropped', label: 'Dropado' },
];

const MOVIE_CATEGORIES = [
  'Ação', 'Comédia', 'Drama', 'Terror', 'Ficção', 'Romance', 'Documentário', 'Animação', 'Outros'
];

const STREAMING = [
  { v: '', label: '—' },
  { v: 'crunchyroll', label: 'Crunchyroll' },
  { v: 'netflix', label: 'Netflix' },
  { v: 'prime', label: 'Prime Video' },
  { v: 'max', label: 'Max' },
  { v: 'disney', label: 'Disney+' },
  { v: 'youtube', label: 'YouTube' },
  { v: 'other', label: 'Outro' },
];

function searchUrl(provider, title) {
  const q = encodeURIComponent(title || '');
  if (provider === 'crunchyroll') return `https://www.crunchyroll.com/pt-br/search?q=${q}`;
  if (provider === 'netflix') return `https://www.netflix.com/search?q=${q}`;
  if (provider === 'prime') return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`;
  if (provider === 'max') return `https://play.max.com/search?q=${q}`;
  if (provider === 'disney') return `https://www.disneyplus.com/search/${q}`;
  if (provider === 'youtube') return `https://www.youtube.com/results?search_query=${q}`;
  return '';
}

export default function EditModal({ open, item, mediaType, onClose, onSave }) {
  const [status, setStatus] = useState('watching');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [movieCategory, setMovieCategory] = useState('Outros');
  const [movieWatched, setMovieWatched] = useState(false);
  const [watchProvider, setWatchProvider] = useState('');
  const [watchUrl, setWatchUrl] = useState('');
  const [displayName, setDisplayName] = useState('');

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
  const title = useMemo(() => (displayName?.trim() ? displayName.trim() : baseTitle), [displayName, baseTitle]);

  if (!open) return null;

  function safeInt(v, fallback) {
    const n = parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  async function save() {
    const payload = {
      status,
      display_name: (displayName && displayName.trim()) ? displayName.trim() : null,
      season_number: mediaType === 'MOVIE' ? null : safeInt(season, 1),
      episode_number: mediaType === 'MOVIE' ? null : safeInt(episode, 1),
      movie_category: mediaType === 'MOVIE' ? movieCategory : null,
      movie_watched: mediaType === 'MOVIE' ? Boolean(movieWatched) : false,
      watch_provider: watchProvider || null,
      watch_url: watchUrl || null,
      finished_at: status === 'completed' ? new Date().toISOString() : null,
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

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          <button className="btn secondary" onClick={onClose} type="button">Fechar</button>
        </div>

        <label className="modalLabel">Nome exibido (opcional)</label>
        <input
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={baseTitle || 'Nome...'}
        />

        <label className="modalLabel">Status</label>
        <div className="chips">
          {STATUS.map((s) => (
            <button key={s.v} type="button" className={status === s.v ? 'chip active' : 'chip'} onClick={() => setStatus(s.v)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Onde assistir (1 link por card) */}
        <label className="modalLabel">Onde assistir</label>
        <div className="row" style={{ alignItems: 'center' }}>
          <select className="input" style={{ maxWidth: 220 }} value={watchProvider} onChange={(e) => setWatchProvider(e.target.value)}>
            {STREAMING.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
          <input className="input" style={{ flex: 1, minWidth: 220 }} value={watchUrl} onChange={(e) => setWatchUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div style={{ height: 10 }} />
        <div className="row">
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              const u = searchUrl(watchProvider, title);
              if (u) setWatchUrl(u);
            }}
            disabled={!watchProvider}
          >
            Gerar link de busca
          </button>
          {watchUrl ? (
            <a className="btn secondary" href={watchUrl} target="_blank" rel="noreferrer">Abrir</a>
          ) : null}
        </div>

        {mediaType === 'MOVIE' ? (
          <>
            <label className="modalLabel">Categoria</label>
            <select className="input" value={movieCategory} onChange={(e) => setMovieCategory(e.target.value)}>
              {MOVIE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="modalLabel">Assistido?</label>
            <div className="row">
              <button type="button" className={movieWatched ? 'btn' : 'btn secondary'} onClick={() => setMovieWatched(true)}>
                Assistido
              </button>
              <button type="button" className={!movieWatched ? 'btn' : 'btn secondary'} onClick={() => setMovieWatched(false)}>
                Não visto
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="modalLabel">Temporada</label>
            <div className="stepper">
              <button className="stepBtn" type="button" onClick={() => setSeason(Math.max(1, safeInt(season, 1) - 1))}>−</button>
              <div className="stepVal">T{safeInt(season, 1)}</div>
              <button className="stepBtn" type="button" onClick={() => setSeason(safeInt(season, 1) + 1)}>+</button>
              <input className="input" style={{ width: 120 }} value={season} onChange={(e) => setSeason(e.target.value)} inputMode="numeric" />
            </div>

            <label className="modalLabel">Episódio</label>
            <div className="stepper">
              <button className="stepBtn" type="button" onClick={() => setEpisode(Math.max(1, safeInt(episode, 1) - 1))}>−</button>
              <div className="stepVal">E{safeInt(episode, 1)}</div>
              <button className="stepBtn" type="button" onClick={() => setEpisode(safeInt(episode, 1) + 1)}>+</button>
              <input className="input" style={{ width: 120 }} value={episode} onChange={(e) => setEpisode(e.target.value)} inputMode="numeric" />
            </div>
          </>
        )}

        <div style={{ height: 14 }} />
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn secondary" type="button" onClick={remove}>Remover</button>
          <div className="row">
            <button className="btn secondary" type="button" onClick={onClose}>Fechar</button>
            <button className="btn" type="button" onClick={save}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
