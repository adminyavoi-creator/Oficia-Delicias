# Plan de desarrollo · Oficia

**Estado actual (14 de octubre de 2026):** la versión web de Oficia ya está publicada en Vercel y el repositorio público contiene el código, la marca, el plan y la migración inicial. Supabase Oficia-delicias tiene las tablas `spaces` y `bookings`, cuatro espacios demostrativos y seguridad por fila activada. La app publicada aún usa datos locales; faltan conectar Auth y las reservas al backend, registrar la migración en el historial remoto, probar Android y cargar inventario real. Este archivo se actualiza al cerrar cada tarea para que el siguiente paso sea inequívoco.

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
- El usuario eligió que **las solicitudes reales lleguen a un panel dentro de Oficia**. La vista local actual demuestra el flujo; falta servidor, cuentas y permisos.
- Proyecto de datos existente: **Oficia-delicias**, ID `vfvqmlsgqxiarmbquhco`, en la organización `adminyavoi-creator's Org` (plan Free). No se creó otro proyecto.
- El repositorio público autorizado es [adminyavoi-creator/Oficia-Delicias](https://github.com/adminyavoi-creator/Oficia-Delicias). Código, documentos, propuestas de marca, recursos y migración SQL están publicados en `main`. El conector GitHub conectado como `adminyavoi-creator` pudo publicar; la credencial Git local aún apunta a `TheDevLogos`, así que los siguientes cambios remotos deben hacerse con el conector o después de actualizar esa credencial.
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

1. Conectar la app a Supabase usando la clave publicable, configurar Auth y sustituir catálogo y solicitudes locales por consultas protegidas con RLS.
2. Registrar en el historial remoto que `20261014191029_initial_oficia.sql` ya se aplicó desde SQL Editor antes de administrar futuras migraciones con la CLI.
3. Probar el panel interno con cuentas distintas, permisos de anfitrión y solicitudes que coincidan en horario.
4. Recorrer el flujo en Android y preparar la publicación en Play Console. No se detectó emulador disponible en este equipo.
