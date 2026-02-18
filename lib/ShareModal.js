import { useEffect, useMemo, useState } from 'react';
import { modalCardStyle, modalOverlayStyle } from './modalStyles';
import { supabase } from './supabaseClient';

export default function ShareModal({ open, onClose }) {
  const [shareAnime,  setShareAnime]  = useState(true);
  const [shareSeries, setShareSeries] = useState(true);
  const [shareMovie,  setShareMovie]  = useState(true);
  const [publicTitle, setPublicTitle] = useState('');
  const [link, setLink]               = useState('');
  const [msg,  setMsg]                = useState({ text:'', type:'' });
  const [busy, setBusy]               = useState(false);

  const origin = useMemo(() => (typeof window !== 'undefined' ? window.location.origin : ''), []);

  useEffect(() => {
    if (!open) return;
    setMsg({ text:'', type:'' });
    setLink('');
  }, [open]);

  if (!open) return null;

  function setMessage(text, type = 'info') { setMsg({ text, type }); }

  async function generate() {
    setBusy(true);
    setMsg({ text:'', type:'' });
    const { data, error } = await supabase.rpc('upsert_share_link', {
      p_share_anime: shareAnime, p_share_series: shareSeries, p_share_movie: shareMovie, p_public_title: publicTitle,
    });
    setBusy(false);
    if (error) return setMessage(error.message, 'error');
    const row   = Array.isArray(data) ? data[0] : data;
    const token = row?.token;
    if (!token) return setMessage('Erro gerando link.', 'error');
    setLink(`${origin}/share/${token}`);
    setMessage('Link gerado com sucesso!', 'success');
  }

  async function revoke() {
    if (!window.confirm('Revogar link compartilhado?')) return;
    setBusy(true);
    const { error } = await supabase.rpc('revoke_share_link');
    setBusy(false);
    if (error) return setMessage(error.message, 'error');
    setLink('');
    setMessage('Link revogado.', 'info');
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setMessage('Link copiado!', 'success');
    setTimeout(() => setMsg({ text:'', type:'' }), 2000);
  }

  const msgStyles = {
    error:   { bg:'rgba(239,68,68,0.1)',   border:'rgba(239,68,68,0.3)',   color:'#f87171' },
    success: { bg:'rgba(34,197,94,0.1)',    border:'rgba(34,197,94,0.3)',   color:'#4ade80' },
    info:    { bg:'rgba(99,102,241,0.1)',   border:'rgba(99,102,241,0.3)',  color:'#a5b4fc' },
  };
  const ms = msgStyles[msg.type] || msgStyles.info;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalCardStyle, width:'min(560px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:17 }}>Compartilhar perfil</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>Gere um link público para sua lista</div>
          </div>
          <button className="btn secondary" type="button" onClick={onClose} style={{ flexShrink:0 }}>✕</button>
        </div>

        <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />

        {/* Public title */}
        <label className="modalLabel">Título público (opcional)</label>
        <input className="input" value={publicTitle} onChange={(e) => setPublicTitle(e.target.value)} placeholder="Ex: Lista do Arlley" />

        {/* What to share */}
        <label className="modalLabel">O que compartilhar</label>
        <div className="chips">
          {[
            { v: shareAnime,  set: setShareAnime,  label:'⭐ Anime' },
            { v: shareSeries, set: setShareSeries, label:'📺 Série' },
            { v: shareMovie,  set: setShareMovie,  label:'🎬 Filme' },
          ].map(({ v, set, label }) => (
            <button key={label} type="button" className={v ? 'chip active' : 'chip'} onClick={() => set((x) => !x)}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ height:1, background:'var(--border)', margin:'16px 0 12px' }} />

        {/* Actions */}
        <div className="row" style={{ justifyContent:'space-between' }}>
          <button className="btn" type="button" onClick={generate} disabled={busy}>
            {busy ? 'Gerando…' : '🔗 Gerar / Atualizar link'}
          </button>
          <button className="btn secondary" type="button" onClick={revoke} disabled={busy} style={{ color:'#f87171', borderColor:'rgba(239,68,68,0.3)' }}>
            Revogar
          </button>
        </div>

        {/* Link display */}
        {link ? (
          <div className="fadeIn" style={{ marginTop:14 }}>
            <label className="modalLabel">Link gerado</label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" value={link} readOnly style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:12, color:'var(--muted)' }} />
              <button className="btn" type="button" onClick={copy} style={{ whiteSpace:'nowrap', fontSize:13 }}>
                📋 Copiar
              </button>
            </div>
          </div>
        ) : null}

        {msg.text ? (
          <div className="fadeIn" style={{ marginTop:14, padding:'10px 14px', borderRadius:10, background:ms.bg, border:`1px solid ${ms.border}`, color:ms.color, fontSize:13, fontWeight:600 }}>
            {msg.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}
