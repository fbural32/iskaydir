import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="sohbet/[id]" options={{ headerShown: true, title: 'Sohbet' }} />
        <Stack.Screen name="sirket/[id]" options={{ headerShown: true, title: 'Şirket' }} />
      </Stack>
    </AuthProvider>
  );
}
