import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from './backend';

export type PushOpenHandler = (data: Record<string, unknown>) => void;
let activeUserId: string | null = null;
let currentToken: string | null = null;
let stopWebMessages: (() => void) | null = null;
let stopWebOpen: (() => void) | null = null;
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';
export const pushDeliveryConfigured = import.meta.env.VITE_FCM_ENABLED === 'true' && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);

export const isNativePushAvailable = () => pushDeliveryConfigured && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const isWebPushAvailable = () => pushDeliveryConfigured && !Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export async function getPushPermission() {
  if (!pushDeliveryConfigured) return 'unavailable' as const;
  if (isNativePushAvailable()) {
    const result = await PushNotifications.checkPermissions();
    return result.receive;
  }
  if (isWebPushAvailable()) return Notification.permission === 'default' ? 'prompt' as const : Notification.permission;
  return 'unavailable' as const;
}

export async function enablePushForUser(userId: string, onOpen?: PushOpenHandler, onForeground?: (notification: PushNotificationSchema) => void) {
  if (!supabase || !pushDeliveryConfigured) return { status: 'unavailable' as const };
  const client = supabase;
  if (!Capacitor.isNativePlatform()) {
    if (!isWebPushAvailable()) return { status: 'unavailable' as const };
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return { status: permission as 'denied' | 'prompt' };
    const [{ initializeApp, getApps }, { getMessaging, getToken, onMessage }] = await Promise.all([
      import('firebase/app'), import('firebase/messaging'),
    ]);
    const app = getApps().find(item => item.name === 'oficia-push') ?? initializeApp(firebaseConfig, 'oficia-push');
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { status: 'unavailable' as const };
    const { error } = await client.from('push_devices').upsert({ user_id: userId, token, platform: 'web', is_active: true, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
    if (error) return { status: 'unavailable' as const };
    currentToken = token;
    activeUserId = userId;
    stopWebMessages?.();
    stopWebMessages = onMessage(messaging, payload => onForeground?.({ title: payload.notification?.title ?? 'Oficia', body: payload.notification?.body ?? '', data: payload.data ?? {} } as PushNotificationSchema));
    stopWebOpen?.();
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oficia-push-open') onOpen?.(event.data.data ?? {});
    };
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    stopWebOpen = () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    return { status: 'granted' as const };
  }
  if (!isNativePushAvailable()) return { status: 'unavailable' as const };
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
    else currentToken = token.value;
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
  // Disable only this installation, preserving the user's other opted-in devices.
  if (currentToken) await supabase.from('push_devices').update({ is_active: false }).eq('user_id', userId).eq('token', currentToken);
  if (activeUserId === userId) {
    if (isNativePushAvailable()) await PushNotifications.removeAllListeners();
    stopWebMessages?.();
    stopWebMessages = null;
    stopWebOpen?.();
    stopWebOpen = null;
    activeUserId = null;
    currentToken = null;
  }
}
