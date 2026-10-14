# Plan de desarrollo · Oficia

**Estado actual (14 de octubre de 2026):** prototipo local implementado y compilado para web y Android. Supabase Oficia-delicias ya contiene las tablas `spaces` y `bookings`, cuatro espacios de muestra y seguridad por fila en ambas. La app aún utiliza datos locales; faltan autenticación, sincronización, prueba en Android y publicación. El repositorio GitHub público existe pero continúa vacío porque la sesión local usa otra cuenta. Este archivo se actualiza al cerrar cada tarea para que el siguiente paso sea inequívoco.

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
| 8. Verificación | En curso | Tipos, compilación y recorrido en dispositivo | Tipos y paquetes correctos; prueba visual/nativa pendiente |
| 9. Diseño de conexión real | Completada | `ARQUITECTURA_BACKEND.md` | Flujo cliente–anfitrión, datos y permisos definidos |

## Fase 2 · Antes del lanzamiento

| Tarea | Estado | Dependencia |
| --- | --- | --- |
| Inventario real, fotografías y precios | Pendiente | Espacios y condiciones facilitados por el negocio |
| Cuentas, roles y sincronización cliente ↔ anfitrión | En curso | Esquema y permisos creados en Supabase; falta conectar la app y probar dos cuentas |
| Proyecto Vercel y frontend web | Pendiente | Publicar el código en `adminyavoi-creator/Oficia-Delicias` y conectar el repositorio |
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
- El usuario eligió que **las solicitudes reales lleguen a un panel dentro de Oficia**. La vista local actual demuestra el flujo; falta servidor, cuentas y permisos.
- Proyecto de datos existente: **Oficia-delicias**, ID `vfvqmlsgqxiarmbquhco`, en la organización `adminyavoi-creator's Org` (plan Free). No se creó otro proyecto.
- El repositorio público autorizado es `adminyavoi-creator/Oficia-Delicias`. El usuario autorizó publicar el código, documentos, logo y migración SQL. La publicación sigue pendiente por discrepancia de cuentas: la sesión local y el conector GitHub están conectados como `TheDevLogos`.
- Vercel se configurará en el equipo **Yavoi Alonso** con el frontend web Expo. Supabase alojará los datos y la lógica de reservas; no se duplicará esa lógica en otro backend.

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

## Correspondencia con los mockups

| Pantalla o función de referencia | Estado en Oficia |
| --- | --- |
| Bienvenida e identidad | Implementada con Marco Oficia |
| Inicio con búsqueda, categorías, promoción y espacios | Implementada con la paleta de Oficia |
| Detalle con fotos, servicios, opiniones y botón de reserva | Implementada; opiniones y fotos son ilustrativas |
| Selección de fecha y hora | Implementada como solicitud; disponibilidad real pendiente |
| Favoritos y comprobante | Implementados; el comprobante no autoriza acceso |
| Panel de anfitrión | Implementado localmente para revisar el flujo; sincronización real pendiente |
| Mapa, ruta y distancias | Pendientes de direcciones reales y proveedor de mapas |
| Chat con anfitrión | Pendiente de cuentas, anfitriones y mensajería real |
| QR o boleto de acceso | Pendiente de confirmación real de la reserva |
| Pagos y recibo fiscal | Pendientes de proveedor y reglas comerciales |

## Próximo paso concreto

1. Activar `adminyavoi-creator` como cuenta de escritura para el repositorio en la credencial Git local. El conector Codex aún muestra solo `TheDevLogos`, pese al intento de conexión. Publicar los commits `c564574` y `7401c69` más este registro y comprobar que Vercel puede leer el repositorio.
2. Crear el proyecto Vercel en **Yavoi Alonso**, ejecutar `npm run build:web` con salida `dist` y comprobar la URL publicada.
3. Conectar Expo a Supabase con la clave pública, Auth y consultas con RLS. La migración se ejecutó desde SQL Editor: registrar su versión en el historial de migraciones remoto antes de usar `supabase db push`, para evitar reaplicarla.
4. Probar el flujo entre cliente y anfitrión con cuentas distintas y solicitudes solapadas. Después recorrer la app en un teléfono Android; no hubo emulador disponible en este equipo.
