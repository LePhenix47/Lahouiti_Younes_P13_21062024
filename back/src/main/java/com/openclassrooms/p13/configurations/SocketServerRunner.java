package com.openclassrooms.p13.configurations;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.corundumstudio.socketio.SocketIOServer;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

/**
 * Starts and stops the Socket.io server.
 */
@Component
public class SocketServerRunner {

    /**
     * The Socket.Io server
     */
    @Autowired
    private SocketIOServer socketIOServer;

    /**
     * Starts the Socket.Io server.
     */
    @PostConstruct
    public void startSocketIOServer() {
        socketIOServer.start();
        System.out.println("Socket.io server started on port: " + socketIOServer.getConfiguration().getPort());
    }

    /**
     * Stops the Socket.Io server.
     */
    @PreDestroy
    public void stopSocketIOServer() {
        socketIOServer.stop();
        System.out.println("Socket.io server stopped.");
    }
}
