import os
import subprocess

os.chdir('/home/ubuntu/.openclaw/workspace/mvp/anime-tracker-web')

def run(cmd):
    p = subprocess.run(cmd, text=True)
    if p.returncode != 0:
        raise SystemExit(p.returncode)

run(['sudo','docker','build','-t','anime-tracker-web:latest','.'])
subprocess.run(['sudo','docker','rm','-f','anime-web'], text=True)
run([
    'sudo','docker','run','-d',
    '--name','anime-web',
    '-p','3000:3000',
    '--network','supabase_default',
    '--env-file','/home/ubuntu/.openclaw/workspace/mvp/anime-tracker-web/.env',
    'anime-tracker-web:latest'
])
print('deployed')
