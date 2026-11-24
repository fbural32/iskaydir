import { Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';
import { Empty, Loading, Screen } from '../components/ui';

// Giriş kapısı: kim olduğuna göre doğru ekrana yönlendirir.
export default function Gate() {
  const { session, profile, ready } = useAuth();

  if (!isConfigured) {
    return (
      <Screen>
        <Empty
          title="Supabase ayarı eksik"
          text="Proje klasöründeki .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini yaz."
        >
          <Text style={{ textAlign: 'center', color: '#78716C' }}>README.md → Kurulum</Text>
        </Empty>
      </Screen>
    );
  }

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/hosgeldin" />;
  if (!profile || profile.id !== session.user.id) return <Loading />;

  if (profile.role === 'employer') {
    return <Redirect href={profile.company ? '/isveren' : '/isveren/sirket?ilk=1'} />;
  }
  return <Redirect href={profile.candidate?.title ? '/aday' : '/aday/cv'} />;
}
