import { Tabs } from 'expo-router/tabs';
import { Text } from 'react-native';
import { colors } from '../../../lib/theme';

const icon = (e) => function TabIcon({ focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{e}</Text>;
};

export default function CandidateLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: 'Keşfet', tabBarIcon: icon('🔥') }} />
      <Tabs.Screen name="eslesmeler" options={{ title: 'Eşleşmeler', tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
