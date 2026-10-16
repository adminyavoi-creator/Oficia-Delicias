import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from './backend';

type OfiGoogleAuthPlugin = {
  signIn(options: { webClientId: string }): Promise<{ idToken?: string; canceled?: boolean }>;
  signOut(options: { webClientId?: string }): Promise<void>;
};

const OfiGoogleAuth = registerPlugin<OfiGoogleAuthPlugin>('OficiaGoogleAuth');

export async function signInWithGoogle(): Promise<boolean> {
  if (!supabase) throw new Error('El acceso con Google requiere conexión a Supabase.');
  if (Capacitor.isNativePlatform()) {
    const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? import.meta.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) throw new Error('Falta configurar el cliente web de Google para iniciar sesión en Android.');
    const { idToken, canceled } = await OfiGoogleAuth.signIn({ webClientId });
    if (canceled) return false;
    if (!idToken) throw new Error('Google no devolvió un token de acceso válido.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
    return true;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return true;
}

export async function signOutFromGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? import.meta.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    await OfiGoogleAuth.signOut({ webClientId });
  }
}
