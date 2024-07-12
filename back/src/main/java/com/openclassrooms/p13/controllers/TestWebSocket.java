package com.openclassrooms.p13.controllers;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.openclassrooms.p13.payload.request.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

@Controller
@Slf4j
public class TestWebSocket {

    private final SocketIOServer socketIOServer;

    @Autowired
    public TestWebSocket(SocketIOServer socketIOServer) {
        this.socketIOServer = socketIOServer;
    }

    /**
     * Simulates receiving a WebSocket message and echoing it back.
     *
     * @param message the received chat message
     */
    @OnEvent("test.sendMessage")
    public void sendMessage(SocketIOClient client, ChatMessage message) {
        // Process the message as needed
        log.info("Received message: {}", message.sender());

        // Echo the message back
        socketIOServer.getBroadcastOperations().sendEvent("test.sendMessage", message);
    }
}
