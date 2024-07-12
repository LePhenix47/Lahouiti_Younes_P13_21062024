package com.openclassrooms.p13.configurations;

import org.springframework.beans.factory.annotation.Value;

import com.corundumstudio.socketio.Configuration; // * Import for netty-socket.io
import com.corundumstudio.socketio.SocketIOServer;

@org.springframework.context.annotation.Configuration // * Fully qualified name for Spring Configuration annotation
public class WebSocketConfig {

    @Value("${socket.host}")
    private String host;

    @Value("${socket.port}")
    private int port;

    public SocketIOServer setUpSocketIoServer() throws Exception {
        Configuration socketConfig = new Configuration(); // Using fully qualified name

        socketConfig.setHostname(host);
        socketConfig.setPort(port);
        socketConfig.setOrigin("*");

        return new SocketIOServer(socketConfig);
    }

    // Other methods and configurations
}
