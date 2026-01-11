import { Tabs } from 'expo-router';
import { MessageSquare, User, Settings } from 'lucide-react-native'; // ikonlar için, yoksa kendi ikonlarını kullan
import Colors from '@/constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: { backgroundColor: Colors.light.background },
        headerShown: false, // header'ı ekranlarda yöneteceğiz
      }}
    >
      {/* Chats tab'ı - ilk sırada, default olarak açılsın */}
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
          href: '/chats', // URL'yi /chats olarak zorla (manuel girilince de çalışsın)
        }}
      />

      {/* Diğer tab'lar (profil, ayarlar vs.) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings" // varsa ekle, yoksa bu satırı sil
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
