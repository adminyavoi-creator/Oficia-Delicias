import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthVideoBackground } from './AuthVideoBackground';
import { Icon } from './Icon';
import { Mark } from './Brand';
import { palette } from '../theme';
import type { AccountType } from '../profiles';

export function RoleChoice({ onChoose, onSignIn, signedIn }: {
  onChoose: (type: AccountType) => void;
  onSignIn: () => void;
  signedIn: boolean;
}) {
  return <View style={styles.root}>
    <AuthVideoBackground />
    <View pointerEvents="none" style={styles.shade} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brand}><Mark size={55} /><View><Text style={styles.brandName}>Oficia</Text><Text style={styles.brandLine}>TU ESPACIO, A TU HORA</Text></View></View>
      <View style={styles.hero}><Text style={styles.eyebrow}>DELICIAS Y ALREDEDORES</Text><Text style={styles.title}>Un lugar para{ '\n' }cada forma de trabajar.</Text><Text style={styles.lead}>Elige cómo quieres usar Oficia.</Text></View>
      <View style={styles.cardWrap}>
        <Pressable accessibilityRole="button" accessibilityLabel="Busco espacio para trabajar" onPress={() => onChoose('cliente')} style={styles.card}>
          <View style={styles.icon}><Icon name="search" size={27} color={palette.action} /></View>
          <View style={styles.cardCopy}><Text style={styles.cardTitle}>Busco espacio</Text><Text style={styles.cardSub}>Oficinas, salas y coworking por hora, día o semana.</Text></View>
          <Icon name="arrow" size={20} color={palette.action} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Rento mi espacio de trabajo" onPress={() => onChoose('anfitrion')} style={styles.card}>
          <View style={styles.icon}><Icon name="briefcase" size={27} color={palette.action} /></View>
          <View style={styles.cardCopy}><Text style={styles.cardTitle}>Rento espacio</Text><Text style={styles.cardSub}>Publica tu lugar y sigue solicitudes e ingresos.</Text></View>
          <Icon name="arrow" size={20} color={palette.action} />
        </Pressable>
        <Text style={styles.fixed}>El tipo de perfil se fija al registrar tu cuenta.</Text>
        {!signedIn ? <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.signIn}><Text style={styles.signInText}>Ya tengo cuenta · Iniciar sesión</Text></Pressable> : null}
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.plum },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31, 15, 21, 0.65)' },
  content: { flexGrow: 1, padding: 24, paddingTop: 34, paddingBottom: 36, justifyContent: 'space-between', maxWidth: 660, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  brandName: { color: palette.white, fontSize: 31, fontWeight: '900', letterSpacing: -1.3 },
  brandLine: { color: palette.blush, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  hero: { paddingVertical: 38 },
  eyebrow: { color: palette.blush, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: palette.white, fontSize: 37, lineHeight: 43, fontWeight: '900', marginTop: 14, letterSpacing: -1.3 },
  lead: { color: palette.white, fontSize: 16, marginTop: 12 },
  cardWrap: { gap: 12 },
  card: { backgroundColor: palette.white, borderRadius: 22, padding: 19, minHeight: 110, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.blush },
  cardCopy: { flex: 1 },
  cardTitle: { color: palette.plum, fontSize: 19, fontWeight: '900' },
  cardSub: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  fixed: { color: palette.blush, textAlign: 'center', fontSize: 11, marginTop: 4 },
  signIn: { alignItems: 'center', padding: 12 },
  signInText: { color: palette.white, fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' },
});
