import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { palette } from '../theme';
import { Icon } from './Icon';

type Review = { rating: number; comment: string | null };

export function HostCustomerReview({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.from('owner_customer_reviews').select('rating,comment').eq('booking_id', bookingId).maybeSingle()
      .then(({ data }) => { if (active && data) setReview(data as Review); });
    return () => { active = false; };
  }, [bookingId]);

  const submit = async () => {
    if (!supabase || rating < 1 || busy) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.rpc('submit_host_customer_review', { p_booking_id: bookingId, p_rating: rating, p_comment: comment.trim() });
    if (error) {
      setNotice(error.code === '23505' ? 'Ya calificaste esta renta.' : 'No se pudo guardar la calificación. Intenta de nuevo.');
    } else {
      setReview({ rating, comment: comment.trim() || null });
      setNotice('Calificación guardada.');
    }
    setBusy(false);
  };

  return <View style={styles.panel}>
    <Text style={styles.title}>Califica al cliente</Text>
    {review ? <><View style={styles.stars}>{[1,2,3,4,5].map(value => <Icon key={value} name="star" size={17} color={value <= review.rating ? palette.gold : palette.line} filled={value <= review.rating} />)}</View>{review.comment ? <Text style={styles.copy}>{review.comment}</Text> : null}<Text style={styles.copy}>Calificación registrada para esta renta.</Text></> : <>
      <View style={styles.stars}>{[1,2,3,4,5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} estrellas`} accessibilityState={{ selected: rating === value }} onPress={() => setRating(value)}><Icon name="star" size={24} color={value <= rating ? palette.gold : palette.line} filled={value <= rating} /></Pressable>)}</View>
      <TextInput accessibilityLabel="Comentario para el cliente" value={comment} onChangeText={setComment} placeholder="Comentario opcional" placeholderTextColor={palette.muted} maxLength={1000} multiline style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy || rating < 1} onPress={() => void submit()} style={[styles.button, (busy || rating < 1) && styles.disabled]}><Text style={styles.buttonText}>{busy ? 'Guardando…' : 'Guardar calificación'}</Text></Pressable>
    </>}
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: { marginTop: 11, padding: 12, borderRadius: 14, backgroundColor: palette.cream, borderWidth: 1, borderColor: palette.line },
  title: { color: palette.plum, fontSize: 13, fontWeight: '900' }, stars: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 8 },
  copy: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, color: palette.plum, padding: 10, fontSize: 12, marginTop: 10 },
  button: { marginTop: 9, minHeight: 40, borderRadius: 11, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: palette.white, fontSize: 12, fontWeight: '900' }, disabled: { opacity: .45 }, notice: { color: palette.action, fontSize: 11, marginTop: 8 },
});
