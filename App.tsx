import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { AsyncStorage } from './src/storage';
import { Session, User } from '@supabase/supabase-js';
import { SafeAreaProvider, SafeAreaView } from './src/components/SafeArea';
import { Brand, Mark } from './src/components/Brand';
import { Icon, IconName } from './src/components/Icon';
import { PrimaryButton, SpaceCard, SpacePhoto } from './src/components/UI';
import { Booking, Category, Space, Tab, Unit, categories, estimatedEnd, formatDate, formatMoney, nextDates, spaces } from './src/data';
import { palette } from './src/theme';
import { backendConfigured, BookingRow, mapBooking, mapSpace, SpaceRow, supabase } from './src/backend';
import { signInWithGoogle, signOutFromGoogle } from './src/googleAuth';
import { AuthVideoBackground } from './src/components/AuthVideoBackground';
import { confirmInBrowser, showMessage } from './src/dialogs';
import { OpenStreetMap } from './src/components/OpenStreetMap';
import { myBookings as selectMyBookings } from './src/visibility';
import { AccountType, ensureAccountType, isAccountType } from './src/profiles';
import { RoleChoice } from './src/components/RoleChoice';
import { OwnerDashboard } from './src/components/OwnerDashboard';
import { OperationsDraftReview, ReviewDraft } from './src/components/OperationsDraftReview';
import { BusyInterval, slotAvailability } from './src/availability';
import { ProfileEditor } from './src/components/ProfileEditor';
import { SpaceReviews } from './src/components/SpaceReviews';
import { OperationsReviews } from './src/components/OperationsReviews';
import { profileAvatarUrl, profileDisplayName } from './src/profileMetadata';
import { deactivatePushForUser, enablePushForUser, getPushPermission } from './src/pushNotifications';
import { NotificationSettings } from './src/components/NotificationSettings';
import { OperationsNotifications } from './src/components/OperationsNotifications';

