# Convenciones

Español de México en producto/documentación; inglés en identificadores. Archivos
UTF-8/LF, C# cuatro espacios, TS/JSON/YAML dos. Nullable y tipos TS estrictos al
crear proyectos. Organizar por capacidades dentro de las capas de §9.

Cambios pequeños por fase; explicar migraciones y conservar historial. DTOs
explícitos, validación backend y pruebas de invariantes. No exponer entidades EF,
IsCorrect, secretos ni URLs privadas. No usar valores monetarios float.

Cada PR indica problema, comportamiento y validación real; no confundir pruebas
planeadas con ejecutadas. Dependencias fijadas y lockfiles versionados al introducir
proyectos. Las migraciones se revisan antes de ejecutarlas; no resetear bases con datos.

Solo Admin/Student, sin instructor, Multi-Tenant ni Drip. Funciones posteriores
requieren autorización expresa. Al terminar cada fase, detenerse para revisión.
