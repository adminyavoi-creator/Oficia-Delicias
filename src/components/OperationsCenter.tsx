import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { formatMoney } from '../data';
import { palette } from '../theme';
import { OperationsDraftReview, ReviewDraft } from './OperationsDraftReview';
import { OperationsReviews } from './OperationsReviews';
import { OperationsNotifications } from './OperationsNotifications';

type Section = 'Resumen' | 'Solicitudes' | 'Movimientos' | 'Espacios' | 'Opiniones' | 'Avisos';
type Direction = 'cobro_cliente' | 'pago_anfitrion' | 'reembolso_cliente';
type SpaceRef = { name: string; area: string; is_demo: boolean; host_id: string };
type OpsBooking = {
  id: string; client_id: string; space_id: string; local_date: string; local_time: string; unit: string;
  quantity: number; total_cents: number; operations_fee_cents: number; operations_fee_vat_estimate_cents: number;
  owner_balance_estimate_cents: number; status: string; completed_at: string | null; created_at: string; spaces: SpaceRef | null;
};
type FinancialEvent = {
  id: string; booking_id: string; direction: Direction; amount_cents: number; method: string;
  external_reference: string; event_date: string; note: string; created_at: string;
};
type EntryForm = { bookingId: string; direction: Direction; amount: string; method: 'transferencia' | 'efectivo' | 'otro'; reference: string; eventDate: string; note: string };
const sections: Section[] = ['Resumen', 'Solicitudes', 'Movimientos', 'Espacios', 'Opiniones', 'Avisos'];
const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const amountCents = (value: string) => Math.round(Number(value.replace(',', '.')) * 100);
const moneyInput = (cents: number) => (Math.max(0, cents) / 100).toFixed(2);
const directionTitle: Record<Direction, string> = {
  cobro_cliente: 'Cobro recibido del cliente',
  pago_anfitrion: 'Pago realizado al dueño',
  reembolso_cliente: 'Reembolso al cliente',
};
const directionLabel: Record<Direction, string> = {
  cobro_cliente: 'Cobro cliente', pago_anfitrion: 'Pago dueño', reembolso_cliente: 'Reembolso',
};

