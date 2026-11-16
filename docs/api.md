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
| PATCH | /admin/media-folders/{id} | Renombrar carpeta y actualizar metadatos de sus archivos; JSON name |
| DELETE | /admin/media-folders/{id} | Eliminar carpeta; conserva archivos en Sin carpeta y sus referencias |

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

## Revisión de requisitos de talleres

CourseView incluye hasUnpublishedChanges y workshopIssues. La lista administrativa
calcula los requisitos sobre la última versión publicada, con una consulta agrupada
a los videos referenciados, evitando una consulta por curso. workshopIssues está
pensado para la selección de cursos de un taller, no para bloquear un curso individual.

Publicar una formación valida los archivos referenciados por su snapshot: al menos
un video Ready en una lección obligatoria por curso del taller y cuestionario válido.
El MIME del archivo determina si es video; una etiqueta Document no lo invalida.
Los errores incluyen título y número de versión publicada. Guardar un cuestionario
solo en borrador no cambia el snapshot utilizado por la formación.

Renombrar/eliminar carpetas y mover archivos son operaciones transaccionales. Una
carga en curso vuelve a resolver el ID de la carpeta al guardar sus metadatos;
si se renombró, usa el nombre actual, y si se eliminó, conserva el archivo sin carpeta.
No se altera ninguna clave de almacenamiento ni referencia de curso.
