#!/usr/bin/env python3
"""Inspect PUNK routing without modifying anything or exposing secrets."""
import os
from pathlib import Path
import re
import subprocess
import tomllib
import urllib.error
import urllib.request
import json

root = Path('/home/runner/workspace')
config = root/'.replit'
try:
    parsed = tomllib.loads(config.read_text())
except Exception as e:
    print('ERROR .replit:',e)
    raise SystemExit(1)
ports=parsed.get('ports',[])
print('=== REPLIT CONFIG ===')
print('Run workflow:', parsed.get('workflows',{}).get('runButton'))
for p in ports:
    print('Port:',p.get('localPort'),'-> external',p.get('externalPort'))
print('=== LOCAL RESPONSES ===')
for port in sorted({p.get('localPort') for p in ports if isinstance(p.get('localPort'),int)} | {3000,4177}):
    for path in ('/api/punk/runtime','/api/x/me','/api/punk/launches'):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=2) as r:
                payload=r.read(350).decode('utf8','replace')
                print(f'port={port} path={path} HTTP={r.status} type={r.headers.get("Content-Type","")} body={payload[:220]}')
        except urllib.error.HTTPError as e:
            print(f'port={port} path={path} HTTP={e.code} body={e.read(100).decode("utf8","replace")!r}')
        except Exception as e:
            print(f'port={port} path={path} ERROR={type(e).__name__}: {e}')
print('=== LISTENING PROCESSES ===')
try:
    result=subprocess.run(['ss','-ltnp'],capture_output=True,text=True,timeout=5)
    for line in result.stdout.splitlines():
        if any(x in line for x in (':3000',':4177',':5000','LISTEN')):
            print(line[:300])
except Exception as e:
    print('ss unavailable:',e)
print('=== PREVIEW ===')
host=os.environ.get('REPLIT_DEV_DOMAIN','')
if host and re.fullmatch(r'[a-zA-Z0-9.-]+\.replit\.dev',host):
    try:
        with urllib.request.urlopen('https://'+host+'/api/punk/runtime',timeout=7) as response:
            print('External Preview HTTP',response.status,response.read(300).decode('utf8','replace'))
    except Exception as e:
        print('External Preview not verified:',type(e).__name__,str(e)[:150])
else:
    print('REPLIT_DEV_DOMAIN not available; open /api/punk/runtime in your .replit.dev Preview browser.')
