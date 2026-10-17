import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { formatDate, formatMoney, nextDates } from '../data';
import { palette } from '../theme';
import { ownerTicketEstimates } from '../ownerMetrics';
import { Brand } from './Brand';
import { CoordinatePickerMap } from './CoordinatePickerMap';
import { Icon, IconName } from './Icon';
import { ProfileEditor } from './ProfileEditor';
import { NotificationSettings } from './NotificationSettings';
import { BookingConversation } from './BookingConversation';
import { HostCustomerReview } from './HostCustomerReview';

type OwnerTab = 'Inicio' | 'Espacios' | 'Solicitudes' | 'Tickets' | 'Perfil';
type OwnedSpace = { id: string; name: string; area: string; is_demo: boolean; is_published: boolean; rate_hour_cents: number };
type Closure = { space_id: string; closed_on: string };
type OwnerBooking = { id: string; space_id: string; local_date: string; local_time: string; starts_at: string; ends_at: string; completed_at: string | null; quantity: number; unit: string; total_cents: number; operations_fee_cents: number; operations_fee_vat_estimate_cents: number; owner_balance_estimate_cents: number; status: string; payment_status: string; created_at: string };
type OwnerFinancialEvent = { id: string; booking_id: string; direction: 'cobro_cliente' | 'pago_anfitrion' | 'reembolso_cliente'; amount_cents: number; event_date: string };
type Draft = { id: string; name: string; area: string; city: string; address: string; latitude: number | null; longitude: number | null; open_days: number[]; opens_at: string; closes_at: string; photo_path: string | null; photo_paths: string[]; category: string; capacity: number; description: string; privacy: string; amenities: string[]; image_url: string; rate_hour_cents: number; rate_day_cents: number; rate_week_cents: number; status: string; rejection_reason: string | null };
type DraftForm = { id?: string; name: string; area: string; city: string; address: string; latitude: string; longitude: string; open_days: number[]; opens_at: string; closes_at: string; photo_path: string | null; photo_paths: string[]; category: string; capacity: string; description: string; privacy: string; amenities: string[]; image_url: string; hour: string; day: string; week: string };

const amenityOptions = ['Internet rápido', 'Pantalla', 'Proyector', 'Pizarrón', 'Videollamadas', 'Monitor', 'Café', 'Climatización', 'Enchufes', 'Accesibilidad'];
const MAX_SPACE_PHOTOS = 10;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const blankDraft: DraftForm = { name: '', area: '', city: 'Delicias', address: '', latitude: '', longitude: '', open_days: [1, 2, 3, 4, 5], opens_at: '08:00', closes_at: '18:00', photo_path: null, photo_paths: [], category: 'Oficina privada', capacity: '1', description: '', privacy: '', amenities: [], image_url: '', hour: '', day: '', week: '' };
const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const tabs: { label: OwnerTab; icon: IconName }[] = [
  { label: 'Inicio', icon: 'home' }, { label: 'Espacios', icon: 'briefcase' }, { label: 'Solicitudes', icon: 'calendar' }, { label: 'Tickets', icon: 'ticket' }, { label: 'Perfil', icon: 'user' },
];
const toMoney = (value: string) => Math.round(Number(value) * 100);
const toCoordinate = (value: string) => value.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
const formFromDraft = (draft: Draft): DraftForm => {
  const photoPaths = draft.photo_paths?.length ? draft.photo_paths : draft.photo_path ? [draft.photo_path] : [];
  return { id: draft.id, name: draft.name, area: draft.area, city: draft.city, address: draft.address, latitude: draft.latitude == null ? '' : String(draft.latitude), longitude: draft.longitude == null ? '' : String(draft.longitude), open_days: draft.open_days, opens_at: draft.opens_at.slice(0, 5), closes_at: draft.closes_at.slice(0, 5), photo_path: photoPaths[0] ?? null, photo_paths: photoPaths, category: draft.category, capacity: String(draft.capacity), description: draft.description, privacy: draft.privacy, amenities: draft.amenities ?? [], image_url: draft.image_url, hour: String(draft.rate_hour_cents / 100), day: String(draft.rate_day_cents / 100), week: String(draft.rate_week_cents / 100) };
};

