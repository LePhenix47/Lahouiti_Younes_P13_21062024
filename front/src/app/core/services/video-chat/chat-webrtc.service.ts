import { Injectable } from '@angular/core';
import { WebRTCService } from '../webrtc/webrtc.service';
import { Room } from '@core/types/videoconference/videoconference.types';

@Injectable({
  providedIn: 'root',
})
export class ChatWebRtcService extends WebRTCService {
  public rtcConnected: boolean = false;
  public hasCreatedRoom: boolean = false;
  public currentRoom: string | null = null;
  protected roomList: Room[] = []; // To keep track of available rooms

  private hasAddedRoomSocketListeners: boolean = false;
  private hasAddedWebRtcSocketListeners: boolean = false;

  // Callbacks for room-related events
  private onRoomListUpdateCallback: ((rooms: Room[]) => void) | null = null;
  private onRoomCreatedCallback: ((roomName: string) => void) | null = null;
  private onRoomJoinedCallback:
    | ((roomName: string, userName: string) => void)
    | null = null;
  private onRoomLeftCallback:
    | ((roomName: string, userName: string) => void)
    | null = null;
  private onRoomDeletedCallback: ((roomName: string) => void) | null = null;
  private onRoomErrorCallback: ((errorMessage: string) => void) | null = null;
  private onReceiveEnabledLocalMedia:
    | ((remotePeerHasSharedLocalMedia: {
        video: boolean;
        audio: boolean;
      }) => void)
    | null = null;
  private onRemotePeerMediaToggle:
    | ((deviceToggles: { video: boolean; audio: boolean }) => void)
    | null = null;

  private onTrackAddedCallback: ((...args: any[]) => void) | null = null;

  private onScreenShareEndCallback: ((...args: any[]) => void) | null = null;
  private onReceiveToggledScreenShare:
    | ((isSharingScreen: boolean) => void)
    | null = null;

  public override handleScreenShareEndEvent = () => {
    this.onScreenShareEndCallback?.();
  };

  /**
   * Adds websocket event listeners related to WebRTC for handling ICE candidates, offers, and answers
   */
  public override addWebRtcSocketEventListeners = (): void => {
    if (!this.socketio) {
      return;
    }

    if (this.hasAddedWebRtcSocketListeners) {
      console.warn('WebRTC socket listeners already added, skipping');
      return;
    }

    this.socketio.on(
      'ice-candidate',
      async (remotePeerIceCandidate: RTCIceCandidate) => {
        await this.peerConnection!.addIceCandidate(remotePeerIceCandidate);

        this.onReceiveIce(remotePeerIceCandidate);
      }
    );

    // * If the user is the RECEIVER
    this.socketio.on('offer', async (remoteOffer: RTCSessionDescription) => {
      const sessionDescription = new RTCSessionDescription(remoteOffer);
      await this.peerConnection!.setRemoteDescription(sessionDescription);
      this.onReceiveOffer(remoteOffer);

      this.createAnswer();
    });

    // * If the user is the SENDER
    this.socketio.on('answer', async (remoteAnswer: RTCSessionDescription) => {
      const sessionDescription = new RTCSessionDescription(remoteAnswer);
      await this.peerConnection!.setRemoteDescription(sessionDescription);

      this.onReceiveAnswer(remoteAnswer);
    });

    this.hasAddedWebRtcSocketListeners = true;
  };

  /**
   * Removes websocket event listeners related to WebRTC for handling ICE candidates, offers, and answers
   */
  public override removeWebRtcSocketEventListeners = (): void => {
    if (!this.socketio) {
      return;
    }

    if (!this.hasAddedWebRtcSocketListeners) {
      console.warn('WebRTC socket listeners not added, skipping removal');
      return;
    }

    // Remove the ice-candidate listener
    this.socketio.off('ice-candidate');

    // Remove the offer listener
    this.socketio.off('offer');

    // Remove the answer listener
    this.socketio.off('answer');

    this.hasAddedWebRtcSocketListeners = false;
  };

