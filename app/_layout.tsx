import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, needsProfileSetup, needsEmailVerification } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

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
  }, [isAuthenticated, isLoading, needsProfileSetup, needsEmailVerification, segments, router]);

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
