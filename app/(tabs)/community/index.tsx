import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, Filter, MapPin, Circle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
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

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
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
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen ? (data.lastSeen as Timestamp).toDate() : new Date(),
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

    return filteredList;
  }, [users, searchQuery, selectedLanguage, showOnlineOnly]);

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
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={[styles.onlineIndicator, item.isOnline ? styles.online : styles.offline]} />
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
                  <Image source={{ uri: item.avatar }} style={styles.nativeAvatar} />
                  <View style={[styles.nativeOnlineIndicator, item.isOnline ? styles.online : styles.offline]} />
                </View>
                <Text style={styles.nativeName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.nativeLanguageText}>{item.nativeLanguage.flag} Native</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.nativeList}
          />
        </View>
      )}

      <View style={styles.filterSection}>
        <Text style={styles.allUsersTitle}>All Members</Text>
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
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterChip, showOnlineOnly && styles.filterChipActive]}
            onPress={() => setShowOnlineOnly(!showOnlineOnly)}
          >
            <Circle size={10} color={showOnlineOnly ? '#fff' : Colors.light.online} fill={showOnlineOnly ? '#fff' : Colors.light.online} />
            <Text style={[styles.filterChipText, showOnlineOnly && styles.filterChipTextActive]}>
              Online
            </Text>
          </TouchableOpacity>

          <FlatList
            horizontal
            data={LANGUAGES.slice(0, 10)}
            renderItem={({ item }) => (
              <TouchableOpacity
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
            )}
            keyExtractor={item => item.code}
            showsHorizontalScrollIndicator={false}
            style={styles.languageFilters}
          />
        </View>
      )}

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
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
