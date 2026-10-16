import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from './backend';

export type PushOpenHandler = (data: Record<string, unknown>) => void;
let activeUserId: string | null = null;
// Deliberately fail closed until Firebase Messaging and the worker secrets are configured.
export const pushDeliveryConfigured = false;

export const isNativePushAvailable = () => pushDeliveryConfigured && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function getPushPermission() {
  if (!isNativePushAvailable()) return 'unavailable' as const;
  const result = await PushNotifications.checkPermissions();
  return result.receive;
}

export async function enablePushForUser(userId: string, onOpen?: PushOpenHandler, onForeground?: (notification: PushNotificationSchema) => void) {
  if (!supabase || !isNativePushAvailable()) return { status: 'unavailable' as const };
  const client = supabase;
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return { status: permission.receive as 'denied' | 'prompt' };

  if (activeUserId && activeUserId !== userId) await PushNotifications.removeAllListeners();
  if (activeUserId === userId) {
    await PushNotifications.register();
    return { status: 'granted' as const };
  }
  activeUserId = userId;
  await PushNotifications.addListener('registration', async (token: Token) => {
    const { error } = await client.from('push_devices').upsert({
      user_id: userId,
      token: token.value,
      platform: 'android',
      is_active: true,
      last_seen_at: new Date().toISOString(),
    // Keep a per-account row: the same Android installation can sign out and
    // later sign in with a different Oficia account on the same FCM token.
    }, { onConflict: 'user_id,token' });
    if (error) activeUserId = null;
  });
  await PushNotifications.addListener('registrationError', () => {
    activeUserId = null;
  });
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    onOpen?.(notification.data ?? {});
  });
  await PushNotifications.addListener('pushNotificationReceived', notification => onForeground?.(notification));
  await PushNotifications.register();
  return { status: 'granted' as const };
}

export async function deactivatePushForUser(userId: string) {
  if (!supabase) return;
  // Keep the Firebase token so it can be reactivated after the same account signs in again.
  await supabase.from('push_devices').update({ is_active: false }).eq('user_id', userId);
  if (activeUserId === userId) {
    await PushNotifications.removeAllListeners();
    activeUserId = null;
  }
}
