# Conexión real de Oficia · diseño de datos

**Estado:** el esquema está aplicado en `vfvqmlsgqxiarmbquhco`; el cliente de Expo consulta `spaces`, usa Auth y escribe/lee `bookings` bajo RLS. Google Auth está habilitado para web y Android con una identidad compartida. El acceso web se probó; `admin.yavoi@gmail.com` ya existe como usuario de Supabase y está asignado a los cuatro espacios demostrativos. El development build nativo y la prueba con una segunda cuenta siguen pendientes. El inventario continúa siendo ilustrativo.

## Flujo acordado

1. La persona explora espacios publicados y consulta sus fotos, equipo, capacidad, tarifas y reglas.
2. Inicia sesión y envía una **solicitud** con fecha, hora de inicio y duración. El servidor calcula el importe estimado a partir de la tarifa vigente y guarda una copia de esa tarifa en la solicitud.
3. El anfitrión ve en **Perfil → Panel de anfitrión** solamente las solicitudes de sus espacios. Puede confirmar o rechazar, y debe poder indicar una razón al rechazar.
4. La persona ve el nuevo estado en **Reservas**. La confirmación ocurre solo después de validar que el espacio esté libre; el comprobante de solicitud no sirve para acceder al inmueble.
5. Las operaciones sensibles quedan registradas con usuario y fecha. La fase inicial no efectúa cobros.

## Datos mínimos

| Entidad | Campos principales | Uso |
| --- | --- | --- |
| `perfiles` | `id` ligado a Auth, nombre, teléfono opcional, fecha | Identidad de cliente y anfitrión |
| `espacios` | `id`, anfitrión, nombre, descripción, dirección, zona, ciudad, tipo, capacidad, privacidad, estado de publicación | Catálogo local de Delicias y alrededores |
| `fotos_espacio` | espacio, ruta de archivo, orden, texto alternativo | Galería con imágenes reales |
| `servicios` / `espacio_servicios` | servicio, espacio | Internet, pantalla, proyector, pizarrón, etc. |
| `tarifas` | espacio, unidad hora/día/semana, precio MXN, vigencia | Precio mostrado y cotización |
| `horarios` y `bloqueos` | espacio, día de semana, apertura/cierre, rangos no disponibles | Disponibilidad y días cerrados |
| `solicitudes` | id, cliente, espacio, inicio, fin, unidad, cantidad, precio de referencia, total estimado, estado, motivo de rechazo, fechas | Ciclo de reserva y panel interno |
| `historial_solicitud` | solicitud, actor, estado anterior/nuevo, fecha | Trazabilidad de decisiones |

Los importes se almacenan en centavos enteros para evitar errores de decimales. Las fechas operativas se calculan con la zona **America/Chihuahua**, se almacenan con zona horaria y se presentan en español.

## Reglas para la versión real

- Estados iniciales: `pendiente`, `confirmada`, `rechazada`, `cancelada`. El cliente solo puede crear y consultar sus solicitudes; no puede confirmarlas.
- Un anfitrión solo puede consultar y responder solicitudes de los espacios que administra. El acceso se determina por relación en la base de datos, no por una marca editable en el perfil de la app.
- Todas las tablas expuestas tendrán seguridad por fila. El catálogo publicado se puede leer públicamente; direcciones exactas y datos personales se limitan según el estado de la solicitud y el rol.
- La confirmación debe ser una operación atómica: comprobar solapamientos, actualizar estado y registrar historial en una misma transacción. Una pantalla no puede decidir por sí sola que un horario sigue disponible.
- El cálculo de tarifa y duración se valida en el servidor. La app solo muestra una estimación antes de enviar.
- No se incluye una clave administrativa en la app Android. Fotos y archivos tendrán políticas de acceso acordes a su visibilidad.

## Integración con la app existente

Las pantallas y modelos locales de `src/data.ts` sirven como referencia visual. Cuando esté creado el proyecto de datos:

1. Configurar Auth y las tablas con migraciones versionadas.
2. Cargar los cuatro espacios de muestra **marcados como demostración** para probar el flujo entre dos cuentas de prueba.
3. La app consulta los espacios publicados al iniciar; conserva el catálogo local si la conexión falla.
4. El registro/inicio de sesión admite correo y contraseña. Google en Android usa el selector nativo y `signInWithIdToken`; la web usa OAuth con Supabase. Ambos crean o recuperan el usuario del mismo proveedor. Las sesiones se conservan en almacenamiento local.
5. Las solicitudes se escriben en Supabase y la base calcula fecha de salida y total. RLS filtra datos de cliente/anfitrión.
6. El panel confirma o rechaza mediante una actualización protegida. El rechazo usa una razón predeterminada; los conflictos se validan por trigger.
7. Una cuenta anfitriona ya está vinculada con `spaces.host_id` a los cuatro espacios de muestra. Falta probar solicitud y respuesta con una cuenta cliente distinta antes de ofrecer inventario real.

## Configuración y verificación de Google

- Google Cloud tiene clientes web y Android para Oficia. Supabase Auth → Google tiene los IDs configurados, el proveedor habilitado y el callback `https://vfvqmlsgqxiarmbquhco.supabase.co/auth/v1/callback`.
- La URL principal de Supabase es `https://oficia-delicias.vercel.app`; los retornos permitidos son producción y `http://localhost:8081` para desarrollo local.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` está configurado en Vercel Production y `.env.local`. El inicio web con `admin.yavoi@gmail.com` terminó correctamente y creó la cuenta en Supabase.
- El cliente Android de desarrollo existe para `mx.oficia.delicias` con la huella SHA-1 de desarrollo. La prueba nativa requiere development build/EAS; agregar la huella de publicación al preparar Play Console.
- No guardar el Client Secret en la app ni en Vercel; se conserva únicamente en la configuración segura de Supabase.

## Estado de implementación

La migración `supabase/migrations/20261014191029_initial_oficia.sql` crea `spaces` y `bookings`, tarifas enteras en centavos, cálculo de duración en `America/Chihuahua`, validación de cambios de estado, bloqueo de confirmaciones solapadas y políticas RLS. Se aplicó desde SQL Editor en el proyecto existente **Oficia-delicias**, organización `adminyavoi-creator's Org` (Free). Una consulta posterior confirmó cuatro espacios de muestra, cero reservas y RLS activado en ambas tablas.

El esquema es la primera versión operativa. Los perfiles, fotos almacenadas, horarios, historial de solicitudes y reglas comerciales detalladas de la tabla anterior siguen pendientes. La consulta de historial remoto aún no muestra registrada la migración, aunque las tablas ya están creadas; antes de usar la CLI para otra migración, conciliar ese historial sin volver a ejecutar el SQL inicial. El despliegue debe reconstruirse después de cada cambio de variables de entorno de Vercel.
