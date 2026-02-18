import os

src = '/home/ubuntu/.openclaw/workspace/secrets/inbox/tmdb.env'
dst = '/home/ubuntu/.openclaw/workspace/mvp/anime-tracker-web/.env'

v3 = None
v4 = None
with open(src, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line.startswith('TMDB_API_KEY='):
            v3 = line.split('=', 1)[1].strip()
        if line.startswith('CHAVE_DE_LEITURA_API='):
            v4 = line.split('=', 1)[1].strip()

if not v3 and not v4:
    raise SystemExit('TMDB_API_KEY or CHAVE_DE_LEITURA_API not found in tmdb.env')

with open(dst, 'r', encoding='utf-8') as f:
    lines = [ln.rstrip('\n') for ln in f]

lines = [ln for ln in lines if not (ln.startswith('TMDB_API_KEY=') or ln.startswith('TMDB_READ_TOKEN='))]
if v3:
    lines.append('TMDB_API_KEY=' + v3)
if v4:
    lines.append('TMDB_READ_TOKEN=' + v4)

with open(dst, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

os.chmod(dst, 0o600)
print('env updated')
