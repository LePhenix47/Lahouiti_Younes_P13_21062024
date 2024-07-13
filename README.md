# P13: Your car your way WebSockets and WebRTC Proof of Concept

## Technologies used

Stack:

- Back-End: Node.js + Express server with socket.io

- Front-End: Angular 18 with socket.io

## WebRTC dictionary

Understanding the key terms and components in WebRTC is crucial for working with this PoC:

__NAT:__ Network Address Translation, a method used to remap one IP address space into another.

__STUN/TURN:__ STUN (Session Traversal Utilities for NAT) helps in discovering the const IP address and port, while TURN (Traversal Using Relays around NAT) relays media when direct peer-to-peer connection fails.

__Audio-video P2P:__ Direct peer-to-peer communication for audio and video streams.

__UDP and TCP streams:__ Protocols for data transmission. UDP is preferred for real-time communication (audio and video) and TCP for WebSockets.

__Websockets:__ Protocol for two-way communication between a client and a server.

__Signaling path:__ The process of establishing, maintaining, and terminating the connection between peers.

__SDP:__ Session Description Protocol, a format for describing multimedia communication sessions.

__Signaling server:__ A server that helps in establishing connections between peers by exchanging signaling messages (e.g., offers, answers, and ICE candidates).

## WebRTC steps

1. Getting the Local Media Stream (GUM)

To access the user's media devices (camera and microphone), we use getUserMedia and getDisplayMedia.

```ts
const setLocalStream = async (audio: boolean = true, video: boolean = true): Promise<MediaStream | null> => {
  try {
    if (!audio && !video) {
      return null;
    }
    if (this.localStream) {
      return this.localStream;
    }
    const localStream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio, video });
    this.localStream = localStream;
    return localStream;
  } catch (error) {
    console.error('Error accessing media devices.', error);
    throw error;
  }
};
```

2. Create the RTC Peer Connection with a STUN-TURN Server

Create an RTC peer connection object using STUN/TURN servers.

```ts

const iceStunServers: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

const addPeerConnection = (userId: string): RTCPeerConnection => {
  if (this.peerConnections.has(userId)) {
    console.warn('Peer connection already exists for user.', userId, this.peerConnections.get(userId));
    return this.peerConnections.get(userId)!;
  }
  const peerConnection = new RTCPeerConnection(this.iceStunServers);
  this.addPeerConnectionEventListeners(userId, peerConnection);
  this.addLocalTracksToPeerConnection(peerConnection);
  this.peerConnections.set(userId, peerConnection);
  return peerConnection;
};
```

3. Add the Local Media Stream Tracks to the Peer Connection

Add the local media tracks to the peer connection.

```ts
const addLocalTracksToPeerConnection = (peerConnection: RTCPeerConnection): void => {
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
```

1. Add Event Listeners for the ICE Candidates and On Track

Add event listeners for handling ICE candidates and remote tracks.

```ts
const addPeerConnectionEventListeners = (userId: string, peerConnection: RTCPeerConnection): void => {
  peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
    if (!event.candidate) {
      console.error('Could not send ICE candidate as it was null.');
      return;
    }
    this.handleIceCandidate(userId, event.candidate);
  };
  
  peerConnection.ontrack = (event: RTCTrackEvent) => {
    if (!this.remoteStreams) {
      console.warn('Could not add remote stream as it was null.');
      return;
    }
    this.addRemoteTracksToPeerConnection(event);
    this.handleTrackEvent(userId, event);
  };
};
```

1. Setting Up the Offer

Create and send an offer to the other peer.

```ts
const sendOffer = async (username: string, usersList: string[]): Promise<void> => {
  const peerConnection: RTCPeerConnection = this.addPeerConnection(username);
  const offer: RTCSessionDescriptionInit = await peerConnection.createOffer();
  console.log(offer.sdp);
  await peerConnection.setLocalDescription(offer);
  const { type, sdp } = offer;
  const offerPayload: SignalMessage = { type, sdp: sdp!, fromUsername: username, toUsernames: [...usersList] };

  // Add method to send the offer to the signaling server
};
```

1. Sending the Offer to the Other Peer with the Signaling Server

Use the signaling server to send the offer to the other peer.


```ts
protected sendSignalingMessage = (destination: string, message: any): void => {
  if (!this.stompClient) {
    console.error(Boolean(this.stompClient) ? "STOMP client isn't initialized, please connect to the WebSockets." : 'STOMP client is not connected.', this.stompClient);
    return;
  }
  this.stompClient.send(destination, {}, JSON.stringify(message));
};
```

7. Setting Up the Signaling Server

Set up a server using WebSockets (e.g., socket.io, Spring Boot with netty-socket.io) to handle the signaling messages. The server should handle the exchange of offers, answers, and ICE candidates between peers.

8. Setting Up the Answer

Handle the reception of an offer and send an answer.


```ts
const handleOffer = async (username: string, offer: RTCSessionDescriptionInit): Promise<void> => {
  console.log(`Received offer from ${username}`, offer);
  const peerConnection: RTCPeerConnection = this.addPeerConnection(username);
  const answer: RTCSessionDescriptionInit = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  this.sendSignalingMessage(`/webrtc.signal`, { username, offer });
};
```

9. Set the Remote Description

Set the remote description with the received offer or answer.


```ts
const handleAnswer = async (username: string, answer: RTCSessionDescriptionInit): Promise<void> => {
  console.log(`Received answer from ${username}`, answer);
  const peerConnection = this.peerConnections.get(username);
  if (!peerConnection) {
    return;
  }
  const sessionDescription = new RTCSessionDescription(answer);
  await peerConnection.setRemoteDescription(sessionDescription);
};
```

## Conclusion

This README provides a structured approach to understanding and implementing a WebRTC and WebSocket-based chat application. The steps outlined should help in setting up the necessary components and handling the peer-to-peer connections effectively.