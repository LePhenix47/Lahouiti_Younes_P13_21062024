package com.openclassrooms.p13.configurations;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

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

    // Concurrent set to store usernames of connected users
    private final Set<String> connectedUsers = ConcurrentHashMap.newKeySet();

    @EventListener
    public void onWebSocketConnect(SessionConnectEvent event) {
        log.info("Establishing WebSocket connection...");
    }

    /**
     * Handles the disconnection of a user from the WebSocket session.
     *
     * @param event The SessionDisconnectEvent representing the disconnection event.
     */
    @EventListener
    public void onWebSocketDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        log.info(headerAccessor.getSessionAttributes().toString());

        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username == null) {
            log.debug("✖ On WebSocket Disconnect: User not found for this session");

            return;
        }

        log.info("✔ User : {} has disconnected from chat", username, connectedUsers);
        removeConnectedUser(username); // Remove the username from the connected users set

        var message = new ChatMessage("", username, MessageType.LEAVE);

        messageTemplate.convertAndSend("/topic/public", message);
    }

    /**
     * Adds a connected user to the set of connected users.
     *
     * @param username the username of the connected user
     */
    public void addConnectedUser(String username) {
        connectedUsers.add(username);
    }

    /**
     * Removes a connected user from the set of connected users.
     *
     * @param username the username of the user to be removed
     * @return void
     */
    public void removeConnectedUser(String username) {
        connectedUsers.remove(username);
    }

    /**
     * Returns a set of connected user names.
     *
     * @return a set of strings representing the connected user names
     */
    public Set<String> getConnectedUsers() {
        return connectedUsers;
    }

}
