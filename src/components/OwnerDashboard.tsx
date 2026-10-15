import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { formatDate, formatMoney } from '../data';
import { palette } from '../theme';
import { ownerRevenue } from '../ownerMetrics';
import { Brand } from './Brand';
import { Icon, IconName } from './Icon';

type OwnerTab = 'Inicio' | 'Espacios' | 'Solicitudes' | 'Ingresos' | 'Perfil';
type OwnedSpace = { id: string; name: string; area: string; is_demo: boolean; is_published: boolean; rate_hour_cents: number };
type OwnerBooking = { id: string; space_id: string; local_date: string; local_time: string; quantity: number; unit: string; total_cents: number; status: string; payment_status: string; created_at: string };
type Draft = { id: string; name: string; area: string; city: string; address: string; latitude: number | null; longitude: number | null; open_days: number[]; opens_at: string; closes_at: string; photo_path: string | null; category: string; capacity: number; description: string; privacy: string; image_url: string; rate_hour_cents: number; rate_day_cents: number; rate_week_cents: number; status: string; rejection_reason: string | null };
type DraftForm = { id?: string; name: string; area: string; city: string; address: string; latitude: string; longitude: string; open_days: number[]; opens_at: string; closes_at: string; photo_path: string | null; category: string; capacity: string; description: string; privacy: string; image_url: string; hour: string; day: string; week: string };

const blankDraft: DraftForm = { name: '', area: '', city: 'Delicias', address: '', latitude: '', longitude: '', open_days: [1, 2, 3, 4, 5], opens_at: '08:00', closes_at: '18:00', photo_path: null, category: 'Oficina privada', capacity: '1', description: '', privacy: '', image_url: '', hour: '', day: '', week: '' };
const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const tabs: { label: OwnerTab; icon: IconName }[] = [
  { label: 'Inicio', icon: 'home' }, { label: 'Espacios', icon: 'briefcase' }, { label: 'Solicitudes', icon: 'calendar' }, { label: 'Ingresos', icon: 'ticket' }, { label: 'Perfil', icon: 'user' },
];
const toMoney = (value: string) => Math.round(Number(value) * 100);
const formFromDraft = (draft: Draft): DraftForm => ({ id: draft.id, name: draft.name, area: draft.area, city: draft.city, address: draft.address, latitude: draft.latitude == null ? '' : String(draft.latitude), longitude: draft.longitude == null ? '' : String(draft.longitude), open_days: draft.open_days, opens_at: draft.opens_at.slice(0, 5), closes_at: draft.closes_at.slice(0, 5), photo_path: draft.photo_path, category: draft.category, capacity: String(draft.capacity), description: draft.description, privacy: draft.privacy, image_url: draft.image_url, hour: String(draft.rate_hour_cents / 100), day: String(draft.rate_day_cents / 100), week: String(draft.rate_week_cents / 100) });

