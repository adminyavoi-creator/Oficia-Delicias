import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { formatDate, formatMoney } from '../data';
import { palette } from '../theme';
import { Icon } from './Icon';

type Mode = 'customer' | 'operations';
type Contact = { display_name: string; email: string | null; phone: string | null; avatar_url: string | null };
type Instructions = { bank_name: string | null; clabe: string | null; beneficiary: string | null; instructions: string | null; transfer_reference: string; total_cents: number };
type Proof = { id: string; object_path: string; file_name: string; mime_type: string; size_bytes: number; created_at: string; url?: string };
type Message = { id: string; sender_id: string; body: string; created_at: string };
type BookingRow = {
  id: string; client_id: string; space_id: string; local_date: string; local_time: string; unit: string;
  quantity: number; total_cents: number; transfer_reference: string; status: string; payment_status: string;
  payment_review_note: string | null; agreement_closed_at: string | null; spaces: { name: string; area: string; host_id: string; is_demo: boolean } | null;
};

export function BookingWorkflowModal({ visible, bookingId, userId, mode, onClose, onChanged }: {
  visible: boolean; bookingId: string; userId: string; mode: Mode; onClose: () => void; onChanged?: () => void;
}) {
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [proofReviewNote, setProofReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const client = supabase;
    setLoading(true);
    const bookingResult = await client.from('bookings')
      .select('id,client_id,space_id,local_date,local_time,unit,quantity,total_cents,transfer_reference,status,payment_status,payment_review_note,agreement_closed_at,spaces!inner(name,area,host_id,is_demo)')
      .eq('id', bookingId).maybeSingle();
    if (bookingResult.error || !bookingResult.data) {
      setNotice('No se pudo cargar esta solicitud. Actualiza e inténtalo de nuevo.');
      setLoading(false);
      return;
    }
    const row = bookingResult.data as unknown as BookingRow;
    setBooking(row);
    const messageResult = await client.from('booking_messages')
      .select('id,sender_id,body,created_at').eq('booking_id', bookingId)
      .order('created_at', { ascending: true }).limit(200);
    if (!messageResult.error) setMessages((messageResult.data ?? []) as Message[]);
    if (mode === 'operations') {
      const [contactResult, proofResult] = await Promise.all([
        client.rpc('booking_customer_contact', { p_booking_id: bookingId }),
        client.from('booking_payment_proofs').select('id,object_path,file_name,mime_type,size_bytes,created_at')
          .eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(10),
      ]);
      const contactRow = Array.isArray(contactResult.data) ? contactResult.data[0] : contactResult.data;
      if (!contactResult.error && contactRow) setContact(contactRow as Contact);
      if (!proofResult.error) {
        const signed = await Promise.all((proofResult.data ?? []).map(async proof => {
          const result = await client.storage.from('oficia-booking-proofs').createSignedUrl(proof.object_path, 300);
          return { ...proof, url: result.data?.signedUrl } as Proof;
        }));
        setProofs(signed);
      }
    } else if (row.status === 'pendiente' || row.status === 'aceptada_anfitrion') {
      const result = await client.rpc('booking_payment_instructions', { p_booking_id: bookingId });
      if (!result.error && result.data?.length) setInstructions(result.data[0] as Instructions);
      else setInstructions(null);
      const proofResult = await client.from('booking_payment_proofs').select('id,object_path,file_name,mime_type,size_bytes,created_at')
        .eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(10);
      if (!proofResult.error) setProofs((proofResult.data ?? []) as Proof[]);
    } else setInstructions(null);
    setNotice('');
    setLoading(false);
  }, [bookingId, mode]);

  useEffect(() => {
    if (!visible || !supabase) return;
    let active = true;
    void refresh();
    const channel = supabase.channel('oficia-workflow-' + bookingId + '-' + mode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_messages', filter: 'booking_id=eq.' + bookingId }, () => { if (active) void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_payment_proofs', filter: 'booking_id=eq.' + bookingId }, () => { if (active) void refresh(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: 'id=eq.' + bookingId }, () => { if (active) void refresh(); })
      .subscribe();
    return () => { active = false; void supabase?.removeChannel(channel); };
  }, [visible, bookingId, mode, refresh]);

  useEffect(() => {
    setBooking(null);
    setContact(null);
    setInstructions(null);
    setProofs([]);
    setMessages([]);
    setProofReviewNote('');
    setNotice('');
    setLoading(true);
  }, [bookingId, mode]);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!supabase || !body || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.from('booking_messages').insert({ booking_id: bookingId, sender_id: userId, body });
    if (error) setNotice('No se pudo enviar el mensaje. Intenta de nuevo.');
    else { setDraft(''); await refresh(); }
    setBusy(false);
  };

  const pickProof = () => {
    if (typeof document === 'undefined') { setNotice('Abre Oficia en tu navegador para seleccionar el comprobante.'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void uploadProof(file);
    };
    input.click();
  };

  const uploadProof = async (file: File) => {
    if (!supabase || !booking) return;
    const mime = file.type;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(mime) || file.size < 1 || file.size > 8000000) {
      setNotice('El comprobante debe ser JPG, PNG o PDF y pesar hasta 8 MB.');
      return;
    }
    setBusy(true); setNotice('');
    const fileName = file.name.replace(/[^A-Za-z0-9._ -]/g, '').slice(0, 150) || 'comprobante';
    const random = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    const objectPath = bookingId + '/' + userId + '/' + random + '-' + fileName;
    const { error: uploadError } = await supabase.storage.from('oficia-booking-proofs')
      .upload(objectPath, file, { contentType: mime, upsert: false });
    if (uploadError) {
      setNotice('No se pudo cargar el comprobante. Verifica tu conexión e inténtalo de nuevo.');
      setBusy(false);
      return;
    }
    const { error } = await supabase.rpc('client_report_booking_payment', {
      p_booking_id: bookingId, p_object_path: objectPath, p_file_name: fileName, p_mime_type: mime, p_size_bytes: file.size,
    });
    if (error) {
      await supabase.storage.from('oficia-booking-proofs').remove([objectPath]);
      setNotice('No se pudo enviar el comprobante. Actualiza la solicitud e inténtalo de nuevo.');
    } else {
      setNotice('Comprobante enviado a Operaciones.');
      await refresh();
      onChanged?.();
    }
    setBusy(false);
  };

  const confirmPayment = async () => {
    if (!supabase || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('operations_confirm_booking_payment', { p_booking_id: bookingId, p_note: '' });
    if (error) setNotice('No se pudo confirmar la recepción. Verifica el comprobante y vuelve a intentarlo.');
    else { setNotice('Pago externo confirmado y registrado.'); await refresh(); onChanged?.(); }
    setBusy(false);
  };

  const requestNewProof = async () => {
    const reason = proofReviewNote.trim();
    if (!supabase || busy || reason.length < 4) { setNotice('Indica qué debe corregir el cliente.'); return; }
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('operations_reject_booking_proof', { p_booking_id: bookingId, p_reason: reason });
    if (error) setNotice('No se pudo enviar la indicación. Revisa el motivo e inténtalo de nuevo.');
    else { setProofReviewNote(''); setNotice('Se pidió un nuevo comprobante al cliente.'); await refresh(); onChanged?.(); }
    setBusy(false);
  };

  const closeAgreement = async () => {
    if (!supabase || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('operations_close_booking_agreement', { p_booking_id: bookingId });
    if (error) setNotice('No se pudo cerrar el acuerdo. Verifica que la recepción esté confirmada.');
    else { setNotice('Acuerdo cerrado. La renta ya puede autorizarse.'); await refresh(); onChanged?.(); }
    setBusy(false);
  };

  const authorize = async () => {
    if (!supabase || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('operations_decide_booking', { p_booking_id: bookingId, p_decision: 'confirmar', p_reason: '' });
    if (error) setNotice('No se pudo autorizar la renta. Revisa el estado y la disponibilidad del espacio.');
    else { setNotice('Renta autorizada. El dueño recibió una notificación.'); await refresh(); onChanged?.(); }
    setBusy(false);
  };

  const configured = Boolean(instructions?.bank_name && instructions?.clabe && instructions?.beneficiary);
  const statusText = booking?.status === 'confirmada' ? 'Renta autorizada'
    : booking?.payment_status === 'verificado' ? 'Pago confirmado'
    : booking?.payment_status === 'reportado' ? 'Comprobante enviado'
    : booking?.status === 'rechazada' || booking?.status === 'cancelada' ? 'Solicitud cerrada'
    : 'En revisión por Operaciones';

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={styles.modal}>
      <View style={styles.header}>
        <View style={styles.flex}><Text style={styles.eyebrow}>{mode === 'operations' ? 'CENTRO DE OPERACIONES' : 'SEGUIMIENTO DE RENTA'}</Text><Text style={styles.title}>Tu solicitud</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar seguimiento" onPress={onClose} style={styles.close}><Icon name="close" size={20} color={palette.plum} /></Pressable>
      </View>
      {loading && !booking ? <View style={styles.loading}><ActivityIndicator color={palette.action} /><Text style={styles.meta}>Cargando solicitud…</Text></View> : booking ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}><Text style={styles.ticketCode}>{booking.transfer_reference}</Text><Text style={styles.status}>{statusText}</Text></View>
        {mode === 'operations' ? <View style={styles.contactCard}>
          {contact?.avatar_url ? <Image source={{ uri: contact.avatar_url }} accessibilityLabel={'Foto de ' + contact.display_name} style={styles.avatar} /> : <View style={styles.avatarFallback}><Icon name="user" size={22} color={palette.action} /></View>}
          <View style={styles.flex}><Text style={styles.contactName}>{contact?.display_name ?? 'Cliente Oficia'}</Text><Text selectable style={styles.meta}>{contact?.email ?? 'Correo no disponible'}</Text>{contact?.phone ? <Text selectable style={styles.meta}>{contact.phone}</Text> : null}</View>
        </View> : null}
        <View style={styles.ticket}>
          <Text style={styles.sectionTitle}>{booking.spaces?.name ?? 'Espacio'}</Text>
          <Text style={styles.meta}>{booking.spaces?.area ?? 'Delicias, Chihuahua'}</Text>
          <View style={styles.rule} />
          <Row label="Fecha" value={formatDate(booking.local_date)} />
          <Row label="Hora" value={booking.local_time.slice(0, 5)} />
          <Row label="Duración" value={booking.quantity + ' ' + booking.unit.toLocaleLowerCase('es-MX') + (booking.quantity === 1 ? '' : 's')} />
          <Row label="Importe" value={formatMoney(booking.total_cents / 100)} strong />
          <Row label="Referencia" value={booking.transfer_reference} />
        </View>
        {mode === 'customer' && booking.status !== 'confirmada' && booking.status !== 'rechazada' && booking.status !== 'cancelada' ? <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Datos para transferencia</Text>
          {configured ? <>
            <Row label="Banco" value={instructions?.bank_name ?? ''} />
            <Row label="Beneficiario" value={instructions?.beneficiary ?? ''} />
            <Row label="CLABE" value={instructions?.clabe ?? ''} selectable />
            <Text selectable style={styles.instructions}>{instructions?.instructions}</Text>
            <Text style={styles.helper}>Incluye la referencia {booking.transfer_reference} en el concepto. Oficia no recibe ni procesa el pago.</Text>
          </> : <Text style={styles.helper}>Operaciones aún está configurando los datos bancarios. Puedes escribir por aquí; no transfieras hasta verlos en tu solicitud.</Text>}
          {booking.payment_status === 'reportado' ? <Text style={styles.progress}>Comprobante enviado. Operaciones revisará el pago.</Text> : null}
          {booking.payment_status === 'rechazado' && booking.payment_review_note ? <Text style={styles.helper}>Operaciones solicita corregirlo: {booking.payment_review_note}</Text> : null}
          {booking.payment_status === 'verificado' ? <Text style={styles.progress}>Pago recibido por Operaciones.</Text> : null}
          {(booking.payment_status === 'pendiente' || booking.payment_status === 'rechazado') && configured ? <Pressable accessibilityRole="button" disabled={busy} onPress={pickProof} style={[styles.primary, busy && styles.disabled]}><Icon name="ticket" size={17} color={palette.white} /><Text style={styles.primaryText}>Cargar comprobante</Text></Pressable> : null}
          <Text style={styles.helper}>La solicitud aparta este horario hasta por 24 horas. Después de enviar el comprobante, Operaciones te dará seguimiento.</Text>
        </View> : null}
        {mode === 'operations' ? <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Comprobante de pago</Text>
          {proofs.length ? proofs.map(proof => <Pressable key={proof.id} accessibilityRole="link" disabled={!proof.url} onPress={() => { if (proof.url) void Linking.openURL(proof.url); }} style={styles.proofRow}><Icon name="ticket" size={17} color={palette.action} /><View style={styles.flex}><Text style={styles.proofName}>{proof.file_name}</Text><Text style={styles.meta}>{proof.mime_type} · {(proof.size_bytes / 1024 / 1024).toFixed(2)} MB</Text></View><Icon name="arrow" size={15} color={palette.action} /></Pressable>) : <Text style={styles.helper}>El cliente aún no carga su comprobante.</Text>}
          {booking.payment_status === 'reportado' ? <>
            <Action label="Confirmar pago recibido" disabled={busy || !proofs.length} onPress={() => void confirmPayment()} />
            <TextInput accessibilityLabel="Qué debe corregir el comprobante" value={proofReviewNote} onChangeText={setProofReviewNote} placeholder="Si no coincide, explica qué debe corregir" placeholderTextColor={palette.muted} maxLength={500} style={[styles.input, { marginTop: 10 }]} multiline />
            <Pressable accessibilityRole="button" disabled={busy || proofReviewNote.trim().length < 4} onPress={() => void requestNewProof()} style={[styles.secondary, busy && styles.disabled]}><Text style={styles.secondaryText}>Solicitar otro comprobante</Text></Pressable>
          </> : null}
          {booking.payment_status === 'verificado' && !booking.agreement_closed_at ? <Action label="Cerrar acuerdo" disabled={busy} onPress={() => void closeAgreement()} /> : null}
          {booking.payment_status === 'verificado' && booking.agreement_closed_at && booking.status !== 'confirmada' ? <Action label="Autorizar renta y avisar al dueño" disabled={busy} onPress={() => void authorize()} /> : null}
          {booking.agreement_closed_at ? <Text style={styles.progress}>Acuerdo cerrado por Operaciones.</Text> : null}
        </View> : null}
        {booking.status === 'confirmada' ? <View style={styles.successCard}><Text style={styles.successTitle}>Renta autorizada</Text><Text style={styles.helper}>El dueño ya recibió el aviso. Coordina la entrega desde Mis reservas.</Text></View> : null}
        <View style={styles.chatCard}>
          <Text style={styles.sectionTitle}>{mode === 'operations' ? 'Conversación con el cliente' : 'Habla con Operaciones'}</Text>
          <ScrollView nestedScrollEnabled style={styles.messages} contentContainerStyle={styles.messageList}>
            {messages.length ? messages.map(message => <View key={message.id} style={[styles.bubble, message.sender_id === userId ? styles.mine : styles.theirs]}><Text style={[styles.messageText, message.sender_id === userId && styles.mineText]}>{message.body}</Text><Text style={[styles.time, message.sender_id === userId && styles.mineText]}>{new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.created_at))}</Text></View>) : <Text style={styles.meta}>Aún no hay mensajes.</Text>}
          </ScrollView>
          {(booking.status === 'pendiente' || booking.status === 'aceptada_anfitrion') ? <View style={styles.composer}><TextInput accessibilityLabel="Mensaje" value={draft} onChangeText={setDraft} placeholder="Escribe un mensaje" placeholderTextColor={palette.muted} maxLength={2000} multiline style={styles.chatInput} /><Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje" disabled={busy || !draft.trim()} onPress={() => void sendMessage()} style={[styles.send, (busy || !draft.trim()) && styles.disabled]}><Icon name="arrow" size={18} color={palette.white} /></Pressable></View> : <Text style={styles.helper}>La conversación con Operaciones se cerró al autorizar la renta.</Text>}
        </View>
        {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      </ScrollView> : <View style={styles.loading}><Text style={styles.meta}>No encontramos esta solicitud.</Text></View>}
    </View>
  </Modal>;
}

function Row({ label, value, strong = false, selectable = false }: { label: string; value: string; strong?: boolean; selectable?: boolean }) {
  return <View style={styles.row}><Text style={styles.meta}>{label}</Text><Text selectable={selectable} style={[styles.value, strong && styles.valueStrong]}>{value}</Text></View>;
}
function Action({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primary, disabled && styles.disabled]}><Text style={styles.primaryText}>{label}</Text><Icon name="arrow" size={17} color={palette.white} /></Pressable>;
}
const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: palette.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: palette.line, backgroundColor: palette.white },
  flex: { flex: 1 }, eyebrow: { color: palette.action, fontSize: 10, fontWeight: '900', letterSpacing: 2 }, title: { color: palette.plum, fontSize: 25, fontWeight: '900', marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, content: { padding: 18, paddingBottom: 42, gap: 13 },
  statusCard: { backgroundColor: palette.action, borderRadius: 18, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketCode: { color: palette.white, fontSize: 13, fontWeight: '900', letterSpacing: 1 }, status: { color: palette.white, fontSize: 12, fontWeight: '800' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: palette.line },
  avatar: { width: 52, height: 52, borderRadius: 18 }, avatarFallback: { width: 52, height: 52, borderRadius: 18, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' },
  contactName: { color: palette.plum, fontSize: 16, fontWeight: '900' },
  ticket: { backgroundColor: palette.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: palette.line },
  sectionTitle: { color: palette.plum, fontSize: 16, fontWeight: '900', marginBottom: 7 }, rule: { height: 1, backgroundColor: palette.line, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 15, marginTop: 8 },
  meta: { color: palette.muted, fontSize: 12, lineHeight: 18 }, value: { color: palette.plum, fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right', lineHeight: 18 }, valueStrong: { color: palette.action, fontSize: 15, fontWeight: '900' },
  paymentCard: { backgroundColor: palette.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: palette.line },
  instructions: { color: palette.plum, fontSize: 12, marginTop: 10, lineHeight: 18 }, helper: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 9 },
  progress: { color: palette.action, fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: '800' },
  primary: { minHeight: 48, borderRadius: 15, backgroundColor: palette.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14, marginTop: 13 },
  primaryText: { color: palette.white, fontWeight: '900', fontSize: 13 }, disabled: { opacity: 0.5 },
  secondary: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: palette.action, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 9 },
  secondaryText: { color: palette.action, fontWeight: '900', fontSize: 12 },
  chatInput: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: palette.line, color: palette.plum, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, textAlignVertical: 'top' },
  proofRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 11, borderRadius: 13, backgroundColor: palette.cream, marginTop: 7 },
  proofName: { color: palette.plum, fontWeight: '800', fontSize: 12 }, successCard: { backgroundColor: '#E9F5EF', borderRadius: 16, padding: 15 },
  successTitle: { color: palette.action, fontWeight: '900', fontSize: 15 }, chatCard: { backgroundColor: palette.white, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: palette.line },
  messages: { maxHeight: 210, minHeight: 58, marginTop: 6 }, messageList: { gap: 8 },
  bubble: { maxWidth: '88%', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13 }, mine: { alignSelf: 'flex-end', backgroundColor: palette.action }, theirs: { alignSelf: 'flex-start', backgroundColor: palette.cream, borderWidth: 1, borderColor: palette.line },
  messageText: { color: palette.plum, fontSize: 12, lineHeight: 17 }, mineText: { color: palette.white }, time: { alignSelf: 'flex-end', color: palette.muted, fontSize: 9, marginTop: 3 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 }, chatInput: { flex: 1, minHeight: 42, maxHeight: 90, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, color: palette.plum, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13 },
  send: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }, notice: { color: palette.action, fontSize: 12, lineHeight: 18, fontWeight: '700', paddingHorizontal: 4 },
});
