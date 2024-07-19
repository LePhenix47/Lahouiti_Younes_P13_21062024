import { Injectable } from '@angular/core';
import { WebRTCService } from '../webrtc/webrtc.service';
import { SignalMessage } from '@core/types/chat/chat.types';

@Injectable({
  providedIn: 'root',
})
export class ChatWebRtcService extends WebRTCService {
  public rtcConnected: boolean = false;
  public hasCreatedRoom: boolean = false;
  public currentRoom: string | null = null;
  protected roomList: string[] = []; // To keep track of available rooms

  // Callbacks for room-related events
  private onRoomListUpdateCallback: ((rooms: string[]) => void) | null = null;
  private onRoomCreatedCallback: ((roomName: string) => void) | null = null;
  private onRoomJoinedCallback:
    | ((roomName: string, userName: string) => void)
    | null = null;
  private onRoomDeletedCallback: ((roomName: string) => void) | null = null;
  private onRoomErrorCallback: ((errorMessage: string) => void) | null = null;

  /**
   * Adds websocket event listeners related to WebRTC for handling ICE candidates, offers, and answers
   */
  protected addWebRtcSocketEventListeners = (): void => {
    if (!this.socketio) {
      return;
    }

    console.log('Adding WebRTC socket listeners !!!');

    this.socketio.on('ice-candidate', async (remotePeerIceCandidate) => {
      await this.peerConnection!.addIceCandidate(remotePeerIceCandidate);
      console.log('ice-candidate', remotePeerIceCandidate);

      this.onReceiveIce(remotePeerIceCandidate);
    });

    // * If the user is the RECEIVER
    this.socketio.on('offer', async (remoteOffer) => {
      await this.peerConnection!.setRemoteDescription(remoteOffer);
      console.log('offer', remoteOffer);

      this.onReceiveOffer(remoteOffer);
    });

    // * If the user is the SENDER
    this.socketio.on('answer', async (remoteAnswer) => {
      await this.peerConnection!.setRemoteDescription(remoteAnswer);
      console.log('answer', remoteAnswer);

      this.onReceiveAnswer(remoteAnswer);
    });
  };

  /**
   * Adds websocket event listeners for handling room management.
   * @return {void}
   */
  public addRoomSocketEventListeners = (): void => {
    if (!this.socketio) {
      return;
    }

    console.log('Adding socket listeners for room management !!!');

    this.socketio.on('room-list', (rooms: string[]) => {
      this.roomList = rooms;
      console.log('Updated room list:', rooms);

      this.onRoomListUpdateCallback?.(rooms);
    });

    this.socketio.on('room-created', (data: { roomName: string }) => {
      console.log(`Room created: ${data.roomName}`);

      this.onRoomCreatedCallback?.(data.roomName);
    });

    this.socketio.on(
      'room-joined',
      (data: { roomName: string; userName: string }) => {
        console.log(`Room joined: ${data.roomName} by ${data.userName}`);

        this.onRoomJoinedCallback?.(data.roomName, data.userName);
      }
    );

    this.socketio.on('room-deleted', (data: { roomName: string }) => {
      console.log(`Room deleted: ${data.roomName}`);

      this.onRoomDeletedCallback?.(data.roomName);
    });

    this.socketio.on('room-error', (error: { message: string }) => {
      console.error(`Room error: ${error.message}`);

      this.onRoomErrorCallback?.(error.message);
    });
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
    this.socketio.emit('create-room', roomName);
  };

  public deleteRoom = (roomName: string): void => {
    if (!this.socketio) {
      return;
    }

    this.socketio.emit('room-deleted', roomName);
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
    this.socketio.emit('join-room', roomName);
  };

  /**
   * Leaves the current room. This will cause the user to be disconnected from
   * the room.
   */
  public leaveRoom = (): void => {
    if (!this.currentRoom || !this.socketio) {
      return;
    }

    this.currentRoom = null;
    this.socketio.emit('leave-room', this.currentRoom);
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

  public handleTrackEvent = (event: RTCTrackEvent): void => {
    // Handle incoming tracks from remote peers
    console.log(`Received tracks from remote peer`, event);
    // Example: Display incoming video/audio to the user interface
    for (const stream of event.streams) {
      console.log({ stream });
    }
  };

  public createOffer = async (
    offer: RTCSessionDescriptionInit
  ): Promise<void> => {
    // * If Peer 1 initializes WebRTC, Peer 2 should respond with an offer

    // Handle incoming offer from remote peer
    console.log(`Received offer from remote peer`, offer);
    // Example: Respond with an answer

    const peerConnection: RTCPeerConnection = this.createPeerConnection();

    const answer: RTCSessionDescriptionInit =
      await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    // TODO: Handle offer to start WebRTC session
  };

  public createAnswer = async (
    answer: RTCSessionDescriptionInit
  ): Promise<void> => {
    // * If Peer 2 initializes WebRTC, Peer 1 should respond with an offer

    // Handle incoming answer from remote peer
    console.log(`Received answer from remote peer`, answer);
    // Set remote description for peer connection
    const peerConnection = this.peerConnection;
    if (!peerConnection) {
      return;
    }

    const sessionDescription = new RTCSessionDescription(answer);

    await peerConnection.setRemoteDescription(sessionDescription);
  };

  public onReceiveAnswer = async (answer: RTCSessionDescriptionInit) => {};

  public onReceiveIce = async (iceCandidate: RTCIceCandidate) => {};

  public onReceiveOffer = async (offer: RTCSessionDescriptionInit) => {};

  public handleIceCandidate = async (
    candidate: RTCIceCandidate
  ): Promise<void> => {
    try {
      // Handle incoming ICE candidate from remote peer
      // Add ICE candidate to peer connection
      const peerConnection = this.peerConnection;
      if (!peerConnection) {
        return;
      }
      console.log(
        `Received ICE candidate from remote peer`,
        peerConnection,
        candidate
      );

      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  public handleIceCandidateError = (error: RTCPeerConnectionIceErrorEvent) => {
    console.error('ICE candidate error:', error);
  };

  // Example method for starting a WebRTC session with a specific user
  public startWebRTCSession = (username: string, usersList: string[]): void => {
    // Example: Send an initial offer to start WebRTC session
    this.subscribeToSignalTopic(username);
    this.sendOffer(username, usersList);
    // Subscribe to the signaling topic for the user
  };

  // Method to subscribe to signaling topic and handle incoming messages
  public subscribeToSignalTopic = (username: string): void => {
    if (!this.socketio?.connected) {
      this.rtcConnected = false;
      console.error('STOMP client is not set.', this.socketio);
      return;
    }

    this.rtcConnected = true;

    // Subscribe to the signaling topic specific to the user
    const signalingTopic = `/signaling`;
  };
  // Example method to send an offer to start a WebRTC session with a specific user
  private sendOffer = async (
    username: string,
    usersList: string[]
  ): Promise<void> => {
    const peerConnection: RTCPeerConnection = this.createPeerConnection();

    const offer: RTCSessionDescriptionInit = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    console.log(
      '%cCreated an offer!',
      'background: #222; color: #bada55; padding: 5px;'
    );

    const { type, sdp } = offer;

    const offerPayload: SignalMessage = {
      type,
      sdp: sdp!,
      fromUsername: username,
      toUsernames: [...usersList],
    };

    // TODO: Send offer to signaling server
  };

  // Example method for ending a WebRTC session with a specific user
  public endWebRTCSession = (username: string): void => {
    // Close peer connection and clean up resources
    this.closePeerConnection();
    this.leaveRoom(); // Ensure to leave the room when ending the session
  };
}
