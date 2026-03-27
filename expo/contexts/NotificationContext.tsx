import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { db } from '@/src/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';

const MESSAGE_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const lastMessageTimestampRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  // Play message notification sound
  const playMessageSound = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        console.log('🔔 Playing message sound (web)');
        const audio = new Audio(MESSAGE_SOUND_URL);
        audio.volume = 0.5;
        await audio.play();
      } else {
        console.log('🔔 Playing message sound (native)');
        const player = createAudioPlayer({ uri: MESSAGE_SOUND_URL });
        player.play();
        // Auto cleanup after playing
        setTimeout(() => {
          try {
            player.release();
          } catch {
            // ignore
          }
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error playing message sound:', error);
    }
  }, []);

  // Initialize and auto-request permissions
  useEffect(() => {
    const initNotifications = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const supported = 'Notification' in window;
        setIsSupported(supported);
        
        if (supported) {
          const currentPermission = Notification.permission;
          setHasPermission(currentPermission === 'granted');
          
          // Auto-request permission if not yet decided
          if (currentPermission === 'default' && !permissionRequested) {
            setPermissionRequested(true);
            console.log('🔔 Auto-requesting web notification permission...');
            try {
              const permission = await Notification.requestPermission();
              setHasPermission(permission === 'granted');
              console.log('🔔 Web notification permission:', permission);
            } catch (error) {
              console.error('❌ Error requesting web notification permission:', error);
            }
          }
        }
      } else {
        // Native - request expo notifications permission
        setIsSupported(true);
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== 'granted' && !permissionRequested) {
            setPermissionRequested(true);
            console.log('🔔 Auto-requesting native notification permission...');
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          setHasPermission(finalStatus === 'granted');
          console.log('🔔 Native notification permission:', finalStatus);
        } catch (error) {
          console.error('❌ Error requesting native notification permission:', error);
        }
      }
    };

    initNotifications();
  }, [permissionRequested]);

  const showNotification = useCallback(async (title: string, body: string, chatId: string, playSound: boolean = true) => {
    console.log('🔔 Showing notification:', title, body, 'playSound:', playSound);
    
    // Play sound regardless of platform if enabled
    if (playSound) {
      await playMessageSound();
    }

    if (Platform.OS === 'web') {
      if (!hasPermission) {
        console.log('🔔 Web notification permission not granted');
        return;
      }

      try {
        const notification = new Notification(title, {
          body,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: chatId,
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Error showing web notification:', error);
      }
    } else {
      // Native notification
      if (!hasPermission) {
        console.log('🔔 Native notification permission not granted');
        return;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            data: { chatId },
          },
          trigger: null, // Show immediately
        });
      } catch (error) {
        console.error('Error showing native notification:', error);
      }
    }
  }, [hasPermission, playMessageSound]);

  // Listen for new messages across all chats
  useEffect(() => {
    if (!user?.uid || !db) return;

    console.log('🔔 Setting up message notification listener for user:', user.uid);
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', user.uid));

    const chatUnsubscribes: (() => void)[] = [];

    const unsubscribeChats = onSnapshot(chatsQuery, (chatsSnapshot) => {
      // Clear old message listeners
      chatUnsubscribes.forEach(unsub => unsub());
      chatUnsubscribes.length = 0;

      let totalUnread = 0;

      chatsSnapshot.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        if (!db) return;

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'));

        const unsubMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
          // Count unread messages from others
          const unreadMessages = messagesSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.senderId !== user.uid && !data.isRead;
          });
          
          // Check for new messages (not from current user)
          if (messagesSnapshot.docs.length > 0) {
            const latestMessage = messagesSnapshot.docs[0];
            const data = latestMessage.data();
            const messageTime = data.createdAt instanceof Timestamp 
              ? data.createdAt.toMillis() 
              : Date.now();

            // Only notify for new messages from others, not initial load
            if (
              data.senderId !== user.uid && 
              !isInitialLoadRef.current &&
              messageTime > lastMessageTimestampRef.current
            ) {
              console.log('🔔 New message detected from:', data.senderName || 'Unknown');
              lastMessageTimestampRef.current = messageTime;
              
              // Show notification with sound
              showNotification(
                data.senderName || 'New Message',
                data.type === 'voice' ? '🎤 Voice message' : 
                data.type === 'image' ? '📷 Photo' : 
                (data.content || 'You have a new message'),
                chatId,
                true
              );
            }
          }

          // Update unread count
          totalUnread = unreadMessages.length;
          setUnreadCount(totalUnread);
        }, (error) => {
          console.log('Messages listener error:', error.code);
        });

        chatUnsubscribes.push(unsubMessages);
      });

      // Mark initial load as complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
        lastMessageTimestampRef.current = Date.now();
      }, 2000);
    });

    return () => {
      unsubscribeChats();
      chatUnsubscribes.forEach(unsub => unsub());
    };
  }, [user?.uid, showNotification]);

  const requestPermission = async () => {
    if (Platform.OS === 'web') {
      if (!isSupported) {
        Alert.alert(
          'Not Available',
          'Push notifications are only available in web browsers that support them.'
        );
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          setHasPermission(true);
          Alert.alert('Success', 'Notifications enabled! You will receive alerts for new messages and calls.');
        } else if (permission === 'denied') {
          Alert.alert(
            'Permission Denied',
            'Please enable notifications in your browser settings to receive message alerts.'
          );
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        Alert.alert('Error', 'Failed to request notification permission.');
      }
    } else {
      // Native
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        
        if (status === 'granted') {
          setHasPermission(true);
          Alert.alert('Success', 'Notifications enabled! You will receive alerts for new messages and calls.');
        } else {
          Alert.alert(
            'Permission Denied',
            'Please enable notifications in your device settings to receive alerts.'
          );
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        Alert.alert('Error', 'Failed to request notification permission.');
      }
    }
  };



  return {
    hasPermission,
    isSupported,
    requestPermission,
    unreadCount,
    playMessageSound,
    showNotification,
  };
});
