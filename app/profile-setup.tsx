import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, MapPin, Calendar, ChevronRight, Check, Globe } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LANGUAGES, PROFICIENCY_LEVELS } from '@/constants/languages';
import { Language } from '@/types';
import Colors from '@/constants/colors';

export default function ProfileSetupScreen() {
  const { user, updateProfile, isUpdateLoading, isAuthenticated, needsProfileSetup } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [bio, setBio] = useState(user?.bio || '');
  const [country, setCountry] = useState(user?.country || '');
  const [city, setCity] = useState(user?.city || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(user?.nativeLanguage || null);
  const [learningLanguages, setLearningLanguages] = useState<Language[]>(user?.learningLanguages || []);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showLearningPicker, setShowLearningPicker] = useState(false);

  const pickImage = async () => {
    if (photos.length >= 4) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSelectNativeLanguage = (lang: Language) => {
    setNativeLanguage({ ...lang, level: 'native' });
    setShowLanguagePicker(false);
  };

  const handleToggleLearningLanguage = (lang: Language) => {
    const exists = learningLanguages.find(l => l.code === lang.code);
    if (exists) {
      setLearningLanguages(learningLanguages.filter(l => l.code !== lang.code));
    } else if (learningLanguages.length < 5) {
      setLearningLanguages([...learningLanguages, { ...lang, level: 'beginner' }]);
    }
  };

  const updateLearningLevel = (code: string, level: Language['level']) => {
    setLearningLanguages(learningLanguages.map(l => 
      l.code === code ? { ...l, level } : l
    ));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        avatar: photos[0] || '',
        photos,
        bio,
        country,
        city,
        age: parseInt(age) || 0,
        nativeLanguage: nativeLanguage || user?.nativeLanguage,
        learningLanguages,
      });
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !needsProfileSetup && !isUpdateLoading) {
      console.log('Profile setup completed, redirecting to main app...');
      router.replace('/(tabs)/community');
    }
  }, [isAuthenticated, needsProfileSetup, isUpdateLoading, router]);

  const canProceed = () => {
    if (step === 1) return photos.length > 0 || bio;
    if (step === 2) return nativeLanguage;
    if (step === 3) return learningLanguages.length > 0;
    return true;
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Set Up Your Profile</Text>
      <Text style={styles.stepSubtitle}>Add a photo and tell us about yourself</Text>

      <View style={styles.photosGrid}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: photo }} style={styles.photoImage} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => removePhoto(index)}
            >
              <Text style={styles.removePhotoText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 4 && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
            <Camera size={28} color={Colors.light.textSecondary} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.photoHint}>{photos.length}/4 photos</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell others about yourself..."
          placeholderTextColor={Colors.light.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          maxLength={200}
        />
        <Text style={styles.charCount}>{bio.length}/200</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Country</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={18} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.inputInner}
              placeholder="Country"
              placeholderTextColor={Colors.light.textSecondary}
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor={Colors.light.textSecondary}
            value={city}
            onChangeText={setCity}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Age</Text>
        <View style={styles.inputWithIcon}>
          <Calendar size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.inputInner}
            placeholder="Your age"
            placeholderTextColor={Colors.light.textSecondary}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Native Language</Text>
      <Text style={styles.stepSubtitle}>Select the language you speak fluently</Text>

      {nativeLanguage && !showLanguagePicker ? (
        <TouchableOpacity 
          style={styles.selectedLanguage}
          onPress={() => setShowLanguagePicker(true)}
        >
          <Text style={styles.languageFlag}>{nativeLanguage.flag}</Text>
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>{nativeLanguage.name}</Text>
            <Text style={styles.languageLevel}>Native Speaker</Text>
          </View>
          <ChevronRight size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.languageList}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                nativeLanguage?.code === lang.code && styles.languageOptionSelected,
              ]}
              onPress={() => handleSelectNativeLanguage(lang)}
            >
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={styles.languageName}>{lang.name}</Text>
              {nativeLanguage?.code === lang.code && (
                <Check size={20} color={Colors.light.tint} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Learning Languages</Text>
      <Text style={styles.stepSubtitle}>Select languages you want to learn (up to 5)</Text>

      {learningLanguages.length > 0 && (
        <View style={styles.selectedLearning}>
          {learningLanguages.map(lang => (
            <View key={lang.code} style={styles.learningCard}>
              <View style={styles.learningHeader}>
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
                <TouchableOpacity
                  onPress={() => handleToggleLearningLanguage(lang)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.levelSelector}>
                {PROFICIENCY_LEVELS.filter(l => l.value !== 'native').map(level => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.levelOption,
                      lang.level === level.value && styles.levelOptionSelected,
                    ]}
                    onPress={() => updateLearningLevel(lang.code, level.value as Language['level'])}
                  >
                    <Text style={[
                      styles.levelText,
                      lang.level === level.value && styles.levelTextSelected,
                    ]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={styles.addLanguageButton}
        onPress={() => setShowLearningPicker(!showLearningPicker)}
      >
        <Globe size={20} color={Colors.light.tint} />
        <Text style={styles.addLanguageText}>
          {showLearningPicker ? 'Hide Languages' : 'Add Language'}
        </Text>
      </TouchableOpacity>

      {showLearningPicker && (
        <View style={styles.languageList}>
          {LANGUAGES.filter(l => l.code !== nativeLanguage?.code).map(lang => {
            const isSelected = learningLanguages.some(l => l.code === lang.code);
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  isSelected && styles.languageOptionSelected,
                ]}
                onPress={() => handleToggleLearningLanguage(lang)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
                {isSelected && <Check size={20} color={Colors.light.tint} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        {[1, 2, 3].map(s => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
            step === 1 && styles.nextButtonFull,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isUpdateLoading}
        >
          {isUpdateLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 3 ? 'Complete Setup' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
  },
  progressDotActive: {
    backgroundColor: Colors.light.tint,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 24,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600' as const,
    marginTop: -2,
  },
  addPhotoButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  photoHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputInner: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  languageLevel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  languageList: {
    marginTop: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  languageOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  selectedLearning: {
    marginBottom: 16,
  },
  learningCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  removeButton: {
    marginLeft: 'auto',
  },
  removeText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '500' as const,
  },
  levelSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: 'center',
  },
  levelOptionSelected: {
    backgroundColor: Colors.light.tint,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  levelTextSelected: {
    color: '#fff',
  },
  addLanguageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderStyle: 'dashed',
  },
  addLanguageText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.tint,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  backButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceSecondary,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  nextButton: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
