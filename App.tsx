import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { AsyncStorage } from './src/storage';
import { Session, User } from '@supabase/supabase-js';
import { SafeAreaProvider, SafeAreaView } from './src/components/SafeArea';
import { Brand, Mark } from './src/components/Brand';
import { Icon, IconName } from './src/components/Icon';
import { PrimaryButton, SpaceCard, SpacePhoto } from './src/components/UI';
import { Booking, Category, Space, Tab, TransferSettings, Unit, categories, estimatedEnd, formatDate, formatMoney, isFutureSlot, nextDates, spaces } from './src/data';
import { palette } from './src/theme';
import { backendConfigured, BookingRow, mapBooking, mapSpace, SpaceRow, supabase } from './src/backend';
import { signInWithGoogle, signOutFromGoogle } from './src/googleAuth';
import { AuthVideoBackground } from './src/components/AuthVideoBackground';
import { confirmInBrowser, showMessage } from './src/dialogs';
import { OpenStreetMap } from './src/components/OpenStreetMap';
import { myBookings as selectMyBookings } from './src/visibility';

type Screen = 'welcome' | 'tabs' | 'detail' | 'booking' | 'receipt' | 'host' | 'operations' | 'auth';
type DetailSection = 'Acerca de' | 'Galería' | 'Opiniones';
type SortMode = 'recommended' | 'price' | 'capacity';
const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'];
function isValidClabe(value: string) {
  if (!/^\d{18}$/.test(value)) return false;
  const weights = [3, 7, 1];
  const sum = [...value.slice(0, 17)].reduce((total, digit, index) => total + (Number(digit) * weights[index % 3]) % 10, 0);
  return Number(value[17]) === (10 - (sum % 10)) % 10;
}
const tabItems: { label: Tab; icon: IconName }[] = [
  { label: 'Inicio', icon: 'home' }, { label: 'Explorar', icon: 'explore' }, { label: 'Favoritos', icon: 'heart' }, { label: 'Reservas', icon: 'calendar' }, { label: 'Perfil', icon: 'user' },
];

