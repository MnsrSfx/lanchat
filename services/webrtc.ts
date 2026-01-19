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

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

type WebRTCCallbacks = {
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
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

  private createPeerConnection(): RTCPeerConnection | null {
    if (!this.isSupported()) {
      return null;
    }

    try {
      console.log('🔗 Creating peer connection...');
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate && this.callId && db) {
          console.log('🧊 ICE candidate found:', event.candidate.candidate?.substring(0, 50));
          const candidateCollection = this.isCaller ? 'callerCandidates' : 'calleeCandidates';
          const candidateRef = doc(collection(db, 'calls', this.callId, candidateCollection));
          setDoc(candidateRef, event.candidate.toJSON()).catch(console.error);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        this.callbacks.onConnectionStateChange?.(pc.connectionState);
      };

      pc.ontrack = (event) => {
        console.log('🎵 Remote track received');
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          this.callbacks.onRemoteStream?.(event.streams[0]);
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

    this.callId = callId;
    this.isCaller = true;

    console.log('📞 Starting WebRTC call:', callId);

    const localStream = await this.getLocalStream();
    if (!localStream) {
      return false;
    }

    const pc = this.createPeerConnection();
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
      this.listenForIceCandidates(callId, 'calleeCandidates');

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

    this.callId = callId;
    this.isCaller = false;

    console.log('📞 Answering WebRTC call:', callId);

    const localStream = await this.getLocalStream();
    if (!localStream) {
      return false;
    }

    const pc = this.createPeerConnection();
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

      this.listenForIceCandidates(callId, 'callerCandidates');

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
        if (change.type === 'added' && this.peerConnection) {
          const candidateData = change.doc.data();
          console.log('🧊 Adding ICE candidate from', candidateCollection);
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
          } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
          }
        }
      });
    });

    if (candidateCollection === 'callerCandidates') {
      this.unsubscribeCallerCandidates = unsubscribe;
    } else {
      this.unsubscribeCalleeCandidates = unsubscribe;
    }
  }

  toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
        console.log('🎤 Microphone', muted ? 'muted' : 'unmuted');
      });
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up WebRTC...');

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

    if (this.callId && db) {
      console.log('🧹 ICE candidates will be cleaned up with call document');
    }

    this.callId = null;
    this.remoteStream = null;
    this.callbacks = {};
    this.isCaller = false;

    console.log('✅ WebRTC cleanup complete');
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null;
  }
}

export const webRTCService = new WebRTCService();
