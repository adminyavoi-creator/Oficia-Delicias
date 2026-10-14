import { supabase } from './backend';

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('El acceso con Google requiere conexión a Supabase.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
