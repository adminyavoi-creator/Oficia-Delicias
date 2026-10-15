# Plan de desarrollo · Oficia

**Estado actual (14 de octubre de 2026):** Oficia usa Vite + React + Capacitor 8, con una base para Android y PWA. El ticket de depósito, el panel de Operaciones y el mapa OpenStreetMap con ubicaciones de muestra ya están implementados. La vista personal de reservas y los favoritos se separan por cuenta; el cambio se publicó en GitHub `main` como `2bd9118`. Las pruebas automatizadas, el build PWA y la sincronización Android pasan; el chequeo de Vercel está pendiente de terminar. `npm run build` y `npx cap sync android` pasan; Vite avisa que el JavaScript principal supera 500 kB. GitHub reporta el chequeo de Vercel como `success`; la API del equipo devuelve 403 y la verificación visual del dominio fue denegada por el navegador de prueba. Tres migraciones nuevas aparecen aplicadas y registradas en Supabase. La CLABE sigue vacía porque faltan banco, titular y cuenta; los cuatro espacios son de muestra y no aceptan depósitos. Hay una solicitud en Supabase y no existe inventario real. No se ha generado un AAB nuevo: Gradle no encuentra Android SDK en este entorno. En Play Console, la prueba interna `1.0.0` sigue activa para un verificador; hace falta preparar y probar una actualización Android. Para solicitar producción se requiere una prueba cerrada con 12 verificadores durante 14 días.

## Objetivo

Crear una app Android en español para descubrir y solicitar espacios de trabajo equipados en Delicias, Chihuahua y alrededores, desde una hora hasta varios días o semanas. La experiencia seguirá las capturas de referencia: portada visual, búsqueda, categorías, fichas con fotografías y servicios, selección de estancia y comprobante de solicitud.

## Fase 1 · Prototipo navegable

| Tarea | Estado | Entregable | Criterio de cierre |
| --- | --- | --- | --- |
| 1. Identidad Marco Oficia | Completada | Logo SVG, ícono Android PNG/SVG y sistema de color | Símbolo 03 adaptado y marca incorporada en la app |
| 2. Base visual y navegación | Completada | Componentes, íconos y cinco secciones | Navegación clara y consistente en español |
| 3. Inicio y exploración | Completada | Portada, búsqueda, categorías, promoción y catálogo | Filtrar y abrir espacios desde inicio o explorar |
| 4. Ficha, solicitud y ticket | Completada; banco pendiente | Fotos, equipo, estancia, total y referencia para depósito | Ticket claro; no permite depósitos con datos de muestra o cuenta sin configurar |
| 5. Favoritos, reservas y perfil | Completada | Secciones funcionales del prototipo | Guardar favoritos y consultar solicitudes durante la sesión |
| 6. Filtros y datos locales | Completada | Filtro por capacidad/servicios y almacenamiento en el dispositivo | Favoritos y solicitudes se recuperan al abrir la app |
| 7. Panel de anfitrión | Completada, solo consulta | Consulta solicitudes relacionadas con sus espacios | El anfitrión no valida depósitos ni autoriza rentas |
| 8. Migración y verificación tecnológica | Completada | Vite + React + Capacitor 8; mantener Supabase y el PWA como una base compartida | Migración, build PWA, sincronización Android, AAB firmado y acceso a la web pública verificados. Las pruebas de dispositivo y autenticación nativa siguen en la fase de lanzamiento |
| 9. Diseño de conexión real | Completada | `ARQUITECTURA_BACKEND.md` | Flujo cliente–anfitrión, datos y permisos definidos |
| 10. Mapa en Explorar | Completada con datos de muestra | Mapa OpenStreetMap, arrastre, zoom, precios y acceso a las fichas | Marcadores aproximados identificados como muestra; coordenadas reales siguen pendientes |
| 11. Ticket y depósitos por transferencia | Implementada; datos bancarios pendientes | Referencia única, CLABE validada, reporte de folio y validación exclusiva de Operaciones | El servidor impide confirmar antes de verificar el depósito; espacios de muestra nunca solicitan dinero |

