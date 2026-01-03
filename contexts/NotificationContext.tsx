import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { db } from '@/src/firebase';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setHasPermission(Notification.permission === 'granted');
      }
    }
  }, []);

  const showNotification = useCallback((title: string, body: string, chatId: string) => {
    if (Platform.OS !== 'web' || !hasPermission) return;

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
      console.error('Error showing notification:', error);
    }
  }, [hasPermission]);

  useEffect(() => {
    if (!user?.uid || !db) return;

    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      let totalUnread = 0;
      
      for (const chatDoc of snapshot.docs) {
        const chatId = chatDoc.id;
        if (!db) continue;
        
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const unreadQuery = query(
          messagesRef,
          where('isRead', '==', false),
          where('senderId', '!=', user.uid),
          orderBy('senderId'),
          orderBy('createdAt', 'desc')
        );
        
        try {
          const unreadSnapshot = await getDocs(unreadQuery);
          totalUnread += unreadSnapshot.size;
          
          if (unreadSnapshot.docs.length > 0 && hasPermission && Platform.OS === 'web') {
            const lastMsg = unreadSnapshot.docs[0].data();
            showNotification(
              'New Message',
              lastMsg.content || 'You have a new message',
              chatId
            );
          }
        } catch (error) {
          console.error('Error fetching unread messages:', error);
        }
      }
      
      setUnreadCount(totalUnread);
    });

    return () => unsubscribe();
  }, [user?.uid, hasPermission, showNotification]);

  const requestPermission = async () => {
    if (Platform.OS !== 'web' || !isSupported) {
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
        Alert.alert('Success', 'Notifications enabled! You will receive alerts for new messages.');
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
  };



  return {
    hasPermission,
    isSupported,
    requestPermission,
    unreadCount,
  };
});
