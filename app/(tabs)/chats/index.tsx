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
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/src/firebase';
import { collection, query, where, orderBy, getDocs, limit, Timestamp, onSnapshot } from 'firebase/firestore';
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
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid || !db) {
      console.log('⚠️ No current user or db, skipping chats listener');
      setLoading(false);
      return;
    }

    console.log('📡 Setting up chats listener for user:', currentUser.uid);

    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(chatsQuery, 
      async (snapshot) => {
        console.log('📥 Received', snapshot.docs.length, 'chats');
        const userChats: ChatItem[] = [];

        for (const chatDoc of snapshot.docs) {
          const chatId = chatDoc.id;
          const participants = chatId.split('_');
          
          const otherUserId = participants.find(id => id !== currentUser.uid);
          if (!otherUserId || !db) continue;

          try {
            const userDocRef = await getDocs(query(collection(db, 'users'), where('uid', '==', otherUserId), limit(1)));
            if (userDocRef.empty) continue;

            const otherUserData = userDocRef.docs[0].data();
            
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

            userChats.push({
              id: chatId,
              otherUser: {
                id: otherUserId,
                name: otherUserData.displayName || 'Unknown User',
                avatar: otherUserData.photoURL || '',
                isOnline: otherUserData.isOnline || false,
              },
              lastMessage,
              unreadCount: unreadSnapshot.size,
              updatedAt: lastMessage?.createdAt || new Date(0),
            });
          } catch (error) {
            console.error('❌ Error processing chat:', chatId, error);
          }
        }

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
      console.log('🔌 Cleaning up chats listener');
      unsubscribe();
    };
  }, [currentUser?.uid]);

  const filteredChats = chats.filter(chat => 
    chat.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const chatDate = new Date(date);
    const diff = now.getTime() - chatDate.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return chatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return chatDate.toLocaleDateString([], { weekday: 'short' });
    }
    return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => router.push(`/chat/${item.otherUser.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: item.otherUser.avatar || 'https://via.placeholder.com/56' }} 
            style={styles.avatar} 
          />
          <View style={[styles.onlineIndicator, item.otherUser.isOnline ? styles.online : styles.offline]} />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName}>{item.otherUser.name}</Text>
            <Text style={[styles.time, item.unreadCount > 0 && styles.timeUnread]}>
              {formatTime(item.updatedAt)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            {item.lastMessage?.type === 'voice' ? (
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
                {item.lastMessage?.senderId === currentUser?.uid ? 'You: ' : ''}
                {item.lastMessage?.content || 'No messages yet'}
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
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Chats',
          headerLargeTitle: true,
        }}
      />

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
              onPress={() => router.push('/(tabs)/community' as any)}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  time: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  timeUnread: {
    color: Colors.light.tint,
    fontWeight: '600' as const,
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
    fontWeight: '500' as const,
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
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: '#fff',
  },
});
