import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
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
  Video,
  VideoOff,
  RotateCcw,
} from 'lucide-react-native';
import { MOCK_USERS } from '@/mocks/users';
import Colors from '@/constants/colors';

export default function CallScreen() {
  const { userId, type } = useLocalSearchParams<{ userId: string; type: 'voice' | 'video' }>();
  const user = MOCK_USERS.find(u => u.id === userId);
  const isVideo = type === 'video';
  
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideo);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callStatus === 'calling') {
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
  }, [callStatus, pulseAnim]);

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

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>User not found</Text>
      </View>
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

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={[styles.container, isVideo && styles.videoContainer]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {isVideo && isVideoEnabled && (
        <View style={styles.videoBackground}>
          <Image source={{ uri: user.avatar }} style={styles.videoFeed} blurRadius={20} />
          <View style={styles.videoOverlay} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.userInfo}>
          {callStatus === 'calling' ? (
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.pulseRing} />
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            </Animated.View>
          ) : (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          )}
          
          <Text style={[styles.userName, isVideo && styles.userNameLight]}>
            {user.name}
          </Text>
          
          <Text style={[styles.callStatus, isVideo && styles.callStatusLight]}>
            {callStatus === 'calling' ? 'Calling...' : callStatus === 'connected' ? formatDuration(duration) : 'Call ended'}
          </Text>
        </View>

        {isVideo && isVideoEnabled && (
          <View style={styles.selfVideoContainer}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=200&h=200&fit=crop' }} style={styles.selfVideo} />
            <TouchableOpacity style={styles.flipCamera}>
              <RotateCcw size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

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

            {isVideo && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                onPress={toggleVideo}
              >
                {isVideoEnabled ? (
                  <Video size={24} color={Colors.light.text} />
                ) : (
                  <VideoOff size={24} color="#fff" />
                )}
                <Text style={[styles.controlLabel, !isVideoEnabled && styles.controlLabelActive]}>
                  {isVideoEnabled ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
            )}
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
  videoContainer: {
    backgroundColor: '#1A1A2E',
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  videoFeed: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginTop: 20,
  },
  userNameLight: {
    color: '#fff',
  },
  callStatus: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  callStatusLight: {
    color: 'rgba(255,255,255,0.8)',
  },
  selfVideoContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selfVideo: {
    width: '100%',
    height: '100%',
  },
  flipCamera: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
