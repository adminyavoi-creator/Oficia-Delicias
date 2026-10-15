import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney } from '../data';
import { palette } from '../theme';

export type ReviewDraft = { id: string; name: string; area: string; category: string; capacity: number; image_url: string; rate_hour_cents: number; description: string };

export function OperationsDraftReview({ drafts, busy, onReview }: { drafts: ReviewDraft[]; busy: boolean; onReview: (id: string, approve: boolean, reason: string) => void }) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return <View style={styles.wrap}>
    <Text style={styles.overline}>ESPACIOS</Text><Text style={styles.title}>Por revisar</Text>
    {!drafts.length ? <Text style={styles.empty}>No hay espacios pendientes de revisión.</Text> : drafts.map(draft => <View key={draft.id} style={styles.card}>
      <Text style={styles.name}>{draft.name}</Text>
      <Text style={styles.meta}>{draft.area} · {draft.category} · {draft.capacity} personas</Text>
      <Text style={styles.meta}>{formatMoney(draft.rate_hour_cents / 100)} por hora</Text>
      <Text style={styles.description}>{draft.description}</Text>
      <Text style={styles.meta}>Foto: {draft.image_url}</Text>
      <TextInput accessibilityLabel={`Motivo de devolución de ${draft.name}`} value={reasons[draft.id] ?? ''} onChangeText={value => setReasons(current => ({ ...current, [draft.id]: value }))} placeholder="Motivo si requiere cambios" placeholderTextColor="#9B8990" style={styles.input} maxLength={300} multiline />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy || !(reasons[draft.id] ?? '').trim()} onPress={() => onReview(draft.id, false, reasons[draft.id] ?? '')} style={[styles.reject, !(reasons[draft.id] ?? '').trim() && styles.disabled]}><Text style={styles.rejectText}>Devolver</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => onReview(draft.id, true, '')} style={styles.approve}><Text style={styles.approveText}>Validar datos</Text></Pressable>
      </View>
      <Text style={styles.note}>Validar datos no publica el espacio ni habilita reservas.</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 }, overline: { color: palette.action, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 }, title: { color: palette.plum, fontSize: 24, fontWeight: '900', marginTop: 6, marginBottom: 13 },
  empty: { color: palette.muted, backgroundColor: palette.white, padding: 18, borderRadius: 15, fontSize: 12 },
  card: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 17, marginBottom: 13 },
  name: { color: palette.plum, fontSize: 17, fontWeight: '800' }, meta: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 5 }, description: { color: palette.plum, fontSize: 12, lineHeight: 18, marginTop: 9 },
  input: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.cream, color: palette.plum, borderRadius: 11, minHeight: 48, padding: 11, marginTop: 15, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 12 }, reject: { flex: 1, borderWidth: 1, borderColor: palette.action, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 43 }, approve: { flex: 1, backgroundColor: palette.action, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 43 }, disabled: { opacity: 0.45 }, rejectText: { color: palette.action, fontWeight: '800', fontSize: 12 }, approveText: { color: palette.white, fontWeight: '800', fontSize: 12 }, note: { color: palette.muted, fontSize: 10, marginTop: 10 },
});
