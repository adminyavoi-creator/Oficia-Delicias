Warning: truncated output (original token count: 5682)
Total output lines: 130

# Plan de desarrollo · Oficia

## Decisión vigente · 15 oct 2026

La aplicación opera **solo con tickets informativos**. La solicitud muestra folio e importe estimado; el dueño ve renta base, comisión hipotética de Oficia del 15%, IVA estimado sobre esa comisión y referencia neta antes de sus impuestos. Ninguna cifra implica cobro, ingreso confirmado o liquidación. Se retiraron CLABE, reporte de transferencia y validación de depósitos de las pantallas; una migración revoca las rutas de actualización de pagos en la API. Las referencias a depósitos en el historial de abajo son hitos anteriores, no funciones activas.

**Pendientes prioritarios:** validar tickets y desglose con cuentas cliente/dueño reales; probar publicación de un espacio y foto real cuando exista inventario; comprobar PWA y Android en teléfono; definir con asesor fiscal/contratos el modelo antes de cualquier flujo de dinero.


**Estado actualizado (16 de octubre de 2026):** Oficia comparte Vite + React + Capacitor 8 entre PWA y Android. Las solicitudes reales pueden ser aceptadas/rechazadas por el anfitrión sin pagos; después de la hora de salida puede cerrar la renta, habilitando una reseña única del cliente. Promedios y tres opiniones recientes proceden de Supabase y las opiniones de muestra se excluyen. La moderación y la privacidad están controladas por RLS. TypeScript, compilación web y 14 pruebas pasan. Android 1.3.0/código 13 se compiló con el mismo frontend que el PWA y se publicó en el track interno. Producción de Play no se modificó. La app no cobra, retiene ni concilia dinero. Inventario real, prueba del ciclo con dos cuentas y verificación en teléfono siguen pendientes. Véase [el plan de perfiles](PLAN_PERFILES_Y_ANFITRIONES.md).

**Notificaciones push (actualización 16 de octubre de 2026):** Firebase Cloud Messaging quedó activado de forma compartida para PWA y Android con el proyecto «Oficia Push» en plan Spark. La cuenta de servicio se guarda únicamente como secreto de Edge Functions; Vault conserva la URL y la clave pública del programador. `pg_cron` ejecuta el worker cada minuto y una invocación comprobada respondió `200` sin error. El worker conserva JWT obligatorio, procesa solicitudes, cambios de referencia, reseñas, recordatorios y campañas con preferencias por cuenta/dispositivo. Para web envía datos para que el service worker muestre un solo aviso y abra la ruta correspondiente; para Android usa notificación nativa de alta prioridad. `VITE_FCM_ENABLED` está activo en Vercel y Android 1.3.0/código 13 ya está en el track interno. Falta comprobar en dispositivos reales la autorización, recepción con la app cerrada, baja por dispositivo y navegación al aviso. Ninguna clave privada se guarda en GitHub, Vercel ni el cliente.

## Objetivo

Crear una app Android en español para descubrir y solicitar espacios de trabajo equipados en Delicias, Chihuahua y alrededores, desde una hora hasta varios días o semanas. La experiencia seguirá las capturas de referencia: portada visual, búsqueda, categorías, fichas con fotografías y servicios, selección de estancia y comprobante de solicitud.

## Fase 1 · Prototipo navegable

