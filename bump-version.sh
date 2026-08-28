#!/bin/zsh
# Stamp a new build id so every open hub reloads itself. Run before committing
# any change to index.html / entra-auth.js.
set -e
cd "$(dirname "$0")"
B=$(date +%Y-%m-%dT%H:%M)
python3 - "$B" <<'PY'
import sys,re,json
b=sys.argv[1]; p='index.html'; s=open(p).read()
s=re.sub(r"const HUB_BUILD='[^']*'", "const HUB_BUILD='"+b+"'", s, count=1)
open(p,'w').write(s); json.dump({'build':b},open('version.json','w'))
print('stamped',b)
PY
