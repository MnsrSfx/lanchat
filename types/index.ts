export interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  avatar: string;
  photos: string[];
  bio: string;
  nativeLanguage: Language;
  learningLanguages: Language[];
  isOnline: boolean;
  lastSeen: Date;
  country: string;
  city: string;
  age: number;
  isVerified: boolean;
  createdAt: Date;
  notificationsEnabled?: boolean;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'native';
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'image';
  voiceDuration?: number;
  imageUrl?: string;
  createdAt: Date;
  isRead: boolean;
}

export interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: 'calling' | 'ongoing' | 'ended' | 'missed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsProfileSetup: boolean;
}