function AppContent() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [tab, setTab] = useState<Tab>('Inicio');
  const [category, setCategory] = useState<Category>('Todos');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOwner, setFavoritesOwner] = useState<string | null>(null);
  const [selected, setSelected] = useState<Space | null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [detailSection, setDetailSection] = useState<DetailSection>('Acerca de');
  const [unit, setUnit] = useState<Unit>('Hora');
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => nextDates()[0].key);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [catalog, setCatalog] = useState(spaces);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!backendConfigured);
  const [hostSpaceIds, setHostSpaceIds] = useState<string[]>([]);
  const [isOperations, setIsOperations] = useState(false);
  const [transferSettings, setTransferSettings] = useState<TransferSettings>({ bankName: '', clabe: '', beneficiary: '', instructions: 'Incluye la referencia Oficia en el concepto de la transferencia.' });
  const [bankDraft, setBankDraft] = useState<TransferSettings>({ bankName: '', clabe: '', beneficiary: '', instructions: 'Incluye la referencia Oficia en el concepto de la transferencia.' });
  const [payerReferenceDraft, setPayerReferenceDraft] = useState('');
  const [operationsBusy, setOperationsBusy] = useState(false);
  const [operationsNotice, setOperationsNotice] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'entrar' | 'crear'>('entrar');
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [pendingBooking, setPendingBooking] = useState(false);
  const [dataNotice, setDataNotice] = useState('');
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [capacityFilter, setCapacityFilter] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [dates, setDates] = useState(() => nextDates(14));
  const filtered = useMemo(() => {
    const matches = catalog.filter(space =>
      (category === 'Todos' || space.category === category) &&
      space.capacity >= capacityFilter &&
      amenityFilter.every(amenity => space.amenities.includes(amenity)) &&
      `${space.name} ${space.area} ${space.category} ${space.amenities.join(' ')}`.toLocaleLowerCase('es-MX').includes(search.trim().toLocaleLowerCase('es-MX')),
    );
    if (sortMode === 'price') return matches.sort((a, b) => a.rate.Hora - b.rate.Hora);
    if (sortMode === 'capacity') return matches.sort((a, b) => b.capacity - a.capacity);
    return matches;
  }, [catalog, category, search, capacityFilter, amenityFilter, sortMode]);
  const refreshRemoteData = async (userId: string) => {
    if (!supabase) return;
    const [hostResult, bookingResult, operatorResult, transferResult] = await Promise.all([
      supabase.from('spaces').select('id').eq('host_id', userId),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.rpc('is_oficia_operations'),
      supabase.from('transfer_settings').select('bank_name, clabe, beneficiary, instructions').eq('id', 1).maybeSingle(),
    ]);
    if (hostResult.error) throw hostResult.error;
    if (bookingResult.error) throw bookingResult.error;
    if (operatorResult.error) throw operatorResult.error;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user.id !== userId) return;
    const ownHostIds = (hostResult.data ?? []).map(row => row.id as string);
    const operator = operatorResult.data === true;
    const visibleBookings = operator ? (bookingResult.data ?? []) : (bookingResult.data ?? []).filter((row: { client_id: string; space_id: string }) => row.client_id === userId || ownHostIds.includes(row.space_id));
    setHostSpaceIds(ownHostIds);
    setIsOperations(operator);
    if (!transferResult.error && transferResult.data) {
      const settings = { bankName: transferResult.data.bank_name ?? '', clabe: transferResult.data.clabe ?? '', beneficiary: transferResult.data.beneficiary ?? '', instructions: transferResult.data.instructions ?? '' };
      setTransferSettings(settings);
      setBankDraft(settings);
    }
    setBookings(visibleBookings.map(row => mapBooking(row as BookingRow)));
  };
  useEffect(() => {
    let active = true;
    Promise.all([backendConfigured ? Promise.resolve(null) : AsyncStorage.getItem('oficia:favorites'), AsyncStorage.getItem('oficia:bookings'), AsyncStorage.getItem('oficia:welcome')])
      .then(([savedFavorites, savedBookings, seenWelcome]) => {
        if (!active) return;
        if (savedFavorites) { const parsed: unknown = JSON.parse(savedFavorites); if (Array.isArray(parsed)) setFavorites(parsed.filter((item): item is string => typeof item === 'string')); }
        if (!backendConfigured && savedBookings) { const parsed: unknown = JSON.parse(savedBookings); if (Array.isArray(parsed)) setBookings(parsed.filter((item): item is Booking => typeof item === 'object' && item !== null && 'spaceId' in item && 'id' in item)); }
        if (!backendConfigured && seenWelcome === 'yes') setScreen('tabs');
      }).catch(() => {}).finally(() => { if (active) setHydrated(true); });
    if (supabase) {
      Promise.resolve(supabase.from('spaces').select('*').eq('is_published', true).order('created_at', { ascending: true }))
        .then(({ data, error }) => {
          if (!active) return;
          if (error) throw error;
          if (data?.length) setCatalog((data as SpaceRow[]).map(mapSpace));
        }).catch(() => { if (active) setDataNotice('Mostrando espacios de demostración mientras se restablece la conexión.'); });
      supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        setAuthReady(true);
        const session = error ? null : data.session;
        setUser(session?.user ?? null);
        setScreen(session ? 'tabs' : 'auth');
        if (error) setAuthNotice('No pudimos validar tu sesión. Inicia sesión para continuar.');
        if (session) refreshRemoteData(session.user.id).catch(() => setDataNotice('No se pudieron actualizar tus solicitudes. Desliza para volver a intentarlo.'));
      }).catch(() => { if (active) { setAuthReady(true); setScreen('auth'); setAuthNotice('No pudimos validar tu sesión. Inicia sesión para continuar.'); } });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
        setUser(session?.user ?? null);
        if (session) {
          refreshRemoteData(session.user.id).catch(() => setDataNotice('No se pudieron actualizar tus solicitudes.'));
        } else {
          setBookings([]); setHostSpaceIds([]); setIsOperations(false); setLatestBooking(null);
          setTransferSettings({ bankName: '', clabe: '', beneficiary: '', instructions: '' });
          setBankDraft({ bankName: '', clabe: '', beneficiary: '', instructions: '' });
          if (backendConfigured && _event === 'SIGNED_OUT') { setPendingBooking(false); setScreen('auth'); }
        }
      });
      return () => { active = false; subscription.unsubscribe(); };
    }
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!backendConfigured || !authReady) return;
    const owner = user?.id ?? null;
    let active = true;
    setFavorites([]);
    setFavoritesOwner(null);
    if (owner) AsyncStorage.getItem(`oficia:favorites:${owner}`)
      .then(saved => {
        if (!active) return;
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        setFavorites(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
      })
      .catch(() => { if (active) setFavorites([]); })
      .finally(() => { if (active) setFavoritesOwner(owner); });
    return () => { active = false; };
  }, [user?.id, authReady]);
  useEffect(() => {
    if (!hydrated) return;
    const key = backendConfigured ? (user?.id && favoritesOwner === user.id ? `oficia:favorites:${user.id}` : null) : 'oficia:favorites';
    if (key) AsyncStorage.setItem(key, JSON.stringify(favorites)).catch(() => {});
  }, [favorites, favoritesOwner, hydrated, user?.id]);
  useEffect(() => { if (hydrated && !backendConfigured) AsyncStorage.setItem('oficia:bookings', JSON.stringify(bookings)).catch(() => {}); }, [bookings, hydrated]);
  useEffect(() => {
    if (user && screen === 'auth') {
      setScreen(pendingBooking ? 'booking' : 'tabs');
      setPendingBooking(false);
      setAuthBusy(false);
      setAuthPassword('');
      setAuthNotice('');
    }
  }, [user, screen, pendingBooking]);
  useEffect(() => {
    if (backendConfigured && authReady && !user && screen !== 'auth') {
      setPendingBooking(false);
      setScreen('auth');
    }
  }, [authReady, user, screen]);
  const toggleFavorite = (id: string) => {
    if (backendConfigured && (!user || favoritesOwner !== user.id)) return;
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };
  const openSpace = (space: Space) => { setSelected(space); setDetailImageIndex(0); setDetailSection('Acerca de'); setScreen('detail'); };
  const openBooking = () => {
    if (backendConfigured && !user) { setPendingBooking(true); setAuthNotice('Inicia sesión para enviar y consultar tus solicitudes.'); setScreen('auth'); return; }
    const freshDates = nextDates(14);
    const next = freshDates.flatMap(date => times.map(time => ({ date: date.key, time }))).find(slot => isFutureSlot(slot.date, slot.time));
    if (!next) return;
    setDates(freshDates);
    setUnit('Hora'); setQuantity(1); setSelectedDate(next.date); setSelectedTime(next.time); setScreen('booking');
  };
  const chooseTab = (next: Tab) => { setTab(next); setScreen('tabs'); setSearch(''); setCategory('Todos'); setAmenityFilter([]); setCapacityFilter(1); setSortMode('recommended'); if (next === 'Reservas' && user) refreshRemoteData(user.id).catch(() => setDataNotice('No se pudieron actualizar tus solicitudes.')); };
  const goBack = () => { if (screen === 'booking') setScreen('detail'); else if (screen === 'receipt') chooseTab('Reservas'); else if (screen === 'host' || screen === 'operations') chooseTab('Perfil'); else setScreen('tabs'); };
  const reportTransfer = async () => {
    if (!supabase || !latestBooking?.remoteId || !bookingSpace || bookingSpace.isDemo) return;
    const reference = payerReferenceDraft.trim();
    if (reference.length < 4 || reference.length > 80) {
      showMessage('Revisa la referencia', 'Escribe el folio o clave de rastreo que aparece en tu banco.');
      return;
    }
    setOperationsBusy(true);
    const { data, error } = await supabase.from('bookings').update({ payment_status: 'reportado', payer_reference: reference }).eq('id', latestBooking.remoteId).select('*').single();
    setOperationsBusy(false);
    if (error) { showMessage('No se pudo reportar', 'Revisa que el folio corresponda a tu transferencia e inténtalo de nuevo.'); return; }
    const updated = mapBooking(data as BookingRow);
    setBookings(items => items.map(item => item.remoteId === updated.remoteId ? updated : item));
    setLatestBooking(updated);
    setPayerReferenceDraft('');
  };

  const openBookingTicket = async (booking: Booking) => {
    let current = booking;
    if (supabase && booking.remoteId) {
      const { data, error } = await supabase.from('bookings').select('*').eq('id', booking.remoteId).maybeSingle();
      if (!error && data) current = mapBooking(data as BookingRow);
    }
    setLatestBooking(current);
    setPayerReferenceDraft('');
    setScreen('receipt');
  };

  const refreshTicketStatus = async () => {
    if (!supabase || !latestBooking?.remoteId) return;
    setOperationsBusy(true);
    const { data, error } = await supabase.from('bookings').select('*').eq('id', latestBooking.remoteId).single();
    setOperationsBusy(false);
    if (error) { showMessage('No se pudo actualizar', 'Comprueba tu conexión e inténtalo otra vez.'); return; }
    const updated = mapBooking(data as BookingRow);
    setLatestBooking(updated);
    setBookings(items => items.map(item => item.remoteId === updated.remoteId ? updated : item));
  };

  const reviewTransfer = async (booking: Booking, verified: boolean) => {
    if (!supabase || !booking.remoteId || !isOperations) return;
    setOperationsBusy(true);
    const { data, error } = await supabase.from('bookings').update({
      payment_status: verified ? 'verificado' : 'rechazado',
      status: verified ? 'confirmada' : 'rechazada',
      rejection_reason: verified ? null : 'Operaciones no pudo validar el depósito.',
      payment_review_note: verified ? null : 'Depósito no localizado o referencia no coincidente.',
    }).eq('id', booking.remoteId).select('*').single();
    setOperationsBusy(false);
    if (error) { showMessage('No se pudo revisar', 'Actualiza la bandeja e inténtalo de nuevo.'); return; }
    const updated = mapBooking(data as BookingRow);
    setBookings(items => items.map(item => item.remoteId === updated.remoteId ? updated : item));
    setLatestBooking(item => item?.remoteId === updated.remoteId ? updated : item);
  };

  const saveTransferSettings = async () => {
    if (!supabase || !isOperations) return;
    const clabe = bankDraft.clabe.replace(/\s/g, '');
    if (!bankDraft.bankName.trim() || !bankDraft.beneficiary.trim() || !isValidClabe(clabe)) {
      setOperationsNotice('Completa el banco, titular y una CLABE válida de 18 dígitos.');
      return;
    }
    setOperationsBusy(true);
    const { error } = await supabase.from('transfer_settings').update({
      bank_name: bankDraft.bankName.trim(), clabe, beneficiary: bankDraft.beneficiary.trim(),
      instructions: bankDraft.instructions.trim() || 'Incluye la referencia Oficia en el concepto de la transferencia.', updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setOperationsBusy(false);
    if (error) { setOperationsNotice('No se pudieron guardar los datos bancarios. Intenta de nuevo.'); return; }
    setTransferSettings({ ...bankDraft, clabe });
    setBankDraft(current => ({ ...current, clabe }));
    setOperationsNotice('Datos de depósito guardados.');
  };
  const submitBooking = async () => {
    if (!selected) return;
    if (!isFutureSlot(selectedDate, selectedTime)) {
      showMessage('Horario no disponible', 'Elige una fecha y hora futuras para enviar tu solicitud.');
      return;
    }
    let booking: Booking;
    if (backendConfigured && supabase) {
      if (!user) { setPendingBooking(true); setAuthNotice('Inicia sesión para enviar y consultar tus solicitudes.'); setScreen('auth'); return; }
      const { data, error } = await supabase.from('bookings').insert({ client_id: user.id, space_id: selected.id, local_date: selectedDate, local_time: selectedTime, unit, quantity }).select('*').single();
      if (error) { showMessage('No se pudo enviar la solicitud', error.message); return; }
      booking = mapBooking(data as BookingRow);
    } else {
      const reference = `OF-${Date.now().toString().slice(-6)}`;
      booking = { id: reference, transferReference: reference, spaceId: selected.id, date: selectedDate, time: selectedTime, unit, quantity, total: selected.rate[unit] * quantity, status: 'Solicitud enviada', paymentStatus: 'pendiente' };
    }
    setBookings(current => [booking, ...current]); setLatestBooking(booking); setScreen('receipt');
  };
  const favoriteIds = new Set(backendConfigured && favoritesOwner !== user?.id ? [] : favorites);
  const myBookings = selectMyBookings(bookings, user?.id ?? null, backendConfigured);
  const bookingSpace = latestBooking ? catalog.find(space => space.id === latestBooking.spaceId) : null;
  const hostBookings = backendConfigured ? bookings.filter(item => hostSpaceIds.includes(item.spaceId)) : bookings;
  const depositReady = Boolean(transferSettings.bankName && isValidClabe(transferSettings.clabe) && transferSettings.beneficiary);
  const pendingPayment = latestBooking?.paymentStatus ?? 'pendiente';

  const submitAuth = async () => {
    if (!supabase || !authEmail.trim() || authPassword.length < 8) { setAuthNotice('Escribe un correo y una contraseña de al menos 8 caracteres.'); return; }
    setAuthBusy(true); setAuthNotice('');
    try {
      if (authMode === 'crear') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (!data.session || !data.user) { setAuthNotice('Te enviamos un correo para confirmar tu cuenta. Después vuelve e inicia sesión.'); return; }
        setUser(data.user); await refreshRemoteData(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setUser(data.user); await refreshRemoteData(data.user.id);
      }
      setScreen(pendingBooking ? 'booking' : 'tabs'); setPendingBooking(false); setAuthPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setAuthNotice(message.toLowerCase().includes('invalid login credentials') ? 'El correo o la contraseña no son correctos.' : message.toLowerCase().includes('user already registered') ? 'Ya existe una cuenta con ese correo. Inicia sesión.' : message.toLowerCase().includes('email not confirmed') ? 'Confirma tu correo desde el enlace que te enviamos.' : message || 'No se pudo completar el acceso. Intenta de nuevo.');
    } finally { setAuthBusy(false); }
  };

  const submitGoogleAuth = async () => {
    setAuthBusy(true); setAuthNotice('');
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setAuthNotice(message.toLowerCase().includes('google sign-in todavía') ? message : message || 'No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setAuthBusy(false);
    }
  };

  const confirmSignOut = async () => {
    if (!await confirmInBrowser('Cerrar sesión', '¿Quieres salir de tu cuenta de Oficia?')) return;
    try { await signOutFromGoogle(); } catch { /* Supabase revoca la sesión aunque Google no pueda cerrar su selector. */ }
    const { error } = await supabase?.auth.signOut() ?? { error: new Error('No hay conexión de autenticación.') };
    if (error) { showMessage('No se pudo cerrar sesión', error.message); return; }
    setPendingBooking(false); setAuthMode('entrar'); setAuthNotice(''); setScreen('auth');
  };

  if (!hydrated || (backendConfigured && !authReady)) return <SafeAreaView style={styles.root} edges={['top', 'bottom']}><View style={styles.loading}><Mark size={70} /><Text style={styles.loadingText}>Preparando Oficia…</Text></View></SafeAreaView>;
  return <SafeAreaView style={[styles.root, screen === 'auth' && styles.authScreen]} edges={['top', 'bottom']}><StatusBar barStyle={screen === 'auth' ? 'light-content' : 'dark-content'} backgroundColor={screen === 'auth' ? palette.plum : palette.cream} />
    {screen === 'auth' && <View style={styles.authScreen}>
      <AuthVideoBackground />
      <View pointerEvents="none" style={styles.authVideoShade} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.authHero}>
        <View style={styles.authDecorOne} /><View style={styles.authDecorTwo} />
        {pendingBooking ? <Pressable accessibilityRole="button" accessibilityLabel="Volver al espacio" onPress={() => { setPendingBooking(false); setAuthNotice(''); setScreen('detail'); }} style={styles.authBack}><Icon name="back" color={palette.white} size={19} /><Text style={styles.authBackText}>Volver al espacio</Text></Pressable> : null}
        <View style={styles.authHeroBrand}><View style={styles.authLogoFrame}><Mark size={46} /></View><View><Text style={styles.authBrandName}>Oficia</Text><Text style={styles.authBrandTag}>TU ESPACIO, A TU HORA</Text></View></View>
        <View style={styles.authHeroCopy}><View style={styles.authLocation}><Icon name="pin" size={13} color={palette.white} /><Text style={styles.authLocationText}>DELICIAS, CHIHUAHUA</Text></View><Text style={styles.authHeroTitle}>Un buen lugar{ '\n' }lo cambia todo.</Text><Text style={styles.authHeroSubtitle}>Oficinas, reuniones y coworking listos para ti.</Text></View>
        <View style={styles.authBenefits}><View style={styles.authBenefit}><Icon name="wifi" size={15} color={palette.white} /><Text style={styles.authBenefitText}>Internet</Text></View><View style={styles.authBenefit}><Icon name="lock" size={15} color={palette.white} /><Text style={styles.authBenefitText}>Privacidad</Text></View><View style={styles.authBenefit}><Icon name="clock" size={15} color={palette.white} /><Text style={styles.authBenefitText}>A tu hora</Text></View></View>
      </View>
      <View style={[styles.authCard, styles.authCardResponsive]}>
        <Text style={styles.authCardEyebrow}>{authMode === 'entrar' ? 'QUÉ BUENO VERTE' : 'HAZ ESPACIO PARA TUS IDEAS'}</Text>
        <Text style={styles.authCardTitle}>{authMode === 'entrar' ? 'Inicia sesión' : 'Crea tu cuenta'}</Text>
        <Text style={styles.authCardSubtitle}>Guarda tus solicitudes y consúltalas desde cualquier dispositivo.</Text>
        {backendConfigured ? <><Pressable accessibilityRole="button" accessibilityLabel="Continuar con Google" disabled={authBusy} onPress={submitGoogleAuth} style={[styles.googleButton, authBusy && styles.googleButtonDisabled]}><Text style={styles.googleMark}>G</Text><Text style={styles.googleButtonText}>{authBusy ? 'Conectando…' : 'Continuar con Google'}</Text></Pressable><View style={styles.authDivider}><View style={styles.authDividerLine} /><Text style={styles.authDividerText}>o con tu correo</Text><View style={styles.authDividerLine} /></View></> : null}
        <Text style={styles.authLabel}>Correo electrónico</Text>
        <View style={styles.authInputRow}><Icon name="user" size={18} color={palette.muted} /><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" value={authEmail} onChangeText={setAuthEmail} placeholder="tu@correo.com" placeholderTextColor="#9B8990" style={styles.authInputField} returnKeyType="next" /></View>
        <Text style={styles.authLabel}>Contraseña</Text>
        <View style={styles.authInputRow}><Icon name="lock" size={18} color={palette.muted} /><TextInput autoCapitalize="none" autoComplete={authMode === 'crear' ? 'new-password' : 'current-password'} secureTextEntry textContentType={authMode === 'crear' ? 'newPassword' : 'password'} value={authPassword} onChangeText={setAuthPassword} placeholder="Al menos 8 caracteres" placeholderTextColor="#9B8990" style={styles.authInputField} onSubmitEditing={submitAuth} returnKeyType="go" /></View>
        <PrimaryButton label={authBusy ? 'Un momento…' : authMode === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'} onPress={submitAuth} disabled={authBusy} style={{ marginTop: 20 }} />
        {authNotice ? <Text accessibilityRole="alert" style={styles.authNotice}>{authNotice}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => { setAuthMode(mode => mode === 'entrar' ? 'crear' : 'entrar'); setAuthNotice(''); }} style={styles.authSwitch}><Text style={styles.authSwitchText}>{authMode === 'entrar' ? '¿Primera vez en Oficia? Crea una cuenta' : '¿Ya tienes cuenta? Inicia sesión'}</Text></Pressable>
        <View style={styles.authPrivacy}><Icon name="lock" size={14} color={palette.action} /><Text style={styles.authFootnote}>Tus solicitudes quedan vinculadas a tu cuenta. No se realizan cobros desde la app.</Text></View>
      </View>
      <View style={styles.authFooter}><Text style={styles.authFooterText}>Encuentra tu espacio. Enfócate en lo que sigue.</Text></View>
      </ScrollView>
    </View>}
    {screen === 'welcome' && <ScrollView style={styles.flex} contentContainerStyle={styles.welcome} showsVerticalScrollIndicator={false}>
      <View style={styles.welcomeArt}><View style={styles.welcomeCircle} /><View style={styles.welcomePhotoWrap}><SpacePhoto uri={catalog[0].image} label="Espacio de trabajo luminoso" style={styles.welcomePhoto} /></View><View style={styles.welcomeMark}><Mark size={48} /></View></View>
      <View style={styles.welcomeBottom}><Brand /><Text style={styles.welcomeTitle}>Tu mejor trabajo{ '\n'}merece un gran lugar.</Text><Text style={styles.welcomeText}>Oficinas, salas y coworking listos para ti en Delicias y sus alrededores. Reserva desde una hora.</Text><PrimaryButton label="Explorar espacios" onPress={() => { setScreen('tabs'); AsyncStorage.setItem('oficia:welcome', 'yes').catch(() => {}); }} style={{ marginTop: 27 }} /><Text style={styles.demoNote}>Explora la versión de demostración</Text></View>
    </ScrollView>}

    {screen === 'tabs' && <><ScrollView key={tab} style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
      {dataNotice ? <Pressable accessibilityRole="button" onPress={() => { setDataNotice(''); if (supabase) Promise.resolve(supabase.from('spaces').select('*').eq('is_published', true).order('created_at', { ascending: true })).then(({ data, error }) => { if (error) throw error; if (data?.length) setCatalog((data as SpaceRow[]).map(mapSpace)); }).catch(() => setDataNotice('Seguimos mostrando el catálogo de demostración.')); }} style={styles.dataNotice}><Icon name="info" size={17} color={palette.action} /><Text style={styles.dataNoticeText}>{dataNotice}</Text></Pressable> : null}
      {tab === 'Inicio' && <>
        <View style={styles.homeHeader}><View style={styles.homeTop}><View><Text style={styles.locationOverline}>TU UBICACIÓN</Text><View style={styles.headerLocation}><Icon name="pin" size={15} color={palette.white} /><Text style={styles.headerLocationText}>Delicias, Chihuahua</Text><Icon name="chevron" size={15} color={palette.white} /></View></View><View style={styles.bellButton}><Icon name="bell" color={palette.white} size={20} /></View></View>
          <Text style={styles.homeTitle}>Un espacio para{ '\n'}cada gran idea.</Text><Text style={styles.homeSubtitle}>Encuentra tu lugar ideal para trabajar hoy.</Text>
          <View style={styles.homeSearch}><Icon name="search" size={20} color={palette.action} /><TextInput placeholder="¿Qué espacio necesitas?" placeholderTextColor="#9B8990" style={styles.searchInput} value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={() => setTab('Explorar')} /><Pressable accessibilityRole="button" accessibilityLabel="Abrir filtros" onPress={() => setShowFilters(true)} style={styles.searchAction}><Icon name="filter" size={19} color={palette.white} /></Pressable></View>
        </View>
        <View style={styles.padded}><View style={styles.sectionRow}><Text style={styles.sectionTitle}>Espacios para ti</Text><Pressable onPress={() => chooseTab('Explorar')}><Text style={styles.sectionLink}>Ver todos  →</Text></Pressable></View><CategoryRow category={category} onChange={setCategory} /><View style={styles.promo}><SpacePhoto uri={(catalog[1] ?? catalog[0]).image} label="Oficina para trabajar" style={styles.promoImage} /><View style={styles.promoOverlay} /><View style={styles.promoContent}><Text style={styles.promoBadge}>A TU RITMO</Text><Text style={styles.promoTitle}>Por una hora,{ '\n'}o por toda la semana.</Text><Text style={styles.promoSub}>Tu espacio, a tu hora.</Text></View></View><View style={styles.sectionRow}><Text style={styles.sectionTitle}>Recomendados</Text><Text style={styles.sectionHint}>En Delicias y cerca</Text></View></View>
        {filtered.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>{filtered.map(space => <SpaceCard key={space.id} space={space} horizontal favorite={favoriteIds.has(space.id)} onFavorite={() => toggleFavorite(space.id)} onOpen={() => openSpace(space)} />)}</ScrollView> : <EmptyState icon="search" title="No encontramos espacios" message="Prueba otra categoría o búsqueda." />}
        <View style={styles.padded}><View style={styles.sectionRow}><Text style={styles.sectionTitle}>Todos los espacios</Text><Pressable onPress={() => chooseTab('Explorar')}><Text style={styles.sectionLink}>Explorar  →</Text></Pressable></View>{filtered.slice(0, 2).map(space => <SpaceCard key={space.id} space={space} favorite={favoriteIds.has(space.id)} onFavorite={() => toggleFavorite(space.id)} onOpen={() => openSpace(space)} />)}</View>
      </>}

      {tab === 'Explorar' && <View style={styles.padded}><PageHeader eyebrow="DESCUBRE" title="Explora espacios" subtitle="Encuentra un lugar listo para tu próxima jornada." /><SearchField value={search} onChange={setSearch} onFilters={() => setShowFilters(true)} filterCount={amenityFilter.length + (capacityFilter > 1 ? 1 : 0) + (sortMode !== 'recommended' ? 1 : 0)} /><CategoryRow category={category} onChange={setCategory} /><View style={styles.mapToggle} accessibilityRole="tablist"><Pressable accessibilityRole="tab" accessibilityState={{ selected: !mapVisible }} onPress={() => setMapVisible(false)} style={[styles.mapToggleItem, !mapVisible && styles.mapToggleActive]}><Icon name="grid" size={15} color={!mapVisible ? palette.white : palette.action} /><Text style={[styles.mapToggleText, !mapVisible && styles.mapToggleTextActive]}>Lista</Text></Pressable><Pressable accessibilityRole="tab" accessibilityState={{ selected: mapVisible }} onPress={() => setMapVisible(true)} style={[styles.mapToggleItem, mapVisible && styles.mapToggleActive]}><Icon name="explore" size={15} color={mapVisible ? palette.white : palette.action} /><Text style={[styles.mapToggleText, mapVisible && styles.mapToggleTextActive]}>Mapa</Text></Pressable></View><View style={styles.sectionRow}><Text style={styles.sectionTitle}>{mapVisible ? 'Cerca de ti' : 'Resultados'}</Text><Text style={styles.sectionHint}>{filtered.length} {filtered.length === 1 ? 'espacio' : 'espacios'}{sortMode === 'price' ? ' · Menor precio' : sortMode === 'capacity' ? ' · Más capacidad' : ''}</Text></View>{mapVisible ? <><View style={styles.mapNotice}><Icon name="info" size={16} color={palette.action} /><Text style={styles.mapNoticeText}>Ubicaciones y precios de muestra. Toca un precio para ver el espacio.</Text></View><OpenStreetMap spaces={filtered} onSelect={openSpace} />{filtered.length ? <View style={styles.mapResultList}>{filtered.map(space => <SpaceCard key={space.id} space={space} favorite={favoriteIds.has(space.id)} onFavorite={() => toggleFavorite(space.id)} onOpen={() => openSpace(space)} />)}</View> : <EmptyState icon="search" title="Sin resultados" message="Prueba otra palabra o ajusta los filtros." />}</> : filtered.length ? filtered.map(space => <SpaceCard key={space.id} space={space} favorite={favoriteIds.has(space.id)} onFavorite={() => toggleFavorite(space.id)} onOpen={() => openSpace(space)} />) : <EmptyState icon="search" title="Sin resultados" message="Prueba con otra palabra o ajusta los filtros." action="Limpiar filtros" onAction={() => { setSearch(''); setCategory('Todos'); setAmenityFilter([]); setCapacityFilter(1); setSortMode('recommended'); }} />}</View>}

      {tab === 'Favoritos' && <View style={styles.padded}><PageHeader eyebrow="GUARDADOS" title="Tus favoritos" subtitle="Los espacios que quieres tener a la mano." />{favoriteIds.size ? catalog.filter(space => favoriteIds.has(space.id)).map(space => <SpaceCard key={space.id} space={space} favorite onFavorite={() => toggleFavorite(space.id)} onOpen={() => openSpace(space)} />) : <EmptyState icon="heart" title="Todavía no hay favoritos" message="Toca el corazón de un espacio para guardarlo aquí." action="Explorar espacios" onAction={() => chooseTab('Explorar')} />}</View>}

      {tab === 'Reservas' && <View style={styles.padded}><PageHeader eyebrow="TUS PLANES" title="Mis reservas" subtitle="Consulta tus solicitudes y organiza tu trabajo." />{myBookings.length ? myBookings.map(booking => {
        const space = catalog.find(item => item.id === booking.spaceId);
        if (!space) return null;
        return <Pressable key={booking.id} onPress={() => { void openBookingTicket(booking); }} style={styles.reservationCard}><View style={styles.reservationStatus}><Icon name={booking.status === 'Confirmada' ? 'check' : booking.status === 'Rechazada' ? 'close' : 'clock'} size={15} color={palette.action} /><Text style={styles.reservationStatusText}>{booking.status}</Text><Text style={styles.reservationId}>{booking.id}</Text></View><View style={styles.reservationBody}><SpacePhoto uri={space.image} label={`Fotografía de ${space.name}`} style={styles.reservationPhoto} /><View style={styles.reservationInfo}><Text style={styles.reservationName}>{space.name}</Text><Text style={styles.reservationMeta}>{space.area}</Text><Text style={styles.reservationMeta}>{formatDate(booking.date)} · {booking.time}</Text><Text style={styles.reservationPrice}>{formatMoney(booking.total)}</Text><Text style={styles.reservationMeta}>Depósito: {booking.paymentStatus === 'verificado' ? 'verificado' : booking.paymentStatus === 'reportado' ? 'en revisión' : booking.paymentStatus === 'rechazado' ? 'no validado' : 'pendiente'} · Ver ticket</Text></View></View></Pressable>;
      }) : <EmptyState icon="calendar" title="Aún no tienes reservas" message="Encuentra tu espacio y envía una solicitud. El anfitrión confirmará la disponibilidad." action="Explorar espacios" onAction={() => chooseTab('Explorar')} />}</View>}

      {tab === 'Perfil' && <View style={styles.padded}><PageHeader eyebrow="BIENVENIDO" title="Tu perfil" subtitle="Todo para trabajar a tu manera." /><View style={styles.profileCard}><View style={styles.profileAvatar}><Icon name="user" size={29} color={palette.action} /></View><View><Text style={styles.profileTitle}>{user?.email ?? 'Explorador de espacios'}</Text><Text style={styles.profileMeta}>{user ? 'Cuenta Oficia' : 'Delicias, Chihuahua'}</Text></View></View><Text style={styles.sectionTitle}>Acerca de Oficia</Text><Text style={styles.bodyCopy}>Encuentra oficinas privadas, salas de juntas y espacios de coworking equipados cerca de ti. Elige el tiempo que necesitas y envía tu solicitud en minutos.</Text>{isOperations ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir panel de operaciones" onPress={() => { setOperationsNotice(''); setScreen('operations'); if (user) refreshRemoteData(user.id).catch(() => setDataNotice('No se pudieron actualizar las solicitudes.')); }} style={styles.hostEntry}><View style={styles.hostEntryIcon}><Icon name="briefcase" size={23} color={palette.action} /></View><View style={styles.flex}><Text style={styles.hostEntryTitle}>Panel de Operaciones</Text><Text style={styles.hostEntryText}>Depósitos, reservas y cuenta bancaria</Text></View><Icon name="arrow" size={19} color={palette.action} /></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel="Abrir panel de anfitrión" onPress={() => { if (backendConfigured && !user) { setPendingBooking(false); setAuthNotice('Inicia sesión para abrir el panel de anfitrión.'); setScreen('auth'); } else { setScreen('host'); if (user) refreshRemoteData(user.id).catch(() => setDataNotice('No se pudieron actualizar tus solicitudes.')); } }} style={styles.hostEntry}><View style={styles.hostEntryIcon}><Icon name="briefcase" size={23} color={palette.action} /></View><View style={styles.flex}><Text style={styles.hostEntryTitle}>Panel de anfitrión</Text><Text style={styles.hostEntryText}>{backendConfigured ? 'Consulta solicitudes de tus espacios' : 'Revisa solicitudes de muestra'}</Text></View><Icon name="arrow" size={19} color={palette.action} /></Pressable><View style={styles.profileInfo}><Icon name="info" size={22} color={palette.action} /><View style={styles.flex}><Text style={styles.profileInfoTitle}>{backendConfigured ? 'Catálogo de demostración' : 'Versión de demostración'}</Text><Text style={styles.profileInfoText}>{backendConfigured ? 'Los espacios, fotos y precios actuales son ilustrativos. Las solicitudes enviadas quedan guardadas en tu cuenta y no generan cobro.' : 'Las fotos, los espacios y los precios son ilustrativos. Las solicitudes de este dispositivo se guardan localmente.'}</Text></View></View>{backendConfigured ? <Pressable accessibilityRole="button" accessibilityLabel={user ? 'Cerrar sesión' : 'Iniciar sesión'} onPress={() => { if (user) confirmSignOut(); else { setPendingBooking(false); setAuthNotice(''); setScreen('auth'); } }} style={styles.signOutButton}><View style={styles.signOutIcon}><Icon name={user ? 'power' : 'user'} size={19} color={palette.action} /></View><View style={styles.flex}><Text style={styles.signOutTitle}>{user ? 'Cerrar sesión' : 'Iniciar sesión'}</Text><Text style={styles.signOutCaption}>{user ? 'Salir de tu cuenta de forma segura' : 'Accede a tus reservas y espacios favoritos'}</Text></View><Icon name="arrow" size={17} color={palette.action} /></Pressable> : null}<View style={styles.profileBrand}><Brand /></View></View>}
    </ScrollView><TabBar active={tab} onChange={chooseTab} /></>}

    {screen === 'detail' && selected && <><ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 116 }}><View style={styles.detailHero}><SpacePhoto uri={selected.gallery[detailImageIndex] ?? selected.image} label={"Fotografía " + (detailImageIndex + 1) + " de " + selected.name} style={styles.heroPhoto} /><Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={[styles.heroButton, { left: 18 }]}><Icon name="back" color={palette.plum} size={20} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={favoriteIds.has(selected.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'} onPress={() => toggleFavorite(selected.id)} style={[styles.heroButton, { right: 18 }]}><Icon name="heart" color={favoriteIds.has(selected.id) ? palette.action : palette.plum} filled={favoriteIds.has(selected.id)} size={21} /></Pressable><View style={styles.heroThumbs}>{selected.gallery.slice(0, 3).map((uri, index) => <Pressable key={`${uri}-${index}`} accessibilityRole="button" accessibilityLabel={"Ver foto " + (index + 1)} accessibilityState={{ selected: detailImageIndex === index }} onPress={() => setDetailImageIndex(index)} style={[styles.heroThumb, detailImageIndex === index && styles.heroThumbActive]}><SpacePhoto uri={uri} label={"Fotografía " + (index + 1) + " de " + selected.name} style={styles.heroThumbImage} /></Pressable>)}</View></View><View style={styles.detailBody}><View style={styles.detailTop}><Text style={styles.detailType}>{selected.category.toUpperCase()}</Text>{selected.isDemo ? <View style={styles.detailSampleBadge}><Text style={styles.detailSampleText}>MUESTRA</Text></View> : selected.reviewCount > 0 ? <View style={styles.ratingDetail}><Icon name="star" size={16} color={palette.gold} filled /><Text style={styles.ratingDetailText}>{selected.rating} ({selected.reviewCount} opiniones)</Text></View> : <Text style={styles.ratingDetailText}>Nuevo</Text>}</View><Text style={styles.detailName}>{selected.name}</Text><View style={styles.locationLine}><Icon name="pin" size={16} color={palette.action} /><Text style={styles.detailArea}>{selected.area}, Chihuahua</Text></View><View style={styles.detailStats}><Stat icon="users" text={`Hasta ${selected.capacity} ${selected.capacity === 1 ? 'persona' : 'personas'}`} /><Stat icon="clock" text="Desde 1 hora" /><Stat icon="lock" text={selected.category === 'Coworking' ? 'Área común' : 'Privacidad'} /></View><View style={styles.detailTabs}>{(['Acerca de', 'Galería', 'Opiniones'] as DetailSection[]).map(section => <Pressable key={section} accessibilityRole="tab" accessibilityState={{ selected: detailSection === section }} onPress={() => setDetailSection(section)} style={[styles.detailTab, detailSection === section && styles.detailTabActive]}><Text style={[styles.detailTabText, detailSection === section && styles.detailTabTextActive]}>{section}</Text></Pressable>)}</View>
      {detailSection === 'Acerca de' && <><Text style={styles.detailHeading}>Sobre este espacio</Text><Text style={styles.bodyCopy}>{selected.description}</Text><Text style={styles.detailHeading}>Servicios incluidos</Text><View style={styles.amenityGrid}>{selected.amenities.map(amenity => <View key={amenity} style={styles.amenity}><Icon name={amenityIcon(amenity)} size={17} color={palette.action} /><Text style={styles.amenityText}>{amenity}</Text></View>)}</View><View style={styles.privacyBox}><Icon name="lock" size={19} color={palette.action} /><Text style={styles.privacyText}>{selected.privacy}</Text></View></>}
      {detailSection === 'Galería' && <><Text style={styles.detailHeading}>Galería del espacio</Text>{selected.gallery.map((uri, index) => <SpacePhoto key={`${uri}-${index}`} uri={uri} label={`Imagen ${index + 1} de ${selected.name}`} style={styles.galleryPhoto} />)}</>}
      {detailSection === 'Opiniones' && <View style={styles.reviewBox}>{selected.isDemo || selected.reviewCount === 0 ? <><Text style={styles.reviewCaption}>Aún no hay opiniones</Text><Text style={styles.bodyCopy}>Se mostrarán después de las primeras reservas.</Text></> : <><View style={styles.reviewRating}><Icon name="star" size={23} color={palette.gold} filled /><Text style={styles.reviewNumber}>{selected.rating}</Text></View><Text style={styles.reviewCaption}>{selected.reviewCount} opiniones</Text></>}</View>}
    </View></ScrollView><View style={styles.stickyFooter}><View><Text style={styles.footerLabel}>{selected.isDemo ? "Desde · muestra" : "Desde"}</Text><Text style={styles.footerPrice}>{formatMoney(selected.rate.Hora)}<Text style={styles.footerUnit}> / h</Text></Text></View><PrimaryButton label="Reservar" onPress={openBooking} style={{ minWidth: 150 }} /></View></>}

    {screen === 'booking' && selected && <><ScrollView style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bookingContent}><View style={styles.innerHeader}><Pressable accessibilityRole="button" accessibilityLabel="Volver a detalles" onPress={goBack} style={styles.roundBack}><Icon name="back" size={19} /></Pressable><Text style={styles.innerHeaderTitle}>Solicitar espacio</Text><View style={{ width: 38 }} /></View><View style={styles.bookingSpace}><SpacePhoto uri={selected.image} label={`Fotografía de ${selected.name}`} style={styles.bookingImage} /><View style={styles.flex}><Text style={styles.bookingSpaceTitle}>{selected.name}</Text><Text style={styles.bookingSpaceMeta}>{selected.category}</Text><Text style={styles.bookingSpaceMeta}>{selected.area}</Text></View></View><Text style={styles.bookingLabel}>¿Cuánto tiempo lo necesitas?</Text><View style={styles.unitRow}>{(['Hora', 'Día', 'Semana'] as Unit[]).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: unit === item }} onPress={() => { setUnit(item); setQuantity(1); }} style={[styles.unitButton, unit === item && styles.unitButtonSelected]}><Text style={[styles.unitText, unit === item && styles.unitTextSelected]}>{item}</Text><Text style={[styles.unitPrice, unit === item && styles.unitTextSelected]}>{formatMoney(selected.rate[item])}</Text></Pressable>)}</View><Text style={styles.bookingLabel}>Fecha de inicio</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dates.map(date => <Pressable key={date.key} accessibilityRole="button" accessibilityLabel={date.label} accessibilityState={{ selected: selectedDate === date.key, disabled: !times.some(time => isFutureSlot(date.key, time)) }} disabled={!times.some(time => isFutureSlot(date.key, time))} onPress={() => { setSelectedDate(date.key); setSelectedTime(current => isFutureSlot(date.key, current) ? current : times.find(time => isFutureSlot(date.key, time)) ?? current); }} style={[styles.dateChip, selectedDate === date.key && styles.dateChipActive, !times.some(time => isFutureSlot(date.key, time)) && styles.slotDisabled]}><Text style={[styles.dateDay, selectedDate === date.key && styles.dateChipTextActive]}>{date.day}</Text><Text style={[styles.dateNumber, selectedDate === date.key && styles.dateChipTextActive]}>{date.number}</Text></Pressable>)}</ScrollView><Text style={styles.bookingLabel}>Hora de llegada</Text><View style={styles.timeGrid}>{times.map(time => <Pressable key={time} accessibilityRole="button" accessibilityState={{ selected: selectedTime === time, disabled: !isFutureSlot(selectedDate, time) }} disabled={!isFutureSlot(selectedDate, time)} onPress={() => setSelectedTime(time)} style={[styles.timeChip, selectedTime === time && styles.timeChipActive, !isFutureSlot(selectedDate, time) && styles.slotDisabled]}><Text style={[styles.timeText, selectedTime === time && styles.timeTextActive]}>{time}</Text></Pressable>)}</View><Text style={styles.bookingLabel}>Cantidad de {unit === 'Hora' ? 'horas' : unit === 'Día' ? 'días' : 'semanas'}</Text><View style={styles.quantityRow}><View><Text style={styles.quantityTitle}>{quantity} {unit === 'Hora' ? quantity === 1 ? 'hora' : 'horas' : unit === 'Día' ? quantity === 1 ? 'día' : 'días' : quantity === 1 ? 'semana' : 'semanas'}</Text><Text style={styles.quantityHint}>El horario final se confirma con el anfitrión.</Text></View><View style={styles.stepper}><Pressable accessibilityRole="button" accessibilityLabel="Reducir cantidad" onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.stepButton}><Icon name="minus" size={16} color={palette.action} /></Pressable><Text style={styles.stepValue}>{quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" onPress={() => setQuantity(Math.min(unit === 'Hora' ? 12 : unit === 'Día' ? 14 : 4, quantity + 1))} style={styles.stepButton}><Icon name="plus" size={16} color={palette.action} /></Pressable></View></View><View style={styles.summary}><Text style={styles.summaryTitle}>Resumen de solicitud</Text><View style={styles.summaryLine}><Text style={styles.summaryMuted}>{formatMoney(selected.rate[unit])} × {quantity} {unit === 'Hora' ? 'hora(s)' : unit === 'Día' ? 'día(s)' : 'semana(s)'}</Text><Text style={styles.summaryStrong}>{formatMoney(selected.rate[unit] * quantity)}</Text></View><View style={[styles.summaryLine, { marginTop: 12 }]}><Text style={styles.summaryMuted}>Salida estimada</Text><Text style={styles.summaryStrong}>{estimatedEnd(selectedDate, selectedTime, unit, quantity)}</Text></View><View style={styles.summaryRule} /><View style={styles.summaryLine}><Text style={styles.summaryStrong}>Total estimado</Text><Text style={styles.summaryTotal}>{formatMoney(selected.rate[unit] * quantity)}</Text></View><Text style={styles.summaryNote}>{selected.isDemo ? 'Espacio y tarifa de muestra. La solicitud no confirma disponibilidad ni genera cobro.' : 'El anfitrión confirma la disponibilidad. No hay cobro en la app.'}</Text></View></ScrollView><View style={styles.stickyFooter}><View><Text style={styles.footerLabel}>Total estimado</Text><Text style={styles.footerPrice}>{formatMoney(selected.rate[unit] * quantity)}</Text></View><PrimaryButton label={isFutureSlot(selectedDate, selectedTime) ? "Enviar solicitud" : "Elige horario futuro"} onPress={submitBooking} style={{ minWidth: 174 }} /></View></>}

    {screen === 'receipt' && latestBooking && bookingSpace && <ScrollView style={styles.flex} contentContainerStyle={styles.receiptContent}><View style={styles.receiptTop}><View style={styles.receiptIcon}><Icon name={latestBooking.status === 'Rechazada' ? 'close' : latestBooking.status === 'Confirmada' ? 'check' : 'clock'} size={33} color={palette.white} strokeWidth={2.5} /></View><Text style={styles.receiptTitle}>{latestBooking.status === 'Solicitud enviada' ? 'Ticket de solicitud' : latestBooking.status === 'Confirmada' ? 'Renta autorizada' : 'Solicitud rechazada'}</Text><Text style={styles.receiptSubtitle}>{latestBooking.status === 'Rechazada' ? 'Operaciones no autorizó esta renta.' : latestBooking.status === 'Confirmada' ? 'Operaciones validó el depósito y autorizó la renta.' : pendingPayment === 'reportado' ? 'Tu referencia está en revisión por Operaciones.' : 'Tu ticket está listo. La renta se autoriza al validar el depósito.'}</Text></View><View style={styles.receiptCard}><View style={styles.receiptHeader}><Brand compact /><Text style={styles.receiptCode}>{latestBooking.id}</Text></View><View style={styles.dashedLine} /><Text style={styles.receiptSpace}>{bookingSpace.name}</Text><Text style={styles.receiptArea}>{bookingSpace.area}, Chihuahua</Text><View style={styles.receiptDetail}><ReceiptItem label="Fecha de inicio" value={formatDate(latestBooking.date)} /><ReceiptItem label="Hora de llegada" value={latestBooking.time} /><ReceiptItem label="Salida estimada" value={estimatedEnd(latestBooking.date, latestBooking.time, latestBooking.unit, latestBooking.quantity)} /><ReceiptItem label="Estancia" value={`${latestBooking.quantity} ${latestBooking.unit === 'Hora' ? 'hora(s)' : latestBooking.unit === 'Día' ? 'día(s)' : 'semana(s)'}`} /><ReceiptItem label="Total" value={formatMoney(latestBooking.total)} />{latestBooking.transferReference ? <ReceiptItem label="Referencia Oficia" value={latestBooking.transferReference} /> : null}{latestBooking.payerReference ? <ReceiptItem label="Folio del banco" value={latestBooking.payerReference} /> : null}<ReceiptItem label="Estado del depósito" value={pendingPayment === 'verificado' ? 'Verificado' : pendingPayment === 'reportado' ? 'En revisión' : pendingPayment === 'rechazado' ? 'No validado' : 'Pendiente'} /></View>
      {bookingSpace.isDemo ? <View style={styles.receiptNotice}><Icon name="info" size={18} color={palette.action} /><Text style={styles.receiptNoticeText}>Espacio y precio de muestra. No hagas depósitos ni uses este ticket para acceder; la ubicación, tarifa y cuenta bancaria reales aún no están configuradas.</Text></View> : depositReady && latestBooking.status === 'Solicitud enviada' ? <View style={styles.bankCard}><Text style={styles.bankTitle}>Deposita para solicitar autorización</Text><ReceiptItem label="Banco" value={transferSettings.bankName} /><ReceiptItem label="Titular" value={transferSettings.beneficiary} /><ReceiptItem label="CLABE" value={transferSettings.clabe} /><ReceiptItem label="Concepto" value={latestBooking.transferReference ?? latestBooking.id} /><Text style={styles.bankInstructions}>{transferSettings.instructions}</Text>{pendingPayment === 'pendiente' ? <><Text style={styles.bankLabel}>Folio o clave de rastreo</Text><TextInput value={payerReferenceDraft} onChangeText={setPayerReferenceDraft} placeholder="Escribe la referencia de tu banco" placeholderTextColor="#9B8990" style={styles.bankInput} maxLength={80} autoCapitalize="characters" /><PrimaryButton label={operationsBusy ? 'Enviando…' : 'Ya hice el depósito'} onPress={reportTransfer} disabled={operationsBusy || payerReferenceDraft.trim().length < 4} style={{ marginTop: 12 }} /></> : <View style={styles.receiptNotice}><Icon name="clock" size={18} color={palette.action} /><Text style={styles.receiptNoticeText}>{pendingPayment === 'reportado' ? 'Operaciones revisará el movimiento.' : pendingPayment === 'verificado' ? 'Depósito verificado. La renta fue autorizada.' : 'El depósito no pudo validarse. Contacta a Operaciones antes de volver a transferir.'}</Text></View>}</View> : latestBooking.status === 'Confirmada' ? <View style={styles.receiptNotice}><Icon name="check" size={18} color={palette.action} /><Text style={styles.receiptNoticeText}>Operaciones validó el depósito y autorizó la renta.</Text></View> : latestBooking.status === 'Rechazada' ? <View style={styles.receiptNotice}><Icon name="info" size={18} color={palette.action} /><Text style={styles.receiptNoticeText}>Operaciones no autorizó la renta. No vuelvas a transferir; contacta al equipo si ya enviaste dinero.</Text></View> : pendingPayment === 'reportado' ? <View style={styles.receiptNotice}><Icon name="clock" size={18} color={palette.action} /><Text style={styles.receiptNoticeText}>Tu folio está en revisión. Actualiza el ticket para consultar el estado.</Text></View> : <View style={styles.receiptNotice}><Icon name="info" size={18} color={palette.action} /><Text style={styles.receiptNoticeText}>Los datos bancarios están pendientes de configuración. No realices depósitos todavía.</Text></View>}</View>{pendingPayment === 'reportado' && latestBooking.status === 'Solicitud enviada' ? <PrimaryButton label={operationsBusy ? 'Actualizando…' : 'Actualizar estado'} onPress={refreshTicketStatus} disabled={operationsBusy} style={{ marginTop: 12 }} /> : null}<PrimaryButton label="Ver mis reservas" onPress={() => chooseTab('Reservas')} style={{ marginTop: 24 }} /><Pressable accessibilityRole="button" onPress={() => chooseTab('Inicio')} style={styles.receiptHome}><Text style={styles.receiptHomeText}>Volver al inicio</Text></Pressable></ScrollView>}
    {screen === 'host' && <ScrollView style={styles.flex} contentContainerStyle={styles.hostContent}><View style={styles.innerHeader}><Pressable accessibilityRole="button" accessibilityLabel="Volver a perfil" onPress={goBack} style={styles.roundBack}><Icon name="back" size={19} /></Pressable><Text style={styles.innerHeaderTitle}>Panel de anfitrión</Text><View style={{ width: 38 }} /></View><View style={styles.hostBanner}><Icon name="info" size={21} color={palette.action} /><Text style={styles.hostBannerText}>{backendConfigured ? 'Consulta las solicitudes de tus espacios. Operaciones valida depósitos y autoriza las rentas.' : 'Vista de demostración. Las solicitudes se guardan en este dispositivo.'}</Text></View><Text style={styles.pageEyebrow}>RESUMEN</Text><Text style={styles.pageTitle}>Solicitudes</Text><View style={styles.hostStats}><View style={styles.hostStat}><Text style={styles.hostStatNumber}>{hostBookings.filter(item => item.status === 'Solicitud enviada').length}</Text><Text style={styles.hostStatLabel}>Pendientes</Text></View><View style={styles.hostStat}><Text style={styles.hostStatNumber}>{hostBookings.filter(item => item.status === 'Confirmada').length}</Text><Text style={styles.hostStatLabel}>Autorizadas</Text></View><View style={styles.hostStat}><Text style={styles.hostStatNumber}>{hostBookings.length}</Text><Text style={styles.hostStatLabel}>Total</Text></View></View>{hostBookings.length ? hostBookings.map(booking => { const space = catalog.find(item => item.id === booking.spaceId); if (!space) return null; return <View key={booking.id} style={styles.hostBooking}><View style={styles.hostBookingTop}><Text style={styles.hostBookingSpace}>{space.name}</Text><Text style={styles.hostBookingCode}>{booking.id}</Text></View><Text style={styles.hostBookingMeta}>{formatDate(booking.date)} · {booking.time}</Text><Text style={styles.hostBookingMeta}>{booking.quantity} {booking.unit === 'Hora' ? 'hora(s)' : booking.unit === 'Día' ? 'día(s)' : 'semana(s)'} · {formatMoney(booking.total)}</Text><Text style={styles.hostBookingStatus}>{booking.status}</Text><Text style={styles.hostBookingMeta}>Depósito: {booking.paymentStatus === 'verificado' ? 'verificado' : booking.paymentStatus === 'reportado' ? 'en revisión' : booking.paymentStatus === 'rechazado' ? 'no validado' : 'pendiente'}</Text></View>; }) : <EmptyState icon="calendar" title={backendConfigured && hostSpaceIds.length === 0 ? 'Aún no hay espacios vinculados' : 'Sin solicitudes todavía'} message={backendConfigured && hostSpaceIds.length === 0 ? 'La cuenta anfitriona debe asociarse a un espacio desde la administración de Oficia.' : 'Las nuevas solicitudes de tus espacios aparecerán aquí.'} action={backendConfigured && hostSpaceIds.length === 0 ? undefined : 'Explorar espacios'} onAction={() => chooseTab('Explorar')} />}</ScrollView>}

    {screen === 'operations' && <ScrollView style={styles.flex} contentContainerStyle={styles.hostContent}><View style={styles.innerHeader}><Pressable accessibilityRole="button" accessibilityLabel="Volver a perfil" onPress={goBack} style={styles.roundBack}><Icon name="back" size={19} /></Pressable><Text style={styles.innerHeaderTitle}>Operaciones</Text><View style={{ width: 38 }} /></View>{!isOperations ? <EmptyState icon="lock" title="Acceso restringido" message="Esta cuenta no tiene permisos de Operaciones." action="Volver al perfil" onAction={goBack} /> : <><View style={styles.hostBanner}><Icon name="info" size={21} color={palette.action} /><Text style={styles.hostBannerText}>Confirma el depósito en la cuenta antes de autorizar cualquier renta.</Text></View><Text style={styles.pageEyebrow}>CUENTA DE DEPÓSITO</Text><View style={styles.bankSettingsCard}><Text style={styles.summaryTitle}>Datos que verá el cliente</Text><Text style={styles.bankLabel}>Banco</Text><TextInput value={bankDraft.bankName} onChangeText={value => setBankDraft(current => ({ ...current, bankName: value }))} placeholder="Nombre del banco" placeholderTextColor="#9B8990" style={styles.bankInput} maxLength={80} /><Text style={styles.bankLabel}>Titular</Text><TextInput value={bankDraft.beneficiary} onChangeText={value => setBankDraft(current => ({ ...current, beneficiary: value }))} placeholder="Nombre del titular" placeholderTextColor="#9B8990" style={styles.bankInput} maxLength={120} /><Text style={styles.bankLabel}>CLABE interbancaria</Text><TextInput value={bankDraft.clabe} onChangeText={value => setBankDraft(current => ({ ...current, clabe: value.replace(/\D/g, '').slice(0, 18) }))} placeholder="18 dígitos" placeholderTextColor="#9B8990" style={styles.bankInput} keyboardType="number-pad" maxLength={18} /><Text style={styles.bankLabel}>Instrucciones</Text><TextInput value={bankDraft.instructions} onChangeText={value => setBankDraft(current => ({ ...current, instructions: value }))} placeholder="Referencia que debe incluir" placeholderTextColor="#9B8990" style={[styles.bankInput, styles.bankInstructionsInput]} multiline maxLength={240} /><Text style={styles.bankInstructions}>La CLABE será visible para clientes cuando exista un espacio real publicado.</Text>{operationsNotice ? <Text accessibilityRole="alert" style={styles.authNotice}>{operationsNotice}</Text> : null}<PrimaryButton label={operationsBusy ? 'Guardando…' : 'Guardar datos bancarios'} onPress={saveTransferSettings} disabled={operationsBusy} style={{ marginTop: 14 }} /></View><Text style={styles.pageEyebrow}>VALIDACIÓN</Text><Text style={styles.pageTitle}>Depósitos reportados</Text>{bookings.filter(booking => booking.paymentStatus === 'reportado' && booking.status === 'Solicitud enviada').length ? bookings.filter(booking => booking.paymentStatus === 'reportado' && booking.status === 'Solicitud enviada').map(booking => { const space = catalog.find(item => item.id === booking.spaceId); if (!space) return null; return <View key={booking.id} style={styles.hostBooking}><View style={styles.hostBookingTop}><Text style={styles.hostBookingSpace}>{space.name}</Text><Text style={styles.hostBookingCode}>{booking.id}</Text></View><Text style={styles.hostBookingMeta}>{formatDate(booking.date)} · {booking.time}</Text><Text style={styles.hostBookingMeta}>{booking.quantity} {booking.unit === 'Hora' ? 'hora(s)' : booking.unit === 'Día' ? 'día(s)' : 'semana(s)'} · {formatMoney(booking.total)}</Text><Text style={styles.hostBookingMeta}>Referencia Oficia: {booking.transferReference ?? '—'}</Text><Text style={styles.hostBookingMeta}>Folio del banco: {booking.payerReference ?? '—'}</Text><View style={styles.hostActions}><Pressable accessibilityRole="button" disabled={operationsBusy} accessibilityLabel={`Marcar no validado ${booking.id}`} onPress={() => reviewTransfer(booking, false)} style={styles.hostReject}><Text style={styles.hostRejectText}>No validar</Text></Pressable><Pressable accessibilityRole="button" disabled={operationsBusy} accessibilityLabel={`Validar depósito ${booking.id}`} onPress={() => reviewTransfer(booking, true)} style={styles.hostConfirm}><Text style={styles.hostConfirmText}>Validar y autorizar</Text></Pressable></View></View>; }) : <EmptyState icon="clock" title="Sin depósitos por revisar" message="Cuando un cliente reporte una transferencia, aparecerá aquí." />}</>}</ScrollView>}
    <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}><View style={styles.modalBackdrop}><Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" style={styles.modalScrim} onPress={() => setShowFilters(false)} /><SafeAreaView edges={['bottom']} style={styles.filterPanel}><View style={styles.filterHeader}><Text style={styles.filterTitle}>Filtrar espacios</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" onPress={() => setShowFilters(false)}><Icon name="close" size={21} color={palette.plum} /></Pressable></View><Text style={styles.filterLabel}>Ordenar por</Text><View style={styles.filterOptions}>{([{ mode: 'recommended' as const, label: 'Recomendados' }, { mode: 'price' as const, label: 'Menor precio' }, { mode: 'capacity' as const, label: 'Más capacidad' }]).map(option => <Pressable key={option.mode} accessibilityRole="button" accessibilityState={{ selected: sortMode === option.mode }} onPress={() => setSortMode(option.mode)} style={[styles.filterOption, sortMode === option.mode && styles.filterOptionActive]}><Text style={[styles.filterOptionText, sortMode === option.mode && styles.filterOptionTextActive]}>{option.label}</Text></Pressable>)}</View><Text style={styles.filterLabel}>Capacidad mínima</Text><View style={styles.filterOptions}>{[1, 2, 4, 8].map(value => <Pressable key={value} onPress={() => setCapacityFilter(value)} style={[styles.filterOption, capacityFilter === value && styles.filterOptionActive]}><Text style={[styles.filterOptionText, capacityFilter === value && styles.filterOptionTextActive]}>{value}+ {value === 1 ? 'persona' : 'personas'}</Text></Pressable>)}</View><Text style={styles.filterLabel}>Servicios incluidos</Text><View style={styles.filterOptions}>{['Internet rápido', 'Pantalla', 'Pizarrón', 'Proyector', 'Café', 'Climatización'].map(amenity => <Pressable key={amenity} onPress={() => setAmenityFilter(current => current.includes(amenity) ? current.filter(item => item !== amenity) : [...current, amenity])} style={[styles.filterOption, amenityFilter.includes(amenity) && styles.filterOptionActive]}><Text style={[styles.filterOptionText, amenityFilter.includes(amenity) && styles.filterOptionTextActive]}>{amenity}</Text></Pressable>)}</View><View style={styles.filterActions}><Pressable accessibilityRole="button" onPress={() => { setCapacityFilter(1); setAmenityFilter([]); setSortMode('recommended'); }} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Limpiar</Text></Pressable><PrimaryButton label={`Ver ${filtered.length} ${filtered.length === 1 ? 'espacio' : 'espacios'}`} onPress={() => { setShowFilters(false); setTab('Explorar'); }} style={{ flex: 1 }} /></View></SafeAreaView></View></Modal>
  </SafeAreaView>;
}

