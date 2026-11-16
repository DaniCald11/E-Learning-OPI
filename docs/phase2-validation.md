# Fase 2 — entrega y revisión de administración

Implementada y validada en desarrollo. Fase 3 no iniciada.
La [checklist funcional](phase2-checklist.md) detalla qué puede revisar el usuario.

## Resultado de la revisión

- Paleta conservada y presentación orientada a profesionalización inmobiliaria.
  Ilustración arquitectónica, entradas y transiciones discretas, trazado del plano,
  acento luminoso acotado y aparición de secciones;
  soporte de movimiento reducido. Más superficies verdes en Inicio, panel y perfil.
- Inicio → Catálogo → Panel administrativo → Mi cuenta. Panel solo para Admin;
  cierre de sesión dentro del menú de cuenta y perfil personal independiente.
- Perfil alineado: nombre, descripción opcional y foto privada JPG/PNG de hasta 2 MB.
- Panel con recorrido Biblioteca → Cursos → Formaciones y talleres y enlaces de regreso.
- Biblioteca con carpetas vacías, renombrado, eliminación conservando archivos,
  selección de destino, movimiento de archivos,
  búsqueda con lupa, selección múltiple de archivos y previsualización privada.
- Editor de curso con Anterior/Siguiente, controles Subir/Bajar y selección visible
  de videos, PDF y recursos por lección mediante búsqueda y Añadir, uno por uno.
- Borradores locales por usuario/pestaña: sobreviven a navegación y recarga;
  conservan el paso del asistente. Limpieza al cerrar sesión y descarte explícito.
- Guardar un curso nuevo o existente vuelve al listado Cursos y enfoca/desplaza
  la confirmación para que quede visible. Los errores también se enfocan.
- Precio textual con $ y MXN, sin controles numéricos. Portada visible en el borrador.
- Publicar guarda primero los cambios. Si se rechaza la publicación, se muestra el
  motivo y se conserva el borrador, también para cursos y formaciones nuevos.
- Catálogo público con búsqueda, filtros, orden y paginación SQL; ficha y temario.
- Diagnóstico de talleres basado en el MIME del video de una lección obligatoria,
  incluso en una lección etiquetada Documento. La selección muestra la versión
  publicada, cambios pendientes y requisitos; el rechazo identifica curso/versión.
- Cursos únicos reutilizables y cuestionarios de opción múltiple. Talleres con todos
  sus cursos obligatorios y excluidos de venta individual, validado en ambos sentidos.
- Publicaciones inmutables de contenido, cuestionario, composición y precio;
  editar o publicar de nuevo no modifica las versiones anteriores.

## Evidencia ejecutada

- Restore NuGet con --locked-mode, build .NET y comprobación EF sin diferencias de modelo.
- Migración ProfileAndMediaFolders aplicada a SQL Server sin reconstruir las tablas.
  Conservó los cuatro archivos que existían antes de la actualización y un único Admin.
- **31 pruebas xUnit aprobadas, 0 fallidas y 0 omitidas**, con SQL Server real.
  Cubren identidad, CSRF, roles, administrador único, publicación, reutilización,
  privacidad, taller/venta individual, validación de cuestionarios, snapshots,
  paginación, concurrencia y duplicación. La revisión añade perfil/foto privada,
  límites, carpetas/movimiento/permisos y actualización desde la migración anterior.
  Esta última prueba crea datos de biblioteca anteriores, migra y verifica que
  siguen como Library y que sus carpetas se importan sin duplicados. También se
  valida renombrar/eliminar con permisos y referencias conservadas, MP4 en lección
  Documento, rechazo de video solo opcional y cuestionario aún sin publicar.
- **9 pruebas Vitest/Testing Library aprobadas**, incluidas recuperación de borrador,
  preferencia de servidor para borradores limpios, limpieza al salir y fallo de storage.
- **8 pruebas Playwright/Chromium aprobadas**: siete recorridos con API y SQL reales
  y una prueba de guía de interfaz con respuestas simuladas. Incluyen identidad,
  foto, publicación de taller, varios videos/PDF, carpeta vacía, retorno desde
  Biblioteca, recarga, precio, portada cargada, publicación incompleta y logout.
  Añaden renombrado/eliminación de carpeta y regreso con foco/scroll tras guardar
  cursos nuevos y existentes.
  Los videos MP4 y WebM se generan con canvas/MediaRecorder; los archivos PDF/PNG son reales.