export function OwnerDashboard({ userId, email, profileName, avatarUrl, onSaveProfile, isOperations, onOpenOperations, onSignOut, onRequestNotifications, focusBookingId }: {
  userId: string; email: string; profileName: string; avatarUrl: string; onSaveProfile: (name: string, avatarUrl: string) => Promise<void>; isOperations: boolean; onOpenOperations: () => void; onSignOut: () => void; onRequestNotifications: () => Promise<boolean>; focusBookingId: string | null;
}) {
  const [tab, setTab] = useState<OwnerTab>('Inicio');
  const [spaces, setSpaces] = useState<OwnedSpace[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [financialEvents, setFinancialEvents] = useState<OwnerFinancialEvent[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const closureDates = useMemo(() => nextDates(180), []);
  const closureMonths = useMemo(() => [...new Set(closureDates.map(date => date.key.slice(0, 7)))], [closureDates]);
  const [closureMonth, setClosureMonth] = useState(() => nextDates(180)[0].key.slice(0, 7));
  const activeClosureDates = closureDates.filter(date => date.key.startsWith(closureMonth));
  const [editing, setEditing] = useState<DraftForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  const photoPathsKey = editing?.photo_paths.join('|') ?? '';

  useEffect(() => {
    let active = true;
    const paths = editing?.photo_paths ?? [];
    if (!supabase || paths.length === 0) { setPhotoPreviews([]); return; }
    const draftStorage = supabase.storage.from('oficia-space-drafts');
    Promise.all(paths.map(async path => {
      const { data } = await draftStorage.createSignedUrl(path, 3600);
      return data?.signedUrl ?? '';
    })).then(urls => { if (active) setPhotoPreviews(urls.filter(Boolean)); });
    return () => { active = false; };
  }, [editing?.id, photoPathsKey]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const [owned, draftsResult, requests] = await Promise.all([
      supabase.from('spaces').select('id,name,area,is_demo,is_published,rate_hour_cents').eq('host_id', userId),
      supabase.from('space_drafts').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('id,space_id,local_date,local_time,starts_at,ends_at,completed_at,quantity,unit,total_cents,operations_fee_cents,operations_fee_vat_estimate_cents,owner_balance_estimate_cents,status,payment_status,created_at').order('created_at', { ascending: false }),
    ]);
    if (owned.error || draftsResult.error || requests.error) throw owned.error ?? draftsResult.error ?? requests.error;
    const ownedSpaces = (owned.data ?? []) as OwnedSpace[];
    const ids = new Set(ownedSpaces.map(space => space.id));
    const closureResult = ownedSpaces.length
      ? await supabase.from('space_closures').select('space_id,closed_on').in('space_id', [...ids]).gte('closed_on', closureDates[0].key).lte('closed_on', closureDates[closureDates.length - 1].key)
      : { data: [], error: null };
    if (closureResult.error) throw closureResult.error;
    const ownBookings = ((requests.data ?? []) as OwnerBooking[]).filter(booking => ids.has(booking.space_id));
    const ledgerResult = ownBookings.length
      ? await supabase.from('booking_financial_events').select('id,booking_id,direction,amount_cents,event_date').in('booking_id', ownBookings.map(booking => booking.id)).order('event_date', { ascending: false })
      : { data: [], error: null };
    if (ledgerResult.error) throw ledgerResult.error;
    setSpaces(ownedSpaces);
    setClosures((closureResult.data ?? []) as Closure[]);
    setDrafts((draftsResult.data ?? []) as Draft[]);
    setBookings(ownBookings);
    setFinancialEvents((ledgerResult.data ?? []) as OwnerFinancialEvent[]);
    setLoadError(false);
  }, [userId, closureDates]);
  useEffect(() => {
    let active = true;
    refresh().catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [refresh]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const channel = supabase.channel(`oficia-owner-bookings-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (active) void refresh().catch(() => setLoadError(true));
      }).subscribe();
    return () => { active = false; void supabase?.removeChannel(channel); };
  }, [refresh, userId]);

  const estimates = useMemo(() => ownerTicketEstimates(bookings, spaces), [bookings, spaces]);
  const gross = estimates.grossCents / 100;
  const waiting = bookings.filter(booking => ['pendiente', 'aceptada_anfitrion'].includes(booking.status)).length;
  const editableDrafts = drafts.filter(draft => draft.status !== 'aprobado');
  const spaceName = (id: string) => spaces.find(space => space.id === id)?.name ?? 'Espacio';
  const updateForm = (key: keyof DraftForm, value: string) => setEditing(current => current ? { ...current, [key]: value } : current);
  const toggleAmenity = (value: string) => setEditing(current => current ? { ...current, amenities: current.amenities.includes(value) ? current.amenities.filter(item => item !== value) : [...current.amenities, value] } : current);
  const openDraft = (draft: Draft) => {
    setPhotoPreviews([]);
    setEditing(formFromDraft(draft));
  };
  const toggleClosure = async (spaceId: string, date: string, isClosed: boolean) => {
    if (!supabase || busy) return;
    setBusy(true); setNotice('');
    const result = isClosed
      ? await supabase.from('space_closures').delete().eq('space_id', spaceId).eq('closed_on', date)
      : await supabase.from('space_closures').insert({ space_id: spaceId, closed_on: date });
    if (result.error) setNotice(result.error.message.includes('renta autorizada') ? 'Ya hay una renta autorizada ese día.' : 'No se pudo actualizar la fecha.');
    else {
      setNotice(isClosed ? 'Fecha disponible de nuevo.' : 'Fecha bloqueada.');
      await refresh().catch(() => setNotice('Fecha guardada. Actualiza el panel para verla.'));
    }
    setBusy(false);
  };
  const updateBooking = async (booking: OwnerBooking) => {
    if (!supabase || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.from('bookings').update({ completed_at: new Date().toISOString() }).eq('id', booking.id);
    if (error) setNotice('No se pudo marcar como realizada. Actualiza la solicitud e inténtalo de nuevo.');
    else {
      setNotice('Renta finalizada. El cliente ya puede dejar su opinión.');
      await refresh().catch(() => setNotice('La solicitud se guardó. Actualiza el panel para ver el cambio.'));
    }
    setBusy(false);
  };
  const acceptBooking = async (booking: OwnerBooking) => {
    if (!supabase || busy) return;
    setBusy(true); setNotice('');
    const { data, error } = await supabase.from('bookings').update({ status: 'aceptada_anfitrion', rejection_reason: null })
      .eq('id', booking.id).eq('status', 'pendiente').select('id').maybeSingle();
    if (error) {
      const message = error.message.toLowerCase();
      setNotice(message.includes('muestra') ? 'Las solicitudes de muestra no se pueden aceptar.' : message.includes('ya fue revisada') ? 'Esta solicitud ya fue atendida. Actualiza la lista.' : 'No se pudo aceptar la solicitud. Actualiza la lista e inténtalo de nuevo.');
    } else if (!data) {
      setNotice('La solicitud ya cambió de estado. Actualiza la lista.');
    } else {
      setNotice('Solicitud aceptada. Operaciones revisará el movimiento antes de autorizar la renta.');
      await refresh().catch(() => setNotice('Solicitud aceptada. Actualiza el panel para ver el seguimiento.'));
    }
    setBusy(false);
  };
  const choosePhoto = () => {
    if (!editing || !supabase || busy) return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (!files.length || !supabase || !editing) return;
      const existingPaths = editing.photo_paths.length ? editing.photo_paths : editing.photo_path ? [editing.photo_path] : [];
      if (existingPaths.length + files.length > MAX_SPACE_PHOTOS) { setNotice(`Puedes agregar hasta ${MAX_SPACE_PHOTOS} fotos por espacio.`); return; }
      const invalidFile = files.find(file => !allowedPhotoTypes.includes(file.type) || file.size > MAX_PHOTO_BYTES);
      if (invalidFile) { setNotice('Cada foto debe ser JPG, PNG o WebP y pesar hasta 5 MB.'); return; }
      const draftId = editing.id;
      setBusy(true); setNotice('');
      setPhotoUploadProgress({ completed: 0, total: files.length });
      const uploadedPaths: string[] = [];
      let linkedToDraft = false;
      try {
        let savedDraftId = draftId;
        if (!savedDraftId) {
          const created = await supabase.from('space_drafts').insert({ owner_id: userId }).select('id').single();
          if (created.error) throw created.error;
          savedDraftId = created.data.id;
          const createdDraftId = created.data.id;
          setEditing(current => current && !current.id ? { ...current, id: createdDraftId } : current);
        }
        const resolvedDraftId = savedDraftId;
        if (!resolvedDraftId) throw new Error('No se pudo crear el borrador');
        for (const [index, file] of files.entries()) {
          const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
          const path = `${userId}/${resolvedDraftId}/${crypto.randomUUID()}.${ext}`;
          const upload = await supabase.storage.from('oficia-space-drafts').upload(path, file, { contentType: file.type, upsert: false });
          if (upload.error) throw upload.error;
          uploadedPaths.push(path);
          setPhotoUploadProgress({ completed: index + 1, total: files.length });
        }
        const nextPaths = [...existingPaths, ...uploadedPaths];
        const saved = await supabase.from('space_drafts').update({ photo_paths: nextPaths, photo_path: nextPaths[0] ?? null, image_url: '' }).eq('id', resolvedDraftId).eq('owner_id', userId).select('id').single();
        if (saved.error) throw saved.error;
        linkedToDraft = true;
        setEditing(current => current && current.id === resolvedDraftId ? { ...current, photo_paths: nextPaths, photo_path: nextPaths[0] ?? null, image_url: '' } : current);
        setNotice(`${files.length} ${files.length === 1 ? 'foto guardada' : 'fotos guardadas'} en privado.`);
        await refresh().catch(() => {});
      } catch {
        if (uploadedPaths.length && !linkedToDraft) await supabase.storage.from('oficia-space-drafts').remove(uploadedPaths).catch(() => {});
        setNotice('No se pudieron guardar todas las fotos. Inténtalo de nuevo.');
      } finally { setBusy(false); setPhotoUploadProgress(null); }
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
    if (submit && (latitude === null || longitude === null || editing.name.trim().length < 3 || editing.area.trim().length < 3 || editing.address.trim().length < 8 || editing.city.trim().length < 3 || editing.description.trim().length < 20 || editing.privacy.trim().length < 10 || cents.some(value => value <= 0) || !editing.amenities.includes('Internet rápido') || (!editing.photo_paths.length && !editing.photo_path && !/^https:\/\/\S+$/i.test(editing.image_url.trim())))) {
      setNotice('Completa la ubicación, dirección, descripción, privacidad, tarifas, internet y foto.'); return;
    }
    setBusy(true); setNotice('');
    const fields = { name: editing.name.trim(), area: editing.area.trim(), city: editing.city.trim(), address: editing.address.trim(), latitude, longitude, open_days: editing.open_days, opens_at: editing.opens_at, closes_at: editing.closes_at, category: editing.category, capacity,
      description: editing.description.trim(), privacy: editing.privacy.trim(), amenities: editing.amenities, image_url: editing.photo_paths.length ? '' : editing.image_url.trim(),
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
  const previewPhotos = editing?.photo_paths.length ? photoPreviews : editing?.image_url ? [editing.image_url] : [];
  const selectedPhotoCount = editing?.photo_paths.length ?? 0;

  return <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}><Brand compact /><Pressable accessibilityRole="button" accessibilityLabel="Actualizar panel" onPress={() => { void refresh().catch(() => setLoadError(true)); }} style={styles.refresh}><Icon name="refresh" size={19} color={palette.action} /></Pressable></View>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      {loadError && tab !== 'Perfil' ? <View><Empty text="No pudimos cargar tus espacios." /><Pressable accessibilityRole="button" onPress={() => { void refresh().catch(() => setLoadError(true)); }} style={styles.secondary}><Text style={styles.secondaryText}>Reintentar</Text></Pressable></View> : null}
      {tab === 'Inicio' && !loadError && <>
        <Text style={styles.eyebrow}>TU ACTIVIDAD</Text><Text style={styles.title}>Hola, {profileName.split(' ')[0]}.</Text><Text style={styles.small}>Tu espacio también trabaja para ti.</Text>
        <View style={styles.stats}><Stat label="Solicitudes" value={String(waiting)} /><Stat label="Espacios" value={String(spaces.filter(space => !space.is_demo).length + editableDrafts.length)} /><Stat label="Tickets estimados" value={formatMoney(gross)} wide /></View>
        <Text style={styles.section}>Mis espacios</Text>
        {spaces.filter(space => !space.is_demo).length || editableDrafts.length ? <>{spaces.filter(space => !space.is_demo).map(space => <SpaceLine key={space.id} name={space.name} detail={space.area} badge={space.is_published ? 'Publicado' : 'Pausado'} />)}{editableDrafts.slice(0, 3).map(draft => <SpaceLine key={draft.id} name={draft.name || 'Espacio sin nombre'} detail={draft.area || 'Completa la zona'} badge={draft.status === 'en_revision' ? 'En revisión' : draft.status === 'rechazado' ? 'Con observaciones' : 'Borrador'} />)}</> : <Empty text="Agrega tu primer espacio para comenzar." />}
        <Pressable accessibilityRole="button" onPress={() => { setTab('Espacios'); setPhotoPreviews([]); setEditing({ ...blankDraft }); }} style={styles.action}><Icon name="plus" color={palette.white} size={18} /><Text style={styles.actionText}>Agregar espacio</Text></Pressable>
      </>}
      {tab === 'Espacios' && !loadError && <>
        <Text style={styles.eyebrow}>CATÁLOGO</Text><Text style={styles.title}>Mis espacios</Text>
        {!editing ? <><Pressable accessibilityRole="button" onPress={() => { setPhotoPreviews([]); setEditing({ ...blankDraft }); }} style={styles.action}><Icon name="plus" color={palette.white} size={18} /><Text style={styles.actionText}>Nuevo espacio</Text></Pressable>
          {editableDrafts.map(draft => <Pressable key={draft.id} accessibilityRole="button" onPress={() => { if (draft.status === 'borrador' || draft.status === 'rechazado') openDraft(draft); }} style={styles.spaceCard}><SpaceLine name={draft.name || 'Espacio sin nombre'} detail={draft.area || 'Completa la zona'} badge={draft.status === 'en_revision' ? 'En revisión' : draft.status === 'rechazado' ? 'Con observaciones' : 'Borrador'} />{draft.rejection_reason ? <Text style={styles.small}>{draft.rejection_reason}</Text> : null}</Pressable>)}
          {spaces.map(space => <View key={space.id}><SpaceLine name={space.name} detail={space.area} badge={space.is_demo ? 'Muestra · sin ingresos' : space.is_published ? 'Publicado' : 'Pausado'} />{!space.is_demo ? <><Text style={styles.label}>Cerrar fechas · 180 días</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>{closureMonths.map(month => <Pressable key={month} accessibilityRole="button" accessibilityState={{ selected: closureMonth === month }} onPress={() => setClosureMonth(month)} style={[styles.monthPill, closureMonth === month && styles.monthPillActive]}><Text style={[styles.monthPillText, closureMonth === month && styles.monthPillTextActive]}>{new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`))}</Text></Pressable>)}</ScrollView><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>{activeClosureDates.map(date => { const closed = closures.some(item => item.space_id === space.id && item.closed_on === date.key); return <Pressable key={date.key} accessibilityRole="button" accessibilityLabel={`${date.label}: ${closed ? 'cerrado; liberar' : 'disponible; cerrar'}`} disabled={busy} onPress={() => toggleClosure(space.id, date.key, closed)} style={[styles.datePill, closed && styles.datePillClosed]}><Text style={[styles.datePillText, closed && styles.datePillTextClosed]}>{date.day} {date.number}</Text><Text style={[styles.datePillSub, closed && styles.datePillTextClosed]}>{closed ? 'Cerrado' : 'Disponible'}</Text></Pressable>; })}</ScrollView></> : null}</View>)}
          {!drafts.length && !spaces.length ? <Empty text="Aún no has agregado espacios." /> : null}</> : <>
          <View style={styles.formHead}><Text style={styles.section}>{editing.id ? 'Editar borrador' : 'Nuevo espacio'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario" disabled={busy} onPress={() => setEditing(null)}><Icon name="close" size={22} /></Pressable></View>
          <Field label="Nombre del espacio" value={editing.name} onChange={value => updateForm('name', value)} placeholder="Ej. Sala Centro" />
          <Field label="Zona" value={editing.area} onChange={value => updateForm('area', value)} placeholder="Colonia y ciudad" />
          <Field label="Ciudad" value={editing.city} onChange={value => updateForm('city', value)} placeholder="Delicias" />
          <Field label="Dirección" value={editing.address} onChange={value => updateForm('address', value)} placeholder="Calle, número y colonia" />
          <View style={styles.rateRow}><View style={styles.rateField}><Field label="Latitud" value={editing.latitude} onChange={value => updateForm('latitude', value)} placeholder="28.19" numeric /></View><View style={styles.rateField}><Field label="Longitud" value={editing.longitude} onChange={value => updateForm('longitude', value)} placeholder="-105.47" numeric /></View></View>
          <Text style={styles.label}>Ubicación exacta · obligatoria</Text>
          <CoordinatePickerMap latitude={toCoordinate(editing.latitude)} longitude={toCoordinate(editing.longitude)} onChange={coordinate => setEditing(current => current ? { ...current, latitude: coordinate.latitude.toFixed(6), longitude: coordinate.longitude.toFixed(6) } : current)} />
          <Text style={styles.small}>{editing.latitude && editing.longitude ? `${editing.latitude}, ${editing.longitude}` : 'Arrastra el pin o toca el mapa para marcar el lugar.'} El punto exacto se mostrará a clientes al publicar. La dirección completa solo la ve Operaciones.</Text>
          <Text style={styles.label}>Tipo</Text><View style={styles.chips}>{['Oficina privada', 'Sala de juntas', 'Coworking'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: editing.category === value }} onPress={() => updateForm('category', value)} style={[styles.chip, editing.category === value && styles.chipActive]}><Text style={[styles.chipText, editing.category === value && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <Field label="Capacidad" value={editing.capacity} onChange={value => updateForm('capacity', value.replace(/\D/g, ''))} placeholder="Personas" numeric />
          <Field label="Descripción" value={editing.description} onChange={value => updateForm('description', value)} placeholder="Qué hace especial a tu espacio" multiline />
          <Field label="Privacidad" value={editing.privacy} onChange={value => updateForm('privacy', value)} placeholder="Ej. Sala cerrada de uso exclusivo" multiline />
          <Text style={styles.section}>Servicios incluidos</Text>
          <View style={styles.chips}>{amenityOptions.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: editing.amenities.includes(value) }} onPress={() => toggleAmenity(value)} style={[styles.chip, editing.amenities.includes(value) && styles.chipActive]}><Text style={[styles.chipText, editing.amenities.includes(value) && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
          <Text style={styles.section}>Disponibilidad habitual</Text>
          <View style={styles.chips}>{weekDays.map((day, index) => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: editing.open_days.includes(index) }} onPress={() => setEditing(current => current ? { ...current, open_days: current.open_days.includes(index) ? current.open_days.filter(value => value !== index) : [...current.open_days, index].sort() } : current)} style={[styles.chip, editing.open_days.includes(index) && styles.chipActive]}><Text style={[styles.chipText, editing.open_days.includes(index) && styles.chipTextActive]}>{day}</Text></Pressable>)}</View>
          <View style={styles.rateRow}><View style={styles.rateField}><Field label="Abre" value={editing.opens_at} onChange={value => updateForm('opens_at', value)} placeholder="08:00" /></View><View style={styles.rateField}><Field label="Cierra" value={editing.closes_at} onChange={value => updateForm('closes_at', value)} placeholder="18:00" /></View></View>
          <Text style={styles.section}>Fotos del espacio · hasta {MAX_SPACE_PHOTOS}</Text>
          {previewPhotos.length ? <View style={styles.photoGallery}>{previewPhotos.map((uri, index) => <Image key={`${uri}-${index}`} accessibilityLabel={`Foto ${index + 1} del espacio`} source={{ uri }} style={styles.photoThumb} />)}</View> : null}
          <Pressable accessibilityRole="button" disabled={busy || selectedPhotoCount >= MAX_SPACE_PHOTOS} onPress={choosePhoto} style={styles.secondary}><Text style={styles.secondaryText}>{photoUploadProgress ? `Subiendo ${photoUploadProgress.completed} de ${photoUploadProgress.total}…` : selectedPhotoCount >= MAX_SPACE_PHOTOS ? 'Máximo de fotos alcanzado' : selectedPhotoCount ? 'Agregar más fotos' : 'Seleccionar varias fotos'}</Text></Pressable>
          <Text style={styles.small}>{selectedPhotoCount} de {MAX_SPACE_PHOTOS} · JPG, PNG o WebP · hasta 5 MB cada una. Puedes elegir varias juntas; se guardan en privado durante la revisión.</Text>
          {!selectedPhotoCount ? <Field label="O pega el enlace de una foto" value={editing.image_url} onChange={value => updateForm('image_url', value)} placeholder="https://..." /> : null}
          <Text style={styles.section}>Tarifas en MXN</Text><View style={styles.rateRow}><View style={styles.rateField}><Field label="Hora" value={editing.hour} onChange={value => updateForm('hour', value)} placeholder="0" numeric /></View><View style={styles.rateField}><Field label="Día" value={editing.day} onChange={value => updateForm('day', value)} placeholder="0" numeric /></View><View style={styles.rateField}><Field label="Semana" value={editing.week} onChange={value => updateForm('week', value)} placeholder="0" numeric /></View></View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveDraft(false)} style={styles.action}><Text style={styles.actionText}>{busy ? 'Guardando…' : 'Guardar borrador'}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => saveDraft(true)} style={styles.secondary}><Text style={styles.secondaryText}>Enviar a revisión</Text></Pressable>
          <Text style={styles.small}>Operaciones revisa los datos antes de publicar. Ningún borrador acepta reservas.</Text>
        </>}
      </>}
      {tab === 'Solicitudes' && !loadError && <><Text style={styles.eyebrow}>AGENDA</Text><Text style={styles.title}>Solicitudes e historial</Text>
        {bookings.length ? bookings.map(booking => {
          const space = spaces.find(item => item.id === booking.space_id);
          const sample = space?.is_demo ?? true;
          const canComplete = booking.status === 'confirmada' && !booking.completed_at && new Date(booking.ends_at).getTime() <= Date.now();
          const statusLabel = booking.completed_at ? 'Realizada' : booking.status === 'confirmada' ? 'Autorizada' : booking.status === 'aceptada_anfitrion' ? 'Aceptada · revisión de Oficia' : booking.status === 'rechazada' ? 'Rechazada' : 'Nueva solicitud';
          return <View key={booking.id} style={styles.booking}>
            <View style={styles.line}><Text style={styles.cardTitle}>{spaceName(booking.space_id)}</Text><Text style={styles.badge}>{statusLabel}</Text></View>
            <Text style={styles.small}>{formatDate(booking.local_date)} · {booking.local_time.slice(0, 5)} · {booking.quantity} {booking.unit.toLowerCase()}</Text>
            <Text style={styles.amount}>{formatMoney(booking.total_cents / 100)}</Text><Text style={styles.small}>{booking.status === 'confirmada' ? 'Ticket autorizado · movimiento externo validado' : 'Solicitud · todavía no es un ticket autorizado'}</Text>
            {financialEvents.filter(event => event.booking_id === booking.id).map(event => <Text key={event.id} style={styles.reviewHint}>{ownerMovementLabel(event.direction)} · {formatMoney(event.amount_cents / 100)} · {formatDate(event.event_date)}</Text>)}
            {!sample && booking.status === 'pendiente' ? <><Text style={styles.reviewHint}>Al aceptar, Operaciones registrará y validará el movimiento externo antes de activar el ticket.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void acceptBooking(booking)} style={styles.action}><Text style={styles.actionText}>{busy ? 'Guardando…' : 'Aceptar solicitud'}</Text></Pressable></> : null}
            {!sample && booking.status === 'aceptada_anfitrion' ? <Text style={styles.reviewHint}>Aceptada por ti · pendiente de validación y autorización de Operaciones.</Text> : null}
            {!sample && canComplete ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void updateBooking(booking)} style={styles.action}><Text style={styles.actionText}>{busy ? 'Guardando…' : 'Marcar como realizada'}</Text></Pressable> : null}
            {!sample && booking.status === 'confirmada' ? <BookingConversation bookingId={booking.id} userId={userId} ownerMode focus={focusBookingId === booking.id} /> : null}
            {!sample && booking.completed_at ? <HostCustomerReview bookingId={booking.id} /> : null}
          </View>;
        }) : <Empty text="Las solicitudes para tus espacios aparecerán aquí." />}
        <Text style={styles.small}>Los tickets y sus estimados aparecen después de que Operaciones autoriza la renta. No se procesa dinero en Oficia.</Text>
      </>}
      {tab === 'Tickets' && !loadError && <><Text style={styles.eyebrow}>DESGLOSE</Text><Text style={styles.title}>Tickets autorizados</Text><View style={styles.incomeHero}><Text style={styles.incomeLabel}>Rentas autorizadas por Operaciones</Text><Text style={styles.incomeValue}>{formatMoney(gross)}</Text><Text style={styles.incomeHint}>Referencia informativa; no representa ingresos cobrados.</Text></View>
        {spaces.filter(space => !space.is_demo).length ? spaces.filter(space => !space.is_demo).map(space => { const spaceBookings = estimates.active.filter(booking => booking.space_id === space.id); const count = spaceBookings.length; return <View key={space.id}><View style={styles.booking}><View style={styles.line}><Text style={styles.cardTitle}>{space.name}</Text><Text style={styles.amount}>{formatMoney((estimates.bySpaceCents.get(space.id) ?? 0) / 100)}</Text></View><Text style={styles.small}>{count} {count === 1 ? 'ticket estimado' : 'tickets estimados'}</Text></View>{spaceBookings.map(booking => <View key={booking.id} style={styles.statement}><View style={styles.line}><Text style={styles.cardTitle}>Desglose · {formatDate(booking.local_date)}</Text><Text style={styles.badge}>{booking.id}</Text></View><StatementLine label="Renta base" value={formatMoney(booking.total_cents / 100)} /><StatementLine label="Tarifa Oficia estimada · 15%" value={`− ${formatMoney(booking.operations_fee_cents / 100)}`} /><StatementLine label="IVA estimado sobre la comisión · 16%" value={`− ${formatMoney(booking.operations_fee_vat_estimate_cents / 100)}`} /><View style={styles.statementTotal}><Text style={styles.cardTitle}>Referencia del dueño antes de sus impuestos</Text><Text style={styles.amount}>{formatMoney(booking.owner_balance_estimate_cents / 100)}</Text></View>{financialEvents.filter(event => event.booking_id === booking.id).map(event => <StatementLine key={event.id} label={ownerMovementLabel(event.direction)} value={formatMoney(event.amount_cents / 100)} />)}</View>)}</View>; }) : <Empty text="Los tickets de espacios reales aparecerán aquí cuando lleguen solicitudes." />}
        <View style={styles.fiscalNotice}><Text style={styles.cardTitle}>Cotización informativa · sin pago</Text><Text style={styles.small}>La comisión de Oficia se calcula al 15% sobre la renta base, sin sumar impuestos de la renta. El IVA sobre la comisión es una referencia estimada. Los impuestos de la renta y retenciones del anfitrión no están calculados. Oficia no cobra, retiene ni concilia dinero; estos importes no acreditan un pago.</Text></View>
      </>}
      {tab === 'Perfil' && <><Text style={styles.eyebrow}>CUENTA</Text><Text style={styles.title}>Perfil de anfitrión</Text><ProfileEditor name={profileName} avatarUrl={avatarUrl} email={email} accountLabel="Rento espacio · perfil fijo" onSave={onSaveProfile} /><NotificationSettings userId={userId} accountType="anfitrion" requestPermission={onRequestNotifications} />
        {isOperations ? <Pressable accessibilityRole="button" accessibilityLabel="Cambiar a Administración" onPress={onOpenOperations} style={styles.secondary}><Text style={styles.secondaryText}>Cambiar a Administración</Text></Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.secondary}><Text style={styles.secondaryText}>Cerrar sesión</Text></Pressable>
      </>}
    </ScrollView>
    <View accessibilityRole="tablist" style={styles.nav}>{tabs.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: tab === item.label }} disabled={busy} onPress={() => { setEditing(null); setTab(item.label); }} style={styles.navItem}><Icon name={item.icon} color={tab === item.label ? palette.action : palette.muted} size={20} /><Text style={[styles.navText, tab === item.label && styles.navActive]}>{item.label}</Text></Pressable>)}</View>
  </View>;
}

