package com.openclassrooms.p13.controllers;

import java.util.Set;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import com.openclassrooms.p13.payload.request.ChatMessage;
import com.openclassrooms.p13.utils.enums.MessageType;
import com.openclassrooms.p13.configurations.WebSocketEventListener; // Import WebSocketEventListener

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
public class ChatController {

    private final WebSocketEventListener webSocketEventListener;

    public ChatController(WebSocketEventListener webSocketEventListener) {
        this.webSocketEventListener = webSocketEventListener;
    }

    /**
     * Sends a chat message to all subscribers of the "/topic/public" destination.
     *
     * @param message the chat message to be sent
     * @return the sent chat message
     */
    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage message) {
        log.info("New message has been sent : {}", message);

        return message;
    }

    /**
     * Adds a user to the chat and sends the chat message to all subscribers of the
     * "/topic/public" destination along with the list of connected users.
     *
     * @param message        the chat message to be sent
     * @param headerAccessor the accessor for the message headers
     * @return the sent chat message
     */
    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage message, SimpMessageHeaderAccessor headerAccessor) {
        log.info("New user has arrived : {}", message);

        // Retrieve username from the message record
        String username = message.sender();

        // Set username in session attributes
        headerAccessor.getSessionAttributes().put("username", username);

        // Add the user to connected users set
        webSocketEventListener.addConnectedUser(username);

        // Retrieve the current list of connected users
        Set<String> connectedUsers = webSocketEventListener.getConnectedUsers();
        log.info("Connected users: {}", connectedUsers);

        return new ChatMessage("", username, MessageType.JOIN);
    }

}
