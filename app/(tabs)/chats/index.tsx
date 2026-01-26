import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/src/firebase';
import { collection, query, where, orderBy, getDocs, limit, Timestamp, onSnapshot, doc, DocumentSnapshot, writeBatch } from 'firebase/firestore';
import Colors from '@/constants/colors';

interface ChatItem {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    type: string;
    createdAt: Date;
    voiceDuration?: number;
  };
  unreadCount: number;
  updatedAt: Date;
}

export default function ChatsScreen() {
  const { user: currentUser, isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.uid || !db) {
      console.log('⚠️ Not authenticated or no current user or db, skipping chats listener');
      setLoading(false);
      return;
    }

    console.log('📡 Setting up chats listener for user:', currentUser.uid);

    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', currentUser.uid));

    const userListenersMap = new Map<string, () => void>();
    const messageListenersMap = new Map<string, () => void>();
    const userDataCache = new Map<string, { name: string; avatar: string; isOnline: boolean }>();

    const unsubscribe = onSnapshot(chatsQuery, 
      async (snapshot) => {
        console.log('📥 Received', snapshot.docs.length, 'chats');
        const userChats: ChatItem[] = [];
        const currentUserIds = new Set<string>();

        for (const chatDoc of snapshot.docs) {
          const chatId = chatDoc.id;
          const participants = chatId.split('_');
          
          const otherUserId = participants.find(id => id !== currentUser.uid);
          if (!otherUserId || !db) continue;
          currentUserIds.add(otherUserId);

          // Fetch user data immediately if not in cache
          if (!userDataCache.has(otherUserId)) {
            try {
              const userDocSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', otherUserId), limit(1)));
              
              if (!userDocSnap.empty) {
                const userData = userDocSnap.docs[0].data();
                userDataCache.set(otherUserId, {
                  name: userData.displayName || 'Unknown User',
                  avatar: userData.photoURL || '',
                  isOnline: userData.isOnline || false,
                });
              }
            } catch (error) {
              console.error('❌ Error fetching user data:', error);
            }
          }

          // Set up real-time listener for online status
          if (!userListenersMap.has(otherUserId)) {
            const userDocRef = doc(db, 'users', otherUserId);
            const userUnsubscribe = onSnapshot(userDocRef, (userDoc: DocumentSnapshot) => {
              if (userDoc.exists()) {
                const otherUserData = userDoc.data();
                const userData = {
                  name: otherUserData.displayName || 'Unknown User',
                  avatar: otherUserData.photoURL || '',
                  isOnline: otherUserData.isOnline || false,
                };
                
                console.log('📡 User data updated:', userData.name, 'isOnline:', userData.isOnline);
                userDataCache.set(otherUserId, userData);
                
                setChats(prevChats => 
                  prevChats.map(chat => 
                    chat.otherUser.id === otherUserId
                      ? {
                          ...chat,
                          otherUser: {
                            ...chat.otherUser,
                            name: userData.name,
                            avatar: userData.avatar,
                            isOnline: userData.isOnline,
                          },
                        }
                      : chat
                  )
                );
              }
            });
            userListenersMap.set(otherUserId, userUnsubscribe);
          }

          try {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            const lastMessageQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
            const messagesSnapshot = await getDocs(lastMessageQuery);

            let lastMessage;
            if (!messagesSnapshot.empty) {
              const lastMsg = messagesSnapshot.docs[0].data();
              lastMessage = {
                content: lastMsg.content || '',
                senderId: lastMsg.senderId || '',
                type: lastMsg.type || 'text',
                createdAt: lastMsg.createdAt instanceof Timestamp ? lastMsg.createdAt.toDate() : new Date(),
                voiceDuration: lastMsg.voiceDuration,
              };
            }

            const unreadQuery = query(messagesRef, where('isRead', '==', false), where('senderId', '!=', currentUser.uid));
            const unreadSnapshot = await getDocs(unreadQuery);

            const cachedUserData = userDataCache.get(otherUserId);
            
            userChats.push({
              id: chatId,
              otherUser: {
                id: otherUserId,
                name: cachedUserData?.name || 'Loading...',
                avatar: cachedUserData?.avatar || '',
                isOnline: cachedUserData?.isOnline || false,
              },
              lastMessage,
              unreadCount: unreadSnapshot.size,
              updatedAt: lastMessage?.createdAt || new Date(0),
            });

            if (!messageListenersMap.has(chatId)) {
              const messagesUnsubscribe = onSnapshot(
                query(messagesRef, where('isRead', '==', false), where('senderId', '!=', currentUser.uid)),
                (unreadMessagesSnapshot) => {
                  console.log('📥 Unread count updated for chat:', chatId, 'count:', unreadMessagesSnapshot.size);
                  setChats(prevChats => 
                    prevChats.map(chat => 
                      chat.id === chatId
                        ? { ...chat, unreadCount: unreadMessagesSnapshot.size }
                        : chat
                    )
                  );
                }
              );
              messageListenersMap.set(chatId, messagesUnsubscribe);
            }
          } catch (error) {
            console.error('❌ Error processing chat:', chatId, error);
          }
        }

        userListenersMap.forEach((unsubscribe, userId) => {
          if (!currentUserIds.has(userId)) {
            unsubscribe();
            userListenersMap.delete(userId);
          }
        });

        const currentChatIds = new Set(userChats.map(chat => chat.id));
        messageListenersMap.forEach((unsubscribe, chatId) => {
          if (!currentChatIds.has(chatId)) {
            unsubscribe();
            messageListenersMap.delete(chatId);
          }
        });

        userChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setChats(userChats);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error listening to chats:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      userListenersMap.forEach(unsubscribe => unsubscribe());
      userListenersMap.clear();
      messageListenersMap.forEach(unsubscribe => unsubscribe());
      messageListenersMap.clear();
    };
  }, [currentUser?.uid, isAuthenticated]);

  const filteredChats = chats.filter(chat => 
    chat.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getAvatarUri = (avatarUrl: string) => {
    if (!avatarUrl || avatarUrl.trim() === '') {
      return 'https://ui-avatars.com/api/?name=User&size=112&background=6366f1&color=fff';
    }
    return avatarUrl;
  };

  const handleBack = () => router.back();

  const handleDeleteChat = async (chatId: string, userName: string) => {
    Alert.alert(
      'Delete Chat',
      `All messages with ${userName} will be deleted. Are you sure?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!db) return;
              
              console.log('🗑️ Deleting chat:', chatId);
              
              const messagesRef = collection(db, 'chats', chatId, 'messages');
              const messagesSnapshot = await getDocs(messagesRef);
              
              const batch = writeBatch(db);
              messagesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
              });
              
              const chatDocRef = doc(db, 'chats', chatId);
              batch.delete(chatDocRef);
              
              await batch.commit();
              console.log('✅ Chat deleted successfully');
              
              setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
            } catch (error) {
              console.error('❌ Error deleting chat:', error);
              Alert.alert('Error', 'An error occurred while deleting the chat.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${item.otherUser.id}` as any)}
      onLongPress={() => handleDeleteChat(item.id, item.otherUser.name)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: getAvatarUri(item.otherUser.avatar) }} 
          style={styles.avatar}
          defaultSource={{ uri: 'https://ui-avatars.com/api/?name=User&size=112&background=6366f1&color=fff' }}
          onError={() => console.log('⚠️ Avatar failed to load for:', item.otherUser.name)}
        />
        {item.otherUser.isOnline && (
          <View style={[styles.onlineIndicator, styles.online]} />
        )}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.userName}>{item.otherUser.name}</Text>
          <Text style={[styles.time, item.unreadCount > 0 && styles.timeUnread]}>
            {formatTime(item.updatedAt)}
          </Text>
        </View>

        <View style={styles.messageRow}>
          {item.lastMessage ? (
            item.lastMessage.type === 'voice' ? (
              <View style={styles.voiceMessage}>
                <MessageCircle size={14} color={Colors.light.textSecondary} />
                <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}>
                  Voice message ({item.lastMessage.voiceDuration}s)
                </Text>
              </View>
            ) : (
              <Text 
                style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {item.lastMessage.senderId === currentUser?.uid ? 'You: ' : ''}
                {item.lastMessage.content}
              </Text>
            )
          ) : (
            <Text 
              style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              Voice message (1s)
            </Text>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header - Sol geri butonu görünür olacak */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={28} color={Colors.light.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chats</Text>
        </View>

<View style={styles.headerRight} />
      </View>

      {/* Arama barı */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Mesaj listesi */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Start chatting with language partners</Text>
            <TouchableOpacity 
              style={styles.findButton}
              onPress={() => router.push('/(tabs)/community')}
            >
              <Text style={styles.findButtonText}>Find Partners</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    paddingTop: 50, // Status bar/notch için
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.light.text,
  },
  listContent: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  online: {
    backgroundColor: Colors.light.online,
  },
  offline: {
    backgroundColor: Colors.light.offline,
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  time: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  timeUnread: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: Colors.light.tint,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  findButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  findButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});
