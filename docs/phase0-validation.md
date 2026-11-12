# Evidencia de Fase 0 — validación SQL completada

El bloqueo de descarga quedó resuelto en la instancia actual. La política
observada es unrestricted/enforced; la descarga de Microsoft finalizó correctamente.

Resultados ejecutados:

- `docker compose up -d --wait --wait-timeout 240 sqlserver`: código 0, healthy.
- SQL Server 2022 Developer Edition (64-bit), versión 16.0.4315.2.
- Consultas autenticadas con sqlcmd, `SELECT 1`, creación de base/tabla y escritura.
- `python3 scripts/validate-sqlserver.py`: código 0. El contenedor fue recreado
  (ID diferente), conservando el volumen. El dato escrito se leyó correctamente
  después de la recreación, con comprobación SQL que falla si el dato no existe.
- La base temporal fue eliminada y una consulta posterior confirmó que no quedan
  bases Phase0Validation_. No se tocaron bases de aplicación.
- Estado final: contenedor healthy, puerto limitado a 127.0.0.1:1433.
- `bash scripts/check-phase0.sh` y `git diff --check`: pasan.
- `git diff --exit-code -- specs.md`: pasa; especificación conservada.

Imagen descargada y validada por Docker:
`mcr.microsoft.com/mssql/server@sha256:11927f5edc5122658e90b3a80ee36e8aef779310bf771415c1d89271859c73fd`.
Compose sigue usando 2022-latest; una descarga futura puede obtener otro parche.

Fase 0 cerrada para el alcance de preparación acordado: documentación, decisiones,
convenciones, CI básica y SQL de desarrollo ejecutable y validado. La solución de
aplicación se reserva para Fase 1, tal como explica el plan. No existen todavía
pruebas funcionales del LMS ni migraciones; el workflow de GitHub no se ejecutó.
La persistencia validada es del volumen Docker en esta instancia, no restauración
entre máquinas cloud. No se publicó ni cambió la configuración del entorno.

El historial siguiente documenta intentos anteriores y sus bloqueos ya resueltos;
no describe el estado actual.

# Historial anterior de Fase 0

Validado en esta instancia:

- Lectura íntegra de specs.md, secciones 1–18; fuente conservada sin cambios.
- .NET SDK 10.0.404, Node 24.22.1, npm 11.9.0 disponibles.
- Docker Engine 29.9.2 y Compose 2.40.3 disponibles; daemon local x86_64.
- `bash scripts/check-phase0.sh`: pasa (documentos y sintaxis Compose).
- Inicializador ejecutado dos veces: crea .env con modo 0600 y conserva el existente.
  .env está ignorado por Git; no se muestra el secreto.
- `git diff --check`: pasa.

Bloqueo externo:

`docker compose up -d --wait --wait-timeout 240 sqlserver` falla descargando
la imagen: Forbidden. El manifiesto en mcr.microsoft.com se obtiene, pero su blob
redirige a westcentralus.data.mcr.microsoft.com. Una conexión nueva a ese host
falla con `CONNECT tunnel failed, response 403`. El host no figura en los destinos
permitidos de la configuración observada.

Acción requerida: permitir westcentralus.data.mcr.microsoft.com en los ajustes de
red del entorno, conservando las reglas existentes. No se modificó ni publicó
configuración cloud. Tras aplicar el cambio, reintentar el comando de Compose y
la consulta SELECT 1 de docs/development.md; probar stop/up y persistencia antes
de cerrar esta comprobación. Si Microsoft redirige otra capa a otro host, revisar
ese destino exacto; no abrir acceso general ni desactivar TLS.

No se creó ningún contenedor SQL. Arranque, consulta SQL y reinicio/persistencia
NO están verificados. No hay build/lint/tests del LMS porque los proyectos se
crearán en Fase 1; el workflow CI fue creado, no ejecutado en GitHub.

Fase 0: documentación y configuración implementadas; validación SQL pendiente.
No se inició Fase 1 ni se crearon migraciones, lógica de negocio o UI de producto.

## Revalidación después del cambio indicado por el usuario

En la nueva instancia se repitió `bash scripts/check-phase0.sh`: pasa.
El daemon Docker local responde (29.9.2). Se intentó nuevamente Compose con
una conexión nueva: la descarga sigue fallando con Forbidden, sin crear SQL.
Una petición HTTPS nueva a westcentralus.data.mcr.microsoft.com devuelve
`CONNECT tunnel failed, response 403`.

El estado observado de la plataforma es actual (`observations_current=true`) y
la política está aplicada (`state=enforced`), pero `allowed_hosts=[]` y la lista
efectiva no contiene el dominio solicitado. Por tanto, el permiso indicado por el
usuario todavía no está aplicado a esta instancia. No se presupone que el usuario
no lo haya guardado: puede existir una diferencia entre borrador/configuración
publicada e instancia. La lectura del borrador también falla con INVALID_ARGUMENT
("The current environment draft could not be verified"). No se modificó la red.

Siguiente acción: guardar/aplicar el permiso en la configuración asociada a este
entorno y comprobar que su lista efectiva lo incluya. Si el ajuste ya aparece allí,
resolver la aplicación del cambio en la plataforma. No repetir descargas sin ese
cambio de estado. Consulta, reinicio y persistencia SQL siguen pendientes.
