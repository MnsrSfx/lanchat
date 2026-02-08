import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing or using the LanChat application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App. These Terms constitute a legally binding agreement between you and LanChat.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Text style={styles.sectionText}>
            To use LanChat, you must:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Be at least 18 years of age</Text>
            <Text style={styles.bulletItem}>• Have the legal capacity to enter into a binding agreement</Text>
            <Text style={styles.bulletItem}>• Not be prohibited from using the App under applicable laws</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Description of Service</Text>
          <Text style={styles.sectionText}>
            LanChat is a language learning platform that connects users worldwide to practice languages through text messaging, voice calls, and video calls. The App facilitates communication between language learners and provides tools to enhance the language learning experience.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Accounts</Text>
          <Text style={styles.sectionText}>
            When you create an account with LanChat, you agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Provide accurate, current, and complete information</Text>
            <Text style={styles.bulletItem}>• Maintain and promptly update your account information</Text>
            <Text style={styles.bulletItem}>• Keep your login credentials secure and confidential</Text>
            <Text style={styles.bulletItem}>• Accept responsibility for all activities under your account</Text>
            <Text style={styles.bulletItem}>• Notify us immediately of any unauthorized use of your account</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. User Conduct</Text>
          <Text style={styles.sectionText}>
            You agree not to use LanChat to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Harass, bully, intimidate, or threaten other users</Text>
            <Text style={styles.bulletItem}>• Post or transmit offensive, abusive, or inappropriate content</Text>
            <Text style={styles.bulletItem}>• Engage in hate speech or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic</Text>
            <Text style={styles.bulletItem}>• Send unsolicited advertisements, spam, or promotional materials</Text>
            <Text style={styles.bulletItem}>• Impersonate any person or entity</Text>
            <Text style={styles.bulletItem}>• Share illegal, harmful, or misleading content</Text>
            <Text style={styles.bulletItem}>• Attempt to gain unauthorized access to other users' accounts</Text>
            <Text style={styles.bulletItem}>• Use the App for any unlawful purpose</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Content Ownership</Text>
          <Text style={styles.sectionText}>
            You retain ownership of the content you create and share on LanChat. By posting content, you grant LanChat a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content solely for the purpose of operating and improving the App. You are solely responsible for the content you share and must ensure it does not infringe on any third-party rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy</Text>
          <Text style={styles.sectionText}>
            Your use of LanChat is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the App, you consent to the data practices described in our Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            The LanChat App, including its design, features, logos, trademarks, and all related content, is the property of LanChat and is protected by intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of the App without our prior written consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Termination</Text>
          <Text style={styles.sectionText}>
            We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Violation of these Terms of Service</Text>
            <Text style={styles.bulletItem}>• Engaging in prohibited conduct</Text>
            <Text style={styles.bulletItem}>• Upon request by law enforcement or government agencies</Text>
            <Text style={styles.bulletItem}>• Discontinuation of the App or any part thereof</Text>
          </View>
          <Text style={[styles.sectionText, { marginTop: 12 }]}>
            You may also delete your account at any time through the App settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Disclaimers</Text>
          <Text style={styles.sectionText}>
            LanChat is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not guarantee that the App will be uninterrupted, error-free, or free of viruses or other harmful components. We are not responsible for the conduct of any user on the platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            To the fullest extent permitted by applicable law, LanChat shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising out of or in connection with your use of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We may update these Terms from time to time. We will notify you of any material changes by posting the updated Terms within the App. Your continued use of the App after any changes constitutes your acceptance of the revised Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.sectionText}>
            These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions or concerns about these Terms of Service, please contact us at:
          </Text>
          <Text style={styles.contactEmail}>support@lanchat.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: February 2026</Text>
          <Text style={styles.footerText}>© 2026 LanChat. All rights reserved.</Text>
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
