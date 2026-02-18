import { useEffect, useMemo, useState } from 'react';
import { modalCardStyle, modalOverlayStyle } from './modalStyles';
import { supabase } from './supabaseClient';

export default function ShareModal({ open, onClose }) {
  const [shareAnime, setShareAnime] = useState(true);
  const [shareSeries, setShareSeries] = useState(true);
  const [shareMovie, setShareMovie] = useState(true);
  const [publicTitle, setPublicTitle] = useState('');
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');

  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);

  useEffect(() => {
    if (!open) return;
    setMsg('');
    setLink('');
  }, [open]);

  if (!open) return null;

  async function generate() {
    setMsg('');
    const { data, error } = await supabase.rpc('upsert_share_link', {
      p_share_anime: shareAnime,
      p_share_series: shareSeries,
      p_share_movie: shareMovie,
      p_public_title: publicTitle,
    });
    if (error) return setMsg(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    const token = row?.token;
    if (!token) return setMsg('Erro gerando link');

    const url = `${origin}/share/${token}`;
    setLink(url);
    setMsg('Link gerado.');
  }

  async function revoke() {
    setMsg('');
    const ok = window.confirm('Revogar link compartilhado?');
    if (!ok) return;
    const { error } = await supabase.rpc('revoke_share_link');
    if (error) return setMsg(error.message);
    setLink('');
    setMsg('Link revogado.');
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setMsg('Copiado.');
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalCardStyle, width: 'min(620px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Compartilhar perfil</div>
          <button className="btn secondary" type="button" onClick={onClose}>Fechar</button>
        </div>

        <label className="modalLabel">Título público (opcional)</label>
        <input className="input" value={publicTitle} onChange={(e) => setPublicTitle(e.target.value)} placeholder="Ex: Lista do Arlley" />

        <label className="modalLabel">O que compartilhar</label>
        <div className="chips">
          <button type="button" className={shareAnime ? 'chip active' : 'chip'} onClick={() => setShareAnime((v) => !v)}>ANIME</button>
          <button type="button" className={shareSeries ? 'chip active' : 'chip'} onClick={() => setShareSeries((v) => !v)}>SÉRIE</button>
          <button type="button" className={shareMovie ? 'chip active' : 'chip'} onClick={() => setShareMovie((v) => !v)}>FILME</button>
        </div>

        <div style={{ height: 12 }} />

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn" type="button" onClick={generate}>Gerar/Atualizar link</button>
          <button className="btn secondary" type="button" onClick={revoke}>Revogar</button>
        </div>

        <div style={{ height: 12 }} />

        <label className="modalLabel">Link</label>
        <div className="row" style={{ alignItems: 'center' }}>
          <input className="input" value={link} readOnly placeholder="Clique em gerar" />
          <button className="btn secondary" type="button" onClick={copy} disabled={!link}>Copiar</button>
        </div>

        {msg ? <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.9 }}>{msg}</p> : null}
      </div>
    </div>
  );
}