| Tarea | Estado | Entregable | Criterio de cierre |
| --- | --- | --- | --- |
| 1. Identidad Marco Oficia | Completada | Logo SVG, ícono Android PNG/SVG y sistema de color | Símbolo 03 adaptado y marca incorporada en la app |
| 2. Base visual y navegación | Completada | Componentes, íconos y cinco secciones | Navegación clara y consistente en español |
| 3. Inicio y exploración | Completada | Portada, búsqueda, categorías, promoción y catálogo | Filtrar y abrir espacios desde inicio o explorar |
| 4. Ficha, solicitud y ticket | Completada | Fotos, equipo, estancia, importe estimado y folio | Ticket informativo; no ofrece pagos ni confirma disponibilidad |
| 5. Favoritos, reservas y perfil | Completada | Secciones funcionales del prototipo | Guardar favoritos y consultar solicitudes durante la sesión |
| 6. Filtros y datos locales | Completada | Filtro por capacidad/servicios y almacenamiento en el dispositivo | Favoritos y solicitudes se recuperan al abrir la app |
| 7. Panel de anfitrión | Completada, solo consulta | Consulta solicitudes relacionadas con sus espacios | El anfitrión ve solicitudes y desglose estimado por ticket |
| 8. Migración y verificación tecnológica | Completada | Vite + React + Capacitor 8; mantener Supabase y el PWA como una base compartida | Migración, build PWA, sincronización Android y AAB firmado 1.2.7/código 10 publicado en prueba interna |
| 9. Diseño de conexión real | Completada | `ARQUITECTURA_BACKEND.md` | Flujo cliente–anfitrión, datos y permisos definidos |
| 10. Mapa en Explorar | Completada con datos de muestra | Mapa OpenStreetMap, arrastre, zoom, precios y acceso a las fichas | Marcadores aproximados identificados como muestra; coordenadas reales siguen pendientes |
| 11. Tickets informativos | Vigente; pagos suspendidos | Folio único, desglose estimado y bloqueo de rutas bancarias | El servidor permite crear/leer tickets e impide actualizar estados de pago |
| 12. Notificaciones push | Publicadas en PWA y Android; prueba física pendiente | Firebase Spark, registro nativo y web por dispositivo, permisos y preferencias por tipo de cuenta, eventos de solicitudes, seguimiento de referencias, worker y plantillas | Confirmar permiso, entrega con app cerrada, navegación y baja por dispositivo en Android y PWA |

### Batería inicial de avisos

| Perfil | Activador | Mensaje |
| --- | --- | --- |
| Cliente | Envía una solicitud real | **Solicitud enviada:** Tu solicitud para {espacio} quedó registrada. |
| Cliente | El anfitrión cambia el estado | **Actualización de solicitud:** {espacio} actualizó tu solicitud. Consulta su estado en Reservas. |
| Cliente | 24 horas antes de una renta confirmada | **Tu renta es mañana:** Mañana tienes una renta en {espacio}. Consulta los datos de tu ticket. |
| Cliente | Se cierra una renta real | **¿Cómo estuvo tu espacio?:** Deja una opinión sobre {espacio} para ayudar a otros clientes. |
| Cliente | Campaña de Operaciones y aceptación promocional | **Encuentra tu próximo espacio:** Explora los espacios de Oficia para organizar tu siguiente jornada. |
| Anfitrión | Llega una solicitud real | **Nueva solicitud:** Tienes una solicitud para {espacio}. Revisa fecha y duración en Oficia. |
| Anfitrión | 24 horas antes de una renta confirmada | **Tu espacio recibe una renta mañana:** Mañana comienza una renta en {espacio}. Revisa los detalles. |
| Anfitrión | Operaciones revisa una ficha | **Actualización de tu espacio:** {espacio} fue revisado. Consulta el resultado y los siguientes pasos. |
| Anfitrión | Se cierra una renta o llega una opinión | **Renta finalizada:** La renta de {espacio} quedó marcada como realizada. |
| Anfitrión | Campaña de Operaciones y aceptación promocional | **Mejora tu ficha en Oficia:** Mantén al día horarios, fotos y servicios para recibir solicitudes. |

## Mejora de experiencia · Mockups Oficia

