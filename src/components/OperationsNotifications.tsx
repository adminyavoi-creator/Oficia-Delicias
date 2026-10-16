import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { AccountType } from '../profiles';
import { notificationTemplates } from '../notificationTemplates';
import { pushDeliveryConfigured } from '../pushNotifications';
import { palette } from '../theme';

type Campaign = { id: string; target_role: string; title: string; status: string; scheduled_at: string };

export function OperationsNotifications({ userId }: { userId: string }) {
  const [target, setTarget] = useState<AccountType>('cliente');
  const [title, setTitle] = useState('Encuentra tu próximo espacio');
  const [body, setBody] = useState('Explora los espacios de Oficia para organizar tu siguiente jornada.');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('notification_campaigns').select('id,target_role,title,status,scheduled_at').order('created_at', { ascending: false }).limit(8);
    if (!error) setCampaigns((data ?? []) as Campaign[]);
  };
  useEffect(() => { void refresh(); }, []);

  const send = async () => {
    if (!supabase || !pushDeliveryConfigured || busy || !title.trim() || !body.trim()) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.from('notification_campaigns').insert({ target_role: target, title: title.trim(), body: body.trim(), scheduled_at: new Date().toISOString(), created_by: userId });
    if (error) setNotice('No se pudo programar el aviso.');
    else { setNotice('Aviso en cola para las personas que aceptaron promociones.'); await refresh(); }
    setBusy(false);
  };

  const loadExample = () => {
    const template = notificationTemplates.find(item => item.role === target && item.trigger.startsWith('Campaña'));
    if (template) { setTitle(template.title); setBody(template.body); }
  };

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>DIFUSIÓN CON CONSENTIMIENTO</Text><Text style={styles.title}>Avisos y promociones</Text>
    <Text style={styles.note}>{pushDeliveryConfigured ? 'Solo a usuarios de la cuenta elegida que aceptaron recibir ofertas y tienen notificaciones activas. No se envían avisos de muestra.' : 'El envío está pausado hasta conectar Firebase de forma segura. Las campañas no se pondrán en cola todavía.'}</Text>
    <View style={styles.options}>{(['cliente','anfitrion'] as AccountType[]).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: target === item }} onPress={() => setTarget(item)} style={[styles.chip, target === item && styles.chipOn]}><Text style={[styles.chipText, target === item && styles.chipTextOn]}>{item === 'cliente' ? 'Clientes' : 'Dueños'}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Título del aviso" value={title} onChangeText={setTitle} maxLength={80} placeholder="Título" style={styles.input} />
    <TextInput accessibilityLabel="Mensaje del aviso" value={body} onChangeText={setBody} maxLength={220} multiline placeholder="Mensaje" style={[styles.input, styles.multiline]} />
    <View style={styles.actions}><Pressable accessibilityRole="button" disabled={busy} onPress={loadExample} style={styles.secondary}><Text style={styles.secondaryText}>Usar ejemplo</Text></Pressable><Pressable accessibilityRole="button" disabled={!pushDeliveryConfigured || busy || !title.trim() || !body.trim()} onPress={() => void send()} style={[styles.primary, (!pushDeliveryConfigured || busy) && { opacity: .55 }]}><Text style={styles.primaryText}>{busy ? 'Enviando…' : pushDeliveryConfigured ? 'Enviar aviso' : 'Pendiente de activar'}</Text></Pressable></View>
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {campaigns.length ? <View style={styles.history}><Text style={styles.historyHeading}>Actividad reciente</Text>{campaigns.map(campaign => <View key={campaign.id} style={styles.campaign}><Text style={styles.campaignTitle}>{campaign.title}</Text><Text style={styles.note}>{campaign.target_role === 'cliente' ? 'Clientes' : campaign.target_role === 'anfitrion' ? 'Dueños' : 'Todos'} · {campaign.status === 'enviada' ? 'Enviada' : campaign.status === 'cancelada' ? 'Cancelada' : 'En cola'}</Text></View>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 18, padding: 17, marginTop: 25 }, eyebrow: { color: palette.action, fontSize: 10, letterSpacing: 2, fontWeight: '900' }, title: { color: palette.plum, fontSize: 20, fontWeight: '900', marginTop: 6 }, note: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  options: { flexDirection: 'row', gap: 8, marginTop: 14 }, chip: { borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13 }, chipOn: { backgroundColor: palette.action, borderColor: palette.action }, chipText: { color: palette.plum, fontSize: 12, fontWeight: '800' }, chipTextOn: { color: palette.white },
  input: { minHeight: 44, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: palette.plum, marginTop: 10, fontSize: 13 }, multiline: { minHeight: 80, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: 9, marginTop: 12 }, secondary: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: palette.action, fontWeight: '800', fontSize: 12 }, primary: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: palette.white, fontWeight: '900', fontSize: 12 }, notice: { color: palette.action, fontSize: 11, fontWeight: '800', marginTop: 10 }, history: { borderTopWidth: 1, borderColor: palette.line, marginTop: 17, paddingTop: 14 }, historyHeading: { color: palette.plum, fontSize: 12, fontWeight: '900', marginBottom: 7 }, campaign: { paddingVertical: 8, borderBottomWidth: 1, borderColor: palette.line }, campaignTitle: { color: palette.plum, fontSize: 12, fontWeight: '800' },
});
