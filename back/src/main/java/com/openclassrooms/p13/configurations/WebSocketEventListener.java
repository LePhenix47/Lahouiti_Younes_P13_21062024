package com.openclassrooms.p13.configurations;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.openclassrooms.p13.payload.request.JoinLeaveMessage;
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

    // Map to store WebSocket session ID to username mapping
    private final Map<String, String> sessionUsernameMap = new ConcurrentHashMap<>();

    /**
     * Handles the event when a WebSocket connection is established.
     *
     * @param event The SessionConnectEvent representing the connection event.
     */
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
        String sessionId = headerAccessor.getSessionId();

        if (username == null) {
            log.debug("✖ On WebSocket Disconnect: User not found for this session");

            return;
        }

        log.info("✔ User : {} has disconnected from chat", sessionId, username, connectedUsers);
        removeConnectedUser(sessionId, username); // Remove the username from the connected users set

        var message = new JoinLeaveMessage(username, MessageType.JOIN, connectedUsers);

        messageTemplate.convertAndSend("/topic/public", message);
    }

    /**
     * Adds a connected user to the set of connected users.
     *
     * @param sessionId the session ID of the WebSocket session
     * @param username  the username of the connected user
     */
    public void addConnectedUser(String sessionId, String username) {
        connectedUsers.add(username);
        sessionUsernameMap.put(sessionId, username);
    }

    /**
     * Removes a connected user from the set of connected users.
     *
     * @param sessionId the session ID of the WebSocket session
     * @param username  the username of the user to be removed
     */
    public void removeConnectedUser(String sessionId, String username) {
        connectedUsers.remove(username);
        sessionUsernameMap.remove(sessionId);
    }

    /**
     * Returns a set of connected user names.
     *
     * @return a set of strings representing the connected user names
     */
    public Set<String> getConnectedUsers() {
        return connectedUsers;
    }

    /**
     * Retrieves the username associated with the provided session ID from the
     * sessionUsernameMap.
     *
     * @param sessionId the session ID for which to retrieve the username
     * @return the username associated with the provided session ID
     */
    public String getUsernameForSession(String sessionId) {
        return sessionUsernameMap.get(sessionId);
    }

}
