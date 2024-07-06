import { Injectable } from '@angular/core';
import { WebRTCService } from '../webrtc/webrtc.service';

@Injectable({
  providedIn: 'root',
})
export class ChatWebRtcService extends WebRTCService {
  public handleTrackEvent(userId: string, event: RTCTrackEvent): void {
    // Handle incoming tracks from remote peers
    console.log(`Received tracks from ${userId}`, event);
    // Example: Display incoming video/audio to the user interface
  }

  public async handleOffer(
    userId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    // Handle incoming offer from remote peer
    console.log(`Received offer from ${userId}`, offer);
    // Example: Respond with an answer

    await this.setLocalStream(); // Ensure local stream is set up
    const peerConnection: RTCPeerConnection = this.addPeerConnection(userId);

    const answer: RTCSessionDescriptionInit =
      await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    this.sendSignalingMessage(`/topic/signal`, { userId, offer }); // Send offer to signaling server
  }

  public async handleAnswer(
    userId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    // Handle incoming answer from remote peer
    console.log(`Received answer from ${userId}`, answer);
    // Set remote description for peer connection
    const peerConnection = this.peerConnections.get(userId);
    if (!peerConnection) {
      return;
    }

    const sessionDescription = new RTCSessionDescription(answer);

    await peerConnection.setRemoteDescription(sessionDescription);
  }

  public async handleIceCandidate(
    userId: string,
    candidate: RTCIceCandidate
  ): Promise<void> {
    try {
      // Handle incoming ICE candidate from remote peer
      console.log(`Received ICE candidate from ${userId}`, candidate);
      // Add ICE candidate to peer connection
      const peerConnection = this.peerConnections.get(userId);
      if (!peerConnection) {
        return;
      }

      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  // Example method for starting a WebRTC session with a specific user
  public startWebRTCSession(userId: string): void {
    // Example: Send an initial offer to start WebRTC session
    this.sendOffer(userId);
    // Subscribe to the signaling topic for the user
    this.subscribeToSignalTopic(userId);
  }

  // Method to subscribe to signaling topic and handle incoming messages
  public subscribeToSignalTopic(userId: string): void {
    // Subscribe to the signaling topic specific to the user
    const signalingTopic = `/topic/signal`;

    if (!this.stompClient) {
      console.error('STOMP client is not set.');
      return;
    }

    this.stompClient.subscribe(signalingTopic, (message) => {
      const signalMessage = JSON.parse(message.body);
      console.log(`Received signaling message for ${userId}`, signalMessage);

      if (signalMessage.offer) {
        this.handleOffer(userId, signalMessage.offer);
      } else if (signalMessage.answer) {
        this.handleAnswer(userId, signalMessage.answer);
      } else if (signalMessage.candidate) {
        this.handleIceCandidate(userId, signalMessage.candidate);
      } else {
        console.warn('Unknown signaling message type', signalMessage);
      }
    });
  }
  // Example method to send an offer to start a WebRTC session with a specific user
  private async sendOffer(userId: string): Promise<void> {
    await this.setLocalStream(); // Ensure local stream is set up

    const peerConnection: RTCPeerConnection = this.addPeerConnection(userId);

    const offer: RTCSessionDescriptionInit = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    this.sendSignalingMessage(`/chat/${userId}/offer`, offer);
  }

  // Example method for ending a WebRTC session with a specific user
  public endWebRTCSession(userId: string): void {
    // Close peer connection and clean up resources
    this.closePeerConnection(userId);
    // Optionally, send a signaling message or perform cleanup actions
  }
}
