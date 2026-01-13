import { Audio } from 'expo-av';
import { useState, useEffect } from 'react';
import { Button, Text, View } from 'react-native';

export default function VoiceMessagePlayer({ audioUrl }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const playSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          newSound.unloadAsync();
        }
      });
    } catch (err) {
      setError(err.message);
      console.error('Çalma hatası:', err);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  return (
    <View>
      <Button title={isPlaying ? 'Durdur' : 'Çal'} onPress={isPlaying ? stopSound : playSound} />
      {error && <Text>Hata: {error}</Text>}
    </View>
  );
}
