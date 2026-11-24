import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, salaryText } from '../../lib/theme';
import { criteriaText } from '../../lib/departments';
import JobCard from '../../components/JobCard';
import { Chip, ChipRow, Loading } from '../../components/ui';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Herkese açık şirket sayfası: bilgiler + tüm aktif ilanlar (vergi no gösterilmez)
export default function CompanyPage() {
  const { id } = useLocalSearchParams();
  const [c, setC] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    supabase.rpc('company_page', { p_company: id }).then(({ data }) => setC(data));
  }, [id]);

  if (!c) return <Loading />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: c.name }} />
      <View style={styles.head}>
        {c.logo_url ? (
          <Image source={{ uri: c.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>{c.name.slice(0, 1)}</Text>
          </View>
        )}
        <Text style={styles.name}>{c.name}</Text>
        {c.verified ? <Text style={styles.verified}>✓ Doğrulanmış şirket</Text> : null}
        <Text style={styles.meta}>{[c.sector, c.city].filter(Boolean).join(' · ')}</Text>
        {c.corporate_email ? (
          <Pressable onPress={() => Linking.openURL(`mailto:${c.corporate_email}`)}>
            <Text style={styles.link}>✉️ {c.corporate_email}</Text>
          </Pressable>
        ) : null}
      </View>

      {c.about ? (
        <View style={styles.box}>
          <Text style={styles.h2}>Hakkında</Text>
          <Text style={styles.text}>{c.about}</Text>
        </View>
      ) : null}

      <Text style={[styles.h2, { marginTop: 22 }]}>Açık ilanlar ({c.jobs.length})</Text>
      {c.jobs.map((j) => (
        <Pressable key={j.id} style={[styles.job, j.eligible === false && { opacity: 0.6 }]} onPress={() => setOpen(j)}>
          <Image source={{ uri: j.photo_url }} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.jobTitle} numberOfLines={1}>{j.title}</Text>
            <Text style={styles.jobMeta}>{j.city} · {salaryText(j.salary_min, j.salary_max)}</Text>
            <Text style={[styles.jobMeta, j.eligible === false && { color: colors.pass, fontWeight: '700' }]} numberOfLines={1}>
              {j.eligible === false ? '⛔ Kriterleri karşılamıyorsun' : `🎓 ${criteriaText(j)}`}
            </Text>
            {j.benefits?.length ? (
              <View style={{ marginTop: 6 }}>
                <ChipRow>{j.benefits.slice(0, 3).map((b) => <Chip key={b} text={b} small />)}</ChipRow>
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
      {!c.jobs.length ? <Text style={styles.text}>Şu an açık ilan yok.</Text> : null}

      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpen(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
          <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#fff', elevation: 4 }}>
            {open ? <JobCard job={{ ...open, company_name: c.name, company_logo: c.logo_url, company_verified: c.verified }} /> : null}
          </View>
          <Pressable onPress={() => setOpen(null)} style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>Kapat</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 96, height: 96, borderRadius: 24, marginBottom: 10 },
  logoFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  verified: { color: colors.like, fontWeight: '800', marginTop: 4 },
  meta: { color: colors.muted, marginTop: 4 },
  link: { color: colors.primaryDark, fontWeight: '700', marginTop: 8 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line },
  h2: { fontSize: 17, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  text: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  job: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.line,
  },
  thumb: { width: 76, height: 76, borderRadius: 12 },
  jobTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  jobMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
