package com.openclassrooms.p13.controllers;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.openclassrooms.p13.configurations.WebSocketEventListener;
import com.openclassrooms.p13.payload.request.SignalMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequiredArgsConstructor
public class SignalingController {
    private final WebSocketEventListener webSocketEventListener;

    /**
     * A message handler for WebRTC signaling messages.
     *
     * @param signalMessage  the SignalMessage object containing the signaling
     *                       message
     * @param headerAccessor the SimpMessageHeaderAccessor for message headers
     */
    @MessageMapping("/webrtc.sdp")
    @SendTo("/signaling")
    public SignalMessage handleWebRTCSignal(@Payload SignalMessage signalMessage,
            SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String username = webSocketEventListener.getUsernameForSession(sessionId);

        log.info("Received WebRTC signaling message from {}: {}", username, signalMessage);

        return signalMessage;
    }
}
