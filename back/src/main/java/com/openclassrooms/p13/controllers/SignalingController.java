package com.openclassrooms.p13.controllers;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import com.openclassrooms.p13.configurations.WebSocketEventListener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequiredArgsConstructor
public class SignalingController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final WebSocketEventListener webSocketEventListener;

    @MessageMapping("/signal")
    public void handleSignal(@Payload String signalMessage,
            SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String username = webSocketEventListener.getUsernameForSession(sessionId);

        log.info("Received signaling message from {}: {}", username, signalMessage);
        // Here you should add logic to determine the appropriate recipient and route
        // the message.
        messagingTemplate.convertAndSend("/topic/signal", signalMessage);
    }
}
