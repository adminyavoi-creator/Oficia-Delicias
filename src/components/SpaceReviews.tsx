import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { palette } from '../theme';
import { Icon } from './Icon';

type Review = { id: string; rating: number; comment: string; created_at: string };
type Summary = { average_rating: number | null; review_count: number };

export function SpaceReviews({ spaceId, isDemo, userId, accountType, onSummaryChange }: {
  spaceId: string; isDemo: boolean; userId: string | null; accountType: string | null;
  onSummaryChange?: (spaceId: string, average: number, count: number) => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [eligibleBooking, setEligibleBooking] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase || isDemo) { setReviews([]); setAverage(0); setCount(0); setEligibleBooking(null); setLoading(false); return; }
    setLoading(true);
    const [recentResult, summaryResult] = await Promise.all([
      supabase.from('space_reviews').select('id,rating,comment,created_at').eq('space_id', spaceId).eq('is_published', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('space_review_summaries').select('average_rating,review_count').eq('space_id', spaceId).maybeSingle(),
    ]);
    if (recentResult.error || summaryResult.error) {
      setMessage('No pudimos cargar las opiniones. Inténtalo de nuevo.');
    } else {
      const recent = (recentResult.data ?? []) as Review[];
      const summary = summaryResult.data as Summary | null;
      setReviews(recent); setAverage(Number(summary?.average_rating ?? 0)); setCount(Number(summary?.review_count ?? 0));
      setMessage('');
      onSummaryChange?.(spaceId, Number(summary?.average_rating ?? 0), Number(summary?.review_count ?? 0));
    }
    if (userId && accountType === 'cliente') {
      const { data: eligible, error } = await supabase.from('bookings').select('id,ends_at,completed_at')
        .eq('space_id', spaceId).eq('client_id', userId).eq('status', 'confirmada')
        .not('completed_at', 'is', null).lte('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: false }).limit(20);
      if (!error && eligible?.length) {
        const bookingIds = eligible.map(item => item.id as string);
        const { data: submitted, error: submittedError } = await supabase.from('space_reviews').select('booking_id').in('booking_id', bookingIds);
        if (!submittedError) {
          const reviewed = new Set((submitted ?? []).map(item => item.booking_id as string));
          setEligibleBooking(bookingIds.find(id => !reviewed.has(id)) ?? null);
        } else setEligibleBooking(null);
      } else setEligibleBooking(null);
    } else setEligibleBooking(null);
    setLoading(false);
  }, [accountType, isDemo, onSummaryChange, spaceId, userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async () => {
    if (!supabase || !userId || !eligibleBooking || rating < 1 || comment.trim().length < 3 || busy) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.from('space_reviews').insert({
      space_id: spaceId, booking_id: eligibleBooking, reviewer_id: userId, rating, comment: comment.trim(),
    });
    if (error) {
      setMessage(error.code === '23505' ? 'Esta renta ya tiene una opinión.' : 'No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.');
    } else {
      setComment(''); setRating(0); setMessage('Gracias. Tu opinión ya está publicada.');
      await refresh();
    }
    setBusy(false);
  };

  if (isDemo) return <View style={styles.panel}><View style={styles.emptyIcon}><Icon name="star" size={23} color={palette.action} /></View><Text style={styles.title}>Opiniones verificadas</Text><Text style={styles.copy}>Este espacio es de muestra. Las calificaciones aparecerán cuando haya rentas reales completadas.</Text></View>;

  return <View style={styles.panel}>
    <View style={styles.summary}>
      <View style={styles.bigRating}><Icon name="star" size={22} color={palette.gold} filled /><Text style={styles.ratingValue}>{count ? average.toFixed(1) : 'Nuevo'}</Text></View>
      <Text style={styles.summaryText}>{count} {count === 1 ? 'opinión verificada' : 'opiniones verificadas'}</Text>
    </View>
    {loading ? <Text style={styles.copy}>Cargando opiniones…</Text> : reviews.length ? reviews.map(review => <View key={review.id} style={styles.review}>
      <View style={styles.reviewTop}><Stars value={review.rating} /><Text style={styles.date}>{new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.created_at))}</Text></View>
      <Text style={styles.verified}>Renta verificada</Text><Text style={styles.comment}>{review.comment}</Text>
    </View>) : <View style={styles.noReviews}><Text style={styles.title}>Aún no hay opiniones</Text><Text style={styles.copy}>Sé la primera persona en contar cómo fue tu experiencia.</Text></View>}
    {userId && accountType === 'cliente' && eligibleBooking ? <View style={styles.form}>
      <Text style={styles.formTitle}>¿Cómo estuvo tu espacio?</Text>
      <View style={styles.rateButtons}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`} accessibilityState={{ selected: rating === value }} onPress={() => setRating(value)} style={styles.starButton}><Icon name="star" size={30} color={value <= rating ? palette.gold : '#D8CDD0'} filled={value <= rating} /></Pressable>)}</View>
      <TextInput accessibilityLabel="Comentario de la renta" value={comment} onChangeText={setComment} placeholder="Cuéntale a otras personas cómo te fue" placeholderTextColor={palette.muted} multiline maxLength={1000} style={styles.input} />
      <Text style={styles.counter}>{comment.trim().length}/1000</Text>
      <Pressable accessibilityRole="button" disabled={busy || rating < 1 || comment.trim().length < 3} onPress={() => void submit()} style={[styles.submit, (busy || rating < 1 || comment.trim().length < 3) && styles.disabled]}><Text style={styles.submitText}>{busy ? 'Publicando…' : 'Publicar opinión'}</Text></Pressable>
    </View> : null}
    {userId && accountType === 'cliente' && !eligibleBooking ? <Text style={styles.eligibility}>Puedes opinar después de que el anfitrión marque tu renta como realizada.</Text> : null}
    {!userId && !loading ? <Text style={styles.eligibility}>Inicia sesión y completa una renta para publicar una opinión.</Text> : null}
    {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
  </View>;
}

function Stars({ value }: { value: number }) { return <View style={styles.stars}>{[1, 2, 3, 4, 5].map(item => <Icon key={item} name="star" size={14} color={palette.gold} filled={item <= value} />)}</View>; }

const styles = StyleSheet.create({
  panel: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 20, padding: 18, marginTop: 16 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: palette.line },
  bigRating: { flexDirection: 'row', alignItems: 'center', gap: 5 }, ratingValue: { color: palette.plum, fontSize: 23, fontWeight: '900' }, summaryText: { color: palette.muted, fontSize: 12, flex: 1 },
  review: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: palette.line }, reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, stars: { flexDirection: 'row', gap: 2 }, date: { color: palette.muted, fontSize: 11 }, verified: { color: palette.action, fontSize: 10, fontWeight: '800', marginTop: 7 }, comment: { color: palette.plum, fontSize: 13, lineHeight: 19, marginTop: 5 },
  noReviews: { alignItems: 'center', paddingVertical: 18 }, title: { color: palette.plum, fontSize: 16, fontWeight: '900', textAlign: 'center' }, copy: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 }, emptyIcon: { alignSelf: 'center', width: 46, height: 46, borderRadius: 16, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  form: { paddingTop: 17, marginTop: 3 }, formTitle: { color: palette.plum, fontSize: 16, fontWeight: '900' }, rateButtons: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12 }, starButton: { paddingVertical: 5, paddingRight: 3 }, input: { borderWidth: 1, borderColor: palette.line, borderRadius: 13, minHeight: 96, padding: 12, color: palette.plum, textAlignVertical: 'top', fontSize: 13 }, counter: { color: palette.muted, fontSize: 10, textAlign: 'right', marginTop: 4 },
  submit: { minHeight: 47, backgroundColor: palette.action, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 11 }, submitText: { color: palette.white, fontSize: 13, fontWeight: '900' }, disabled: { opacity: 0.48 }, eligibility: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 16 }, message: { color: palette.action, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 12 },
});