function amenityIcon(name: string): IconName {
  if (name.includes('Internet')) return 'wifi'; if (name.includes('Pantalla') || name.includes('Monitor')) return 'screen';
  if (name.includes('Pizarrón')) return 'board'; if (name.includes('Proyector')) return 'projector';
  if (name.includes('Café')) return 'coffee'; if (name.includes('Climatización')) return 'snow';
  if (name.includes('Videollamadas')) return 'users'; return 'power';
}

function CategoryRow({ category, onChange }: { category: Category; onChange: (next: Category) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{categories.map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: category === item.label }} onPress={() => onChange(item.label)} style={[styles.categoryChip, category === item.label && styles.categoryChipActive]}><Icon name={item.icon} size={18} color={category === item.label ? palette.white : palette.action} /><Text style={[styles.categoryText, category === item.label && styles.categoryTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>;
}

function SearchField({ value, onChange, onFilters, filterCount }: { value: string; onChange: (value: string) => void; onFilters: () => void; filterCount: number }) {
  return <View style={styles.exploreSearch}><Icon name="search" size={20} color={palette.action} /><TextInput value={value} onChangeText={onChange} placeholder="Busca por nombre, zona o servicio" placeholderTextColor="#9B8990" style={styles.searchInput} returnKeyType="search" />{value.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => onChange('')}><Icon name="close" size={18} color={palette.muted} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Abrir filtros" onPress={onFilters} style={styles.exploreFilter}><Icon name="filter" size={18} color={palette.action} />{filterCount > 0 && <View style={styles.filterDot} />}</Pressable></View>;
}

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return <View style={styles.tabBar}>{tabItems.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: active === item.label }} accessibilityLabel={item.label} onPress={() => onChange(item.label)} style={styles.tabItem}><View style={[styles.tabIcon, active === item.label && styles.tabIconActive]}><Icon name={item.icon} size={21} color={active === item.label ? palette.action : '#A69A9D'} filled={active === item.label && item.icon === 'heart'} /></View><Text style={[styles.tabLabel, active === item.label && styles.tabLabelActive]}>{item.label}</Text></Pressable>)}</View>;
}

