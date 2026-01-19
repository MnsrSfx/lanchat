import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
} from 'lucide-react-native';
import { db } from '@/src/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Colors from '@/constants/colors';
import { User } from '@/types';
import Avatar from '@/components/Avatar';
import { useCall } from '@/contexts/CallContext';

export default function CallScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const params = useGlobalSearchParams<{ mode?: string }>();
  const isAccepting = params.mode === 'accept';
  const { activeCall, initiateCall, endCall, isMuted, toggleMute, connectionState, isWebRTCSupported } = useCall();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callInitiated, setCallInitiated] = useState(isAccepting);

  const displayName = isAccepting && activeCall 
    ? activeCall.callerName 
    : (user?.name || activeCall?.receiverName || 'Unknown');
  
  const displayAvatar = isAccepting && activeCall 
    ? activeCall.callerAvatar 
    : (user?.avatar || activeCall?.receiverAvatar || '');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !db) {
      console.error('❌ No userId or db not initialized');
      setLoading(false);
      return;
    }

    console.log('📡 Fetching user for call:', userId);
    const userDocRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            id: userDoc.id,
            uid: data.uid,
            email: data.email || '',
            name: data.displayName || data.email?.split('@')[0] || 'Unknown User',
            avatar: data.photoURL || '',
            photos: data.photos || [],
            bio: data.bio || '',
            nativeLanguage: data.nativeLanguage || { code: 'en', name: 'English', flag: '🇺🇸', level: 'native' },
            learningLanguages: data.learningLanguages || [],
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen?.toDate() || new Date(),
            country: data.country || '',
            city: data.city || '',
            age: data.age || 0,
            isVerified: data.isVerified || false,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        } else {
          console.error('❌ User not found:', userId);
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error fetching user:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (user && !callInitiated && !activeCall && !isAccepting) {
      console.log('📞 Initiating call to:', user.name);
      setCallInitiated(true);
      initiateCall(userId!, user.name, user.avatar || '');
    }
  }, [user, callInitiated, activeCall, userId, initiateCall, isAccepting]);

  useEffect(() => {
    const isRinging = activeCall?.status === 'ringing';
    
    if (isRinging) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [activeCall?.status, pulseAnim]);

  useEffect(() => {
    if (activeCall?.status === 'accepted') {
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [activeCall?.status]);

  useEffect(() => {
    if (activeCall === null && (callInitiated || isAccepting)) {
      console.log('📞 Call ended, going back');
      setTimeout(() => {
        router.back();
      }, 500);
    }
  }, [activeCall, callInitiated, isAccepting]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Connecting...</Text>
      </SafeAreaView>
    );
  }

  if (!user && !isAccepting) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    if (!activeCall) return 'Call ended';
    switch (activeCall.status) {
      case 'ringing':
        return 'Calling...';
      case 'accepted':
        return formatDuration(duration);
      case 'declined':
        return 'Call declined';
      case 'missed':
        return 'No answer';
      case 'ended':
        return 'Call ended';
      default:
        return 'Connecting...';
    }
  };

  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await endCall();
  };

  const handleToggleMute = () => {
    toggleMute();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isRinging = activeCall?.status === 'ringing';
  const isConnected = connectionState === 'connected';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={styles.userInfo}>
          {isRinging ? (
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.pulseRing} />
              <Avatar uri={displayAvatar} name={displayName} size={120} />
            </Animated.View>
          ) : (
            <Avatar uri={displayAvatar} name={displayName} size={120} />
          )}
          
          <Text style={styles.userName}>
            {displayName}
          </Text>
          
          <Text style={styles.callStatus}>
            {getCallStatusText()}
          </Text>
        </View>

        <View style={styles.controls}>
          {activeCall?.status === 'accepted' && (
            <>
              {Platform.OS === 'web' && !isWebRTCSupported && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>Audio not supported in this browser</Text>
                </View>
              )}
              
              {Platform.OS === 'web' && isWebRTCSupported && (
                <View style={[styles.connectionBanner, isConnected && styles.connectionBannerConnected]}>
                  <Text style={styles.connectionText}>
                    {isConnected ? '🔊 Audio connected' : '⏳ Connecting audio...'}
                  </Text>
                </View>
              )}

              {Platform.OS !== 'web' && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>Audio requires development build</Text>
                </View>
              )}
              
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                  onPress={handleToggleMute}
                >
                  {isMuted ? (
                    <MicOff size={24} color={isMuted ? '#fff' : Colors.light.text} />
                  ) : (
                    <Mic size={24} color={Colors.light.text} />
                  )}
                  <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
                  onPress={toggleSpeaker}
                >
                  {isSpeaker ? (
                    <Volume2 size={24} color="#fff" />
                  ) : (
                    <VolumeX size={24} color={Colors.light.text} />
                  )}
                  <Text style={[styles.controlLabel, isSpeaker && styles.controlLabelActive]}>
                    Speaker
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <PhoneOff size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  userInfo: {
    alignItems: 'center',
    paddingTop: 60,
  },
  avatarWrapper: {
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    top: -10,
    left: -10,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 20,
  },
  callStatus: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  controls: {
    paddingHorizontal: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
    width: 70,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  controlButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  controlLabelActive: {
    color: '#fff',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  warningText: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '500' as const,
  },
  connectionBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  connectionBannerConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  connectionText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