export function OperationsCenter({
  userId, isOperations, drafts, draftBusy, onReviewDraft, onChangeToOwner,
}: {
  userId: string; isOperations: boolean; drafts: ReviewDraft[]; draftBusy: boolean;
  onReviewDraft: (id: string, approve: boolean, reason: string) => void; onChangeToOwner: () => void;
}) {
  const [section, setSection] = useState<Section>('Resumen');
  const [bookings, setBookings] = useState<OpsBooking[]>([]);
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [entry, setEntry] = useState<EntryForm | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!supabase || !isOperations) { setLoading(false); return; }
    setLoading(true);
    const result = await supabase.from('bookings')
      .select('id,client_id,space_id,local_date,local_time,unit,quantity,total_cents,operations_fee_cents,operations_fee_vat_estimate_cents,owner_balance_estimate_cents,status,completed_at,created_at,spaces!inner(name,area,is_demo,host_id)')
      .order('created_at', { ascending: false }).limit(200);
    if (result.error) {
      setNotice('No se pudieron cargar las solicitudes. Actualiza para volver a intentar.');
      setLoading(false);
      return;
    }
    const rows = (result.data ?? []) as unknown as OpsBooking[];
    setBookings(rows);
    if (rows.length) {
      const ledger = await supabase.from('booking_financial_events')
        .select('id,booking_id,direction,amount_cents,method,external_reference,event_date,note,created_at')
        .in('booking_id', rows.map(row => row.id)).order('created_at', { ascending: false }).limit(500);
      if (ledger.error) setNotice('No se pudo cargar la bitácora financiera. Actualiza para volver a intentar.');
      else { setEvents((ledger.data ?? []) as FinancialEvent[]); setNotice(''); }
    } else { setEvents([]); setNotice(''); }
    setLoading(false);
  }, [isOperations]);

  useEffect(() => { void refresh(); }, [refresh]);

  const realBookings = useMemo(() => bookings.filter(item => !item.spaces?.is_demo), [bookings]);
  const eventsByBooking = useMemo(() => {
    const grouped = new Map<string, FinancialEvent[]>();
    for (const event of events) {
      const rows = grouped.get(event.booking_id);
      if (rows) rows.push(event);
      else grouped.set(event.booking_id, [event]);
    }
    return grouped;
  }, [events]);
  const sumsByBooking = useMemo(() => {
    const grouped = new Map<string, { collected: number; paidOwner: number }>();
    for (const event of events) {
      const sum = grouped.get(event.booking_id) ?? { collected: 0, paidOwner: 0 };
      if (event.direction === 'cobro_cliente') sum.collected += event.amount_cents;
      else if (event.direction === 'reembolso_cliente') sum.collected -= event.amount_cents;
      else if (event.direction === 'pago_anfitrion') sum.paidOwner += event.amount_cents;
      grouped.set(event.booking_id, sum);
    }
    return grouped;
  }, [events]);
  const totalsFor = (bookingId: string) => {
    return sumsByBooking.get(bookingId) ?? { collected: 0, paidOwner: 0 };
  };
  const totals = useMemo(() => ({
    collected: events.filter(event => event.direction === 'cobro_cliente').reduce((sum, event) => sum + event.amount_cents, 0),
    payouts: events.filter(event => event.direction === 'pago_anfitrion').reduce((sum, event) => sum + event.amount_cents, 0),
    refunds: events.filter(event => event.direction === 'reembolso_cliente').reduce((sum, event) => sum + event.amount_cents, 0),
  }), [events]);
  const pending = realBookings.filter(item => item.status === 'aceptada_anfitrion');
  const awaitingHost = realBookings.filter(item => item.status === 'pendiente').length;
  const openPayouts = realBookings.filter(item => item.status === 'confirmada' && item.completed_at
    && item.owner_balance_estimate_cents - (sumsByBooking.get(item.id)?.paidOwner ?? 0) > 0);

  const startEntry = (booking: OpsBooking, direction: Direction) => {
    const sums = totalsFor(booking.id);
    const due = direction === 'cobro_cliente' ? booking.total_cents - sums.collected
      : direction === 'pago_anfitrion' ? booking.owner_balance_estimate_cents - sums.paidOwner
        : sums.collected;
    setNotice('');
    setEntry({ bookingId: booking.id, direction, amount: moneyInput(due), method: 'transferencia', reference: '', eventDate: localDate(), note: '' });
  };

  const saveEntry = async () => {
    if (!supabase || !entry || busy) return;
    const cents = amountCents(entry.amount);
    if (!Number.isInteger(cents) || cents < 1 || !entry.reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.eventDate)) {
      setNotice('Revisa el importe, la fecha y la referencia externa.');
      return;
    }
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('operations_record_external_payment', {
      p_booking_id: entry.bookingId, p_direction: entry.direction, p_amount_cents: cents,
      p_method: entry.method, p_external_reference: entry.reference.trim(), p_event_date: entry.eventDate,
      p_note: entry.note.trim(),
    });
    if (error) setNotice(friendlyError(error.message));
    else { setEntry(null); setNotice('Movimiento externo registrado. Oficia no movió dinero.'); await refresh(); }
    setBusy(false);
  };

  const decide = async (booking: OpsBooking, decision: 'confirmar' | 'rechazar') => {
    if (!supabase || busy) return;
    const reason = (reasons[booking.id] ?? '').trim();
    if (decision === 'rechazar' && !reason) { setNotice('Indica el motivo para devolver la solicitud.'); return; }
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('operations_decide_booking', {
      p_booking_id: booking.id, p_decision: decision, p_reason: reason,
    });
    if (error) setNotice(friendlyError(error.message));
    else { setNotice(decision === 'confirmar' ? 'Renta autorizada y notificación enviada.' : 'Solicitud rechazada.'); await refresh(); }
    setBusy(false);
  };

  if (!isOperations) return <View style={styles.page}><Text style={styles.title}>Acceso restringido</Text><Text style={styles.copy}>Esta cuenta no tiene permisos de Operaciones.</Text><Pressable accessibilityRole="button" onPress={onChangeToOwner} style={styles.switchButton}><Text style={styles.switchText}>Volver a mi perfil</Text></Pressable></View>;

  return <View style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerText}><Text style={styles.eyebrow}>OFICIA · ADMINISTRACIÓN</Text><Text style={styles.title}>Centro de Operaciones</Text><Text style={styles.copy}>Espacios, solicitudes y movimientos externos.</Text></View>
      <Pressable accessibilityRole="button" onPress={onChangeToOwner} style={styles.switchButton}><Text style={styles.switchText}>Cambiar a dueño</Text></Pressable>
    </View>
    <View style={styles.noticeBox}><Text style={styles.noticeTitle}>Operaciones fuera de Oficia</Text><Text style={styles.noticeCopy}>Aquí se registran movimientos que ya se realizaron por fuera. La app no cobra, transfiere ni guarda datos bancarios.</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {sections.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: section === item }} onPress={() => setSection(item)} style={[styles.tab, section === item && styles.tabSelected]}><Text style={[styles.tabText, section === item && styles.tabTextSelected]}>{item}</Text></Pressable>)}
    </ScrollView>
    {notice ? <Text accessibilityRole="alert" style={styles.message}>{notice}</Text> : null}
    {loading ? <Text style={styles.loading}>Cargando actividad…</Text> : <>
      {section === 'Resumen' && <>
        <View style={styles.stats}>
          <Stat value={String(pending.length)} label="Solicitudes por revisar" />
          <Stat value={String(drafts.length)} label="Espacios por aprobar" />
          <Stat value={formatMoney(totals.collected / 100)} label="Cobros registrados" />
          <Stat value={formatMoney(totals.payouts / 100)} label="Pagos a dueños" />
        </View>
        <View style={styles.card}><Text style={styles.cardTitle}>Pendientes de atención</Text><Text style={styles.copy}>{drafts.length} espacios · {pending.length} aceptadas por validar · {awaitingHost} esperando respuesta del dueño · {openPayouts.length} rentas finalizadas por liquidar</Text>
          <View style={styles.row}><Pressable accessibilityRole="button" onPress={() => setSection('Espacios')} style={styles.smallAction}><Text style={styles.smallActionText}>Revisar espacios</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setSection('Solicitudes')} style={styles.smallAction}><Text style={styles.smallActionText}>Ver solicitudes</Text></Pressable></View>
        </View>
        <View style={styles.card}><Text style={styles.cardTitle}>Balance de bitácora</Text><LedgerLine label="Cobros de clientes" value={formatMoney(totals.collected / 100)} /><LedgerLine label="Reembolsos registrados" value={formatMoney(totals.refunds / 100)} /><LedgerLine label="Pagos a dueños" value={formatMoney(totals.payouts / 100)} /><Text style={styles.fine}>Importes de operaciones externas registradas; no son movimientos procesados por Oficia.</Text></View>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={styles.refresh}><Text style={styles.refreshText}>Actualizar centro</Text></Pressable>
      </>}
      {section === 'Solicitudes' && <>
        <Text style={styles.sectionTitle}>Solicitudes de renta</Text><Text style={styles.copy}>Primero el dueño acepta; luego Operaciones registra el movimiento externo y autoriza la renta.</Text>
        {realBookings.length ? realBookings.map(booking => <BookingCard key={booking.id} booking={booking} sums={totalsFor(booking.id)} events={eventsByBooking.get(booking.id) ?? []} entry={entry?.bookingId === booking.id ? entry : null} busy={busy} reason={reasons[booking.id] ?? ''} onReason={value => setReasons(current => ({ ...current, [booking.id]: value }))} onStartEntry={direction => startEntry(booking, direction)} onEntryChange={setEntry} onSaveEntry={() => void saveEntry()} onCancelEntry={() => setEntry(null)} onDecide={decision => void decide(booking, decision)} />) : <Empty text="Las solicitudes de espacios reales aparecerán aquí." />}
      </>}
      {section === 'Movimientos' && <>
        <Text style={styles.sectionTitle}>Bitácora financiera</Text><Text style={styles.copy}>Solo incluye cobros, pagos y reembolsos registrados después de realizarse.</Text>
        {events.length ? events.map(event => {
          const booking = bookings.find(item => item.id === event.booking_id);
          return <View key={event.id} style={styles.eventCard}><View style={styles.eventTop}><Text style={styles.cardTitle}>{directionLabel[event.direction]}</Text><Text style={styles.eventAmount}>{formatMoney(event.amount_cents / 100)}</Text></View><Text style={styles.copy}>{booking?.spaces?.name ?? 'Espacio'} · ticket {event.booking_id.slice(0, 8).toUpperCase()}</Text><Text style={styles.meta}>{dateLabel(event.event_date)} · {methodLabel(event.method)} · Ref. {event.external_reference}</Text>{event.note ? <Text style={styles.meta}>{event.note}</Text> : null}</View>;
        }) : <Empty text="Aún no hay movimientos externos registrados." />}
      </>}
      {section === 'Espacios' && <OperationsDraftReview drafts={drafts} busy={draftBusy} onReview={onReviewDraft} />}
      {section === 'Opiniones' && <OperationsReviews />}
      {section === 'Avisos' && <OperationsNotifications userId={userId} />}
    </>}
  </View>;
}

