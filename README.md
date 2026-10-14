# Oficia

Prototipo de app móvil Android en español, desarrollado con Expo y React Native para Delicias, Chihuahua y alrededores.

## Ejecutar

1. Instala Node.js 20 o superior.
2. En esta carpeta, ejecuta `npm install`.
3. Copia `.env.example` como `.env.local` y configura la URL de Supabase y la clave publicable del proyecto.
4. Ejecuta `npm run android` con un emulador Android o con Expo Go en tu teléfono.
5. Para revisar tipos, ejecuta `npm run typecheck`.

Con Supabase configurado, Oficia carga el catálogo publicado, permite crear cuentas o iniciar sesión por correo y guarda solicitudes con la cuenta autenticada. El precio y la duración se calculan en la base de datos; el cliente no puede aprobar sus propias solicitudes. El panel muestra y responde únicamente solicitudes de espacios vinculados al anfitrión mediante `spaces.host_id`. No se hacen cobros. Si Supabase no está configurado, la app conserva el modo de demostración local.

Los cuatro espacios actuales son demostrativos; las fotos, ubicaciones, tarifas y opiniones no son inventario real. Para usar el panel, la cuenta anfitriona debe ser asociada a uno o más espacios desde la administración. Las reservas del usuario se guardan en Supabase y RLS limita la lectura a solicitudes propias o de espacios administrados por su cuenta.

Consulta `PLAN_DE_DESARROLLO.md` para el estado exacto y el próximo paso, `identidad.md` para la marca elegida y `ARQUITECTURA_BACKEND.md` para las reglas de datos y acceso.
