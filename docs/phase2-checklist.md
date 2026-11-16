# Checklist funcional — Fase 2

Entrega de catálogo, contenido y administración, incluida la revisión de flujo y
diseño solicitada. Fase 3 todavía no iniciada. Esta lista describe la aplicación
con API, SQL Server y almacenamiento de desarrollo funcionando.

## Recorrido recomendado para revisar

1. Inicia sesión como administrador y abre **Panel administrativo**.
2. En **Biblioteca**, crea una carpeta y carga videos, PDF y una portada.
3. En **Cursos**, crea el contenido en Información → Temas y contenido →
   Cuestionario. Prueba salir a Biblioteca y regresar sin guardar.
4. Guarda o publica una versión del curso. Para un taller, prepara también su
   cuestionario y al menos un video; un PDF solo no cumple los requisitos del taller.
5. En **Formaciones y talleres**, elige Nuevo taller, reutiliza los cursos,
   ordénalos, configura precio y portada y publica.
6. Abre Catálogo como visitante y revisa la ficha publicada.
7. Desde Mi cuenta, edita el perfil y prueba Cerrar sesión dentro del menú.

## Navegación y presentación

- [x] Conservar verde profundo, fondo cálido y acentos lima.
- [x] Inicio con enfoque en profesionalización inmobiliaria y aprendizaje a tu ritmo.
- [x] Ilustración arquitectónica y transiciones discretas; sin estrellas, órbitas,
  giros ni movimientos flotantes continuos. Respetar movimiento reducido.
- [x] Navegación: Inicio → Catálogo → Panel administrativo → Mi cuenta.
  El panel solo aparece para Admin; visitantes ven acceso y registro.
- [x] Mi cuenta despliega Mi perfil y Cerrar sesión.
- [x] Separar perfil personal y administración, con regreso al panel y navegación
  Biblioteca → Cursos → Formaciones y talleres.
- [x] Adaptación de las pantallas principales a escritorio y móvil.

## Cuenta y perfil

- [x] Registro como alumno, confirmación de correo, inicio y cierre de sesión.
- [x] Recuperación y restablecimiento de contraseña.
- [x] Acceso administrativo protegido y un único administrador aprovisionado.
- [x] Editar el nombre y una descripción opcional de hasta 500 caracteres.
- [x] Cambiar o quitar foto personal: JPG/PNG de hasta 2 MB.
- [x] Foto privada de la cuenta, separada de la biblioteca y de las portadas públicas.
- [x] Mostrar estado de correo confirmado.

En desarrollo, los enlaces de confirmación y recuperación están en los JSON
privados de `.data/mail`. No llegan a un buzón externo hasta configurar SES.
El administrador inicial ya está confirmado. Las credenciales locales están en
`.data/development.json`; no se incluyen en esta documentación.

## Biblioteca del administrador

- [x] Crear carpetas vacías y seleccionar dónde cargar los archivos nuevos.
- [x] Ver todos los archivos o una carpeta, incluida la vista Sin carpeta.
- [x] Mover archivos existentes entre carpetas.
- [x] Buscar archivos o carpetas con un campo identificado por una lupa.
- [x] Cargar varios archivos en una selección: PDF, PNG/JPG, MP4 y WebM,
  hasta 100 MB por archivo, con comprobación de tipo y firma inicial.
- [x] Previsualizar imágenes, documentos y videos con autorización administrativa.
- [x] Consultar el procesamiento del video cuando se utiliza Stream.
- [x] Volver al editor desde Biblioteca conservando el contenido pendiente.

Las carpetas son de un nivel. Renombrarlas, borrarlas y borrar archivos no son
acciones implementadas en esta entrega. Las cargas son secuenciales; si una falla,
se informa cuántos archivos se alcanzaron a guardar.

## Cursos y cuestionarios

- [x] Crear y editar título, slug y descripción.
- [x] Avanzar con Siguiente y regresar con Anterior entre las tres pestañas.
- [x] Agregar, editar, eliminar y ordenar temas, módulos y lecciones.
- [x] Reordenar con Subir/Bajar y arrastre. El primer elemento no puede subir y el
  último no puede bajar: estos controles cambian orden, no cargan archivos.
- [x] Configurar lecciones Video, Documento o Mixto y si son obligatorias.
- [x] Asociar varios videos, PDF y recursos a una misma lección; ver la selección
  completa, quitar referencias y ordenar materiales.
