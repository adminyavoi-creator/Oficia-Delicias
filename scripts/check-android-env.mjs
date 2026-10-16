import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), ['VITE_', 'EXPO_PUBLIC_']);
const supabaseUrl = env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '';
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const googleWebClientId = env.VITE_GOOGLE_WEB_CLIENT_ID || env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

let projectRef = '';
try {
  projectRef = new URL(supabaseUrl).hostname.split('.')[0];
} catch {
  // Avoid printing environment values in a build log.
}

if (projectRef !== 'vfvqmlsgqxiarmbquhco') {
  console.error('Android release detenido: configura la URL pública de Supabase de Oficia antes de compilar.');
  process.exit(1);
}
if (!publishableKey.startsWith('sb_publishable_')) {
  console.error('Android release detenido: falta la clave publishable de Supabase.');
  process.exit(1);
}
if (!googleWebClientId.endsWith('.apps.googleusercontent.com')) {
  console.error('Android release detenido: configura el cliente web de Google para conservar el acceso del PWA.');
  process.exit(1);
}

console.log('Configuración de producción validada: Supabase Oficia, clave publishable y cliente web de Google.');
