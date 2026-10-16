import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../backend';
import { palette } from '../theme';

type ReviewRow = { id: string; space_id: string; rating: number; comment: string; created_at: string; is_published: boolean; spaces: { name: string } | null };

export function OperationsReviews() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('space_reviews')
      .select('id,space_id,rating,comment,created_at,is_published,spaces(name)')
      .order('created_at', { ascending: false }).limit(40);
    if (error) setMessage('No se pudieron cargar las opiniones.');
    else { setRows((data ?? []) as unknown as ReviewRow[]); setMessage(''); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const moderate = async (row: ReviewRow) => {
    if (!supabase || busyId) return;
    setBusyId(row.id); setMessage('');
    const { error } = await supabase.from('space_reviews').update({ is_published: !row.is_published }).eq('id', row.id);
    if (error) setMessage('No se pudo actualizar la opinión.');
    else { await refresh(); setMessage(row.is_published ? 'Opinión oculta.' : 'Opinión publicada.'); }
    setBusyId(null);
  };

  return <View style={styles.wrap}>
    <Text style={styles.eyebrow}>CALIDAD</Text><Text style={styles.heading}>Opiniones recientes</Text>
    <Text style={styles.subheading}>Las calificaciones se publican después de una renta real completada.</Text>
    {rows.length ? rows.map(row => <View key={row.id} style={styles.card}>
      <View style={styles.top}><Text style={styles.space}>{row.spaces?.name ?? 'Espacio retirado'}</Text><Text style={styles.score}>★ {row.rating}/5</Text></View>
      <Text style={styles.comment}>{row.comment}</Text><Text style={styles.meta}>{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(row.created_at))} · {row.is_published ? 'Visible' : 'Oculta'}</Text>
      <Pressable accessibilityRole="button" disabled={Boolean(busyId)} onPress={() => void moderate(row)} style={styles.button}><Text style={styles.buttonText}>{busyId === row.id ? 'Guardando…' : row.is_published ? 'Ocultar opinión' : 'Publicar opinión'}</Text></Pressable>
    </View>) : <Text style={styles.empty}>Todavía no hay opiniones verificadas.</Text>}
    {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 }, eyebrow: { color: palette.action, fontSize: 10, fontWeight: '900', letterSpacing: 2 }, heading: { color: palette.plum, fontSize: 23, fontWeight: '900', marginTop: 6 }, subheading: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 13 },
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 14, marginBottom: 10 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, space: { color: palette.plum, fontSize: 13, fontWeight: '900', flex: 1 }, score: { color: palette.action, fontSize: 12, fontWeight: '900' }, comment: { color: palette.plum, fontSize: 12, lineHeight: 18, marginTop: 8 }, meta: { color: palette.muted, fontSize: 10, marginTop: 7 }, button: { borderWidth: 1, borderColor: palette.action, borderRadius: 10, minHeight: 38, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, buttonText: { color: palette.action, fontSize: 11, fontWeight: '900' }, empty: { color: palette.muted, fontSize: 12, padding: 14, textAlign: 'center' }, message: { color: palette.action, fontSize: 11, textAlign: 'center', marginTop: 6 },
});
