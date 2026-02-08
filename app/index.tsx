import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Shield, Globe, Users, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, needsProfileSetup, needsEmailVerification } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && !needsProfileSetup && !needsEmailVerification) {
      router.replace('/(tabs)/community');
    } else if (isAuthenticated && needsProfileSetup) {
      router.replace('/profile-setup');
    } else if (needsEmailVerification) {
      router.replace('/(auth)/verify-email');
    }
  }, [isAuthenticated, isLoading, needsProfileSetup, needsEmailVerification]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MessageCircle size={40} color="#fff" />
            </View>
          </View>
          <Text style={styles.appName}>LanChat</Text>
          <Text style={styles.tagline}>
            Connect with people around the world through language exchange
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#E0F2FE' }]}>
              <Globe size={24} color="#0EA5E9" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Language Exchange</Text>
              <Text style={styles.featureDesc}>Practice languages with native speakers worldwide</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#D1FAE5' }]}>
              <Users size={24} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Global Community</Text>
              <Text style={styles.featureDesc}>Join a diverse community of language learners</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
              <Shield size={24} color="#F59E0B" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Safe & Secure</Text>
              <Text style={styles.featureDesc}>Your privacy and safety are our top priority</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linksSection}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.linkDivider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/terms-of-service')}
          >
            <Text style={styles.linkText}>Terms of Service</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.linkDivider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/child-safety')}
          >
            <Text style={styles.linkText}>Child Safety Policy</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.linkDivider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/data-deletion')}
          >
            <Text style={styles.linkText}>Data Deletion</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>© 2025 LanChat. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#1A1A2E',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  featuresSection: {
    marginBottom: 36,
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1A1A2E',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  ctaSection: {
    gap: 12,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  registerButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  registerButtonText: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  linksSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 15,
    color: '#0EA5E9',
    fontWeight: '500' as const,
  },
  linkDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  copyright: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 10,
  },
});
