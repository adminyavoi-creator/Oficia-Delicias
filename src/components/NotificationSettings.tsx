import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../backend';
import { AccountType } from '../profiles';
import { deactivatePushForUser, isNativePushAvailable, pushDeliveryConfigured } from '../pushNotifications';
import { palette } from '../theme';
import { Icon } from './Icon';

type PrefKey = 'booking_updates' | 'reminders' | 'space_updates' | 'reviews' | 'promotions';
type Preferences = Record<PrefKey, boolean>;
const defaults: Preferences = { booking_updates: true, reminders: true, space_updates: true, reviews: true, promotions: false };
const rows: { key: PrefKey; title: string; caption: string; roles: AccountType[] }[] = [
  { key: 'booking_updates', title: 'Solicitudes y reservas', caption: 'Nuevas solicitudes y cambios de estado', roles: ['cliente','anfitrion'] },
  { key: 'reminders', title: 'Recordatorios', caption: 'Avisos antes de una renta confirmada', roles: ['cliente','anfitrion'] },
  { key: 'space_updates', title: 'Espacios', caption: 'Revisión y publicación de tus fichas', roles: ['anfitrion'] },
  { key: 'reviews', title: 'Opiniones', caption: 'Avisos para compartir o recibir una reseña', roles: ['cliente','anfitrion'] },
  { key: 'promotions', title: 'Ofertas y novedades', caption: 'Opcional; solo si quieres recibir promociones', roles: ['cliente','anfitrion'] },
];

export function NotificationSettings({ userId, accountType, requestPermission }: { userId: string; accountType: AccountType; requestPermission: () => Promise<boolean> }) {
  const [prefs, setPrefs] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PrefKey | null>(null);
  const [permission, setPermission] = useState<'unknown' | 'enabled' | 'disabled' | 'unavailable'>('unknown');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    if (!supabase) { setLoading(false); setPermission('unavailable'); return; }
    supabase.from('notification_preferences').select('booking_updates,reminders,space_updates,reviews,promotions').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (active && data) setPrefs({ ...defaults, ...data }); if (active) setLoading(false); }, () => { if (active) setLoading(false); });
    supabase.from('push_devices').select('id').eq('user_id', userId).eq('platform', isNativePushAvailable() ? 'android' : 'web').eq('is_active', true).limit(1)
      .then(({ data }) => { if (active) setPermission(data?.length ? 'enabled' : 'disabled'); }, () => { if (active) setPermission('disabled'); });
    return () => { active = false; };
  }, [userId]);

  const toggle = async (key: PrefKey) => {
    if (!supabase || saving) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setSaving(key); setNotice('');
    try {
      const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (!error) setPrefs(next);
      else setNotice('No se pudo guardar tu preferencia. Intenta de nuevo.');
    } catch {
      setNotice('No se pudo guardar tu preferencia. Intenta de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  const enable = async () => {
    setNotice('');
    const enabled = await requestPermission();
    setPermission(enabled ? 'enabled' : 'disabled');
    setNotice(enabled ? 'Notificaciones activadas en este dispositivo.' : 'Puedes habilitarlas desde los ajustes de Android.');
  };
  const disable = async () => {
    setNotice('');
    await deactivatePushForUser(userId);
    setPermission('disabled');
    setNotice('Notificaciones desactivadas en este dispositivo.');
  };

  return <View style={styles.card}>
    <View style={styles.heading}><View style={styles.icon}><Icon name="bell" size={19} color={palette.action} /></View><View style={{ flex: 1 }}><Text style={styles.title}>Notificaciones</Text><Text style={styles.caption}>{accountType === 'cliente' ? 'Reservas, espacios y novedades' : 'Solicitudes, rentas y novedades'}</Text></View></View>
    {pushDeliveryConfigured && permission !== 'enabled' ? <Pressable accessibilityRole="button" onPress={() => void enable()} style={styles.enable}><Text style={styles.enableText}>Activar en este dispositivo</Text><Icon name="arrow" size={16} color={palette.action} /></Pressable> : null}
    {pushDeliveryConfigured && permission === 'enabled' ? <Pressable accessibilityRole="button" onPress={() => void disable()} style={styles.enable}><Text style={styles.enableText}>Desactivar en este dispositivo</Text><Icon name="close" size={16} color={palette.action} /></Pressable> : null}
    {permission === 'unavailable' ? <Text style={styles.note}>{pushDeliveryConfigured ? 'Activa las notificaciones en los ajustes de tu dispositivo.' : 'La conexión de notificaciones todavía no está lista.'}</Text> : null}
    {rows.filter(row => row.roles.includes(accountType)).map(row => <Pressable key={row.key} accessibilityRole="switch" accessibilityState={{ checked: prefs[row.key], disabled: loading || saving !== null }} disabled={loading || saving !== null} onPress={() => void toggle(row.key)} style={styles.row}>
      <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowCaption}>{row.caption}</Text></View>
      <View style={[styles.switch, prefs[row.key] && styles.switchOn]}><View style={[styles.knob, prefs[row.key] && styles.knobOn]} /></View>
    </Pressable>)}
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, marginTop: 21 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 }, icon: { width: 40, height: 40, backgroundColor: palette.blush, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.plum, fontSize: 14, fontWeight: '900' }, caption: { color: palette.muted, fontSize: 11, marginTop: 3 },
  enable: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: palette.line }, enableText: { color: palette.action, fontSize: 12, fontWeight: '800' },
  row: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: palette.line }, rowTitle: { color: palette.plum, fontSize: 12, fontWeight: '800' }, rowCaption: { color: palette.muted, fontSize: 10, marginTop: 3 },
  switch: { width: 41, height: 24, borderRadius: 13, backgroundColor: '#DDD5D6', padding: 3, justifyContent: 'center' }, switchOn: { backgroundColor: palette.action }, knob: { width: 18, height: 18, borderRadius: 10, backgroundColor: palette.white }, knobOn: { alignSelf: 'flex-end' },
  note: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 7 }, notice: { color: palette.action, fontSize: 11, fontWeight: '700', marginTop: 9 },
});
