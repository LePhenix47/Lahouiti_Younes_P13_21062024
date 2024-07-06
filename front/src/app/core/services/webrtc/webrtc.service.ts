import { Injectable } from '@angular/core';
import Stomp from 'stompjs';

@Injectable({
  providedIn: 'root',
})
export abstract class WebRTCService {
  /**
   * Map of peer connections, where the key is the peer user ID.
   */
  private peerConnections: Map<string, RTCPeerConnection> = new Map();

  /**
   * Local media stream, own webcam, audio or screencasts.
   * Can be `null` if no stream has been set.
   */
  protected localStream: MediaStream | null = null;

  protected remoteStreams: Set<MediaStream> = new Set(); // Use Set to store unique streams

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
   * Can be null if no client has been set.
   */
  private stompClient: Stomp.Client | null = null;

  /**
   * Sets the STOMP client for signaling.
   * @param {Stomp.Client} client - The STOMP client.
   */
  public setStompClient(client: Stomp.Client): void {
    this.stompClient = client;
  }

  /**
   * Sets up the STOMP client to receive signaling messages.
   * @param {string} topic - The topic to subscribe to.
   */
  public subscribeToSignaling(topic: string): void {
    if (!this.stompClient) {
      console.error('STOMP client is not set.');
      return;
    }

    this.stompClient.subscribe(topic, (message) => {
      this.sendSignalingMessage(`${topic}/signal`, message);
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
  public handleIceCandidate(userId: string, candidate: RTCIceCandidate): void {
    // Implementation to send the ICE candidate to the remote peer through signaling server
    console.log(`Sending ICE candidate to ${userId}`, candidate);
  }

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
