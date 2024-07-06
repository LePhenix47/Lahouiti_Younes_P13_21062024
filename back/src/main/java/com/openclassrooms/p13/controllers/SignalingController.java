package com.openclassrooms.p13.controllers;

import java.util.Set;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import com.openclassrooms.p13.configurations.WebSocketEventListener;
import com.openclassrooms.p13.payload.request.SignalMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequiredArgsConstructor
public class SignalingController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final WebSocketEventListener webSocketEventListener;

    /**
     * A message handler for signaling messages.
     *
     * @param signalMessage  the SignalMessage object containing the signaling
     *                       message
     * @param headerAccessor the SimpMessageHeaderAccessor for message headers
     */
    @MessageMapping("/signal")
    public void handleSignal(@Payload SignalMessage signalMessage,
            SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        String username = webSocketEventListener.getUsernameForSession(sessionId);

        log.info("Received signaling message from {}: {}", username, signalMessage);

        Set<String> toUsernames = signalMessage.toUsernames();

        // Remove the sender's username from the list of recipients
        toUsernames.remove(username);

        // Send the message to each recipient
        for (String recipient : toUsernames) {
            // Example: Send message to each recipient's personal signaling topic
            messagingTemplate.convertAndSendToUser(recipient, "/topic/signal", signalMessage);
        }
    }

}