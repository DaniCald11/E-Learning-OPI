# Base de datos — Fase 1

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
