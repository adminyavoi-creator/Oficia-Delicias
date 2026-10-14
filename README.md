# Oficia

Prototipo de app móvil Android en español, desarrollado con Expo y React Native para Delicias, Chihuahua y alrededores.

## Ejecutar

1. Instala Node.js 20 o superior.
2. En esta carpeta, ejecuta `npm install`.
3. Copia `.env.example` como `.env.local` y configura la URL de Supabase y la clave publicable del proyecto. Para habilitar Google en Android, agrega el cliente web OAuth en `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
4. Para revisar las pantallas puedes ejecutar `npm run android` con Expo Go. Google Sign-In usa código nativo y requiere una compilación de desarrollo o EAS Build; Expo Go no lo incluye.
5. Para revisar tipos, ejecuta `npm run typecheck`.

Con Supabase configurado, Oficia carga el catálogo publicado, permite crear cuentas o iniciar sesión por correo y guarda solicitudes con la cuenta autenticada. El precio y la duración se calculan en la base de datos; el cliente no puede aprobar sus propias solicitudes. El panel muestra y responde únicamente solicitudes de espacios vinculados al anfitrión mediante `spaces.host_id`. No se hacen cobros. Si Supabase no está configurado, la app conserva el modo de demostración local.

Los cuatro espacios actuales son demostrativos; las fotos, ubicaciones, tarifas y opiniones no son inventario real. Para usar el panel, la cuenta anfitriona debe ser asociada a uno o más espacios desde la administración. Las reservas del usuario se guardan en Supabase y RLS limita la lectura a solicitudes propias o de espacios administrados por su cuenta.

Consulta `PLAN_DE_DESARROLLO.md` para el estado exacto y el próximo paso, `identidad.md` para la marca elegida y `ARQUITECTURA_BACKEND.md` para las reglas de datos y acceso.

## Acceso con Google

Android usa el selector nativo de cuentas de Google y entrega el token a Supabase Auth. La web usa OAuth del mismo proveedor; ambos caminos crean o recuperan la identidad de Google en el mismo proyecto Supabase. Para activarlo, configura el proveedor Google en Supabase con un cliente OAuth web y su secreto, autoriza `https://vfvqmlsgqxiarmbquhco.supabase.co/auth/v1/callback` en Google Cloud y agrega el cliente web público a `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. La app muestra el botón cuando esa variable está configurada. Android también requiere registrar en Google Cloud el paquete `mx.oficia.delicias` y las huellas SHA-1 de las compilaciones que se probarán y publicarán.
