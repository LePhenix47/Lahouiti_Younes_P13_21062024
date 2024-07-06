import { Injectable } from '@angular/core';
import Stomp from 'stompjs';

/**
 * A base service class for interacting with WebRTC.
 *
 * When implementing WebRTC with this class, this is the order of operations:
 *
 * 1. Set up STOMP client for signaling (if not inherited).
 *    - Use `setStompClient` method to set the STOMP client.
 *    - Subscribe to the signaling topic (`/user/{userId}/topic/signal`) using `subscribeToSignaling`.
 *
 * 2. Set up local media stream.
 *    - Use `setLocalStream` method to initialize the local media stream (audio, video).
 *    - Optionally, display the local stream in UI or perform further operations with it.
 *
 * 3. Add a peer connection for each user.
 *    - Use `addPeerConnection` method to create a new `RTCPeerConnection` for each remote user.
 *    - Add event listeners (`onicecandidate`, `ontrack`) and local tracks to the peer connection.
 *
 * 4. Subscribe to the signaling topic specific to the user to receive offers, answers, and ICE candidates.
 *    - Implement `subscribeToSignalTopic` method to subscribe to `/user/{userId}/topic/signal`.
 *    - Handle incoming signaling messages (`offer`, `answer`, `candidate`) in the subscription callback.
 *
 * 5. Handle incoming offers from remote peers.
 *    - Implement `handleOffer` method to handle incoming offer messages.
 *    - Respond with an answer (`createAnswer`, `setLocalDescription`) and send it via `sendSignalingMessage`.
 *
 * 6. Handle incoming answers from remote peers.
 *    - Implement `handleAnswer` method to handle incoming answer messages.
 *    - Set remote description (`setRemoteDescription`) for the corresponding peer connection.
 *
 * 7. Handle incoming ICE candidates from remote peers.
 *    - Implement `handleIceCandidate` method to handle incoming ICE candidate messages.
 *    - Add ICE candidates (`addIceCandidate`) to the corresponding peer connection.
 *
 * 8. Exchange signaling messages with peers.
 *    - Use `sendSignalingMessage` method to send signaling messages (offer, answer, ICE candidate) via STOMP.
 *
 * 9. Manage peer connections and clean up resources.
 *    - Use `closePeerConnection` method to close a peer connection for a specific user when needed.
 *    - Clean up local and remote streams, peer connections, and any other resources as required.
 *
 * Example usage:
 *
 * ```
 * const rtc = new ChatWebRtcService();
 *
 * rtc.setStompClient(stompClient); // Step 1
 * rtc.setLocalStream(true, true);  // Step 2
 * rtc.addPeerConnection(userId);   // Step 3
 * rtc.subscribeToSignalTopic(userId); // Step 4
 *
 * // Implementation continues with handling offers, answers, ICE candidates (Steps 5-7)
 * // and managing peer connections and cleanup (Step 9).
 * ```
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
   * Local media stream, own webcam, audio or screencasts.
   * Can be `null` if no stream has been set.
   */
  protected localStream: MediaStream | null = null;

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
  protected stompClient: Stomp.Client | null = null;

  /**
   * Sets the STOMP client for signaling.
   * @param {Stomp.Client} stompClient - The STOMP client.
   */
  public setStompClient(stompClient: Stomp.Client): void {
    this.stompClient = stompClient;
  }

  /**
   * Sets up the STOMP client to receive signaling messages.
   * @param {string} topic - The topic to subscribe to.
   */
  public subscribeToSignaling(): void {
    if (!this.stompClient) {
      console.error('STOMP client is not set.');
      return;
    }

    this.stompClient.subscribe(`topic/signal`, (message: Stomp.Message) => {
      this.sendSignalingMessage('/topic/signal', message);
    });
  }

  /**
   * Sends a signaling message through STOMP.
   * @param {string} destination - The destination path.
   * @param {any} message - The message to send.
   */
  protected sendSignalingMessage(destination: string, message: any): void {
    if (!this.stompClient?.connected) {
      console.error(
        Boolean(this.stompClient)
          ? "STOMP client isn't initialized, please connect to the WebSockets."
          : 'STOMP client is not connected.'
      );

      return;
    }

    this.stompClient.send(destination, {}, JSON.stringify(message));
  }

  /**
   * Sets the local media stream.
   * @param {boolean} audio - Whether to capture audio.
   * @param {boolean} video - Whether to capture video.
   * @returns {Promise<MediaStream>}
   */
  public async setLocalStream(
    audio: boolean = true,
    video: boolean = true
  ): Promise<MediaStream> {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });

      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  }

  /**
   * Returns the local media stream.
   *
   * @return {MediaStream | null} The local media stream, or `null` if it has not been set.
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Adds a peer connection for a specific user.
   * @param {string} userId - The ID of the user.
   * @returns {RTCPeerConnection}
   */
  public addPeerConnection(userId: string): RTCPeerConnection {
    if (this.peerConnections.has(userId)) {
      return this.peerConnections.get(userId)!;
    }

    const peerConnection = new RTCPeerConnection(this.iceStunServers);

    this.addPeerConnectionEventListeners(userId, peerConnection);
    this.addLocalTracksToPeerConnection(peerConnection);

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  /**
   * Adds event listeners to a peer connection.
   * @param {string} userId - The ID of the user.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  private addPeerConnectionEventListeners(
    userId: string,
    peerConnection: RTCPeerConnection
  ): void {
    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        console.error('Could not send ICE candidate as it was null.');
        return;
      }

      this.handleIceCandidate(userId, event.candidate);
    };

    peerConnection.ontrack = (event: RTCTrackEvent) => {
      if (!this.remoteStreams) {
        return;
      }

      for (const stream of event.streams) {
        this.remoteStreams.add(stream);
      }

      this.handleTrackEvent(userId, event);
    };
  }

  /**
   * Adds local tracks to a peer connection.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  private addLocalTracksToPeerConnection(
    peerConnection: RTCPeerConnection
  ): void {
    if (!this.localStream) {
      console.error('No local stream to add to peer connection.');

      return;
    }

    for (const track of this.localStream.getTracks()) {
      peerConnection.addTrack(track, this.localStream);
    }
  }

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
  public closePeerConnection(userId: string): void {
    if (!this.peerConnections.has(userId)) {
      console.error("Peer connection doesn't exist for user", userId);

      return;
    }

    this.peerConnections.get(userId)!.close();

    this.peerConnections.delete(userId);
  }
}
