# Plan de desarrollo · Oficia

**Estado actual (14 de octubre de 2026):** la app conecta el catálogo, el acceso por correo y las solicitudes a Supabase con RLS. La pantalla inicial de acceso ahora usa el video de Oficia como fondo silencioso en bucle, con capas translúcidas y formulario legible; el commit `3e55e9c` quedó listo en producción en Vercel. Perfil ofrece cerrar sesión. Google Auth está habilitado y el acceso web ya se probó con una cuenta autorizada; la app Android tiene `expo-dev-client` y perfiles EAS para desarrollo, prueba y producción. Los tipos y las exportaciones web/Android pasan; falta generar la APK nativa y registrar su firma de publicación en Google Cloud. La cuenta anfitriona ya existe y está vinculada a los cuatro espacios de muestra. El inventario continúa siendo demostrativo.

## Objetivo

Crear una app Android en español para descubrir y solicitar espacios de trabajo equipados en Delicias, Chihuahua y alrededores, desde una hora hasta varios días o semanas. La experiencia seguirá las capturas de referencia: portada visual, búsqueda, categorías, fichas con fotografías y servicios, selección de estancia y comprobante de solicitud.

## Fase 1 · Prototipo navegable

| Tarea | Estado | Entregable | Criterio de cierre |
| --- | --- | --- | --- |
| 1. Identidad Marco Oficia | Completada | Logo SVG, ícono Android PNG/SVG y sistema de color | Símbolo 03 adaptado y marca incorporada en la app |
| 2. Base visual y navegación | Completada | Componentes, íconos y cinco secciones | Navegación clara y consistente en español |
| 3. Inicio y exploración | Completada | Portada, búsqueda, categorías, promoción y catálogo | Filtrar y abrir espacios desde inicio o explorar |
| 4. Ficha y reserva | Completada | Fotos, equipo, estancia por hora/día/semana y total | Solicitud generada con datos claros, sin cobro ficticio |
| 5. Favoritos, reservas y perfil | Completada | Secciones funcionales del prototipo | Guardar favoritos y consultar solicitudes durante la sesión |
| 6. Filtros y datos locales | Completada | Filtro por capacidad/servicios y almacenamiento en el dispositivo | Favoritos y solicitudes se recuperan al abrir la app |
| 7. Panel de anfitrión de demostración | Completada | Vista de solicitudes y cambio de estado local | Confirmar o rechazar una solicitud en el mismo dispositivo |
| 8. Verificación | En curso | Tipos, compilación y recorrido en dispositivo | Tipos y exportaciones web/Android correctas; vista web verificada; prueba Android nativa pendiente |
| 9. Diseño de conexión real | Completada | `ARQUITECTURA_BACKEND.md` | Flujo cliente–anfitrión, datos y permisos definidos |

## Fase 2 · Antes del lanzamiento

| Tarea | Estado | Dependencia |
| --- | --- | --- |
| Inventario real, fotografías y precios | Pendiente | Espacios y condiciones facilitados por el negocio |
| Cuentas, roles y sincronización cliente ↔ anfitrión | En curso | Cuenta anfitriona creada y asociada a los espacios de muestra; falta probar el flujo con una segunda cuenta cliente y validar políticas RLS |
| Pantalla inicial de acceso y cierre de sesión | Completada | Login de Oficia con fondo de video silencioso en bucle, capas translúcidas, formulario legible, sesión persistente y salida confirmada desde Perfil |
| Acceso con Google en web y Android | En curso | Proveedor habilitado; acceso web verificado. El botón aparece cuando Supabase está configurado. Perfil EAS listo; falta sesión EAS para generar la APK y registrar su SHA-1 |
| Proyecto Vercel y frontend web | Completada | `oficia-delicias.vercel.app`, desplegado desde `main` en el equipo Yavoi Alonso |
| Disponibilidad, horarios y confirmación real del anfitrión | Pendiente | Reglas de operación y calendario |
| Pagos, cancelaciones y facturación | Pendiente | Proveedor de pagos y políticas comerciales |
| Mapas y ubicación | Pendiente | Direcciones reales y proveedor de mapas |
| Publicación Android | Pendiente | Cuenta de Play Console, pruebas en dispositivos y materiales legales |

## Decisiones registradas

