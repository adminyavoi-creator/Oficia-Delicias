import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type Edge = 'top' | 'right' | 'bottom' | 'left';
type SafeAreaProps = PropsWithChildren<{ style?: StyleProp<ViewStyle>; edges?: Edge[] }>;

export function SafeAreaProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function SafeAreaView({ children, style }: SafeAreaProps) {
  return <View style={style}>{children}</View>;
}