| Entrega | Estado | Resultado |
| --- | --- | --- |
| Catálogo de muestra claro | Completada | Las tarjetas y fichas identifican espacios de muestra y no muestran calificaciones ficticias. |
| Fotos de la ficha | Completada | Las miniaturas cambian la imagen principal y conservan nombres accesibles. |
| Orden de resultados | Completada | Explorar puede ordenar por recomendación, menor precio o mayor capacidad; mantiene búsqueda, categoría, capacidad y servicios. |
| Solicitud transparente | Completada | El ticket distingue solicitud e importe ilustrativo; no ofrece datos bancarios ni recibe dinero. |
| Mapa, ubicación y acceso | Mapa de muestra y selector de ubicación implementados | Explorar muestra coordenadas aproximadas para muestras; el alta de anfitrión permite elegir el punto exacto con mapa OSM arrastrable y zoom, y guarda latitud/longitud antes de revisión. Solo se hace pública la ubicación de una ficha aprobada. |
| Ticket compartible | Completada | Folio propio, estancia, importe estimado, compartir resumen y bandeja de consulta en Operaciones. |
| Calendario de disponibilidad | Horarios, cierres y rentas autorizadas | Se deshabilitan fechas y horas cerradas o ya reservadas; la base comparte únicamente inicio y fin de rentas autorizadas. El dueño bloquea fechas hasta 180 días desde su panel con navegación por mes; el servidor vuelve a validar antes de autorizar. |
| Calificaciones y opiniones verificadas | Implementado en web, PWA y Android; migraciones aplicadas a Supabase | Una reseña por renta real finalizada, estrellas de 1 a 5, comentario y fecha; ficha muestra promedio y hasta tres opiniones recientes; Operaciones puede ocultar o volver a publicar. Los espacios de muestra están excluidos. |
| Notificaciones push y preferencias | Activadas en servidor; prueba de dispositivos pendiente | Diez plantillas para clientes/anfitriones; registro token Android/PWA, preferencias y avisos generados por solicitudes, revisiones y cambios reales. El permiso se solicita cuando el usuario lo activa desde Oficia. |

## Fase 2 · Antes del lanzamiento

| Tarea | Estado | Dependencia |
| --- | --- | --- |
| Una app, dos perfiles fijos | Publicado en `4f1d74a`; Vercel `success` | Elección antes del alta, cuentas existentes preservadas; probar correo/Google con nuevas cuentas |
| Panel de dueño y borradores | Ficha ampliada y revisión interna | Probar carga de foto en cuenta real, calendario de cierres y publicación comercial con inventario verificado |
| Tickets y desglose para anfitrión | Desglose informativo implementado | Base, tarifa Oficia hipotética 15% e IVA estimado sobre esa tarifa visibles por solicitud activa. Sin cobro, CFDI ni liquidación; falta dictamen fiscal y contrato |
| Inventario real, fotografías y precios | Pendiente | Espacios y condiciones facilitados por el negocio |
| Cuentas…682 tokens truncated…Recursos de ficha Google Play | Cargados y guardados; ficha lista para enviar a revisión, con orden visual pendiente | Ícono 512 × 512, portada 1024 × 500, textos y siete capturas por categoría: teléfono y tablet de 7 pulgadas (1080 × 1920), tablet 10 pulgadas (1440 × 2560). La categoría es Negocios; el contacto publicado es admin.yavoi@gmail.com y el sitio es https://oficia-delicias.vercel.app/. El usuario confirmó diseño manual; se declaró «No etiquetar recursos». No se envió la ficha a revisión ni se publicó la app. Las imágenes de tablet conservan el contenido del teléfono con márgenes y redimensionamiento; no son capturas nativas de tablet. El teléfono de contacto sigue sin proporcionarse y la cuadrícula de Console no quedó en la secuencia numerada. |

## Decisiones registradas

