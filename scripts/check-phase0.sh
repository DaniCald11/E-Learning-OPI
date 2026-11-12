#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for file in specs.md README.md docs/analysis.md docs/implementation-plan.md docs/architecture.md docs/decisions/0001-foundation.md docs/decisions/0002-academic-integrity.md docs/development.md .env.example; do
  test -s "$file" || { echo "Falta $file" >&2; exit 1; }
done
# Solo interpola una credencial efímera para validar sintaxis; no arranca servicios.
MSSQL_SA_PASSWORD="$(python3 -c 'import secrets; print("Aa1!" + secrets.token_hex(24))')" docker compose config --quiet
python3 - <<'PY'
import pathlib, subprocess
for name in subprocess.check_output(['git', 'ls-files', '-z'], text=True).split('\0'):
    if name and pathlib.Path(name).name == '.env':
        raise SystemExit('Un archivo .env está versionado')
print('Documentación y Compose de Fase 0 válidos. Esta comprobación no ejecuta pruebas de aplicación.')
PY
