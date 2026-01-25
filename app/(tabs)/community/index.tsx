import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, Filter, MapPin, Circle, X, ChevronDown, RotateCcw } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';
import { LANGUAGES } from '@/constants/languages';
import { User } from '@/types';
import Colors from '@/constants/colors';
import { db } from '@/src/firebase';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';

export default function CommunityScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(99);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [tempMinAge, setTempMinAge] = useState(18);
  const [tempMaxAge, setTempMaxAge] = useState(99);
  const [memberFilter, setMemberFilter] = useState<'all' | 'new'>('all');

  const ageOptions = useMemo(() => {
    const ages: number[] = [];
    for (let i = 18; i <= 99; i++) {
      ages.push(i);
    }
    return ages;
  }, []);

  const isAgeFilterActive = minAge !== 18 || maxAge !== 99;

  const resetFilters = useCallback(() => {
    setSelectedLanguage(null);
    setShowOnlineOnly(false);
    setMinAge(18);
    setMaxAge(99);
    setSearchQuery('');
    setMemberFilter('all');
  }, []);

  const formatLastSeen = useCallback((lastSeen: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  }, []);

  const isNewMember = useCallback((createdAt: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    return diffDays <= 7;
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (showOnlineOnly) count++;
    if (selectedLanguage) count++;
    if (isAgeFilterActive) count++;
    if (memberFilter === 'new') count++;
    return count;
  }, [showOnlineOnly, selectedLanguage, isAgeFilterActive, memberFilter]);

  useEffect(() => {
    if (!db) {
      console.error('Firestore is not initialized');
      setLoading(false);
      return;
    }
    
    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const lastSeenDate = data.lastSeen ? (data.lastSeen as Timestamp).toDate() : new Date(0);
        const now = new Date();
        const timeDiffMs = now.getTime() - lastSeenDate.getTime();
        const isActuallyOnline = data.isOnline && timeDiffMs < 120000;
        
        const userData: User = {
          id: doc.id,
          uid: data.uid,
          email: data.email || '',
          name: data.displayName || '',
          avatar: data.photoURL || '',
          photos: data.photos || [],
          bio: data.bio || '',
          nativeLanguage: data.nativeLanguage || { code: 'en', name: 'English', flag: '🇺🇸', level: 'native' },
          learningLanguages: data.learningLanguages || [],
          isOnline: isActuallyOnline,
          lastSeen: lastSeenDate,
          country: data.country || '',
          city: data.city || '',
          age: data.age || 0,
          isVerified: data.isVerified || false,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
        };
        if (userData.uid !== user?.uid) {
          fetchedUsers.push(userData);
        }
      });
      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredUsers = useMemo(() => {
    let filteredList = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredList = filteredList.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.country.toLowerCase().includes(query) ||
        u.city.toLowerCase().includes(query)
      );
    }

    if (selectedLanguage) {
      filteredList = filteredList.filter(u => 
        u.nativeLanguage.code === selectedLanguage ||
        u.learningLanguages.some(l => l.code === selectedLanguage)
      );
    }

    if (showOnlineOnly) {
      filteredList = filteredList.filter(u => u.isOnline);
    }

    filteredList = filteredList.filter(u => {
      if (!u.age || u.age === 0) return true;
      return u.age >= minAge && u.age <= maxAge;
    });

    if (memberFilter === 'new') {
      filteredList = filteredList.filter(u => isNewMember(u.createdAt));
    }

    const myLearningCodes = user?.learningLanguages.map(l => l.code) || [];
    
    return filteredList.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      
      const aMatchesMyLearning = myLearningCodes.includes(a.nativeLanguage.code);
      const bMatchesMyLearning = myLearningCodes.includes(b.nativeLanguage.code);
      
      if (aMatchesMyLearning !== bMatchesMyLearning) {
        return aMatchesMyLearning ? -1 : 1;
      }
      
      return 0;
    });
  }, [users, searchQuery, selectedLanguage, showOnlineOnly, minAge, maxAge, user?.learningLanguages, memberFilter, isNewMember]);

  const nativeSpeakers = useMemo(() => {
    const learningLanguages = user?.learningLanguages || [];
    if (learningLanguages.length === 0) return [];
    return filteredUsers.filter(u => 
      learningLanguages.some(l => u.nativeLanguage.code === l.code)
    );
  }, [filteredUsers, user?.learningLanguages]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleUserPress = (userId: string) => {
    router.push(`/(tabs)/community/user/${userId}`);
  };

  const renderUserCard = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => handleUserPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={item.avatar}
          name={item.name}
          size={52}
        />
        {item.isOnline && (
          <View style={[styles.onlineIndicator, styles.online]} />
        )}
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        
        <View style={styles.locationRow}>
          <MapPin size={12} color={Colors.light.textSecondary} />
          <Text style={styles.locationText}>
            {item.city}, {item.country}
          </Text>
          {!item.isOnline && item.lastSeen && (
            <Text style={styles.lastSeenText}> · {formatLastSeen(item.lastSeen)}</Text>
          )}
        </View>

        <View style={styles.languagesRow}>
          <Text style={styles.nativeFlag}>{item.nativeLanguage.flag}</Text>
          <Text style={styles.languageArrow}>→</Text>
          {item.learningLanguages.slice(0, 3).map(lang => (
            <Text key={lang.code} style={styles.learningFlag}>{lang.flag}</Text>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.messageButton}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Text style={styles.messageButtonText}>Chat</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {nativeSpeakers.length > 0 && !searchQuery && !selectedLanguage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Native Speakers for You</Text>
          <Text style={styles.sectionSubtitle}>
            People who speak the languages you&apos;re learning
          </Text>
          <FlatList
            horizontal
            data={nativeSpeakers}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.nativeSpeakerCard}
                onPress={() => handleUserPress(item.id)}
              >
                <View style={styles.nativeAvatarContainer}>
                  <Avatar
                    uri={item.avatar}
                    name={item.name}
                    size={56}
                  />
                  {item.isOnline && (
                    <View style={[styles.nativeOnlineIndicator, styles.online]} />
                  )}
                </View>
                <Text style={styles.nativeName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.nativeLanguageText}>{item.nativeLanguage.flag} Native</Text>
                {!item.isOnline && item.lastSeen && (
                  <Text style={styles.nativeLastSeen}>{formatLastSeen(item.lastSeen)}</Text>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.nativeList}
          />
        </View>
      )}

      <View style={styles.filterSection}>
        <Text style={styles.allUsersTitle}>{memberFilter === 'new' ? 'New Members' : 'All Members'}</Text>
        <Text style={styles.resultsCount}>{filteredUsers.length} members found</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Community',
          headerLargeTitle: true,
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor={Colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? '#fff' : Colors.light.tint} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, showOnlineOnly && styles.filterChipActive]}
              onPress={() => setShowOnlineOnly(!showOnlineOnly)}
            >
              <Circle size={10} color={showOnlineOnly ? '#fff' : Colors.light.online} fill={showOnlineOnly ? '#fff' : Colors.light.online} />
              <Text style={[styles.filterChipText, showOnlineOnly && styles.filterChipTextActive]}>
                Online
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, isAgeFilterActive && styles.filterChipActive]}
              onPress={() => {
                setTempMinAge(minAge);
                setTempMaxAge(maxAge);
                setShowAgeModal(true);
              }}
            >
              <Text style={[styles.filterChipText, isAgeFilterActive && styles.filterChipTextActive]}>
                Age: {minAge}-{maxAge}
              </Text>
              <ChevronDown size={14} color={isAgeFilterActive ? '#fff' : Colors.light.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, memberFilter === 'all' && styles.filterChipActive]}
              onPress={() => setMemberFilter('all')}
            >
              <Text style={[styles.filterChipText, memberFilter === 'all' && styles.filterChipTextActive]}>
                All Members
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, memberFilter === 'new' && styles.filterChipActive]}
              onPress={() => setMemberFilter('new')}
            >
              <Text style={[styles.filterChipText, memberFilter === 'new' && styles.filterChipTextActive]}>
                New Members
              </Text>
            </TouchableOpacity>

            {activeFiltersCount > 0 && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <RotateCcw size={14} color={Colors.light.tint} />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.languageFilters}
            contentContainerStyle={styles.languageFiltersContent}
          >
            {LANGUAGES.slice(0, 10).map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.filterChip,
                  selectedLanguage === item.code && styles.filterChipActive
                ]}
                onPress={() => setSelectedLanguage(
                  selectedLanguage === item.code ? null : item.code
                )}
              >
                <Text style={styles.filterFlag}>{item.flag}</Text>
                <Text style={[
                  styles.filterChipText,
                  selectedLanguage === item.code && styles.filterChipTextActive
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Modal
        visible={showAgeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Age Range</Text>
              <TouchableOpacity onPress={() => setShowAgeModal(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ageSelectors}>
              <View style={styles.ageSelectorColumn}>
                <Text style={styles.ageSelectorLabel}>Min Age</Text>
                <ScrollView 
                  style={styles.ageScrollView}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {ageOptions.map((age) => (
                    <TouchableOpacity
                      key={`min-${age}`}
                      style={[
                        styles.ageOption,
                        tempMinAge === age && styles.ageOptionSelected
                      ]}
                      onPress={() => {
                        setTempMinAge(age);
                        if (age > tempMaxAge) {
                          setTempMaxAge(age);
                        }
                      }}
                    >
                      <Text style={[
                        styles.ageOptionText,
                        tempMinAge === age && styles.ageOptionTextSelected
                      ]}>
                        {age}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.ageSeparator}>
                <Text style={styles.ageSeparatorText}>to</Text>
              </View>

              <View style={styles.ageSelectorColumn}>
                <Text style={styles.ageSelectorLabel}>Max Age</Text>
                <ScrollView 
                  style={styles.ageScrollView}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {ageOptions.filter(age => age >= tempMinAge).map((age) => (
                    <TouchableOpacity
                      key={`max-${age}`}
                      style={[
                        styles.ageOption,
                        tempMaxAge === age && styles.ageOptionSelected
                      ]}
                      onPress={() => setTempMaxAge(age)}
                    >
                      <Text style={[
                        styles.ageOptionText,
                        tempMaxAge === age && styles.ageOptionTextSelected
                      ]}>
                        {age}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalResetButton}
                onPress={() => {
                  setTempMinAge(18);
                  setTempMaxAge(99);
                }}
              >
                <Text style={styles.modalResetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => {
                  setMinAge(tempMinAge);
                  setMaxAge(tempMaxAge);
                  setShowAgeModal(false);
                }}
              >
                <Text style={styles.modalApplyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{loading ? 'Loading...' : 'No users found'}</Text>
            {!loading && <Text style={styles.emptyText}>Try adjusting your filters</Text>}
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  filterButtonActive: {
    backgroundColor: Colors.light.tint,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.accentLight,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.tint,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.text,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterFlag: {
    fontSize: 16,
  },
  languageFilters: {
    marginTop: 10,
  },
  languageFiltersContent: {
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: 480,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  ageSelectors: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  ageSelectorColumn: {
    flex: 1,
    alignItems: 'center',
  },
  ageSelectorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  ageScrollView: {
    height: 240,
  },
  ageOption: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
  ageOptionSelected: {
    backgroundColor: Colors.light.tint,
  },
  ageOptionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  ageOptionTextSelected: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  ageSeparator: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  ageSeparatorText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  modalResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  modalResetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  modalApplyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  listContent: {
    paddingBottom: 100,
  },
  section: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.text,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  nativeList: {
    paddingHorizontal: 16,
  },
  nativeSpeakerCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  nativeAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  nativeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nativeOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },
  nativeName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.text,
    textAlign: 'center',
  },
  nativeLanguageText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  nativeLastSeen: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  allUsersTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.text,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  userCard: {
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  verifiedBadge: {
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.light.accent,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  lastSeenText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  languagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  nativeFlag: {
    fontSize: 18,
  },
  languageArrow: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginHorizontal: 4,
  },
  learningFlag: {
    fontSize: 16,
  },
  messageButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },
});