- Build TypeScript/Vite y ESLint --max-warnings 0 correctos.
- Capturas de escritorio revisadas para inicio, acceso, perfil y panel. A 390 px,
  inicio, panel, perfil, curso nuevo, formación nueva y biblioteca sin desbordamiento.
- Inicio también revisado sin desbordamiento a 320, 360, 768 y 1024 px.
- Formato de código y git diff --check verificados; specs.md sin cambios.

## Archivos principales de la revisión

| Archivo | Para qué sirve |
|---|---|
| frontend/src/pages/AdminDashboardPage.tsx | Entrada y recorrido de administración |
| frontend/src/pages/MediaLibraryPage.tsx | Carpetas, cargas, búsqueda y retorno al editor |
| frontend/src/features/catalog/useEditorDraft.ts | Recuperación local de los editores y limpieza al salir |
| frontend/src/features/catalog/LessonMaterials.tsx | Buscador, selección y acción Añadir, con lista de materiales |
| frontend/src/components/SaveFeedback.tsx | Confirmaciones y errores visibles con scroll/foco accesible |
| frontend/src/pages/CourseEditorPage.tsx | Pestañas, jerarquía, materiales y publicación del curso |
| frontend/src/pages/ProductEditorPage.tsx | Asistente, moneda, portada y publicación de formación |
| frontend/src/pages/ProfilePage.tsx | Nombre, descripción y foto personal |
| frontend/src/app/App.tsx | Cabecera, menú de cuenta y rutas protegidas |
| frontend/src/components/BrandVisual.tsx | Ilustración arquitectónica del nuevo inicio |
| backend/src/EduLearning.API/Controllers/MediaFoldersController.cs | Crear, listar, renombrar y eliminar carpetas; conservar archivos |
| backend/src/EduLearning.API/Controllers/ProfileAvatarController.cs | Guardar, leer y quitar foto de la cuenta |
| backend/src/EduLearning.Infrastructure/Persistence/Migrations/20261116204019_ProfileAndMediaFolders.cs | Actualizar esquema e importar carpetas de archivos existentes |
| frontend/e2e/review.spec.ts | Recorridos reales de las correcciones solicitadas |
| docs/phase2-checklist.md | Guía funcional para revisar esta entrega |

## Límites de esta entrega

R2/Stream no tienen credenciales configuradas: sus adaptadores existen, pero no se
verificaron cargas ni reproducción contra cuentas reales. SES tampoco envía correo
externo aquí; se usa la bandeja privada .data/mail. No se contrataron servicios.
La guía de desarrollo explica la configuración y validación pendiente.

Los cambios pendientes del editor se guardan en sessionStorage por usuario y pestaña;
Guardar los persiste en SQL. No se sincronizan cambios sin guardar entre dispositivos.
Una formación necesita datos básicos válidos para guardar en servidor. El contenido
que todavía no los cumple se conserva localmente hasta completarlos.

La jerarquía editable sigue siendo JSON validado; la composición y referencias a
versiones son relacionales. ADR 0004 recoge el tradeoff. No hay edición/borrado de
snapshots en los endpoints. El editor no es un constructor HTML arbitrario.

No hay checkout, pagos, matrículas, grants, intentos de alumno, calificación,
progreso ni documentos emitidos. El catálogo informa que la compra no está habilitada.
No hay Drip Content, Multi-Tenant ni instructores.

Las pruebas de navegador conservan contenido ficticio rotulado «de prueba» en la
base local. Las capturas de perfil/panel utilizan una sesión ilustrativa simulada,
identificada como Perfil de ejemplo; no son evidencia de integración. Los conteos
anteriores corresponden a pruebas ejecutadas localmente. Las páginas se cargan por
rutas; el build actual no emite advertencias de tamaño de chunk.

La revisión de carpetas, guardado y requisitos de talleres no cambia el esquema SQL
ni añade dependencias. Se conserva la migración ProfileAndMediaFolders existente.
Los borradores de formaciones siguen usando únicamente versiones de curso publicadas;
no se publican cambios académicos de forma implícita para resolver una validación.
