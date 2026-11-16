# Desarrollo — Fase 0

Requisitos: Git, Python 3, Docker Engine + Compose v2, Linux x86_64 o máquina
compatible para SQL Server. Reservar 4 GiB al contenedor SQL y espacio para imagen
más datos. SQL Server Developer se usa exclusivamente para desarrollo/pruebas;
Compose acepta su EULA al arrancar. Revisar condiciones de Microsoft antes de uso.

En la nube ya están .NET 10.0.404 y Node 24/npm. Para usar ese SDK:
```bash
export DOTNET_ROOT=/workspace/.tools/dotnet
export PATH="$DOTNET_ROOT:$PATH"
export DOTNET_CLI_HOME=/workspace/.tools/dotnet-cli
```
En otras máquinas instalar .NET 10 LTS y Node 24 LTS desde sus fuentes oficiales.
Usar el checkout existente; no se necesita otro worktree.

Desde la raíz del repositorio:
```bash
python3 scripts/init-dev-env.py
bash scripts/check-phase0.sh
docker compose up -d --wait --wait-timeout 240 sqlserver
docker compose exec -T sqlserver sh -c 'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -Q "SELECT @@VERSION; SELECT 1 AS Ready;"'
docker compose stop sqlserver
```

La inicialización conserva .env existente. Si está vacío, configura una contraseña
local segura sin versionarla. No cambies el secreto de un volumen ya inicializado
sin cambiar también el login SQL. `sa` es solo para administración local; la futura
API usará credencial de mínimo privilegio. No imprimir `docker compose config` sin
`--quiet`: puede exponer secretos interpolados. El script de comprobación no arranca
SQL ni valida lógica del producto.

SQL escucha únicamente en loopback. El healthcheck ejecuta SELECT 1 con errores
fatales (-b). `-C` confía explícitamente en el certificado autofirmado del SQL local;
no desactiva TLS de descargas y no es configuración de producción. La futura
conexión de producción exige certificado válido y TrustServerCertificate=false.

El volumen sqlserver-data persiste entre reinicios. `docker compose down` conserva
los datos; `down -v` los destruye y no forma parte del flujo normal.
La imagen SQL está fijada al digest validado en Fase 0. Actualizar el digest exige
validar el nuevo parche y sus migraciones/pruebas antes de cambiarlo. No hay imágenes propias,
API/frontend ni migraciones en esta fase.

CI ejecuta validación de documentación y sintaxis Compose. En Fase 1 se añadirán
restore/build, lint, tests y SQL de integración reales. Un pipeline básico verde
no significa que el LMS funcione. No se publica ni modifica el entorno cloud.

## Prueba SQL de persistencia

Desde la raíz: `python3 scripts/validate-sqlserver.py`. Ejecuta consultas reales,
crea una base de prueba con nombre aleatorio, escribe un dato, recrea el contenedor
SQL conservando el volumen y verifica el dato persistido. Elimina solo la base
temporal al finalizar. Recrear el servicio interrumpe conexiones: ejecutar en el
entorno local de desarrollo, sin trabajos concurrentes. No usa `down -v`.

## Fase 1 — instalación, migración y arranque

Desde la raíz del checkout, con .NET 10.0.404, Node 24, npm, Python 3 y Docker:

```bash
python3 scripts/dev.py setup
python3 scripts/dev.py migrate
```

setup instala dependencias fijadas (NuGet locked-mode y npm ci), restaura dotnet-ef,
y genera .data/development.json solo si no existe. Ese archivo privado contiene
credenciales aleatorias locales y la cuenta administrativa ficticia admin@example.test.
Consúltalo localmente si necesitas entrar; no copies contraseñas al chat ni al Git.
No cambiar su AppDatabasePassword después de crear el login SQL sin coordinar el
cambio de contraseña de SQL. No hay credenciales hardcodeadas en el código.

Arrancar en dos terminales:
```bash
python3 scripts/dev.py api
python3 scripts/dev.py frontend
```

La API usa 127.0.0.1:5080; Vite, 127.0.0.1:5173. En una máquina con navegador local
usar localhost:5173: ese hostname coincide con los enlaces del correo y las cookies.
En cloud estas direcciones son para comprobación interna; no constituyen enlaces
de preview. Se mantiene el mismo origen mediante proxy /api. No mezclar localhost
con 127.0.0.1 durante una sesión. App:PublicUrl es la fuente de URLs de correo;
no se toma del Host enviado por el cliente.

Correo Development: abrir los JSON en .data/mail para obtener el enlace de
confirmación o recuperación del alumno correspondiente. Son archivos privados y
contienen tokens; no están disponibles en la web. El administrador inicial ya está
confirmado al aprovisionarse de manera privilegiada.

Validar:
```bash
python3 scripts/dev.py test
cd frontend
npm run build
npm run lint
npm test
npm run test:e2e
```

