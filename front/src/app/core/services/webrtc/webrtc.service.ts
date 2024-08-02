import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';

interface StreamLogic {}

interface WebRTCLogic {}

/**
 * A service class for interacting with WebRTC in a two-person chat.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class WebRTCService implements WebRTCLogic, StreamLogic {
  /**
   * The single peer connection between the local and remote users.
   */
  protected peerConnection: RTCPeerConnection | null = null;

  /**
   * Local media streams, either webcam or screen casts.
   */
  public localStream: MediaStream | null = null;

  /**
   * Remote media stream from the other peer.
   */
  protected remoteStream: MediaStream = new MediaStream();

  protected localVideoElement: HTMLVideoElement | null = null;
  protected remoteVideoElement: HTMLVideoElement | null = null;

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

  protected screenTrack: MediaStreamTrack | null = null;
  protected webcamTrack: MediaStreamTrack | null = null;
  protected webcamDeviceId: string | null = null;

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

      this.webcamTrack = localStream.getVideoTracks()[0];

      return localStream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  };

  public switchLocalStreamByDeviceId = async (
    videoDeviceId: string | null,
    audioDeviceId: string | null
  ): Promise<MediaStream | null> => {
    try {
      let localStream: MediaStream | null = null;

      if (audioDeviceId && videoDeviceId) {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: audioDeviceId },
          video: { deviceId: videoDeviceId },
        });
      } else if (videoDeviceId) {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: videoDeviceId },
        });
      } else if (audioDeviceId) {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: audioDeviceId },
        });
      }

      if (!localStream) {
        return null;
      }

      const newWebcamTrack: MediaStreamTrack = localStream.getVideoTracks()[0];
      const deviceId: string | null =
        newWebcamTrack.getSettings().deviceId || null;

      if (this.localStream && deviceId === this.webcamDeviceId) {
        console.warn('Device ID did not change');

        return this.localStream;
      }

      if (this.peerConnection && this.webcamTrack) {
        this.replaceTrackInPeerConnection(this.webcamTrack, newWebcamTrack);
      }

      this.localStream = localStream;

      this.webcamTrack = newWebcamTrack;
      this.webcamDeviceId = deviceId;

      console.log('Device ID: ', this.webcamDeviceId);

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
   * Toggles the local stream's audio and video tracks.
   * @param {boolean} video - Whether to enable video.
   * @param {boolean} audio - Whether to enable audio.
   */
  public toggleLocalStream = (video: boolean, audio: boolean): void => {
    if (!this.localStream) {
      console.warn('Local stream is not set.');
      return;
    }

    // Toggle audio tracks
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = audio; // Enable or disable audio track
    }

    // Toggle video tracks
    for (const track of this.localStream.getVideoTracks()) {
      track.enabled = video; // Enable or disable video track
    }

    console.log('%cLocal stream toggled:', 'background: orange', {
      audio,
      video,
    });
  };

  // When the user starts screen sharing
  public startScreenShare = async (): Promise<MediaStream | null> => {
    let screenStream: MediaStream | null = null;

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      this.screenTrack = screenStream.getVideoTracks()[0];

      if (!this.screenTrack || !this.webcamTrack) {
        return null;
      }
      // Replace the webcam track with the screen track
      this.replaceTrackInPeerConnection(this.webcamTrack, this.screenTrack);

      // Handle the ended event to know when to switch back
      this.screenTrack.addEventListener('ended', this.stopScreenShare);
    } catch (error) {
      console.error('Error starting screen share', error);
      throw error;
    } finally {
      return screenStream;
    }
  };

  // When the user stops screen sharing
  public stopScreenShare = (event: Event): void => {
    // Replace the screen track with the original webcam track
    if (!this.screenTrack || !this.webcamTrack) {
      return;
    }

    this.replaceTrackInPeerConnection(this.screenTrack, this.webcamTrack);
    this.screenTrack = null; // Reset the screen track reference

    this.handleScreenShareEndEvent(event);
  };

  // Method to replace a track in the peer connection
  private replaceTrackInPeerConnection = (
    oldTrack: MediaStreamTrack,
    newTrack: MediaStreamTrack
  ): void => {
    if (!this.peerConnection) {
      console.warn(
        'Peer connection is not initialized, could not replace track'
      );

      return;
    }

    const senders: RTCRtpSender[] = this.peerConnection.getSenders();
    const sender: RTCRtpSender | undefined = senders.find(
      (s) => s.track === oldTrack
    );
    if (!sender) {
      console.error(
        'Track not found in peer connection',
        senders,
        'Sender value :',
        sender
      );

      return;
    }

    sender.replaceTrack(newTrack);
  };
  /**
   * Creates a new peer connection and adds event listeners.
   * @returns {RTCPeerConnection}
   */
  public initializePeerConnection = (): RTCPeerConnection => {
    if (this.peerConnection) {
      console.warn('Peer connection already exists.');
      return this.peerConnection;
    }

    this.peerConnection = new RTCPeerConnection(this.iceStunServers);
    this.addPeerConnectionEventListeners();

    this.addWebRtcSocketEventListeners();

    console.log('Creating peer connection');
    return this.peerConnection;
  };

  protected setDataChannelAsOffer = (channel: string): void => {
    this.dataChannel = this.peerConnection!.createDataChannel(channel);

    this.dataChannel.addEventListener('message', (e) => {
      console.log('new message', e.data);
    });

    this.dataChannel.addEventListener('open', (e) => {
      console.log('(OFFER) Connected to other peer LETS GOOOO!!!!', e);
    });
  };

  protected setDataChannelAsAnswer = (): void => {
    this.peerConnection!.addEventListener('datachannel', (e) => {
      console.log('Data dataChannel event', e);
      this.dataChannel = e.channel;

      this.dataChannel.addEventListener('message', (e) => {
        console.log('new message', e.data);
      });

      this.dataChannel.addEventListener('open', (e) => {
        console.log('(ANSWER) Connected to other peer LETS GOOOO!!!!', e);
      });
    });
  };

  /**
   * Adds event listeners to the peer connection.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  private addPeerConnectionEventListeners = (): void => {
    this.peerConnection!.addEventListener('track', this.onTrackEvent);

    this.peerConnection!.addEventListener(
      'icecandidate',
      this.onIceCandidateEvent
    );

    this.peerConnection!.addEventListener(
      'icegatheringstatechange',
      this.onIceGatheringStateChangeEvent
    );

    this.peerConnection!.addEventListener(
      'icecandidateerror',
      this.onIceCandidateErrorEvent
    );

    this.peerConnection!.addEventListener(
      'signalingstatechange',
      this.onSignalingStateChangeEvent
    );
  };

  /**
   * Adds event listeners to the peer connection.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  private removePeerConnectionEventListeners = (): void => {
    this.peerConnection!.removeEventListener('track', this.onTrackEvent);

    this.peerConnection!.removeEventListener(
      'icecandidate',
      this.onIceCandidateEvent
    );

    this.peerConnection!.removeEventListener(
      'icegatheringstatechange',
      this.onIceGatheringStateChangeEvent
    );

    this.peerConnection!.removeEventListener(
      'icecandidateerror',
      this.onIceCandidateErrorEvent
    );

    this.peerConnection!.removeEventListener(
      'signalingstatechange',
      this.onSignalingStateChangeEvent
    );
  };

  private onTrackEvent = (event: RTCTrackEvent): void => {
    this.handleTrackEvent(event);
  };

  private onIceCandidateEvent = (event: RTCPeerConnectionIceEvent): void => {
    if (!event.candidate) {
      console.warn('No ICE candidate found.');

      return;
    }

    this.handleIceCandidate(event.candidate);
  };

  private onIceCandidateErrorEvent = (event: Event): void => {
    const iceErrorEvent = event as RTCPeerConnectionIceErrorEvent;

    this.handleIceCandidateError(iceErrorEvent);
  };

  private onIceGatheringStateChangeEvent = (event: Event): void => {
    console.log(this.peerConnection!.iceGatheringState, event);
  };

  private onSignalingStateChangeEvent = (): void => {
    console.log('Signaling state:', this.peerConnection!.signalingState);
  };

  /**
   * Adds local tracks to the peer connection.
   */
  protected addLocalTracksToPeerConnection = (): void => {
    if (!this.peerConnection) {
      console.error('The peer connection was not initiated');
      return;
    }

    console.log('this.addLocalTracksToPeerConnection');

    if (this.localStream) {
      console.log('this.localStream', this.localStream.getTracks());

      for (const track of this.localStream.getTracks()) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    }

    console.log(this.peerConnection.connectionState);
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
   * Sets the remote video element for the user's webcam
   *
   * @param {HTMLVideoElement | null} element - The video element to set as the local video.
   * @return {void} This function does not return a value.
   */
  public setRemoteVideoElement(element: HTMLVideoElement | null): void {
    this.remoteVideoElement = element;
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
  protected abstract handleTrackEvent(event: RTCTrackEvent): void;

  /**
   * Handles the end of a screen share.
   * @param {Event} event - The event.
   */
  protected abstract handleScreenShareEndEvent(event: Event): void;

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
