import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../backend';
import { palette } from '../theme';
import { Icon } from './Icon';

type Form = { bankName: string; clabe: string; beneficiary: string; instructions: string };
const empty: Form = { bankName: '', clabe: '', beneficiary: '', instructions: 'Incluye la referencia Oficia en el concepto de la transferencia.' };

export function OperationsBankSettings({ isOperations }: { isOperations: boolean }) {
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!supabase || !isOperations) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('operations_transfer_settings');
    const row = Array.isArray(data) ? data[0] : data;
    if (error) setNotice('No se pudieron cargar los datos bancarios. Intenta actualizar.');
    else if (row) setForm({
      bankName: row.bank_name ?? '',
      clabe: row.clabe ?? '',
      beneficiary: row.beneficiary ?? '',
      instructions: row.instructions ?? empty.instructions,
    });
    setLoading(false);
  }, [isOperations]);

  useEffect(() => { void refresh(); }, [refresh]);

  const update = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const save = async () => {
    if (!supabase || saving) return;
    const clabe = form.clabe.replace(/\s/g, '');
    if (!form.bankName.trim() || !form.beneficiary.trim() || clabe.length !== 18) {
      setNotice('Completa banco, beneficiario y CLABE de 18 dígitos.');
      return;
    }
    setSaving(true); setNotice('');
    const { error } = await supabase.rpc('operations_update_transfer_settings', {
      p_bank_name: form.bankName.trim(), p_clabe: clabe,
      p_beneficiary: form.beneficiary.trim(), p_instructions: form.instructions.trim(),
    });
    if (error) setNotice('No se pudieron guardar los datos. Revisa la CLABE y vuelve a intentarlo.');
    else { setForm(current => ({ ...current, clabe })); setNotice('Datos guardados. Solo aparecerán en solicitudes reales.'); }
    setSaving(false);
  };

  if (!isOperations) return null;
  return <View style={styles.card}>
    <View style={styles.heading}><View style={styles.icon}><Icon name="lock" size={19} color={palette.action} /></View><View style={styles.flex}><Text style={styles.title}>Cuenta de depósito</Text><Text style={styles.copy}>Solo se comparte en tickets de espacios reales.</Text></View></View>
    <Text style={styles.label}>Banco</Text><TextInput accessibilityLabel="Banco receptor" value={form.bankName} onChangeText={value => update('bankName', value)} placeholder="Nombre del banco" placeholderTextColor={palette.muted} style={styles.input} maxLength={80} />
    <Text style={styles.label}>Beneficiario</Text><TextInput accessibilityLabel="Beneficiario" value={form.beneficiary} onChangeText={value => update('beneficiary', value)} placeholder="Titular de la cuenta" placeholderTextColor={palette.muted} style={styles.input} maxLength={120} />
    <Text style={styles.label}>CLABE interbancaria</Text><TextInput accessibilityLabel="CLABE interbancaria" value={form.clabe} onChangeText={value => update('clabe', value.replace(/[^0-9 ]/g, '').slice(0, 23))} placeholder="18 dígitos" placeholderTextColor={palette.muted} style={styles.input} keyboardType="numeric" maxLength={23} />
    <Text style={styles.label}>Indicaciones</Text><TextInput accessibilityLabel="Indicaciones de pago" value={form.instructions} onChangeText={value => update('instructions', value)} placeholder="Referencia que debe incluir el cliente" placeholderTextColor={palette.muted} style={[styles.input, styles.multiline]} multiline maxLength={500} />
    {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : loading ? <Text style={styles.copy}>Cargando…</Text> : null}
    <Pressable accessibilityRole="button" disabled={loading || saving} onPress={() => void save()} style={[styles.button, (loading || saving) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Guardando…' : 'Guardar cuenta'}</Text></Pressable>
    <Text style={styles.fine}>La app no procesa transferencias. Operaciones verifica el pago externo y autoriza el ticket.</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, borderRadius: 18, padding: 16, gap: 7 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }, icon: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 },
  title: { color: palette.plum, fontSize: 16, fontWeight: '900' }, copy: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  label: { color: palette.plum, fontSize: 12, fontWeight: '800', marginTop: 5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 12, color: palette.plum, fontSize: 13, backgroundColor: palette.cream },
  multiline: { minHeight: 68, paddingTop: 11, textAlignVertical: 'top' },
  button: { minHeight: 46, borderRadius: 13, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: palette.white, fontWeight: '900', fontSize: 13 }, disabled: { opacity: .55 },
  notice: { color: palette.action, fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 5 }, fine: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
});
