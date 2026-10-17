# Oficia · Una app, dos perfiles

**Decisión:** una sola app Android y PWA con la misma cuenta Supabase. Al registrarse se elige **Busco espacio** (`cliente`) o **Rento espacio** (`anfitrión`). El perfil queda asociado al identificador de la cuenta, no al método de acceso ni a un dato editable del navegador. Un usuario existente entra directamente a su experiencia. El rol de Operaciones es un permiso interno aparte.

## Recorrido de alta

1. Sin sesión aparece la elección visual con dos tarjetas y el acceso «Ya tengo cuenta».
2. «Busco espacio» o «Rento espacio» lleva al acceso con correo o Google. La elección se conserva al volver de Google o de la confirmación por correo.
3. En el primer acceso autenticado se registra el perfil una sola vez. Antes de insertar, la app consulta el perfil. Si ya existe, se respeta y abre esa experiencia incluso si se llegó desde la otra tarjeta. Si dos eventos compiten, la app vuelve a leer el perfil que quedó guardado y continúa con ese rol; no muestra una instrucción de iniciar sesión de nuevo.
4. El servidor impide actualizar o borrar el tipo de perfil por la API. Una cuenta `anfitrion` no puede crear solicitudes de reserva.
5. Las cuentas existentes se incorporaron sin pedir una segunda alta: las que ya gestionan espacios son anfitrionas; las demás son clientes.

Con una sesión activa, la pantalla identifica la cuenta y rol existentes, y muestra **Continuar**. Una cuenta autenticada que todavía no tiene perfil puede completar la elección inicial; no se ofrece cambiar un rol ya fijado.

Nombre y foto se leen de los metadatos de Google que recibe Supabase Auth (`full_name`/`name` y `avatar_url`/`picture`). Si falta el nombre, se muestra el correo. Cliente y anfitrión pueden editar el nombre y guardar la foto mediante un enlace HTTPS desde Perfil. Por ahora no se carga una imagen desde el teléfono. Estos metadatos no dan permisos ni alteran el tipo de cuenta.

Si alguien necesita ambas actividades, deberá usar dos cuentas distintas. Un cambio excepcional de titularidad requerirá revisión manual de Operaciones y una política formal; no habrá un botón para cambiar el tipo de perfil.

## Navegación y acciones

| Vista | Cliente: Busco espacio | Dueño: Rento espacio |
| --- | --- | --- |
| Inicio | Buscar, categorías, ofertas, espacios cercanos | Indicadores, espacios propios y solicitudes nuevas |
| Espacios | Explorar lista/mapa, filtros, fotos y servicios | Crear/editar borradores, enviar a revisión, estado de cada espacio |
| Solicitudes | Elegir estancia, enviar y consultar el estado; después de autorizarse, hablar con el anfitrión y al terminar calificar el espacio | Ver solicitudes propias; aceptar/rechazar en primera instancia; tras autorización de Operaciones ver los datos permitidos del cliente y hablar por chat; al salir marcar como realizada y calificar al cliente |
| Tickets | Folio e importe estimado de seguimiento; no equivale a una reserva autorizada | Solo muestra rentas reales autorizadas por Operaciones (`confirmada`); no cuenta solicitudes pendientes ni aceptadas preliminarmente |
| Perfil | Datos de cuenta editables, favoritos, reservas y cierre de sesión | Datos de cuenta editables, tipo de perfil fijo y cierre de sesión; acceso a Operaciones si está autorizado |

### Botones principales

- Cliente: **Explorar → Elegir fecha y hora → Enviar solicitud → Seguir el estado → Tras autorización, conversar con el anfitrión → Al terminar, calificar el espacio**.
- Dueño: **Agregar espacio → Guardar borrador → Enviar a revisión → Recibir solicitud → Aceptar/rechazar → Tras autorización, coordinar por chat → Marcar realizada → Calificar al cliente**.
- Renta: **Cliente solicita → anfitrión decide primero → Operaciones registra el movimiento ya realizado fuera de Oficia y autoriza → aparece el ticket autorizado → chat habilitado → al acabar el horario se cierra la renta**. Oficia no recibe, cobra, transfiere ni concilia fondos.
- Operaciones: **Revisar espacio → Validar o devolver → esperar aceptación del dueño → registrar movimientos externos realizados → autorizar/rechazar la renta**; gestiona tickets y modera opiniones.

## Datos, privacidad y desglose informativo

