# Arquitectura prevista

Monolito modular ASP.NET Core + SPA React, SQL Server, objetos privados y streaming
protegido. Dominio sin EF/HTTP; aplicación orquesta casos de uso; infraestructura
implementa puertos; API configura autorización, DI y transporte.

Se mantendrá la estructura de specs.md §9 en backend/src y frontend/src, creando
solo carpetas que tengan código. Se excluyen todos los artefactos de instructor.
Los proyectos de Fase 1 ya existen: Domain define roles; Application contiene los
contratos de identidad; Infrastructure implementa Identity, SQL, bootstrap y correo;
API configura transporte, cookies, CSRF y autorización. React incluye rutas de
cuenta y perfil con Material UI, React Hook Form/Yup y TanStack Query/Axios.

La autorización combinará identidad, grant activo, publicación/versión adquirida y
prerrequisitos del recorrido. Una URL firmada solo se entrega después de validar
recursos y tendrá duración limitada. La matrícula y el frontend no autorizan.

Las versiones de producto, versiones académicas y cuestionarios tienen identidades
distintas. El progreso compartido no autoriza trasladar aprobaciones entre versiones
incompatibles. La política precisa debe aprobarse antes de modelar la publicación.

API versionada: /api/v1 también para las rutas adicionales de §17.4; los ejemplos
sin v1 se normalizarán. Validación en backend, errores ProblemDetails, paginación,
rate limiting, auditoría sin secretos, fechas UTC y contratos de respuesta mínimos.

Fase 0 no creó migraciones. Fase 1 añade exclusivamente Identity y sus restricciones;
la migración InitialIdentity está en Infrastructure. No hay entidades académicas. Véanse ADRs, análisis y plan para
los límites y decisiones que condicionan las fases posteriores.
