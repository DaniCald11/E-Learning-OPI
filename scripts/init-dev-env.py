"""Create a private local SQL Server credential without overwriting configuration."""
import os
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
path = root / '.env'
try:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print('.env existente: se conserva sin cambios.')
else:
    with os.fdopen(fd, 'w') as stream:
        stream.write(f'MSSQL_SA_PASSWORD=Aa1!{secrets.token_hex(24)}\nMSSQL_PORT=1433\n')
    print('.env creado con credencial aleatoria local; no se muestra su valor.')
