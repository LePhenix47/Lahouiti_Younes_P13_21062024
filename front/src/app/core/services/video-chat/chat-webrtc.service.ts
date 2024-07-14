import { Injectable } from '@angular/core';
import { WebRTCService } from '../webrtc/webrtc.service';
import { SignalMessage } from '@core/types/chat/chat.types';

@Injectable({
  providedIn: 'root',
})
export class ChatWebRtcService extends WebRTCService {
  public rtcConnected: boolean = false;

  public handleTrackEvent = (username: string, event: RTCTrackEvent): void => {
    // Handle incoming tracks from remote peers
    console.log(`Received tracks from ${username}`, event);
    // Example: Display incoming video/audio to the user interface
  };

  public handleOffer = async (
    username: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> => {
    // * If Peer 1 initializes WebRTC, Peer 2 should respond with an offer

    // Handle incoming offer from remote peer
    console.log(`Received offer from ${username}`, offer);
    // Example: Respond with an answer

    const peerConnection: RTCPeerConnection = this.addPeerConnection(username);

    const answer: RTCSessionDescriptionInit =
      await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    // TODO: Handle offer to start WebRTC session
  };

  public handleAnswer = async (
    username: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> => {
    // * If Peer 2 initializes WebRTC, Peer 1 should respond with an offer

    // Handle incoming answer from remote peer
    console.log(`Received answer from ${username}`, answer);
    // Set remote description for peer connection
    const peerConnection = this.peerConnections.get(username);
    if (!peerConnection) {
      return;
    }

    const sessionDescription = new RTCSessionDescription(answer);

    await peerConnection.setRemoteDescription(sessionDescription);
  };

  public handleIceCandidate = async (
    username: string,
    candidate: RTCIceCandidate
  ): Promise<void> => {
    try {
      // Handle incoming ICE candidate from remote peer
      // Add ICE candidate to peer connection
      const peerConnection = this.peerConnections.get(username);
      if (!peerConnection) {
        return;
      }
      console.log(
        `Received ICE candidate from ${username}`,
        peerConnection,
        candidate
      );

      // await peerConnection.addIceCandidate(candidate);
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
    if (!this.stompClient?.connected) {
      this.rtcConnected = false;
      console.error('STOMP client is not set.', this.stompClient);
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
    const peerConnection: RTCPeerConnection = this.addPeerConnection(username);

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
    this.closePeerConnection(username);
    // Optionally, send a signaling message or perform cleanup actions
  };
}
