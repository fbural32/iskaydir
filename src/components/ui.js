import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

export function Screen({ children, scroll = false, style }) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.pad, style]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[styles.safe, styles.pad, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Title({ children, sub }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const v = variant === 'primary' ? styles.btnPrimary : variant === 'ghost' ? styles.btnGhost : styles.btnOutline;
  const t = variant === 'primary' ? styles.btnTextPrimary : styles.btnTextOutline;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, v, (pressed || disabled) && { opacity: 0.7 }, style]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} />
        : <Text style={t}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, optional, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {optional ? <Text style={styles.optional}>  (isteğe bağlı)</Text> : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor="#A8A29E"
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ text, selected, onPress, small }) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      style={[styles.chip, small && styles.chipSmall, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, small && { fontSize: 12 }, selected && { color: '#fff' }]}>{text}</Text>
    </Comp>
  );
}

export function ChipRow({ children }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function Label({ children, required }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={{ color: colors.pass }}> *</Text> : null}
    </Text>
  );
}

export function Loading({ text }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text ? <Text style={[styles.sub, { marginTop: 12, textAlign: 'center' }]}>{text}</Text> : null}
    </View>
  );
}

export function Empty({ title, text, children }) {
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { fontSize: 20, textAlign: 'center' }]}>{title}</Text>
      {text ? <Text style={[styles.sub, { textAlign: 'center', marginTop: 6 }]}>{text}</Text> : null}
      <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{children}</View>
    </View>
  );
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 15, color: colors.muted, marginTop: 4, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  optional: { fontWeight: '400', color: colors.muted },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink,
  },
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnPrimary: { backgroundColor: colors.primary },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff' },
  btnGhost: { backgroundColor: 'transparent' },
  btnTextPrimary: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnTextOutline: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  chipSmall: { paddingHorizontal: 9, paddingVertical: 4 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.chipText, fontSize: 14, fontWeight: '600' },
});