- `oficia_profiles` fija `cliente` o `anfitrion` bajo RLS. El rol no se confía a `user_metadata`, parámetros de URL ni almacenamiento local.
- `space_drafts` es privado para su dueño y Operaciones. Guardar o validar un borrador **no** lo publica ni habilita rentas.
- Las solicitudes siguen protegidas por RLS. El dueño solo ve las de sus espacios; el cliente solo ve las propias. Operaciones puede revisarlas por su permiso interno.
- `space_reviews` solo admite una opinión por reserva real concluida. El servidor valida titular cliente, perfil fijo, autorización, cierre de la renta y que el espacio sea publicado y no de muestra. Cada opinión contiene de 1 a 5 estrellas y un comentario de 3 a 1000 caracteres. RLS limita la lectura pública a opiniones visibles de espacios reales publicados; el promedio se calcula desde las reseñas publicadas. La persona que opina no puede editar después el texto ni las estrellas; Operaciones puede ocultar o volver a publicar una reseña.
- Los espacios de muestra no admiten rentas autorizadas ni reseñas. Sus ratings previos se pusieron a cero y ya no aparecen como calificaciones en el catálogo.
- La pantalla de tickets suma únicamente solicitudes de espacios **reales** con estado `confirmada` (autorizadas por Operaciones). No incluye `pendiente` ni `aceptada_anfitrion`. Separa renta base, tarifa hipotética de Oficia del 15%, IVA estimado sobre esa tarifa y referencia neta antes de impuestos del anfitrión. Son importes de seguimiento, no ingresos, utilidad ni dinero liquidado.
- Oficia no recibe, retiene, cobra ni concilia dinero. Se retiraron las instrucciones bancarias de la app y Supabase deniega actualización de pagos y lectura de datos bancarios a clientes y anfitriones.
- Actualmente hay una ficha real y una solicitud real pendiente; las otras fichas son muestras. La solicitud no aparece como ticket autorizado ni suma al estimado del dueño mientras Operaciones no la autorice.

## Estado y próximos cierres

| Entrega | Estado al 16 oct 2026 | Para terminar |
| --- | --- | --- |
| Elección y acceso con correo/Google | El usuario confirmó que su alta con Google Auth funciona | Probar otra cuenta de cliente y Android instalado; verificar persistencia del perfil |
| Recuperación de sesión/perfil | Consulta previa y recuperación de inserciones duplicadas implementadas; continuidad visible para sesión activa | Reabrir la app, iniciar sesión con cliente y anfitrión existentes, entrar desde ambos caminos y confirmar que el rol fijo siempre abre su inicio sin duplicar perfil |
| Personalización de nombre y foto | Metadatos de Google y edición desde Perfil implementados para ambos roles | Verificar nombre y foto guardados en una sesión real y que sobrevivan al cierre/apertura; confirmar que URL inválida no se guarde |
| Perfil fijo y permisos | Migración aplicada; RLS y bloqueos probados en transacción | Prueba funcional completa desde la interfaz |
| Panel de dueño | Inicio, espacios, solicitudes, tickets y perfil; ficha con dirección, horario habitual y foto | Ampliar agenda de cierres, reportes y notificaciones |
| Borradores y revisión | Guardar, editar, enviar, validar o devolver; foto privada en Storage | Probar carga real y coordenadas, documentos y publicación controlada |
| Publicación de espacios reales | Pendiente | Datos y fotos autorizados; validación de ubicación, disponibilidad y condiciones |
| Historial de tickets | Desglose estimado por espacio implementado | Verificar con solicitudes reales y dos cuentas; cualquier historial financiero futuro requiere definición legal y fiscal separada |
| Aceptación y cierre de solicitudes | Implementado en dos pasos: anfitrión acepta/rechaza; Operaciones registra el movimiento externo y autoriza; el anfitrión marca realizada solo después de la salida. Los tickets aparecen solo tras autorización. | Probar el ciclo desde dos cuentas en Android/PWA; la solicitud real está intacta y pendiente de decisión del dueño |
| Calificaciones y opiniones | Implementado: promedio, tres opiniones recientes, estrellas, comentario verificado desde Mis reservas y moderación de Operaciones. Una opinión por reserva. | Verificar con reservas reales y dos cuentas cuando existan inventario y espacios publicados; no cargar reseñas artificiales a producción |
| Mensajes y avisos | Chat y RLS implementados solo después de la autorización; Realtime para pantallas abiertas y FCM para app cerrada; worker corre cada minuto | Probar entrega push y chat entre las dos cuentas en Android/PWA; validar preferencias por dispositivo |
| Datos del cliente para el dueño | Endpoint protegido implementado; expone nombre, correo, teléfono y foto disponible solo tras autorización y solo al anfitrión de esa renta | Validar visualmente los datos de una renta autorizada en dispositivo |
| Calificación del cliente por el dueño | Formulario de 1 a 5 estrellas y comentario habilitado después de finalizar una renta real | Probar al completar una renta; todavía no hay historial real para verificar |
| Distribución Android | AAB 1.3.3/código 16 compilado y firmado con JDK 21; comparte frontend/backend con PWA | Publicar en track interno y probar en teléfono; Producción no se modifica |

**Criterio de salida para el flujo de dueño:** un anfitrión nuevo puede iniciar con correo o Google, crear un borrador, enviarlo a Operaciones, recibir decisión y consultar sus propias solicitudes y tickets informativos; un cliente no puede ver ni modificar esos datos. La publicación comercial exige inventario, ubicación y disponibilidad verificados. Cualquier flujo futuro de dinero requiere una decisión independiente.
