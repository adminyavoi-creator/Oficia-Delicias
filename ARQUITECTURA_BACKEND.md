# Oficia · arquitectura de datos y operación

**Estado actual:** Vite + React + Capacitor 8 comparten la app Android, la PWA y Supabase Auth/Database. La migración de reservas y depósitos está aplicada al proyecto de Oficia. Hay cuatro espacios y una reserva de muestra; no existe inventario real ni una cuenta bancaria configurada. El mapa OpenStreetMap usa coordenadas aproximadas solo para las fichas de demostración.

## Flujo de solicitud, depósito y autorización

1. La persona explora el catálogo y ve el precio vigente por hora. El mapa marca los espacios con ubicación; las fichas de muestra muestran coordenadas y precios ilustrativos.
2. Al enviar una solicitud, Supabase calcula inicio, salida y total a partir de las tarifas guardadas. La base genera una referencia única `OF-########` y conserva la solicitud en estado `pendiente`.
3. El ticket incluye fecha, horario, importe, referencia de Oficia y, cuando Operaciones configure la cuenta, banco, titular y CLABE. En el concepto de la transferencia se usa la referencia de Oficia.
4. El cliente captura el folio o clave de rastreo de su banco. Solo puede reportar su propia solicitud y una vez; el servidor bloquea cambios a precio, fechas, espacio, titular y referencia de Oficia.
5. Operaciones localiza el depósito en la cuenta bancaria y lo valida en **Perfil → Panel de Operaciones**. Validar el movimiento cambia el estado de pago a `verificado` y confirma la solicitud en la misma actualización. No validar la cambia a `rechazado` y conserva el motivo.
6. El anfitrión consulta las solicitudes de sus espacios, pero no puede validar pagos ni autorizar rentas. El cliente actualiza el ticket desde **Reservas**.

La app no cobra automáticamente ni recibe comprobantes adjuntos. Los espacios de muestra no muestran datos bancarios, no aceptan depósitos y no habilitan el acceso. El ticket de solicitud no es un pase de entrada.

## Datos aplicados

| Tabla | Campos y reglas | Propósito |
| --- | --- | --- |
| `public.spaces` | Catálogo existente más `latitude` y `longitude` opcionales con validación de rango y par completo | Mostrar puntos reales cuando se carguen ubicaciones verificadas |
| `public.bookings` | Solicitud, total calculado en centavos, `transfer_reference`, folio del banco, estados de depósito, fechas de reporte/revisión y responsable de revisión | Ticket, reporte del cliente y decisión de Operaciones |
| `public.transfer_settings` | Banco, CLABE, titular, instrucciones y fecha de actualización; una fila; CLABE con 18 dígitos y dígito verificador | Datos públicos que se muestran en tickets de espacios reales |
| `private.operations_users` | Identificadores Auth autorizados, sin acceso directo por Data API | Autorizar panel, edición de cuenta y validación de depósitos |

Estados de pago: `pendiente` → `reportado` → `verificado` o `rechazado`. Solo un depósito verificado puede llevar una solicitud a `confirmada`. El anfitrión no tiene política de escritura para estos cambios. El trigger mantiene la verificación de traslapes antes de confirmar.

## Seguridad y roles

- RLS está activo en `spaces`, `bookings` y `transfer_settings`. El cliente consulta y reporta solo sus solicitudes; el anfitrión consulta las de sus espacios; Operaciones consulta y valida solicitudes.
- Los permisos de Operaciones viven en un esquema privado. La app consulta una función de solo lectura que devuelve si la sesión actual tiene ese rol. La base vuelve a verificar el rol al ejecutar cada escritura.
- Los triggers rechazan cambios de cliente a campos originales de la solicitud y prohíben a Operaciones alterar esos campos mientras revisa el pago. La cuenta, el precio y la referencia no se reciben desde el navegador al crear una solicitud.
- La llave `service_role` no se usa en la app, PWA ni Android. Banco y CLABE son datos que el cliente puede ver, pero solo Operaciones puede cambiarlos.
- La persona administradora existente quedó habilitada como primer usuario de Operaciones en la base. No se almacena su correo en el repositorio.
- El Security Advisor ya no informa la función de Operaciones como `SECURITY DEFINER` expuesta. Persiste la recomendación de habilitar protección contra contraseñas filtradas en Supabase Auth; esa opción requiere una función de plan superior. No se cambió el plan.

## Coordenadas y mapa

- El mapa se integra en **Explorar** con mosaicos `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, zoom, arrastre, controles de centrado, marcadores de precio y atribución visible a OpenStreetMap.
- Las coordenadas de los cuatro registros de muestra son aproximadas y solo de presentación; no representan direcciones reales ni disponibilidad. No se deben usar para navegación o llegada.
- Los registros nuevos pueden guardar latitud/longitud en Supabase. Sin coordenadas se conserva la ficha de lista, pero no se inventa un punto para espacios reales.
- Para la PWA/Android, los mosaicos se solicitan durante la navegación normal. El servidor estándar de OpenStreetMap es de mejor esfuerzo, sin SLA; revisar su política de uso y elegir un proveedor de mosaicos administrado si el tráfico crece.

## Migraciones

1. `20261014191029_initial_oficia.sql` creó el catálogo y las solicitudes; fue aplicada manualmente antes de registrarse en la tabla remota de migraciones.
2. `20261014201500_booking_deposits_and_operations.sql` añade referencias de depósito, estados, configuración bancaria, rol de Operaciones y coordenadas.
3. `20261014203000_harden_operations_permissions.sql` mueve la comprobación protegida a `private`, consolida políticas RLS y agrega un índice.
4. `20261014210000_validate_clabe_and_lock_booking_fields.sql` valida el dígito de control CLABE y limita las actualizaciones de Operaciones.

Las tres migraciones nuevas están registradas en Supabase. La migración inicial sigue siendo previa al historial remoto; no volver a aplicarla. Si se conecta una copia limpia con la CLI, conciliar ese baseline antes de reconstruir el proyecto.

## Próximos datos necesarios para operar con clientes reales

- Banco, CLABE de 18 dígitos, titular de la cuenta e instrucciones de transferencia. Se capturan desde el panel de Operaciones; las muestras conocidas por Banco de México sirven solo para verificar el algoritmo, nunca como cuenta de Oficia.
- Inventario aprobado: nombre, fotos, dirección, coordenadas, tarifas, capacidad, amenidades, horarios y reglas por espacio.
- Prueba de una solicitud y reporte de transferencia con una cuenta cliente diferente. Usar importes y transferencias ficticias; no transferir dinero para validar el prototipo.

Mientras no se completen estos datos, no publicar espacios reales, no aceptar depósitos ni mostrar como disponible un horario que la operación no haya confirmado.
