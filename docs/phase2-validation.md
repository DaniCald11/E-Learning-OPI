# Fase 2 y rediseño — entrega para revisión

Implementado y validado en desarrollo; la Fase 3 no está iniciada.

## Resultado

- Nuevo diseño editorial de inicio, identidad, perfil y paneles de cuenta: Material
  UI personalizado, ilustración CSS, componentes propios, microinteracciones,
  estados de validación y contraseña visible/oculta. Escritorio y móvil revisados
  mediante capturas; sin desbordamiento horizontal en inicio a 390 px.
- Catálogo público con búsqueda, filtros, orden, paginación SQL y ficha/temario.
- Administración de categorías, cursos reutilizables, jerarquía, materiales,
  cuestionarios de opción múltiple y formaciones. Asistente de seis pasos sin Drip.
- Reordenación por controles y arrastre. Edición del agregado con RowVersion.
- Biblioteca privada, carpetas lógicas, firmas MIME y límite de archivo de 100 MB.
- Versiones de contenido/cuestionario y composición comercial congeladas. Una
  edición o nueva publicación no modifica versiones anteriores.
- Validación en ambos sentidos: cursos de taller excluidos de venta individual.
  Todos los cursos de taller obligatorios; requieren video y cuestionario publicables.
- LocalMediaStorage solo Development. Adaptadores R2 y Stream con reproducción
  firmada implementados; su validación real requiere cuentas/configuración.

## Evidencia ejecutada

- Compilación .NET: correcta, sin errores ni advertencias del compilador.
- Restore NuGet --locked-mode: correcto; lockfiles actualizados para AWS SDK S3.
- Migración CatalogAndImmutableVersions aplicada a SQL Server conservando Identity.
- EF migrations has-pending-model-changes: sin cambios pendientes.
- **24 tests xUnit aprobados, 0 fallidos y 0 omitidos** sobre SQL Server real.
  Conserva las 16 pruebas de identidad y añade publicación, cursos compartidos,
  privacidad de temarios/archivos, exclusión de venta individual, cuestionarios,
  versiones anteriores, filtros/paginación, concurrencia, precio de snapshot y
  duplicación de producto sin duplicar el curso. También valida todos obligatorios
  y rechazo de cuestionarios con más de una respuesta correcta.
- **5 tests Vitest/Testing Library aprobados**: rutas protegidas y formularios.
- **3 E2E Playwright/Chromium aprobados**: identidad completa, acceso administrativo,
  y carga de video real WebM → curso+cuestionario → taller → publicación → catálogo
  como visitante. El video se genera en canvas/MediaRecorder, sin proveedor externo.
- TypeScript/Vite build y ESLint con cero warnings de lint: correctos.
- La carga inicial se dividió por rutas; los editores ya no se cargan de entrada.
- git diff --check: correcto. specs.md sin cambios; acuerdos nuevos en ADR 0004.

## Límites explícitos

R2/Stream no tienen credenciales en esta instancia: no se verificaron cargas,
procesamiento ni reproducción real contra esas cuentas. SES tampoco envía correo
externo aquí. La bandeja .data/mail sigue siendo el mecanismo local de confirmación.
No se contrataron servicios ni se publicaron entornos. La guía de desarrollo detalla
requisitos y pruebas pendientes de las integraciones.

La jerarquía editable es JSON validado; composición y referencias de versiones son
relacionales. ADR 0004 documenta el tradeoff y la futura proyección para analítica.
La inmutabilidad se prueba a través de los casos de uso: no hay endpoints de edición
o borrado de versiones. La administración actual es la base del editor MVP, no un
constructor HTML arbitrario.

No hay checkout, pagos, matrículas, grants, calificación de intentos, progreso ni
emisión de documentos todavía. Las fichas indican que la compra aún no está
habilitada. No existe contenido liberado por calendario ni multitenencia.

Las pruebas E2E conservan contenido ficticio rotulado "de prueba" en la base local.
No son datos comerciales. No se ejecutó GitHub Actions desde este chat: se validaron
sus comandos localmente. Vite conserva una advertencia no bloqueante por el chunk
base de aproximadamente 502 kB (163 kB gzip); las páginas se cargan de forma diferida.
