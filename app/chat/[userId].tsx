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
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { db, storage } from '@/src/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
} from 'lucide-react-native';
import { Message, User } from '@/types';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp, deleteDoc, setDoc } from 'firebase/firestore';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';
import PhotoGalleryModal from '@/components/PhotoGalleryModal';

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
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const recordingAnimation = useRef(new Animated.Value(1)).current;
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            voiceUrl: data.voiceUrl,
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

    return () => {
      console.log('🔌 Cleaning up messages listener');
      unsubscribe();
    };
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

  useEffect(() => {
    return () => {
      if (playingSound) {
        playingSound.unloadAsync();
      }
    };
  }, [playingSound]);

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
        <Text style={styles.errorText}>User not found</Text>
        <Text style={[styles.errorText, { fontSize: 14, marginTop: 8 }]}>
          {userId ? `User ID: ${userId}` : 'No user ID provided'}
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadImageToStorage = async (uri: string): Promise<string> => {
    if (!storage || !currentUser?.uid) {
      throw new Error('Storage not initialized or user not found');
    }

    try {
      console.log('📤 Uploading image to storage...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `chat-images/${currentUser.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;
    if (!userId || !currentUser?.uid || !db) {
      console.error('❌ Cannot send message - missing required data');
      return;
    }

    const chatId = [currentUser.uid, userId].sort().join('_');
    const messageContent = inputText.trim();
    const messageType = selectedImage ? 'image' : 'text';

    console.log('📤 Sending message to chatId:', chatId);

    setIsUploading(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImageToStorage(selectedImage);
      }

      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(chatDocRef, {
        participants: [currentUser.uid, userId],
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.name || 'Unknown',
        content: messageContent,
        type: messageType,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        isRead: false,
      });

      console.log('✅ Message sent successfully');
      setInputText('');
      setSelectedImage(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setAudioRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const handleStopRecording = async () => {
    if (!audioRecording || recordingDuration === 0 || !userId || !currentUser?.uid || !db || !storage) {
      console.error('❌ Cannot send voice message - missing required data');
      setIsRecording(false);
      setRecordingDuration(0);
      setAudioRecording(null);
      return;
    }

    const chatId = [currentUser.uid, userId].sort().join('_');
    setIsUploading(true);
    
    try {
      console.log('⏹️ Stopping recording...');
      await audioRecording.stopAndUnloadAsync();
      const uri = audioRecording.getURI();
      
      if (!uri) {
        throw new Error('Recording URI not found');
      }

      console.log('📤 Uploading audio to storage...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `voice-messages/${currentUser.uid}/${Date.now()}.m4a`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const audioUrl = await getDownloadURL(storageRef);
      
      console.log('✅ Audio uploaded successfully:', audioUrl);

      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(chatDocRef, {
        participants: [currentUser.uid, userId],
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.name || 'Unknown',
        content: 'Voice message',
        type: 'voice',
        voiceUrl: audioUrl,
        voiceDuration: recordingDuration,
        createdAt: serverTimestamp(),
        isRead: false,
      });
      
      console.log('✅ Voice message sent successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Error sending voice message:', error);
      Alert.alert('Error', 'Failed to send voice message.');
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
      setAudioRecording(null);
      setIsUploading(false);
    }
  };

  const handleCancelRecording = async () => {
    try {
      if (audioRecording) {
        await audioRecording.stopAndUnloadAsync();
      }
    } catch (error) {
      console.error('❌ Error canceling recording:', error);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioRecording(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleLongPressMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowMessageMenu(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteMessage = async () => {
    if (selectedMessageId && userId && currentUser?.uid && db) {
      const chatId = [currentUser.uid, userId].sort().join('_');
      
      try {
        const messageRef = doc(db, 'chats', chatId, 'messages', selectedMessageId);
        await deleteDoc(messageRef);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('❌ Error deleting message:', error);
        Alert.alert('Error', 'Failed to delete message.');
      }
    }
    setShowMessageMenu(false);
    setSelectedMessageId(null);
  };

  const handleTranslateMessage = async () => {
    if (selectedMessageId) {
      const message = messages.find(m => m.id === selectedMessageId);
      if (message && message.type === 'text') {
        Alert.alert('Translation', 'Translation feature will be available soon.');
      }
    }
    setShowMessageMenu(false);
    setSelectedMessageId(null);
  };

  const handleReportMessage = () => {
    Alert.alert(
      'Report Message',
      'Are you sure you want to report this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          style: 'destructive',
          onPress: () => {
            console.log('Message reported:', selectedMessageId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Thank You', 'Your report has been submitted.');
          }
        },
      ]
    );
    setShowMessageMenu(false);
    setSelectedMessageId(null);
  };

  const handlePlayVoice = async (messageId: string, voiceUrl: string) => {
    try {
      if (playingMessageId === messageId && playingSound) {
        console.log('⏸️ Pausing voice message');
        await playingSound.pauseAsync();
        setPlayingMessageId(null);
        return;
      }

      if (playingSound) {
        await playingSound.unloadAsync();
      }

      console.log('▶️ Playing voice message:', voiceUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true }
      );

      setPlayingSound(sound);
      setPlayingMessageId(messageId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('✅ Voice message finished playing');
          setPlayingMessageId(null);
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('❌ Error playing voice message:', error);
      Alert.alert('Error', 'Failed to play voice message.');
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.senderId === currentUser?.uid;
    const isPlaying = playingMessageId === item.id;

    return (
      <View style={[styles.messageWrapper, isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther]}>
        <Pressable 
          style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}
          onLongPress={() => handleLongPressMessage(item.id)}
        >
          {item.type === 'voice' ? (
            <View style={styles.voiceContent}>
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => item.voiceUrl && handlePlayVoice(item.id, item.voiceUrl)}
                disabled={!item.voiceUrl}
              >
                {isPlaying ? (
                  <StopCircle size={18} color={isOwn ? '#fff' : Colors.light.tint} fill={isOwn ? '#fff' : Colors.light.tint} />
                ) : (
                  <Play size={18} color={isOwn ? '#fff' : Colors.light.tint} fill={isOwn ? '#fff' : Colors.light.tint} />
                )}
              </TouchableOpacity>
              <View style={styles.voiceWave}>
                {[...Array(12)].map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.voiceBar, 
                      { height: Math.random() * 16 + 8 },
                      isOwn ? styles.voiceBarOwn : styles.voiceBarOther
                    ]} 
                  />
                ))}
              </View>
              <Text style={[styles.voiceDuration, isOwn && styles.voiceDurationOwn]}>
                {formatTime(item.voiceDuration || 0)}
              </Text>
            </View>
          ) : item.type === 'image' && item.imageUrl ? (
            <TouchableOpacity onPress={() => {
              const imageMessages = messages.filter(m => m.type === 'image' && m.imageUrl);
              const imageIndex = imageMessages.findIndex(m => m.id === item.id);
              setSelectedImageIndex(imageIndex >= 0 ? imageIndex : 0);
              setShowImageGallery(true);
            }}>
              <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {item.content}
            </Text>
          )}
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerBackVisible: true,
          headerTitle: () => (
            <TouchableOpacity 
              style={styles.headerTitle}
              onPress={() => router.push(`/(tabs)/community/user/${user.id}` as any)}
            >
              <Avatar uri={user.avatar} name={user.name} size={36} />
              <View>
                <Text style={styles.headerName}>{user.name}</Text>
                <Text style={styles.headerStatus}>
                  {user.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push(`/call/${user.id}?type=voice` as any)}
              >
                <Phone size={20} color={Colors.light.tint} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push(`/call/${user.id}?type=video` as any)}
              >
                <Video size={20} color={Colors.light.tint} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

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
              placeholder="Type a message..."
              placeholderTextColor={Colors.light.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isUploading}
            />
            
            {inputText.trim() || selectedImage ? (
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handleSend}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.micButton}
                onPress={handleStartRecording}
                disabled={isUploading}
              >
                <Mic size={22} color={Colors.light.tint} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

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

      <PhotoGalleryModal
        visible={showImageGallery}
        photos={messages
          .filter(m => m.type === 'image' && m.imageUrl)
          .map(m => m.imageUrl!)}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageGallery(false)}
      />
    </SafeAreaView>
  );
}

// styles kısmı aynı kalıyor, değiştirmedim
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  keyboardView: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
});
