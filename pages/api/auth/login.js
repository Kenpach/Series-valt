import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter (per container)
const attempts = global.__LOGIN_ATTEMPTS__ || (global.__LOGIN_ATTEMPTS__ = new Map());

function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  if (Array.isArray(xf) && xf.length) return xf[0];
  return req.socket?.remoteAddress || 'unknown';
}

function keyFor(ip, email) {
  return `${ip}::${String(email || '').trim().toLowerCase()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body || {};
    const em = String(email || '').trim().toLowerCase();
    const pw = String(password || '');
    if (!em || !pw) return res.status(400).json({ error: 'Missing email/password' });

    const ip = getIp(req);
    const k = keyFor(ip, em);

    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 min
    const lockMs = 10 * 60 * 1000;   // 10 min
    const maxAttempts = 6;

    const cur = attempts.get(k) || { count: 0, firstAt: now, lockedUntil: 0 };

    // Clear old window
    if (now - cur.firstAt > windowMs) {
      cur.count = 0;
      cur.firstAt = now;
      cur.lockedUntil = 0;
    }

    if (cur.lockedUntil && now < cur.lockedUntil) {
      const retryAfter = Math.ceil((cur.lockedUntil - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many attempts', locked: true, retryAfterSeconds: retryAfter });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return res.status(500).json({ error: 'Server misconfigured' });

    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pw });

    if (error) {
      cur.count += 1;
      if (cur.count >= maxAttempts) {
        cur.lockedUntil = now + lockMs;
      }
      attempts.set(k, cur);

      return res.status(401).json({
        error: error.message,
        attempts: cur.count,
        locked: Boolean(cur.lockedUntil && now < cur.lockedUntil),
        retryAfterSeconds: cur.lockedUntil ? Math.ceil((cur.lockedUntil - now) / 1000) : 0,
      });
    }

    // Success: reset counter
    attempts.delete(k);

    const session = data?.session;
    if (!session) return res.status(500).json({ error: 'No session returned' });

    return res.status(200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