function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <View style={styles.pageHeader}><Text style={styles.pageEyebrow}>{eyebrow}</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.pageSubtitle}>{subtitle}</Text></View>;
}

function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message: string; action?: string; onAction?: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Icon name={icon} size={35} color={palette.action} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyMessage}>{message}</Text>{action && onAction && <PrimaryButton label={action} onPress={onAction} style={{ marginTop: 22 }} />}</View>;
}

function Stat({ icon, text }: { icon: IconName; text: string }) {
  return <View style={styles.stat}><View style={styles.statIcon}><Icon name={icon} size={20} color={palette.action} /></View><Text style={styles.statText}>{text}</Text></View>;
}

function ReceiptItem({ label, value }: { label: string; value: string }) {
  return <View style={styles.receiptItem}><Text style={styles.receiptItemLabel}>{label}</Text><Text style={styles.receiptItemValue}>{value}</Text></View>;
}

export default function App() { return <SafeAreaProvider><AppContent /></SafeAreaProvider>; }

const authScreenStyles = StyleSheet.create({
  authScreen: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: palette.plum },
  authVideoShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(48, 24, 34, 0.52)' },
  authHero: { backgroundColor: 'rgba(81, 45, 55, 0.58)', borderColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, borderRadius: 28, paddingHorizontal: 21, paddingTop: 21, paddingBottom: 18, minHeight: 318, overflow: 'hidden', maxWidth: 520, width: '100%', alignSelf: 'center' },
  authDecorOne: { position: 'absolute', top: -72, right: -38, width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFFFFF1C' },
  authDecorTwo: { position: 'absolute', right: 43, top: 57, width: 82, height: 82, borderRadius: 41, borderWidth: 1, borderColor: '#FFFFFF35' },
  authBack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginBottom: 14, paddingVertical: 5 },
  authBackText: { color: palette.white, fontSize: 12, fontWeight: '800' },
  authHeroBrand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  authLogoFrame: { width: 60, height: 60, borderRadius: 19, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' },
  authBrandName: { color: palette.white, fontSize: 27, lineHeight: 30, fontWeight: '900', letterSpacing: -1 },
  authBrandTag: { color: palette.white, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  authHeroCopy: { marginTop: 25 },
  authLocation: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authLocationText: { color: palette.white, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  authHeroTitle: { color: palette.white, fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -.7, marginTop: 10 },
  authHeroSubtitle: { color: '#FFFFFFE8', fontSize: 12, lineHeight: 18, marginTop: 7 },
  authBenefits: { flexDirection: 'row', gap: 8, marginTop: 19 },
  authBenefit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#FFFFFF26', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  authBenefitText: { color: palette.white, fontSize: 10, fontWeight: '800' },
  authCardEyebrow: { color: palette.action, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  authCardResponsive: { width: '100%', maxWidth: 520, alignSelf: 'center', marginTop: -22 },
  authCardTitle: { color: palette.plum, fontSize: 25, lineHeight: 30, fontWeight: '900', marginTop: 7 },
  authCardSubtitle: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  authInputRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, paddingHorizontal: 13 },
  authInputField: { flex: 1, minHeight: 48, color: palette.plum, fontSize: 14, paddingVertical: 8 },
  authPrivacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  authFooter: { alignItems: 'center', paddingTop: 17, paddingBottom: 5 },
  authFooterText: { color: '#FFF3F3', fontSize: 10, textAlign: 'center' },
  signOutButton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 16, marginTop: 22 },
  signOutIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blush },
  signOutTitle: { color: palette.plum, fontSize: 13, fontWeight: '900' },
  signOutCaption: { color: palette.muted, fontSize: 10, marginTop: 4 },
});

