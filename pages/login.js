import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [resetState, setResetState] = useState('idle');
  const [tab, setTab] = useState('signin');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) window.location.href = '/';
    });
  }, []);

  function setMessage(text, type = 'info') {
    setMsg({ text, type });
  }

  async function signIn(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setMessage(error.message, 'error');
    window.location.href = '/';
  }

  async function signUp(e) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return setMessage(error.message, 'error');
    setMessage('Conta criada! Verifique sua caixa de entrada para confirmar.', 'success');
  }

  async function resetPassword() {
    setResetState('sending');
    try {
      const em = email.trim();
      if (!em) {
        setResetState('error');
        return setMessage('Informe seu e-mail para enviar o link de redefinição.', 'error');
      }
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/reset`,
      });
      if (error) throw error;
      setResetState('sent');
      setMessage('Link enviado! Verifique seu e-mail.', 'success');
    } catch (e) {
      setResetState('error');
      setMessage(`Erro: ${e?.message || String(e)}`, 'error');
    } finally {
      setTimeout(() => setResetState('idle'), 3000);
    }
  }

  const msgStyles = {
    error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   color: '#f87171' },
    success: { bg: 'rgba(34,197,94,0.12)',    border: 'rgba(34,197,94,0.35)',   color: '#4ade80' },
    info:    { bg: 'rgba(99,102,241,0.12)',   border: 'rgba(99,102,241,0.35)',  color: '#a5b4fc' },
  };

  const ms = msgStyles[msg.type] || msgStyles.info;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 980 }} className="fadeUp">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 22,
          alignItems: 'start',
        }}>
          {/* Info */}
          <div style={{
            textAlign: 'left',
            padding: 8,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 60, height: 60, borderRadius: 18,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
              marginBottom: 18, fontSize: 28,
            }}>✦</div>

            <h1 style={{
              fontSize: 34, fontWeight: 950, letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #eef0fa 30%, #8892b0 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: 10,
            }}>
              Series Vault
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 18 }}>Sua lista, do seu jeito.</p>

            <div style={{ color: 'var(--faint)', fontSize: 13, lineHeight: 1.7 }}>
              <div style={{ marginBottom: 8, fontWeight: 900, color: 'rgba(238,240,250,0.92)' }}>O que é?</div>
              <div>
                Um app simples pra você organizar o que quer assistir e o que já está vendo — <b>Anime</b>, <b>Séries</b> e <b>Filmes</b> — sem planilha.
              </div>

              <div style={{ marginTop: 12, fontWeight: 900, color: 'rgba(238,240,250,0.92)' }}>Objetivo</div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                <li>Manter seu progresso (status, temporada/episódio) e facilitar voltar de onde parou.</li>
                <li>Buscar títulos rapidamente e adicionar em 1 clique.</li>
                <li>Compartilhar sua lista com um link público (opcional e controlado).</li>
              </ul>

              <div style={{ marginTop: 12 }}>
                <b>Privacidade:</b> sua lista é privada por padrão. Compartilhamento só quando você gerar um link.
              </div>

              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--faint)' }}>
                Series Vault — MVP v1
              </div>
            </div>
          </div>

          {/* Login card */}
          <div className="card" style={{ padding: 28 }}>
            {/* Tab switcher */}
            <div style={{
              display: 'flex', gap: 4,
              background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 24,
            }}>
              {[["signin", "Entrar"], ["signup", "Criar conta"]].map(([t, label]) => (
                <button key={t} type="button" onClick={() => setTab(t)} style={{
                  flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                  transition: 'all 200ms ease',
                  background: tab === t ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--muted)',
                  boxShadow: tab === t ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                }}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={tab === 'signin' ? signIn : signUp}>
              <div style={{ marginBottom: 14 }}>
                <label className="modalLabel">E-mail</label>
                <input className="input" type="email" name="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label className="modalLabel">Senha</label>
                <input className="input" name="password"
                  autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  type="password" placeholder="••••••••" />
              </div>
              <button className="btn" disabled={loading} type="submit"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}>
                {loading ? 'Carregando…' : tab === 'signin' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>

            <div style={{ marginTop: 10 }}>
              <button
                className={`btn ghost ${resetState}`}
                disabled={loading || resetState === 'sending'}
                type="button" onClick={resetPassword}
                style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginTop: 6 }}
              >
                {resetState === 'sending' ? 'Enviando…' : resetState === 'sent' ? '✓ Link enviado' : 'Esqueci minha senha'}
              </button>
            </div>

            {msg.text ? (
              <div className="fadeIn" style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 10,
                background: ms.bg, border: `1px solid ${ms.border}`, color: ms.color,
                fontSize: 13, fontWeight: 600, lineHeight: 1.5,
              }}>
                {msg.text}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
