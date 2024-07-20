import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';

/**
 * A service class for interacting with WebRTC in a two-person chat.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class WebRTCService {
  /**
   * The single peer connection between the local and remote users.
   */
  protected peerConnection: RTCPeerConnection | null = null;

  /**
   * Local media streams, either webcam or screen casts.
   */
  public localStream: MediaStream | null = null;
  public screenStream: MediaStream | null = null;

  /**
   * Remote media stream from the other peer.
   */
  protected remoteStream: MediaStream = new MediaStream();

  protected localVideoElement: HTMLVideoElement | null = null;
  protected localScreenElement: HTMLVideoElement | null = null;
  protected remoteVideoElement: HTMLVideoElement | null = null;
  protected remoteScreenElement: HTMLVideoElement | null = null;

  /**
   * RTC configuration with ICE servers for STUN/TURN servers.
   */
  private readonly iceStunServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 1,
  };

  /**
   * Socket.io client for signaling.
   * Can be `null` if no client has been set.
   */
  protected socketio: Socket | null = null;

  protected dataChannel: RTCDataChannel | null = null;

  /**
   * Sets the Socket.io client for signaling.
   * @param {Socket} socketio - The Socket.io client.
   */
  public setSocketIO(socketio: Socket): void {
    this.socketio = socketio;
  }

  public getSocketIO(): Socket | null {
    return this.socketio;
  }

  /**
   * Sets the local media stream.
   * @param {boolean} audio - Whether to capture audio.
   * @param {boolean} video - Whether to capture video.
   * @returns {Promise<MediaStream | null>}
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
   * Sets the screen share stream.
   * @param {boolean} withInnerDeviceAudio - Whether to capture audio.
   * @returns {Promise<MediaStream>}
   */
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

  /**
   * Stops all tracks of the current screen share stream and resets it to null.
   */
  public resetScreenShareStream = (): void => {
    if (!this.screenStream) {
      console.warn('No screen stream to reset.');
      return;
    }

    for (const screenTrack of this.screenStream.getTracks()) {
      screenTrack.stop();
    }

    this.screenStream = null;
  };

  /**
   * Creates a new peer connection and adds event listeners.
   * @returns {RTCPeerConnection}
   */
  public createPeerConnection = (): RTCPeerConnection => {
    if (this.peerConnection) {
      console.warn('Peer connection already exists.');
      return this.peerConnection;
    }

    this.peerConnection = new RTCPeerConnection(this.iceStunServers);
    this.addPeerConnectionEventListeners(this.peerConnection);
    this.addWebRtcSocketEventListeners();

    return this.peerConnection;
  };

  protected setDataChannelAsOffer = (channel: string): void => {
    this.dataChannel = this.peerConnection!.createDataChannel(channel);

    this.dataChannel.onmessage = (e) => {
      console.log('New data channel msg:', e.data);
    };

    this.dataChannel.onopen = (e) => {
      console.log('Connection opened:');
    };
  };

  protected setDataChannelAsAnswer = (): void => {
    this.peerConnection!.addEventListener('datachannel', (e) => {
      console.log('Data dataChannel event', e);
      this.dataChannel = e.channel;

      this.dataChannel.addEventListener('message', (e) => {
        console.log('new message', e.data);
      });

      this.dataChannel.addEventListener('open', (e) => {
        console.log('Connected to other peer LETS GOOOO!!!!', e);
      });
    });
  };

  /**
   * Adds event listeners to the peer connection.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  private addPeerConnectionEventListeners = (
    peerConnection: RTCPeerConnection
  ): void => {
    peerConnection.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        if (!event.candidate) {
          console.warn('No ICE candidate found.');

          return;
        }

        this.handleIceCandidate(event.candidate);
      }
    );

    peerConnection.addEventListener('icegatheringstatechange', (event) => {
      console.log(peerConnection.iceGatheringState, event);
    });

    peerConnection.addEventListener('icecandidateerror', (event: Event) => {
      // * Angular throws an error if you set the event type to RTCPeerConnectionIceErrorEvent

      const iceErrorEvent = event as RTCPeerConnectionIceErrorEvent;
      console.error('icecandidateerror', iceErrorEvent);

      this.handleIceCandidateError(iceErrorEvent);
    });

    peerConnection.addEventListener('track', (event: RTCTrackEvent) => {
      this.remoteStream.addTrack(event.track);

      this.handleTrackEvent(event);
    });

    peerConnection.addEventListener('signalingstatechange', () => {
      console.log('Signaling state:', peerConnection.signalingState);
    });
  };

  /**
   * Adds local tracks to the peer connection.
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

  // ? ===========  ABSTRACT METHODS =========== ?

  /**
   * Sets the local video element for the user's webcam
   *
   * @param {HTMLVideoElement | null} element - The video element to set as the local video.
   * @return {void} This function does not return a value.
   */
  public setLocalVideoElement(element: HTMLVideoElement | null): void {
    this.localVideoElement = element;
  }

  /**
   * Sets the local screen element for the user's screen cast
   *
   * @param {HTMLVideoElement | null} element - The video element to set as the local screen.
   * @return {void} This function does not return a value.
   */
  public setLocalScreenElement(element: HTMLVideoElement | null): void {
    this.localScreenElement = element;
  }

  /**
   * Sets the remote video element for the user's webcam
   *
   * @param {HTMLVideoElement | null} element - The video element to set as the local video.
   * @return {void} This function does not return a value.
   */
  public setRemoteVideoElement(element: HTMLVideoElement | null): void {
    this.remoteVideoElement = element;
  }

  /**
   * Sets the remote screen element for the user's screen cast
   *
   * @param {HTMLVideoElement | null} element - The video element to set as the local screen.
   * @return {void} This function does not return a value.
   */
  public setRemoteScreenElement(element: HTMLVideoElement | null): void {
    this.remoteScreenElement = element;
  }

  /**
   * Adds event listeners for WebRTC socket events.
   *
   * @return {void} This function does not return a value.
   */
  public abstract addWebRtcSocketEventListeners(): void;

  /**
   * Handles ICE candidate events to emit the ICE candidate to the remote peer
   * @param {RTCIceCandidate} candidate - The ICE candidate.
   */
  public abstract handleIceCandidate(candidate: RTCIceCandidate): void;

  /**
   * Handles ICE candidate events.
   * @param {RTCIceCandidate} candidate - The ICE candidate.
   */
  public abstract handleIceCandidateError(
    candidate: RTCPeerConnectionIceErrorEvent
  ): void;

  /**
   * Handles track events.
   * @param {RTCTrackEvent} event - The track event.
   */
  public abstract handleTrackEvent(event: RTCTrackEvent): void;

  /**
   * Handles the creation of an offer.
   * @param {RTCSessionDescriptionInit} offer - The offer to be created.
   */
  public abstract createOffer(offer: RTCSessionDescriptionInit): Promise<void>;

  /**
   * Handles the creation of an answer.
   * @param {RTCSessionDescriptionInit} answer - The answer to be created.
   */
  public abstract createAnswer(
    answer: RTCSessionDescriptionInit
  ): Promise<void>;

  /**
   * Websocket callback for receiving an "offer" event from a remote peer.
   * @param {RTCSessionDescriptionInit} offer - The received offer.
   */
  public abstract onReceiveOffer(
    offer: RTCSessionDescriptionInit
  ): Promise<void>;

  /**
   * Websocket callback for receiving an "answer" event from a remote peer.
   * @param {RTCSessionDescriptionInit} answer - The received answer.
   */
  public abstract onReceiveAnswer(
    answer: RTCSessionDescriptionInit
  ): Promise<void>;

  /**
   * Websocket callback for receiving an "ce-candidate" event from a remote peer.
   * @param {RTCIceCandidate} icecandidate - The received answer.
   */
  public abstract onReceiveIce(icecandidate: RTCIceCandidate): Promise<void>;
}
