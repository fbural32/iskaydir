import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function Layout() {
  const { session, profile, ready } = useAuth();
  if (ready && !session) return <Redirect href="/hosgeldin" />;
  if (profile && profile.role !== 'candidate') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
