# Plan de implementación por fases

Fases 0 y 1 autorizadas; Fase 0 cerrada. Cada fase se entrega con evidencia y revisión; la siguiente
requiere autorización expresa del usuario.

| Fase | Entregables | Criterio de salida |
|---|---|---|
| 0 Preparación | Análisis completo, ADRs, convenciones, CI, Compose y guía local | Configuración validada y SQL probado; pendientes y limitaciones explícitos |
| 1 Fundamentos | Solución por capas, React+TS, EF/Identity, migraciones, registro/login, roles, un administrador seguro | Build, lint, tests de auth/CSRF/autorización y restricciones del administrador |
| 2 Catálogo y contenido | Productos/cursos/jerarquía, publicación versionada, CRUD admin, cuestionarios, biblioteca privada | Reutilizar cursos sin duplicar; snapshot inmutable; publicación inválida rechazada |
| 3 Comercio | Mercado Pago sandbox, órdenes/items, webhook, entitlements, grants, matrículas, reembolsos | Duplicados/concurrencia/fuera de orden no duplican acceso; reembolso conserva otros grants |
| 4 Aprendizaje | Reproductor, documentos, progreso compartido, intentos, calificación y recorrido secuencial | 79 bloquea, 80 aprueba, mejor nota no baja, videos incompletos bloquean, seek permitido |
| 5 Documentos | Plantillas, PDF, folios, snapshots, verificación y revocación auditada | Taller emite un certificado, diploma solo por compra individual; emisión concurrente idempotente |
| 6 Operación | Métricas reales, correos, seguridad, accesibilidad, rendimiento, backup/restauración, despliegue | Flujos críticos E2E, restauración y despliegue reproducibles |

Correcciones al plan heredado: los cuestionarios se administran en Fase 2 y se
califican en Fase 4; en Fase 5 un taller NO produce cuatro documentos. Las
certificaciones esperan definición de requisitos antes de habilitar su finalización.

Dependencias: Fase 1 necesita resolver aprovisionamiento seguro del administrador;
Fase 2 política de versiones/venta individual; Fase 3 credenciales sandbox y webhook
HTTPS; Fase 4 equivalencias de progreso y recorridos; Fase 5 plantillas y motor PDF;
Fase 6 marca/legal, proveedores y despliegue. Se solicitan secretos en configuración
segura cuando correspondan; nunca en chat o repositorio.

El texto de Fase 0 pide solución ejecutable, pero Fase 1 introduce solución y React.
Se entrega infraestructura de desarrollo ejecutable en Fase 0 y se reserva el
esqueleto de aplicación para Fase 1 para respetar el límite solicitado.

Fuera de alcance: Drip, Multi-Tenant, instructores y demás funciones posteriores.

## Decisiones recibidas durante Fase 0

- Cursos de taller excluidos de venta individual, validado al publicar desde ambas
  operaciones; no duplicar contenido para eludirlo. Resolver por separado compras
  individuales históricas antes de permitir una transición de modalidad.
- Proveedores seleccionados por delegación: Cloudflare Stream/R2 (Fase 2) y Amazon
  SES (flujos de correo de Fase 1). Preparar adaptadores Development cuando falten
  credenciales, sin usarlos en producción. La selección no autoriza avanzar de fase.

## Cierre de Fase 0

SQL Server descargado, consultas y persistencia tras recrear el contenedor
validadas. Véase phase0-validation.md. La Fase 1 fue autorizada por el usuario y está implementándose; Fase 2 requiere nueva autorización.

## Entrega de Fase 1

Identidad, persistencia y frontend implementados; véase phase1-validation.md para
los archivos, pruebas y limitaciones. Fase 2 pendiente de revisión y autorización.
