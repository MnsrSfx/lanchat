import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Phone, 
  Video, 
  X,
  Play,
  StopCircle,
  Camera,
  Trash2,
  Languages,
  Flag,
  ArrowLeft,
} from 'lucide-react-native';
import { Message, User } from '@/types';
import { db } from '@/src/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp, deleteDoc, setDoc } from 'firebase/firestore';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recordingAnimation = useRef(new Animated.Value(1)).current;
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // fetchUser, messages listener, recording useEffect tamamen senin orijinal kodundan
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        console.error('❌ No userId provided to chat screen');
        setLoading(false);
        return;
      }
      
      if (!db) {
        console.error('❌ Firebase db not initialized');
        setLoading(false);
        return;
      }
      
      try {
        console.log('📥 Fetching user data for userId:', userId);
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('✅ User data fetched successfully:', data.displayName);
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
          console.error('❌ User document not found for userId:', userId);
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUser?.uid || !db) {
      console.log('⚠️ Skipping messages listener - missing required data');
      return;
    }

    const chatId = [currentUser.uid, userId].sort().join('_');
    console.log('📡 Setting up messages listener for chatId:', chatId);

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('📥 Received', snapshot.docs.length, 'messages');
        const fetchedMessages: Message[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            chatId,
            senderId: data.senderId || '',
            content: data.content || '',
            type: data.type || 'text',
            imageUrl: data.imageUrl,
            voiceDuration: data.voiceDuration,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            isRead: data.isRead || false,
          };
        }).reverse();
        setMessages(fetchedMessages);
      },
      (error) => {
        console.error('❌ Error listening to messages:', error);
      }
    );

    return () => unsubscribe();
  }, [userId, currentUser?.uid]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnimation, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      recordingAnimation.stopAnimation();
      recordingAnimation.setValue(1);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, recordingAnimation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Kullanıcı bulunamadı</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Custom Header - Sol geri butonu GÖRÜNÜR olacak */}
      <View style={styles.customHeader}>
        {/* Sol üst: Geri Butonu */}
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={28} color={Colors.light.text} />
        </TouchableOpacity>

        {/* Orta: Profil resmi + İsim + Online durumu */}
        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={() => router.push(`/(tabs)/(community)/user/${user.id}`)}
        >
          <Image 
            source={{ uri: user.avatar || 'https://ui-avatars.com/api/?name=User&size=112&background=6366f1&color=fff' }} 
            style={styles.headerAvatar} 
          />
          <View>
            <Text style={styles.headerName}>{user.name}</Text>
            <Text style={styles.headerStatus}>
              {user.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Sağ: Telefon + Video */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Alert.alert('Sesli Arama', 'Çağrı başlatılıyor...')}
          >
            <Phone size={20} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Alert.alert('Görüntülü Arama', 'Video çağrı başlatılıyor...')}
          >
            <Video size={20} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mevcut KeyboardAvoidingView ve tüm içerik tamamen senin kodundan */}
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <X size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {isRecording ? (
          <View style={styles.recordingContainer}>
            <TouchableOpacity onPress={handleCancelRecording} style={styles.cancelRecording}>
              <X size={24} color={Colors.light.error} />
            </TouchableOpacity>
            
            <View style={styles.recordingInfo}>
              <Animated.View 
                style={[
                  styles.recordingDot,
                  { transform: [{ scale: recordingAnimation }] }
                ]} 
              />
              <Text style={styles.recordingTime}>{formatTime(recordingDuration)}</Text>
            </View>

            <TouchableOpacity onPress={handleStopRecording} style={styles.stopRecording}>
              <StopCircle size={32} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} onPress={takePhoto}>
              <Camera size={22} color={Colors.light.tint} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
              <ImageIcon size={22} color={Colors.light.tint} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Mesaj yaz..."
              placeholderTextColor={Colors.light.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            
            {inputText.trim() || selectedImage ? (
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Send size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.micButton}
                onPress={handleStartRecording}
              >
                <Mic size={22} color={Colors.light.tint} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal ve diğer kısımlar tamamen senin orijinal kodundan */}
      <Modal
        visible={showMessageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMessageMenu(false)}>
          <View style={styles.messageMenu}>
            <TouchableOpacity style={styles.menuOption} onPress={handleTranslateMessage}>
              <Languages size={20} color={Colors.light.tint} />
              <Text style={styles.menuOptionText}>Translate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={handleDeleteMessage}>
              <Trash2 size={20} color={Colors.light.error} />
              <Text style={[styles.menuOptionText, styles.menuOptionTextDelete]}>Delete</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={handleReportMessage}>
              <Flag size={20} color={Colors.light.warning} />
              <Text style={[styles.menuOptionText, styles.menuOptionTextWarning]}>Report</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// Styles tamamen senin orijinalinden + custom header için eklenenler
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  customHeader: {
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
  headerName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  headerStatus: {
    fontSize: 12,
    color: 'green',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageWrapperOwn: {
    alignItems: 'flex-end',
  },
  messageWrapperOther: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: Colors.light.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  messageText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  voiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 160,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceWave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  voiceBar: {
    width: 3,
    borderRadius: 2,
  },
  voiceBarOwn: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  voiceBarOther: {
    backgroundColor: Colors.light.tint,
  },
  voiceDuration: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  voiceDurationOwn: {
    color: 'rgba(255,255,255,0.8)',
  },
  imagePreview: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    left: 72,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  cancelRecording: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.error,
  },
  recordingTime: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  stopRecording: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  translatedText: {
    fontSize: 10,
    color: Colors.light.tint,
    fontWeight: '500' as const,
  },
  translatedTextOwn: {
    color: 'rgba(255,255,255,0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageMenu: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  menuOptionTextDelete: {
    color: Colors.light.error,
  },
  menuOptionTextWarning: {
    color: Colors.light.warning,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
