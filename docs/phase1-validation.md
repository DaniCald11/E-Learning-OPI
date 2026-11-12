# Fase 1 — fundamentos e identidad

Implementado y validado en la instancia de desarrollo. Fase 2 no iniciada.

## Archivos y responsabilidades

- backend/EduLearning.sln y global.json: solución .NET 10 y SDK fijado.
- backend/src/EduLearning.Domain: nombres de roles, sin dependencias externas.
- backend/src/EduLearning.Application/Auth: solicitudes, perfiles y puertos.
- backend/src/EduLearning.Infrastructure: Identity, EF/SQL, migración InitialIdentity,
  bootstrap transaccional, correo privado Development y adaptador Amazon SES.
- backend/src/EduLearning.API: endpoints, cookies, CSRF, autorización, límites,
  errores ProblemDetails, health SQL y OpenAPI de desarrollo.
- frontend/src: React/TypeScript, Material UI, formularios, sesión, rutas protegidas,
  registro, confirmación, login, recuperación, perfil y shells de Admin/Student.
- scripts/dev.py y wait-dev.py: instalación reproducible, migración y arranque local.
- .github/workflows/ci.yml: automatiza instalación, SQL, tests y navegador.
- docs/decisions/0003-identity.md, api.md y database.md: decisiones y contratos.

No hay lógica de productos, cursos, compras, progreso ni documentos académicos.
No se modificó specs.md. Sin Drip, Multi-Tenant ni instructores.

## Evidencia ejecutada

- NuGet restore con lockfiles y --locked-mode: pasa.
- npm ci y compilación TypeScript/Vite: pasan.
- Backend build: sin errores ni advertencias del compilador.
- EF migrations has-pending-model-changes: sin cambios pendientes.
- Migración/aprovisionamiento aplicados y repetidos: sin duplicar administrador,
  sin recrear base ni restablecer contraseñas.
- SQL confirma AdminCount=1 y ausencia de permiso ALTER para EduLearningApp;
  lectura de usuarios permitida. API usa ese usuario, no sa.
- Integración xUnit sobre base SQL aislada: **16 aprobadas, 0 fallidas, 0 omitidas**.
  Incluye CSRF, confirmación, sesión/logout, roles, perfil, recuperación, revocación
  de sesiones, bloqueo por intentos, cuenta inactiva, registro concurrente,
  restricción SQL de administrador, 429 y rechazo de correo Development en Production.
- Vitest/Testing Library: **5 aprobadas** (rutas protegidas y formularios).
- Playwright/Chromium con API+SQL reales: **2 recorridos aprobados**. Registro,
  confirmación, login, perfil persistente, rechazo de administración para alumno,
  recuperación y acceso del administrador. Se espera el encabezado de destino
  antes de rellenar recuperación para evitar carreras de navegación en el test.
- Health HTTP y documento OpenAPI: respuestas correctas y contratos presentes.
- Validación Compose y git diff --check: pasan.

CI está configurada; no se afirma ejecución en GitHub ni despliegue/publicación.
Las pruebas de integración borran solo su base EduLearningTest_<GUID>; el E2E
conserva alumnos ficticios de navegador en la base local de desarrollo.

## Límites y próximos pasos

SES está implementado pero no se enviaron correos reales: faltan cuenta, región,
remitente verificado y permisos. Se probó la bandeja local privada y que no pueda
usarse en Production. Producción requiere configuración segura independiente,
HTTPS, claves Data Protection persistentes y cifradas en reposo, y permisos SQL
revisados. No es una entrega de producción.

Vite avisa de un chunk de aproximadamente 667 kB (213 kB gzip); la compilación
pasa. Se puede dividir por rutas en la fase de optimización. El runner VSTest
emite un aviso de directorio de artefactos; los 16 tests ejecutan y terminan bien.

La imagen SQL se fijó al digest validado, conservando el volumen. Dependencias npm
y NuGet quedan bloqueadas. Claves y credenciales están ignoradas por Git y no se
imprimen en documentación ni en comandos de arranque.

Fase 1 lista para revisión del usuario; avanzar a Fase 2 requiere autorización.
