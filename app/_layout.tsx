import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading, needsProfileSetup, needsEmailVerification } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (isLoading || isNavigating) return;

    const navigate = async () => {
      try {
        setIsNavigating(true);
        const inAuth = segments[0] === '(auth)';
        const inProfileSetup = segments[0] === 'profile-setup';

        if (!isAuthenticated && !needsEmailVerification) {
          if (!inAuth) {
            router.replace('/(auth)/login');
          }
        } else if (needsEmailVerification) {
          router.replace('/(auth)/verify-email');
        } else if (needsProfileSetup && !inProfileSetup) {
          router.replace('/profile-setup');
        } else if (isAuthenticated && !needsProfileSetup && inAuth) {
          router.replace('/(tabs)/community');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      } finally {
        setTimeout(() => setIsNavigating(false), 100);
      }
    };

    navigate();
  }, [isAuthenticated, isLoading, needsEmailVerification, needsProfileSetup, segments, isNavigating, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