## Mejora de experiencia · Mockups Oficia

| Entrega | Estado | Resultado |
| --- | --- | --- |
| Catálogo de muestra claro | Completada | Las tarjetas y fichas identifican espacios de muestra y no muestran calificaciones ficticias. |
| Fotos de la ficha | Completada | Las miniaturas cambian la imagen principal y conservan nombres accesibles. |
| Orden de resultados | Completada | Explorar puede ordenar por recomendación, menor precio o mayor capacidad; mantiene búsqueda, categoría, capacidad y servicios. |
| Solicitud transparente | Completada | El ticket distingue solicitud, transferencia reportada y autorización; los importes de muestra no aceptan depósitos. |
| Mapa, ubicación y acceso | Mapa de muestra implementado | OSM muestra precios y ubicaciones aproximadas de muestra. Los puntos reales y navegación se activan al recibir coordenadas verificadas. |
| Ticket y depósito | Flujo de aplicación completo; CLABE pendiente | Ticket con referencia única, folio bancario y bandeja de Operaciones; la cuenta aún no se captura. |

## Fase 2 · Antes del lanzamiento

| Tarea | Estado | Dependencia |
| --- | --- | --- |
| Inventario real, fotografías y precios | Pendiente | Espacios y condiciones facilitados por el negocio |
| Cuentas, roles y sincronización cliente ↔ anfitrión | En curso | RLS separa cliente, anfitrión y Operaciones. “Mis reservas” filtra por titular y Favoritos se guarda por cuenta; falta prueba funcional con una segunda cuenta real |
| Pantalla inicial de acceso y cierre de sesión | Completada | Login de Oficia y salida desde Perfil implementados; verificado en una sesión web limpia en producción |
| Acceso con Google en web y Android | En curso | Google web está verificado; el puente Android compila. Probarlo en un teléfono y registrar la firma Play App Signing en Google Auth después de cargar el primer paquete |
| Proyecto Vercel y frontend web | Verificado | Producción desde `main` quedó `READY`; el login público carga con Google, correo y contraseña. La conexión de Vercel ya permite consultar el proyecto y el deployment. |
| Disponibilidad, horarios y confirmación real | En curso | Operaciones autoriza tras verificar el depósito y se bloquean traslapes; falta calendario real por espacio |
| Depósitos manuales por transferencia | Implementado, sin cuenta configurada | Faltan banco, CLABE, titular e instrucciones; sin ello la app bloquea el reporte del depósito |
| Pagos automáticos, cancelaciones y facturación | Pendiente | No se cobrarán tarjetas ni emitirá recibos fiscales hasta definir proveedor y políticas |
| Mapa y ubicaciones reales | Mapa OSM implementado con muestra | Falta cargar coordenadas verificadas del inventario real |
| Publicación Android | En curso | Track de prueba interna activo con AAB `1.0.0` y un verificador Oficia; faltan ficha/privacidad y datos, prueba en teléfono, huella Play App Signing en Google Auth y prueba cerrada de 12 verificadores por 14 días antes de solicitar producción |

## Decisiones registradas

