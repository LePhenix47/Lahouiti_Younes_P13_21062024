package com.openclassrooms.p13.configurations;

import org.springframework.context.annotation.Bean;

import com.corundumstudio.socketio.Configuration; // * Import for netty-socket.io
import com.corundumstudio.socketio.SocketIOServer;

import lombok.extern.slf4j.Slf4j;

@org.springframework.context.annotation.Configuration // * Fully qualified name for Spring Configuration annotation
@Slf4j
public class WebSocketConfig {

    private String host = "0.0.0.0";

    private int port = 3002;

    @Bean
    SocketIOServer setUpSocketIoServer() throws Exception {

        Configuration socketConfig = new Configuration();

        socketConfig.setHostname(host);
        socketConfig.setPort(port);
        socketConfig.setOrigin("*");
        log.info("WebSocketConfig setUpSocketIoServer {}", socketConfig.getSocketConfig());

        return new SocketIOServer(socketConfig);
    }

    // Other methods and configurations
}
