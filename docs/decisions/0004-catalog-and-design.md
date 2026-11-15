# ADR 0004 — Catálogo, versiones y dirección visual

Estado: implementado para Fase 2. Confirmaciones expresas del usuario:

- Todo curso incluido en taller queda excluido de venta individual.
- Compradores conservan versiones anteriores, sin trasladar automáticamente progreso.
- Todos los cursos del taller son obligatorios en el MVP.
- Rediseñar con una apariencia profesional tomando referencias de Awwwards y 21st.dev.

## Datos y publicación

Course es único y reutilizable. ProductCourse asocia cursos con posiciones únicas.
CourseVersion conserva el contenido y cuestionario completo publicado; ProductVersion
congela información comercial y referencias exactas a CourseVersion mediante
ProductVersionCourse. Editar borradores no modifica versiones publicadas. La compra
usará estos IDs en Fase 3; no existen aún matrículas, notas ni compras.

Los borradores de temas/módulos/lecciones/cuestionario se almacenan como un agregado
JSON validado en Course.DraftJson, con IDs estables, en lugar de crear ahora una
tabla por cada nivel del editor. Esta es una decisión de persistencia interna:
se mantienen la jerarquía y los contratos funcionales de specs.md. Evita guardar
un árbol parcialmente actualizado. La revisión completa usa RowVersion; límites
por estructura impiden agregados sin cota. La biblioteca y composición de productos
sí son relacionales, con FKs. El backend valida todas las referencias a medios.

Tradeoff: el borrador se carga completo al editar; consultas analíticas por lección
requerirán una proyección normalizada cuando se implementen progreso/reportes.
Los snapshots versionados siguen siendo la fuente de requisitos históricos. No
se debe trasladar progreso entre versiones por compartir IDs lógicos de lecciones.

Title/Slug/Type/Price/CategoryId de ProductVersion también son proyección SQL
consultable e indexada. Búsqueda, filtros, orden y paginación se ejecutan en SQL;
solo se deserializan los snapshots de la página. No se filtra el catálogo entero
en memoria. El catálogo y detalle leen la última versión publicada, no el borrador.

Publicar adquiere un bloqueo transaccional del catálogo: evita conflictos entre
publicaciones simultáneas y entre venta individual y taller. Las comprobaciones
cruzadas leen composiciones publicadas, no borradores ajenos. Un producto individual
contiene exactamente un curso; talleres requieren videos y cuestionario válido por
curso. La edición tiene control de concurrencia y devuelve 409 al guardar una
revisión obsoleta. Duplicar producto crea un borrador y reutiliza cursos.

Los cursos se archivan y las formaciones se despublican, sin borrar snapshots.
La transición de cursos con compras individuales históricas continúa pendiente:
no hay compras todavía y Fase 3 debe impedir cambios comerciales retroactivos.

## Medios y límites

PDF, PNG, JPEG, MP4 y WebM; tamaño máximo 100 MB. Comparación MIME/firma inicial,
nombres saneados y claves propias. Esto no sustituye un escáner antimalware ni un
transcodificador. Carpetas lógicas; los archivos son privados. La previsualización
administrativa exige Admin; solo una imagen de portada efectivamente publicada
puede servirse al público. Las fichas no incluyen claves, IDs de materiales ni
opciones/respuestas de cuestionarios. El video local soporta peticiones por rango.

LocalMediaStorage funciona únicamente en Development. PrivateMediaStorage implementa
R2 mediante SDK S3 y Cloudflare Stream mediante API y reproducción firmada RS256.
La publicación bloquea medios en procesamiento. No se hicieron llamadas con cuentas
reales: la configuración de los proveedores es requisito antes de operar fuera del
modo local. No hay entrega de contenido premium a alumnos sin grants: eso pertenece
a las fases 3 y 4.

## Diseño

Referencias de dirección solicitadas: https://www.awwwards.com y https://21st.dev.
Implementación propia sobre Material UI; no se copiaron páginas, marcas ni código.
Sistema editorial: verde profundo, fondo cálido, acentos lima, títulos grandes,
composición asimétrica, ilustración geométrica CSS, tarjetas y microinteracciones.
La identidad OPI es provisional y utiliza el nombre del repositorio.

Componentes: Icon, BrandVisual, AuthLayout, AuthForm y layouts públicos/admin.
Teclado, foco visible, enlace de salto, formularios etiquetados, movimiento reducido
y adaptación móvil. Reordenar dispone de controles y arrastre nativo. Se difieren
por rutas las pantallas de administración y formularios. No se inventan métricas,
precios reales ni testimonios. El editor de formación no tiene paso Drip.
