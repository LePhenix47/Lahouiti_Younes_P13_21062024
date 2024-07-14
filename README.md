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

### Initiating Peer

1. Get User Media (G.U.M.):
Use `navigator.mediaDevices.getUserMedia` to get local media stream.

```ts
    const localStream: MediaStream =
        await navigator.mediaDevices.getUserMedia({
          audio,
          video,
        });
```

2. Create RTCPeerConnection with STUN-TURN servers:  

```ts
const peerConnection = new RTCPeerConnection(stunTurnConfig);
 ```

3. Add local stream tracks to that connection:

```ts
 localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream)); 
```

4. Listen to onicecandidate and onsignalingstatechange events:
Send the ICE candidates via WebSocket as they are generated.

```ts
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    // Send ICE candidate via WebSocket
  }
};
```

5. Create offer and set the local description:

```ts
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
```

6. Send the offer (SDP + type) to the receiving peer via WebSocket.

### Signaling Server

Incoming from Initiating Peer:
SDP + type
ICE candidates
Outgoing Broadcast to Receiving Peer:
SDP + type
ICE candidates

### Receiving Peer

Create RTCPeerConnection with STUN-TURN servers:

```ts
const peerConnection = new RTCPeerConnection(stunTurnConfig);
```

Set remote SDP offer from WebSocket:

```ts
await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
```

Listen for incoming ICE candidates via WebSocket and add them to the peer connection:

```ts
peerConnection.onicecandidate = (event) => {
  if (!event.candidate) {
     return
  }
    // Send ICE candidate via WebSocket
  await peerConnection.addIceCandidate(event.candidate);
};
```

Create answer and set the local description:

```ts
const answer = await peerConnection.createAnswer();
await peerConnection.setLocalDescription(answer);
```

Send the answer (SDP + type) and ICE candidates to the initiating peer via WebSocket.
Handle incoming media streams:

```ts
peerConnection.ontrack = (event) => {
  // Attach event.streams[0] to a media element
};
```

### WebSocket Events

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
   \`\`\`javascript
   socket.emit('offer', {
     type: 'offer',
     sdp: peerConnection.localDescription
   });
   \`\`\`

2. __Send ICE candidates:__
   \`\`\`javascript
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('ice-candidate', {
         candidate: event.candidate
       });
     }
   };
   \`\`\`

__Incoming Events:__

1. __Receive SDP answer:__
   \`\`\`javascript
   socket.on('answer', async (message) => {
     await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
   });
   \`\`\`

2. __Receive ICE candidates:__
   \`\`\`javascript
   socket.on('ice-candidate', async (message) => {
     try {
       await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
     } catch (e) {
       console.error('Error adding received ice candidate', e);
     }
   });
   \`\`\`

##### Receiving Peer

__Outgoing Events:__

1. __Send SDP answer:__
   \`\`\`javascript
   socket.emit('answer', {
     type: 'answer',
     sdp: peerConnection.localDescription
   });
   \`\`\`

2. __Send ICE candidates:__
   \`\`\`javascript
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('ice-candidate', {
         candidate: event.candidate
       });
     }
   };
   \`\`\`

__Incoming Events:__

1. __Receive SDP offer:__
   \`\`\`javascript
   socket.on('offer', async (message) => {
     await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
     const answer = await peerConnection.createAnswer();
   });
   \`\`\`

2. __Receive ICE candidates:__
   \`\`\`javascript
   socket.on('ice-candidate', async (message) => {
     try {
       await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
     } catch (e) {
       console.error('Error adding received ice candidate', e);
     }
   });
   \`\`\`

## Conclusion

This README provides a structured approach to understanding and implementing a WebRTC and WebSocket-based chat application. The steps outlined should help in setting up the necessary components and handling the peer-to-peer connections effectively.