function BookingCard({ booking, sums, events, entry, busy, reason, onReason, onStartEntry, onEntryChange, onSaveEntry, onCancelEntry, onDecide }: {
  booking: OpsBooking; sums: { collected: number; paidOwner: number }; events: FinancialEvent[]; entry: EntryForm | null; busy: boolean; reason: string;
  onReason: (value: string) => void; onStartEntry: (direction: Direction) => void; onEntryChange: (value: EntryForm | null) => void;
  onSaveEntry: () => void; onCancelEntry: () => void; onDecide: (decision: 'confirmar' | 'rechazar') => void;
}) {
  const collectDue = Math.max(booking.total_cents - sums.collected, 0);
  const ownerDue = Math.max(booking.owner_balance_estimate_cents - sums.paidOwner, 0);
  const refundable = Math.max(sums.collected, 0);
  const statusLabel = booking.status === 'pendiente' ? 'Esperando al dueño' : booking.status === 'aceptada_anfitrion' ? 'Aceptada · falta validar' : booking.status === 'confirmada' ? booking.completed_at ? 'Realizada' : 'Autorizada' : booking.status === 'rechazada' ? 'Rechazada' : booking.status;
  return <View style={styles.bookingCard}>
    <View style={styles.eventTop}><View style={styles.badge}><Text style={styles.badgeText}>{statusLabel}</Text></View><Text style={styles.meta}>OF-{booking.id.slice(0, 8).toUpperCase()}</Text></View>
    <Text style={styles.bookingTitle}>{booking.spaces?.name ?? 'Espacio'}</Text><Text style={styles.copy}>{booking.spaces?.area ?? ''} · {dateLabel(booking.local_date)} · {booking.local_time.slice(0, 5)}</Text>
    <Text style={styles.copy}>{booking.quantity} {unitLabel(booking.unit, booking.quantity)} · {formatMoney(booking.total_cents / 100)}</Text>
    <View style={styles.divider} />
    <LedgerLine label="Cobro cliente registrado" value={formatMoney(Math.max(sums.collected, 0) / 100)} />
    <LedgerLine label="Pendiente por registrar" value={formatMoney(collectDue / 100)} />
    <LedgerLine label="Dueño · referencia antes de impuestos" value={formatMoney(booking.owner_balance_estimate_cents / 100)} />
    {sums.paidOwner > 0 ? <LedgerLine label="Pagado al dueño" value={formatMoney(sums.paidOwner / 100)} /> : null}
    <Text style={styles.fine}>Comisión Oficia: {formatMoney(booking.operations_fee_cents / 100)} · IVA estimado de comisión: {formatMoney(booking.operations_fee_vat_estimate_cents / 100)}. No es liquidación fiscal.</Text>
    {booking.status === 'pendiente' ? <Text style={styles.meta}>El dueño aún debe aceptar esta solicitud. El ticket no está activo.</Text> : null}
    {booking.status === 'aceptada_anfitrion' && <>
      <View style={styles.row}><Pressable accessibilityRole="button" disabled={busy || collectDue === 0} onPress={() => onStartEntry('cobro_cliente')} style={[styles.action, collectDue === 0 && styles.disabled]}><Text style={styles.actionText}>Registrar cobro externo</Text></Pressable>{refundable > 0 ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => onStartEntry('reembolso_cliente')} style={styles.secondary}><Text style={styles.secondaryText}>Reembolso</Text></Pressable> : null}</View>
      {sums.collected >= booking.total_cents ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => onDecide('confirmar')} style={[styles.action, styles.fullAction]}><Text style={styles.actionText}>{busy ? 'Guardando…' : 'Autorizar renta'}</Text></Pressable> : <Text style={styles.meta}>Registra el cobro completo para habilitar la autorización.</Text>}
      <TextInput accessibilityLabel={`Motivo de rechazo ${booking.id}`} value={reason} onChangeText={onReason} maxLength={300} placeholder="Motivo si se rechaza" placeholderTextColor={palette.muted} style={styles.input} />
      {sums.collected === 0 ? <Pressable accessibilityRole="button" disabled={busy || !reason.trim()} onPress={() => onDecide('rechazar')} style={styles.secondary}><Text style={styles.secondaryText}>Rechazar solicitud</Text></Pressable> : <Text style={styles.meta}>Para rechazar, registra primero el reembolso externo completo.</Text>}
    </>}
    {booking.status === 'rechazada' || booking.status === 'cancelada' ? refundable > 0 ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => onStartEntry('reembolso_cliente')} style={styles.secondary}><Text style={styles.secondaryText}>Registrar reembolso externo</Text></Pressable> : null : null}
    {booking.status === 'confirmada' && booking.completed_at ? <Pressable accessibilityRole="button" disabled={busy || ownerDue === 0} onPress={() => onStartEntry('pago_anfitrion')} style={[styles.action, ownerDue === 0 && styles.disabled]}><Text style={styles.actionText}>Registrar pago al dueño · {formatMoney(ownerDue / 100)}</Text></Pressable> : null}
    {entry ? <EntryEditor value={entry} busy={busy} onChange={onEntryChange} onSave={onSaveEntry} onCancel={onCancelEntry} /> : null}
    {events.length ? <View style={styles.history}><Text style={styles.historyTitle}>Movimientos del ticket</Text>{events.map(event => <Text key={event.id} style={styles.meta}>{dateLabel(event.event_date)} · {directionLabel[event.direction]} · {formatMoney(event.amount_cents / 100)} · {event.external_reference}</Text>)}</View> : null}
  </View>;
}

