import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';

export default function VerifyEmailScreen() {
  const { 
    checkEmailVerification, 
    resendVerification, 
    verificationEmail, 
    isCheckVerificationLoading, 
    checkVerificationError,
    isResendVerificationLoading,
    resendVerificationError,
    resendVerificationSuccess,
    isAuthenticated,
    needsProfileSetup
  } = useAuth();
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Email verified, redirecting...', { needsProfileSetup });
      if (needsProfileSetup) {
        router.replace('/profile-setup');
      } else {
        router.replace('/(tabs)/community');
      }
    }
  }, [isAuthenticated, needsProfileSetup]);

  useEffect(() => {
    if (resendVerificationSuccess) {
      setResendTimer(60);
      setCanResend(false);
    }
  }, [resendVerificationSuccess]);

  const handleCheckVerification = () => {
    checkEmailVerification();
  };

  const handleResend = () => {
    if (canResend) {
      resendVerification();
    }
  };

  return (
    <LinearGradient
      colors={['#0EA5E9', '#0284C7', '#0369A1']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={64} color="#fff" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          A verification link has been sent to
        </Text>
        <Text style={styles.email}>{verificationEmail || 'your email'}</Text>

        <View style={styles.card}>
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Check your email inbox (and spam folder)
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                Click the verification link in the email
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Return here and click the button below
              </Text>
            </View>
          </View>

          {checkVerificationError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{checkVerificationError}</Text>
            </View>
          )}

          {resendVerificationError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{resendVerificationError}</Text>
            </View>
          )}

          {resendVerificationSuccess && (
            <View style={styles.successBanner}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.successBannerText}>Verification email sent!</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.verifyButton,
              isCheckVerificationLoading && styles.verifyButtonDisabled,
            ]}
            onPress={handleCheckVerification}
            disabled={isCheckVerificationLoading}
            testID="check-verification-button"
          >
            {isCheckVerificationLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>I&apos;ve verified my email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn&apos;t receive the email? </Text>
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResend} 
                style={styles.resendButton}
                disabled={isResendVerificationLoading}
              >
                {isResendVerificationLoading ? (
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                ) : (
                  <>
                    <RefreshCw size={14} color={Colors.light.tint} />
                    <Text style={styles.resendLink}>Resend</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  email: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  instructionsContainer: {
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: Colors.light.errorLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.light.error,
    fontSize: 14,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  verifyButton: {
    backgroundColor: Colors.light.tint,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 20,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendLink: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  timerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
