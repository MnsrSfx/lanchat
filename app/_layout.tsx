import { Stack, useRouter, useSegments, router as expoRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { CallProvider, useCall } from '@/contexts/CallContext';
import IncomingCallModal from '@/components/IncomingCallModal';
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

function CallHandler() {
  const { incomingCall, acceptCall, declineCall } = useCall();

  const handleAccept = async () => {
    const callerId = incomingCall?.callerId;
    await acceptCall();
    if (callerId) {
      expoRouter.push(`/call/${callerId}?mode=accept` as any);
    }
  };

  return (
    <IncomingCallModal
      call={incomingCall}
      onAccept={handleAccept}
      onDecline={declineCall}
    />
  );
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading, needsProfileSetup, needsEmailVerification, user } = useAuth();
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
        const inVerifyEmail = segments[0] === '(auth)' && segments[1] === 'verify-email';
        const inTabs = segments[0] === '(tabs)';
        const inPrivacy = segments[0] === 'privacy';

        console.log('Navigation check:', { isAuthenticated, needsEmailVerification, needsProfileSetup, user: !!user, segments });

        if (inPrivacy) {
          return;
        }

        if (!isAuthenticated && !needsEmailVerification && !inAuth) {
          console.log('Not authenticated, redirecting to login');
          router.replace('/(auth)/login');
        } else if (needsEmailVerification && user && !inVerifyEmail) {
          console.log('Email not verified, redirecting to verify-email');
          router.replace('/(auth)/verify-email');
        } else if (isAuthenticated && needsProfileSetup && !inProfileSetup) {
          console.log('Profile setup needed, redirecting');
          router.replace('/profile-setup');
        } else if (isAuthenticated && !needsProfileSetup && !needsEmailVerification && (inAuth || (!inTabs && segments[0] === undefined))) {
          console.log('Authenticated and ready, redirecting to community');
          router.replace('/(tabs)/community');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      } finally {
        setTimeout(() => setIsNavigating(false), 100);
      }
    };

    navigate();
  }, [isAuthenticated, isLoading, needsEmailVerification, needsProfileSetup, user, segments, isNavigating, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="chat/[userId]" options={{ headerShown: true }} />
        <Stack.Screen name="call/[userId]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      <CallHandler />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CallProvider>
          <NotificationProvider>
            <RootLayoutNav />
          </NotificationProvider>
        </CallProvider>
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