const styles = StyleSheet.create({
  ...authScreenStyles,
  authContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 35 }, authCard: { backgroundColor: 'rgba(255, 249, 248, 0.96)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.62)', borderRadius: 23, padding: 22, marginTop: 20 }, authLabel: { color: palette.plum, fontSize: 12, fontWeight: '800', marginTop: 20, marginBottom: 8 }, authInput: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, paddingHorizontal: 14, color: palette.plum, fontSize: 14 }, googleButton: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, marginTop: 23 }, googleButtonDisabled: { opacity: .58 }, googleMark: { color: '#4285F4', fontSize: 19, fontWeight: '900' }, googleButtonText: { color: palette.plum, fontSize: 13, fontWeight: '800' }, authDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 19 }, authDividerLine: { flex: 1, height: 1, backgroundColor: palette.line }, authDividerText: { color: palette.muted, fontSize: 10 }, authNotice: { color: palette.action, fontSize: 12, lineHeight: 18, marginTop: 15 }, authSwitch: { alignItems: 'center', paddingVertical: 17, marginTop: 5 }, authSwitchText: { color: palette.action, fontSize: 12, fontWeight: '800', textAlign: 'center' }, authFootnote: { color: palette.muted, fontSize: 10, textAlign: 'center', lineHeight: 16 }, dataNotice: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: palette.blush, borderRadius: 12, padding: 12, marginHorizontal: 20, marginTop: 14 }, dataNoticeText: { flex: 1, color: palette.plum, fontSize: 11, lineHeight: 16 },
  root: { flex: 1, backgroundColor: palette.cream }, flex: { flex: 1 }, screenContent: { paddingBottom: 25 }, padded: { paddingHorizontal: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 }, loadingText: { color: palette.plum, fontSize: 14, fontWeight: '800' },
  exploreFilter: { marginLeft: 12, padding: 6 }, filterDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.action },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#35272C60' }, modalScrim: { flex: 1 }, filterPanel: { backgroundColor: palette.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 22 }, filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, filterTitle: { color: palette.plum, fontSize: 21, fontWeight: '900' }, filterLabel: { color: palette.plum, fontSize: 14, fontWeight: '900', marginTop: 24, marginBottom: 12 }, filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filterOption: { backgroundColor: palette.cream, borderColor: palette.line, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 11 }, filterOptionActive: { backgroundColor: palette.action, borderColor: palette.action }, filterOptionText: { color: palette.plum, fontSize: 11, fontWeight: '700' }, filterOptionTextActive: { color: palette.white }, filterActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30 }, clearFilters: { paddingHorizontal: 17, height: 52, justifyContent: 'center' }, clearFiltersText: { color: palette.action, fontSize: 13, fontWeight: '900' },
  hostEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, padding: 14, borderRadius: 17, marginTop: 25 }, hostEntryIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' }, hostEntryTitle: { color: palette.plum, fontSize: 14, fontWeight: '900' }, hostEntryText: { color: palette.muted, fontSize: 11, marginTop: 4 },
  hostContent: { paddingHorizontal: 20, paddingBottom: 40 }, hostBanner: { flexDirection: 'row', gap: 10, padding: 15, backgroundColor: palette.blush, borderRadius: 15, marginBottom: 26 }, hostBannerText: { color: palette.plum, fontSize: 11, lineHeight: 17, flex: 1 }, hostStats: { flexDirection: 'row', gap: 9, marginTop: 20, marginBottom: 26 }, hostStat: { flex: 1, backgroundColor: palette.white, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 13, alignItems: 'center' }, hostStatNumber: { color: palette.action, fontSize: 23, fontWeight: '900' }, hostStatLabel: { color: palette.muted, fontSize: 10, marginTop: 4 }, hostBooking: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 16, marginBottom: 12 }, hostBookingTop: { flexDirection: 'row', justifyContent: 'space-between' }, hostBookingSpace: { color: palette.plum, fontSize: 16, fontWeight: '900' }, hostBookingCode: { color: palette.muted, fontSize: 10 }, hostBookingMeta: { color: palette.muted, fontSize: 11, marginTop: 7 }, hostBookingStatus: { color: palette.action, fontSize: 11, fontWeight: '900', marginTop: 12 }, hostActions: { flexDirection: 'row', gap: 9, marginTop: 15 }, hostReject: { flex: 1, borderColor: palette.action, borderWidth: 1, borderRadius: 11, paddingVertical: 10, alignItems: 'center' }, hostRejectText: { color: palette.action, fontSize: 12, fontWeight: '800' }, hostConfirm: { flex: 1, backgroundColor: palette.action, borderRadius: 11, paddingVertical: 10, alignItems: 'center' }, hostConfirmText: { color: palette.white, fontSize: 12, fontWeight: '800' },
  welcome: { flexGrow: 1, justifyContent: 'space-between', backgroundColor: palette.white }, welcomeArt: { height: 335, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, welcomeCircle: { position: 'absolute', width: 410, height: 410, borderRadius: 205, backgroundColor: palette.blush, top: -28, right: -120 }, welcomePhotoWrap: { width: '72%', height: '76%', borderRadius: 140, overflow: 'hidden', borderWidth: 5, borderColor: palette.white, transform: [{ rotate: '-8deg' }], shadowColor: palette.plum, shadowOpacity: .2, shadowRadius: 22, elevation: 6 }, welcomePhoto: { width: '100%', height: '100%' }, welcomeMark: { position: 'absolute', right: 29, bottom: 31, padding: 6, backgroundColor: palette.white, borderRadius: 18 }, welcomeBottom: { paddingHorizontal: 26, paddingBottom: 34 }, welcomeTitle: { color: palette.plum, fontSize: 31, fontWeight: '900', letterSpacing: -1.4, lineHeight: 37, marginTop: 27 }, welcomeText: { color: palette.muted, fontSize: 14, lineHeight: 22, marginTop: 12 }, demoNote: { textAlign: 'center', color: palette.muted, fontSize: 11, marginTop: 14 },
  homeHeader: { backgroundColor: palette.coral, paddingHorizontal: 20, paddingTop: 17, paddingBottom: 26, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, homeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, locationOverline: { color: '#FFE0E4', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 }, headerLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }, headerLocationText: { color: palette.white, fontSize: 13, fontWeight: '800' }, bellButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF2E' }, homeTitle: { color: palette.white, fontSize: 29, fontWeight: '900', lineHeight: 35, letterSpacing: -.8, marginTop: 28 }, homeSubtitle: { color: '#FFE8EA', fontSize: 12, marginTop: 8 }, homeSearch: { height: 52, borderRadius: 14, backgroundColor: palette.white, flexDirection: 'row', alignItems: 'center', paddingLeft: 15, marginTop: 23 }, searchInput: { flex: 1, marginLeft: 9, color: palette.plum, fontSize: 13, minWidth: 0 }, searchAction: { width: 42, height: 42, borderRadius: 11, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 15 }, sectionTitle: { color: palette.ink, fontSize: 20, fontWeight: '900', letterSpacing: -.5 }, sectionLink: { color: palette.action, fontSize: 12, fontWeight: '800' }, sectionHint: { color: palette.muted, fontSize: 11 }, categoryRow: { gap: 9, paddingBottom: 5, paddingRight: 20 }, categoryChip: { flexDirection: 'row', gap: 6, alignItems: 'center', borderColor: palette.line, borderWidth: 1, backgroundColor: palette.white, borderRadius: 22, paddingHorizontal: 12, height: 42 }, categoryChipActive: { backgroundColor: palette.action, borderColor: palette.action }, categoryText: { color: palette.plum, fontSize: 11, fontWeight: '800' }, categoryTextActive: { color: palette.white },
  promo: { height: 160, borderRadius: 20, overflow: 'hidden', marginTop: 21 }, promoImage: { position: 'absolute', width: '100%', height: '100%' }, promoOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#35272CBF' }, promoContent: { padding: 21 }, promoBadge: { color: '#FFE3E6', fontWeight: '900', fontSize: 10, letterSpacing: 1.8 }, promoTitle: { color: palette.white, fontSize: 23, fontWeight: '900', lineHeight: 27, marginTop: 12 }, promoSub: { color: '#FFE3E6', fontSize: 12, marginTop: 7 }, horizontalCards: { paddingHorizontal: 20, paddingBottom: 6 },
  pageHeader: { paddingTop: 27, marginBottom: 22 }, pageEyebrow: { color: palette.action, fontSize: 10, fontWeight: '900', letterSpacing: 2.2 }, pageTitle: { color: palette.plum, fontSize: 29, fontWeight: '900', letterSpacing: -1, marginTop: 8 }, pageSubtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 7 }, exploreSearch: { backgroundColor: palette.white, borderColor: palette.line, borderWidth: 1, borderRadius: 15, height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 16 },
  mapToggle: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, gap: 3, borderRadius: 14, backgroundColor: '#F2E8E8', marginTop: 16 }, mapToggleItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 92, justifyContent: 'center', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9 }, mapToggleActive: { backgroundColor: palette.action }, mapToggleText: { color: palette.plum, fontSize: 11, fontWeight: '800' }, mapToggleTextActive: { color: palette.white }, mapNotice: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: palette.blush, padding: 11, borderRadius: 12, marginBottom: 10 }, mapNoticeText: { color: palette.plum, flex: 1, fontSize: 10, lineHeight: 15 }, mapResultList: { marginTop: 18 },
  tabBar: { flexDirection: 'row', height: 69, backgroundColor: palette.white, borderTopWidth: 1, borderTopColor: palette.line, justifyContent: 'space-around', paddingTop: 5 }, tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }, tabIcon: { width: 36, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, tabIconActive: { backgroundColor: palette.blush }, tabLabel: { color: '#A69A9D', fontSize: 9, fontWeight: '700' }, tabLabelActive: { color: palette.action, fontWeight: '900' },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 300, padding: 25, marginTop: 10, backgroundColor: palette.white, borderRadius: 23, borderWidth: 1, borderColor: palette.line }, emptyIcon: { width: 70, height: 70, backgroundColor: palette.blush, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, emptyTitle: { color: palette.plum, fontSize: 18, fontWeight: '900', textAlign: 'center' }, emptyMessage: { color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  reservationCard: { backgroundColor: palette.white, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: palette.line, marginBottom: 14 }, reservationStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 11 }, reservationStatusText: { color: palette.action, fontSize: 11, fontWeight: '800' }, reservationId: { color: palette.muted, fontSize: 10, marginLeft: 'auto' }, reservationBody: { flexDirection: 'row', gap: 13 }, reservationPhoto: { width: 88, height: 88, borderRadius: 12 }, reservationInfo: { flex: 1 }, reservationName: { color: palette.plum, fontSize: 15, fontWeight: '900' }, reservationMeta: { color: palette.muted, fontSize: 11, marginTop: 5 }, reservationPrice: { color: palette.action, fontWeight: '900', fontSize: 12, marginTop: 8 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: palette.white, padding: 17, borderRadius: 20, marginBottom: 29, borderWidth: 1, borderColor: palette.line }, profileAvatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blush }, profileTitle: { color: palette.plum, fontWeight: '900', fontSize: 15 }, profileMeta: { color: palette.muted, fontSize: 12, marginTop: 5 }, bodyCopy: { color: palette.muted, fontSize: 13, lineHeight: 21, marginTop: 11 }, profileInfo: { flexDirection: 'row', gap: 13, backgroundColor: palette.blush, borderRadius: 18, padding: 17, marginTop: 25 }, profileInfoTitle: { color: palette.plum, fontWeight: '900', fontSize: 13 }, profileInfoText: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, profileBrand: { alignItems: 'center', marginTop: 48, marginBottom: 20 },
  detailHero: { height: 310 }, heroPhoto: { width: '100%', height: '100%' }, heroButton: { position: 'absolute', top: 17, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white }, heroThumbs: { position: 'absolute', bottom: 19, left: 20, flexDirection: 'row', gap: 6 }, heroThumb: { width: 55, height: 45, borderWidth: 2, borderColor: palette.white, borderRadius: 7, overflow: 'hidden' }, heroThumbActive: { borderColor: palette.coral }, heroThumbImage: { width: '100%', height: '100%' }, detailBody: { backgroundColor: palette.cream, borderTopLeftRadius: 27, borderTopRightRadius: 27, marginTop: -18, paddingTop: 24, paddingHorizontal: 21 }, detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, detailType: { color: palette.action, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, ratingDetail: { flexDirection: 'row', alignItems: 'center', gap: 5 }, ratingDetailText: { color: palette.muted, fontSize: 11 }, detailSampleBadge: { backgroundColor: palette.blush, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }, detailSampleText: { color: palette.action, fontSize: 9, fontWeight: '900', letterSpacing: .8 }, detailName: { color: palette.plum, fontSize: 28, fontWeight: '900', marginTop: 10, letterSpacing: -.8 }, locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 }, detailArea: { color: palette.muted, fontSize: 12 }, detailStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line }, stat: { alignItems: 'center', width: '32%' }, statIcon: { width: 37, height: 37, backgroundColor: palette.blush, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, statText: { color: palette.muted, fontSize: 10, textAlign: 'center', marginTop: 7 }, detailTabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: palette.line, marginTop: 15, marginBottom: 24 }, detailTab: { paddingHorizontal: 12, paddingVertical: 13, marginRight: 12 }, detailTabActive: { borderBottomWidth: 3, borderBottomColor: palette.action }, detailTabText: { color: palette.muted, fontSize: 12, fontWeight: '700' }, detailTabTextActive: { color: palette.action, fontWeight: '900' }, detailHeading: { color: palette.plum, fontSize: 17, fontWeight: '900', marginTop: 1, marginBottom: 3 }, amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, amenity: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: palette.white, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: palette.line }, amenityText: { color: palette.plum, fontSize: 11, fontWeight: '700' }, privacyBox: { flexDirection: 'row', gap: 9, backgroundColor: palette.blush, padding: 13, borderRadius: 13, marginTop: 22 }, privacyText: { color: palette.plum, flex: 1, fontSize: 12, lineHeight: 18 }, galleryPhoto: { width: '100%', height: 200, borderRadius: 14, marginTop: 12 }, reviewBox: { backgroundColor: palette.white, borderRadius: 17, padding: 22, alignItems: 'center' }, reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 5 }, reviewNumber: { color: palette.plum, fontSize: 30, fontWeight: '900' }, reviewCaption: { color: palette.action, fontSize: 12, fontWeight: '800', marginTop: 4 },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: palette.white, borderTopWidth: 1, borderColor: palette.line, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, footerLabel: { color: palette.muted, fontSize: 10 }, footerPrice: { color: palette.action, fontWeight: '900', fontSize: 17, marginTop: 3 }, footerUnit: { color: palette.muted, fontSize: 10, fontWeight: '400' },
  bookingContent: { paddingHorizontal: 20, paddingBottom: 125 }, innerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 20 }, roundBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.white, justifyContent: 'center', alignItems: 'center' }, innerHeaderTitle: { color: palette.plum, fontSize: 17, fontWeight: '900' }, bookingSpace: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, bookingImage: { width: 78, height: 78, borderRadius: 11 }, bookingSpaceTitle: { color: palette.plum, fontSize: 16, fontWeight: '900' }, bookingSpaceMeta: { color: palette.muted, fontSize: 11, marginTop: 5 }, bookingLabel: { color: palette.plum, fontSize: 16, fontWeight: '900', marginTop: 26, marginBottom: 13 }, unitRow: { flexDirection: 'row', gap: 8 }, unitButton: { flex: 1, minHeight: 69, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }, unitButtonSelected: { borderColor: palette.action, backgroundColor: palette.action }, unitText: { color: palette.plum, fontSize: 12, fontWeight: '900' }, unitTextSelected: { color: palette.white }, unitPrice: { color: palette.muted, fontSize: 9, marginTop: 5 }, dateRow: { gap: 9, paddingRight: 20 }, dateChip: { width: 58, height: 68, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }, dateChipActive: { backgroundColor: palette.action, borderColor: palette.action }, dateDay: { color: palette.muted, fontSize: 10, fontWeight: '800' }, dateNumber: { color: palette.plum, fontSize: 19, fontWeight: '900', marginTop: 5 }, dateChipTextActive: { color: palette.white }, slotDisabled: { opacity: .36 }, timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, timeChip: { width: '22.8%', borderColor: palette.line, borderWidth: 1, backgroundColor: palette.white, paddingVertical: 10, alignItems: 'center', borderRadius: 12 }, timeChipActive: { backgroundColor: palette.action, borderColor: palette.action }, timeText: { color: palette.plum, fontSize: 12, fontWeight: '800' }, timeTextActive: { color: palette.white }, quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.white, borderRadius: 15, padding: 14 }, quantityTitle: { color: palette.plum, fontSize: 14, fontWeight: '800' }, quantityHint: { color: palette.muted, fontSize: 10, marginTop: 4 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stepButton: { width: 28, height: 28, borderRadius: 9, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' }, stepValue: { color: palette.plum, fontSize: 14, fontWeight: '900' }, summary: { backgroundColor: palette.white, padding: 17, borderRadius: 18, marginTop: 24 }, summaryTitle: { color: palette.plum, fontWeight: '900', fontSize: 15, marginBottom: 13 }, summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }, summaryMuted: { color: palette.muted, fontSize: 11, flex: 1 }, summaryStrong: { color: palette.plum, fontSize: 12, fontWeight: '800' }, summaryRule: { height: 1, backgroundColor: palette.line, marginVertical: 14 }, summaryTotal: { color: palette.action, fontWeight: '900', fontSize: 17 }, summaryNote: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 13 },
  receiptContent: { padding: 22, paddingBottom: 50 }, receiptTop: { alignItems: 'center', paddingTop: 35, paddingBottom: 26 }, receiptIcon: { width: 72, height: 72, borderRadius: 23, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }, receiptTitle: { color: palette.plum, fontSize: 25, fontWeight: '900', marginTop: 18 }, receiptSubtitle: { color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 7 }, receiptCard: { backgroundColor: palette.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: palette.line }, receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, receiptCode: { color: palette.muted, fontSize: 10 }, dashedLine: { borderBottomWidth: 1, borderColor: palette.line, borderStyle: 'dashed', marginVertical: 20 }, receiptSpace: { color: palette.plum, fontSize: 21, fontWeight: '900' }, receiptArea: { color: palette.muted, fontSize: 12, marginTop: 5 }, receiptDetail: { marginTop: 23, gap: 16 }, receiptItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, receiptItemLabel: { color: palette.muted, fontSize: 12 }, receiptItemValue: { color: palette.plum, fontSize: 12, fontWeight: '800', textAlign: 'right', flex: 1 }, receiptNotice: { backgroundColor: palette.blush, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, marginTop: 25 }, receiptNoticeText: { flex: 1, color: palette.plum, fontSize: 11, lineHeight: 17 }, receiptHome: { alignItems: 'center', paddingVertical: 17 }, receiptHomeText: { color: palette.action, fontSize: 13, fontWeight: '800' }, bankCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 17, gap: 13, marginTop: 17 }, bankSettingsCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 17, marginBottom: 28 }, bankTitle: { color: palette.plum, fontSize: 16, fontWeight: '900', marginBottom: 3 }, bankLabel: { color: palette.plum, fontSize: 11, fontWeight: '800', marginTop: 13, marginBottom: 7 }, bankInput: { minHeight: 46, borderWidth: 1, borderColor: palette.line, borderRadius: 12, backgroundColor: palette.cream, paddingHorizontal: 12, color: palette.plum, fontSize: 13 }, bankInstructionsInput: { minHeight: 74, paddingTop: 11, textAlignVertical: 'top' }, bankInstructions: { color: palette.muted, fontSize: 10, lineHeight: 16 },
});
