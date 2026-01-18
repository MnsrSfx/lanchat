import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
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

export default function CallScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  
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
    if (callStatus === 'calling' && user) {
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

      const connectTimer = setTimeout(() => {
        setCallStatus('connected');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 3000);

      return () => clearTimeout(connectTimer);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [callStatus, pulseAnim, user]);

  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [callStatus]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Connecting...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
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

  const handleEndCall = () => {
    setCallStatus('ended');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      router.back();
    }, 500);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={styles.userInfo}>
          {callStatus === 'calling' ? (
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.pulseRing} />
              <Avatar uri={user.avatar} name={user.name} size={120} />
            </Animated.View>
          ) : (
            <Avatar uri={user.avatar} name={user.name} size={120} />
          )}
          
          <Text style={styles.userName}>
            {user.name}
          </Text>
          
          <Text style={styles.callStatus}>
            {callStatus === 'calling' ? 'Calling...' : callStatus === 'connected' ? formatDuration(duration) : 'Call ended'}
          </Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
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
});
