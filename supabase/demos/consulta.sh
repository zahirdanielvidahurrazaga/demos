#!/bin/bash
# Consulta SQL a la base de Be Fit Lab (solo lectura!) o a la de Demos, con
# los tokens del llavero ("Supabase CLI" / "Supabase DEMOS"). Sin llaves aquí.
# uso: q.sh <befit|demos> <archivo.sql|-> ; imprime JSON
REF=$([ "$1" = befit ] && echo fifaowaiokauhuqklzwe || echo qwqrbckivrkmeykiukug)
SVC=$([ "$1" = befit ] && echo "Supabase CLI" || echo "Supabase DEMOS")
SQL=$([ "$2" = - ] && cat || cat "$2")
python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))' <<<"$SQL" > ${TMPDIR:-/tmp}/consulta-demos.json
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $(security find-generic-password -s "$SVC" -w)" \
  -H "Content-Type: application/json" --data @${TMPDIR:-/tmp}/consulta-demos.json
