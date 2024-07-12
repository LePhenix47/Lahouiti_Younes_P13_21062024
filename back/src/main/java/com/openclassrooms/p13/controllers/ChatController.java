package com.openclassrooms.p13.controllers;

import java.util.Set;

import org.springframework.stereotype.Controller;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.openclassrooms.p13.payload.request.ChatMessage;
import com.openclassrooms.p13.payload.request.JoinLeaveMessage;
import com.openclassrooms.p13.utils.enums.MessageType;
import com.openclassrooms.p13.configurations.WebSocketEventListener;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
public class ChatController {

    private final WebSocketEventListener webSocketEventListener;

    public ChatController(WebSocketEventListener webSocketEventListener) {
        this.webSocketEventListener = webSocketEventListener;
    }

    /**
     * Handles incoming chat messages and broadcasts them to all clients.
     *
     * @param client  the client sending the message
     * @param message the chat message to be sent
     */
    @OnEvent("chat.sendMessage")
    public void sendMessage(SocketIOClient client, ChatMessage message) {
        log.info("New message has been sent : {}", message);

        // Broadcast the chat message to all connected clients
        client.getNamespace().getBroadcastOperations().sendEvent(MessageType.CHAT.name(), message);
    }

    /**
     * Adds a user to the chat and notifies all clients.
     *
     * @param client  the client sending the message
     * @param message the chat message containing the user's name
     */
    @OnEvent("chat.addUser")
    public void addUser(SocketIOClient client, ChatMessage message) {
        log.info("New user has arrived : {}", message);

        // Retrieve username from the message
        String username = message.sender();
        String sessionId = client.getSessionId().toString();

        // Add the user to the connected users set
        webSocketEventListener.addConnectedUser(sessionId, username);

        // Retrieve the current list of connected users
        Set<String> connectedUsers = webSocketEventListener.getConnectedUsers();
        log.info("Connected users: {}", connectedUsers);

        // Create a join message
        JoinLeaveMessage joinLeaveMessage = new JoinLeaveMessage(username, MessageType.JOIN, connectedUsers);

        // Notify all clients about the new user
        client.getNamespace().getBroadcastOperations().sendEvent(MessageType.JOIN.name(), joinLeaveMessage);
    }
}
