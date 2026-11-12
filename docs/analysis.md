# Análisis completo de specs.md

Se revisaron las 18 secciones: alcance, permisos, modelo, arquitectura, datos,
flujos, API, pantallas, estructura, seguridad, métricas, pruebas, fases,
instrucciones, pendientes, definición MVP y contratos finales académicos.

## Contradicciones resueltas por prioridad explícita

- §3.4, §6.3, §12 E2E y §13 Fase 5 hablan de diplomas internos y cuatro documentos:
  sustituidos por un certificado final de taller (§15.1/17/18).
- Instructor en diagramas, tablas, UI y estructura (§4–10) queda excluido por
  §15.1/17.4: solo Admin y Student, un administrador operativo.
- Completar video manualmente (§6/7/8) se sustituye por evento ended autorizado,
  persistente e idempotente. Adelantar es válido, no se exige porcentaje visto.
- Responder sin aprobar (§15.2/17) no desbloquea: manda §18, 80 inclusive,
  intentos ilimitados, mejor nota y promedio aritmético backend.
- Evaluaciones fuera de alcance no excluye el cuestionario obligatorio de taller.
- CFDI aparece pendiente y posterior: se mantiene fuera del MVP; no crear factura fiscal.

## Riesgos de arquitectura y decisiones pendientes

1. Progreso único vs cambios académicos: matrícula única no basta para distinguir
   lecciones/versiones y cuestionarios. Definir equivalencia/migración sin perder
   historial ni invalidar documentos. Bloquea modelado final de publicación.
2. Course en varios productos: grants acumulables pero prerequisitos por snapshot.
   Falta definir acceso cuando un curso está desbloqueado en un taller y bloqueado
   en otro o comprado aparte. No aplicar un bloqueo global que anule otros derechos.
3. §3.2 limita cursos exclusivos; §15.1 prohíbe vender internos por separado,
   mientras otros ejemplos reutilizan compra individual+taller. Pedir alcance
   exacto antes de implementar validación de publicación.
4. Cursos opcionales y secuencia: aclarar si bloquean cursos posteriores; promedio
   solo considera obligatorios. No inferir una nueva regla de recorrido.
5. Snapshots: fijar solo IDs de cursos no congela contenido, notas o requisitos.
   ProductVersion debe apuntar a versiones académicas y de cuestionario inmutables.
6. Archivo/despublicación vs compras previas: no está definida la disponibilidad
   de versiones adquiridas al archivar producto/curso. Evitar revocación retroactiva.
7. Mejor nota puede cambiar tras emisión: documento conserva promedio original,
   progreso actual y snapshot emitido deben distinguirse. Reemisión no autorizada.
8. Concurrencia: transacciones y UNIQUE reales para matrículas, origen de grants,
   pagos/webhooks y emisión. Recepción repetida/fuera de orden exige reconciliación.
9. Video ended es señal manipulable del cliente, no prueba de aprendizaje. Validar
   identidad, lección y recorrido; no prometer vigilancia ni inventar métricas vistas.
10. Un administrador: invariante de base de datos/aprovisionamiento transaccional,
    no solo chequeo UI. Definir recuperación/reemplazo seguro sin segundo admin operativo.
11. Requisitos de certificación pendientes: no heredar automáticamente los de taller.
12. Precisar redondeo/presentación de notas; no redondear 79.x para aprobar sin regla.

## Dependencias y pendientes externos

.NET 10/ASP.NET/EF/Identity; SQL Server; Node/React/Vite/TypeScript; Material UI y
bibliotecas de §4.1; xUnit, Vitest/Testing Library e integración SQL, E2E según fase.
Se instalarán con lockfiles al crear proyectos, sin carpetas vacías ni dependencias
prematuras. SQL Server requiere x64, memoria y licencia Developer solo no producción.

Seleccionar video Stream/Mux, S3 privado y proveedor de correo, motor PDF/licencia,
alojamiento HTTPS, persistencia de claves de Identity, backups y observabilidad.
Mercado Pago ya confirmado: faltan métodos, reembolso/contracargos/conciliación y
credenciales sandbox cuando llegue Fase 3. No hacen falta secretos externos ahora.

Producto: reglas de certificaciones, equivalencias de versiones, combinación de
recorridos, obligatoriedad de documentos en curso individual, plantillas, marca,
firmas, privacidad/términos y política comercial. Acceso indefinido es provisional;
no implementar expiraciones. Requieren decisión antes de su fase, no bloquean la
preparación técnica. Los valores legales/fiscales no se inventan.

## Validación futura obligatoria

Matriz de tests: 79/80, intentos ilimitados e historial, mejor nota inmutable hacia
abajo, promedio de obligatorios del snapshot, video incompleto/seek/ended repetido,
matrícula compartida y grants separados, reembolso parcial, acceso indebido,
webhook concurrente/fuera de orden, certificado único y snapshot emitido estable.
No afirmar que estos tests existen en Fase 0.

## Actualización por decisiones del usuario

Resuelta la duda 3: TODO curso incluido en un taller está excluido de la venta
individual. Aplicar validaciones de publicación en ambos sentidos. Sigue pendiente
la transición de cursos con compras individuales históricas, sin revocar derechos
ni alterar diplomas existentes por inferencia.

El usuario delega la selección de proveedores. Seleccionados: Cloudflare Stream,
Cloudflare R2 y Amazon SES; véase ADR 0001 para motivos, requisitos y fases.
Ya no es pendiente elegir proveedor de video, objetos o correo. Sí siguen
pendientes cuentas, dominio/remitente, región SES y credenciales seguras, además
de la verificación de las integraciones cuando se implementen.
