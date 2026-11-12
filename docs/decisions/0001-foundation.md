# ADR 0001 — Base técnica

Estado: decidido para preparación técnica; proveedores externos pendientes.

- Monolito modular con Domain → sin infraestructura; Application → Domain;
  Infrastructure → Application/Domain; API compone Application e Infrastructure.
  Módulos: identidad, catálogo, cursos, comercio, progreso, documentos y medios.
- .NET 10 LTS (SDK disponible 10.0.404), ASP.NET Core, Identity y EF Core 10;
  SQL Server 2022 Developer para desarrollo. Node 24 LTS, npm y React/Vite/TypeScript.
  Versiones exactas de dependencias y lockfiles se fijarán al crear proyectos en Fase 1.
- Material UI como única biblioteca UI, React Router, TanStack Query, Axios,
  React Hook Form y Yup. No instalar dependencias sin uso durante Fase 0.
- Identity con cookies HttpOnly/Secure, mismo origen mediante proxy y protección
  antiforgery para operaciones mutantes. Sin tokens en localStorage. HTTPS en
  producción, CORS cerrado por defecto. Implementación y pruebas en Fase 1.
- Mercado Pago México/MXN; checkout alojado, confirmación exclusivamente backend.
- Objetos privados S3-compatible; proveedor comercial pendiente. Video: Stream o
  Mux pendiente. Correo transaccional y motor PDF pendientes (evaluar licencia).
  Adaptadores locales/falsos solo Development, con rechazo explícito en producción,
  se crearán cuando existan los casos de uso. No hay integraciones ficticias ahora.
- IDs GUID, UTC, dinero decimal(18,2), RowVersion donde haya concurrencia;
  API /api/v1 con ProblemDetails, sin respuestas correctas de cuestionarios públicas.
- Outbox persistente y BackgroundService al implementar efectos asíncronos;
  no añadir microservicios ni broker distribuido en la preparación.

Consecuencias: desarrollo inicialmente sin cuentas de proveedores; cada integración
real necesita configuración segura y pruebas sandbox en su fase. No hay Drip,
Multi-Tenant, instructores ni funciones posteriores habilitadas.

## Selección de proveedores tras respuesta del usuario

El usuario delegó la selección e implementación de los proveedores necesarios.
Se eligen Cloudflare Stream para video protegido, Cloudflare R2 para objetos
privados mediante API S3-compatible y Amazon SES para correo transaccional.
Stream y R2 concentran medios en un proveedor; SES ofrece correo transaccional
sin introducir funciones de marketing. No se asumen precios, cuotas ni cuentas.

Implementar los adaptadores cuando corresponda: medios en Fase 2 y correo con
los flujos de identidad de Fase 1. Preparar antes interfaces y adaptadores de
Development exclusivos si faltan cuentas. Producción debe rechazar adaptadores
falsos. Validar configuración y conectividad reales antes de declarar operativos
los servicios. Ninguna integración externa está implementada en Fase 0.

Prerrequisitos externos: cuenta Cloudflare, Stream habilitado, bucket R2 privado,
credenciales limitadas y configuración de firma de reproducción; cuenta/región
AWS, identidad remitente verificada en SES, DNS SPF/DKIM y permisos de envío.
Evaluar restricciones sandbox de SES antes de enviar a destinatarios reales.
El usuario aportará dominio, remitente y credenciales mediante configuración
segura en la fase correspondiente. No crear cuentas, contratar planes ni efectuar
envíos durante esta preparación. Mantener acceso privado y enlaces temporales.
