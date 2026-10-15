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
| Solicitudes | Elegir estancia, enviar, ver ticket y depósito | Agenda e historial de solicitudes de espacios propios; Operaciones valida pagos |
| Ingresos | No aplica | Importe bruto de depósitos verificados y rentas autorizadas, por espacio; excluye muestras |
| Perfil | Datos de cuenta editables, favoritos, reservas y cierre de sesión | Datos de cuenta editables, tipo de perfil fijo y cierre de sesión; acceso a Operaciones si está autorizado |

### Botones principales

- Cliente: **Explorar espacios → Ver ficha → Elegir fecha y hora → Enviar solicitud → Ver ticket → Reportar depósito → Actualizar estado**.
- Dueño: **Agregar espacio → Guardar borrador → Enviar a revisión → Consultar estado**.
- Operaciones: **Revisar espacio → Validar datos o Devolver con motivo**; **Validar depósito y autorizar**, siempre después de comprobar el banco.

## Datos, privacidad e ingresos

- `oficia_profiles` fija `cliente` o `anfitrion` bajo RLS. El rol no se confía a `user_metadata`, parámetros de URL ni almacenamiento local.
- `space_drafts` es privado para su dueño y Operaciones. Guardar o validar un borrador **no** lo publica ni habilita rentas.
- Las solicitudes siguen protegidas por RLS. El dueño solo ve las de sus espacios; el cliente solo ve las propias. Operaciones puede revisarlas por su permiso interno.
- La pantalla de ingresos suma centavos de solicitudes `confirmada` con depósito `verificado`, y solo en espacios **reales** del dueño. Muestra importe **bruto**, no utilidad neta ni dinero liquidado al anfitrión.
- No existe aún una regla de comisión, impuestos, payout ni conciliación de liquidaciones. No se mostrarán como ganancias netas hasta implementarlas y verificarlas.
- El catálogo actual contiene únicamente cuatro muestras: por eso el ingreso real presentado es $0 MXN.

## Estado y próximos cierres

| Entrega | Estado al 15 oct 2026 | Para terminar |
| --- | --- | --- |
| Elección y acceso con correo/Google | El usuario confirmó que su alta con Google Auth funciona | Probar otra cuenta de cliente y Android instalado; verificar persistencia del perfil |
| Recuperación de sesión/perfil | Consulta previa y recuperación de inserciones duplicadas implementadas; continuidad visible para sesión activa | Reabrir la app, iniciar sesión con cliente y anfitrión existentes, entrar desde ambos caminos y confirmar que el rol fijo siempre abre su inicio sin duplicar perfil |
| Personalización de nombre y foto | Metadatos de Google y edición desde Perfil implementados para ambos roles | Verificar nombre y foto guardados en una sesión real y que sobrevivan al cierre/apertura; confirmar que URL inválida no se guarde |
| Perfil fijo y permisos | Migración aplicada; RLS y bloqueos probados en transacción | Prueba funcional completa desde la interfaz |
| Panel de dueño | Inicio, espacios, solicitudes, ingresos y perfil; ficha con dirección, horario habitual y foto | Calendario de cierres, reportes y notificaciones |
| Borradores y revisión | Guardar, editar, enviar, validar o devolver; foto privada en Storage | Probar carga real y coordenadas, documentos y publicación controlada |
| Publicación de espacios reales | Pendiente | Datos y fotos autorizados; validación de ubicación, disponibilidad y condiciones |
| Historial financiero | Bruto por espacio implementado | Libro de movimientos, comisiones, impuestos, devoluciones y liquidaciones |
| Mensajes y avisos | Pendiente | Chat seguro, correos/avisos operativos y trazabilidad |
| Distribución Android | AAB 1.1.0 firmado, verificado y disponible en Play interno para un verificador | Prueba en teléfono; producción pendiente de requisitos de Play |

**Criterio de salida para el flujo de dueño:** un anfitrión nuevo puede iniciar con correo o Google, crear un borrador, enviarlo a Operaciones, recibir decisión y consultar sus propias solicitudes e ingresos reales; un cliente no puede ver ni modificar esos datos. La publicación comercial exige inventario verificado y pruebas de disponibilidad y pagos.