function EntryEditor({ value, busy, onChange, onSave, onCancel }: { value: EntryForm; busy: boolean; onChange: (next: EntryForm | null) => void; onSave: () => void; onCancel: () => void }) {
  const update = (key: keyof EntryForm, next: string) => onChange({ ...value, [key]: next });
  return <View style={styles.editor}>
    <Text style={styles.editorTitle}>{directionTitle[value.direction]}</Text>
    <TextInput accessibilityLabel="Importe en pesos" value={value.amount} onChangeText={next => update('amount', next)} placeholder="Importe en MXN" keyboardType="decimal-pad" style={styles.input} />
    <View style={styles.row}>{(['transferencia', 'efectivo', 'otro'] as EntryForm['method'][]).map(method => <Pressable key={method} accessibilityRole="button" accessibilityState={{ selected: value.method === method }} onPress={() => onChange({ ...value, method })} style={[styles.method, value.method === method && styles.methodActive]}><Text style={[styles.methodText, value.method === method && styles.methodTextActive]}>{methodLabel(method)}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Referencia de la operación externa" value={value.reference} onChangeText={next => update('reference', next)} maxLength={100} placeholder="Referencia externa · no CLABE" style={styles.input} />
    <TextInput accessibilityLabel="Fecha del movimiento" value={value.eventDate} onChangeText={next => update('eventDate', next)} maxLength={10} placeholder="AAAA-MM-DD" style={styles.input} />
    <TextInput accessibilityLabel="Nota del movimiento" value={value.note} onChangeText={next => update('note', next)} maxLength={500} multiline placeholder="Nota (opcional)" style={[styles.input, styles.noteInput]} />
    <Text style={styles.fine}>Captura solo una operación ya hecha. No incluyas cuentas, CLABE, tarjetas ni contraseñas.</Text>
    <View style={styles.row}><Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.secondary}><Text style={styles.secondaryText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={onSave} style={[styles.action, styles.saveAction]}><Text style={styles.actionText}>{busy ? 'Guardando…' : 'Guardar registro'}</Text></Pressable></View>
  </View>;
}

function Stat({ value, label }: { value: string; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function LedgerLine({ label, value }: { label: string; value: string }) { return <View style={styles.ledgerLine}><Text style={styles.ledgerLabel}>{label}</Text><Text style={styles.ledgerValue}>{value}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>; }
function dateLabel(date: string) { const value = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date); return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(value); }
function methodLabel(method: string) { return method === 'transferencia' ? 'Transferencia' : method === 'efectivo' ? 'Efectivo' : 'Otro'; }
function unitLabel(unit: string, quantity: number) { const noun = unit === 'Hora' ? 'hora' : unit === 'Día' ? 'día' : 'semana'; return `${noun}${quantity === 1 ? '' : 's'}`; }
function friendlyError(message: string) {
  if (message.toLowerCase().includes('bank identifiers') || message.toLowerCase().includes('no_bank_identifiers') || message.toLowerCase().includes('números de cuenta')) return 'Usa solo una referencia corta. No captures CLABE, cuenta ni tarjeta.';
  if (message.includes('saldo pendiente')) return 'El importe supera lo pendiente del ticket.';
  if (message.includes('reembolso')) return 'El reembolso supera el cobro externo registrado.';
  if (message.includes('renta finalizada')) return 'El pago al dueño se registra después de finalizar la renta.';
  if (message.includes('total del cobro')) return 'Valida fuera de Oficia y registra el cobro completo antes de autorizar.';
  if (message.includes('excede el saldo estimado')) return 'El importe supera la referencia de pago al dueño.';
  if (message.includes('availability') || message.includes('confirmado en ese horario')) return 'El horario ya no está disponible. Revisa la agenda antes de autorizar.';
  return 'No se pudo guardar. Actualiza el centro y revisa los datos del movimiento.';
}

const styles = StyleSheet.create({
  page: { paddingTop: 12, paddingBottom: 24, backgroundColor: palette.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 }, headerText: { flex: 1 }, eyebrow: { color: palette.action, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 }, title: { color: palette.plum, fontSize: 25, lineHeight: 30, fontWeight: '900', marginTop: 5 }, copy: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, switchButton: { borderWidth: 1, borderColor: palette.action, backgroundColor: palette.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 11 }, switchText: { color: palette.action, fontSize: 11, fontWeight: '900' },
  noticeBox: { backgroundColor: palette.blush, borderRadius: 16, padding: 14, marginBottom: 14 }, noticeTitle: { color: palette.plum, fontSize: 13, fontWeight: '900' }, noticeCopy: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, tabs: { gap: 8, paddingBottom: 14 }, tab: { borderRadius: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 14, paddingVertical: 10 }, tabSelected: { backgroundColor: palette.action, borderColor: palette.action }, tabText: { color: palette.plum, fontSize: 11, fontWeight: '800' }, tabTextSelected: { color: palette.white },
  message: { color: palette.action, backgroundColor: palette.blush, padding: 11, borderRadius: 11, fontSize: 11, fontWeight: '700', marginBottom: 12 }, loading: { color: palette.muted, padding: 20, textAlign: 'center' }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 }, stat: { width: '48%', flexGrow: 1, minHeight: 88, backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 13, justifyContent: 'center' }, statValue: { color: palette.action, fontSize: 20, fontWeight: '900' }, statLabel: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: 5 }, card: { backgroundColor: palette.white, borderRadius: 16, borderWidth: 1, borderColor: palette.line, padding: 15, marginBottom: 11 }, cardTitle: { color: palette.plum, fontSize: 13, fontWeight: '900' }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 11 }, smallAction: { backgroundColor: palette.blush, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12 }, smallActionText: { color: palette.action, fontSize: 11, fontWeight: '900' }, sectionTitle: { color: palette.plum, fontSize: 21, fontWeight: '900', marginBottom: 3 }, refresh: { borderRadius: 12, borderWidth: 1, borderColor: palette.action, minHeight: 43, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, refreshText: { color: palette.action, fontSize: 12, fontWeight: '900' }, ledgerLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderColor: palette.line }, ledgerLabel: { color: palette.muted, fontSize: 11, flex: 1 }, ledgerValue: { color: palette.plum, fontSize: 11, fontWeight: '900' }, fine: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 9 },
  bookingCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 15, marginTop: 12 }, eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, badge: { borderRadius: 12, backgroundColor: palette.blush, paddingHorizontal: 10, paddingVertical: 6 }, badgeText: { color: palette.action, fontSize: 10, fontWeight: '900' }, meta: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 5 }, bookingTitle: { color: palette.plum, fontSize: 17, fontWeight: '900', marginTop: 10 }, divider: { height: 1, backgroundColor: palette.line, marginVertical: 10 }, action: { flex: 1, borderRadius: 12, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center', minHeight: 43, paddingHorizontal: 11 }, actionText: { color: palette.white, fontSize: 11, fontWeight: '900', textAlign: 'center' }, fullAction: { flex: 0, marginTop: 9 }, secondary: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', minHeight: 43, paddingHorizontal: 11, marginTop: 8 }, secondaryText: { color: palette.action, fontSize: 11, fontWeight: '900', textAlign: 'center' }, disabled: { opacity: .48 }, input: { minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, color: palette.plum, fontSize: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 9 },
  editor: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, borderRadius: 14, padding: 12, marginTop: 12 }, editorTitle: { color: palette.plum, fontSize: 13, fontWeight: '900' }, method: { borderRadius: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, paddingHorizontal: 9, paddingVertical: 8 }, methodActive: { borderColor: palette.action, backgroundColor: palette.action }, methodText: { color: palette.plum, fontSize: 10, fontWeight: '800' }, methodTextActive: { color: palette.white }, noteInput: { minHeight: 68, textAlignVertical: 'top' }, saveAction: { marginTop: 8 }, history: { marginTop: 12, borderTopWidth: 1, borderColor: palette.line, paddingTop: 10 }, historyTitle: { color: palette.plum, fontSize: 11, fontWeight: '900', marginBottom: 3 }, eventCard: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 13, marginTop: 10 }, eventAmount: { color: palette.action, fontSize: 13, fontWeight: '900' }, empty: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 22, marginTop: 14, alignItems: 'center' }, emptyText: { color: palette.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
