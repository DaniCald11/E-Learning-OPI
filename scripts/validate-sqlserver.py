"""Validate local SQL queries and volume persistence; touch only a unique test DB."""
from pathlib import Path
import secrets
import subprocess

root = Path(__file__).resolve().parents[1]
compose = ['docker', 'compose']

def run(args, **kwargs):
    return subprocess.run(args, cwd=root, check=True, **kwargs)

def query(sql):
    run(compose + ['exec', '-T', 'sqlserver', 'sh', '-c',
        'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd '
        '-S localhost -U sa -C -b -r 1 -w 120'], input=sql, text=True)

name = 'Phase0Validation_' + secrets.token_hex(8)
created = False
try:
    run(compose + ['up', '-d', '--wait', '--wait-timeout', '240', 'sqlserver'])
    query("SET NOCOUNT ON; SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(30)) AS ProductVersion, "
          "CAST(SERVERPROPERTY('Edition') AS nvarchar(60)) AS Edition; SELECT 1 AS Ready;\nGO\n")
    query(f'CREATE DATABASE [{name}];\nGO\n')
    created = True
    query(f'USE [{name}];\nGO\n'
          'CREATE TABLE dbo.PersistenceProbe (Id int NOT NULL PRIMARY KEY, Marker nvarchar(50) NOT NULL);\n'
          "INSERT dbo.PersistenceProbe VALUES (1, N'phase0-persisted');\nGO\n")
    before = subprocess.check_output(compose + ['ps', '-q', 'sqlserver'], cwd=root, text=True).strip()
    run(compose + ['up', '-d', '--force-recreate', '--wait', '--wait-timeout', '240', 'sqlserver'])
    after = subprocess.check_output(compose + ['ps', '-q', 'sqlserver'], cwd=root, text=True).strip()
    if not before or not after or before == after:
        raise RuntimeError('Container recreation was not demonstrated')
    query(f'USE [{name}];\nGO\n'
          "IF NOT EXISTS (SELECT 1 FROM dbo.PersistenceProbe WHERE Id=1 AND Marker=N'phase0-persisted') "
          "THROW 51000, 'Persistence check failed', 1;\n"
          "SELECT N'Persistence verified after container recreation' AS Result;\nGO\n")
    print('PASS: SQL queries, write/read and volume persistence after container recreation.')
finally:
    if created:
        query(f'USE master;\nGO\nALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;\n'
              f'DROP DATABASE [{name}];\nGO\n')
