import React from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Video, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';

// Örnek mesajlar (senin Firebase'den çektiğin kısma uyarla)
const dummyMessages = [
  { id: '1', text: 'Hey', sentByMe: false, time: '01:29' },
  { id: '2', text: 'Nasılsın?', sentByMe: true, time: '01:30' },
  // ... gerçek mesajlarını ekle
];

export default function ChatScreen() {
  const { id, name = 'Novi Yulianti', photo } = useLocalSearchParams(); // chat'e giderken params geçtiğin yerden alır

  const handleBack = () => router.back();

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.sentByMe ? styles.myMessage : styles.theirMessage
    ]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageTime}>{item.time}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Custom Header - Sol geri butonu GÖRÜNÜR olacak */}
      <View style={styles.header}>
        {/* Sol üst: Geri Butonu */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={28} color={Colors.light.text} />
        </TouchableOpacity>

        {/* Orta: Profil resmi + İsim */}
        <View style={styles.headerCenter}>
          <Image
            source={{ uri: photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&size=112&background=6366f1&color=fff' }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerTitle}>{name}</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </View>

        {/* Sağ: Arama ikonları */}
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Phone size={24} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Video size={24} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mesaj Listesi */}
      <FlatList
        data={dummyMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
      />

      {/* Mesaj Yazma Alanı */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Mesaj yaz..."
          placeholderTextColor={Colors.light.textSecondary}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Send size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  backButton: { padding: 8 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  headerSubtitle: { fontSize: 12, color: 'green' },
  headerRight: { flexDirection: 'row' },
  iconButton: { padding: 8, marginLeft: 8 },
  messagesList: { padding: 16 },
  messageBubble: {
    maxWidth: '70%',
    marginVertical: 6,
    padding: 12,
    borderRadius: 18,
  },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.light.tint, borderTopRightRadius: 0 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: Colors.light.surface, borderTopLeftRadius: 0 },
  messageText: { color: Colors.light.text, fontSize: 16 },
  messageTime: { fontSize: 10, color: Colors.light.textSecondary, alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: { padding: 8 },
});
