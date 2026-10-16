import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), ['VITE_', 'EXPO_PUBLIC_']);
const supabaseUrl = env.VITE_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '';
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const googleWebClientId = env.VITE_GOOGLE_WEB_CLIENT_ID || env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const firebaseMessagingValues = ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_MESSAGING_SENDER_ID','VITE_FIREBASE_APP_ID','VITE_FIREBASE_VAPID_KEY'];
const missingFirebaseMessaging = firebaseMessagingValues.filter(key => !env[key]);

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
if (!publishableKey || publishableKey.startsWith('sb_secret_') || publishableKey.startsWith('service_role')) {
  console.error('Android release detenido: falta la clave pública de Supabase o se detectó una clave privada no permitida.');
  process.exit(1);
}
if (!googleWebClientId.endsWith('.apps.googleusercontent.com')) {
  console.error('Android release detenido: configura el cliente web de Google para mantener el mismo acceso que el PWA.');
  process.exit(1);
}
if (missingFirebaseMessaging.length || env.VITE_FCM_ENABLED !== 'true') {
  console.error('Android release detenido: configura Firebase Cloud Messaging para que PWA y Android usen el mismo envío seguro.');
  process.exit(1);
}
try {
  const services = JSON.parse(await (await import('node:fs/promises')).readFile('android/app/google-services.json','utf8'));
  if (services.project_info?.project_id !== env.VITE_FIREBASE_PROJECT_ID || services.client?.[0]?.client_info?.android_client_info?.package_name !== 'mx.oficia.delicias') throw new Error('Firebase project/package mismatch');
} catch {
  console.error('Android release detenido: falta la configuración nativa de Firebase para mx.oficia.delicias.');
  process.exit(1);
}

console.log('Configuración de producción validada: Supabase Oficia, Google Auth y Firebase Push de Oficia.');
