import { useState } from 'react';
import { Button, View } from 'react-native';
import { Audio } from 'expo-av';
import firebase from 'firebase/app'; // Firebase'i import et (mevcut config'ten)
import 'firebase/storage'; // Storage modülü

export default function VoiceRecorder({ onSend }) { // onSend: Mesajı göndermek için callback
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Kaydetme hatası:', err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const response = await fetch(uri);
      const blob = await response.blob();
      const ref = firebase.storage().ref().child(`audio/${Date.now()}.m4a`);
      await ref.put(blob);
      const audioUrl = await ref.getDownloadURL();
      onSend({ type: 'voice', audioUrl }); // Mesajı chat'e gönder (Firestore'a kaydet)
    } catch (err) {
      console.error('Upload hatası:', err);
    }
  };

  return (
    <View>
      <Button 
        title={isRecording ? 'Durdur' : 'Ses Kaydet'} 
        onPress={isRecording ? stopRecording : startRecording} 
      />
    </View>
  );
}
