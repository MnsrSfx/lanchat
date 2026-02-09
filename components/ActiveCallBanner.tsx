import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Phone, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCall } from '@/contexts/CallContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ActiveCallBanner() {
  const { activeCall } = useCall();
  const { user } = useAuth();
  const [duration, setDuration] = useState(0);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isVisible = !!activeCall && (activeCall.status === 'accepted' || activeCall.status === 'ringing');

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
        tension: 80,
        friction: 12,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
      pulseAnim.stopAnimation();
      setDuration(0);
    }
  }, [isVisible, slideAnim, pulseAnim]);

  useEffect(() => {
    if (activeCall?.status === 'accepted') {
      durationRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [activeCall?.status]);

  if (!isVisible) return null;

  const otherName = user?.uid === activeCall?.callerId
    ? activeCall?.receiverName
    : activeCall?.callerName;

  const otherUserId = user?.uid === activeCall?.callerId
    ? activeCall?.receiverId
    : activeCall?.callerId;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePress = () => {
    if (otherUserId) {
      const mode = user?.uid !== activeCall?.callerId ? 'accept' : '';
      const modeParam = mode ? `?mode=${mode}` : '';
      router.push(`/call/${otherUserId}${modeParam}` as any);
    }
  };

  const isRinging = activeCall?.status === 'ringing';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.85}
        testID="active-call-banner"
      >
        <View style={styles.left}>
          <Animated.View style={[styles.iconDot, { opacity: pulseAnim }]}>
            <Phone size={14} color="#fff" />
          </Animated.View>
          <View style={styles.textContainer}>
            <Text style={styles.label} numberOfLines={1}>
              {isRinging ? 'Aranıyor...' : otherName}
            </Text>
            <Text style={styles.duration}>
              {isRinging ? 'Bağlanıyor' : formatDuration(duration)}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.returnText}>Aramaya Dön</Text>
          <ChevronRight size={16} color="#fff" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  banner: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  duration: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '400' as const,
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  returnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
