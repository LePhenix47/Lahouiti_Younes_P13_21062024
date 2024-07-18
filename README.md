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

## WebRTC Peer-to-Peer Connection Setup

This document outlines the process of setting up a peer-to-peer connection using WebRTC. The flow includes steps for both the initiator (sender) and the receiver of the connection.

### Get User Media (G.U.M.)

Use `getUserMedia()` to access the user's camera and microphone, and `getDisplayMedia()` to access the user's screen.

```js
const ls1 = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); // User's webcam and microphone
const ls2 = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false  }); // User's screen
```

### Create Peer Connection

Create an `RTCPeerConnection` object.

```js
const pc = new RTCPeerConnection(turnOrStunConfig);
```

### Add Local Tracks to the Connection

Add local media tracks to the peer connection.

```js
ls1.getTracks().forEach(track => pc.addTrack(track));
ls2.getTracks().forEach(track => pc.addTrack(track));
```

### Add Event Listeners to Peer Connection

Listen for various events on the peer connection.

```js
pc.onicecandidate = (event) => { /* Handle ICE candidates */ };
pc.ontrack = (event) => { /* Handle remote track */ };
pc.onnegotiationneeded = (event) => { /* Handle negotiation */ };
pc.onsignalingstatechange = (event) => { /* Debug signaling state */ };
```

### ICE Candidate Event

When an ICE candidate is found, send it to the other peer via the signaling server.

```js
socket.emit("ice-candidate", event.candidate);
```

### ICE Candidate WebSocket Response

When receiving an ICE candidate from the signaling server, add it to the peer connection.

```js
socket.on("ice-candidate", (candidate) => pc.addIceCandidate(candidate));
```

### Initiator (Sender)

#### User Wants to Initiate Call

Create an offer, set the local description, and send the offer via the signaling server.

```js
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
socket.emit("offer", offer);
```

#### Set Remote Description (Answer)

When receiving an answer, set the remote description.

```js
socket.on("answer", async (answer) => {
    await pc.setRemoteDescription(answer);
});
```

### Receiver

#### Set Remote Description (Offer)

When receiving an offer, set the remote description.

```js
socket.on("offer", async (offer) => {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", answer);
});
```

#### Create Answer and Set Local Description

Create an answer, set the local description, and send the answer via the signaling server.

### On Track Event

When a remote media track is added, handle it by creating a new MediaStream and adding the track to it.

```js
pc.ontrack = (event) => {
    const remoteStream = new MediaStream();
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    remoteVideoElement.srcObject = remoteStream;
};
```

### On Negotiation Needed Event

When negotiation is needed, handle it appropriately (e.g., create and send a new offer if necessary).

#### Frontend (FE)

- `offer`: Emitted when the initiating peer creates an offer.
- `ice-candidate`: Emitted when an ICE candidate is generated.
- `answer`: Emitted when the receiving peer creates an answer.

#### Backend (BE)

- `offer`: Broadcasts the SDP offer from the initiating peer to the receiving peer.
- `ice-candidate`: Broadcasts the ICE candidates between peers.
- `answer`: Broadcasts the SDP answer from the receiving peer to the initiating peer.

##### Initiating Peer

__Outgoing Events:__

1. __Send SDP offer:__

   ```js
   socket.emit('offer', {
     type: 'offer',
     sdp: peerConnection.localDescription
   });
   ```

2. __Send ICE candidates:__

   ```js
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('ice-candidate', {
         candidate: event.candidate
       });
     }
   };
   ```

__Incoming Events:__

1. __Receive SDP answer:__

   ```js
   socket.on('answer', async (message) => {
     await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
   });
   ```

2. __Receive ICE candidates:__

   ```js
   socket.on('ice-candidate', async (message) => {
     try {
       await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
     } catch (e) {
       console.error('Error adding received ice candidate', e);
     }
   });
   ```

##### Receiving Peer

__Outgoing Events:__

1. __Send SDP answer:__

   ```js
   socket.emit('answer', {
     type: 'answer',
     sdp: peerConnection.localDescription
   });
   ```

2. __Send ICE candidates:__

   ```js
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('ice-candidate', {
         candidate: event.candidate
       });
     }
   };
   ```

__Incoming Events:__

1. __Receive SDP offer:__

   ```js
   socket.on('offer', async (message) => {
     await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
     const answer = await peerConnection.createAnswer();

     // Emit the answer, see "Send SDP answer"
   });
   ```

2. __Receive ICE candidates:__

   ```js
   socket.on('ice-candidate', async (message) => {
     try {
       await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
     } catch (e) {
       console.error('Error adding received ice candidate', e);
     }
   });
   ```

## Conclusion

This README provides a structured approach to understanding and implementing a WebRTC and WebSocket-based chat application. The steps outlined should help in setting up the necessary components and handling the peer-to-peer connections effectively.
