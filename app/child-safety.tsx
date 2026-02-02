import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Shield, AlertTriangle, Mail, Flag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function ChildSafetyScreen() {
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
        <Text style={styles.headerTitle}>Child Safety Standards</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Shield size={48} color={Colors.light.tint} />
          <Text style={styles.appName}>LanChat</Text>
          <Text style={styles.tagline}>Child Safety Standards</Text>
        </View>

        <View style={styles.alertBox}>
          <AlertTriangle size={24} color="#E53E3E" />
          <Text style={styles.alertText}>
            LanChat has a zero-tolerance policy for child sexual abuse material (CSAM) and child sexual abuse and exploitation (CSAE).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Commitment</Text>
          <Text style={styles.sectionText}>
            LanChat is committed to providing a safe environment for all users. We strictly prohibit any content or behavior that exploits or endangers children. Our platform is designed for users aged 18 and above.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Requirements</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Users must be at least 18 years old to create an account</Text>
            <Text style={styles.bulletItem}>• Age verification is required during registration</Text>
            <Text style={styles.bulletItem}>• Accounts suspected of being underage will be suspended pending verification</Text>
            <Text style={styles.bulletItem}>• False age declaration is a violation of our terms and results in permanent ban</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prohibited Content & Behavior</Text>
          <Text style={styles.sectionText}>
            The following are strictly prohibited and will result in immediate account termination and reporting to authorities:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Any child sexual abuse material (CSAM)</Text>
            <Text style={styles.bulletItem}>• Content that sexualizes minors in any way</Text>
            <Text style={styles.bulletItem}>• Grooming behavior or attempts to contact minors</Text>
            <Text style={styles.bulletItem}>• Sharing, requesting, or distributing exploitative content involving children</Text>
            <Text style={styles.bulletItem}>• Any discussion promoting or normalizing child exploitation</Text>
            <Text style={styles.bulletItem}>• Sextortion or blackmail involving minors</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detection & Prevention</Text>
          <Text style={styles.sectionText}>
            We employ multiple measures to detect and prevent child exploitation:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Automated content moderation systems</Text>
            <Text style={styles.bulletItem}>• User reporting mechanisms</Text>
            <Text style={styles.bulletItem}>• Manual review of flagged content</Text>
            <Text style={styles.bulletItem}>• Cooperation with law enforcement agencies</Text>
            <Text style={styles.bulletItem}>• Regular audits of platform safety measures</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reporting Violations</Text>
          <Text style={styles.sectionText}>
            If you encounter any content or behavior that violates our child safety standards, please report it immediately:
          </Text>
          <View style={styles.reportOptions}>
            <View style={styles.reportOption}>
              <Flag size={20} color={Colors.light.tint} />
              <Text style={styles.reportOptionText}>Use the in-app report feature on any message or profile</Text>
            </View>
            <View style={styles.reportOption}>
              <Mail size={20} color={Colors.light.tint} />
              <Text style={styles.reportOptionText}>Email us at: safety@lanchat.app</Text>
            </View>
          </View>
          <Text style={styles.sectionText}>
            All reports are reviewed within 24 hours. We cooperate fully with law enforcement in all cases involving child exploitation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enforcement Actions</Text>
          <Text style={styles.sectionText}>
            Violations of our child safety policy result in:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Immediate and permanent account termination</Text>
            <Text style={styles.bulletItem}>• Preservation of evidence for law enforcement</Text>
            <Text style={styles.bulletItem}>• Reporting to the National Center for Missing & Exploited Children (NCMEC)</Text>
            <Text style={styles.bulletItem}>• Reporting to relevant local and international authorities</Text>
            <Text style={styles.bulletItem}>• Ban from creating new accounts</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <Text style={styles.sectionText}>
            If you or someone you know has been a victim of online child exploitation, please contact:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• National Center for Missing & Exploited Children: CyberTipline.org</Text>
            <Text style={styles.bulletItem}>• Internet Watch Foundation: iwf.org.uk</Text>
            <Text style={styles.bulletItem}>• Local law enforcement</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionText}>
            For questions about our child safety standards or to report concerns:
          </Text>
          <Text style={styles.contactEmail}>safety@lanchat.app</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: February 2025</Text>
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
    fontSize: 17,
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
    marginBottom: 24,
    paddingVertical: 24,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 16,
    gap: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.light.tint,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FED7D7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#822727',
    lineHeight: 20,
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
  reportOptions: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginBottom: 16,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportOptionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
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