- [x] Advertir si una lección Documento carece de PDF; la publicación valida los
  archivos requeridos y rechaza medios que no están listos.
- [x] Crear y editar cuestionario: preguntas, opciones, puntos y una respuesta
  correcta por pregunta. Validar el cuestionario antes de publicarlo.
- [x] Guardar el agregado completo como borrador en SQL Server.
- [x] Publicar versiones y archivar cursos conservando las versiones anteriores.
- [x] Detectar ediciones concurrentes y rechazar una revisión obsoleta.

## Continuidad del trabajo

- [x] Conservar cambios pendientes, pestaña/paso y temas desplegados al navegar a
  otras pantallas y al recargar la misma pestaña del navegador.
- [x] Recuperar el borrador al volver a Nuevo curso o a la edición correspondiente.
- [x] Conservar el borrador guardado aunque falle la publicación y mostrar el motivo.
- [x] Permitir descartar cambios locales con confirmación.
- [x] Limpiar borradores locales y caché al cerrar sesión.

Esta recuperación es por usuario y pestaña mediante memoria/sessionStorage; no
sincroniza cambios sin guardar entre dispositivos ni garantiza conservarlos al
cerrar la pestaña. **Guardar curso / Guardar borrador** guarda en la cuenta.
Si el navegador impide persistir, se muestra un aviso. Guardar una formación exige
sus datos básicos válidos, precio y composición; un asistente incompleto se
conserva localmente mientras se completa.

## Formaciones, talleres y publicación

- [x] Listar, buscar y editar formaciones, crear categorías y distinguir su tipo.
- [x] Nuevo taller abre el asistente directamente con ese tipo seleccionado.
- [x] Asistente de seis pasos: Información → Detalles → Temas/Cursos → Precio →
  Diseño → Publicar, con Anterior/Siguiente.
- [x] Reutilizar cursos existentes en varias formaciones sin copiarlos.
- [x] Ordenar la composición. Todos los cursos del taller son obligatorios en el MVP.
- [x] Un curso individual incluye exactamente un curso. Un curso incluido en un
  taller publicado no se puede publicar a la venta individual, ni a la inversa.
- [x] Exigir video y cuestionario publicables por curso de taller.
- [x] Escribir precio en MXN con `$` y `MXN`, hasta dos decimales, sin flechas numéricas.
- [x] Seleccionar una portada de la biblioteca y verla en la vista previa del borrador.
- [x] Mostrar requisitos faltantes y errores de publicación comprensibles.
- [x] Guardar y publicar en una acción; conservar el borrador si se rechaza publicar.
- [x] Duplicar una formación como borrador reutilizando los mismos cursos.
- [x] Despublicar una formación sin borrar las versiones que ya existían.
- [x] Cada publicación conserva una versión exacta de precio, composición, contenido
  y cuestionarios. Una nueva versión no sobrescribe la anterior.

El tipo Certificación puede prepararse y publicarse como oferta de catálogo;
su aprendizaje, requisitos de finalización y documentos no están habilitados.
La conservación de versiones prepara la futura compra; todavía no hay compradores
ni traslado de progreso que ejecutar.

## Catálogo para visitantes

- [x] Ver únicamente formaciones publicadas y su versión comercial publicada.
- [x] Buscar, filtrar por tipo/categoría, ordenar por nombre/precio y paginar.
- [x] Consultar ficha, portada, precio MXN, descripción y temario público.
- [x] Mantener privados los materiales de lecciones y las respuestas de cuestionarios.
- [x] Mostrar estados de carga, vacío y error, sin productos ni métricas inventadas.

## Pendiente de fases posteriores o configuración externa

- [ ] Fase 3: checkout, Mercado Pago, órdenes, compras, matrículas y derechos de acceso.
- [ ] Fase 4: aula del alumno, reproducción y progreso, intentos, calificación real
  y desbloqueo secuencial de cursos del taller.
- [ ] Fase 5: diplomas, certificados PDF, folios, verificación y revocación.
- [ ] Fase 6: reportes operativos, revisión final de accesibilidad/rendimiento,
  respaldo/restauración y despliegue.
- [ ] Conectar y validar las cuentas reales de Cloudflare R2/Stream y Amazon SES.
  Sus adaptadores existen; esta entrega se probó con archivos y correo locales.

No se implementaron Drip Content, Multi-Tenant ni un rol de instructor.
Consultar [evidencia de validación](phase2-validation.md) y
[guía para actualizar y arrancar](development.md#actualizar-la-revisión-de-fase-2).
