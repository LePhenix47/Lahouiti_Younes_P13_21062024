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

Init peer:
1. GUM
2. create PC (peer connection)
3. add local stream tracks to own PC
4. Create offer + set local desc. wit hit
5. Get local ICE candidate (do not forget GUM or won't work)
6. Send offer + ice candidates to Signaling server in separate socket events

## Conclusion

This README provides a structured approach to understanding and implementing a WebRTC and WebSocket-based chat application. The steps outlined should help in setting up the necessary components and handling the peer-to-peer connections effectively.