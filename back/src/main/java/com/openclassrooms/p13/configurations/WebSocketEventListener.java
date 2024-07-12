package com.openclassrooms.p13.configurations;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import com.openclassrooms.p13.payload.request.JoinLeaveMessage;
import com.openclassrooms.p13.utils.enums.MessageType;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class WebSocketEventListener {

    private final SocketIOServer socketIOServer;

    // Concurrent set to store usernames of connected users
    /**
     * A concurrent set to store usernames of connected users.
     * It uses {@link ConcurrentHashMap#newKeySet()} to create a thread-safe set.
     */
    private final Set<String> connectedUsers = ConcurrentHashMap.newKeySet();

    // Map to store WebSocket session ID to username mapping
    /**
     * A map to store WebSocket session ID to username mapping.
     * It uses {@link ConcurrentHashMap} to provide thread-safe access to the map.
     */
    private final Map<String, String> sessionUsernameMap = new ConcurrentHashMap<>();

    public WebSocketEventListener(SocketIOServer socketIOServer) {
        this.socketIOServer = socketIOServer;

        this.addEventListeners();

        this.socketIOServer.start();
    }

    public void addEventListeners() {
        socketIOServer.addConnectListener(this::onSocketIOConnect);
        socketIOServer.addDisconnectListener(this::onSocketIODisconnect);
    }

    /**
     * Handles the event when a WebSocket connection is established.
     *
     * @param client The SocketIOClient representing the connection event.
     */
    @OnConnect
    public void onSocketIOConnect(SocketIOClient client) {
        log.info("Establishing WebSocket connection...");
        // Add logic to handle connection establishment if needed
    }

    /**
     * Handles the disconnection of a user from the WebSocket session.
     *
     * @param client The SocketIOClient representing the disconnection event.
     */
    @OnDisconnect
    public void onSocketIODisconnect(SocketIOClient client) {
        log.info("Disconnecting from WebSocket session...");

        String sessionId = client.getSessionId().toString();
        String username = sessionUsernameMap.get(sessionId);

        if (username == null) {
            log.debug("✖ On WebSocket Disconnect: User not found for this session");
            return;
        }

        log.info("✔ User : {} has disconnected from chat", username);
        removeConnectedUser(sessionId, username); // Remove the username from the connected users set

        var message = new JoinLeaveMessage(username, MessageType.LEAVE, connectedUsers);

        // Broadcast the message to all connected clients
        socketIOServer.getBroadcastOperations().sendEvent(MessageType.LEAVE.name(), message);
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
