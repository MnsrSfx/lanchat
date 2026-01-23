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
  isSpeaker: boolean;
  connectionState: string | null;
  iceConnectionState: string | null;
  isWebRTCSupported: boolean;
  initiateCall: (receiverId: string, receiverName: string, receiverAvatar: string) => Promise<string | null>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

export const [CallProvider, useCall] = createContextHook<CallContextValue>(() => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [iceConnectionState, setIceConnectionState] = useState<string | null>(null);
  const ringtoneRef = useRef<AudioPlayer | HTMLAudioElement | null>(null);
  const ringbackRef = useRef<AudioPlayer | HTMLAudioElement | null>(null);
  const isRingtonePlayingRef = useRef(false);
  const isRingbackPlayingRef = useRef(false);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWebRTCSupported = webRTCService.isSupported();
  const isEndingCallRef = useRef(false);

  const activeCallRef = useRef<Call | null>(null);
  
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const handleWebRTCCallEnded = useCallback(async () => {
    if (isEndingCallRef.current) return;
    console.log('📞 WebRTC triggered call end');
    isEndingCallRef.current = true;
    
    const callToEnd = activeCallRef.current;
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
  }, []);

  useEffect(() => {
    console.log('📞 Setting WebRTC callbacks...');
    webRTCService.setCallbacks({
      onConnectionStateChange: (state) => {
        console.log('📞 WebRTC connection state changed:', state);
        setConnectionState(state);
      },
      onIceConnectionStateChange: (state) => {
        console.log('📞 WebRTC ICE connection state changed:', state);
        setIceConnectionState(state);
        if (state === 'connected' || state === 'completed') {
          setConnectionState('connected');
        }
      },
      onError: (error) => {
        console.error('📞 WebRTC error:', error);
      },
      onCallEnded: handleWebRTCCallEnded,
    });
  }, [handleWebRTCCallEnded]);

  const playRingtone = useCallback(async () => {
    if (isRingtonePlayingRef.current) {
      console.log('🔔 Ringtone already playing, skipping');
      return;
    }
    
    try {
      const ringtoneUrl = 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3';
      
      if (Platform.OS === 'web') {
        console.log('🔔 Web platform - playing ringtone with HTML5 Audio');
        try {
          const audio = new Audio(ringtoneUrl);
          audio.loop = true;
          audio.volume = 1.0;
          audio.preload = 'auto';
          ringtoneRef.current = audio;
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              isRingtonePlayingRef.current = true;
              console.log('🔔 Web ringtone playing');
            }).catch((error) => {
              console.warn('⚠️ Web ringtone autoplay blocked:', error.message);
              isRingtonePlayingRef.current = false;
            });
          }
        } catch (webError) {
          console.error('❌ Web audio error:', webError);
        }
        return;
      }
      
      const player = createAudioPlayer(
        { uri: ringtoneUrl }
      );
      player.loop = true;
      ringtoneRef.current = player;
      player.play();
      isRingtonePlayingRef.current = true;
      console.log('🔔 Playing ringtone');
    } catch (error) {
      console.error('❌ Error playing ringtone:', error);
    }
  }, []);

  const stopAllWebAudio = useCallback(() => {
    if (Platform.OS === 'web') {
      try {
        const allAudio = document.querySelectorAll('audio');
        console.log('🔕 Found', allAudio.length, 'audio elements to stop');
        
        allAudio.forEach((audio, index) => {
          try {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = true;
            audio.volume = 0;
            
            // Only clear src for ringtone audio (not WebRTC audio)
            if (audio.src && audio.src.includes('pixabay')) {
              audio.src = '';
              audio.load();
              console.log('🔕 Cleared ringtone audio element', index);
            } else {
              console.log('🔕 Paused audio element', index, '(keeping for WebRTC)');
            }
          } catch (audioError) {
            console.warn('⚠️ Error stopping audio element', index, audioError);
          }
        });
        
        console.log('🔕 Stopped all web audio elements');
      } catch (e) {
        console.warn('⚠️ Could not stop all audio elements:', e);
      }
    }
  }, []);

  const stopRingtone = useCallback(async () => {
    console.log('🔕 Attempting to stop ringtone, ref exists:', !!ringtoneRef.current, 'isPlaying:', isRingtonePlayingRef.current);
    isRingtonePlayingRef.current = false;
    
    if (ringtoneRef.current) {
      try {
        if (Platform.OS === 'web') {
          const audio = ringtoneRef.current as HTMLAudioElement;
          if (audio && typeof audio.pause === 'function') {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            audio.load();
            console.log('🔕 Web ringtone stopped');
          }
        } else {
          (ringtoneRef.current as AudioPlayer).pause();
          (ringtoneRef.current as AudioPlayer).release();
        }
      } catch (error) {
        console.error('❌ Error stopping ringtone:', error);
      } finally {
        ringtoneRef.current = null;
      }
    }
    console.log('🔕 Stopped ringtone successfully');
  }, []);

  const playRingback = useCallback(async () => {
    if (isRingbackPlayingRef.current) {
      console.log('🔔 Ringback already playing, skipping');
      return;
    }
    
    try {
      const ringbackUrl = 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3';
      
      if (Platform.OS === 'web') {
        console.log('🔔 Web platform - playing ringback with HTML5 Audio');
        try {
          const audio = new Audio(ringbackUrl);
          audio.loop = true;
          audio.volume = 0.7;
          audio.preload = 'auto';
          ringbackRef.current = audio;
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              isRingbackPlayingRef.current = true;
              console.log('🔔 Web ringback playing');
            }).catch((error) => {
              console.warn('⚠️ Web ringback autoplay blocked:', error.message);
              isRingbackPlayingRef.current = false;
            });
          }
        } catch (webError) {
          console.error('❌ Web ringback audio error:', webError);
        }
        return;
      }
      
      const player = createAudioPlayer(
        { uri: ringbackUrl }
      );
      player.loop = true;
      ringbackRef.current = player;
      player.play();
      isRingbackPlayingRef.current = true;
      console.log('🔔 Playing ringback tone (caller)');
    } catch (error) {
      console.error('❌ Error playing ringback:', error);
    }
  }, []);

  const stopRingback = useCallback(async () => {
    console.log('🔕 Attempting to stop ringback, ref exists:', !!ringbackRef.current, 'isPlaying:', isRingbackPlayingRef.current);
    isRingbackPlayingRef.current = false;
    
    if (ringbackRef.current) {
      try {
        if (Platform.OS === 'web') {
          const audio = ringbackRef.current as HTMLAudioElement;
          if (audio && typeof audio.pause === 'function') {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
            audio.load();
            console.log('🔕 Web ringback stopped');
          }
        } else {
          (ringbackRef.current as AudioPlayer).pause();
          (ringbackRef.current as AudioPlayer).release();
        }
      } catch (error) {
        console.error('❌ Error stopping ringback:', error);
      } finally {
        ringbackRef.current = null;
      }
    }
    console.log('🔕 Stopped ringback tone successfully');
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
          stopRingback();
          setIsMuted(false);
        setIsSpeaker(true);
          setConnectionState(null);
          setIceConnectionState(null);
        }
      } else if (updatedCall.status === 'accepted') {
        // Call was accepted - stop all ringing sounds for both sides
        console.log('📞 Call accepted - stopping ALL ring sounds immediately');
        
        // Force stop all audio
        stopRingtone();
        stopRingback();
        stopAllWebAudio();
        
        // Double-check stop after small delay
        setTimeout(() => {
          stopRingtone();
          stopRingback();
          stopAllWebAudio();
          console.log('📞 Double-checked ring sounds stopped');
        }, 100);
        
        // Triple check after another delay
        setTimeout(() => {
          stopAllWebAudio();
          console.log('📞 Triple-checked all audio stopped');
        }, 300);
        
        setActiveCall(updatedCall);
      } else if (updatedCall.status !== activeCall.status) {
        console.log('📞 Call status changed from', activeCall.status, 'to', updatedCall.status);
        setActiveCall(updatedCall);
      }
    });

    return () => {
      console.log('📞 Cleaning up active call listener');
      unsubscribe();
    };
  }, [activeCall?.id, activeCall?.status, activeCall?.callerId, stopRingtone, stopRingback, stopAllWebAudio, user?.uid, isWebRTCSupported]);

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

      // Play ringback tone for caller
      await playRingback();

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
  }, [user, isWebRTCSupported, playRingback]);

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
      
      // Stop all ring sounds immediately and forcefully
      console.log('📞 Forcefully stopping all ring sounds');
      stopRingtone();
      stopRingback();
      stopAllWebAudio();
      
      console.log('📞 All ring sounds stopped after accepting call');
      
      // Double check after small delay
      setTimeout(() => {
        stopRingtone();
        stopRingback();
        stopAllWebAudio();
        console.log('📞 Double-checked sounds stopped in acceptCall');
      }, 100);
      
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
  }, [incomingCall, stopRingtone, stopRingback, stopAllWebAudio, isWebRTCSupported]);

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
    
    if (isEndingCallRef.current) {
      console.log('📞 Already ending call, skipping');
      return;
    }

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // Always cleanup local state even if no active call
    await webRTCService.cleanup();
    stopRingtone();
    stopRingback();
    stopAllWebAudio();
    setActiveCall(null);
    setIncomingCall(null);
    setIsMuted(false);
        setIsSpeaker(true);
    setConnectionState(null);
    setIceConnectionState(null);
    
    if (!callToEnd?.id || !db) {
      console.log('📞 No active call to end, cleaned up local state');
      return;
    }

    isEndingCallRef.current = true;

    try {
      console.log('📞 Ending call:', callToEnd.id);
      
      const callDocRef = doc(db, 'calls', callToEnd.id);
      await updateDoc(callDocRef, {
        status: 'ended',
        endedAt: serverTimestamp(),
        endedBy: user?.uid,
      });
      
      console.log('📞 Call ended successfully');
    } catch (error) {
      console.error('❌ Error ending call in Firestore:', error);
    } finally {
      isEndingCallRef.current = false;
    }
  }, [activeCall, incomingCall, user?.uid, stopRingtone, stopRingback, stopAllWebAudio]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    webRTCService.toggleMute(newMutedState);
    console.log('📞 Mute toggled:', newMutedState);
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    const newSpeakerState = !isSpeaker;
    setIsSpeaker(newSpeakerState);
    webRTCService.toggleSpeaker(newSpeakerState);
    console.log('📞 Speaker toggled:', newSpeakerState);
  }, [isSpeaker]);

  return {
    incomingCall,
    activeCall,
    isInCall: !!activeCall && activeCall.status === 'accepted',
    isMuted,
    isSpeaker,
    connectionState,
    iceConnectionState,
    isWebRTCSupported,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
});
