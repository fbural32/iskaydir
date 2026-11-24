import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEPARTMENTS } from '../lib/departments';
import { colors } from '../lib/theme';
import { Button } from './ui';

const norm = (s) => s.toLocaleLowerCase('tr-TR');

/** Bölüm seçici. multi=true → işveren birden çok bölüm seçer; false → aday kendi bölümünü seçer */
export default function DepartmentPicker({ visible, multi, selected = [], onDone, onClose, title }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(selected);

  const sections = useMemo(() => {
    const filtered = DEPARTMENTS.filter((d) => !q || norm(d.name).includes(norm(q)));
    const groups = [];
    filtered.forEach((d) => {
      let g = groups.find((x) => x.title === d.group);
      if (!g) { g = { title: d.group, data: [] }; groups.push(g); }
      g.data.push(d.name);
    });
    return groups;
  }, [q]);

  const toggle = (name) => {
    if (!multi) { onDone([name]); return; }
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => { setPicked(selected); setQ(''); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.head}>
          <Text style={styles.h1}>{title || (multi ? 'Hangi bölümler başvurabilir?' : 'Bölümün')}</Text>
          <Pressable onPress={onClose}><Text style={styles.close}>Kapat</Text></Pressable>
        </View>
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder="Bölüm ara… örn. gıda, makine"
          placeholderTextColor="#A8A29E"
        />
        {multi && picked.length ? (
          <Text style={styles.count}>{picked.length} bölüm seçildi</Text>
        ) : null}
        <SectionList
          sections={sections}
          keyExtractor={(n) => n}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderSectionHeader={({ section }) => <Text style={styles.group}>{section.title.toLocaleUpperCase('tr-TR')}</Text>}
          renderItem={({ item }) => {
            const on = picked.includes(item);
            return (
              <Pressable style={[styles.row, on && styles.rowOn]} onPress={() => toggle(item)}>
                <Text style={[styles.rowText, on && { color: colors.primaryDark, fontWeight: '800' }]}>{item}</Text>
                {on ? <Text style={{ color: colors.primary, fontWeight: '900' }}>✓</Text> : null}
              </Pressable>
            );
          }}
        />
        {multi ? (
          <View style={{ padding: 16, borderTopWidth: 1, borderColor: colors.line }}>
            <Button title={`Seçimi kaydet${picked.length ? ` (${picked.length})` : ''}`} onPress={() => onDone(picked)} />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  h1: { fontSize: 22, fontWeight: '900', color: colors.ink, flex: 1, paddingRight: 10 },
  close: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  search: {
    marginHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink,
  },
  count: { marginHorizontal: 16, marginTop: 8, color: colors.primaryDark, fontWeight: '700' },
  group: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.line,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.chip },
  rowText: { fontSize: 15, color: colors.ink, flex: 1 },
});