- Marca elegida: **Oficia**, variante **03 · Marco Oficia**.
- Paleta: coral `#D35E69`, coral profundo `#B54753`, ciruela `#512D37`, rosa suave `#FFE7E9`, marfil `#FFF9F8`.
- Frase de marca: **Tu espacio, a tu hora.**
- El catálogo actual es demostrativo. Ninguna solicitud de muestra implica disponibilidad confirmada ni pago.
- El ticket muestra una referencia única para depósito. Operaciones verifica la cuenta y autoriza la renta; los anfitriones no pueden cambiar ese estado.
- Banco, CLABE y titular siguen vacíos. El panel valida la CLABE antes de guardarla y el ticket no permite reportar depósitos mientras falten esos datos.
- El mapa OSM presenta ubicaciones aproximadas solo para los cuatro registros de muestra; no son domicilios reales ni sirven para llegar al espacio.
- El usuario confirmó que **todavía no hay inventario real**. Se mantienen espacios de muestra.
- El usuario eligió que **las solicitudes reales lleguen a un panel dentro de Oficia**. Ya existe un panel de Operaciones protegido en base de datos, además del panel de consulta del anfitrión. Falta validar el ciclo con una segunda cuenta cliente.
- La cuenta anfitriona se creó con Google y se asignó a los cuatro espacios demostrativos; el acceso al panel se basa en la relación `spaces.host_id` bajo RLS.
- Google Auth usa el proveedor de **Supabase Auth** en web y Android. Android usa el selector nativo de Google y entrega el token de identidad a Supabase; la web inicia OAuth con el mismo proveedor. Ambos caminos comparten usuario y RLS.
- Google Auth Platform está configurada para Oficia como aplicación externa y usa Supabase Auth para web y Android. Los orígenes permitidos y las cuentas de prueba se administran en Google Cloud; el acceso web quedó verificado. Las credenciales privadas no se guardan en el repositorio ni en este plan.
- El código local de Oficia ya migró de Expo/EAS a Vite 8.2.2 + React 19 + Capacitor 8.4.3, la misma familia tecnológica comprobada en Yavoi!. Gradle genera paquetes Android y el PWA usa los mismos componentes y proyecto Supabase; Android empaqueta el frontend en `dist` y no depende de Vercel para abrir.
- Entorno local actual: Node 26 y JDK 21 de Homebrew. La última compilación Android falló porque Gradle no encontró Android SDK; una entrega anterior sí pudo generar el AAB 1.0.0. `targetSdk` permanece en 36.
- El AAB se firma con una llave de carga local y excluida de Git. La llave y `android/upload-key.properties` deben respaldarse en un gestor seguro; no se publican en GitHub ni Vercel. Play App Signing tendrá su propia llave después de aceptar el flujo de Play Console.
- La base de datos de Oficia está en el proyecto Supabase ya existente. Los identificadores de proyecto y organización se administran en los paneles de cada proveedor y se omiten de este plan público.
- El repositorio público autorizado es [adminyavoi-creator/Oficia-Delicias](https://github.com/adminyavoi-creator/Oficia-Delicias). El commit `6131e0e` integra Vite + Capacitor y elimina la configuración Expo/EAS. La llave Android y los archivos de entorno están excluidos del control de versiones.
- La URL **https://oficia-delicias.vercel.app** mostró la pantalla de acceso Vite en una revisión anterior. GitHub reporta el deployment del commit `037ce82` como `success`. El conector Vercel devuelve 403 para `yavoi-alonso` y la CLI no pudo cargar la sesión; además, el navegador de prueba rechazó abrir el dominio. El build quedó confirmado, pero falta una revisión visual autorizada de la pantalla.
- Supabase está en el plan Free: cuatro espacios, una solicitud y RLS en `spaces`, `bookings` y `transfer_settings`. Tras las migraciones, Security Advisor no reporta errores; conserva la advertencia `Leaked Password Protection Disabled` (función de plan superior). Performance Advisor muestra dos índices sin uso, información esperable con una sola reserva. No se cambiará el plan ni se generarán cargos.

## Registro de avances

| Fecha | Tarea terminada | Evidencia |
| --- | --- | --- |
| 14 oct 2026 | 1. Identidad Marco Oficia | `assets/marco-oficia-logo.svg`, `assets/marco-oficia-icono.svg`, `assets/icon.png`, `app.json` |
| 14 oct 2026 | 2. Base visual y navegación | `src/components/Brand.tsx`, `Icon.tsx`, `UI.tsx` y barra de cinco secciones |
| 14 oct 2026 | 3. Inicio y exploración | Portada, búsqueda, categorías, promociones y catálogo en `App.tsx` |
| 14 oct 2026 | 4. Ficha y reserva | Galería, servicios, estancia flexible, cálculo y comprobante en `App.tsx` |
| 14 oct 2026 | 5. Favoritos, reservas y perfil | Secciones navegables en `App.tsx` |
| 14 oct 2026 | 6. Filtros y datos locales | Búsqueda por servicios/capacidad y persistencia con AsyncStorage en `App.tsx` |
| 14 oct 2026 | 7. Panel de anfitrión de demostración | Consulta solicitudes desde Perfil → Panel de anfitrión; el anfitrión no cambia estados de pago ni autoriza rentas. |
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
| 14 oct 2026 | Fondo de video en el acceso | El video proporcionado se integró como fondo a pantalla completa y silencioso, en bucle, con recorte adaptable y velo ciruela translúcido. El logo, la propuesta de valor y la tarjeta de acceso conservan contraste. `expo-video` permite el mismo fondo en Android y web; tipos y ambas exportaciones pasan. Commit `3e55e9c` integrado en `main`; Vercel confirmó producción `Ready`. Falta probar la reproducción en una APK instalada. La auditoría npm reporta 39 avisos; se deja su revisión como paso previo a Play Store para evitar actualizaciones mayores automáticas sobre Expo SDK 54. |
| 14 oct 2026 | Corrección del login web en blanco | La sesión limpia reproducía `Cannot read properties of undefined (reading 'SharedObject')` al cargar `expo-video`. Se importó `expo` antes del reproductor para inicializar el núcleo. Tipos y exportación web pasan. Commit `3d06d93` publicado en `main`; Vercel reportó éxito y se confirmó el login con Google, correo y contraseña en producción. |
| 14 oct 2026 | Revisión de Expo/EAS frente a Yavoi! | El chat y el proyecto de Yavoi! confirman Vite 8.2.2 + Capacitor 8.4.3 y Android/Gradle nativo; Oficia usa Expo SDK 54 + React Native 0.81. Expo puede compilar sin EAS mediante Android/Gradle local, y Capacitor también requiere Android Studio/SDK para APK nativa. Conforme a la preferencia del usuario, el plan cambia a una migración gradual a Vite + React + Capacitor; en esta revisión no se tocó el runtime publicado ni se cambió el código de la app. |
| 14 oct 2026 | Migración local a Vite + Capacitor | Vite 8.2.2, React 19 y Capacitor 8.4.3 reemplazan Expo/EAS; Android usa el paquete `mx.oficia.delicias` y el mismo Supabase que el PWA. `npm run typecheck`, build PWA, `cap sync android` y `bundleRelease` pasan. La PWA precarga 8 recursos y excluye el video. El AAB release firmado mide 10,678,302 bytes; `jarsigner` confirma la firma. No se publicó todavía en GitHub/Vercel ni Play Console. |
| 14 oct 2026 | Verificación de Supabase y Google Play | Supabase `ACTIVE_HEALTHY`: 4 espacios, 1 solicitud y RLS activo en `spaces`/`bookings`. Security Advisor reporta cero errores, una advertencia de leaked password protection (función Pro+) y una nota informativa de índice sin uso; el proyecto está en Free y no se solicitó una mejora de plan. En Play Console se comprobó que `mx.oficia.delicias` está disponible; el borrador espera la confirmación del titular de dos declaraciones obligatorias. |
| 14 oct 2026 | Preparación de despliegue y pruebas | `oficia-delicias.vercel.app` sigue en la versión anterior. La consulta Vercel al equipo `yavoi-alonso` devuelve 403 y la CLI pide vincular el proyecto; la rama pública `main` aún contiene Expo. La compilación de Android no se instaló en un teléfono: ADB no pudo abrir su socket en este entorno. Revisar el acceso de Vercel, publicar el cambio y probar dispositivo físico antes de declarar listo para producción. |
| 14 oct 2026 | Borrador de Google Play | Con autorización del titular, se creó «Oficia: espacios de trabajo» en la cuenta TheLogosDev con `mx.oficia.delicias`, gratis y español latinoamericano; se confirmaron las declaraciones de políticas y exportación. Play Console indica que esta cuenta necesita 12 verificadores en prueba cerrada durante 14 días para solicitar acceso a producción. |
| 14 oct 2026 | Auditoría de dependencias | `npm audit --omit=dev` reporta 0 vulnerabilidades de producción. La auditoría completa reporta 21 avisos solo en dependencias de desarrollo; la corrección forzada requeriría subir React Native de tipos a 0.87.1 con cambio mayor, por lo que no se aplicó automáticamente. |
| 14 oct 2026 | Publicación de la migración Vite/Capacitor | Commit `6131e0e` publicado en `main` de [adminyavoi-creator/Oficia-Delicias](https://github.com/adminyavoi-creator/Oficia-Delicias). La página pública de Oficia se recargó y mostró el título y la nueva pantalla de acceso. La conexión Vercel denegó la consulta de metadatos del deployment (403); el estado del build queda pendiente de revisar en el panel. Llave de firma y `.env.local` excluidos. |
| 14 oct 2026 | AAB cargado a prueba interna | Play Console aceptó `app-release.aab` como borrador «Oficia Android 1.0.0» (`1.0.0`, `targetSdk 36`, tamaño aproximado 10.7 MB). No se publicó: Google advierte que no hay verificadores seleccionados y el track quedaría inaccesible. No se reutilizaron listas de pruebas de DeliCrunch ni Yavoi!. Falta elegir una cuenta autorizada para Oficia. |
| 14 oct 2026 | Prueba interna publicada | Se creó la lista «Verificadores Oficia» con el verificador autorizado por el titular y se activó la versión «Oficia Android 1.0.0» en el track interno. Play Console confirma estado Activo, un verificador disponible y el enlace https://play.google.com/apps/internaltest/4701624000733155086. La versión aún no está aprobada ni publicada en producción; el nombre de descarga puede aparecer como `mx.oficia.delicias (unreviewed)`. |
| 14 oct 2026 | Pulido de exploración según mockups | Las fotos de la ficha ahora se seleccionan desde miniaturas; el catálogo identifica los cuatro espacios como muestra y oculta estrellas/opiniones no verificadas. Se añadió orden por menor precio o mayor capacidad, compatible con los filtros existentes. El resumen de solicitud explica qué precio es ilustrativo y cuándo se confirma disponibilidad; no promete acceso ni cobro. Pasan `npm run build` y `npm run android:sync`. La versión web pública de producción quedó `READY` y se comprobó el login; el flujo de catálogo requiere sesión y debe probarse con la cuenta cliente. |
| 14 oct 2026 | Verificación del esquema remoto tras migración | Supabase `vfvqmlsgqxiarmbquhco` está `ACTIVE_HEALTHY`; hay 4 espacios (los 4 de muestra), 1 solicitud y RLS activo. Se inspeccionaron las políticas de lectura/creación/gestión. El listado remoto de migraciones está vacío pese a existir las tablas: la migración inicial fue aplicada manualmente desde SQL Editor. Conciliar el historial antes de gestionar DDL con CLI; no volver a aplicar la migración inicial. |
| 14 oct 2026 | Mapa OSM, ticket de depósito y revisión de Operaciones | Explorar incorpora mapa OpenStreetMap con precios, controles y cuatro ubicaciones marcadas como muestra. El ticket muestra referencia única; el cliente reporta folio y Operaciones valida antes de autorizar. Los datos bancarios quedan vacíos y las muestras bloquean depósitos. |
| 14 oct 2026 | Migraciones de depósitos y seguridad | Supabase registra `booking_deposits_and_operations`, `harden_operations_permissions` y `validate_clabe_and_lock_booking_fields`. La CLABE de prueba pública `002180032240946700` valida y su variante con dígito cambiado se rechaza. Security Advisor: 0 errores, 1 advertencia de protección de contraseñas filtradas; no hay un test completo con otra cuenta cliente. |
| 14 oct 2026 | Verificación local de PWA y Android | `npm run build` y `npx cap sync android` terminaron correctamente. Vite mostró una advertencia de tamaño del bundle JavaScript (800.76 kB sin comprimir); el precache PWA incluye 8 recursos y excluye el video. No se publicó esta copia local ni se verificó una APK instalada. |
| 14 oct 2026 | Revisión actual de Vercel y repositorio | GitHub confirma que `adminyavoi-creator/Oficia-Delicias` existe y acepta cambios de la cuenta conectada. La API de Vercel devuelve 403 para el equipo Yavoi Alonso; la CLI termina con error al cargar sesión. Resolver la entrega mediante el flujo Git conectado y comprobar el dominio público antes de marcarlo publicado. |
| 14 oct 2026 | Publicación de mapa y depósitos | Commit `037ce82` publicado en `main` sobre la última versión del repositorio; incluye la app, ticket, mapa, tres migraciones y documentación. GitHub confirma el estado de Vercel como `success`. La API Vercel devuelve 403 y el navegador de prueba no permitió la revisión visual del dominio. |
| 14 oct 2026 | Preparación de la siguiente entrega Android | `npm run build` y `npx cap sync android` pasan. Gradle encontró el JDK 21, pero no hay Android SDK ni `android/local.properties` en este entorno; `bundleRelease` se detuvo antes de compilar. No se produjo un AAB nuevo. |
| 14 oct 2026 | Privacidad entre cuentas | La bandeja personal filtra por `client_id`, aunque Operaciones vea todas las solicitudes; Favoritos usa almacenamiento por cuenta y se limpia la sesión al salir. Prueba automatizada con dos titulares, compilación PWA y sincronización Android correctas. Publicado como `2bd9118`; falta probar el cambio en dos cuentas reales y en Android instalado. |

## Correspondencia con los mockups

| Pantalla o función de referencia | Estado en Oficia |
| --- | --- |
| Bienvenida e identidad | Implementada con Marco Oficia |
| Inicio con búsqueda, categorías, promoción y espacios | Implementada con la paleta de Oficia |
| Detalle con fotos, servicios, opiniones y botón de reserva | Galería interactiva; catálogo de muestra identificado y reseñas ficticias ocultas |
| Selección de fecha y hora | Implementada como solicitud; disponibilidad real pendiente |
| Favoritos y comprobante | Implementados; favoritos separados por cuenta y comprobante sin autorización de acceso |
| Panel de anfitrión y Operaciones | Conectado a Supabase; Operaciones verifica depósitos y autoriza, anfitrión solo consulta |
| Mapa | OpenStreetMap con precios y cuatro puntos aproximados de muestra; ubicaciones reales pendientes |
| Chat con anfitrión | Pendiente de cuentas, anfitriones y mensajería real |
| QR o boleto de acceso | Pendiente de confirmación real de la reserva |
| Ticket y depósito | Implementados; banco, CLABE y titular pendientes de configuración |
| Cobro automático y recibo fiscal | Pendientes de proveedor y reglas comerciales |

## Próximo paso concreto

1. Verificar con dos cuentas reales que “Mis reservas” y Favoritos permanecen separados, y que Operaciones recibe una transferencia reportada sin exponer otras reservas en la bandeja personal.
2. Resolver el Android SDK del entorno, compilar un AAB con nuevo `versionCode` y probar Google Auth, solicitud y ticket en un teléfono antes de actualizar la prueba interna.
3. Revisar visualmente el despliegue público cuando el navegador de prueba autorice abrir el dominio. El chequeo del build de Vercel por GitHub sí puede verificarse.
4. Completar ficha de Play, privacidad, seguridad de datos y eliminación de cuenta; conseguir 12 verificadores para la prueba cerrada de 14 días.
5. Implementar calendario operativo, bloqueo de horarios y portal administrativo de la fase final. Mantener transferencias desactivadas hasta que Operaciones configure banco, titular y CLABE reales.
6. Al final, incorporar inventario autorizado con fotos, direcciones, coordenadas, tarifas y horarios; validar mapa, disponibilidad, acceso y reseñas con datos reales.

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
