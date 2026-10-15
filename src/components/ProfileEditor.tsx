import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { palette } from '../theme';

export function ProfileEditor({ name, avatarUrl, email, accountLabel, onSave }: {
  name: string;
  avatarUrl: string;
  email: string;
  accountLabel: string;
  onSave: (name: string, avatarUrl: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatarUrl);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { setDraftName(name); setDraftAvatar(avatarUrl); }, [name, avatarUrl]);

  const save = async () => {
    if (!draftName.trim()) return;
    if (draftAvatar.trim() && !/^https:\/\//i.test(draftAvatar.trim())) { setNotice('La foto debe tener un enlace HTTPS.'); return; }
    setBusy(true); setNotice('');
    try { await onSave(draftName.trim(), draftAvatar.trim()); setEditing(false); setNotice('Perfil actualizado.'); }
    catch { setNotice('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };

  return <View style={styles.card}>
    <View style={styles.summary}>
      {avatarUrl ? <Image accessibilityLabel="Foto de perfil" source={{ uri: avatarUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Icon name="user" size={25} color={palette.action} /></View>}
      <View style={styles.copy}><Text style={styles.name}>{name}</Text><Text style={styles.muted}>{email}</Text><Text style={styles.role}>{accountLabel}</Text></View>
    </View>
    {editing ? <>
      <Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre de perfil" value={draftName} onChangeText={setDraftName} placeholder="Tu nombre" placeholderTextColor="#9B8990" style={styles.input} />
      <Text style={styles.label}>Foto · enlace HTTPS</Text><TextInput accessibilityLabel="Enlace a foto de perfil" autoCapitalize="none" keyboardType="url" value={draftAvatar} onChangeText={setDraftAvatar} placeholder="https://…" placeholderTextColor="#9B8990" style={styles.input} />
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => { setDraftName(name); setDraftAvatar(avatarUrl); setEditing(false); }} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" disabled={busy || !draftName.trim()} onPress={() => { void save(); }} style={[styles.save, (busy || !draftName.trim()) && styles.disabled]}><Text style={styles.saveText}>{busy ? 'Guardando…' : 'Guardar'}</Text></Pressable></View>
    </> : <><Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={() => { setNotice(''); setEditing(true); }} style={styles.edit}><Text style={styles.editText}>Editar perfil</Text><Icon name="arrow" size={16} color={palette.action} /></Pressable>{notice ? <Text style={styles.notice}>{notice}</Text> : null}</>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 19, padding: 16, marginBottom: 25 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: palette.blush },
  avatarFallback: { width: 56, height: 56, borderRadius: 18, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, name: { color: palette.plum, fontWeight: '900', fontSize: 15 }, muted: { color: palette.muted, fontSize: 11, marginTop: 4 }, role: { color: palette.action, fontSize: 11, fontWeight: '800', marginTop: 4 },
  edit: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderColor: palette.line }, editText: { color: palette.action, fontWeight: '800', fontSize: 12 },
  label: { color: palette.plum, fontSize: 11, fontWeight: '800', marginTop: 13, marginBottom: 6 }, input: { minHeight: 44, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 12, color: palette.plum, fontSize: 13 },
  notice: { color: palette.action, fontSize: 11, fontWeight: '700', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 13 }, cancel: { minHeight: 39, justifyContent: 'center', paddingHorizontal: 13 }, cancelText: { color: palette.muted, fontWeight: '700', fontSize: 12 }, save: { minHeight: 39, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: palette.action }, saveText: { color: palette.white, fontWeight: '800', fontSize: 12 }, disabled: { opacity: 0.55 },
});
