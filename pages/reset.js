import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => {
    return password.length >= 8 && password === password2 && !saving;
  }, [password, password2, saving]);

  useEffect(() => {
    // When user comes from the email link, Supabase triggers PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setReady(true);
      }
    });

    // Fallback: if session already exists (some browsers), allow immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setStatus('');

    if (password !== password2) return setStatus('As senhas não conferem.');
    if (password.length < 8) return setStatus('Use uma senha com pelo menos 8 caracteres.');

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus('Senha atualizada com sucesso. Você já pode entrar.');
      // Optional: redirect after success
      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err) {
      setStatus(`Erro ao atualizar senha: ${err?.message || String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Redefinir senha</h1>
        <p className="muted">Abra esta página a partir do link recebido por e-mail.</p>
        <p className="muted" style={{ marginTop: 6 }}>
          <a href="/login" style={{ textDecoration: 'underline', textUnderlineOffset: 3, color: 'rgba(255,255,255,.92)' }}>
            Voltar para o login
          </a>
        </p>

        {!ready ? (
          <p className="muted">Aguardando validação do link…</p>
        ) : (
          <form onSubmit={onSave}>
            <label className="label">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <label className="label">Confirmar nova senha</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button className="btn" disabled={!canSave}>
              {saving ? 'Salvando…' : 'Atualizar senha'}
            </button>
          </form>
        )}

        {status ? <p className="status">{status}</p> : null}
      </div>

      <style jsx>{`
        .page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b1220;color:#fff;}
        .card{width:min(520px,100%);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:18px;}
        h1{margin:0 0 8px;font-size:20px;}
        .muted{color:rgba(255,255,255,.75);margin:0 0 12px;}
        .label{display:block;margin:10px 0 6px;color:rgba(255,255,255,.85);font-size:13px;}
        input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.18);color:#fff;}
        .btn{margin-top:12px;width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(96,165,250,.35);background:linear-gradient(135deg,rgba(96,165,250,.98),rgba(59,130,246,.98));color:#fff;font-weight:800;}
        .btn:disabled{opacity:.5;}
        .status{margin:12px 0 0;color:rgba(255,255,255,.9);}
      `}</style>
    </div>
  );
}
