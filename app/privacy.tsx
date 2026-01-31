import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Text style={styles.appName}>LanChat</Text>
          <Text style={styles.tagline}>Connect • Learn • Grow</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms of Service</Text>
          <Text style={styles.sectionText}>
            By using LanChat, you agree to these terms. LanChat is a language learning platform that connects people worldwide to practice languages through conversations.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• You must be at least 18 years old to use this app</Text>
            <Text style={styles.bulletItem}>• You are responsible for your account security</Text>
            <Text style={styles.bulletItem}>• You agree to treat other users with respect</Text>
            <Text style={styles.bulletItem}>• Harassment, hate speech, and inappropriate content are prohibited</Text>
            <Text style={styles.bulletItem}>• We may suspend accounts that violate these terms</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.sectionText}>
            Your privacy is important to us. Here's how we handle your data:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• We collect only necessary information to provide our services</Text>
            <Text style={styles.bulletItem}>• Your messages are private between you and the recipient</Text>
            <Text style={styles.bulletItem}>• We do not sell your personal data to third parties</Text>
            <Text style={styles.bulletItem}>• You can delete your account and data at any time</Text>
            <Text style={styles.bulletItem}>• We use Firebase for secure data storage</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <Text style={styles.sectionText}>We collect:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Account information (name, email, profile photo)</Text>
            <Text style={styles.bulletItem}>• Language preferences</Text>
            <Text style={styles.bulletItem}>• Messages and call logs</Text>
            <Text style={styles.bulletItem}>• Usage analytics to improve the app</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate security measures to protect your personal information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• All data is encrypted in transit using HTTPS</Text>
            <Text style={styles.bulletItem}>• Data is stored securely on Firebase servers</Text>
            <Text style={styles.bulletItem}>• Access to user data is restricted and monitored</Text>
            <Text style={styles.bulletItem}>• Regular security audits are performed</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.sectionText}>You have the right to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Access your personal data</Text>
            <Text style={styles.bulletItem}>• Request correction of inaccurate data</Text>
            <Text style={styles.bulletItem}>• Request deletion of your account and data</Text>
            <Text style={styles.bulletItem}>• Withdraw consent for data processing</Text>
            <Text style={styles.bulletItem}>• Export your data in a portable format</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about this Privacy Policy or our practices, please contact us at:
          </Text>
          <Text style={styles.contactEmail}>support@lanchat.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: January 2025</Text>
          <Text style={styles.footerText}>© 2025 LanChat. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.light.tint,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    paddingLeft: 4,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.tint,
    marginTop: 8,
  },
  footer: {
    marginTop: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
