import { useState, useEffect, useRef, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { db } from '@/src/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Call } from '@/types';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

interface CallContextValue {
  incomingCall: Call | null;
  activeCall: Call | null;
  isInCall: boolean;
  initiateCall: (receiverId: string, receiverName: string, receiverAvatar: string) => Promise<string | null>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

export const [CallProvider, useCall] = createContextHook<CallContextValue>(() => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const ringtoneRef = useRef<Audio.Sound | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playRingtone = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { isLooping: true, volume: 1.0 }
      );
      ringtoneRef.current = sound;
      await sound.playAsync();
      console.log('🔔 Playing ringtone');
    } catch (error) {
      console.error('❌ Error playing ringtone:', error);
    }
  }, []);

  const stopRingtone = useCallback(async () => {
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
        ringtoneRef.current = null;
        console.log('🔕 Stopped ringtone');
      } catch (error) {
        console.error('❌ Error stopping ringtone:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.uid || !db) {
      console.log('⚠️ Call listener not started - no user or db');
      return;
    }

    console.log('📞 Setting up incoming call listener for user:', user.uid);
    
    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log('📞 No incoming calls');
        if (incomingCall) {
          stopRingtone();
          setIncomingCall(null);
        }
        return;
      }

      const callDoc = snapshot.docs[0];
      const data = callDoc.data();
      
      const call: Call = {
        id: callDoc.id,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        receiverAvatar: data.receiverAvatar,
        type: data.type || 'voice',
        status: data.status,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        answeredAt: data.answeredAt instanceof Timestamp ? data.answeredAt.toDate() : undefined,
        endedAt: data.endedAt instanceof Timestamp ? data.endedAt.toDate() : undefined,
        endedBy: data.endedBy,
      };

      console.log('📞 Incoming call from:', call.callerName);
      setIncomingCall(call);
      playRingtone();
    }, (error) => {
      console.error('❌ Error listening for calls:', error);
    });

    return () => {
      console.log('🔌 Cleaning up call listener');
      unsubscribe();
      stopRingtone();
    };
  }, [user?.uid, incomingCall, playRingtone, stopRingtone]);

  useEffect(() => {
    if (!activeCall?.id || !db) return;

    console.log('📞 Listening to active call:', activeCall.id);
    
    const callDocRef = doc(db, 'calls', activeCall.id);
    const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('📞 Call document deleted');
        setActiveCall(null);
        stopRingtone();
        return;
      }

      const data = snapshot.data();
      const updatedCall: Call = {
        id: snapshot.id,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        receiverAvatar: data.receiverAvatar,
        type: data.type || 'voice',
        status: data.status,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        answeredAt: data.answeredAt instanceof Timestamp ? data.answeredAt.toDate() : undefined,
        endedAt: data.endedAt instanceof Timestamp ? data.endedAt.toDate() : undefined,
        endedBy: data.endedBy,
      };

      console.log('📞 Active call updated:', updatedCall.status);
      
      if (updatedCall.status === 'declined' || updatedCall.status === 'ended' || updatedCall.status === 'missed') {
        setActiveCall(null);
        stopRingtone();
      } else {
        setActiveCall(updatedCall);
      }
    });

    return () => unsubscribe();
  }, [activeCall?.id, stopRingtone]);

  const initiateCall = useCallback(async (
    receiverId: string, 
    receiverName: string, 
    receiverAvatar: string
  ): Promise<string | null> => {
    if (!user?.uid || !db) {
      console.error('❌ Cannot initiate call - no user or db');
      return null;
    }

    try {
      const callId = `${user.uid}_${receiverId}_${Date.now()}`;
      const callDocRef = doc(db, 'calls', callId);
      
      const callData = {
        callerId: user.uid,
        callerName: user.name || 'Unknown',
        callerAvatar: user.avatar || '',
        receiverId,
        receiverName,
        receiverAvatar,
        type: 'voice',
        status: 'ringing',
        createdAt: serverTimestamp(),
      };

      await setDoc(callDocRef, callData);
      console.log('📞 Call initiated:', callId);

      const newCall: Call = {
        id: callId,
        callerId: callData.callerId,
        callerName: callData.callerName,
        callerAvatar: callData.callerAvatar,
        receiverId: callData.receiverId,
        receiverName: callData.receiverName,
        receiverAvatar: callData.receiverAvatar,
        type: 'voice' as const,
        status: 'ringing' as const,
        createdAt: new Date(),
      };
      setActiveCall(newCall);

      callTimeoutRef.current = setTimeout(async () => {
        console.log('📞 Call timeout - marking as missed');
        try {
          await updateDoc(callDocRef, {
            status: 'missed',
            endedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error('❌ Error updating call timeout:', error);
        }
      }, 30000);

      return callId;
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      return null;
    }
  }, [user]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall?.id || !db) {
      console.error('❌ Cannot accept call - no incoming call');
      return;
    }

    try {
      const callDocRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callDocRef, {
        status: 'accepted',
        answeredAt: serverTimestamp(),
      });
      
      console.log('📞 Call accepted');
      stopRingtone();
      setActiveCall({ ...incomingCall, status: 'accepted', answeredAt: new Date() });
      setIncomingCall(null);
    } catch (error) {
      console.error('❌ Error accepting call:', error);
    }
  }, [incomingCall, stopRingtone]);

  const declineCall = useCallback(async () => {
    if (!incomingCall?.id || !db) {
      console.error('❌ Cannot decline call - no incoming call');
      return;
    }

    try {
      const callDocRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callDocRef, {
        status: 'declined',
        endedAt: serverTimestamp(),
        endedBy: user?.uid,
      });
      
      console.log('📞 Call declined');
      stopRingtone();
      setIncomingCall(null);
    } catch (error) {
      console.error('❌ Error declining call:', error);
    }
  }, [incomingCall, user?.uid, stopRingtone]);

  const endCall = useCallback(async () => {
    const callToEnd = activeCall || incomingCall;
    
    if (!callToEnd?.id || !db) {
      console.error('❌ Cannot end call - no active call');
      return;
    }

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    try {
      const callDocRef = doc(db, 'calls', callToEnd.id);
      await updateDoc(callDocRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        endedBy: user?.uid,
      });
      
      console.log('📞 Call ended');
      stopRingtone();
      setActiveCall(null);
      setIncomingCall(null);
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }, [activeCall, incomingCall, user?.uid, stopRingtone]);

  return {
    incomingCall,
    activeCall,
    isInCall: !!activeCall && activeCall.status === 'accepted',
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
  };
});