  /**
   * Adds websocket event listeners for handling room management.
   * @return {void}
   */
  public addRoomSocketEventListeners = (): void => {
    if (!this.socketio) {
      return;
    }

    if (this.hasAddedRoomSocketListeners) {
      console.warn('Room socket listeners already added, skipping');
      return;
    }

    this.socketio.on('room-list', (rooms: Room[]) => {
      this.roomList = rooms;

      this.onRoomListUpdateCallback?.(rooms);
    });

    this.socketio.on('room-created', (data: { roomName: string }) => {
      this.onRoomCreatedCallback?.(data.roomName);
    });

    this.socketio.on(
      'room-joined',
      (data: { roomName: string; joinerName: string }) => {
        this.onRoomJoinedCallback?.(data.roomName, data.joinerName);
      }
    );

    this.socketio.on(
      'room-left',
      (data: { roomName: string; userName: string }) => {
        this.onRoomLeftCallback?.(data.roomName, data.userName);
      }
    );

    this.socketio.on(
      'room-deleted',
      (data: { roomName: string; userName: string }) => {
        this.onRoomDeletedCallback?.(data.roomName);
      }
    );

    this.socketio.on('room-error', (error: { message: string }) => {
      console.error(`Room error: ${error.message}`);

      this.onRoomErrorCallback?.(error.message);
    });

    this.socketio.on(
      'enabled-local-media',
      (remotePeerHasSharedLocalMedia: { video: boolean; audio: boolean }) => {
        const { video, audio } = remotePeerHasSharedLocalMedia;

        this.onReceiveEnabledLocalMedia?.(remotePeerHasSharedLocalMedia);
      }
    );

    this.socketio.on('toggled-screen-share', (isSharingScreen: boolean) => {
      this.onReceiveToggledScreenShare?.(isSharingScreen);
    });

    this.socketio.on(
      'toggled-media',
      (deviceToggles: { video: boolean; audio: boolean }) => {
        this.onReceiveEnabledLocalMedia?.(deviceToggles);
      }
    );

    this.hasAddedRoomSocketListeners = true;
  };

  // * Getters

  public getRoomsList() {
    return this.roomList;
  }

  // * Methods to set callbacks
  public setOnRoomListUpdateCallback = (
    callback: (rooms: Room[]) => void
  ): void => {
    this.onRoomListUpdateCallback = callback;
  };

  public setOnRoomCreatedCallback = (
    callback: (roomName: string) => void
  ): void => {
    this.onRoomCreatedCallback = callback;
  };

  public setOnRoomJoinedCallback = (
    callback: (roomName: string, userName: string) => void
  ): void => {
    this.onRoomJoinedCallback = callback;
  };

  public setOnRoomLeftCallback = (
    callback: (roomName: string, userName: string) => void
  ): void => {
    this.onRoomLeftCallback = callback;
  };

  public setOnRoomDeletedCallback = (
    callback: (roomName: string) => void
  ): void => {
    this.onRoomDeletedCallback = callback;
  };

  public setOnRoomErrorCallback = (
    callback: (errorMessage: string) => void
  ): void => {
    this.onRoomErrorCallback = callback;
  };

  public setOnReceiveEnabledLocalMediaCallback = (
    callback: (remotePeerHasSharedLocalMedia: {
      video: boolean;
      audio: boolean;
    }) => void
  ): void => {
    this.onReceiveEnabledLocalMedia = callback;
  };

  public setOnRemotePeerMediaToggleCallback = (
    callback: (remotePeerHasSharedLocalMedia: {
      video: boolean;
      audio: boolean;
    }) => void
  ): void => {
    this.onRemotePeerMediaToggle = callback;
  };

  public setOnTrackAddedCallback = (
    callback: (...args: any[]) => void
  ): void => {
    this.onTrackAddedCallback = callback;
  };

  public setOnScreenShareEndedCallback = (
    callback: (...args: any[]) => void
  ): void => {
    this.onScreenShareEndCallback = callback;
  };

  public setOnReceiveToggledScreenShare = (
    callback: (...args: any[]) => void
  ): void => {
    this.onReceiveToggledScreenShare = callback;
  };

  /**
   * Creates a room with the given name. The room name will be shared with the
   * backend and will be used to identify the room.
   *
   * @param roomName The name of the room to be created.
   */
  public createRoom = (roomName: string): void => {
    if (!this.socketio) {
      return;
    }

    this.currentRoom = roomName;
    this.socketio.emit('create-room', roomName);
  };

  public deleteRoom = (roomName: string): void => {
    if (!this.socketio) {
      return;
    }

    this.socketio.emit('room-deleted', roomName);
    this.currentRoom = null;
  };

  /**
   * Joins the room with the given name. The room name will be shared with the
   * backend and will be used to identify the room.
   *
   * @param {string} roomName The name of the room to be joined.
   */
  public joinRoom = (roomName: string, joinerName: string): void => {
    if (!this.socketio) {
      return;
    }
    this.currentRoom = roomName;
    this.socketio.emit('join-room', { roomName, joinerName });
  };

  /**
   * Leaves the current room. This will cause the user to be disconnected from
   * the room.
   */
  public leaveRoom = (): void => {
    if (!this.currentRoom || !this.socketio) {
      return;
    }

    this.socketio.emit('leave-room', this.currentRoom);

    this.currentRoom = null;
  };

