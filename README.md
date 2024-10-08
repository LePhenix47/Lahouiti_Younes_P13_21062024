# P13: Your car your way WebSockets and WebRTC Proof of Concept (PoC)

<img src="./front/src/assets/png/your-car-your-way-logo.png" alt="Your Car Your Way logo" width="327" height="200" style="object-fit: contain" />

### Description

This Proof of Concept (PoC) demonstrates the feasibility of real-time communication through an online chat and video-conference service, leveraging [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) and [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) technologies.
The PoC aims to validate our proposal by showcasing a seamless exchange between users and customer service representatives, ensuring a robust and interactive user experience.

### Why WebSockets & WebRTC?

WebSockets enable persistent, bidirectional communication between the client and server, allowing for instant message delivery and low-latency interactions.
WebRTC facilitates peer-to-peer connections for audio, video, and data sharing, ensuring high-quality real-time communication without the need for intermediary servers.
By developing this PoC, we aim to reassure stakeholders of the viability and effectiveness of our proposed online chat functionality.

## Table of contents

- [P13: Your car your way WebSockets and WebRTC Proof of Concept (PoC)](#p13-your-car-your-way-websockets-and-webrtc-proof-of-concept-poc)
    - [Description](#description)
    - [Why WebSockets \& WebRTC?](#why-websockets--webrtc)
  - [Table of contents](#table-of-contents)
  - [Tech stack for the PoC](#tech-stack-for-the-poc)
    - [Front-End](#front-end)
    - [Back-End](#back-end)
  - [Pre-requisites](#pre-requisites)
    - [Node.js](#nodejs)
  - [Configuration](#configuration)
    - [Node.js](#nodejs-1)
  - [Installation procedure](#installation-procedure)
    - [Front-End](#front-end-1)
    - [Back-End](#back-end-1)
  - [Features and Limitations](#features-and-limitations)
    - [Features](#features)
    - [Limitations](#limitations)
  - [WebRTC glossary](#webrtc-glossary)
  - [WebRTC Peer-to-Peer Connection Setup](#webrtc-peer-to-peer-connection-setup)
    - [Get User Media (G.U.M.)](#get-user-media-gum)
    - [Create Peer Connection](#create-peer-connection)
    - [Add Local Tracks to the Connection](#add-local-tracks-to-the-connection)
    - [Add Event Listeners to Peer Connection](#add-event-listeners-to-peer-connection)
    - [ICE Candidate Event](#ice-candidate-event)
    - [ICE Candidate WebSocket Response](#ice-candidate-websocket-response)
    - [Sender (offerer)](#sender-offerer)
      - [User Wants to Initiate Call](#user-wants-to-initiate-call)
      - [Set Remote Description (Answer)](#set-remote-description-answer)
    - [Receiver (answerer)](#receiver-answerer)
      - [Set Remote Description (Offer)](#set-remote-description-offer)
      - [Create Answer and Set Local Description](#create-answer-and-set-local-description)
    - [On Track Event](#on-track-event)
    - [On Negotiation Needed Event](#on-negotiation-needed-event)
      - [Frontend (FE)](#frontend-fe)
      - [Backend (BE)](#backend-be)
        - [Initiating Peer](#initiating-peer)
        - [Receiving Peer](#receiving-peer)
  - [Miscellaneous](#miscellaneous)
    - [](#)
  - [Conclusion](#conclusion)

## Tech stack for the PoC

### Front-End

- HTML
- SASS
- TypeScript
- Angular 18

<a href="https://developer.mozilla.org/en-US/docs/Glossary/HTML5" target="_blank" rel="noreferrer" title="HTML5">
  <img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/html5-colored.svg" width="36" height="36" alt="HTML5 logo" />
</a>
<a href="https://sass-lang.com/" target="_blank" rel="noreferrer" title="SASS">
  <img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/sass-colored.svg" width="36" height="36" alt="SASS logo" />
</a>
<a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer" title="TypeScript">
  <img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/typescript-colored.svg" width="36" height="36" alt="TypeScript logo" />
</a>
<a href="https://angular.dev/" target="_blank" rel="noreferrer" title="Angular">
  <img src="https://miro.medium.com/v2/resize:fit:1400/1*Klh1l7wkoG6PDPb9A5oCHQ.png" width="44" height="40" alt="Angular logo" />
</a>

### Back-End

- Node.js 20.11.0
- ExpressJS 4.19.2 (for HTTP requests in this PoC to save time. Our Architecture Definition and Compliance docs specify Java + Spring Boot for production)
- Socket.io 4.7.5

<a href="https://nodejs.org/en/" target="_blank" rel="noreferrer" title="NodeJS">
  <img src="https://raw.githubusercontent.com/danielcranney/readme-generator/main/public/icons/skills/nodejs-colored.svg" width="36" height="36" alt="NodeJS logo" />
</a>
<a href="https://expressjs.com/" target="_blank" rel="noreferrer" title="ExpressJS">
  <img src="https://github.com/devicons/devicon/raw/master/icons/express/express-original.svg" width="36" height="36" alt="ExpressJS logo" />
</a>
<a href="https://socket.io/" target="_blank" rel="noreferrer" title="Socket.io">
  <img src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fseeklogo.com%2Fimages%2FS%2Fsocketio-logo-B8A7F486CD-seeklogo.com.png&f=1&nofb=1&ipt=8f8f25aa212c981213621e2b5e8c7808bc1201c5e1023b64f8de586e341109d5&ipo=images" width="36" height="36" alt="Socket.io logo" />
</a>

## Pre-requisites

### Node.js

Install [Node.js LTS](https://nodejs.org/en) to install dependencies and run both the Front-End and Back-End servers.

## Configuration  

### Node.js

The project requires Node.js version 20.11.0

You can install Node.js also using the [node version manager (nvm)](https://github.com/coreybutler/nvm-windows), after clicking on the latest release and installing the  `nvm-setup.exe` file, you can upgrade or downgrade node version using the `nvm` commands

Here's the steps:

1. Check the list of node versions installed:

    ```shell
    nvm ls

    # Output example:
    # * 16.15.0 (Currently using 64-bit executable)
    ```

2. Install the node version to upgrade/downgrade to:

    ```shell
      nvm install 20.11.0
    ```

3. Use the freshly installed version:

    ```shell
      nvm ls
      # 20.11.0
      # * 16.13.1 (Currently using 64-bit executable)

      nvm use 20.11.0
      # Now using node v20.11.0 (64-bit)
    ```

**In case it doesn't work:**

Go to the `nodejs/` folder and slightly rename it, then re-execute `nvm use 20.11.0`

## Installation procedure

**Cloning the project:**
To clone this repository from GitHub, run the following command: `git clone https://github.com/LePhenix47/Lahouiti_Younes_P13_21062024 .`

### Front-End

1. Install the dependencies:

To start the Angular Front-End project, follow these steps:

- Navigate to the Front-End directory in your terminal:

```shell
cd front
```

- Install project dependencies using npm:

```shell
npm install
```

2. Starting the server

- After the dependencies are installed, you can start the development server by running:

```shell
npm run dev-https

```

**Note:** This project is compatible with other JS runtimes such as [Bun](https://bun.sh/docs). If you use one, you can simply run `bun dev-https` to start the server.

This command will compile the Angular application and start a development server in HTTPS (WebRTC requires a secure context to function correctly).
You can then access the application in your browser at `https://localhost:4200`.

### Back-End

1. Install the dependencies and configure `.env` file:

To start the NodeJS Back-End project, follow these steps:

- Navigate to the Back-End directory in your terminal:

```shell
cd back
```

- Install project dependencies using npm:

```shell
npm install
```

- Once the dependencies installed you'll need to create a `.env` file, with contents similar to the [`.env.sample` file](./back/.env.example):

```env
# Any random address is accepted
LOCAL_IP=
```

2. Starting the server

- After the dependencies are installed, you can start the development server by running:

```shell
npm start

# If you use the Bun JS runtime you can also use `bun start`
```

**Note:** This project is also compatible with alternative JS runtimes like [Bun](https://bun.sh/docs), in which case you can start the server with `bun start`.

This command will start the NodeJS development server.
You can then access the API with: `https://localhost:3000`.

## Features and Limitations

### Features

This PoC includes the following features:

- **Chat via WebSockets:** A real-time chat system built using WebSockets, allowing instant communication between users.

- **Video Conferencing with WebRTC:** Peer-to-peer video conferencing implemented using WebRTC, enabling direct audio and video communication.

- **Device Switching and Screen Sharing:** WebRTC-based functionality to switch between different input devices (e.g., cameras, microphones) and the ability to share your screen.

- **Screen Recording:** Ability to record your screen, with options to preview the current recording, view a list of all recordings, and access detailed information (duration and size) and download buttons for each recording

### Limitations

The PoC has some known limitations:

- **Lack of Loading Status and Connection Feedback:** There is no loading status displayed during local media switching or connection feedback during the WebRTC session, which may leave users uncertain about the connection status.

- **Potential Memory Leak During Screen Recording:** Starting a screen recording and then sharing the screen can cause a memory leak, potentially leading to performance issues.

- **Buggy Room Handling:** The room management system has a few bugs as well.

## WebRTC glossary

Understanding the key terms and components in WebRTC is crucial for working with this PoC:

<details>
  <summary>🗺️ <abbr title="Network Address Translation">NAT</abbr></summary>
  <dl>
    <dt>Network Address Translation (NAT):</dt>
    <dd>NAT is a method used to remap one IP address space into another. It allows multiple devices on a local area network (LAN) to share a single public IP address. This enables private IP addresses (used within the LAN) to be translated into a public IP address, facilitating access to the internet while also providing a level of security by hiding internal network addresses.</dd>
  </dl>
</details>

<details>
  <summary>🔄 <abbr title="Session Traversal Utilities for NAT">STUN</abbr></summary>
  <dl>
    <dt>Session Traversal Utilities for NAT (STUN):</dt>
    <dd>STUN is used to discover the public IP address and port assigned to a device behind a NAT. This information is crucial for ICE candidates to establish a peer-to-peer connection, allowing devices to communicate directly over the internet.</dd>
  </dl>
</details>

<details>
  <summary>🔄 <abbr title="Traversal Using Relays around NAT">TURN</abbr></summary>
  <dl>
    <dt>Traversal Using Relays around NAT (TURN):</dt>
    <dd>TURN is employed when a direct peer-to-peer connection fails, often due to firewalls or restrictive NAT configurations. It relays media traffic through a server to ensure connectivity between peers, acting as a backup when direct communication is not possible.</dd>
  </dl>
</details>

<details>
  <summary>❄️ <abbr title="Interactive Connectivity Establishment">ICE</abbr></summary>
  <dl>
    <dt>Interactive Connectivity Establishment (ICE):</dt>
    <dd>ICE is a framework designed to establish peer-to-peer connections by gathering multiple connection candidates (possible network paths) and testing their reachability. These candidates provide information such as IP addresses and ports, representing different network interfaces (e.g., local network, public IP). ICE works in conjunction with <abbr title="Session Traversal Utilities for NAT">STUN</abbr> servers to discover the public IP address of a peer, and <abbr title="Traversal Using Relays around NAT">TURN</abbr> servers to relay data if direct connections fail. The framework resolves issues like Network Address Translation (NAT) traversal, dynamic IP addressing, and VPN usage, ensuring a reliable and efficient connection for media or data exchange between peers.</dd>
  </dl>
</details>

<details>
  <summary>📜 <abbr title="Session Description Protocol">SDP</abbr></summary>
  <dl>
    <dt>Session Description Protocol (SDP):</dt>
    <dd>SDP is a format used to describe multimedia communication sessions. It provides essential information about the media types, codecs, and connection details required for peers to establish a communication session.</dd>
  </dl>
</details>

<details>
  <summary>🎥 Audio-video <abbr title="Peer-to-Peer">P2P</abbr></summary>
  <dl>
    <dt>Audio-video Peer-to-Peer (P2P):</dt>
    <dd>P2P communication allows two devices to connect directly to each other for streaming audio and video, bypassing the need for a central server. This enhances performance by reducing latency and improving bandwidth utilization.</dd>
  </dl>
</details>

<details>
  <summary>📡 <abbr title="Transmission Control Protocol">TCP</abbr></summary>
  <dl>
    <dt>Transmission Control Protocol (TCP):</dt>
    <dd>TCP is a protocol that ensures reliable data transmission and cares about data integrity. It establishes a connection and guarantees that packets are delivered in the correct order, are aligned, and are error-free. This makes TCP suitable for applications where data accuracy is essential, such as HTTP and WebSockets.</dd>
  </dl>
</details>

<details>
  <summary>📡 <abbr title="User Datagram Protocol">UDP</abbr></summary>
  <dl>
    <dt>User Datagram Protocol (UDP):</dt>
    <dd>UDP is a protocol for data transmission that prioritizes speed and low latency, making it ideal for real-time communications like audio and video streams, where quick delivery is prioritized over reliability. It does not guarantee packet order or integrity, allowing some packets to be lost or arrive out of sequence. Although, this enables continuous session flow despite network issues, ensuring that the most recent packets are processed to maintain synchronization, especially in unstable Wi-Fi environments.</dd>
  </dl>
</details>

<details>
  <summary>🔗 Websockets</summary>
  <dl>
    <dt>Websockets:</dt>
    <dd>A protocol that enables two-way communication between a client and a server over a single, long-lived connection. This allows for real-time data exchange and is particularly useful in applications requiring frequent updates, such as chat applications or live notifications.</dd>
  </dl>
</details>

<details>
  <summary>📞 Signaling path</summary>
  <dl>
    <dt>Signaling Path:</dt>
    <dd>The signaling path refers to the process of establishing, maintaining, and terminating a connection between peers. It involves the exchange of messages that help peers discover each other, negotiate connection parameters, and handle disconnections. It can be an HTTP request or a WebSockets one</dd>
  </dl>
</details>

<details>
  <summary>🖥️ Signaling server</summary>
  <dl>
    <dt>Signaling Server:</dt>
    <dd>A signaling server facilitates the establishment of connections between peers by exchanging signaling messages, which include offers, answers, and ICE candidates. While both HTTP and WebSockets can be used for signaling, WebSockets are preferred due to their support for real-time communication and lower latency.</dd>
  </dl>
</details>

## WebRTC Peer-to-Peer Connection Setup

This document outlines the process of setting up a peer-to-peer connection using WebRTC. The flow includes steps for both the sender and the receiver of the connection.

### Get User Media (G.U.M.)

Use `getUserMedia()` to access the user's camera and microphone, and `getDisplayMedia()` to access the user's screen.

```js
const ls1 = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); // User's webcam and microphone
const ls2 = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false  }); // User's screen
```

### Create Peer Connection

Create an `RTCPeerConnection` object.

```js
const pc = new RTCPeerConnection(stunTurnConfig);
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

### Sender (offerer)

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

### Receiver (answerer)

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

**Outgoing Events:**

1. **Send SDP offer:**

   ```js
   socket.emit('offer', {
     type: 'offer',
     sdp: peerConnection.localDescription
   });
   ```

2. **Send ICE candidates:**

   ```js
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('ice-candidate', {
         candidate: event.candidate
       });
     }
   };
   ```

**Incoming Events:**

1. **Receive SDP answer:**

   ```js
   socket.on('answer', async (message) => {
     await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
   });
   ```

2. **Receive ICE candidates:**

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

**Outgoing Events:**

1. **Send SDP answer:**

   ```js
   socket.emit('answer', {
     type: 'answer',
     sdp: peerConnection.localDescription
   });
   ```

2. **Send ICE candidates:**

   ```js
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.emit('ice-candidate', {
         candidate: event.candidate
       });
     }
   };
   ```

**Incoming Events:**

1. **Receive SDP offer:**

   ```js
   socket.on('offer', async (message) => {
     await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
     const answer = await peerConnection.createAnswer();

     // Emit the answer, see "Send SDP answer"
   });
   ```

2. **Receive ICE candidates:**

   ```js
   socket.on('ice-candidate', async (message) => {
     try {
       await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
     } catch (e) {
       console.error('Error adding received ice candidate', e);
     }
   });
   ```

## Miscellaneous

<details>
  <summary>💻 WebRTC flow chart</summary>

<img src="https://private-user-images.githubusercontent.com/78600723/358182094-8117e3d7-780c-4d00-8505-41ec0aad2527.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MjU3ODczNTgsIm5iZiI6MTcyNTc4NzA1OCwicGF0aCI6Ii83ODYwMDcyMy8zNTgxODIwOTQtODExN2UzZDctNzgwYy00ZDAwLTg1MDUtNDFlYzBhYWQyNTI3LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDA5MDglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQwOTA4VDA5MTczOFomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTI5OGE5YTdjMmZkMjMxYmQ5ZmU4MDMyYTNkN2U0NTkzZjM4Yzc0OGJlZWVkMDBhY2U0ZDVmMjk5YjI2MTI0MTQmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JmFjdG9yX2lkPTAma2V5X2lkPTAmcmVwb19pZD0wIn0.4E6-jqEvSm11MiFr8E1jz8QX0AkNLmUCyK8GlXKtR_I" alt="WebRTC flow chart" height="500" style="object-fit: contain" />

[View discussion here](https://github.com/LePhenix47/Lahouiti_Younes_P13_21062024/discussions/12)
</details>

<details>
  <summary>🛠️ Back-End Stack Explanation</summary>

###

<strong>Why Node.js was chosen for the Back-End instead of Java with Spring Boot</strong>

1. **Outdated and Complex Libraries**: Using Spring Boot's WebSocket dependencies through Spring Initializer would require [StompJS](https://github.com/stomp-js/stompjs) and [SockJS](https://github.com/sockjs/sockjs-client). While the lack of updates since 2021 makes these libraries difficult to work with on the Back-End, the real annoyance lies in the Front-End. Integrating these libraries on the Front-End is complex and cumbersome. Additionally, this stack does not support sending binary data, and its features are limited compared to modern libraries like [Socket.io](https://github.com/socketio/socket.io).

2. **Socket.io with Spring Boot**: While there is a [Socket.io](https://github.com/socketio/socket.io) implementation for Spring Boot ([Netty-Socket.io](https://github.com/mrniko/netty-socketio)), it comes with a major drawback: the library has had no documentation at all, and that since 2012. This forces reliance on third-party articles and YouTube tutorials, which often lead to configuration issues. Despite attempting to configure it myself, I encountered persistent problems.

Given these challenges, Node.js was chosen for WebSocket implementation due to its robust ecosystem and active support.

</details>

<details>
  <summary>🔍 Debugging WebRTC Connections</summary>
  To effectively debug WebRTC connections, instead of relying on manual console logs, you can use the built-in debugging tool available at: <code>chrome://webrtc-internals/</code>. This tool provides detailed insights into the WebRTC connection, including ICE candidates, connection state, and media stream statistics, helping you diagnose issues more efficiently.
</details>

## Conclusion

This Proof of Concept (PoC) for "Your Car Your Way" successfully demonstrates the capabilities of WebSockets and WebRTC for real-time communication in an online chat and video-conference environment. Through the seamless integration of these technologies, we've showcased the potential to deliver an interactive, high-quality user experience that meets the expectations of modern digital communication.

The PoC validates the feasibility of implementing such technologies in a production environment, offering insights into both the advantages and challenges encountered during development. While the PoC highlights the robustness of WebSockets for instant messaging and WebRTC for video conferencing, it also sheds light on areas that require further refinement, such as connection feedback, memory management, and room handling.

By using Node.js for the Back-End and Angular for the Front-End, we were able to create a responsive and scalable architecture that aligns with current industry standards. The choice of these technologies also provided flexibility and ease of development, making this PoC not only a demonstration of the proposed solution but also a foundation for future enhancements.

In conclusion, this PoC serves as a strong foundation for the next stages of development, offering stakeholders a clear vision of the technical viability and user experience that can be expected in the final implementation. With further iteration and optimization, this approach has the potential to revolutionize how customers and service representatives interact in real-time, delivering a more personalized and efficient service experience.
