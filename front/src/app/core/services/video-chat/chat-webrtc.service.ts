import { Injectable } from '@angular/core';
import { WebRTCService } from '../webrtc/webrtc.service';

@Injectable({
  providedIn: 'root',
})
export class ChatWebRtcService extends WebRTCService {
  public rtcConnected: boolean = false;
  public hasCreatedRoom: boolean = false;
  public currentRoom: string | null = null;
  protected roomList: string[] = []; // To keep track of available rooms

  private hasAddedRoomSocketListeners: boolean = false;
  private hasAddedWebRtcSocketListeners: boolean = false;

  // Callbacks for room-related events
  private onRoomListUpdateCallback: ((rooms: string[]) => void) | null = null;
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
    | ((remotePeerHasSharedLocalMedia: boolean) => void)
    | null = null;

  private onTrackAddedCallback: ((...args: any[]) => void) | null = null;

  /**
   * Adds websocket event listeners related to WebRTC for handling ICE candidates, offers, and answers
   */
  public addWebRtcSocketEventListeners = (): void => {
    if (!this.socketio) {
      return;
    }

    if (this.hasAddedWebRtcSocketListeners) {
      console.warn('WebRTC socket listeners already added, skipping');
      return;
    }

    console.log(
      '%cAdding WebRTC socket listeners !!!',
      'background: white; color: black; padding: 1rem'
    );

    this.socketio.on('ice-candidate', async (remotePeerIceCandidate) => {
      await this.peerConnection!.addIceCandidate(remotePeerIceCandidate);

      this.onReceiveIce(remotePeerIceCandidate);
    });

    // * If the user is the RECEIVER
    this.socketio.on('offer', async (remoteOffer) => {
      const sessionDescription = new RTCSessionDescription(remoteOffer);
      await this.peerConnection!.setRemoteDescription(sessionDescription);
      this.onReceiveOffer(remoteOffer);

      this.createAnswer();
    });

    // * If the user is the SENDER
    this.socketio.on('answer', async (remoteAnswer) => {
      const sessionDescription = new RTCSessionDescription(remoteAnswer);
      await this.peerConnection!.setRemoteDescription(sessionDescription);

      this.onReceiveAnswer(remoteAnswer);
    });

    this.hasAddedWebRtcSocketListeners = true;
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

    this.socketio.on('room-list', (rooms: string[]) => {
      this.roomList = rooms;

      this.onRoomListUpdateCallback?.(rooms);
    });

    this.socketio.on('room-created', (data: { roomName: string }) => {
      this.onRoomCreatedCallback?.(data.roomName);
    });

    this.socketio.on(
      'room-joined',
      (data: { roomName: string; userName: string }) => {
        this.onRoomJoinedCallback?.(data.roomName, data.userName);
      }
    );

    this.socketio.on(
      'room-left',
      (data: { roomName: string; userName: string }) => {
        this.onRoomLeftCallback?.(data.roomName, data.userName);
      }
    );

    this.socketio.on('room-deleted', (data: { roomName: string }) => {
      this.onRoomDeletedCallback?.(data.roomName);
    });

    this.socketio.on('room-error', (error: { message: string }) => {
      console.error(`Room error: ${error.message}`);

      this.onRoomErrorCallback?.(error.message);
    });

    this.socketio.on('enabled-local-media', (remotePeerHasSharedLocalMedia) => {
      this.onReceiveEnabledLocalMedia?.(remotePeerHasSharedLocalMedia);
    });

    this.hasAddedRoomSocketListeners = true;
  };

  // * Getters

  public getRoomList() {
    return this.roomList;
  }

  // * Methods to set callbacks
  public setOnRoomListUpdateCallback = (
    callback: (rooms: string[]) => void
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
    callback: (remotePeerHasSharedLocalMedia: boolean) => void
  ): void => {
    this.onReceiveEnabledLocalMedia = callback;
  };

  public setOnTrackAddedCallback = (
    callback: (...args: any[]) => void
  ): void => {
    this.onTrackAddedCallback = callback;
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
  public joinRoom = (roomName: string): void => {
    if (!this.socketio) {
      return;
    }
    this.currentRoom = roomName;
    this.socketio.emit('join-room', roomName);
  };

  /**
   * Leaves the current room. This will cause the user to be disconnected from
   * the room.
   */
  public leaveRoom = (): void => {
    console.log(this.currentRoom);

    if (!this.currentRoom || !this.socketio) {
      return;
    }

    this.socketio.emit('leave-room', this.currentRoom);

    this.currentRoom = null;
  };

  public notifyRemotePeerOfLocalMediaShare = (
    remotePeerHasSharedLocalMedia: boolean
  ): void => {
    if (!this.socketio) {
      return;
    }

    this.socketio.emit('enabled-local-media', {
      roomName: this.currentRoom,
      remotePeerHasSharedLocalMedia,
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

  public createOffer = async (): Promise<void> => {
    this.addLocalTracksToPeerConnection();

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

  public createAnswer = async (): Promise<void> => {
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

  protected handleTrackEvent = (event: RTCTrackEvent): void => {
    console.log(`Received tracks from remote peer`, event);

    // Check if we have any streams from the event
    if (!event.streams.length) {
      console.error(`No streams from remote peer`, event);
      return;
    }
    // * Since only 2 people can make a call, we only need one stream
    const stream = event.streams[0];
    console.log({ stream });

    // Handle the stream based on its type
    for (const track of stream.getTracks()) {
      switch (track.kind) {
        case 'video': {
          if (!this.remoteVideoElement) {
            return;
          }
          this.remoteVideoElement!.srcObject = stream;
          break;
        }
        case 'screen': {
          if (!this.remoteScreenElement) {
            return;
          }
          this.remoteScreenElement!.srcObject = stream;
          break;
        }
        case 'audio': {
          if (!this.remoteVideoElement) {
            return;
          }
          this.remoteVideoElement!.srcObject = stream;
          break;
        }
      }
    }

    this.onTrackAddedCallback?.(event);
  };

  public handleIceCandidate = async (
    candidate: RTCIceCandidate
  ): Promise<void> => {
    //   `%cGENERATED Ice candidate to send to remote peer`,
    //   'background: yellow; color: black; padding: 1rem',
    //   candidate
    // );

    const candidatePayload = { roomName: this.currentRoom, candidate } as const;

    this.socketio!.emit('ice-candidate', candidatePayload);
  };

  public handleIceCandidateError = (error: RTCPeerConnectionIceErrorEvent) => {
    console.error('icecandidateerror', error.errorCode, error.errorText);
  };

  // Example method for starting a WebRTC session with a specific user
  public startWebRTCSession = (): void => {};

  // Example method for ending a WebRTC session with a specific user
  public endWebRTCSession = (): void => {
    // Close peer connection and clean up resources
    this.closePeerConnection();

    const hasCreatedRoom = this.currentRoom === 'this';
    this.leaveRoom(); // Ensure to leave the room when ending the session
  };
}
