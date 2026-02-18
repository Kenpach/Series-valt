import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [resetState, setResetState] = useState('idle'); // idle|sending|sent|error

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) window.location.href = '/';
    });
  }, []);

  async function signIn(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setMsg(error.message);
    window.location.href = '/';
  }

  async function signUp(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg('Conta criada. Se o e-mail de confirmação estiver habilitado, verifique sua caixa de entrada.');
  }

  return (
    <div className="container">
      <h1>Anime Tracker — Login</h1>
      <p className="badge">MVP (email/senha)</p>

      <div className="card" style={{ maxWidth: 720, width: '100%' }}>
        <form onSubmit={signIn}>
          <label>Email</label>
          <input
            className="input"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onInput={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
          <div style={{ height: 10 }} />
          <label>Senha</label>
          <input
            className="input"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onInput={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
          />
          <div style={{ height: 14 }} />

          <div className="row">
            <button className="btn" disabled={loading} type="submit">{loading ? '...' : 'Entrar'}</button>
            <button className="btn secondary" disabled={loading} onClick={signUp} type="button">Criar conta</button>
          </div>

          <div style={{ height: 10 }} />
          <button
            className={`btn ghost ${resetState === 'sending' ? 'sending' : resetState === 'sent' ? 'sent' : resetState === 'error' ? 'error' : ''}`}
            disabled={loading || resetState === 'sending'}
            type="button"
            onClick={async () => {
              setResetState('sending');
              try {
                const em = (email || '').trim();
                if (!em) {
                  setResetState('error');
                  return setMsg('Informe seu e-mail para enviar o link de redefinição.');
                }
                const redirectTo = `${window.location.origin}/reset`;
                const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo });
                if (error) throw error;
                setResetState('sent');
                setMsg('Enviamos um e-mail com o link para redefinir sua senha.');
              } catch (e) {
                setResetState('error');
                setMsg(`Erro ao enviar reset: ${e?.message || String(e)}`);
              } finally {
                setTimeout(() => setResetState('idle'), 2500);
              }
            }}
          >
            {resetState === 'sending' ? 'Enviando…' : resetState === 'sent' ? 'Enviado ✓' : 'Esqueci minha senha'}
          </button>

          {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}