- Marca elegida: **Oficia**, variante **03 · Marco Oficia**.
- Paleta: coral `#D35E69`, coral profundo `#B54753`, ciruela `#512D37`, rosa suave `#FFE7E9`, marfil `#FFF9F8`.
- Frase de marca: **Tu espacio, a tu hora.**
- El catálogo actual es demostrativo. Ninguna solicitud implica disponibilidad confirmada ni pago.
- El comprobante es de **solicitud enviada**; el acceso y el cobro quedan pendientes de confirmación real.
- El usuario confirmó que **todavía no hay inventario real**. Se mantienen espacios de muestra.
- El usuario eligió que **las solicitudes reales lleguen a un panel dentro de Oficia**. El panel consulta solicitudes de Supabase y la cuenta anfitriona ya está asignada a los espacios de muestra; falta validar solicitudes con una cuenta cliente distinta y completar permisos para el portal administrativo. El correo de operación se mantiene fuera de este plan público.
- La cuenta anfitriona se creó con Google y se asignó a los cuatro espacios demostrativos; el acceso al panel se basa en la relación `spaces.host_id` bajo RLS.
- Google Auth usa el proveedor de **Supabase Auth** en web y Android. Android usa el selector nativo de Google y entrega el token de identidad a Supabase; la web inicia OAuth con el mismo proveedor. Ambos caminos comparten usuario y RLS.
- Google Auth Platform está configurada para Oficia como aplicación externa y usa Supabase Auth para web y Android. Los orígenes permitidos y las cuentas de prueba se administran en Google Cloud; el acceso web quedó verificado. Las credenciales privadas no se guardan en el repositorio ni en este plan.
- Android usa el paquete `mx.oficia.delicias`. El cliente OAuth de desarrollo está registrado; falta añadir la firma de la compilación EAS cuando exista. Expo Go no soporta la biblioteca nativa; se requiere compilación de desarrollo/EAS.
- La base de datos de Oficia está en el proyecto Supabase ya existente. Los identificadores de proyecto y organización se administran en los paneles de cada proveedor y se omiten de este plan público.
- El repositorio público autorizado es [adminyavoi-creator/Oficia-Delicias](https://github.com/adminyavoi-creator/Oficia-Delicias). Código, documentos, propuestas de marca, recursos y migración SQL están publicados en `main`; las credenciales de acceso se administran fuera del repositorio.
- La versión web está desplegada en **https://oficia-delicias.vercel.app** desde el equipo **Yavoi Alonso**. `vercel.json` usa `npm ci`, `npm run build:web` y `dist`. Supabase alojará datos y lógica de reservas; no se duplicará esa lógica en otro backend.

## Registro de avances

| Fecha | Tarea terminada | Evidencia |
| --- | --- | --- |
| 14 oct 2026 | 1. Identidad Marco Oficia | `assets/marco-oficia-logo.svg`, `assets/marco-oficia-icono.svg`, `assets/icon.png`, `app.json` |
| 14 oct 2026 | 2. Base visual y navegación | `src/components/Brand.tsx`, `Icon.tsx`, `UI.tsx` y barra de cinco secciones |
| 14 oct 2026 | 3. Inicio y exploración | Portada, búsqueda, categorías, promociones y catálogo en `App.tsx` |
| 14 oct 2026 | 4. Ficha y reserva | Galería, servicios, estancia flexible, cálculo y comprobante en `App.tsx` |
| 14 oct 2026 | 5. Favoritos, reservas y perfil | Secciones navegables en `App.tsx` |
| 14 oct 2026 | 6. Filtros y datos locales | Búsqueda por servicios/capacidad y persistencia con AsyncStorage en `App.tsx` |
| 14 oct 2026 | 7. Panel de anfitrión de demostración | Ver solicitudes locales y cambiar su estado desde Perfil → Panel de anfitrión |
| 14 oct 2026 | 8. Verificación inicial | SVG/PNG y JSON válidos; sintaxis TSX procesada con esbuild. Los primeros intentos de instalar Expo fallaron por DNS. |
| 14 oct 2026 | Ajuste de la tarea 4 | Fechas y horas pasadas deshabilitadas; al reservar se elige el siguiente horario futuro. |
| 14 oct 2026 | 9. Diseño de conexión real | `ARQUITECTURA_BACKEND.md`: panel interno, estados, datos, permisos y pruebas de dos roles. |
| 14 oct 2026 | 8. Verificación técnica | Dependencias instaladas; `npm run typecheck` pasó; `npx expo export --platform web` y `--platform android` generaron paquetes sin errores. Prueba de fechas y datos de muestra correcta. |
| 14 oct 2026 | Esquema inicial de Supabase | Migración versionada `supabase/migrations/20261014191029_initial_oficia.sql` aplicada en el proyecto existente. Consulta de verificación: 4 espacios, 0 reservas, RLS `true` en `spaces` y `bookings`. |
| 14 oct 2026 | Preparación de repositorio | Git local y commit `c564574` listos. Publicación intentada tras autorización expresa; GitHub respondió 403 porque la credencial es `TheDevLogos` y el repositorio pertenece a `adminyavoi-creator`. |
| 14 oct 2026 | Preparación de Vercel | `vercel.json` configurado con `npm ci`, `npm run build:web` y salida `dist`; compilación y tipos correctos. Importación localizada en el equipo Yavoi Alonso; pendiente de código en GitHub antes de desplegar. |
| 14 oct 2026 | Auditoría de seguridad | Security Advisor de Supabase actualizado: 0 errores y 0 advertencias. |
| 14 oct 2026 | Segundo intento de publicación | El usuario indicó que conectó `adminyavoi-creator`, pero el conector y la credencial local aún reportan `TheDevLogos`; `git push` sigue devolviendo 403. No se publicó código ni se inició un despliegue vacío. |
| 14 oct 2026 | Complemento GitHub | Se instaló GitHub en ChatGPT y la interfaz confirmó la instalación. Las herramientas del conector de esta sesión aún responden «Unknown tool» y la credencial Git local sigue siendo `TheDevLogos`; el repositorio permanece vacío. |
| 14 oct 2026 | Publicación GitHub | Con el conector activo en `adminyavoi-creator`, se publicó el árbol completo de 58 archivos en `main`, incluyendo logo, propuesta de marca, app, documentos y migración SQL. Commit publicado: `943932c`. |
| 14 oct 2026 | Proyecto y despliegue Vercel | Creado `oficia-delicias` en el equipo Yavoi Alonso. La compilación web terminó correctamente y la página pública mostró la bienvenida; también se abrió Inicio y aparecieron los cuatro espacios de muestra. URL: `https://oficia-delicias.vercel.app`. |
| 14 oct 2026 | Conexión inicial con Supabase | `src/backend.ts` crea el cliente con variables públicas y almacenamiento de sesión. El catálogo usa los espacios publicados; registro/inicio de sesión por correo y reservas persistidas usan RLS y cálculo del servidor. El panel consulta solamente solicitudes de espacios vinculados a la cuenta. |
| 14 oct 2026 | Variables de producción | Vercel Production tiene `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como configuración pública. La escritura vía conector API recibió 403; se configuraron desde la sesión del panel web. `.env.local` local está ignorado y `.env.example` contiene solo marcadores. |
| 14 oct 2026 | Verificación de conexión | `npm run typecheck` y `npm run build:web` terminaron correctamente con el cliente Supabase configurado. Falta desplegar el commit y probar Auth con cuentas reales sin generar datos ficticios. |
| 14 oct 2026 | Publicación de conexión Supabase | GitHub recibió los cambios de backend y Vercel mostró una implementación `Ready` desde `main`; incluye catálogo, acceso por correo y reservas en Supabase. |
| 14 oct 2026 | Código Google Auth | Selector nativo de Google para Android y OAuth web, ambos con Supabase Auth. La integración web y Android compila; el proveedor está habilitado. La prueba nativa de Android requiere una compilación de desarrollo. |
| 14 oct 2026 | Google Auth Platform y cliente web | App Oficia registrada como externa; la Política de Datos del Usuario se aceptó y el cliente web se creó con autorización. El acceso de pruebas es limitado mientras se completa la revisión de Google. Las credenciales se gestionan directamente en Google Cloud y Supabase. |
| 14 oct 2026 | Clientes OAuth y preparación de proveedor | Se creó el cliente Android de desarrollo con autorización. El proveedor de Google quedó conectado a Supabase Auth y la configuración pública requerida está en Vercel; los secretos se mantienen fuera del repositorio. |
| 14 oct 2026 | Publicación de Google Auth | Commit `a256788` publicado en `main`; Vercel confirmó despliegue de producción Ready. `npm run typecheck`, `npm run build:web` y `npx expo export --platform android` pasaron. |
| 14 oct 2026 | Usuario de prueba OAuth | Con autorización del usuario, se agregó la cuenta anfitriona a los usuarios de prueba del proyecto Google Auth Platform. Confirmado en la lista de audiencia. |
| 14 oct 2026 | Cuenta anfitriona | La cuenta anfitriona se creó con Google y luego se asoció a los espacios de muestra de Supabase. Sus datos personales se omiten de este plan público. |
| 14 oct 2026 | Proveedor Google en Supabase | El proveedor de Google está habilitado y el acceso web se verificó con una cuenta de prueba. La prueba nativa de Android queda pendiente de la APK de desarrollo. |
| 14 oct 2026 | Plan de desarrollo y portal administrativo | Se agregó al final del plan la fase del portal profesional con módulos operativos, roles, seguridad y criterios de aceptación. Commit `0564aaa` desplegado por Vercel con estado Ready. |
| 14 oct 2026 | Corrección de retorno OAuth | Se corrigieron las URLs permitidas de Supabase para admitir producción y desarrollo. La configuración se guardó y la prueba web se completó correctamente. |
| 14 oct 2026 | Prueba web y cuenta anfitriona | Con autorización del usuario, Google inició sesión en Oficia y Supabase creó la cuenta. Se verificó el panel de anfitrión y se asociaron los cuatro espacios de muestra a `spaces.host_id`; el panel muestra 0 solicitudes hasta que un cliente cree una. |
| 14 oct 2026 | Publicación de la fase administrativa | El plan con el portal profesional quedó publicado en `main` como commit `cc0e39f`; Vercel confirmó ese despliegue en estado Ready. |
| 14 oct 2026 | Login inicial y salida desde Perfil | El inicio exige una sesión cuando Supabase está configurado, restaura la sesión válida al reabrir y muestra una salida con confirmación en Perfil. Se validaron tipos y exportaciones web/Android. |
| 14 oct 2026 | Pulido visual del acceso | Portada coral de Oficia con ubicación, beneficios, formulario y acceso Google; la vista web muestra el botón de Google cuando Supabase está configurado. Tipo, exportación web y paquete JS Android verificados; preview web revisado. |
| 14 oct 2026 | Publicación y verificación del acceso | Commit `38c0bd7` integrado en `main`; Vercel confirmó producción `Ready`. Se abrió el dominio de despliegue en una sesión sin acceso previo y se verificó que muestra el login inicial con Google, correo y contraseña. |
| 14 oct 2026 | Preparación de compilación Android nativa | Se instaló `expo-dev-client` compatible con Expo SDK 54 y se añadió `eas.json` con APK de desarrollo/prueba y AAB de producción; los perfiles incluyen las variables públicas requeridas por la app. La exportación Android no genera una APK. `npx eas-cli whoami` confirmó que no hay sesión EAS en este equipo y no hay JDK/Android SDK local; proyecto EAS, APK y su SHA-1 siguen pendientes. |
| 14 oct 2026 | Fondo de video en el acceso | El video proporcionado se integró como fondo a pantalla completa y silencioso, en bucle, con recorte adaptable y velo ciruela translúcido. El logo, la propuesta de valor y la tarjeta de acceso conservan contraste. `expo-video` permite el mismo fondo en Android y web; tipos y ambas exportaciones pasan. Commit `3e55e9c` integrado en `main`; Vercel confirmó producción `Ready`. Falta probar la reproducción en una APK instalada. |

## Correspondencia con los mockups

| Pantalla o función de referencia | Estado en Oficia |
| --- | --- |
| Bienvenida e identidad | Implementada con Marco Oficia |
| Inicio con búsqueda, categorías, promoción y espacios | Implementada con la paleta de Oficia |
| Detalle con fotos, servicios, opiniones y botón de reserva | Implementada; opiniones y fotos son ilustrativas |
| Selección de fecha y hora | Implementada como solicitud; disponibilidad real pendiente |
| Favoritos y comprobante | Implementados; el comprobante no autoriza acceso |
| Panel de anfitrión | Conectado a Supabase y limitado por `spaces.host_id`; falta la prueba con una cuenta cliente distinta |
| Mapa, ruta y distancias | Pendientes de direcciones reales y proveedor de mapas |
| Chat con anfitrión | Pendiente de cuentas, anfitriones y mensajería real |
| QR o boleto de acceso | Pendiente de confirmación real de la reserva |
| Pagos y recibo fiscal | Pendientes de proveedor y reglas comerciales |

## Próximo paso concreto

1. Probar cliente y anfitrión con cuentas distintas, enviar una solicitud de prueba controlada y validar las políticas RLS y el cambio de estado desde el panel.
2. Iniciar sesión en Expo/EAS en este equipo con `npx eas-cli login`; después generar la APK Android de desarrollo, probar Google nativo y registrar la SHA-1 de EAS en Google Cloud.
3. Registrar en el historial remoto que `20261014191029_initial_oficia.sql` ya se aplicó desde SQL Editor antes de administrar migraciones con la CLI; recibir inventario real y preparar Play Console.

## Fase final · Portal profesional de administración de Oficia

Al cerrar las tareas de lanzamiento de la app, construir un portal web interno, responsivo y en español para administrar el catálogo y toda la operación diaria de Oficia. Debe vivir en una ruta protegida del proyecto web existente, compartir Supabase como backend y conservar la app de clientes como una experiencia separada. El primer despliegue puede operar con espacios de muestra; los datos de muestra deben identificarse con claridad y no confundirse con inventario disponible para venta.

### Módulos de administración

| Módulo | Alcance requerido |
| --- | --- |
| Inicio operativo | Indicadores de solicitudes por estado, ocupación, espacios publicados, ingresos confirmados cuando existan pagos y tareas que requieren atención; filtros por periodo y sede; alertas de conflictos o datos incompletos. |
| Espacios | Alta, edición, vista previa, publicación/pausa y archivo; nombre, descripción, tipo, dirección, zona, ubicación, capacidad, privacidad, reglas, contacto, estado y anfitrión responsable; marcar explícitamente registros de demostración. |
| Fotos y equipamiento | Carga, orden, portada y retiro de fotografías en Supabase Storage; etiquetas de internet, pantalla, proyector, pizarrón, sala privada, café, accesibilidad y otros servicios; validación de imágenes y campos obligatorios antes de publicar. |
| Precios y disponibilidad | Tarifas por hora, día, semana y capacidad; mínimos de renta, horarios, días de operación, cierres, bloqueos y excepciones; calendario por espacio con zona horaria local; impedir traslapes al crear o aprobar solicitudes. |
| Solicitudes y reservas | Bandeja con búsqueda y filtros; detalle del cliente, espacio, horario, duración, precio estimado y notas; aprobar, rechazar, proponer cambio, cancelar y registrar llegada/finalización; historial de estados y motivo; diferenciar solicitud pendiente, reserva confirmada y pago liquidado. |
| Clientes y anfitriones | Consulta de perfiles, reservas e incidencias; asignación de anfitrión a espacios; activar o suspender acceso operativo sin borrar historial; permisos por rol y sede. No exponer datos personales innecesarios. |
| Mensajes y avisos | Plantillas en español para recepción, confirmación, cambio y cancelación; avisos dentro de la app y correo cuando el proveedor esté configurado; registro del envío y su resultado; no anunciar confirmaciones antes de que la operación las autorice. |
| Reportes | Solicitudes, conversión, ocupación, cancelaciones, demanda por zona y desempeño de espacios; exportación CSV con filtros y fechas; separar importes estimados de cobros reales y contemplar una futura conciliación/facturación. |
| Configuración operativa | Categorías, amenidades, zonas atendidas, horarios generales, políticas, anticipación, ventanas de cancelación, impuestos/comisiones y datos de contacto; mantener historial y señalar cambios que afecten reservas futuras. |
| Auditoría y soporte | Registro de quién cambió espacios, precios, disponibilidad, estados y permisos, con fecha y valores relevantes; búsqueda de incidencias, notas internas y acceso rápido a la reserva relacionada. |

### Entregas finales y criterios de aceptación

1. **Modelo de acceso:** definir y documentar roles `admin`, `operaciones` y `anfitrión`; proteger la ruta y cada operación en servidor/RLS, aplicar mínimo privilegio y validar permisos también en Supabase. Ningún secreto de servicio se incluye en el navegador.
2. **Diseño y navegación:** panel lateral para escritorio, navegación usable en móvil, estados vacíos, carga, error y confirmación; componentes con la identidad coral/ciruela de Oficia y lenguaje claro en español.
3. **Operación de espacios:** ciclo completo de borrador → revisión → publicado → pausado/archivado, edición de fotos/equipamiento y vista previa de la ficha pública.
4. **Operación de reservas:** ciclo completo de recepción → decisión del anfitrión → confirmación/cambio/cancelación → cierre, con controles de disponibilidad y registro auditable.
5. **Seguridad y privacidad:** políticas RLS probadas con cuenta administradora, operaciones y anfitrión; un anfitrión solo administra sus espacios y solicitudes relacionadas; clientes y roles sin permiso no acceden a la consola.
6. **Calidad:** validar formularios, errores de red, conflictos de horarios, permisos, exportaciones, accesibilidad básica, escritorio y Android móvil; comprobar que una decisión del portal se refleja correctamente en la app.
7. **Salida a producción:** documentación de uso, respaldo/recuperación, variables de entorno, despliegue de Vercel y lista de verificación; no activar cobros, disponibilidad garantizada ni notificaciones externas hasta configurar y probar sus dependencias reales.

**Definición de terminado:** el equipo de Oficia puede operar el día a día sin editar la base manualmente: publicar y mantener espacios, ver disponibilidad, gestionar solicitudes, atender anfitriones/clientes, revisar reportes y rastrear cambios. Las acciones tienen permisos verificados en backend y cada cambio importante queda auditado.
