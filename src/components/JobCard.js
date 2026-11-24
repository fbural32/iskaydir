import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EMPLOYMENT_TYPES, WORK_MODES, colors, label, salaryText } from '../lib/theme';
import { Button, Chip, ChipRow } from './ui';
import { distanceText } from '../lib/location';
import { criteriaText } from '../lib/departments';
import { router } from 'expo-router';

export default function JobCard({ job, preview = false }) {
  const [open, setOpen] = useState(false);
  const salary = job.external ? (job.salary_text || 'Maaş belirtilmemiş') : salaryText(job.salary_min, job.salary_max);
  const benefits = [...(job.benefits || [])];

  return (
    <>
      <Pressable style={{ flex: 1 }} onPress={() => !preview && setOpen(true)}>
        <View style={styles.photoWrap}>
          {job.photo_url ? (
            <Image source={{ uri: job.photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.placeholder]}>
              <Text style={styles.placeholderText}>{(job.company_name || '?').slice(0, 1)}</Text>
            </View>
          )}
          {job.external ? (
            <View style={styles.badge}><Text style={styles.badgeText}>Harici ilan · {job.source}</Text></View>
          ) : job.eligible === false ? (
            <View style={[styles.badge, { backgroundColor: colors.pass }]}><Text style={styles.badgeText}>⛔ Kriterleri karşılamıyorsun</Text></View>
          ) : job.company_verified ? (
            <View style={[styles.badge, { backgroundColor: colors.like }]}><Text style={styles.badgeText}>✓ Doğrulanmış şirket</Text></View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
          <View style={styles.companyRow}>
            {job.company_logo ? <Image source={{ uri: job.company_logo }} style={styles.logo} /> : null}
            <Text style={styles.company} numberOfLines={1}>{job.company_name}</Text>
          </View>
          <Text style={styles.meta}>
            📍 {job.city || '—'}
            {job.distance_km != null ? `  ·  ${distanceText(job.distance_km)}` : ''}
            {job.work_mode ? `  ·  ${label(WORK_MODES, job.work_mode)}` : ''}
            {job.employment_type ? `  ·  ${label(EMPLOYMENT_TYPES, job.employment_type)}` : ''}
          </Text>
          <Text style={styles.salary}>💰 {salary}</Text>
          {!job.external ? (
            <Text style={[styles.criteria, job.eligible === false && { color: colors.pass }]} numberOfLines={1}>
              🎓 {criteriaText(job)}
            </Text>
          ) : null}
          {benefits.length ? (
            <ChipRow>
              {benefits.slice(0, 5).map((b) => <Chip key={b} text={b} small />)}
              {benefits.length > 5 ? <Chip text={`+${benefits.length - 5}`} small /> : null}
            </ChipRow>
          ) : job.external ? (
            <Text style={styles.snippet} numberOfLines={3}>{job.description}</Text>
          ) : null}
          {!preview ? <Text style={styles.more}>Detay için dokun</Text> : null}
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.title}>{job.title}</Text>
            <Text style={[styles.company, { marginBottom: 10 }]}>{job.company_name}</Text>
            <Text style={styles.meta}>📍 {job.address ? `${job.address}, ` : ''}{job.city}{job.distance_km != null ? ` (${distanceText(job.distance_km)})` : ''}</Text>
            <Text style={styles.meta}>💰 {salary}</Text>
            {job.min_experience ? <Text style={styles.meta}>En az {job.min_experience} yıl deneyim</Text> : null}

            {!job.external ? (
              <View style={[styles.critBox, job.eligible === false && styles.critBoxBad]}>
                <Text style={styles.sectionTitle}>Kimler başvurabilir?</Text>
                <Text style={styles.text}>🎓 {criteriaText(job)}</Text>
                {job.allowed_departments?.length > 3 ? (
                  <Text style={[styles.text, { marginTop: 6 }]}>{job.allowed_departments.join(', ')}</Text>
                ) : null}
                {job.eligible === false ? (
                  <Text style={{ color: colors.pass, fontWeight: '800', marginTop: 8 }}>
                    ⛔ Bölümün / eğitimin bu ilana uygun değil, başvuru yapamazsın.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Section title="İş tanımı" text={job.description} />
            {job.requirements ? <Section title="Aranan nitelikler" text={job.requirements} /> : null}
            {job.skills?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Yetenekler</Text>
                <ChipRow>{job.skills.map((s) => <Chip key={s} text={s} small />)}</ChipRow>
              </View>
            ) : null}
            {benefits.length || job.benefits_note ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Haklar ve yan haklar</Text>
                <ChipRow>{benefits.map((b) => <Chip key={b} text={b} small />)}</ChipRow>
                {job.benefits_note ? <Text style={[styles.text, { marginTop: 8 }]}>{job.benefits_note}</Text> : null}
              </View>
            ) : null}
            {job.company_id ? (
              <Button
                title={`🏭 ${job.company_name} profilini gör`}
                variant="outline"
                onPress={() => { setOpen(false); router.push(`/sirket/${job.company_id}`); }}
                style={{ marginTop: 20 }}
              />
            ) : null}
            <Button title="Kapat" variant="ghost" onPress={() => setOpen(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function Section({ title, text }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoWrap: { flex: 1.15 },
  photo: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#fff', fontSize: 72, fontWeight: '900' },
  badge: {
    position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(28,25,23,0.75)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { flex: 1, padding: 18, gap: 6 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 22, height: 22, borderRadius: 6 },
  company: { fontSize: 16, fontWeight: '600', color: colors.muted, flexShrink: 1 },
  meta: { fontSize: 14, color: colors.ink, marginTop: 2 },
  salary: { fontSize: 15, fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  criteria: { fontSize: 13, color: colors.muted, fontWeight: '600', marginBottom: 2 },
  critBox: { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  critBoxBad: { borderColor: colors.pass, backgroundColor: '#FEF2F2' },
  snippet: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  more: { fontSize: 12, color: colors.muted, marginTop: 'auto', textAlign: 'center' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  text: { fontSize: 15, color: colors.ink, lineHeight: 22 },
});
