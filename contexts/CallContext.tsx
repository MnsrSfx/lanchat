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
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { webRTCService } from '@/services/webrtc';

interface CallContextValue {
  incomingCall: Call | null;
  activeCall: Call | null;
  isInCall: boolean;
  isMuted: boolean;
  connectionState: string | null;
  iceConnectionState: string | null;
  isWebRTCSupported: boolean;
  initiateCall: (receiverId: string, receiverName: string, receiverAvatar: string) => Promise<string | null>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
}

export const [CallProvider, useCall] = createContextHook<CallContextValue>(() => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [iceConnectionState, setIceConnectionState] = useState<string | null>(null);
  const ringtoneRef = useRef<AudioPlayer | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWebRTCSupported = webRTCService.isSupported();
  const isEndingCallRef = useRef(false);

  const handleWebRTCCallEnded = useCallback(async () => {
    if (isEndingCallRef.current) return;
    console.log('📞 WebRTC triggered call end');
    isEndingCallRef.current = true;
    
    const callToEnd = activeCall;
    if (callToEnd?.id && db) {
      try {
        const callDocRef = doc(db, 'calls', callToEnd.id);
        await updateDoc(callDocRef, {
          status: 'ended',
          endedAt: serverTimestamp(),
          endedBy: 'system',
        });
      } catch (error) {
        console.error('❌ Error updating call status:', error);
      }
    }
    
    setActiveCall(null);
    setConnectionState(null);
    setIceConnectionState(null);
    isEndingCallRef.current = false;
  }, [activeCall]);

  useEffect(() => {
    webRTCService.setCallbacks({
      onConnectionStateChange: (state) => {
        console.log('📞 WebRTC connection state changed:', state);
        setConnectionState(state);
      },
      onIceConnectionStateChange: (state) => {
        console.log('📞 WebRTC ICE connection state changed:', state);
        setIceConnectionState(state);
      },
      onError: (error) => {
        console.error('📞 WebRTC error:', error);
      },
      onCallEnded: handleWebRTCCallEnded,
    });
  }, [handleWebRTCCallEnded]);

  const playRingtone = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        console.log('🔔 Web platform - ringtone skipped but call modal should show');
        return;
      }
      
      const player = createAudioPlayer(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' }
      );
      player.loop = true;
      ringtoneRef.current = player;
      player.play();
      console.log('🔔 Playing ringtone');
    } catch (error) {
      console.error('❌ Error playing ringtone:', error);
    }
  }, []);

  const stopRingtone = useCallback(async () => {
    if (ringtoneRef.current) {
      try {
        ringtoneRef.current.pause();
        ringtoneRef.current.release();
        ringtoneRef.current = null;
        console.log('🔕 Stopped ringtone');
      } catch (error) {
        console.error('❌ Error stopping ringtone:', error);
      }
    }
  }, []);

  useEffect(() => {
    console.log('📞 Call listener effect triggered, user:', user?.uid, 'db:', !!db);
    
    if (!user?.uid) {
      console.log('⚠️ Call listener not started - no user uid');
      return;
    }
    
    if (!db) {
      console.log('⚠️ Call listener not started - db not initialized');
      return;
    }

    console.log('📞 ====================================');
    console.log('📞 SETTING UP INCOMING CALL LISTENER');
    console.log('📞 User ID:', user.uid);
    console.log('📞 User Name:', user.name);
    console.log('📞 ====================================');
    
    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    console.log('📞 Query created for receiverId:', user.uid);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📞 ====================================');
      console.log('📞 INCOMING CALL SNAPSHOT RECEIVED');
      console.log('📞 Number of docs:', snapshot.docs.length);
      console.log('📞 Is empty:', snapshot.empty);
      console.log('📞 ====================================');
      
      if (snapshot.empty) {
        console.log('📞 No incoming calls found - clearing state');
        stopRingtone();
        setIncomingCall(null);
        return;
      }

      snapshot.docs.forEach((doc, index) => {
        console.log(`📞 Call doc ${index}:`, doc.id, doc.data());
      });

      const callDoc = snapshot.docs[0];
      const data = callDoc.data();
      
      console.log('📞 Processing call:', callDoc.id);
      console.log('📞 Call data:', JSON.stringify(data, null, 2));
      
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

      console.log('📞 ====================================');
      console.log('📞 INCOMING CALL DETECTED!');
      console.log('📞 From:', call.callerName);
      console.log('📞 Call ID:', call.id);
      console.log('📞 Status:', call.status);
      console.log('📞 ====================================');
      
      setIncomingCall(call);
      playRingtone();
    }, (error) => {
      console.error('❌ ====================================');
      console.error('❌ ERROR LISTENING FOR CALLS');
      console.error('❌ Error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ ====================================');
    });

    return () => {
      console.log('🔌 Cleaning up call listener for user:', user.uid);
      unsubscribe();
    };
  }, [user?.uid, user?.name, playRingtone, stopRingtone]);

  useEffect(() => {
    if (!activeCall?.id || !db) return;

    console.log('📞 ====================================');
    console.log('📞 LISTENING TO ACTIVE CALL');
    console.log('📞 Call ID:', activeCall.id);
    console.log('📞 Current status:', activeCall.status);
    console.log('📞 ====================================');
    
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

      console.log('📞 Active call snapshot received:', updatedCall.status);
      
      if (updatedCall.status === 'declined' || updatedCall.status === 'ended' || updatedCall.status === 'missed') {
        console.log('📞 Call ended with status:', updatedCall.status);
        if (!isEndingCallRef.current) {
          webRTCService.cleanup();
          setActiveCall(null);
          stopRingtone();
          setIsMuted(false);
          setConnectionState(null);
          setIceConnectionState(null);
        }
      } else if (updatedCall.status !== activeCall.status) {
        console.log('📞 Call status changed from', activeCall.status, 'to', updatedCall.status);
        setActiveCall(updatedCall);
      }
    });

    return () => {
      console.log('📞 Cleaning up active call listener');
      unsubscribe();
    };
  }, [activeCall?.id, activeCall?.status, activeCall?.callerId, stopRingtone, user?.uid, isWebRTCSupported]);

  const initiateCall = useCallback(async (
    receiverId: string, 
    receiverName: string, 
    receiverAvatar: string
  ): Promise<string | null> => {
    console.log('📞 ====================================');
    console.log('📞 INITIATING CALL');
    console.log('📞 From:', user?.uid, user?.name);
    console.log('📞 To:', receiverId, receiverName);
    console.log('📞 ====================================');
    
    if (!user?.uid || !db) {
      console.error('❌ Cannot initiate call - no user or db');
      console.error('❌ user?.uid:', user?.uid);
      console.error('❌ db:', !!db);
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

      console.log('📞 Creating call document with data:', JSON.stringify(callData, null, 2));
      
      await setDoc(callDocRef, callData);
      
      console.log('📞 ====================================');
      console.log('📞 CALL DOCUMENT CREATED SUCCESSFULLY');
      console.log('📞 Call ID:', callId);
      console.log('📞 Receiver should see incoming call now');
      console.log('📞 ====================================');

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

      if (isWebRTCSupported) {
        console.log('📞 Starting WebRTC offer (caller)...');
        const webrtcStarted = await webRTCService.startCall(callId);
        if (webrtcStarted) {
          console.log('✅ WebRTC offer created and saved (caller)');
        } else {
          console.log('⚠️ WebRTC failed to start (caller)');
        }
      }

      callTimeoutRef.current = setTimeout(async () => {
        console.log('📞 Call timeout - marking as missed');
        if (isEndingCallRef.current) return;
        isEndingCallRef.current = true;
        try {
          await webRTCService.cleanup();
          await updateDoc(callDocRef, {
            status: 'missed',
            endedAt: serverTimestamp(),
          });
          setActiveCall(null);
          setConnectionState(null);
          setIceConnectionState(null);
        } catch (error) {
          console.error('❌ Error updating call timeout:', error);
        }
        isEndingCallRef.current = false;
      }, 45000);

      return callId;
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      return null;
    }
  }, [user, isWebRTCSupported]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall?.id || !db) {
      console.error('❌ Cannot accept call - no incoming call');
      return;
    }

    try {
      console.log('📞 ====================================');
      console.log('📞 ACCEPTING CALL');
      console.log('📞 Call ID:', incomingCall.id);
      console.log('📞 From:', incomingCall.callerName);
      console.log('📞 ====================================');
      
      const callDocRef = doc(db, 'calls', incomingCall.id);
      
      stopRingtone();
      
      const acceptedCall = { ...incomingCall, status: 'accepted' as const, answeredAt: new Date() };
      setActiveCall(acceptedCall);
      setIncomingCall(null);
      
      await updateDoc(callDocRef, {
        status: 'accepted',
        answeredAt: serverTimestamp(),
      });
      
      console.log('📞 Call accepted and Firestore updated');

      if (isWebRTCSupported) {
        console.log('📞 Starting WebRTC answer...');
        const webrtcStarted = await webRTCService.answerCall(incomingCall.id);
        if (webrtcStarted) {
          console.log('✅ WebRTC connection established (callee)');
        } else {
          console.log('⚠️ WebRTC failed to start');
        }
      }
    } catch (error) {
      console.error('❌ Error accepting call:', error);
    }
  }, [incomingCall, stopRingtone, isWebRTCSupported]);

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

    if (isEndingCallRef.current) {
      console.log('📞 Already ending call, skipping');
      return;
    }
    isEndingCallRef.current = true;

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    try {
      console.log('📞 Ending call:', callToEnd.id);
      await webRTCService.cleanup();
      
      const callDocRef = doc(db, 'calls', callToEnd.id);
      await updateDoc(callDocRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        endedBy: user?.uid,
      });
      
      console.log('📞 Call ended successfully');
      stopRingtone();
      setActiveCall(null);
      setIncomingCall(null);
      setIsMuted(false);
      setConnectionState(null);
      setIceConnectionState(null);
    } catch (error) {
      console.error('❌ Error ending call:', error);
    } finally {
      isEndingCallRef.current = false;
    }
  }, [activeCall, incomingCall, user?.uid, stopRingtone]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    webRTCService.toggleMute(newMutedState);
    console.log('📞 Mute toggled:', newMutedState);
  }, [isMuted]);

  return {
    incomingCall,
    activeCall,
    isInCall: !!activeCall && activeCall.status === 'accepted',
    isMuted,
    connectionState,
    iceConnectionState,
    isWebRTCSupported,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
});