export function OwnerDashboard({ userId, email, isOperations, onOpenOperations, onSignOut }: {
  userId: string; email: string; isOperations: boolean; onOpenOperations: () => void; onSignOut: () => void;
}) {
  const [tab, setTab] = useState<OwnerTab>('Inicio');
  const [spaces, setSpaces] = useState<OwnedSpace[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [editing, setEditing] = useState<DraftForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [owned, draftsResult, requests] = await Promise.all([
      supabase.from('spaces').select('id,name,area,is_demo,is_published,rate_hour_cents').eq('host_id', userId),
      supabase.from('space_drafts').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('id,space_id,local_date,local_time,quantity,unit,total_cents,status,payment_status,created_at').order('created_at', { ascending: false }),
    ]);
    if (owned.error || draftsResult.error || requests.error) throw owned.error ?? draftsResult.error ?? requests.error;
    const ownedSpaces = (owned.data ?? []) as OwnedSpace[];
    const ids = new Set(ownedSpaces.map(space => space.id));
    setSpaces(ownedSpaces);
    setDrafts((draftsResult.data ?? []) as Draft[]);
    setBookings(((requests.data ?? []) as OwnerBooking[]).filter(booking => ids.has(booking.space_id)));
  }, [userId]);
  useEffect(() => {
    let active = true;
    refresh().catch(() => { if (active) setNotice('No se pudieron actualizar tus espacios.'); });
    return () => { active = false; };
  }, [refresh]);

  const revenue = useMemo(() => ownerRevenue(bookings, spaces), [bookings, spaces]);
  const gross = revenue.grossCents / 100;
  const waiting = bookings.filter(booking => booking.status === 'pendiente').length;
  const spaceName = (id: string) => spaces.find(space => space.id === id)?.name ?? 'Espacio';
  const updateForm = (key: keyof DraftForm, value: string) => setEditing(current => current ? { ...current, [key]: value } : current);
  const openDraft = (draft: Draft) => {
    setEditing(formFromDraft(draft)); setPhotoPreview(null);
    if (draft.photo_path && supabase) supabase.storage.from('oficia-space-drafts').createSignedUrl(draft.photo_path, 3600)
      .then(({ data }) => setPhotoPreview(data?.signedUrl ?? null));
  };
  const choosePhoto = () => {
    if (!editing?.id || !supabase || busy) { setNotice('Guarda el borrador antes de subir una foto.'); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !supabase || !editing?.id) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setNotice('Usa JPG, PNG o WebP de hasta 5 MB.'); return; }
      setBusy(true); setNotice('');
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${userId}/${editing.id}/${crypto.randomUUID()}.${ext}`;
      try {
        const upload = await supabase.storage.from('oficia-space-drafts').upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        const saved = await supabase.from('space_drafts').update({ photo_path: path }).eq('id', editing.id).eq('owner_id', userId).select('id').single();
        if (saved.error) { await supabase.storage.from('oficia-space-drafts').remove([path]); throw saved.error; }
        const signed = await supabase.storage.from('oficia-space-drafts').createSignedUrl(path, 3600);
        setPhotoPreview(signed.data?.signedUrl ?? null);
        setEditing(current => current ? { ...current, photo_path: path } : current);
        setNotice('Foto guardada en privado.');
        await refresh();
      } catch { setNotice('No se pudo subir la foto. Inténtalo de nuevo.'); }
      finally { setBusy(false); }
    };
    input.click();
  };

  const saveDraft = async (submit: boolean) => {
    if (!supabase || !editing || busy) return;
    const cents = [editing.hour, editing.day, editing.week].map(toMoney);
    const capacity = Number(editing.capacity);
    if (!editing.name.trim() || !editing.area.trim() || !Number.isInteger(capacity) || capacity < 1 || capacity > 100 || cents.some(value => !Number.isFinite(value) || value < 0 || value > 100000000)) {
      setNotice('Revisa nombre, zona, capacidad y tarifas.'); return;
    }
    const latitude = editing.latitude.trim() ? Number(editing.latitude) : null;
    const longitude = editing.longitude.trim() ? Number(editing.longitude) : null;
    if ((latitude === null) !== (longitude === null) || (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) || (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(editing.opens_at) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(editing.closes_at) || editing.closes_at <= editing.opens_at || !editing.open_days.length) {
      setNotice('Revisa coordenadas y horario de apertura.'); return;
    }
    if (submit && (editing.name.trim().length < 3 || editing.area.trim().length < 3 || editing.address.trim().length < 8 || editing.city.trim().length < 3 || editing.description.trim().length < 20 || editing.privacy.trim().length < 10 || cents.some(value => value <= 0) || (!editing.photo_path && !/^https:\/\/\S+$/i.test(editing.image_url.trim())))) {
      setNotice('Completa dirección, descripción, privacidad, tarifas y foto.'); return;
    }
    setBusy(true); setNotice('');
    const fields = { name: editing.name.trim(), area: editing.area.trim(), city: editing.city.trim(), address: editing.address.trim(), latitude, longitude, open_days: editing.open_days, opens_at: editing.opens_at, closes_at: editing.closes_at, category: editing.category, capacity,
      description: editing.description.trim(), privacy: editing.privacy.trim(), image_url: editing.image_url.trim(),
      rate_hour_cents: cents[0], rate_day_cents: cents[1], rate_week_cents: cents[2] };
    try {
      let savedId = editing.id;
      if (editing.id) {
        const { error } = await supabase.from('space_drafts').update({ ...fields, status: submit ? 'en_revision' : 'borrador' }).eq('id', editing.id).eq('owner_id', userId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('space_drafts').insert({ ...fields, owner_id: userId }).select('id').single();
        if (error) throw error;
        savedId = data.id;
        if (submit) {
          const result = await supabase.from('space_drafts').update({ status: 'en_revision' }).eq('id', data.id);
          if (result.error) throw result.error;
        }
      }
      setEditing(submit ? null : { ...editing, id: savedId });
      setNotice(submit ? 'Espacio enviado a revisión. Aún no aparece en el catálogo.' : 'Borrador guardado.');
      await refresh();
    } catch {
      setNotice('No se pudo guardar. Revisa los datos e inténtalo de nuevo.');
    } finally { setBusy(false); }
  };

  return <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}><Brand compact /><Pressable accessibilityRole="button" accessibilityLabel="Actualizar panel" onPress={() => refresh().catch(() => setNotice('No se pudo actualizar el panel.'))} style={styles.refresh}><Icon name="refresh" size={19} color={palette.action} /></Pressable></View>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      {tab === 'Inicio' && <>
        <Text style={styles.eyebrow}>TU ACTIVIDAD</Text><Text style={styles.title}>Tu espacio también trabaja para ti.</Text>
        <View style={styles.stats}><Stat label="Solicitudes" value={String(waiting)} /><Stat label="Espacios" value={String(spaces.filter(space => !space.is_demo).length + drafts.length)} /><Stat label="Ingresos confirmados" value={formatMoney(gross)} wide /></View>
        <Text style={styles.section}>Mis espacios</Text>
        {spaces.filter(space => !space.is_demo).length || drafts.length ? <>{spaces.filter(space => !space.is_demo).map(space => <SpaceLine key={space.id} name={space.name} detail={space.area} badge={space.is_published ? 'Publicado' : 'Pausado'} />)}{drafts.slice(0, 3).map(draft => <SpaceLine key={draft.id} name={draft.name || 'Espacio sin nombre'} detail={draft.area || 'Completa la zona'} badge={draft.status === 'en_revision' ? 'En revisión' : draft.status === 'aprobado' ? 'Validado' : draft.status === 'rechazado' ? 'Con observaciones' : 'Borrador'} />)}</> : <Empty text="Agrega tu primer espacio para comenzar." />}
        <Pressable accessibilityRole="button" onPress={() => { setTab('Espacios'); setPhotoPreview(null); setEditing({ ...blankDraft }); }} style={styles.action}><Icon name="plus" color={palette.white} size={18} /><Text style={styles.actionText}>Agregar espacio</Text></Pressable>
      </>}
      {tab === 'Espacios' && <>
        <Text style={styles.eyebrow}>CATÁLOGO</Text><Text style={styles.title}>Mis espacios</Text>
        {!editing ? <><Pressable accessibilityRole="button" onPress={() => { setPhotoPreview(null); setEditing({ ...blankDraft }); }} style={styles.action}><Icon name="plus" color={palette.white} size={18} /><Text style={styles.actionText}>Nuevo espacio</Text></Pressable>
          {drafts.map(draft => <Pressable key={draft.id} accessibilityRole="button" onPress={() => { if (draft.status === 'borrador' || draft.status === 'rechazado') openDraft(draft); }} style={styles.spaceCard}><SpaceLine name={draft.name || 'Espacio sin nombre'} detail={draft.area || 'Completa la zona'} badge={draft.status === 'en_revision' ? 'En revisión' : draft.status === 'aprobado' ? 'Validado' : draft.status === 'rechazado' ? 'Con observaciones' : 'Borrador'} />{draft.rejection_reason ? <Text style={styles.small}>{draft.rejection_reason}</Text> : null}</Pressable>)}
          {spaces.map(space => <SpaceLine key={space.id} name={space.name} detail={space.area} badge={space.is_demo ? 'Muestra · sin ingresos' : space.is_published ? 'Publicado' : 'Pausado'} />)}
          {!drafts.length && !spaces.length ? <Empty text="Aún no has agregado espacios." /> : null}</> : <>
          <View style={styles.formHead}><Text style={styles.section}>{editing.id ? 'Editar borrador' : 'Nuevo espacio'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario" onPress={() => setEditing(null)}><Icon name="close" size={22} /></Pressable></View>
          <Field label="Nombre del espacio" value={editing.name} onChange={value => updateForm('name', value)} placeholder="Ej. Sala Centro" />
          <Field label="Zona" value={editing.area} onChange={value => updateForm('area', value)} placeholder="Colonia y ciudad" />
          <Field label="Ciudad" value={editing.city} onChange={value => updateForm('city', value)} placeholder="Delicias" />
          <Field label="Dirección" value={editing.address} onChange={value => updateForm('address', value)} placeholder="Calle, número y colonia" />
          <View style={styles.rateRow}><View style={styles.rateField}><Field label="Latitud (opcional)" value={editing.latitude} onChange={value => updateForm('latitude', value)} placeholder="28.19" numeric /></View><View style={styles.rateField}><Field label="Longitud (opcional)" value={editing.longitude} onChange={value => updateForm('longitude', value)} placeholder="-105.47" numeric /></View></View>
          <Text style={styles.label}>Tipo</Text><View style={styles.chips}>{['Oficina privada', 'Sala de juntas', 'Coworking'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: editing.category === value }} onPress={() => updateForm('category', value)} style={[styles.chip, editing.category === value && styles.chipActive]}><Text style={[styles.chipText, editing.category === value && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <Field label="Capacidad" value={editing.capacity} onChange={value => updateForm('capacity', value.replace(/\D/g, ''))} placeholder="Personas" numeric />
          <Field label="Descripción" value={editing.description} onChange={value => updateForm('description', value)} placeholder="Qué hace especial a tu espacio" multiline />
          <Field label="Privacidad" value={editing.privacy} onChange={value => updateForm('privacy', value)} placeholder="Ej. Sala cerrada de uso exclusivo" multiline />
          <Text style={styles.section}>Disponibilidad habitual</Text>
          <View style={styles.chips}>{weekDays.map((day, index) => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: editing.open_days.includes(index) }} onPress={() => setEditing(current => current ? { ...current, open_days: current.open_days.includes(index) ? current.open_days.filter(value => value !== index) : [...current.open_days, index].sort() } : current)} style={[styles.chip, editing.open_days.includes(index) && styles.chipActive]}><Text style={[styles.chipText, editing.open_days.includes(index) && styles.chipTextActive]}>{day}</Text></Pressable>)}</View>
          <View style={styles.rateRow}><View style={styles.rateField}><Field label="Abre" value={editing.opens_at} onChange={value => updateForm('opens_at', value)} placeholder="08:00" /></View><View style={styles.rateField}><Field label="Cierra" value={editing.closes_at} onChange={value => updateForm('closes_at', value)} placeholder="18:00" /></View></View>
          <Text style={styles.section}>Foto principal</Text>
          {photoPreview || editing.image_url ? <Image accessibilityLabel="Foto del espacio" source={{ uri: photoPreview || editing.image_url }} style={styles.photo} /> : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={choosePhoto} style={styles.secondary}><Text style={styles.secondaryText}>Subir foto · JPG, PNG o WebP</Text></Pressable>
          <Text style={styles.small}>Primero guarda el borrador. La foto permanece privada durante la revisión.</Text>
          <Field label="O pega un enlace HTTPS" value={editing.image_url} onChange={value => updateForm('image_url', value)} placeholder="https://..." />
          <Text style={styles.section}>Tarifas en MXN</Text><View style={styles.rateRow}><View style={styles.rateField}><Field label="Hora" value={editing.hour} onChange={value => updateForm('hour', value)} placeholder="0" numeric /></View><View style={styles.rateField}><Field label="Día" value={editing.day} onChange={value => updateForm('day', value)} placeholder="0" numeric /></View><View style={styles.rateField}><Field label="Semana" value={editing.week} onChange={value => updateForm('week', value)} placeholder="0" numeric /></View></View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveDraft(false)} style={styles.action}><Text style={styles.actionText}>{busy ? 'Guardando…' : 'Guardar borrador'}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveDraft(true)} style={styles.secondary}><Text style={styles.secondaryText}>Enviar a revisión</Text></Pressable>
          <Text style={styles.small}>Operaciones revisa los datos antes de publicar. Ningún borrador acepta reservas.</Text>
        </>}
      </>}
      {tab === 'Solicitudes' && <><Text style={styles.eyebrow}>AGENDA</Text><Text style={styles.title}>Solicitudes e historial</Text>
        {bookings.length ? bookings.map(booking => <View key={booking.id} style={styles.booking}><View style={styles.line}><Text style={styles.cardTitle}>{spaceName(booking.space_id)}</Text><Text style={styles.badge}>{booking.status === 'confirmada' ? 'Autorizada' : booking.status === 'rechazada' ? 'Rechazada' : 'Pendiente'}</Text></View><Text style={styles.small}>{formatDate(booking.local_date)} · {booking.local_time.slice(0, 5)} · {booking.quantity} {booking.unit.toLowerCase()}</Text><Text style={styles.amount}>{formatMoney(booking.total_cents / 100)}</Text><Text style={styles.small}>Depósito: {booking.payment_status === 'verificado' ? 'validado' : booking.payment_status === 'reportado' ? 'en revisión' : 'pendiente'}</Text></View>) : <Empty text="Las solicitudes para tus espacios aparecerán aquí." />}
        <Text style={styles.small}>Operaciones valida los depósitos y autoriza las rentas.</Text>
      </>}
      {tab === 'Ingresos' && <><Text style={styles.eyebrow}>RESULTADOS</Text><Text style={styles.title}>Ingresos por espacio</Text><View style={styles.incomeHero}><Text style={styles.incomeLabel}>Depósitos validados · importe bruto</Text><Text style={styles.incomeValue}>{formatMoney(gross)}</Text><Text style={styles.incomeHint}>No incluye espacios de muestra ni solicitudes pendientes.</Text></View>
        {spaces.filter(space => !space.is_demo).length ? spaces.filter(space => !space.is_demo).map(space => { const count = revenue.confirmed.filter(booking => booking.space_id === space.id).length; return <View key={space.id} style={styles.booking}><View style={styles.line}><Text style={styles.cardTitle}>{space.name}</Text><Text style={styles.amount}>{formatMoney((revenue.bySpaceCents.get(space.id) ?? 0) / 100)}</Text></View><Text style={styles.small}>{count} {count === 1 ? 'renta autorizada' : 'rentas autorizadas'}</Text></View>; }) : <Empty text="Los ingresos de espacios reales aparecerán aquí cuando Operaciones valide un depósito." />}
        <Text style={styles.small}>Los importes son brutos. Comisiones, impuestos y liquidaciones aún no están configurados.</Text>
      </>}
      {tab === 'Perfil' && <><Text style={styles.eyebrow}>CUENTA</Text><Text style={styles.title}>Perfil de anfitrión</Text><View style={styles.booking}><Text style={styles.cardTitle}>{email}</Text><Text style={styles.small}>Rento espacio · perfil fijo de esta cuenta</Text></View>
        {isOperations ? <Pressable accessibilityRole="button" onPress={onOpenOperations} style={styles.secondary}><Text style={styles.secondaryText}>Abrir Operaciones</Text></Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondary}><Text style={styles.secondaryText}>Cerrar sesión</Text></Pressable>
      </>}
    </ScrollView>
    <View accessibilityRole="tablist" style={styles.nav}>{tabs.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: tab === item.label }} onPress={() => { setEditing(null); setTab(item.label); }} style={styles.navItem}><Icon name={item.icon} color={tab === item.label ? palette.action : palette.muted} size={20} /><Text style={[styles.navText, tab === item.label && styles.navActive]}>{item.label}</Text></Pressable>)}</View>
  </View>;
}

function Field({ label, value, onChange, placeholder, multiline = false, numeric = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean; numeric?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#A39497" multiline={multiline} keyboardType={numeric ? 'decimal-pad' : 'default'} style={[styles.input, multiline && styles.multiline]} /></View>;
}
function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <View style={[styles.stat, wide && styles.statWide]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function SpaceLine({ name, detail, badge }: { name: string; detail: string; badge: string }) { return <View style={styles.spaceLine}><View style={styles.spaceIcon}><Icon name="briefcase" color={palette.action} size={20} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{name}</Text><Text style={styles.small}>{detail}</Text></View><Text style={styles.badge}>{badge}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><Icon name="spark" color={palette.action} size={29} /><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream }, scroll: { flex: 1 }, content: { padding: 21, paddingBottom: 42, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 29 }, refresh: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: palette.action, fontSize: 11, fontWeight: '800', letterSpacing: 2 }, title: { color: palette.plum, fontSize: 30, lineHeight: 35, fontWeight: '900', marginTop: 7, marginBottom: 20, letterSpacing: -0.7 },
  section: { color: palette.plum, fontSize: 19, fontWeight: '800', marginTop: 26, marginBottom: 13 },
  notice: { backgroundColor: palette.blush, color: palette.plum, padding: 12, borderRadius: 12, marginBottom: 15, fontSize: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, stat: { flexGrow: 1, minWidth: 130, backgroundColor: palette.white, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: palette.line }, statWide: { flexBasis: '100%' }, statValue: { color: palette.plum, fontSize: 24, fontWeight: '900' }, statLabel: { color: palette.muted, fontSize: 11, marginTop: 5 },
  action: { backgroundColor: palette.action, borderRadius: 15, minHeight: 49, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 18, marginTop: 18 }, actionText: { color: palette.white, fontWeight: '800', fontSize: 14 },
  secondary: { borderWidth: 1, borderColor: palette.action, borderRadius: 15, minHeight: 49, alignItems: 'center', justifyContent: 'center', marginTop: 11, paddingHorizontal: 14 }, secondaryText: { color: palette.action, fontWeight: '800', fontSize: 14 },
  spaceCard: { marginBottom: 10 }, spaceLine: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 }, spaceIcon: { width: 40, height: 40, backgroundColor: palette.blush, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: palette.plum, fontSize: 14, fontWeight: '800' }, small: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, badge: { color: palette.action, backgroundColor: palette.blush, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  booking: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 17, marginBottom: 11 }, line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, amount: { color: palette.action, fontSize: 14, fontWeight: '800', marginTop: 9 },
  empty: { backgroundColor: palette.white, borderRadius: 18, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: palette.line }, emptyText: { color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  incomeHero: { backgroundColor: palette.plum, borderRadius: 21, padding: 23, marginBottom: 21 }, incomeLabel: { color: palette.blush, fontSize: 12, fontWeight: '700' }, incomeValue: { color: palette.white, fontSize: 33, fontWeight: '900', marginTop: 9 }, incomeHint: { color: palette.blush, fontSize: 11, marginTop: 8 },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, field: { marginTop: 13 }, label: { color: palette.plum, fontSize: 12, fontWeight: '800', marginBottom: 6 }, input: { borderWidth: 1, borderColor: palette.line, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: palette.white, color: palette.plum, fontSize: 14, minHeight: 45 }, multiline: { minHeight: 88, textAlignVertical: 'top' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line }, chipActive: { backgroundColor: palette.action, borderColor: palette.action }, chipText: { color: palette.plum, fontSize: 11, fontWeight: '700' }, chipTextActive: { color: palette.white }, rateRow: { flexDirection: 'row', gap: 9 }, rateField: { flex: 1 },
  photo: { width: '100%', height: 190, borderRadius: 14, backgroundColor: palette.blush, marginVertical: 12 },
  nav: { flexDirection: 'row', backgroundColor: palette.white, borderTopWidth: 1, borderColor: palette.line, paddingVertical: 9, paddingHorizontal: 5 }, navItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 3 }, navText: { color: palette.muted, fontSize: 10 }, navActive: { color: palette.action, fontWeight: '800' },
});