- Marca elegida: **Oficia**, variante **03 · Marco Oficia**.
- Paleta: coral `#D35E69`, coral profundo `#B54753`, ciruela `#512D37`, rosa suave `#FFE7E9`, marfil `#FFF9F8`.
- Frase de marca: **Tu espacio, a tu hora.**
- El catálogo actual es demostrativo. Ninguna solicitud de muestra implica disponibilidad confirmada ni pago.
- El ticket muestra un folio informativo. No solicita transferencias ni demuestra un pago o renta autorizada.
- Las rutas de datos bancarios y actualización de estados de pago están revocadas en Supabase; los datos históricos permanecen.
- El mapa OSM presenta ubicaciones aproximadas solo para los cuatro registros de muestra; no son domicilios reales ni sirven para llegar al espacio.
- El usuario confirmó que **todavía no hay inventario real**. Se mantienen espacios de muestra.
- El usuario eligió que **las solicitudes reales lleguen a un panel dentro de Oficia**. Ya existe un panel de Operaciones protegido en base de datos, además del panel de consulta del anfitrión. Falta validar el ciclo con una segunda cuenta cliente.
- La cuenta anfitriona se creó con Google y se asignó a los cuatro espacios demostrativos; el acceso al panel se basa en la relación `spaces.host_id` bajo RLS.
- El resumen por ticket separa renta base, tarifa hipotética de Oficia (15%) e IVA estimado sobre esa tarifa (16%). No representa ingreso, CFDI ni liquidación. No calcula impuesto de renta ni retenciones personales porque dependen de la estructura contractual, cobro y situación fiscal del anfitrión.
- Google Auth usa el proveedor de **Supabase Auth** en web y Android. Android usa el selector nativo de Google y entrega el token de identidad a Supabase; la web inicia OAuth con el mismo proveedor. Ambos caminos comparten usuario y RLS.
- Google Auth Platform está configurada para Oficia como aplicación externa y usa Supabase Auth para web y Android. Los orígenes permitidos y las cuentas de prueba se administran en Google Cloud; el acceso web quedó verificado. Las credenciales privadas no se guardan en el repositorio ni en este plan.
- El código local de Oficia ya migró de Expo/EAS a Vite 8.2.2 + React 19 + Capacitor 8.4.3, la misma familia tecnológica comprobada en Yavoi!. Gradle genera paquetes Android y el PWA usa los mismos componentes y proyecto Supabase; Android empaqueta el frontend en `dist` y no depende de Vercel para abrir.
- Entorno Android verificado: OpenJDK 21 ya estaba instalado en `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home` y el SDK en `/opt/homebrew/share/android-commandlinetools`. Gradle generó el AAB 1.2.5/código 8 con estas rutas explícitas; `jarsigner` verificó la firma y Play aceptó el paquete. `targetSdk` permanece en 36. El acceso y Google Auth nativos aún requieren prueba en un teléfono.
- El AAB se firma con una llave de carga local y excluida de Git. La llave y `android/upload-key.properties` deben respaldarse en un gestor seguro; no se publican en GitHub ni Vercel. Play App Signing tendrá su propia llave después de aceptar el flujo de Play Console.
- La base de datos de Oficia está en el proyecto Supabase ya existente. Los identificadores de proyecto y organización se administran en los paneles de cada proveedor y se omiten de este plan público.
- El repositorio público autorizado es [adminyavoi-creator/Oficia-Delicias](https://github.com/adminyavoi-creator/Oficia-Delicias). El commit `6131e0e` integra Vite + Capacitor y elimina la configuración Expo/EAS. La llave Android y los archivos de entorno están excluidos del control de versiones.
- La URL **https://oficia-delicias.vercel.app** sirve el sitio desde el proyecto `oficia-delicias`. GitHub reportó `success` para Vercel en el commit `9f80cb1` de disponibilidad y el panel de Vercel mostró el deployment de producción `Ready`. El conector devuelve 403 al listar despliegues y la CLI no cargó sesión, pero el estado del build se verificó desde GitHub y el panel web.
- Supabase está en el plan Free: cuatro espacios, una solicitud y RLS en `spaces`, `bookings` y `transfer_settings`. Tras las migraciones, Security Advisor no reporta errores; conserva la advertencia `Leaked Password Protection Disabled` (función de plan superior). Performance Advisor muestra dos índices sin uso, información esperable con una sola reserva. No se cambiará el plan ni se generarán cargos.

## Registro de avances

| Fecha | Tarea terminada | Evidencia |
| --- | --- | --- |
| 16 oct 2026 | Calificaciones verificadas, cierre de rentas y actualización Android | Migraciones `20261016024545_verified_customer_reviews_owner_completion` y `20261016030515_space_review_rls_moderation` aplicadas en Supabase. Promedios y opiniones públicas derivan de reseñas reales; se quitaron calificaciones ficticias de los datos de muestra. El anfitrión puede aceptar/rechazar solicitudes y marcar una renta realizada después de la hora de salida; el cliente puede dejar una reseña una vez desde Mis reservas. Operaciones puede ocultar o restaurar reseñas. Esquema/RLS verificados; no quedan avisos nuevos en Security Advisor; `npm run build` y `npm run android:sync` correctos. AAB 1.2.6/código 9 generado, firmado y publicado en el track de prueba interna de Play Console como «Oficia Android 1.2.6 · Reseñas verificadas»; Play confirma disponibilidad para verificadores internos, sin revisar. Advertencia no bloqueante: no se adjuntó archivo de desofuscación. GitHub `main` actualizado al commit `07306f7`; check Vercel `success`. Producción de Play permanece intacta. Falta instalar y probar en teléfono; el nombre temporal puede mostrarse mientras la app sigue como borrador. |
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
Warning: truncated output (original token count: 10296)
Total output lines: 130

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
| 14 oct 2026 | Prueba interna publicada | Se creó la lista «Verificadores Oficia» con el verificador autorizado por el titular y se activó la versión «Oficia Android 1.0.0» en el track interno. Play Console confirma estado Activo, un verificador disponible y el enlace https://play.google.com/apps/internaltest/4701624000733155…5296 tokens truncated…e los cambios actuales de mapa y agenda de cierres, se incrementó a código 11 y versión 1.2.8, y se generó un AAB firmado de 11 MB. Las 14 pruebas automatizadas, TypeScript y build web pasan; sincronización Capacitor y `bundleRelease` pasan con JDK 21. Verificación de certificado: SHA-1 `7D:F9:73:F8:FE:2C:5A:2F:BA:F2:00:2F:95:9E:74:26:4C:CA:A2:89`; firma del bundle verificada. No se pudo subir: Play Console muestra errores internos `5550B06A`, `5785801E` y `5A4AE28A` al crear/abrir la versión. El track sigue en 1.2.7/código 10; no se modificó Producción. AAB listo en `android/app/build/outputs/bundle/release/app-release.aab` del checkout de publicación. |

## Correspondencia con los mockups

| Pantalla o función de referencia | Estado en Oficia |
| --- | --- |
| Bienvenida e identidad | Implementada con Marco Oficia |
| Inicio con búsqueda, categorías, promoción y espacios | Implementada con la paleta de Oficia |
| Detalle con fotos, servicios, opiniones y botón de reserva | Galería interactiva; catálogo de muestra identificado y reseñas ficticias ocultas |
| Selección de fecha y hora | Días cerrados y horarios ocupados por rentas autorizadas deshabilitados; Operaciones valida de nuevo al autorizar |
| Favoritos y comprobante | Implementados; favoritos separados por cuenta y comprobante sin autorización de acceso |
| Panel de dueño y Operaciones | Dueño crea borradores y consulta tickets con desglose estimado; Operaciones revisa solicitudes y fichas sin manejar dinero |
| Mapa | Explorar muestra cuatro puntos aproximados y los etiqueta como muestra; al cargar espacios reales, el aviso deja de insinuar que las ubicaciones/precios también son de muestra. El mapa se titula «Espacios en el mapa», sin afirmar que usa geolocalización del cliente. El alta de anfitrión cuenta con minimapa OSM arrastrable que actualiza latitud y longitud para la ficha real |
| Chat con anfitrión | Pendiente de cuentas, anfitriones y mensajería real |
| QR o boleto de acceso | Pendiente de confirmación real de la reserva |
| Ticket informativo | Implementado con folio, estancia e importe estimado; sin CLABE, depósito ni conciliación |
| Cobro automático y recibo fiscal | Pendientes de proveedor y reglas comerciales |

## Próximo paso concreto

1. Instalar 1.3.0/código 13 desde la prueba interna y comprobar en un teléfono Android el alta, Google Auth nativo, minimapa, fotos, solicitudes y desglose informativo del anfitrión.
2. Revisar en Play Console la huella de Play App Signing y agregarla a Google Auth si se requiere; completar la ficha y declaraciones de publicación antes de solicitar cualquier revisión.
3. Mantener el track interno para validación; antes de producción completar el proceso de prueba cerrada y demás requisitos vigentes de Play Console. Producción no se ha modificado.
4. Probar la agenda de cierres de 180 días con una cuenta anfitriona y espacios reales, incluyendo el bloqueo y liberación de fechas.
5. Antes de considerar cualquier pago futuro, obtener revisión de contador/abogado del contrato de intermediación; precisar quién renta y cobra, IVA desglosado, posibles retenciones federales/estatales, documentación del anfitrión, CFDI, reportes SAT y la liquidación. La nota [CRITERIO_FISCAL_Y_DESGLOSE.md](CRITERIO_FISCAL_Y_DESGLOSE.md) registra el análisis y las decisiones por resolver.
6. Cuando existan fotos e inventario autorizados, validar disponibilidad, mapa y tickets en campo. Completar el portal administrativo profesional descrito abajo.
7. Probar cliente y anfitrión con la app cerrada: activación/desactivación por dispositivo, cambio de cuenta, aviso de solicitud y enlace a la pantalla correspondiente.

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
| Finanzas y fiscalidad | Mostrar ahora solo renta, tarifa Oficia hipotética e IVA estimado de esa tarifa por ticket. Cobros, retenciones, liquidación, CFDI y conciliación quedan fuera del alcance actual; cualquier etapa futura requerirá definición fiscal y autorización. |
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

| 16 oct 2026 | Publicación Android 1.2.8 en prueba interna | Sesión de Play Console restaurada en la cuenta TheLogosDev. Se cargó el AAB firmado (código 11, versión 1.2.8), Console procesó correctamente el bundle y se publicó «Oficia Android 1.2.8 · Mapa y agenda». El track confirma «Disponible para verificadores internos» y conserva el vínculo de adhesión `https://play.google.com/apps/internaltest/4701624000733155086`. El paquete admite teléfonos y tablets; Producción no se modificó. Console muestra dos advertencias no bloqueantes: falta mapa de desofuscación (R8 está desactivado) y símbolos de depuración nativa. Próximo paso: instalar/actualizar con `alonsovl.logos@gmail.com` una vez propagada la publicación y probar el flujo en el teléfono. |
| 16 oct 2026 | Activación segura de notificaciones push | Firebase «Oficia Push» se mantiene en Spark. `FIREBASE_SERVICE_ACCOUNT_JSON` fue guardado como secreto de Edge Functions, Vault recibió solo la URL del proyecto y la clave pública del programador; la migración `schedule_push_worker` habilitó `pg_net` y `pg_cron`. La función `oficia-push-worker` se desplegó como versión 4 con JWT obligatorio. Una llamada desde Vault devolvió HTTP 200 con `ok: true`; no había dispositivos pendientes. `VITE_FCM_ENABLED` quedó activo en Vercel para PWA, y Android 1.3.0/código 13 se compiló con la misma configuración pública. Falta subir este AAB al track interno y probar la recepción física. |
| 16 oct 2026 | Publicación 1.3.0 y paridad PWA/Android | Vercel publicó el commit `be831402` en producción con Firebase habilitado. Google Play aceptó y publicó «Oficia 1.3.0 · Notificaciones», código 13, en prueba interna; está disponible para verificadores y no modifica Producción. El AAB se generó después de `npm run build`, 14 pruebas, sincronización Capacitor y validación de recursos. Falta prueba física con la aplicación cerrada para confirmar autorización, entrega y apertura de rutas. |
| 16 oct 2026 | Corrección de Google Auth y recuperación de cuenta | La revisión de Google Auth Platform encontró que el cliente Android solo incluye la firma de desarrollo; falta registrar la firma Play App Signing `20:34:CB:50:92:37:04:E7:16:71:79:06:AB:62:13:D5:AD:D0:D5:59` para `mx.oficia.delicias`. El fallo ocurre antes de Supabase y puede afectar a cualquier instalación distribuida por Play; el acceso web con Google y la renovación de sesión sí aparecen exitosos en Supabase. Se preparó un segundo cliente OAuth que conserva el registro de desarrollo, muestra cancelaciones sin error, distingue códigos nativos y añade recuperación/actualización de contraseña con respuestas que no revelan si existe una cuenta. AAB firmado 1.3.1/código 14 y build PWA listos; aún no se publica porque Google Cloud requiere confirmar el alta del cliente OAuth de producción. Al autorizarlo, completar PWA en Vercel y subir solo a prueba interna de Play; Producción no se modifica. |
