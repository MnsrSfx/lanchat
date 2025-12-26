import React, { useState } from 'react';
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
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, MapPin, Calendar, ChevronRight, Check, X, Globe } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LANGUAGES, PROFICIENCY_LEVELS } from '@/constants/languages';
import { Language } from '@/types';
import Colors from '@/constants/colors';

export default function EditProfileScreen() {
  const { user, updateProfile, isUpdateLoading } = useAuth();
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [country, setCountry] = useState(user?.country || '');
  const [city, setCity] = useState(user?.city || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [nativeLanguage, setNativeLanguage] = useState<Language | null>(user?.nativeLanguage || null);
  const [learningLanguages, setLearningLanguages] = useState<Language[]>(user?.learningLanguages || []);
  const [showNativePicker, setShowNativePicker] = useState(false);
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
    setShowNativePicker(false);
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

  const handleSave = () => {
    updateProfile({
      avatar: photos[0] || '',
      photos,
      name,
      bio,
      country,
      city,
      age: parseInt(age) || 0,
      nativeLanguage: nativeLanguage || user?.nativeLanguage,
      learningLanguages,
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={isUpdateLoading}>
              {isUpdateLoading ? (
                <ActivityIndicator size="small" color={Colors.light.tint} />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.light.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Native Language</Text>
            <TouchableOpacity
              style={styles.languageSelector}
              onPress={() => setShowNativePicker(!showNativePicker)}
            >
              {nativeLanguage ? (
                <>
                  <Text style={styles.languageFlag}>{nativeLanguage.flag}</Text>
                  <Text style={styles.languageName}>{nativeLanguage.name}</Text>
                </>
              ) : (
                <Text style={styles.placeholderText}>Select language</Text>
              )}
              <ChevronRight size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            {showNativePicker && (
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Learning Languages</Text>

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
                        <X size={18} color={Colors.light.error} />
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
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.tint,
  },
  avatarSection: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
    marginBottom: 16,
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
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  languageList: {
    marginTop: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  languageOptionSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  selectedLearning: {
    marginBottom: 12,
  },
  learningCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  removeButton: {
    padding: 4,
  },
  levelSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  levelOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
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
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    borderStyle: 'dashed',
  },
  addLanguageText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.tint,
  },
});
