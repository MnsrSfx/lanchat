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
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
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
} from 'lucide-react-native';
import { MOCK_USERS, MOCK_MESSAGES, MOCK_CURRENT_USER } from '@/mocks/users';
import { Message } from '@/types';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const user = MOCK_USERS.find(u => u.id === userId);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES.filter(m => m.chatId === 'chat1'));
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<{ [key: string]: string }>({});
  const flatListRef = useRef<FlatList>(null);
  const recordingAnimation = useRef(new Animated.Value(1)).current;
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>User not found</Text>
      </View>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedImage) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      chatId: 'chat1',
      senderId: MOCK_CURRENT_USER.id,
      content: inputText.trim(),
      type: selectedImage ? 'image' : 'text',
      imageUrl: selectedImage || undefined,
      createdAt: new Date(),
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    setSelectedImage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd();
    }, 100);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleStopRecording = () => {
    if (recordingDuration > 0) {
      const newMessage: Message = {
        id: Date.now().toString(),
        chatId: 'chat1',
        senderId: MOCK_CURRENT_USER.id,
        content: 'Voice message',
        type: 'voice',
        voiceDuration: recordingDuration,
        createdAt: new Date(),
        isRead: false,
      };
      setMessages([...messages, newMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setRecordingDuration(0);
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

  const handleDeleteMessage = () => {
    if (selectedMessageId) {
      setMessages(messages.filter(m => m.id !== selectedMessageId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowMessageMenu(false);
    setSelectedMessageId(null);
  };

  const translateMutation = trpc.translate.useMutation();

  const handleTranslateMessage = async () => {
    if (selectedMessageId) {
      const message = messages.find(m => m.id === selectedMessageId);
      if (message && message.type === 'text') {
        if (!currentUser?.nativeLanguage?.code) {
          Alert.alert('Translation Error', 'Please set your native language in profile settings.');
          setShowMessageMenu(false);
          setSelectedMessageId(null);
          return;
        }

        const targetLangCode = currentUser.nativeLanguage.code;
        
        console.log('Translating message:', message.content);
        console.log('Target language:', targetLangCode, '-', currentUser.nativeLanguage.name);
        
        try {
          const result = await translateMutation.mutateAsync({
            text: message.content,
            targetLang: targetLangCode,
          });
          
          console.log('Translation successful:', result.translatedText);
          
          setTranslatedMessages(prev => ({
            ...prev,
            [selectedMessageId]: result.translatedText,
          }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error('Translation error:', error);
          Alert.alert('Translation Error', 'Failed to translate message. Please try again.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === MOCK_CURRENT_USER.id;
    const translatedText = translatedMessages[item.id];
    const isTranslated = !!translatedText && typeof translatedText === 'string' && translatedText.trim().length > 0;

    return (
      <View style={[styles.messageWrapper, isOwn ? styles.messageWrapperOwn : styles.messageWrapperOther]}>
        <Pressable 
          style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}
          onLongPress={() => handleLongPressMessage(item.id)}
        >
          {item.type === 'voice' ? (
            <View style={styles.voiceContent}>
              <TouchableOpacity style={styles.playButton}>
                <Play size={18} color={isOwn ? '#fff' : Colors.light.tint} fill={isOwn ? '#fff' : Colors.light.tint} />
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
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          ) : (
            <>
              <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
                {isTranslated ? translatedText : item.content}
              </Text>
              {isTranslated && (
                <View style={styles.translatedBadge}>
                  <Languages size={10} color={isOwn ? '#fff' : Colors.light.tint} />
                  <Text style={[styles.translatedText, isOwn && styles.translatedTextOwn]}>
                    Translated
                  </Text>
                </View>
              )}
            </>
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
          headerTitle: () => (
            <TouchableOpacity 
              style={styles.headerTitle}
              onPress={() => router.push(`/(tabs)/(community)/user/${user.id}` as any)}
            >
              <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
