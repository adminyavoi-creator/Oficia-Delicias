import { GoogleSignin, isCancelledResponse, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { supabase } from './backend';

let configured = false;

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('El acceso con Google requiere conexión a Supabase.');
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error('Google Sign-In todavía no está configurado. Falta agregar el cliente web de Google a Oficia.');
  }

  if (!configured) {
    GoogleSignin.configure({ webClientId });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) return;
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error('Google no devolvió un token de acceso válido.');
  }

  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: response.data.idToken });
  if (error) throw error;
}
