import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, Mic } from 'lucide-react-native';
import { MOCK_CHATS, MOCK_CURRENT_USER } from '@/mocks/users';
import { Chat } from '@/types';
import Colors from '@/constants/colors';

export default function ChatsScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = MOCK_CHATS.filter(chat => {
    const otherUser = chat.participants.find(p => p.id !== MOCK_CURRENT_USER.id);
    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherUser = item.participants.find(p => p.id !== MOCK_CURRENT_USER.id);
    if (!otherUser) return null;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => router.push(`/chat/${otherUser.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
          <View style={[styles.onlineIndicator, otherUser.isOnline ? styles.online : styles.offline]} />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={[styles.time, item.unreadCount > 0 && styles.timeUnread]}>
              {formatTime(item.updatedAt)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            {item.lastMessage?.type === 'voice' ? (
              <View style={styles.voiceMessage}>
                <Mic size={14} color={Colors.light.textSecondary} />
                <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}>
                  Voice message ({item.lastMessage.voiceDuration}s)
                </Text>
              </View>
            ) : (
              <Text 
                style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {item.lastMessage?.senderId === MOCK_CURRENT_USER.id ? 'You: ' : ''}
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
