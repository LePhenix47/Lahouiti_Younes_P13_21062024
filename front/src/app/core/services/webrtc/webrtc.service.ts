import { Injectable } from '@angular/core';

/**
 * A base service class for interacting with WebRTC.
 *
 * When implementing WebRTC with this class, this is the order of operations:
 *
 * 1. Set up STOMP client for signaling (if not inherited).
 *
 * 2. Set up local media stream.
 *
 * 3. Add a peer connection for each user.
 *
 * 4. Subscribe to the signaling topic specific to the user to receive offers, answers, and ICE candidates.
 *
 * 5. Handle incoming offers from remote peers.
 *
 * 6. Handle incoming answers from remote peers.
 *
 * 7. Handle incoming ICE candidates from remote peers.
 *
 * 8. Exchange signaling messages with peers.
 *
 * 9. Manage peer connections and clean up resources.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class WebRTCService {
  /**
   * Map of peer connections, where the key is the peer user ID.
   */
  protected peerConnections: Map<string, RTCPeerConnection> = new Map();

  /**
   * Local media stream, own webcam, audio or screen casts.
   * Can be `null` if no stream has been set.
   */
  protected localStream: MediaStream | null = null;
  protected screenStream: MediaStream | null = null;

  /**
   * Set of remote media streams, streams from other peers.
   */
  protected remoteStreams: Set<MediaStream> = new Set();

  /**
   * RTC configuration with ICE servers for STUN/TURN servers.
   */
  private readonly iceStunServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  /**
   * STOMP client for signaling.
   * Can be `null` if no client has been set.
   */
  protected stompClient: any | null = null;

  /**
   * Sets the STOMP client for signaling.
   * @param {any} stompClient - The STOMP client.
   */
  public setStompClient(stompClient: any): void {
    this.stompClient = stompClient;
  }

  public geStompClient(): any | null {
    return this.stompClient;
  }

  public getPeerConnections(): Map<string, RTCPeerConnection> {
    return this.peerConnections;
  }

  /**
   * Sends a signaling message through STOMP.
   * @param {string} destination - The destination path.
   * @param {any} message - The message to send.
   */
  protected sendSignalingMessage = (
    destination: string,
    message: any
  ): void => {
    if (!this.stompClient) {
      console.error(
        Boolean(this.stompClient)
          ? "STOMP client isn't initialized, please connect to the WebSockets."
          : 'STOMP client is not connected.',
        this.stompClient
      );

      return;
    }

    this.stompClient.send(destination, {}, JSON.stringify(message));
  };

  /**
   * Sets the local media stream.
   * @param {boolean} audio - Whether to capture audio.
   * @param {boolean} video - Whether to capture video.
   * @returns {Promise<MediaStream>}
   */
  public setLocalStream = async (
    audio: boolean = true,
    video: boolean = true
  ): Promise<MediaStream | null> => {
    try {
      if (!audio && !video) {
        return null;
      }

      if (this.localStream) {
        return this.localStream;
      }

      const localStream: MediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio,
          video,
        });

      this.localStream = localStream;

      return localStream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  };

  /**
   * Stops all tracks of the current local stream and resets it to null.
   */
  public resetLocalStream = (): void => {
    if (!this.localStream) {
      return;
    }

    for (const localTrack of this.localStream.getTracks()) {
      localTrack.stop();
    }

    this.localStream = null;
  };

  /**
   * Returns the local media stream.
   *
   * @return {MediaStream | null} The local media stream, or `null` if it has not been set.
   */
  public getLocalStream = (): MediaStream | null => {
    return this.localStream;
  };

  public updateLocalStream = async (
    audio: boolean = true,
    video: boolean = false
  ): Promise<MediaStream | null> => {
    this.resetLocalStream();
    return this.setLocalStream(audio, video);
  };

  public setScreenShareStream = async (
    withInnerDeviceAudio: boolean = false
  ): Promise<MediaStream> => {
    try {
      if (this.screenStream) {
        return this.screenStream;
      }

      const screenStream: MediaStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: withInnerDeviceAudio,
        });

      this.screenStream = screenStream;

      return screenStream;
    } catch (error) {
      console.error('Error accessing display media.', error);
      throw error;
    }
  };

  public resetScreenShareStream = (): void => {
    if (!this.screenStream) {
      console.warn('No screen stream to reset.');
      return;
    }

    for (const screenTrack of this.screenStream.getTracks()) {
      screenTrack.stop();
    }

    // Set the screenStream to null
    this.screenStream = null;
  };

  public updateScreenShareStream = async () => {
    this.resetScreenShareStream();
    return this.setScreenShareStream();
  };

  /**
   * Adds a peer connection for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {RTCPeerConnection}
   */
  public addPeerConnection = (userId: string): RTCPeerConnection => {
    if (this.peerConnections.has(userId)) {
      console.warn(
        'Peer connection already exists for user.',
        userId,
        this.peerConnections.get(userId)
      );
      return this.peerConnections.get(userId)!;
    }

    const peerConnection = new RTCPeerConnection(this.iceStunServers);

    this.addPeerConnectionEventListeners(userId, peerConnection);
    this.addLocalTracksToPeerConnection(peerConnection);

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  };

  /**
   * Adds event listeners to a peer connection.
   * @param {string} userId - The ID of the user.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  private addPeerConnectionEventListeners = (
    userId: string,
    peerConnection: RTCPeerConnection
  ): void => {
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        console.error('Could not send ICE candidate as it was null.');
        return;
      }

      this.handleIceCandidate(userId, event.candidate);
    };

    peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (!this.remoteStreams) {
        console.warn('Could not add remote stream as it was null.');
        return;
      }

      this.addRemoteTracksToPeerConnection(event);

      this.handleTrackEvent(userId, event);
    };
  };

  /**
   * Adds remote tracks to the remote streams.
   * @param {RTCTrackEvent} event - The RTCTrackEvent instance.
   */
  protected addRemoteTracksToPeerConnection = (event: RTCTrackEvent): void => {
    for (const stream of event.streams) {
      this.remoteStreams.add(stream);
    }
  };

  /**
   * Adds local tracks to a peer connection.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  protected addLocalTracksToPeerConnection = (
    peerConnection: RTCPeerConnection
  ): void => {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        peerConnection.addTrack(track, this.localStream);
      }
    }

    if (this.screenStream) {
      for (const track of this.screenStream.getTracks()) {
        peerConnection.addTrack(track, this.screenStream);
      }
    }
  };

  /**
   * Handles ICE candidate events.
   * @param {string} userId - The ID of the user.
   * @param {RTCIceCandidate} candidate - The ICE candidate.
   */
  public abstract handleIceCandidate(
    userId: string,
    candidate: RTCIceCandidate
  ): void;
  /**
   * Handles track events.
   * @param {string} userId - The ID of the user.
   * @param {RTCTrackEvent} event - The track event.
   */
  public abstract handleTrackEvent(userId: string, event: RTCTrackEvent): void;

  /**
   * Handles incoming offers from remote peers.
   * @param {string} userId - The ID of the user.
   * @param {RTCSessionDescriptionInit} offer - The offer from the remote peer.
   */
  public abstract handleOffer(
    userId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void>;

  /**
   * Handles incoming answers from remote peers.
   * @param {string} userId - The ID of the user.
   * @param {RTCSessionDescriptionInit} answer - The answer from the remote peer.
   */
  public abstract handleAnswer(
    userId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void>;

  /**
   * Closes the peer connection for a specific user.
   * @param {string} userId - The ID of the user.
   */
  protected closePeerConnection = (userId: string): void => {
    if (!this.peerConnections.has(userId)) {
      console.error("Peer connection doesn't exist for user", userId);

      return;
    }

    this.peerConnections.get(userId)!.close();

    this.peerConnections.delete(userId);
  };
}