El test SQL necesita el contenedor arriba. El E2E necesita API y Vite arriba y
Chromium disponible (CHROMIUM_PATH permite indicar ejecutable); si no hay navegador,
instalar el de Playwright con `npx playwright install --with-deps chromium`.
`python3 scripts/wait-dev.py` comprueba readiness HTTP. Integración usa una base
aislada, sin simular SQL con SQLite. La configuración CI reproduce estos pasos.

Producción no usa scripts/dev.py ni .data/development.json. Debe proporcionar
ConnectionStrings__DefaultConnection, App__PublicUrl HTTPS, DataProtection__Path
persistente privado, Email__Provider=SES, Email__From y Email__Region, con identidad
AWS y permisos mínimos mediante el mecanismo seguro de despliegue. El primer
aprovisionamiento exige BootstrapAdmin__Email/Password; retirarlos del proceso API
posteriormente. Mantener claves Data Protection y protegerlas en reposo antes de
producción. Las migraciones se ejecutan por una tarea privilegiada independiente.
SES requiere remitente/dominio verificado y autorización de envío; envío real
pendiente porque no hay una cuenta configurada. No usar adaptadores Development.

## Fase 2 — catálogo y administración

Conservar .data/development.json y el volumen SQL. Ejecutar `python3 scripts/dev.py
setup` para restaurar lockfiles actualizados y después `python3 scripts/dev.py migrate`
para la migración de catálogo. Arrancar API y frontend como antes.

Rutas: /catalogo, /formacion/:slug, /admin/formaciones, /admin/cursos y
/admin/biblioteca. Entrar con el administrador local para editar. Subir archivos,
crear curso y jerarquía, asociar materiales, preparar cuestionario si será parte de
un taller, guardar y publicar curso. Luego crear formación, categoría, composición,
precio y portada; guardar y publicar. Reutilizar un curso en varios talleres no lo
copia. La composición de un taller es enteramente obligatoria en este MVP.

El nuevo E2E crea un video WebM real desde canvas/MediaRecorder en Chromium, lo
sube, crea curso+cuestionario, publica taller y comprueba el catálogo como visitante.
No necesita ffmpeg ni servicios externos. Todos los registros llevan "de prueba";
no son cursos ni precios comerciales reales.

### Actualizar la revisión de Fase 2

Los cambios se revisan en la rama `develop`. Con los servicios API/frontend detenidos
y tu trabajo local guardado, actualiza esa rama y aplica la migración nueva:

```bash
git switch develop
git pull --ff-only origin develop
python3 scripts/dev.py migrate
```

En Windows puedes usar `python` en lugar de `python3`. Si es tu primera instalación,
ejecuta antes `python scripts/dev.py setup`. No borres `.data/development.json`,
`.env` ni el volumen SQL. Esta revisión no añade dependencias de frontend.

Después arranca API y frontend en terminales separadas como arriba. La migración
ProfileAndMediaFolders agrega descripción/foto del perfil y carpetas de biblioteca;
importa las carpetas existentes y conserva usuarios y archivos.

Flujo: Panel administrativo → Biblioteca → Cursos → Formaciones y talleres.
Mi cuenta contiene perfil y cierre de sesión. Los editores conservan trabajo sin
guardar y pestaña/paso en la misma pestaña del navegador, incluso al recargar.
Guardar curso/Guardar borrador persiste en la cuenta. Cerrar sesión limpia la copia
local. Consulta la [checklist funcional](phase2-checklist.md) para revisar la entrega.

### Cloudflare para medios reales

LocalMediaStorage es exclusivo Development. Para usar proveedores reales configurar
Media__Provider=Cloudflare y los siguientes valores en el mecanismo seguro de
configuración del despliegue, sin valores secretos en el repositorio/chat:

- Media__AccountId: cuenta Cloudflare.
- Media__R2Bucket: bucket privado, sin acceso público.
- Media__R2AccessKeyId y Media__R2SecretAccessKey: credenciales S3 de permisos mínimos.
- Media__StreamApiToken: token limitado a Stream de esa cuenta.
- Media__StreamCustomerCode: código del dominio de reproducción.
- Media__StreamSigningKeyId y Media__StreamSigningKeyPath: ID y ruta al PEM privado.

R2 usa firma SigV4 local: necesita una credencial utilizable por el SDK, no un texto
placeholder de proxy. La clave PEM no se guarda en Git. Red necesaria: api.cloudflare.com,
<cuenta>.r2.cloudflarestorage.com y customer-<código>.cloudflarestream.com. Configurar
solo los destinos reales; no abrir Internet de forma general para esta integración.

Stream exige URLs firmadas y genera acceso de diez minutos tras autorización Admin.
Mientras procesa un video, usar Actualizar procesamiento en la biblioteca. Los medios
sin estado Ready bloquean publicación. R2 entrega imágenes/PDF mediante la API;
no se expone StorageKey a visitantes. El bucket debe seguir privado.

No se configuraron cuentas ni se validaron cargas reales R2/Stream en esta instancia.
Antes de producción comprobar subida, procesamiento, firma, caducidad y permisos de
bucket con las cuentas elegidas. SES sigue pendiente de remitente/cuenta verificados.
