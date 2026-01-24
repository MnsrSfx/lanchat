import { Platform } from 'react-native';
import { db } from '@/src/firebase';
import { 
  doc, 
  collection, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc,
} from 'firebase/firestore';

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

interface MeteredIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

let cachedIceServers: RTCIceServer[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour

async function fetchMeteredIceServers(): Promise<RTCIceServer[]> {
  const apiKey = process.env.EXPO_PUBLIC_METERED_API_KEY;
  const appName = process.env.EXPO_PUBLIC_METERED_APP_NAME;

  console.log('🔑 Metered API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');
  console.log('📱 Metered App Name:', appName || 'NOT SET');

  if (!apiKey || !appName) {
    console.log('⚠️ Metered credentials not configured, using fallback STUN servers');
    return FALLBACK_ICE_SERVERS;
  }

  // Return cached servers if still valid
  if (cachedIceServers && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log('🧊 Using cached ICE servers');
    return cachedIceServers;
  }

  const url = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;
  console.log('🧊 Fetching TURN credentials from:', url.replace(apiKey, 'API_KEY_HIDDEN'));

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Metered API error: ${response.status}`);
    }

    const iceServers: MeteredIceServer[] = await response.json();
    console.log('✅ Fetched', iceServers.length, 'ICE servers from Metered.ca');
    
    // Log server types for debugging
    iceServers.forEach((server, i) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      urls.forEach(url => {
        const type = url.startsWith('turn:') ? 'TURN' : url.startsWith('turns:') ? 'TURNS' : 'STUN';
        console.log(`  ${i + 1}. ${type}: ${url.substring(0, 50)}...`);
      });
    });

    cachedIceServers = iceServers;
    cacheTimestamp = Date.now();
    return iceServers;
  } catch (error) {
    console.error('❌ Error fetching Metered ICE servers:', error);
    console.log('⚠️ Using fallback STUN servers');
    return FALLBACK_ICE_SERVERS;
  }
}

const ICE_CANDIDATE_CALLER = 'callerCandidates';
const ICE_CANDIDATE_RECEIVER = 'receiverCandidates';

type WebRTCCallbacks = {
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onError?: (error: Error) => void;
  onCallEnded?: () => void;
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private unsubscribeOffer: (() => void) | null = null;
  private unsubscribeAnswer: (() => void) | null = null;
  private unsubscribeCallerCandidates: (() => void) | null = null;
  private unsubscribeCalleeCandidates: (() => void) | null = null;
  private callbacks: WebRTCCallbacks = {};
  private isCaller: boolean = false;
  private audioElement: HTMLAudioElement | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime: number = Date.now();
  private isCleanedUp: boolean = false;
  private isSpeakerOn: boolean = true;
  private isMuted: boolean = false;

  isSupported(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 
             typeof window.RTCPeerConnection !== 'undefined' &&
             typeof navigator !== 'undefined' &&
             typeof navigator.mediaDevices !== 'undefined';
    }
    return false;
  }

  setCallbacks(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
  }

  async getLocalStream(): Promise<MediaStream | null> {
    if (!this.isSupported()) {
      console.log('⚠️ WebRTC not supported on this platform');
      return null;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.localStream = stream;
      console.log('✅ Microphone access granted');
      return stream;
    } catch (error) {
      console.error('❌ Error getting local stream:', error);
      this.callbacks.onError?.(error as Error);
      return null;
    }
  }

  private async createPeerConnectionAsync(): Promise<RTCPeerConnection | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      console.log('🔗 Creating peer connection...');
      const iceServers = await fetchMeteredIceServers();
      console.log('🧊 Using', iceServers.length, 'ICE servers');
      
      const pc = new RTCPeerConnection({ 
        iceServers,
        iceCandidatePoolSize: 10,
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && this.callId && db && !this.isCleanedUp) {
          console.log('🧊 ICE candidate found:', event.candidate.candidate?.substring(0, 50));
          const candidateCollection = this.isCaller ? ICE_CANDIDATE_CALLER : ICE_CANDIDATE_RECEIVER;
          const candidateRef = doc(collection(db, 'calls', this.callId, candidateCollection));
          setDoc(candidateRef, event.candidate.toJSON()).catch((error) => {
            console.error('❌ Error saving ICE candidate:', error);
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
        this.callbacks.onIceConnectionStateChange?.(pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.log('⚠️ ICE connection issue, attempting restart...');
          this.handleIceFailure(pc);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          this.lastActivityTime = Date.now();
          this.startKeepAlive();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        this.callbacks.onConnectionStateChange?.(pc.connectionState);
        
        if (pc.connectionState === 'failed') {
          console.log('❌ Connection failed, ending call');
          this.callbacks.onCallEnded?.();
        } else if (pc.connectionState === 'connected') {
          this.lastActivityTime = Date.now();
        }
      };

      pc.ontrack = (event) => {
        console.log('🎵 Remote track received:', event.track.kind);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          console.log('🎵 Remote stream tracks:', event.streams[0].getTracks().map(t => t.kind).join(', '));
          this.callbacks.onRemoteStream?.(event.streams[0]);
          this.playRemoteAudio(event.streams[0]);
        }
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          console.log('➕ Adding local track:', track.kind);
          pc.addTrack(track, this.localStream!);
        });
      }

      this.peerConnection = pc;
      console.log('✅ Peer connection created');
      return pc;
    } catch (error) {
      console.error('❌ Error creating peer connection:', error);
      this.callbacks.onError?.(error as Error);
      return null;
    }
  }

  async startCall(callId: string): Promise<boolean> {
    if (!this.isSupported() || !db) {
      console.log('⚠️ WebRTC not supported or db not available');
      return false;
    }

    this.isCleanedUp = false;
    this.callId = callId;
    this.isCaller = true;
    this.lastActivityTime = Date.now();

    console.log('📞 Starting WebRTC call:', callId);

    const localStream = await this.getLocalStream();
    if (!localStream) {
      return false;
    }

    const pc = await this.createPeerConnectionAsync();
    if (!pc) {
      return false;
    }

    try {
      console.log('📝 Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('✅ Local description set');

      const callDocRef = doc(db, 'calls', callId);
      await updateDoc(callDocRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });
      console.log('✅ Offer saved to Firestore');

      this.listenForAnswer(callId);
      this.listenForIceCandidates(callId, ICE_CANDIDATE_RECEIVER);

      return true;
    } catch (error) {
      console.error('❌ Error starting call:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  async answerCall(callId: string): Promise<boolean> {
    if (!this.isSupported() || !db) {
      console.log('⚠️ WebRTC not supported or db not available');
      return false;
    }

    this.isCleanedUp = false;
    this.callId = callId;
    this.isCaller = false;
    this.lastActivityTime = Date.now();

    console.log('📞 Answering WebRTC call:', callId);

    const localStream = await this.getLocalStream();
    if (!localStream) {
      return false;
    }

    const pc = await this.createPeerConnectionAsync();
    if (!pc) {
      return false;
    }

    try {
      const callDocRef = doc(db, 'calls', callId);
      const callDoc = await getDoc(callDocRef);
      
      if (!callDoc.exists()) {
        console.error('❌ Call document not found');
        return false;
      }

      const callData = callDoc.data();
      if (!callData.offer) {
        console.error('❌ No offer found in call document');
        return false;
      }

      console.log('📝 Setting remote description (offer)...');
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

      console.log('📝 Creating answer...');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('✅ Local description set (answer)');

      await updateDoc(callDocRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });
      console.log('✅ Answer saved to Firestore');

      this.listenForIceCandidates(callId, ICE_CANDIDATE_CALLER);

      return true;
    } catch (error) {
      console.error('❌ Error answering call:', error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  private listenForAnswer(callId: string) {
    if (!db) return;

    const callDocRef = doc(db, 'calls', callId);
    
    this.unsubscribeAnswer = onSnapshot(callDocRef, async (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && this.peerConnection && !this.peerConnection.currentRemoteDescription) {
        console.log('📝 Answer received, setting remote description...');
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ Remote description set (answer)');
        } catch (error) {
          console.error('❌ Error setting remote description:', error);
        }
      }
    });
  }

  private listenForIceCandidates(callId: string, candidateCollection: string) {
    if (!db) return;

    const candidatesRef = collection(db, 'calls', callId, candidateCollection);
    
    const unsubscribe = onSnapshot(candidatesRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' && this.peerConnection && !this.isCleanedUp) {
          const candidateData = change.doc.data();
          console.log('🧊 Adding ICE candidate from', candidateCollection);
          try {
            if (this.peerConnection.remoteDescription) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
              this.lastActivityTime = Date.now();
            } else {
              console.log('⏳ Waiting for remote description before adding ICE candidate');
            }
          } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
          }
        }
      });
    }, (error) => {
      console.error('❌ Error listening for ICE candidates:', error);
    });

    if (candidateCollection === ICE_CANDIDATE_CALLER) {
      this.unsubscribeCallerCandidates = unsubscribe;
    } else {
      this.unsubscribeCalleeCandidates = unsubscribe;
    }
  }

  private handleIceFailure(pc: RTCPeerConnection) {
    if (this.isCleanedUp) return;
    
    try {
      if (pc.restartIce) {
        console.log('🔄 Restarting ICE...');
        pc.restartIce();
      }
    } catch (error) {
      console.error('❌ Error restarting ICE:', error);
    }
  }

  private startKeepAlive() {
    if (this.keepAliveInterval) return;
    
    console.log('💓 Starting keepalive...');
    this.keepAliveInterval = setInterval(() => {
      if (this.isCleanedUp) {
        this.stopKeepAlive();
        return;
      }
      
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      
      if (timeSinceActivity > 60000) {
        console.log('⚠️ No activity for 60 seconds, connection may be stale');
        if (this.peerConnection?.iceConnectionState === 'disconnected') {
          console.log('❌ Connection lost, triggering end');
          this.callbacks.onCallEnded?.();
        }
      }
      
      if (this.peerConnection?.connectionState === 'connected') {
        this.lastActivityTime = Date.now();
      }
    }, 10000);
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('💓 Keepalive stopped');
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  private playRemoteAudio(stream: MediaStream) {
    if (Platform.OS !== 'web') {
      console.log('🔊 Native platform - audio handled by native WebRTC');
      return;
    }

    try {
      if (this.audioElement) {
        this.audioElement.srcObject = null;
        this.audioElement.remove();
      }

      console.log('🔊 Creating audio element for remote stream...');
      const audio = document.createElement('audio');
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.audioElement = audio;

      audio.play().then(() => {
        console.log('✅ Remote audio playing');
      }).catch((error) => {
        console.error('❌ Error playing remote audio:', error);
        audio.muted = true;
        audio.play().then(() => {
          console.log('🔊 Audio playing muted, attempting unmute...');
          setTimeout(() => {
            audio.muted = false;
            console.log('🔊 Audio unmuted');
          }, 100);
        }).catch(e => console.error('❌ Still cannot play audio:', e));
      });
    } catch (error) {
      console.error('❌ Error setting up remote audio:', error);
    }
  }

  toggleMute(muted: boolean) {
    this.isMuted = muted;
    console.log('🎤 toggleMute called, muted:', muted);
    console.log('🎤 localStream exists:', !!this.localStream);
    console.log('🎤 peerConnection exists:', !!this.peerConnection);
    
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      console.log('🎤 Found', audioTracks.length, 'audio tracks in localStream');
      
      audioTracks.forEach((track, index) => {
        const wasEnabled = track.enabled;
        track.enabled = !muted;
        console.log(`🎤 Track ${index} (${track.label}): was ${wasEnabled}, now ${track.enabled}`);
      });
      console.log('🎤 Microphone', muted ? 'muted' : 'unmuted');
    } else {
      console.warn('⚠️ No local stream available for mute toggle');
      
      // Try to get tracks from peer connection senders
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        console.log('🎤 Trying peer connection senders:', senders.length);
        senders.forEach((sender, index) => {
          if (sender.track && sender.track.kind === 'audio') {
            const wasEnabled = sender.track.enabled;
            sender.track.enabled = !muted;
            console.log(`🎤 Sender track ${index}: was ${wasEnabled}, now ${sender.track.enabled}`);
          }
        });
      }
    }
  }

  toggleSpeaker(speakerOn: boolean) {
    this.isSpeakerOn = speakerOn;
    console.log('🔊 toggleSpeaker called, speakerOn:', speakerOn);
    console.log('🔊 audioElement exists:', !!this.audioElement);
    console.log('🔊 Platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      // Try to find audio element if not stored
      if (!this.audioElement) {
        const audioElements = document.querySelectorAll('audio');
        console.log('🔊 Found', audioElements.length, 'audio elements in DOM');
        
        // Find the WebRTC audio element (not ringtone)
        audioElements.forEach((audio, index) => {
          if (audio.srcObject) {
            this.audioElement = audio;
            console.log('🔊 Found WebRTC audio element at index', index);
          }
        });
      }
      
      if (this.audioElement) {
        try {
          const oldVolume = this.audioElement.volume;
          if (speakerOn) {
            this.audioElement.volume = 1.0;
            this.audioElement.muted = false;
            console.log('🔊 Speaker ON - volume:', oldVolume, '->', 1.0);
          } else {
            this.audioElement.volume = 0.3;
            console.log('🔊 Speaker OFF - volume:', oldVolume, '->', 0.3);
          }
        } catch (error) {
          console.error('❌ Error toggling speaker:', error);
        }
      } else {
        console.warn('⚠️ No audio element found for speaker toggle');
      }
    } else {
      console.log('🔊 Speaker toggle - not on web platform');
    }
  }

  getMuteState(): boolean {
    return this.isMuted;
  }

  getSpeakerState(): boolean {
    return this.isSpeakerOn;
  }

  async cleanup() {
    if (this.isCleanedUp) {
      console.log('🧹 WebRTC already cleaned up');
      return;
    }
    
    this.isCleanedUp = true;
    console.log('🧹 Cleaning up WebRTC...');

    this.stopKeepAlive();
    
    this.unsubscribeOffer?.();
    this.unsubscribeAnswer?.();
    this.unsubscribeCallerCandidates?.();
    this.unsubscribeCalleeCandidates?.();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log('⏹️ Stopped local track:', track.kind);
      });
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('🔌 Peer connection closed');
    }

    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement.remove();
      this.audioElement = null;
      console.log('🔊 Audio element removed');
    }

    if (this.callId && db) {
      console.log('🧹 ICE candidates will be cleaned up with call document');
    }

    this.callId = null;
    this.remoteStream = null;
    this.callbacks = {};
    this.isCaller = false;
    this.isCleanedUp = false;
    this.lastActivityTime = Date.now();

    console.log('✅ WebRTC cleanup complete');
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null;
  }
}

export const webRTCService = new WebRTCService();
