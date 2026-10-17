import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { formatMoney } from '../data';
import { palette } from '../theme';

export type ReviewDraft = { id: string; name: string; area: string; city: string; address: string; latitude: number | null; longitude: number | null; open_days: number[]; opens_at: string; closes_at: string; category: string; capacity: number; amenities: string[]; privacy: string; image_url: string; photo_path: string | null; photo_paths: string[]; rate_hour_cents: number; rate_day_cents: number; rate_week_cents: number; description: string };
const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function DraftGallery({ paths, legacyPath, url }: { paths: string[]; legacyPath: string | null; url: string }) {
  const storedPaths = paths?.length ? paths : legacyPath ? [legacyPath] : [];
  const [sources, setSources] = useState<string[]>(storedPaths.length ? [] : url ? [url] : []);
  useEffect(() => {
    let active = true;
    if (!storedPaths.length || !supabase) { setSources(url ? [url] : []); return; }
    const draftStorage = supabase.storage.from('oficia-space-drafts');
    Promise.all(storedPaths.map(async path => {
      const { data } = await draftStorage.createSignedUrl(path, 3600);
      return data?.signedUrl ?? '';
    })).then(result => { if (active) setSources(result.filter(Boolean)); });
    return () => { active = false; };
  }, [storedPaths.join('|'), url]);
  return sources.length ? <View style={styles.gallery}>{sources.map((source, index) => <Image key={`${source}-${index}`} accessibilityLabel={`Foto ${index + 1} propuesta del espacio`} source={{ uri: source }} style={styles.photo} />)}</View> : <Text style={styles.meta}>Fotos no disponibles</Text>;
}

export function OperationsDraftReview({ drafts, busy, onReview }: { drafts: ReviewDraft[]; busy: boolean; onReview: (id: string, approve: boolean, reason: string) => void }) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return <View style={styles.wrap}>
    <Text style={styles.overline}>ESPACIOS</Text><Text style={styles.title}>Por revisar</Text>
    {!drafts.length ? <Text style={styles.empty}>No hay espacios pendientes de revisión.</Text> : drafts.map(draft => <View key={draft.id} style={styles.card}>
      <Text style={styles.name}>{draft.name}</Text>
      <Text style={styles.meta}>{draft.area} · {draft.category} · {draft.capacity} personas</Text>
      <Text style={styles.meta}>{draft.address}, {draft.city}</Text>
      <Text style={styles.meta}>{draft.open_days.map(day => dayNames[day]).join(', ')} · {draft.opens_at.slice(0, 5)}–{draft.closes_at.slice(0, 5)}</Text>
      <Text style={styles.meta}>Mapa: {draft.latitude == null ? 'Coordenadas pendientes de verificar' : `${draft.latitude.toFixed(5)}, ${draft.longitude?.toFixed(5)}`}</Text>
      <Text style={styles.meta}>Hora {formatMoney(draft.rate_hour_cents / 100)} · día {formatMoney(draft.rate_day_cents / 100)} · semana {formatMoney(draft.rate_week_cents / 100)}</Text>
      <Text style={styles.meta}>Servicios: {draft.amenities?.length ? draft.amenities.join(' · ') : 'Sin servicios indicados'}</Text>
      <Text style={styles.meta}>Privacidad: {draft.privacy || 'Sin descripción'}</Text>
      <Text style={styles.description}>{draft.description}</Text>
      <Text style={styles.meta}>Fotos: {draft.photo_paths?.length || (draft.photo_path ? 1 : draft.image_url ? 1 : 0)}</Text>
      <DraftGallery paths={draft.photo_paths ?? []} legacyPath={draft.photo_path} url={draft.image_url} />
      <TextInput accessibilityLabel={`Motivo de devolución de ${draft.name}`} value={reasons[draft.id] ?? ''} onChangeText={value => setReasons(current => ({ ...current, [draft.id]: value }))} placeholder="Motivo si requiere cambios" placeholderTextColor="#9B8990" style={styles.input} maxLength={300} multiline />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy || !(reasons[draft.id] ?? '').trim()} onPress={() => onReview(draft.id, false, reasons[draft.id] ?? '')} style={[styles.reject, !(reasons[draft.id] ?? '').trim() && styles.disabled]}><Text style={styles.rejectText}>Devolver</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => onReview(draft.id, true, '')} style={styles.approve}><Text style={styles.approveText}>Publicar espacio</Text></Pressable>
      </View>
      <Text style={styles.note}>Al publicar, clientes verán el precio, los servicios y el punto del mapa. Las reservas quedarán sujetas a confirmación.</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 }, overline: { color: palette.action, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 }, title: { color: palette.plum, fontSize: 24, fontWeight: '900', marginTop: 6, marginBottom: 13 },
  empty: { color: palette.muted, backgroundColor: palette.white, padding: 18, borderRadius: 15, fontSize: 12 },
  card: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 17, marginBottom: 13 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, photo: { width: 108, height: 88, borderRadius: 12, backgroundColor: palette.blush },
  name: { color: palette.plum, fontSize: 17, fontWeight: '800' }, meta: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 5 }, description: { color: palette.plum, fontSize: 12, lineHeight: 18, marginTop: 9 },
  input: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, color: palette.plum, borderRadius: 11, minHeight: 48, padding: 11, marginTop: 15, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 12 }, reject: { flex: 1, borderWidth: 1, borderColor: palette.action, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 43 }, approve: { flex: 1, backgroundColor: palette.action, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 43 }, disabled: { opacity: 0.45 }, rejectText: { color: palette.action, fontWeight: '800', fontSize: 12 }, approveText: { color: palette.white, fontWeight: '800', fontSize: 12 }, note: { color: palette.muted, fontSize: 10, marginTop: 10 },
});
