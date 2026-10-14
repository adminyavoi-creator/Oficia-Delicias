# Oficia

Aplicación para descubrir y solicitar espacios de trabajo en Delicias, Chihuahua. La PWA y la aplicación Android comparten la misma interfaz React, el mismo proyecto Supabase y el dominio de Vercel.

## Tecnologías

- Vite 8 y React 19 para la interfaz.
- Capacitor 8 y Android Studio/Gradle para Android.
- Supabase Auth y Database para sesiones, catálogo y solicitudes.
- PWA con caché de la interfaz para abrirla rápidamente y mostrar el shell sin conexión. Las consultas requieren internet.

## Desarrollo local

1. Usa Node.js 20.19 o posterior.
2. Ejecuta `npm ci`.
3. Copia `.env.example` como `.env.local` y configura URL/clave publicable de Supabase y el cliente web OAuth de Google.
4. Ejecuta `npm run dev` para la PWA.
5. Ejecuta `npm run typecheck` y `npm run build` antes de publicar cambios.

## Android

La carpeta Android se administra con Capacitor. El equipo de compilación necesita Android Studio, Android SDK 36 y JDK compatible con Gradle.

```sh
npx cap add android        # una sola vez
npm run android:sync       # compila la PWA y la sincroniza con Android
npm run android:debug      # APK de depuración
npm run android:open       # abre el proyecto Android en Android Studio
```

Para Google Play se genera un Android App Bundle firmado. Configura la llave de carga fuera del repositorio y registra en Google Cloud las huellas SHA-1 que correspondan al certificado de depuración y al certificado de carga/Play App Signing.

## Acceso con Google

En web, Supabase Auth inicia el flujo OAuth; en Android, el plugin nativo de Oficia obtiene un token de Google y lo entrega a `supabase.auth.signInWithIdToken`. Ambos se conectan al mismo proveedor Google de Supabase. Las variables `EXPO_PUBLIC_*` anteriores se siguen aceptando durante la transición, pero los nombres nuevos son `VITE_*`.

## PWA y Vercel

Vercel ejecuta `npm ci` y `npm run build:web`, y publica `dist`. La PWA comparte código y datos con Android; su service worker guarda la interfaz y excluye el video de fondo para reducir la caché. El video se conserva en la app web y en el paquete Android.

## Datos de demostración

Los espacios, fotografías, ubicaciones, tarifas y reseñas de muestra no representan inventario real. La solicitud no confirma disponibilidad ni realiza un cobro. Consulta [PLAN_DE_DESARROLLO.md](PLAN_DE_DESARROLLO.md) para el avance y [ARQUITECTURA_BACKEND.md](ARQUITECTURA_BACKEND.md) para las reglas de datos y permisos.
