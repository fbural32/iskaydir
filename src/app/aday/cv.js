import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { supabase, uploadLocalFile } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';
import { Button, Loading, Screen, Title } from '../../components/ui';

// CV yükleme: PDF seç → yükle → yapay zekâ analiz etsin → profili onayla
export default function CvUpload() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState('idle'); // idle | upload | parse

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const file = res.assets[0];
    if (file.size && file.size > 8 * 1024 * 1024) {
      return Alert.alert('Dosya çok büyük', 'CV en fazla 8 MB olabilir.');
    }
    try {
      setStep('upload');
      await uploadLocalFile('cvs', `${user.id}/cv.pdf`, file.uri, 'application/pdf');
      setStep('parse');
      const { data, error } = await supabase.functions.invoke('parse-cv');
      if (error || data?.error) throw new Error(data?.error || error.message);
      await refreshProfile();
      router.replace('/aday/profil?onay=1');
    } catch (e) {
      setStep('idle');
      Alert.alert('CV okunamadı', `Profili elle doldurabilirsin.\n\n${e.message}`);
    }
  };

  if (step !== 'idle') {
    return (
      <Screen>
        <Loading text={step === 'upload' ? 'CV yükleniyor…' : 'CV okunuyor, pozisyonun ve yeteneklerin çıkarılıyor…'} />
      </Screen>
    );
  }

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <Text style={{ fontSize: 64, textAlign: 'center' }}>📄</Text>
      <Title sub="CV'ni yükle, pozisyonunu ve yeteneklerini otomatik çıkaralım. Sana uygun ilanları buna göre göstereceğiz.">
        CV'ni yükle
      </Title>
      <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          🔒 Adın ve CV'n sadece beğendiğin ilanın işverenine açılır. Telefon ve e-postanı sadece eşleştiğin işveren görür.
        </Text>
      </View>
      <Button title="PDF seç ve yükle" onPress={pick} style={{ marginTop: 20 }} />
      <Button title="CV'siz devam et (elle doldur)" variant="ghost" onPress={() => router.replace('/aday/profil?onay=1')} />
    </Screen>
  );
}