function Field({ label, value, onChange, placeholder, multiline = false, numeric = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean; numeric?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#A39497" multiline={multiline} keyboardType={numeric ? 'decimal-pad' : 'default'} style={[styles.input, multiline && styles.multiline]} /></View>;
}
function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <View style={[styles.stat, wide && styles.statWide]}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function SpaceLine({ name, detail, badge }: { name: string; detail: string; badge: string }) { return <View style={styles.spaceLine}><View style={styles.spaceIcon}><Icon name="briefcase" color={palette.action} size={20} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{name}</Text><Text style={styles.small}>{detail}</Text></View><Text style={styles.badge}>{badge}</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={styles.empty}><Icon name="spark" color={palette.action} size={29} /><Text style={styles.emptyText}>{text}</Text></View>; }
function StatementLine({ label, value }: { label: string; value: string }) { return <View style={styles.statementLine}><Text style={styles.statementLabel}>{label}</Text><Text style={styles.statementValue}>{value}</Text></View>; }
function ownerMovementLabel(direction: OwnerFinancialEvent['direction']) { return direction === 'cobro_cliente' ? 'Cobro externo registrado' : direction === 'pago_anfitrion' ? 'Pago externo recibido' : 'Reembolso externo registrado'; }

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
  bookingActions: { gap: 4 }, reviewHint: { color: palette.action, fontSize: 11, fontWeight: '700', marginTop: 13 },
  empty: { backgroundColor: palette.white, borderRadius: 18, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: palette.line }, emptyText: { color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  incomeHero: { backgroundColor: palette.plum, borderRadius: 21, padding: 23, marginBottom: 21 }, incomeLabel: { color: palette.blush, fontSize: 12, fontWeight: '700' }, incomeValue: { color: palette.white, fontSize: 33, fontWeight: '900', marginTop: 9 }, incomeHint: { color: palette.blush, fontSize: 11, marginTop: 8 },
  statement: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 16, marginBottom: 11, marginLeft: 12 }, statementLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingTop: 10 }, statementLabel: { flex: 1, color: palette.muted, fontSize: 11 }, statementValue: { color: palette.plum, fontSize: 11, fontWeight: '700' }, statementTotal: { borderTopWidth: 1, borderColor: palette.line, marginTop: 12, paddingTop: 12, gap: 4 }, fiscalNotice: { backgroundColor: palette.blush, borderRadius: 15, padding: 15, marginTop: 7 },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, field: { marginTop: 13 }, label: { color: palette.plum, fontSize: 12, fontWeight: '800', marginBottom: 6 }, input: { borderWidth: 1, borderColor: palette.line, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: palette.white, color: palette.plum, fontSize: 14, minHeight: 45 }, multiline: { minHeight: 88, textAlignVertical: 'top' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line }, chipActive: { backgroundColor: palette.action, borderColor: palette.action }, chipText: { color: palette.plum, fontSize: 11, fontWeight: '700' }, chipTextActive: { color: palette.white }, rateRow: { flexDirection: 'row', gap: 9 }, rateField: { flex: 1 },
  photoGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, photoThumb: { width: 92, height: 78, borderRadius: 12, backgroundColor: palette.blush },
  monthStrip: { gap: 7, paddingBottom: 7 }, monthPill: { borderRadius: 11, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line }, monthPillActive: { backgroundColor: palette.action, borderColor: palette.action }, monthPillText: { color: palette.action, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }, monthPillTextActive: { color: palette.white }, dateStrip: { gap: 8, paddingBottom: 16 }, datePill: { minWidth: 76, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center' }, datePillClosed: { backgroundColor: palette.action, borderColor: palette.action }, datePillText: { color: palette.plum, fontSize: 12, fontWeight: '800' }, datePillSub: { color: palette.muted, fontSize: 10, marginTop: 2 }, datePillTextClosed: { color: palette.white },
  nav: { flexDirection: 'row', backgroundColor: palette.white, borderTopWidth: 1, borderColor: palette.line, paddingVertical: 9, paddingHorizontal: 5 }, navItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 3 }, navText: { color: palette.muted, fontSize: 10 }, navActive: { color: palette.action, fontWeight: '800' },
});
