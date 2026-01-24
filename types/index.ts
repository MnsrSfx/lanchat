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
  type: 'text' | 'voice' | 'image' | 'call';
  voiceDuration?: number;
  voiceUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  isRead: boolean;
  replyToId?: string;
  replyToContent?: string;
  replyToSenderId?: string;
  replyToType?: 'text' | 'voice' | 'image';
  callStatus?: 'completed' | 'missed' | 'declined';
  callDuration?: number;
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
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'voice';
  status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'busy';
  createdAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  endedBy?: string;
  callerMuted?: boolean;
  receiverMuted?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsProfileSetup: boolean;
}
