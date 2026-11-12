# ADR 0003 — Identidad de Fase 1

Estado: implementado. Solo Admin y Student; no hay rutas de instructor.

ASP.NET Core Identity con GUID y EF Core SQL Server. Cookie HttpOnly, SameSite
Strict, Secure fuera de Development, sesión de 8 horas y renovación por actividad.
Sin tokens de sesión en localStorage. SPA y API comparten origen: Vite hace proxy
local; producción debe servir ambas bajo un origen HTTPS. No se habilita CORS.

CSRF de doble token validado en servidor en todas las mutaciones /api, incluido
login/registro/confirmación/recuperación. El cliente obtiene uno actualizado antes
de mutar, evitando conservar tokens asociados a una identidad anterior. Los errores
usan ProblemDetails. JSON rechaza propiedades desconocidas, incluidos roles.

Registro solo Student. Correo confirmado obligatorio antes de login; tokens de
confirmación/restablecimiento duran una hora. Contraseñas de al menos 12 caracteres
con mayúscula, minúscula, número y símbolo. Bloqueo 15 minutos tras cinco fallos,
limitador por IP en auth (20 solicitudes/minuto por defecto; desarrollo local 60).
Restablecer contraseña invalida sesiones por security stamp. Cada petición verifica
stamp y cuenta activa. Perfil solo permite editar nombre; no cambia roles ni email.

AdminSlot nullable restringido a 1 y UNIQUE filtrado en usuarios. Trigger SQL impide
asignar rol Admin a usuarios sin ese slot y retirar el slot conservando el rol.
El aprovisionamiento inicial adquiere sp_getapplock transaccional, crea los dos
roles y una cuenta nueva; no eleva alumnos existentes ni cambia contraseñas en
reinicios. Rechaza estados administrativos inconsistentes. Se requiere mantener un
administrador operativo; sustitución/recuperación privilegiada queda como operación
manual futura, sin endpoints de promoción ni segundo administrador operativo.

Migraciones explícitas con --migrate; nunca automáticas en un arranque normal.
La herramienta local usa sa solo para migración/aprovisionamiento SQL; API usa
EduLearningApp con db_datareader/db_datawriter. Es un permiso inicial de desarrollo,
no configuración final de producción; reducir por objeto en despliegue.

En Development, correo en archivos privados .data/mail, sin endpoint de lectura ni
salida de tokens en logs. Adaptador SES implementado con AWS SDK y credenciales
estándar del entorno; requiere región y remitente verificado. Development es
rechazado fuera de Development. No se enviaron correos reales ni se validó SES.

Claves Data Protection persistidas en directorio privado. El cifrado en reposo
mediante certificado/KMS y gestión operativa de claves se deben configurar antes de
producción. No se crean cuentas AWS, credenciales externas ni infraestructura cloud.

Sin PaymentGateway ni LocalMediaStorage todavía: sus casos de uso pertenecen a
fases siguientes. No hay catálogo, cobros, progreso ni documentos académicos.
