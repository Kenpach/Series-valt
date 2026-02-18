export default async function handler(req, res) {
  try {
    const { token } = req.query;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) return res.status(500).json({ ok: false, error: 'supabase_not_configured' });
    if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });

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

    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
