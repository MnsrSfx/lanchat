import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import Avatar from '@/components/Avatar';
import { Call } from '@/types';

interface IncomingCallModalProps {
  call: Call | null;
  onAccept: () => void;
  onDecline: () => void;
}

const { width } = Dimensions.get('window');

export default function IncomingCallModal({ call, onAccept, onDecline }: IncomingCallModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (call) {
      // Only trigger haptics on native platforms
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
        tension: 50,
        friction: 8,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
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
      slideAnim.setValue(-100);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [call, pulseAnim, slideAnim]);

  const handleAccept = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onAccept();
  };

  const handleDecline = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onDecline();
  };

  if (!call) return null;

  return (
    <Modal
      visible={!!call}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.content}>
            <Text style={styles.incomingLabel}>Incoming Voice Call</Text>
            
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.pulseRing} />
              <Avatar uri={call.callerAvatar} name={call.callerName} size={100} />
            </Animated.View>
            
            <Text style={styles.callerName}>{call.callerName}</Text>
            <Text style={styles.callType}>Voice Call</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDecline}
                activeOpacity={0.8}
              >
                <PhoneOff size={28} color="#fff" />
                <Text style={styles.actionLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                activeOpacity={0.8}
              >
                <Phone size={28} color="#fff" />
                <Text style={styles.actionLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width - 40,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  incomingLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.tint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    top: -10,
    left: -10,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  callType: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.light.text,
    marginTop: 8,
  },
});
