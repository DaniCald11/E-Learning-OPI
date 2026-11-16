# API — identidad y perfil

Prefijo /api/v1, JSON camelCase, errores ProblemDetails. Solo funciona bajo el
mismo origen que la SPA. Cualquier mutación requiere cookie antiforgery y cabecera
X-CSRF-TOKEN obtenida de GET /auth/csrf, también para usuarios anónimos.

| Método | Ruta | Datos / permiso |
|---|---|---|
| GET | /health | Comprueba conexión SQL; 200 o 503 |
| GET | /auth/csrf | Emite cookie y `{token}`; sin caché |
| POST | /auth/register | email, fullName, password; crea Student, 204 |
| POST | /auth/confirm-email | userId, token del correo; 204 |
| POST | /auth/login | email, password; 204 y cookie, 401 si no puede entrar |
| POST | /auth/logout | Autenticado; 204 |
| POST | /auth/forgot-password | email; 202 genérico sin revelar existencia |
| POST | /auth/reset-password | email, token, password; 204 |
| GET | /users/me | Autenticado; id, email, fullName, roles, bio, avatarUrl |
| PATCH | /users/me | Autenticado; fullName, bio opcional (máximo 500); 204 |
| POST | /users/me/avatar | Autenticado; multipart file JPG/PNG de hasta 2 MB; 204 |
| GET | /users/me/avatar | Foto privada de la propia cuenta, sin caché |
| DELETE | /users/me/avatar | Autenticado; quitar foto de la cuenta; 204 |
| GET | /admin/status | Solo Admin; comprobación de autorización inicial |
| GET | /student/status | Solo Student; comprobación de autorización inicial |

Registro no permite elegir rol; propiedades desconocidas provocan 400. La API no
recibe ni devuelve contraseñas almacenadas ni tokens de sesión en JSON. No hay
endpoint /refresh: se eligieron cookies con renovación de sesión, no refresh tokens.

Rutas SPA: /registro, /login, /confirmar-correo, /recuperar-contrasena,
/restablecer-contrasena, /mi-cuenta, /perfil y /admin. /mi-cuenta y /perfil muestran
el perfil personal; /alumno/dashboard redirige a /mi-cuenta. /admin es la entrada
de administración con biblioteca, cursos y formaciones; no muestra KPIs ficticios.

OpenAPI disponible solo en Development en GET /openapi/v1.json. No se publica
el esquema automáticamente fuera de desarrollo.

# API de catálogo — Fase 2

| Método | Ruta /api/v1 | Regla |
|---|---|---|
| GET | /categories | Categorías activas |
| GET | /products | Publicados; search/type/category/sort/page/pageSize, máximo 50 |
| GET | /products/{slug} | Snapshot publicado y temario público sin archivos ni respuestas |
| GET | /media/{id}/cover | Solo imagen usada como portada publicada |
| GET/POST | /admin/categories | Listar/crear categorías |
| GET/POST | /admin/courses | Listar/crear cursos |
| GET/PUT | /admin/courses/{id} | Editar agregado con rowVersion |
| POST | /admin/courses/{id}/publish | Validar y congelar CourseVersion |
| POST | /admin/courses/{id}/archive | Archivar conservando versiones |
| GET/POST | /admin/products | Listar/crear borradores |
| GET/PUT | /admin/products/{id} | Editar con rowVersion |
| POST | /admin/products/{id}/publish | Validación cruzada y versión inmutable |
| POST | /admin/products/{id}/unpublish | Ocultar del catálogo, sin borrar versiones |
| POST | /admin/products/{id}/duplicate | Nuevo borrador, mismos cursos |
| GET/POST | /admin/media | Listar/cargar archivo multipart (file, folder) |
| PATCH | /admin/media/{id} | Mover archivo de biblioteca; JSON folder |
| GET | /admin/media/{id}/content | Archivo privado o reproducción Stream firmada; Admin |
| POST | /admin/media/{id}/refresh | Actualizar procesamiento Stream |
| GET/POST | /admin/media-folders | Listar/crear carpetas; JSON name, máximo 100 |

Mutaciones siguen exigiendo CSRF, incluidas cargas multipart y PUT. Propiedades
Type/Status se serializan como nombres, no números. Temas/módulos/lecciones y
cuestionario se guardan juntos en el DTO de curso: evita actualizaciones parciales.
Los endpoints del esquema inicial por subrecurso no se duplican como otra vía de
edición; el editor usa el agregado con concurrencia y publicación explícita.

folder vacío designa Sin carpeta; otro valor debe corresponder a una carpeta creada.
Los nombres se recortan y rechazan barras, caracteres de control, punto y doble punto.
Un nombre duplicado devuelve 409. Los avatares no aparecen ni se sirven a través de
los endpoints de biblioteca/portadas; solo por /users/me/avatar de su propietario.

La calificación, intentos, derechos de compra y finalización de alumnos no forman
parte de estos endpoints. Ninguna ficha pública habilita una compra todavía.
