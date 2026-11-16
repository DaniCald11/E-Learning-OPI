# Base de datos — Fases 1 y 2

Migración InitialIdentity en Infrastructure/Persistence/Migrations: siete tablas de
Identity (usuarios, roles, claims, logins, tokens y asociaciones), más historial EF.
AspNetUsers añade FullName, CreatedAtUtc, IsActive y AdminSlot.

Índices únicos: NormalizedUserName, NormalizedEmail y AdminSlot filtrado. CHECK
AdminSlot nulo o 1. Triggers validan compatibilidad del slot con la asignación Admin.
GUID en identidad. Contraseñas y tokens gestionados por ASP.NET Core Identity.

Aplicar desde la raíz con `python3 scripts/dev.py migrate`, que usa configuración
privada y no elimina ni recrea bases. Repetir es seguro: no repite la migración ni
el administrador, ni cambia contraseñas existentes. Hacer respaldo antes de aplicar
a datos reales; este flujo es exclusivamente local. No hay migraciones de cursos,
productos, matrículas ni compras en Fase 1.

Pruebas de integración crean EduLearningTest_<GUID> con SQL real y eliminan solo
esa base al terminar. Pruebas de navegador utilizan la base local EduLearning y
añaden alumnos ficticios identificados con @example.test. El volumen conserva los
datos. No ejecutar down -v como parte de las pruebas.

## Migración de Fase 2

CatalogAndImmutableVersions agrega Categories, Courses, CourseVersions, Products,
ProductCourses, ProductVersions, ProductVersionCourses y MediaFiles. Índices únicos
de slug, número de versión y posiciones de composición. SQL RowVersion en cursos
y productos. Precios decimal(18,2), moneda MXN, fechas UTC.

El árbol editable de contenido y cuestionario es JSON validado; las versiones son
snapshots independientes y la composición de versiones es relacional. Consulte
ADR 0004 para la decisión y sus límites. No se agregan tablas de compras o progreso.
No se reconstruyen ni eliminan las tablas de Identity existentes.

## Revisión de Fase 2: perfil y carpetas

ProfileAndMediaFolders agrega Bio (500 caracteres) y AvatarMediaId a AspNetUsers;
la foto referencia MediaFiles con borrado restringido. MediaFiles distingue Kind
Library/Avatar y OwnerUserId. Las consultas de biblioteca y referencias de cursos
solo admiten Library; la foto se lee exclusivamente desde la cuenta propietaria.

MediaFolders permite carpetas vacías, nombre único de hasta 100 caracteres y fecha
UTC. La migración importa los nombres de carpetas existentes, elimina espacios
exteriores y conserva los archivos anteriores con Kind=Library. Las carpetas siguen
siendo lógicas y de un solo nivel; MediaFiles.Folder conserva el nombre canónico.

Aplicar con el mismo comando migrate. La prueba de actualización desde la migración
anterior valida conservación de archivos y deduplicación de carpetas en SQL real.
