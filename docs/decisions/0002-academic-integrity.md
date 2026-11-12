# ADR 0002 — Prioridad de reglas e integridad académica

Estado: reglas confirmadas recogidas; decisiones de equivalencia pendientes.

Prioridad: sección 18; luego correcciones de 17 y 15.1; resto de specs.md cuando
sea compatible. Los ejemplos antiguos no son criterios de aceptación vigentes.

Product es oferta; Course es contenido único reutilizable. Enrollment es único
por usuario/curso; AccessGrant conserva cada origen de compra independiente.
Revocar un grant no revoca otros. Tener matrícula no prueba autorización.

Una compra fija precio, moneda, ProductVersion, orden de cursos, requisitos y
referencias académicas/cuestionarios. Versionar composición sin fijar contenido y
cuestionario dejaría mutable la compra: resolver esquema de versiones antes de
publicar cursos en Fase 2. No duplicar cursos para representar productos.

Taller: videos obligatorios terminados al menos una vez, seek libre; cuestionario
habilitado después de videos, nota backend 0–100, 80 inclusive, intentos ilimitados,
historial íntegro y MAX de notas válidas. Siguiente curso requiere ambas condiciones.
Derechos inmediatos a todos los cursos y recorrido secuencial son conceptos distintos.
Los documentos no bloquean talleres por defecto. Promedio simple de mejores notas
de cursos obligatorios del snapshot, calculado en servidor. Emitir exactamente un
WorkshopCertificate idempotente. El promedio emitido es inmutable.

Diploma individual solo por compra individual y finalización de la versión
académica aplicable. Programa de certificación solo emite documento final; sus
requisitos de evaluación siguen pendientes. Preferir IssuedDocuments con snapshots,
folio aleatorio único y restricciones de unicidad por origen/tipo/version.

Restricciones SQL y transacciones son necesarias además de comprobar existencia:
webhooks, grants, matrículas y documentos pueden llegar concurrentemente. Usar
claves externas de proveedor, idempotencia, validación de monto/moneda, outbox y
reintentos. Un redirect de pago no habilita contenido.

Pendientes: equivalencia entre versiones académicas/cuestionarios, interacción de
varios recorridos para el mismo curso, y compatibilidad entre venta individual y
pertenencia a talleres. No resolverlos implícitamente en el esquema ni en la UI.

## Aclaración confirmada por el usuario

Todo curso incluido en un taller queda excluido de la venta individual. No es una
restricción limitada a cursos marcados como exclusivos. Validar en backend ambos
sentidos: no publicar una oferta individual de un curso que pertenezca a un taller,
ni publicar un taller con un curso que conserve una oferta individual vendible.
La UI debe explicar el conflicto; nunca resolverlo duplicando el curso.

Esta confirmación sustituye la duda anterior sobre venta individual y talleres.
El progreso sigue siendo único por usuario/curso y reutilizable entre talleres.
Una eventual transición de un curso vendido previamente como individual hacia
un taller requiere definir el tratamiento de compradores y diplomas históricos;
no revocar derechos, borrar progreso ni modificar documentos emitidos de forma
retroactiva. No implementar esa transición sin una decisión expresa.
