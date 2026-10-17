import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { palette } from '../theme';
import { Icon } from './Icon';

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Contact = { display_name: string; email: string | null; phone: string | null; avatar_url: string | null };

export function BookingConversation({ bookingId, userId, ownerMode = false, focus = false }: {
  bookingId: string; userId: string; ownerMode?: boolean; focus?: boolean;
}) {
  const [expanded, setExpanded] = useState(focus);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { if (focus) setExpanded(true); }, [focus]);

  const refreshMessages = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('booking_messages').select('id,sender_id,body,created_at')
      .eq('booking_id', bookingId).order('created_at', { ascending: true }).limit(200);
    if (error) { setNotice('No pudimos cargar el chat. Intenta actualizar.'); return; }
    setMessages((data ?? []) as Message[]);
    setNotice('');
  }, [bookingId]);

  useEffect(() => {
    if (!expanded || !supabase) return;
    let active = true;
    void refreshMessages();
    if (ownerMode) {
      void supabase.rpc('booking_customer_contact', { p_booking_id: bookingId }).then(({ data, error }) => {
        if (active && !error && data) setContact(data as Contact);
      });
    }
    const channel = supabase.channel(`oficia-booking-chat-${bookingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_messages', filter: `booking_id=eq.${bookingId}` }, () => { if (active) void refreshMessages(); })
      .subscribe();
    return () => { active = false; void supabase?.removeChannel(channel); };
  }, [bookingId, expanded, ownerMode, refreshMessages]);

  const send = async () => {
    const body = draft.trim();
    if (!supabase || !body || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.from('booking_messages').insert({ booking_id: bookingId, sender_id: userId, body });
    if (error) setNotice('No se pudo enviar el mensaje. Actualiza la app e inténtalo de nuevo.');
    else { setDraft(''); await refreshMessages(); }
    setBusy(false);
  };

  return <View style={styles.shell}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.toggle}>
      <Icon name="users" size={17} color={palette.action} /><Text style={styles.toggleText}>{expanded ? 'Cerrar conversación' : 'Abrir chat'}</Text><Icon name="chevron" size={16} color={palette.action} />
    </Pressable>
    {expanded ? <View style={styles.panel}>
      {ownerMode && contact ? <View style={styles.contact}>
        {contact.avatar_url ? <Image source={{ uri: contact.avatar_url }} accessibilityLabel={`Foto de ${contact.display_name}`} style={styles.avatar} /> : <View style={styles.avatarFallback}><Icon name="user" size={18} color={palette.action} /></View>}
        <View style={styles.contactCopy}><Text style={styles.contactTitle}>{contact.display_name}</Text>{contact.email ? <Text selectable style={styles.meta}>{contact.email}</Text> : null}{contact.phone ? <Text selectable style={styles.meta}>{contact.phone}</Text> : null}</View>
      </View> : ownerMode ? <Text style={styles.meta}>Los datos del cliente se habilitan al autorizar la renta.</Text> : <Text style={styles.meta}>Conversación privada con el dueño del espacio.</Text>}
      <ScrollView style={styles.messages} nestedScrollEnabled contentContainerStyle={styles.messageList}>
        {messages.length ? messages.map(message => <View key={message.id} style={[styles.bubble, message.sender_id === userId ? styles.mine : styles.theirs]}>
          <Text style={[styles.messageText, message.sender_id === userId && styles.mineText]}>{message.body}</Text>
          <Text style={[styles.time, message.sender_id === userId && styles.mineText]}>{new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}</Text>
        </View>) : <Text style={styles.meta}>Aún no hay mensajes.</Text>}
      </ScrollView>
      <View style={styles.composer}><TextInput accessibilityLabel="Mensaje" value={draft} onChangeText={setDraft} placeholder="Escribe un mensaje" placeholderTextColor={palette.muted} maxLength={2000} multiline style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje" disabled={busy || !draft.trim()} onPress={() => void send()} style={[styles.send, (busy || !draft.trim()) && styles.disabled]}><Icon name="arrow" size={18} color={palette.white} /></Pressable></View>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  shell: { borderTopWidth: 1, borderColor: palette.line, marginTop: 12, paddingTop: 10 },
  toggle: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { flex: 1, color: palette.action, fontSize: 13, fontWeight: '800' },
  panel: { borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, padding: 11, marginTop: 7 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: palette.line },
  avatar: { width: 40, height: 40, borderRadius: 14 }, avatarFallback: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' },
  contactCopy: { flex: 1 }, contactTitle: { color: palette.plum, fontWeight: '900', fontSize: 13 }, meta: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  messages: { maxHeight: 230, minHeight: 74, marginTop: 10 }, messageList: { gap: 8 },
  bubble: { maxWidth: '88%', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 8 }, mine: { alignSelf: 'flex-end', backgroundColor: palette.action }, theirs: { alignSelf: 'flex-start', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  messageText: { color: palette.plum, fontSize: 12, lineHeight: 17 }, mineText: { color: palette.white }, time: { alignSelf: 'flex-end', color: palette.muted, fontSize: 9, marginTop: 3 },
  composer: { flexDirection: 'row', gap: 7, alignItems: 'flex-end', marginTop: 8 }, input: { flex: 1, minHeight: 42, maxHeight: 90, borderRadius: 12, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 11, paddingVertical: 9, color: palette.plum, fontSize: 12, backgroundColor: palette.white },
  send: { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .45 }, notice: { color: palette.action, fontSize: 11, marginTop: 7 },
});
