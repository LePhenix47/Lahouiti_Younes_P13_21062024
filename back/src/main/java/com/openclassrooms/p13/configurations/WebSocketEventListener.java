package com.openclassrooms.p13.configurations;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.openclassrooms.p13.payload.request.ChatMessage;
import com.openclassrooms.p13.utils.enums.MessageType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messageTemplate;

    @EventListener
    public void onWebSocketConnect(SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        log.info(headerAccessor.getSessionAttributes().toString());

        if (username == null) {
            log.info("On WebSocket Connect, user not found for this session for username : " + username);
        } else {
            log.info("User : {}" + username + "has connected to chat");
        }

        var message = new ChatMessage("", username, MessageType.JOIN);

        messageTemplate.convertAndSend("/topic/public", message);
    }

    @EventListener
    public void onWebSocketDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        log.info(headerAccessor.getSessionAttributes().toString());

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) {
            log.debug("On WebSocket Disconnect: " + "User not found for this session for username : " + username);
        } else {
            log.info("User : {}" + username + "has disconnected from chat");
        }

        var message = new ChatMessage("", username, MessageType.LEAVE);

        messageTemplate.convertAndSend("/topic/public", message);
    }

}