  public notifyRemotePeerOfLocalMediaShare = (
    remotePeerHasSharedLocalMedia: boolean | { video: boolean; audio: boolean }
  ): void => {
    if (!this.socketio) {
      return;
    }

    this.socketio.emit('enabled-local-media', {
      roomName: this.currentRoom,
      remotePeerHasSharedLocalMedia,
    });
  };

  public notifyRemotePeerOfScreenShare = (isSharingScreen: boolean): void => {
    if (!this.socketio) {
      return;
    }

    this.socketio.emit('toggled-screen-share', {
      roomName: this.currentRoom,
      isSharingScreen,
    });
  };

  public notifyRemotePeerOfDeviceToggle = (deviceToggles: {
    video: boolean;
    audio: boolean;
  }): void => {
    if (!this.socketio) {
      return;
    }

    this.socketio.emit('toggled-media', {
      roomName: this.currentRoom,
      deviceToggles,
    });
  };

  /**
   * Closes the peer connection.
   */
  public closePeerConnection = (): void => {
    if (!this.peerConnection) {
      console.error("Peer connection doesn't exist.");
      return;
    }

    this.peerConnection.close();
    this.peerConnection = null;
  };
  /**
   * Closes the peer connection.
   */
  public closeDataChannel = (): void => {
    if (!this.dataChannel) {
      console.error("Data channel doesn't exist.");
      return;
    }

    this.dataChannel.close();
    this.dataChannel = null;
  };

  public override createOffer = async (): Promise<void> => {
    this.addLocalTracksToPeerConnection();

    this.addTransceiversToPeerConnection();

    if (!this.peerConnection) {
      console.error(
        "Cannot create offer because peer connection doesn't exist."
      );
      return;
    }
    // * If Peer 1 initializes WebRTC, Peer 2 should respond with an offer

    // Example: Respond with an answer

    const peerConnection: RTCPeerConnection = this.peerConnection;

    this.setDataChannelAsOffer(this.currentRoom!);

    const offer: RTCSessionDescriptionInit = await peerConnection.createOffer();

    // Handle incoming offer from remote peer

    await peerConnection.setLocalDescription(offer);

    const offerPayload = {
      offer,
      roomName: this.currentRoom,
    } as const;

    this.socketio!.emit('offer', offerPayload);
  };

  public override createAnswer = async (): Promise<void> => {
    if (!this.peerConnection) {
      console.error(
        "Cannot create answer because peer connection doesn't exist."
      );
      return;
    }

    this.addLocalTracksToPeerConnection();

    const peerConnection: RTCPeerConnection = this.peerConnection;

    this.setDataChannelAsAnswer();

    const answer: RTCSessionDescriptionInit =
      await peerConnection.createAnswer();

    // Handle incoming answer from remote peer

    await peerConnection.setLocalDescription(answer);

    const answerPayload = {
      answer,
      roomName: this.currentRoom,
    } as const;

    this.socketio!.emit('answer', answerPayload);
  };

  public onReceiveAnswer = async (answer: RTCSessionDescriptionInit) => {};

  public onReceiveIce = async (iceCandidate: RTCIceCandidate) => {};

  public onReceiveOffer = async (offer: RTCSessionDescriptionInit) => {};

  protected override handleTrackEvent = (event: RTCTrackEvent): void => {
    // Check if we have any streams from the event
    if (!event.streams.length) {
      console.error(`No streams from remote peer`, event);
      return;
    }

    // * Since only 2 people can make a call, we only need one stream
    const stream: MediaStream = event.streams[0];
    this.remoteVideoElement!.srcObject = stream;

    this.onTrackAddedCallback?.(event);
  };

  public override handleIceCandidate = async (
    candidate: RTCIceCandidate
  ): Promise<void> => {
    const candidatePayload = { roomName: this.currentRoom, candidate } as const;

    this.socketio!.emit('ice-candidate', candidatePayload);
  };

  public handleIceCandidateError = (error: RTCPeerConnectionIceErrorEvent) => {
    console.error('icecandidateerror', error.errorCode, error.errorText);
  };

  // Example method for starting a WebRTC session with a specific user
  public startWebRTCSession = async (): Promise<void> => {
    this.initializePeerConnection();

    await this.createOffer();
  };

  // Example method for ending a WebRTC session with a specific user
  public endWebRTCSession = (): void => {
    if (!this.localStream || !this.peerConnection) {
      console.error('Local stream or peer connection not initialized');

      return;
    }
    // Close peer connection and clean up resources
    this.removeLocalTracksFromPeerConnection();
    this.resetLocalStream();

    this.removeWebRtcSocketEventListeners();

    this.closeDataChannel();
    this.closePeerConnection();
  };

  public resetPeerConnection = (): void => {
    this.peerConnection = null;
  };
}
