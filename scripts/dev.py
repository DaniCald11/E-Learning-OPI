"""Local Phase 1 commands. Secrets stay in ignored files and process environments."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / '.data'
CONFIG = DATA / 'development.json'

def run(args, *, env=None, cwd=ROOT, **kwargs):
    if args[0] == 'npm' and os.name == 'nt':
        executable = shutil.which('npm.cmd', path=(env or os.environ).get('PATH'))
        if executable is None:
            raise FileNotFoundError('No se encontró npm.cmd. Instala Node.js 24 LTS y vuelve a abrir VS Code.')
        args = [executable, *args[1:]]
    return subprocess.run(args, cwd=cwd, env=env, check=True, **kwargs)

def sql_admin_connection(database='master'):
    values = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines() if line and not line.startswith('#'))
    # Generated local password is restricted to a connection-string-safe alphabet.
    password = values['MSSQL_SA_PASSWORD']
    quoted = '"' + password.replace('"', '""') + '"'
    return f'Server=127.0.0.1,{values.get("MSSQL_PORT", "1433")};Database={database};User Id=sa;Password={quoted};Encrypt=True;TrustServerCertificate=True'

def environment():
    env = os.environ.copy()
    sdk = Path('/workspace/.tools/dotnet')
    if sdk.exists():
        env['DOTNET_ROOT'] = str(sdk)
        env['PATH'] = str(sdk) + os.pathsep + env['PATH']
        env['DOTNET_CLI_HOME'] = '/workspace/.tools/dotnet-cli'
    env['DOTNET_CLI_TELEMETRY_OPTOUT'] = '1'
    env['npm_config_cache'] = str(DATA / 'npm-cache')
    env['ASPNETCORE_ENVIRONMENT'] = 'Development'
    env.update(json.loads(CONFIG.read_text()))
    return env

def setup():
    run([sys.executable, 'scripts/init-dev-env.py'])
    DATA.mkdir(mode=0o700, exist_ok=True)
    if not CONFIG.exists():
        values = {
            'BootstrapAdmin__Email': 'admin@example.test',
            'BootstrapAdmin__Password': 'Aa1!' + secrets.token_hex(24),
            'AppDatabasePassword': 'Aa1!' + secrets.token_hex(32),
            'DataProtection__Path': str(DATA / 'keys'),
            'Email__Provider': 'Development',
            'Email__OutboxPath': str(DATA / 'mail'),
            'App__PublicUrl': 'http://localhost:5173',
            'ASPNETCORE_URLS': 'http://127.0.0.1:5080',
            'Auth__RateLimit': '60'
        }
        with open(CONFIG, 'x', opener=lambda p, f: os.open(p, f, 0o600)) as stream:
            json.dump(values, stream, indent=2)
    print('Configuración local conservada en .data/development.json (privada).')
    env = environment()
    run(['dotnet', 'restore', 'backend/EduLearning.sln', '--locked-mode'], env=env)
    run(['dotnet', 'tool', 'restore'], cwd=ROOT / 'backend', env=env)
    run(['npm', 'ci'], cwd=ROOT / 'frontend', env=env)

def migrate(env):
    run(['docker', 'compose', 'up', '-d', '--wait', '--wait-timeout', '240', 'sqlserver'])
    migration_env = env | {'ConnectionStrings__DefaultConnection': sql_admin_connection('EduLearning')}
    run(['dotnet', 'run', '--no-launch-profile', '--project', 'backend/src/EduLearning.API', '--', '--migrate'], env=migration_env)
    password = env['AppDatabasePassword']
    # A dedicated local login has data access, not schema/role administration.
    # Password is sent via stdin, never as a command-line argument or printed SQL.
    sql = f"""IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name=N'EduLearningApp')
CREATE LOGIN EduLearningApp WITH PASSWORD='{password}';
GO
USE EduLearning;
GO
IF NOT EXISTS(SELECT 1 FROM sys.database_principals WHERE name=N'EduLearningApp')
CREATE USER EduLearningApp FOR LOGIN EduLearningApp;
ALTER ROLE db_datareader ADD MEMBER EduLearningApp;
ALTER ROLE db_datawriter ADD MEMBER EduLearningApp;
GO
"""
    run(['docker', 'compose', 'exec', '-T', 'sqlserver', 'sh', '-c',
         'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -r 1'], input=sql, text=True)
    print('Migración y administrador único preparados. API usará EduLearningApp, no sa.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['setup', 'migrate', 'api', 'frontend', 'test'])
    args = parser.parse_args()
    if args.command == 'setup':
        setup()
    else:
        env = environment()
        if args.command == 'migrate': migrate(env)
        elif args.command == 'test':
            env['IntegrationTests__ConnectionString'] = sql_admin_connection()
            run(['dotnet', 'test', 'backend/EduLearning.sln', '--no-restore'], env=env)
        elif args.command == 'frontend': run(['npm', 'run', 'dev'], cwd=ROOT / 'frontend', env=env)
        else:
            values = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines() if line and not line.startswith('#'))
            env['ConnectionStrings__DefaultConnection'] = f'Server=127.0.0.1,{values.get("MSSQL_PORT", "1433")};Database=EduLearning;User Id=EduLearningApp;Password={env["AppDatabasePassword"]};Encrypt=True;TrustServerCertificate=True'
            # Bootstrap secrets are only needed by the explicit migration command.
            env.pop('BootstrapAdmin__Password', None)
            run(['dotnet', 'run', '--no-launch-profile', '--project', 'backend/src/EduLearning.API'], env=env)
