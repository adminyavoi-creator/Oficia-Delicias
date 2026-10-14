import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette } from '../theme';

export function Mark({ size = 44 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel="Símbolo de Oficia">
    <Rect width="200" height="200" rx="43" fill={palette.coral} />
    <Rect x="18" y="18" width="164" height="164" rx="34" fill="none" stroke="white" strokeWidth="11" />
    <Path d="M94 24v92M24 106h49M94 143h82" fill="none" stroke="white" strokeWidth="11" strokeLinecap="round" />
    <Circle cx="139" cy="66" r="15" fill={palette.blush} />
  </Svg>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  const size = compact ? 42 : 56;
  return <View style={styles.wrap} accessibilityLabel="Oficia, tu espacio a tu hora">
    <View style={styles.mark}><Mark size={size} /></View>
    <View style={[styles.wordBox, compact && styles.wordBoxCompact]}>
      <Text style={[styles.name, compact && styles.nameCompact]}>Oficia</Text>
      {!compact && <Text style={styles.tagline}>TU ESPACIO, A TU HORA</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  mark: { zIndex: 1 },
  wordBox: { borderColor: palette.coral, borderWidth: 2, borderRadius: 12, height: 46, marginLeft: -7, paddingLeft: 14, paddingRight: 15, justifyContent: 'center' },
  wordBoxCompact: { height: 34, borderWidth: 1.5, paddingRight: 11, paddingLeft: 12, borderRadius: 9 },
  name: { color: palette.plum, fontSize: 23, fontWeight: '900', letterSpacing: -1.1, lineHeight: 25 },
  nameCompact: { fontSize: 19, lineHeight: 23 },
  tagline: { color: palette.action, fontSize: 6.2, fontWeight: '900', letterSpacing: 1.25 },
});