type Screen = 'welcome' | 'tabs' | 'detail' | 'booking' | 'receipt' | 'host' | 'operations' | 'auth' | 'chooseRole' | 'owner';
type DetailSection = 'Acerca de' | 'Galería' | 'Opiniones';
type SortMode = 'recommended' | 'price' | 'capacity';
const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'];
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
  const [closedDates, setClosedDates] = useState<ReadonlySet<string>>(new Set());
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [catalog, setCatalog] = useState(spaces);
  const updateReviewSummary = useCallback((spaceId: string, average: number, count: number) => {
    const rating = count ? average.toFixed(1) : 'Nuevo';
    setCatalog(current => current.map(space => space.id === spaceId ? { ...space, rating, reviewCount: count } : space));
    setSelected(current => current?.id === spaceId ? { ...current, rating, reviewCount: count } : current);
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [pendingAccountType, setPendingAccountType] = useState<AccountType | null>(null);
  const [authReady, setAuthReady] = useState(!backendConfigured);
  const [hostSpaceIds, setHostSpaceIds] = useState<string[]>([]);
  const [isOperations, setIsOperations] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([]);
  const [operationsBusy, setOperationsBusy] = useState(false);
  const [operationsNotice, setOperationsNotice] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authMode, setAuthMode] = useState<'entrar' | 'crear' | 'recuperar' | 'nueva'>('entrar');
  const passwordRecoveryFlow = useRef(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [pendingBooking, setPendingBooking] = useState(false);
  const [reservationsLoadError, setReservationsLoadError] = useState(false);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [capacityFilter, setCapacityFilter] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [dates, setDates] = useState(() => nextDates(14));
  const [pushPromptVisible, setPushPromptVisible] = useState(false);
  const [foregroundNotification, setForegroundNotification] = useState<{ title?: string; body?: string; data?: Record<string, unknown> } | null>(null);
  const handlePushOpen = useCallback((data: Record<string, unknown>) => {
    setForegroundNotification(null);
    if (data.screen === 'owner' && accountType === 'anfitrion') setScreen('owner');
    else if (data.screen === 'reservations' || data.screen === 'reviews') { setTab('Reservas'); setScreen('tabs'); }
    else setScreen(accountType === 'anfitrion' ? 'owner' : 'tabs');
  }, [accountType]);
  const handleForegroundPush = useCallback((notification: { title?: string; body?: string; data?: Record<string, unknown> }) => {
    setForegroundNotification(notification);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('oficia_screen')) {
      handlePushOpen({ screen: url.searchParams.get('oficia_screen') ?? 'home', bookingId: url.searchParams.get('oficia_bookingId') ?? undefined, spaceId: url.searchParams.get('oficia_spaceId') ?? undefined });
      url.searchParams.delete('oficia_screen');
      url.searchParams.delete('oficia_bookingId');
      url.searchParams.delete('oficia_spaceId');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [handlePushOpen]);
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
    const [hostResult, bookingResult, operatorResult] = await Promise.all([
      supabase.from('spaces').select('id').eq('host_id', userId),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.rpc('is_oficia_operations'),
    ]);
    if (hostResult.error) throw hostResult.error;
    if (bookingResult.error) throw bookingResult.error;
    if (operatorResult.error) throw operatorResult.error;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user.id !== userId) return;
    const ownHostIds = (hostResult.data ?? []).map(row => row.id as string);
    const operator = operatorResult.data === true;
    if (operator) {
      const result = await supabase.from('space_drafts').select('id,name,area,city,address,latitude,longitude,open_days,opens_at,closes_at,category,capacity,amenities,privacy,image_url,photo_path,rate_hour_cents,rate_day_cents,rate_week_cents,description').eq('status', 'en_revision').order('created_at', { ascending: true });
      if (result.error) throw result.error;
      setReviewDrafts((result.data ?? []) as ReviewDraft[]);
    } else setReviewDrafts([]);
    const visibleBookings = operator ? (bookingResult.data ?? []) : (bookingResult.data ?? []).filter((row: { client_id: string; space_id: string }) => row.client_id === userId || ownHostIds.includes(row.space_id));
    setHostSpaceIds(ownHostIds);
    setIsOperations(operator);
    setBookings(visibleBookings.map(row => mapBooking(row as BookingRow)));
  };
  const resolveProfile = async (signedUser: User) => {
    if (!supabase) return;
    const client = supabase;
    const savedChoice = await AsyncStorage.getItem('oficia:pending-account-type');
    const role = await ensureAccountType(
      async () => { const result = await client.from('oficia_profiles').select('account_type').eq('user_id', signedUser.id).maybeSingle(); if (result.error) throw result.error; return result.data?.account_type ?? null; },
      async requested => { const result = await client.from('oficia_profiles').insert({ user_id: signedUser.id, account_type: requested }).select('account_type').single(); if (result.error) throw result.error; return result.data.account_type; },
      isAccountType(savedChoice) ? savedChoice : null,
    );
    if (!role) { setAccountType(null); setScreen('chooseRole'); return; }
    await AsyncStorage.removeItem('oficia:pending-account-type');
    setPendingAccountType(null);
    setAccountType(role);
    setScreen(role === 'anfitrion' ? 'owner' : 'tabs');
    setAuthBusy(false); setAuthPassword(''); setAuthNotice('');
    // Cargar reservas/panel no debe revertir ni ocultar un perfil que ya quedó resuelto.
    await refreshRemoteData(signedUser.id)
      .then(() => setReservationsLoadError(false))
      .catch(() => setReservationsLoadError(true));
  };
  const chooseAccountType = async (role: AccountType) => {
    setPendingAccountType(role);
    if (user && supabase) {
      try {
        const client = supabase;
        const resolved = await ensureAccountType(
          async () => { const result = await client.from('oficia_profiles').select('account_type').eq('user_id', user.id).maybeSingle(); if (result.error) throw result.error; return result.data?.account_type ?? null; },
          async requested => { const result = await client.from('oficia_profiles').insert({ user_id: user.id, account_type: requested }).select('account_type').single(); if (result.error) throw result.error; return result.data.account_type; },
          role,
        );
        if (!resolved) throw new Error('No se encontró ni creó el perfil de la cuenta.');
        setAccountType(resolved);
        setScreen(resolved === 'anfitrion' ? 'owner' : 'tabs');
        setPendingAccountType(null);
        await AsyncStorage.removeItem('oficia:pending-account-type');
        await refreshRemoteData(user.id)
          .then(() => setReservationsLoadError(false))
          .catch(() => setReservationsLoadError(true));
      } catch {
        showMessage('No pudimos revisar tu cuenta', 'Revisa tu conexión e inténtalo de nuevo. Tu perfil y tipo de cuenta se conservarán.');
      }
      return;
    }
    await AsyncStorage.setItem('oficia:pending-account-type', role);
    setAuthMode('crear'); setAuthNotice(''); setScreen('auth');
  };
  const continueSignedIn = async () => {
    if (!user) { setScreen('auth'); return; }
    try { await resolveProfile(user); }
    catch { showMessage('No pudimos abrir tu cuenta', 'Revisa tu conexión e inténtalo de nuevo.'); }
  };
  const saveProfile = async (name: string, avatarUrl: string) => {
    if (!supabase || !user) return;
    if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) throw new Error('La foto debe usar un enlace HTTPS.');
    const { data, error } = await supabase.auth.updateUser({ data: { ...user.user_metadata, full_name: name, avatar_url: avatarUrl || null } });
    if (error) throw error;
    if (data.user) setUser(data.user);
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
      Promise.all([
        supabase.from('spaces').select('*').eq('is_published', true).order('created_at', { ascending: true }),
        supabase.from('space_review_summaries').select('space_id,average_rating,review_count'),
      ])
        .then(([{ data, error }, { data: summaryRows, error: summaryError }]) => {
          if (!active) return;
          if (error) throw error;
          if (summaryError) throw summaryError;
          if (data?.length) {
            const summaries = new Map((summaryRows ?? []).map(row => [row.space_id as string, row]));
            setCatalog((data as SpaceRow[]).map(row => {
              const space = mapSpace(row); const summary = summaries.get(row.id);
              const count = Number(summary?.review_count ?? 0); const average = Number(summary?.average_rating ?? 0);
              return { ...space, rating: count ? average.toFixed(1) : 'Nuevo', reviewCount: count };
            }));
          }
        }).catch(() => { /* El catálogo local ya distingue los espacios de muestra. */ });
      supabase.auth.getSession().then(async ({ data, error }) => {
        if (!active) return;
        const session = error ? null : data.session;
        setUser(session?.user ?? null);
        if (passwordRecoveryFlow.current && session) {
          setAuthMode('nueva'); setAuthBusy(false); setScreen('auth'); setAuthReady(true);
          return;
        }
        if (!session) setScreen('chooseRole');
        if (error) setAuthNotice('No pudimos validar tu sesión. Inicia sesión para continuar.');
        if (session) await resolveProfile(session.user).catch(() => { if (active) setScreen('chooseRole'); });
        if (active) setAuthReady(true);
      }).catch(() => { if (active) { setAuthReady(true); setScreen('chooseRole'); setAuthNotice('No pudimos validar tu sesión. Inicia sesión para continuar.'); } });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
        if (_event === 'INITIAL_SESSION') return;
        setUser(session?.user ?? null);
        if (_event === 'PASSWORD_RECOVERY') {
          passwordRecoveryFlow.current = true;
          setAuthMode('nueva'); setAuthBusy(false); setAuthNotice('Elige una contraseña nueva para tu cuenta.'); setScreen('auth');
          return;
        }
        if (session) {
          if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
            // Evita llamar a la API de Auth dentro del callback de Auth.
            if (!passwordRecoveryFlow.current) setTimeout(() => { resolveProfile(session.user).catch(() => setScreen('chooseRole')); }, 0);
          }
        } else {
          setBookings([]); setReservationsLoadError(false); setHostSpaceIds([]); setIsOperations(false); setReviewDrafts([]); setLatestBooking(null); setAccountType(null);
          if (backendConfigured && _event === 'SIGNED_OUT') { setPendingBooking(false); setScreen('chooseRole'); }
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
    if (!user || !accountType) return;
    let active = true;
    const startPush = async () => {
      const permission = await getPushPermission();
      if (!active) return;
      if (permission === 'granted') {
        await enablePushForUser(user.id, handlePushOpen, handleForegroundPush);
        return;
      }
      if (permission === 'denied') return;
      const asked = await AsyncStorage.getItem(`oficia:push-prompted:${user.id}`);
      if (!asked && active) setPushPromptVisible(true);
    };
    void startPush().catch(() => {});
    return () => { active = false; };
  }, [user?.id, accountType, handlePushOpen, handleForegroundPush]);
  useEffect(() => {
    if (!hydrated) return;
    const key = backendConfigured ? (user?.id && favoritesOwner === user.id ? `oficia:favorites:${user.id}` : null) : 'oficia:favorites';
    if (key) AsyncStorage.setItem(key, JSON.stringify(favorites)).catch(() => {});
  }, [favorites, favoritesOwner, hydrated, user?.id]);
  useEffect(() => { if (hydrated && !backendConfigured) AsyncStorage.setItem('oficia:bookings', JSON.stringify(bookings)).catch(() => {}); }, [bookings, hydrated]);
  useEffect(() => {
    if (backendConfigured && authReady && !user && screen !== 'auth' && screen !== 'chooseRole') {
      setPendingBooking(false);
      setScreen('chooseRole');
    }
  }, [authReady, user, screen]);
  const toggleFavorite = (id: string) => {
    if (backendConfigured && (!user || favoritesOwner !== user.id)) return;
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };
  const openSpace = (space: Space) => { setSelected(space); setDetailImageIndex(0); setDetailSection('Acerca de'); setScreen('detail'); };
  const openBooking = async () => {
    if (accountType === 'anfitrion') { setScreen('owner'); return; }
    if (backendConfigured && !user) { setPendingBooking(true); setAuthNotice('Inicia sesión para enviar y consultar tus solicitudes.'); setScreen('auth'); return; }
    if (!selected) return;
    const freshDates = nextDates(14);
    setAvailabilityBusy(true); setAvailabilityError(false); setClosedDates(new Set()); setBusyIntervals([]);
    setDates(freshDates);
    setUnit('Hora'); setQuantity(1); setScreen('booking');
    let closures = new Set<string>();
    let occupied: BusyInterval[] = [];
    if (supabase && !selected.isDemo) {
      const [closureResult, busyResult] = await Promise.all([
        supabase.from('space_closures').select('closed_on').eq('space_id', selected.id)
          .gte('closed_on', freshDates[0].key).lte('closed_on', nextDates(43).at(-1)?.key ?? freshDates[0].key),
        supabase.from('space_busy_intervals').select('starts_at,ends_at').eq('space_id', selected.id)
          .gte('ends_at', new Date().toISOString())
          .lt('starts_at', new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      if (closureResult.error || busyResult.error) { setAvailabilityBusy(false); setAvailabilityError(true); return; }
      closures = new Set((closureResult.data ?? []).map(row => row.closed_on as string));
      occupied = (busyResult.data ?? []).map(row => ({ startsAt: row.starts_at as string, endsAt: row.ends_at as string }));
    }
    setBusyIntervals(occupied);
    const next = freshDates.flatMap(date => times.map(time => ({ date: date.key, time })))
      .find(slot => !slotAvailability(selected, slot.date, slot.time, 'Hora', 1, closures, new Date(), occupied));
    setClosedDates(closures);
    if (next) { setSelectedDate(next.date); setSelectedTime(next.time); }
    setAvailabilityBusy(false);
  };
  const reloadReservations = async () => {
    if (!user) return;
    try { await refreshRemoteData(user.id); setReservationsLoadError(false); }
    catch { setReservationsLoadError(true); }
  };
  const chooseTab = (next: Tab) => { if (accountType === 'anfitrion') { setScreen('owner'); return; } setTab(next); setScreen('tabs'); setSearch(''); setCategory('Todos'); setAmenityFilter([]); setCapacityFilter(1); setSortMode('recommended'); if (next === 'Reservas') void reloadReservations(); };
  const goBack = () => { if (screen === 'booking') setScreen('detail'); else if (screen === 'receipt') chooseTab('Reservas'); else if (screen === 'operations' && accountType === 'anfitrion') setScreen('owner'); else if (screen === 'host' || screen === 'operations') chooseTab('Perfil'); else setScreen(accountType === 'anfitrion' ? 'owner' : 'tabs'); };
  const openBookingTicket = async (booking: Booking) => {
    let current = booking;
    if (supabase && booking.remoteId) {
      const { data, error } = await supabase.from('bookings').select('*').eq('id', booking.remoteId).maybeSingle();
      if (!error && data) current = mapBooking(data as BookingRow);
    }
    setLatestBooking(current);
    setScreen('receipt');
  };

  const shareTicket = async () => {
    if (!latestBooking || !bookingSpace) return;
    const lines = [
      bookingSpace.isDemo ? 'OFICIA · DEMOSTRACIÓN' : 'OFICIA · TICKET INFORMATIVO',
      `Folio: ${latestBooking.transferReference ?? latestBooking.id}`,
      `Espacio: ${bookingSpace.name}`,
      `Inicio: ${formatDate(latestBooking.date)}, ${latestBooking.time}`,
      `Estancia: ${latestBooking.quantity} ${latestBooking.unit.toLowerCase()}${latestBooking.quantity === 1 ? '' : 's'}`,
      `Importe ${bookingSpace.isDemo ? 'ilustrativo' : 'estimado'}: ${formatMoney(latestBooking.total)}`,
      `Estado: ${latestBooking.status}`,
      'Este ticket no es un comprobante de pago ni una reserva confirmada. Oficia no cobra dinero.',
    ];
    const text = lines.join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: `Oficia · ${latestBooking.id}`, text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showMessage('Ticket copiado', 'Puedes pegar el resumen donde lo necesites.');
      } else {
        showMessage('Compartir no disponible', 'Consulta tu ticket desde Mis reservas.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      showMessage('No se pudo compartir', 'Intenta de nuevo desde el ticket.');
    }
  };

  const reviewSpaceDraft = async (id: string, approve: boolean, reason: string) => {
    if (!supabase || !isOperations) return;
    setOperationsBusy(true); setOperationsNotice('');
    let publicPhotoPath: string | null = null;
    try {
      if (approve) {
        const draft = reviewDrafts.find(item => item.id === id);
        if (!draft) throw new Error('Ficha no disponible');
        let imageUrl = draft.image_url.trim();
        if (draft.photo_path) {
          const { data: photo, error: downloadError } = await supabase.storage.from('oficia-space-drafts').download(draft.photo_path);
          if (downloadError || !photo) throw downloadError ?? new Error('Foto no disponible');
          const extension = draft.photo_path.split('.').pop()?.toLowerCase();
          if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) throw new Error('Formato de foto inválido');
          publicPhotoPath = `${id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from('oficia-space-media').upload(publicPhotoPath, photo, { contentType: photo.type || 'image/jpeg', upsert: false });
          if (uploadError) throw uploadError;
          imageUrl = supabase.storage.from('oficia-space-media').getPublicUrl(publicPhotoPath).data.publicUrl;
        }
        const { error } = await supabase.rpc('publish_space_draft', { p_draft_id: id, p_image_url: imageUrl });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('space_drafts').update({ status: 'rechazado', rejection_reason: reason.trim() }).eq('id', id).eq('status', 'en_revision');
        if (error) throw error;
      }
      setReviewDrafts(current => current.filter(item => item.id !== id));
      setOperationsNotice(approve ? 'Espacio publicado y visible para clientes.' : 'Ficha devuelta al dueño con observaciones.');
    } catch {
      if (publicPhotoPath) {
        const { data: published, error: lookupError } = await supabase.from('spaces').select('id').eq('id', id).eq('is_demo', false).maybeSingle();
        if (!lookupError && !published) await supabase.storage.from('oficia-space-media').remove([publicPhotoPath]).catch(() => {});
      }
      setOperationsNotice(approve ? 'No se pudo publicar. Revisa la ficha y vuelve a intentar.' : 'No se pudo devolver la ficha. Actualiza e inténtalo de nuevo.');
    } finally { setOperationsBusy(false); }
  };

  const submitBooking = async () => {
    if (!selected) return;
    if (availabilityBusy || availabilityError) return;
    const unavailable = slotAvailability(selected, selectedDate, selectedTime, unit, quantity, closedDates, new Date(), busyIntervals);
    if (unavailable) {
      showMessage('Horario no disponible', unavailable);
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


  const submitAuth = async () => {
    if (!supabase || !authEmail.trim() || authPassword.length < 8) { setAuthNotice('Escribe un correo y una contraseña de al menos 8 caracteres.'); return; }
    setAuthBusy(true); setAuthNotice('');
    try {
      if (authMode === 'crear') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        if (!data.session || !data.user) { setAuthNotice('Te enviamos un correo para confirmar tu cuenta. Después vuelve e inicia sesión.'); return; }
        setUser(data.user); await resolveProfile(data.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
        setUser(data.user); await resolveProfile(data.user);
      }
      setPendingBooking(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const normalized = message.toLowerCase();
      setAuthNotice(normalized.includes('invalid login credentials') ? 'El correo o la contraseña no son correctos.'
        : normalized.includes('user already registered') ? 'Ya existe una cuenta con ese correo. Inicia sesión.'
        : normalized.includes('email not confirmed') ? 'Confirma tu correo desde el enlace que te enviamos.'
        : normalized.includes('rate limit') || normalized.includes('too many requests') ? 'Espera un momento antes de volver a intentarlo.'
        : normalized.includes('fetch') || normalized.includes('network') ? 'Revisa tu conexión e inténtalo de nuevo.'
        : 'No pudimos completar el acceso. Revisa tus datos e inténtalo de nuevo.');
    } finally { setAuthBusy(false); }
  };

  const requestPasswordReset = async () => {
    const email = authEmail.trim();
    if (!supabase || !email || !email.includes('@')) { setAuthNotice('Escribe el correo de tu cuenta.'); return; }
    setAuthBusy(true); setAuthNotice('');
    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? (import.meta.env.VITE_AUTH_REDIRECT_URL ?? 'https://oficia-delicias.vercel.app')
        : window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setAuthNotice('Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      setAuthNotice(message.includes('rate limit') || message.includes('too many requests')
        ? 'Espera un momento antes de solicitar otro enlace.'
        : message.includes('fetch') || message.includes('network')
          ? 'Revisa tu conexión e inténtalo de nuevo.'
          : 'No pudimos enviar el enlace. Revisa tu conexión e inténtalo de nuevo.');
    } finally { setAuthBusy(false); }
  };

  const saveNewPassword = async () => {
    if (!supabase || authPassword.length < 8) { setAuthNotice('Usa una contraseña de al menos 8 caracteres.'); return; }
    if (authPassword !== authPasswordConfirm) { setAuthNotice('Las contraseñas no coinciden.'); return; }
    setAuthBusy(true); setAuthNotice('');
    try {
      const { error } = await supabase.auth.updateUser({ password: authPassword });
      if (error) throw error;
      passwordRecoveryFlow.current = false;
      setAuthPassword(''); setAuthPasswordConfirm(''); setAuthMode('entrar');
      setAuthNotice('Contraseña actualizada. Ya puedes iniciar sesión.');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      setAuthNotice(message.includes('same_password') || message.includes('different from the old')
        ? 'Elige una contraseña diferente a la anterior.'
        : message.includes('password') ? 'La contraseña debe tener al menos 8 caracteres.'
        : 'No pudimos actualizar la contraseña. Abre de nuevo el enlace del correo e inténtalo.');
    } finally { setAuthBusy(false); }
  };

  const submitGoogleAuth = async () => {
    setAuthBusy(true); setAuthNotice('');
Warning: truncated output (original token count: 12193)
Total output lines: 130

    try {
      const signedIn = await signInWithGoogle();
      if (!signedIn) setAuthBusy(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const statusCode = message.match(/GOOGLE_AUTH_STATUS_(\d+)/)?.[1];
      const normalized = message.toLowerCase();
      setAuthNotice(statusCode === '10' ? 'Google no validó esta instalación de Oficia. Actualiza la app desde Google Play y vuelve a intentar.'
        : statusCode === '7' ? 'Revisa tu conexión e inténtalo de nuevo.'
        : statusCode === '12500' ? 'Google no pudo terminar el acceso. Revisa tu conexión y los Servicios de Google Play.'
        : normalized.includes('invalid') && (normalized.includes('token') || normalized.includes('identity'))
          ? 'Google abrió tu cuenta, pero no pudo validarla. Intenta de nuevo.'
          : 'No se pudo completar el acceso con Google. Prueba otra vez o inicia sesión con tu correo.');
      setAuthBusy(false);
    }
  };

  const confirmSignOut = async () => {
    if (!await confirmInBrowser('Cerrar sesión', '¿Quieres salir de tu cuenta de Oficia?')) return;
    if (user) await deactivatePushForUser(user.id).catch(() => {});
    try { await signOutFromGoogle(); } catch { /* Supabase revoca la sesión aunque Google no pueda cerrar su selector. */ }
    const { error } = await supabase?.auth.signOut() ?? { error: new Error('No hay conexión de autenticación.') };
    if (error) { showMessage('No se pudo cerrar sesión', error.message); return; }
    await AsyncStorage.removeItem('oficia:pending-account-type');
    setUser(null); setAccountType(null);
    setPendingAccountType(null); setPendingBooking(false); setAuthMode('entrar'); setAuthNotice(''); setScreen('chooseRole');
  };

  const slotReasonFor = (date: string, time: string, chosenUnit = unit, chosenQuantity = quantity) => selected
    ? slotAvailability(selected, date, time, chosenUnit, chosenQuantity, closedDates, new Date(), busyIntervals)
    : 'Elige un espacio';
  const selectedSlotReason = slotReasonFor(selectedDate, selectedTime);
  if (!hydrated || (backendConfigured && !authReady)) return <SafeAreaView style={styles.root} edges={['top', 'bottom']}><View style={styles.loading}><Mark size={70} /><Text style={styles.loadingText}>Preparando Oficia…</Text></View></SafeAreaView>;
  return <SafeAreaView style={[styles.root, (screen === 'auth' || screen === 'chooseRole') && styles.authScreen]} edges={['top', 'bottom']}><StatusBar barStyle={screen === 'auth' || screen === 'chooseRole' ? 'light-content' : 'dark-content'} backgroundColor={screen === 'auth' || screen === 'chooseRole' ? palette.plum : palette.cream} />
    {screen === 'chooseRole' && <RoleChoice signedIn={Boolean(user)} accountLabel={user ? profileDisplayName(user) : undefined} accountEmail={user?.email ?? undefined} accountType={accountType} onContinue={() => { void continueSignedIn(); }} onChoose={role => { void chooseAccountType(role); }} onSignIn={() => { void AsyncStorage.removeItem('oficia:pending-account-type'); setPendingAccountType(null); setAuthMode('entrar'); setAuthNotice(''); setScreen('auth'); }} />}
    {screen === 'owner' && user && accountType === 'anfitrion' && <OwnerDashboard userId={user.id} email={user.email ?? 'Cuenta Oficia'} profileName={profileDisplayName(user)} avatarUrl={profileAvatarUrl(user)} onSaveProfile={saveProfile} isOperations={isOperations} onOpenOperations={() => { setOperationsNotice(''); setScreen('operations'); void refreshRemoteData(user.id).catch(() => {}); }} onSignOut={() => { void confirmSignOut(); }} onRequestNotifications={async () => (await enablePushForUser(user.id, handlePushOpen, handleForegroundPush)).status === 'granted'} />}
    {screen === 'auth' && <View style={styles.authScreen}>
      <AuthVideoBackground />
      <View pointerEvents="none" style={styles.authVideoShade} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.authHero}>
        <View style={styles.authDecorOne} /><View style={styles.authDecorTwo} />
        {pendingBooking ? <Pressable accessibilityRole="button" accessibilityLabel="Volver al espacio" onPress={() => { setPendingBooking(false); setAuthNotice(''); setScreen('detail'); }} style={styles.authBack}><Icon name="back" color={palette.white} size={19} /><Text style={styles.authBackText}>Volver al espacio</Text></Pressable> : authMode === 'crear' ? <Pressable accessibilityRole="button" accessibilityLabel="Cambiar tipo de perfil" onPress={() => { setAuthNotice(''); setScreen('chooseRole'); }} style={styles.authBack}><Icon name="back" color={palette.white} size={19} /><Text style={styles.authBackText}>Cambiar perfil</Text></Pressable> : null}
        <View style={styles.authHeroBrand}><View style={styles.authLogoFrame}><Mark size={46} /></View><View><Text style={styles.authBrandName}>Oficia</Text><Text style={styles.authBrandTag}>TU ESPACIO, A TU HORA</Text></View></View>
        <View style={styles.authHeroCopy}><View style={styles.authLocation}><Icon name="pin" size={13} color={palette.white} /><Text style={styles.authLocationText}>DELICIAS, CHIHUAHUA</Text></View><Text style={styles.authHeroTitle}>Un buen lugar{ '\n' }lo cambia todo.</Text><Text style={styles.authHeroSubtitle}>Oficinas, reuniones y coworking listos para ti.</Text></View>
        <View style={styles.authBenefits}><View style={styles.authBenefit}><Icon name="wifi" size={15} color={palette.white} /><Text style={styles.authBenefitText}>Internet</Text></View><View style={styles.authBenefit}><Icon name="lock" size={15} color={palette.white} /><Text style={styles.authBenefitText}>Privacidad</Text></View><View style={styles.authBenefit}><Icon name="clock" size={15} color={palette.white} /><Text style={styles.authBenefitText}>A tu hora</Text></View></View>
      </View>
      <View style={[styles.authCard, styles.authCardResponsive]}>
        <Text style={styles.authCardEyebrow}>{authMode === 'entrar' ? 'QUÉ BUENO VERTE' : authMode === 'crear' ? pendingAccountType === 'anfitrion' ? 'RENTO ESPACIO' : 'BUSCO ESPACIO' : authMode === 'recuperar' ? 'RECUPERA TU CUENTA' : 'SEGURIDAD DE TU CUENTA'}</Text>
        <Text style={styles.authCardTitle}>{authMode === 'entrar' ? 'Inicia sesión' : authMode === 'crear' ? 'Crea tu cuenta' : authMode === 'recuperar' ? 'Recupera tu acceso' : 'Crea una contraseña nueva'}</Text>
        <Text style={styles.authCardSubtitle}>{authMode === 'entrar' ? 'Tu espacio y tus planes, siempre a la mano.' : authMode === 'crear' ? pendingAccountType === 'anfitrion' ? 'Administra tus espacios y consulta tus ingresos.' : 'Guarda tus espacios y consulta tus solicitudes.' : authMode === 'recuperar' ? 'Te enviaremos un enlace seguro al correo de tu cuenta.' : 'Confirma la contraseña para proteger tu cuenta.'}</Text>
        {backendConfigured && (authMode === 'entrar' || authMode === 'crear') ? <><Pressable accessibilityRole="button" accessibilityLabel="Continuar con Google" disabled={authBusy} onPress={submitGoogleAuth} style={[styles.googleButton, authBusy && styles.googleButtonDisabled]}><Text style={styles.googleMark}>G</Text><Text style={styles.googleButtonText}>{authBusy ? 'Conectando…' : 'Continuar con Google'}</Text></Pressable><View style={styles.authDivider}><View style={styles.authDividerLine} /><Text style={styles.authDividerText}>o con tu correo</Text><View style={styles.authDividerLine} /></View></> : null}
        <Text style={styles.authLabel}>Correo electrónico</Text>
        <View style={styles.authInputRow}><Icon name="user" size={18} color={palette.muted} /><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" value={authEmail} onChangeText={setAuthEmail} placeholder="tu@correo.com" placeholderTextColor="#9B8990" style={styles.authInputField} returnKeyType="next" /></View>
        {authMode !== 'recuperar' ? <>
          <Text style={styles.authLabel}>{authMode === 'nueva' ? 'Nueva contraseña' : 'Contraseña'}</Text>
          <View style={styles.authInputRow}><Icon name="lock" size={18} color={palette.muted} /><TextInput autoCapitalize="none" autoComplete={authMode === 'entrar' ? 'current-password' : 'new-password'} secureTextEntry textContentType={authMode === 'entrar' ? 'password' : 'newPassword'} value={authPassword} onChangeText={setAuthPassword} placeholder="Al menos 8 caracteres" placeholderTextColor="#9B8990" style={styles.authInputField} onSubmitEditing={authMode === 'nueva' ? saveNewPassword : submitAuth} returnKeyType="go" /></View>
          {authMode === 'nueva' ? <><Text style={styles.authLabel}>Confirma la contraseña</Text><View style={styles.authInputRow}><Icon name="lock" size={18} color={palette.muted} /><TextInput autoCapitalize="none" autoComplete="new-password" secureTextEntry textContentType="newPassword" value={authPasswordConfirm} onChangeText={setAuthPasswordConfirm} placeholder="Escríbela otra vez" placeholderTextColor="#9B8990" style={styles.authInputField} onSubmitEditing={saveNewPassword} returnKeyType="go" /></View></> : null}
          {authMode === 'entrar' ? <Pressable accessibilityRole="button" onPress={() => { setAuthMode('recuperar'); setAuthPassword(''); setAuthNotice(''); }} style={styles.authForgot}><Text style={styles.authSwitchText}>¿Olvidaste tu contraseña?</Text></Pressable> : null}
        </> : null}
        <PrimaryButton label={authBusy ? 'Un momento…' : authMode === 'entrar' ? 'Iniciar sesión' : authMode === 'crear' ? 'Crear cuenta' : authMode === 'recuperar' ? 'Enviar enlace' : 'Guardar contraseña'} onPress={authMode === 'recuperar' ? requestPasswordReset : authMode === 'nueva' ? saveNewPassword : submitAuth} disabled={authBusy} style={{ marginTop: 20 }} />
        {authNotice ? <Text accessibilityRole="alert" style={styles.authNotice}>{authNotice}</Text> : null}
        <Pressable accessibilityRole="button" onPre…7193 tokens truncated…ng => { const space = catalog.find(item => item.id === booking.spaceId); if (!space) return null; return <View key={booking.id} style={styles.hostBooking}><View style={styles.hostBookingTop}><Text style={styles.hostBookingSpace}>{space.name}</Text><Text style={styles.hostBookingCode}>{booking.id}</Text></View><Text style={styles.hostBookingMeta}>{formatDate(booking.date)} · {booking.time}</Text><Text style={styles.hostBookingMeta}>{booking.quantity} {booking.unit === 'Hora' ? 'hora(s)' : booking.unit === 'Día' ? 'día(s)' : 'semana(s)'} · {formatMoney(booking.total)}</Text><Text style={styles.hostBookingStatus}>{booking.status}</Text><Text style={styles.hostBookingMeta}>Ticket informativo · sin cobro</Text></View>; }) : <EmptyState icon="calendar" title={backendConfigured && hostSpaceIds.length === 0 ? 'Aún no hay espacios vinculados' : 'Sin solicitudes todavía'} message={backendConfigured && hostSpaceIds.length === 0 ? 'La cuenta anfitriona debe asociarse a un espacio desde la administración de Oficia.' : 'Las nuevas solicitudes de tus espacios aparecerán aquí.'} action={backendConfigured && hostSpaceIds.length === 0 ? undefined : 'Explorar espacios'} onAction={() => chooseTab('Explorar')} />}</ScrollView>}

    {screen === 'operations' && <ScrollView style={styles.flex} contentContainerStyle={styles.hostContent}><View style={styles.innerHeader}><Pressable accessibilityRole="button" accessibilityLabel="Volver a perfil" onPress={goBack} style={styles.roundBack}><Icon name="back" size={19} /></Pressable><Text style={styles.innerHeaderTitle}>Operaciones</Text><View style={{ width: 38 }} /></View>{!isOperations ? <EmptyState icon="lock" title="Acceso restringido" message="Esta cuenta no tiene permisos de Operaciones." action="Volver al perfil" onAction={goBack} /> : <><Text style={styles.pageEyebrow}>SOLICITUDES</Text><Text style={styles.pageTitle}>Tickets recientes</Text><Text style={styles.bodyCopy}>Importes informativos; no se procesan cobros en Oficia.</Text>{bookings.filter(booking => booking.status === 'Solicitud enviada').length ? bookings.filter(booking => booking.status === 'Solicitud enviada').map(booking => { const space = catalog.find(item => item.id === booking.spaceId); if (!space) return null; return <View key={booking.id} style={styles.hostBooking}><View style={styles.hostBookingTop}><Text style={styles.hostBookingSpace}>{space.name}</Text><Text style={styles.hostBookingCode}>{booking.id}</Text></View><Text style={styles.hostBookingMeta}>{formatDate(booking.date)} · {booking.time}</Text><Text style={styles.hostBookingMeta}>{booking.quantity} {booking.unit === 'Hora' ? 'hora(s)' : booking.unit === 'Día' ? 'día(s)' : 'semana(s)'} · {formatMoney(booking.total)} estimados</Text></View>; }) : <EmptyState icon="ticket" title="Sin tickets nuevos" message="Las solicitudes aparecerán aquí." />}{operationsNotice ? <Text accessibilityRole="alert" style={styles.authNotice}>{operationsNotice}</Text> : null}<OperationsDraftReview drafts={reviewDrafts} busy={operationsBusy} onReview={(id, approve, reason) => { void reviewSpaceDraft(id, approve, reason); }} /><OperationsReviews /><OperationsNotifications userId={user?.id ?? ''} /></>}</ScrollView>}

    {foregroundNotification && screen !== 'auth' && screen !== 'chooseRole' ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir notificación" onPress={() => handlePushOpen(foregroundNotification.data ?? {})} style={styles.pushToast}><Icon name="bell" size={19} color={palette.action} /><View style={styles.flex}><Text style={styles.pushToastTitle}>{foregroundNotification.title ?? 'Oficia'}</Text><Text style={styles.pushToastText}>{foregroundNotification.body ?? 'Tienes una nueva notificación.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Cerrar notificación" onPress={() => setForegroundNotification(null)}><Icon name="close" size={18} color={palette.muted} /></Pressable></Pressable> : null}
    <Modal visible={pushPromptVisible} transparent animationType="fade" onRequestClose={() => { setPushPromptVisible(false); if (user) void AsyncStorage.setItem(`oficia:push-prompted:${user.id}`, 'yes'); }}><View style={[styles.modalBackdrop,{justifyContent:'center',padding:20}]}><View style={styles.pushPrompt}><View style={styles.pushPromptIcon}><Icon name="bell" size={26} color={palette.action} /></View><Text style={styles.pushPromptTitle}>Mantente al tanto</Text><Text style={styles.pushPromptText}>Te avisaremos cuando cambie una solicitud o se acerque una renta. Las ofertas son opcionales.</Text><PrimaryButton label="Activar notificaciones" onPress={() => { setPushPromptVisible(false); if (user) void AsyncStorage.setItem(`oficia:push-prompted:${user.id}`, 'yes'); if (user) void enablePushForUser(user.id, handlePushOpen, handleForegroundPush); }} style={{ marginTop: 18 }} /><Pressable accessibilityRole="button" onPress={() => { setPushPromptVisible(false); if (user) void AsyncStorage.setItem(`oficia:push-prompted:${user.id}`, 'yes'); }} style={styles.pushPromptLater}><Text style={styles.pushPromptLaterText}>Ahora no</Text></Pressable></View></View></Modal>
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
Warning: truncated output (original token count: 7548)
Total output lines: 85

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
  authContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 35 }, authCard: { backgroundColor: 'rgba(255, 249, 248, 0.96)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.62)', borderRadius: 23, padding: 22, marginTop: 20 }, authLabel: { color: palette.plum, fontSize: 12, fontWeight: '800', marginTop: 20, marginBottom: 8 }, authInput: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, paddingHorizontal: 14, color: palette.plum, fontSize: 14 }, googleButton: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, marginTop: 23 }, googleButtonDisabled: { opacity: .58 }, googleMark: { color: '#4285F4', fontSize: 19, fontWeight: '900' }, googleButtonText: { color: palette.plum, fontSize: 13, fontWeight: '800' }, authDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 19 }, authDividerLine: { flex: 1, height: 1, backgroundColor: palette.line }, authDividerText: { color: palette.muted, fontSize: 10 }, authNotice: { color: palette.action, fontSize: 12, lineHeight: 18, marginTop: 15 }, authSwitch: { alignItems: 'center', paddingVertical: 17, marginTop: 5 }, authForgot: { alignSelf: 'flex-end', paddingTop: 12, paddingBottom: 3 }, authSwitchText: { color: palette.action, fontSize: 12, fontWeight: '800', textAlign: 'center' }, authFootnote: { color: palette.muted, fontSize: 10, textAlign: 'center', lineHeight: 16 },
  root: { flex: 1, backgroundColor: palette.cream }, flex: { flex: 1 }, screenContent: { paddingBottom: 25 }, padded: { paddingHorizontal: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 }, loadingText: { color: palette.plum, fontSize: 14, fontWeight: '800' },
  exploreFilter: { marginLeft: 12, padding: 6 }, filterDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.action },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#35272C60' }, modalScrim: { flex: 1 }, filterPanel: { backgroundColor: palette.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 22 }, filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, filterTitle: { color: palette.plum, fontSize: 21, fontWeight: '900' }, filterLabel: { color: palette.plum, fontSize: 14, fontWeight: '900', marginTop: 24, marginBottom: 12 }, filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filterOption: { backgroundColor: palette.cream, borderColor: palette.line, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 11 }, filterOptionActive: { backgroundColor: palette.action, borderColor: palette.action }, filterOptionText: { color: palette.plum, fontSize: 11, fontWeight: '700' }, filterOptionTextActive: { color: palette.white }, filterActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30 }, clearFilters: { paddingHorizontal: 17, height: 52, justifyContent: 'center' }, clearFiltersText: { color: palette.action, fontSize: 13, fontWeight: '900' },
  pushPrompt: { width: '100%', maxWidth: 430, alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', backgroundColor: palette.white, borderRadius: 24, padding: 24, alignItems: 'center' }, pushPromptIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' }, pushPromptTitle: { color: palette.plum, fontSize: 22, fontWeight: '900', marginTop: 15 }, pushPromptText: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 }, pushPromptLater: { padding: 13, marginTop: 3 }, pushPromptLaterText: { color: palette.muted, fontWeight: '800', fontSize: 13 },
  pushToast: { position: 'absolute', zIndex: 10, elevation: 10, top: 8, left: 12, right: 12, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, shadowColor: '#000', shadowOpacity: .13, shadowRadius: 14…2548 tokens truncated….muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, profileBrand: { alignItems: 'center', marginTop: 48, marginBottom: 20 },
  detailHero: { height: 310 }, heroPhoto: { width: '100%', height: '100%' }, heroButton: { position: 'absolute', top: 17, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white }, heroThumbs: { position: 'absolute', bottom: 19, left: 20, flexDirection: 'row', gap: 6 }, heroThumb: { width: 55, height: 45, borderWidth: 2, borderColor: palette.white, borderRadius: 7, overflow: 'hidden' }, heroThumbActive: { borderColor: palette.coral }, heroThumbImage: { width: '100%', height: '100%' }, detailBody: { backgroundColor: palette.cream, borderTopLeftRadius: 27, borderTopRightRadius: 27, marginTop: -18, paddingTop: 24, paddingHorizontal: 21 }, detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, detailType: { color: palette.action, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, ratingDetail: { flexDirection: 'row', alignItems: 'center', gap: 5 }, ratingDetailText: { color: palette.muted, fontSize: 11 }, detailSampleBadge: { backgroundColor: palette.blush, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }, detailSampleText: { color: palette.action, fontSize: 9, fontWeight: '900', letterSpacing: .8 }, detailName: { color: palette.plum, fontSize: 28, fontWeight: '900', marginTop: 10, letterSpacing: -.8 }, locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 }, detailArea: { color: palette.muted, fontSize: 12 }, detailStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line }, stat: { alignItems: 'center', width: '32%' }, statIcon: { width: 37, height: 37, backgroundColor: palette.blush, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, statText: { color: palette.muted, fontSize: 10, textAlign: 'center', marginTop: 7 }, detailTabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: palette.line, marginTop: 15, marginBottom: 24 }, detailTab: { paddingHorizontal: 12, paddingVertical: 13, marginRight: 12 }, detailTabActive: { borderBottomWidth: 3, borderBottomColor: palette.action }, detailTabText: { color: palette.muted, fontSize: 12, fontWeight: '700' }, detailTabTextActive: { color: palette.action, fontWeight: '900' }, detailHeading: { color: palette.plum, fontSize: 17, fontWeight: '900', marginTop: 1, marginBottom: 3 }, amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, amenity: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: palette.white, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: palette.line }, amenityText: { color: palette.plum, fontSize: 11, fontWeight: '700' }, privacyBox: { flexDirection: 'row', gap: 9, backgroundColor: palette.blush, padding: 13, borderRadius: 13, marginTop: 22 }, privacyText: { color: palette.plum, flex: 1, fontSize: 12, lineHeight: 18 }, galleryPhoto: { width: '100%', height: 200, borderRadius: 14, marginTop: 12 }, reviewBox: { backgroundColor: palette.white, borderRadius: 17, padding: 22, alignItems: 'center' }, reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 5 }, reviewNumber: { color: palette.plum, fontSize: 30, fontWeight: '900' }, reviewCaption: { color: palette.action, fontSize: 12, fontWeight: '800', marginTop: 4 },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: palette.white, borderTopWidth: 1, borderColor: palette.line, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, footerLabel: { color: palette.muted, fontSize: 10 }, footerPrice: { color: palette.action, fontWeight: '900', fontSize: 17, marginTop: 3 }, footerUnit: { color: palette.muted, fontSize: 10, fontWeight: '400' },
  bookingContent: { paddingHorizontal: 20, paddingBottom: 125 }, innerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 20 }, roundBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.white, justifyContent: 'center', alignItems: 'center' }, innerHeaderTitle: { color: palette.plum, fontSize: 17, fontWeight: '900' }, bookingSpace: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, bookingImage: { width: 78, height: 78, borderRadius: 11 }, bookingSpaceTitle: { color: palette.plum, fontSize: 16, fontWeight: '900' }, bookingSpaceMeta: { color: palette.muted, fontSize: 11, marginTop: 5 }, bookingLabel: { color: palette.plum, fontSize: 16, fontWeight: '900', marginTop: 26, marginBottom: 13 }, unitRow: { flexDirection: 'row', gap: 8 }, unitButton: { flex: 1, minHeight: 69, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }, unitButtonSelected: { borderColor: palette.action, backgroundColor: palette.action }, unitText: { color: palette.plum, fontSize: 12, fontWeight: '900' }, unitTextSelected: { color: palette.white }, unitPrice: { color: palette.muted, fontSize: 9, marginTop: 5 }, dateRow: { gap: 9, paddingRight: 20 }, dateChip: { width: 58, height: 68, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }, dateChipActive: { backgroundColor: palette.action, borderColor: palette.action }, dateDay: { color: palette.muted, fontSize: 10, fontWeight: '800' }, dateNumber: { color: palette.plum, fontSize: 19, fontWeight: '900', marginTop: 5 }, dateChipTextActive: { color: palette.white }, slotDisabled: { opacity: .36 }, timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, timeChip: { width: '22.8%', borderColor: palette.line, borderWidth: 1, backgroundColor: palette.white, paddingVertical: 10, alignItems: 'center', borderRadius: 12 }, timeChipActive: { backgroundColor: palette.action, borderColor: palette.action }, timeText: { color: palette.plum, fontSize: 12, fontWeight: '800' }, timeTextActive: { color: palette.white }, quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.white, borderRadius: 15, padding: 14 }, quantityTitle: { color: palette.plum, fontSize: 14, fontWeight: '800' }, quantityHint: { color: palette.muted, fontSize: 10, marginTop: 4 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 }, stepButton: { width: 28, height: 28, borderRadius: 9, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' }, stepValue: { color: palette.plum, fontSize: 14, fontWeight: '900' }, summary: { backgroundColor: palette.white, padding: 17, borderRadius: 18, marginTop: 24 }, summaryTitle: { color: palette.plum, fontWeight: '900', fontSize: 15, marginBottom: 13 }, summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }, summaryMuted: { color: palette.muted, fontSize: 11, flex: 1 }, summaryStrong: { color: palette.plum, fontSize: 12, fontWeight: '800' }, summaryRule: { height: 1, backgroundColor: palette.line, marginVertical: 14 }, summaryTotal: { color: palette.action, fontWeight: '900', fontSize: 17 }, summaryNote: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 13 },
  receiptContent: { padding: 22, paddingBottom: 50 }, receiptTop: { alignItems: 'center', paddingTop: 35, paddingBottom: 26 }, receiptIcon: { width: 72, height: 72, borderRadius: 23, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }, receiptTitle: { color: palette.plum, fontSize: 25, fontWeight: '900', marginTop: 18 }, receiptSubtitle: { color: palette.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 7 }, receiptCard: { backgroundColor: palette.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: palette.line }, receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, receiptCode: { color: palette.muted, fontSize: 10 }, dashedLine: { borderBottomWidth: 1, borderColor: palette.line, borderStyle: 'dashed', marginVertical: 20 }, receiptSpace: { color: palette.plum, fontSize: 21, fontWeight: '900' }, receiptArea: { color: palette.muted, fontSize: 12, marginTop: 5 }, receiptDetail: { marginTop: 23, gap: 16 }, receiptItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, receiptItemLabel: { color: palette.muted, fontSize: 12 }, receiptItemValue: { color: palette.plum, fontSize: 12, fontWeight: '800', textAlign: 'right', flex: 1 }, receiptNotice: { backgroundColor: palette.blush, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, marginTop: 25 }, receiptNoticeText: { flex: 1, color: palette.plum, fontSize: 11, lineHeight: 17 }, receiptHome: { alignItems: 'center', paddingVertical: 17 }, receiptHomeText: { color: palette.action, fontSize: 13, fontWeight: '800' }, bankCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 17, gap: 13, marginTop: 17 }, bankSettingsCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 17, marginBottom: 28 }, bankTitle: { color: palette.plum, fontSize: 16, fontWeight: '900', marginBottom: 3 }, bankLabel: { color: palette.plum, fontSize: 11, fontWeight: '800', marginTop: 13, marginBottom: 7 }, bankInput: { minHeight: 46, borderWidth: 1, borderColor: palette.line, borderRadius: 12, backgroundColor: palette.cream, paddingHorizontal: 12, color: palette.plum, fontSize: 13 }, bankInstructionsInput: { minHeight: 74, paddingTop: 11, textAlignVertical: 'top' }, bankInstructions: { color: palette.muted, fontSize: 10, lineHeight: 16 },
});
