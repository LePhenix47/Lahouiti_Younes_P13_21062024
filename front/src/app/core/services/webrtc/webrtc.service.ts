import { Injectable } from '@angular/core';
import { Socket } from 'socket.io-client';

interface MediaStreamLogic {}

interface WebRTCLogic {}

/**
 * A service class for interacting with WebRTC in a two-person chat.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class WebRTCService implements WebRTCLogic, MediaStreamLogic {
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
   * RTC configuration for STUN/TURN servers.
   */
  private readonly stunTurnConfig: RTCConfiguration = {
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

  protected audioInputTrack: MediaStreamTrack | null = null;
  protected microphoneDeviceId: string | null = null;

  protected arrayOfPreviousStreamsTracks: MediaStreamTrack[] = [];

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
   * Stops all tracks of the current local stream and resets it to null.
   */
  public resetLocalStream = (): void => {
    if (!this.localStream) {
      console.error(`Cannot reset local stream because it's not set.`);

      return;
    }

    for (const localTrack of this.localStream.getTracks()) {
      localTrack.stop();
    }

    this.screenTrack?.stop();

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

  public resetRemoteStream = (): void => {
    if (!this.peerConnection) {
      console.error('PeerConnection is not initialized');
      return;
    }

    const senders: RTCRtpSender[] = this.peerConnection.getSenders();
    for (const sender of senders) {
      if (!sender.track) {
        continue;
      }

      sender.track.stop();
    }
  };

  // When the user starts screen sharing
  public startScreenShare = async (): Promise<MediaStream | null> => {
    let screenStream: MediaStream | null = null;

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      this.screenTrack = screenStream.getVideoTracks()[0];
      this.screenTrack.addEventListener('ended', this.stopScreenShare);

      if (!this.screenTrack || !this.webcamTrack) {
        return null;
      }
      // Replace the webcam track with the screen track
      await this.replaceTrackInPeerConnection(
        this.webcamTrack,
        this.screenTrack
      );

      // Handle the ended event to know when to switch back
    } catch (error) {
      error as Error;
      console.error('Error starting screen share', error);
      throw error;
    }

    return screenStream;
  };

  // When the user stops screen sharing
  public stopScreenShare = async (): Promise<void> => {
    // Replace the screen track with the original webcam track
    if (!this.screenTrack || !this.webcamTrack) {
      console.warn(
        'No screen track to stop',
        this.screenTrack,
        this.webcamTrack
      );

      this.handleScreenShareEndEvent();
      return;
    }

    await this.replaceTrackInPeerConnection(this.screenTrack, this.webcamTrack);

    this.screenTrack.stop();
    this.screenTrack = null; // Reset the screen track reference

    this.handleScreenShareEndEvent();
  };

  public async manageLocalStream(
    video: boolean,
    audio: boolean,
    videoDeviceId?: string | null,
    audioDeviceId?: string | null
  ): Promise<MediaStream | null> {
    try {
      const currentVideoId: string | undefined =
        this.webcamDeviceId || this.webcamTrack?.getSettings().deviceId;

      const currentAudioId: string | undefined =
        this.microphoneDeviceId || this.audioInputTrack?.getSettings().deviceId;

      const mediaOptions: MediaStreamConstraints = {
        video:
          video && videoDeviceId
            ? { deviceId: videoDeviceId || currentVideoId }
            : video,
        audio:
          audio && audioDeviceId
            ? { deviceId: audioDeviceId || currentAudioId }
            : audio,
      };

      // Get the media stream based on the current device IDs
      const localStream: MediaStream =
        await navigator.mediaDevices.getUserMedia(mediaOptions);

      // Set the local stream
      this.localStream = localStream;

      // Update the webcam track and device ID
      let newWebcamTrack: MediaStreamTrack | null = null;
      let newAudioInputTrack: MediaStreamTrack | null = null;
      if (video) {
        newWebcamTrack = localStream.getVideoTracks()[0];
        this.webcamDeviceId =
          videoDeviceId || newWebcamTrack.getSettings().deviceId || null; // Set the webcam device ID
      }

      // Update the audio track and device ID
      if (audio) {
        newAudioInputTrack = localStream.getAudioTracks()[0];
        this.microphoneDeviceId =
          audioDeviceId || newAudioInputTrack.getSettings().deviceId || null; // Set the microphone device ID
      }

      console.group('manageLocalStream()');

      console.log(
        'audioDeviceId',
        audioDeviceId,
        'other options',
        this.microphoneDeviceId,
        this.audioInputTrack?.getSettings().deviceId
      );
      console.groupEnd();

      // Update tracks in the peer connection if needed
      const userIsInWebRtcSession: boolean =
        this.peerConnection?.connectionState === 'connected';
      if (userIsInWebRtcSession && !this.screenTrack) {
        // Replace the webcam track if it exists
        if (this.webcamTrack && newWebcamTrack) {
          await this.replaceTrackInPeerConnection(
            this.webcamTrack,
            newWebcamTrack
          );
        } else {
          console.warn(
            'Webcam track not found, webcamTrack:',
            this.webcamTrack,
            'newWebcamTrack:',
            newWebcamTrack
          );
        }

        // Replace the audio track if it exists
        if (this.audioInputTrack && newAudioInputTrack) {
          await this.replaceTrackInPeerConnection(
            this.audioInputTrack,
            newAudioInputTrack
          );
        } else {
          console.warn(
            'Audio track not found, audioInputTrack:',
            this.audioInputTrack,
            'newAudioInputTrack:',
            newAudioInputTrack
          );
        }
      } else {
        this.webcamTrack?.stop();
        this.audioInputTrack?.stop();
      }

      this.webcamTrack = newWebcamTrack;
      this.audioInputTrack = newAudioInputTrack;

      return localStream;
    } catch (error) {
      error as Error;
      console.error('Error accessing media devices:', error);
      // Implement logic for permission denial or other errors
      throw error;
    }
  }

  // Method to replace a track in the peer connection
  private replaceTrackInPeerConnection = async (
    oldTrack: MediaStreamTrack,
    newTrack: MediaStreamTrack
  ): Promise<void> => {
    if (!this.peerConnection) {
      console.warn(
        'Peer connection is not initialized, could not replace track'
      );

      return;
    }

    const senders: RTCRtpSender[] = this.peerConnection.getSenders();
    const sender: RTCRtpSender | null =
      senders.find((rtpSender: RTCRtpSender) => rtpSender.track === oldTrack) ||
      null;

    if (!sender) {
      console.warn('Track not found in peer connection', { senders, sender });

      return;
    }

    await sender.replaceTrack(newTrack);
    console.log(sender, newTrack);

    this.arrayOfPreviousStreamsTracks.push(oldTrack);
  };

  /**
   * Creates a new peer connection and adds event listeners.
   * @returns {RTCPeerConnection}
   */
  public initializePeerConnection = (): RTCPeerConnection => {
    if (this.peerConnection) {
      console.warn('Peer connection already exists.', this.peerConnection);
      return this.peerConnection;
    }

    this.peerConnection = new RTCPeerConnection(this.stunTurnConfig);
    this.addPeerConnectionEventListeners();

    this.addWebRtcSocketEventListeners();

    console.log('Creating peer connection');
    return this.peerConnection;
  };

  protected setDataChannelAsOffer = (channel: string): void => {
    this.dataChannel = this.peerConnection!.createDataChannel(channel);

    this.dataChannel.addEventListener('message', (e: MessageEvent) => {
      console.log('new message', e.data);
    });

    this.dataChannel.addEventListener('open', (e: Event) => {
      console.log('(OFFER) Connected to other peer LETS GOOOO!!!!', e);
    });

    this.dataChannel.addEventListener('close', (e: Event) => {
      console.log('Closed data channel (RIP)', e);
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
  protected addPeerConnectionEventListeners = (): void => {
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

    // this.peerConnection!.addEventListener('negotiationneeded', (e: Event) => {
    //   console.log('negotiationneeded', e);
    // });
    // this.peerConnection!.addEventListener(
    //   'connectionstatechange',
    //   (e: Event) => {
    //     console.log('connectionstatechange', e);
    //   }
    // );
  };

  /**
   * Adds event listeners to the peer connection.
   * @param {RTCPeerConnection} peerConnection - The peer connection instance.
   */
  protected removePeerConnectionEventListeners = (): void => {
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

    if (!this.localStream) {
      console.error(
        'The local stream was not initiated, could not add local tracks to peer connection'
      );

      return;
    }
    console.log('this.localStream', this.localStream.getTracks());

    for (const track of this.localStream.getTracks()) {
      this.peerConnection.addTrack(track, this.localStream);
    }

    console.log(this.peerConnection.connectionState);
  };

  protected addTransceiversToPeerConnection = (): void => {
    if (!this.peerConnection) {
      console.error('The peer connection was not initiated');
      return;
    }

    // Adding an audio transceiver
    this.peerConnection.addTransceiver('audio', {
      direction: 'sendrecv',
    });

    // Adding a video transceiver
    this.peerConnection.addTransceiver('video', {
      direction: 'sendrecv',
    });
  };

  protected removeLocalTracksFromPeerConnection = (): void => {
    if (!this.peerConnection) {
      console.error('The peer connection was not initiated');
      return;
    }

    if (!this.localStream) {
      console.error('The local stream was not initiated');
      return;
    }

    console.log('Removing local tracks from peer connection');

    console.log('Local stream tracks:', this.localStream.getTracks());

    // Get the senders for the current peer connection
    const senders = this.peerConnection.getSenders();

    const allTracks: MediaStreamTrack[] = [
      ...this.localStream.getTracks(),
    ].concat(this.arrayOfPreviousStreamsTracks);

    for (const track of allTracks) {
      // Find the sender that corresponds to the track
      const sender: RTCRtpSender | null =
        senders.find((s) => s.track === track) || null;

      if (!sender) {
        console.warn('Sender for track not found:', track);
        continue;
      }

      // Stop the track if you want to stop sending media
      track.stop();
      // Remove the track from the peer connection
      this.peerConnection.removeTrack(sender);
      console.log(`Removed track: ${track.kind}`);
    }

    console.log('Peer connection state:', this.peerConnection.connectionState);
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
   * Removes event listeners for WebRTC socket events.
   *
   * @return {void} This function does not return a value.
   */
  public abstract removeWebRtcSocketEventListeners(): void;

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
  protected abstract handleScreenShareEndEvent(): void;

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
