import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Space, formatMoney } from '../data';
import { palette, radius } from '../theme';
import { Icon } from './Icon';

export function PrimaryButton({ label, onPress, style, disabled = false }: { label: string; onPress: () => void; style?: ViewStyle; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, style, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
    <Text style={styles.primaryText}>{label}</Text><Icon name="arrow" size={18} color={palette.white} />
  </Pressable>;
}

export function SpacePhoto({ uri, style, label }: { uri: string; style?: ViewStyle; label: string }) {
  const [failed, setFailed] = useState(false);
  return <View style={[styles.photoBase, style]}>
    {failed ? <View style={styles.photoFallback}><Icon name="briefcase" size={34} color={palette.action} /><Text style={styles.fallbackText}>Fotografía no disponible</Text></View>
      : <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel={label} onError={() => setFailed(true)} />}
  </View>;
}

export function SpaceCard({ space, onOpen, favorite, onFavorite, horizontal = false }: { space: Space; onOpen: () => void; favorite: boolean; onFavorite: () => void; horizontal?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${space.name}, ${space.category}, desde ${formatMoney(space.rate.Hora)} por hora`} onPress={onOpen} style={({ pressed }) => [styles.card, horizontal && styles.cardHorizontal, pressed && { opacity: .92 }]}>
    <View style={[styles.cardPhotoWrap, horizontal && styles.cardPhotoHorizontal]}>
      <SpacePhoto uri={space.image} label={`Fotografía de ${space.name}`} style={styles.cardPhoto} />
      <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{space.category}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={favorite ? `Quitar ${space.name} de favoritos` : `Guardar ${space.name} en favoritos`} onPress={event => { event.stopPropagation(); onFavorite(); }} style={styles.favoriteButton}>
        <Icon name="heart" size={19} color={favorite ? palette.action : palette.plum} filled={favorite} />
      </Pressable>
    </View>
    <View style={styles.cardInfo}>
      <View style={styles.cardTop}><Text style={styles.cardTitle} numberOfLines={1}>{space.name}</Text><View style={styles.rating}><Icon name="star" size={13} color={palette.gold} filled /><Text style={styles.ratingText}>{space.rating}</Text></View></View>
      <View style={styles.meta}><Icon name="pin" size={14} color={palette.muted} /><Text style={styles.metaText}>{space.area}</Text></View>
      <View style={styles.cardDivider} />
      <View style={styles.cardBottom}><View style={styles.meta}><Icon name="users" size={15} color={palette.action} /><Text style={styles.metaText}>Hasta {space.capacity} {space.capacity === 1 ? 'persona' : 'personas'}</Text></View><Text style={styles.price}>{formatMoney(space.rate.Hora)}<Text style={styles.priceUnit}> / h</Text></Text></View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  primary: { backgroundColor: palette.action, borderRadius: radius.medium, minHeight: 52, paddingHorizontal: 21, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  primaryText: { color: palette.white, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: .5 }, pressed: { opacity: .86 },
  photoBase: { backgroundColor: palette.blush, overflow: 'hidden' }, photo: { width: '100%', height: '100%' },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }, fallbackText: { color: palette.action, fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: palette.white, borderRadius: radius.large, overflow: 'hidden', borderWidth: 1, borderColor: palette.line, marginBottom: 15, shadowColor: palette.plum, shadowOpacity: .06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  cardHorizontal: { width: 278, marginRight: 14, marginBottom: 4 },
  cardPhotoWrap: { height: 166 }, cardPhotoHorizontal: { height: 155 }, cardPhoto: { width: '100%', height: '100%' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: palette.white, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  categoryBadgeText: { color: palette.plum, fontSize: 10, fontWeight: '800' },
  favoriteButton: { position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { padding: 15 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: palette.ink, fontSize: 17, fontWeight: '800', flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 }, ratingText: { color: palette.ink, fontSize: 11, fontWeight: '800' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 }, metaText: { color: palette.muted, fontSize: 11 },
  cardDivider: { height: 1, backgroundColor: palette.line, marginVertical: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  price: { color: palette.action, fontSize: 12, fontWeight: '900' }, priceUnit: { color: palette.muted, fontSize: 10, fontWeight: '400' },
});
