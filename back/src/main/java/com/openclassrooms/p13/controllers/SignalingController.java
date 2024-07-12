package com.openclassrooms.p13.controllers;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Controller;

import com.corundumstudio.socketio.AckRequest;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.annotation.OnEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequiredArgsConstructor
public class SignalingController {

    private final Map<String, String> users = new ConcurrentHashMap<>();
    private final Map<String, String> rooms = new ConcurrentHashMap<>();

    /**
     * Handles joining a WebRTC room.
     *
     * @param client the client attempting to join the room
     * @param room   the room the client wants to join
     */
    @OnEvent("joinRoom")
    public void onJoinRoom(SocketIOClient client, String room) {
        int connectedClients = client.getNamespace().getRoomOperations(room).getClients().size();
        String clientId = client.getSessionId().toString();

        if (connectedClients == 0) {
            client.joinRoom(room);
            client.sendEvent("created", room);
            users.put(clientId, room);
            rooms.put(room, clientId);
        } else if (connectedClients == 1) {
            client.joinRoom(room);
            client.sendEvent("joined", room);
            users.put(clientId, room);
            client.sendEvent("setCaller", rooms.get(room));
        } else {
            client.sendEvent("full", room);
        }
        printLog("onJoinRoom", client, room);
    }

    /**
     * Handles a client being ready for WebRTC.
     *
     * @param client     the client that is ready
     * @param room       the room the client is ready for
     * @param ackRequest the acknowledgment request
     */
    @OnEvent("ready")
    public void onReady(SocketIOClient client, String room, AckRequest ackRequest) {
        client.getNamespace().getRoomOperations(room).sendEvent("ready", room);
        printLog("onReady", client, room);
    }

    /**
     * Handles receiving a WebRTC candidate.
     *
     * @param client  the client sending the candidate
     * @param payload the payload containing the candidate
     */
    @OnEvent("candidate")
    public void onCandidate(SocketIOClient client, Map<String, Object> payload) {
        String room = (String) payload.get("room");
        client.getNamespace().getRoomOperations(room).sendEvent("candidate", payload);
        printLog("onCandidate", client, room);
    }

    /**
     * Handles receiving a WebRTC offer.
     *
     * @param client  the client sending the offer
     * @param payload the payload containing the offer
     */
    @OnEvent("offer")
    public void onOffer(SocketIOClient client, Map<String, Object> payload) {
        String room = (String) payload.get("room");
        Object sdp = payload.get("sdp");
        client.getNamespace().getRoomOperations(room).sendEvent("offer", sdp);
        printLog("onOffer", client, room);
    }

    /**
     * Handles receiving a WebRTC answer.
     *
     * @param client  the client sending the answer
     * @param payload the payload containing the answer
     */
    @OnEvent("answer")
    public void onAnswer(SocketIOClient client, Map<String, Object> payload) {
        String room = (String) payload.get("room");
        Object sdp = payload.get("sdp");
        client.getNamespace().getRoomOperations(room).sendEvent("answer", sdp);
        printLog("onAnswer", client, room);
    }

    /**
     * Handles a client leaving a WebRTC room.
     *
     * @param client the client leaving the room
     * @param room   the room the client is leaving
     */
    @OnEvent("leaveRoom")
    public void onLeaveRoom(SocketIOClient client, String room) {
        client.leaveRoom(room);
        printLog("onLeaveRoom", client, room);
    }

    /**
     * Logs information about WebRTC events.
     *
     * @param header the event header
     * @param client the client involved in the event
     * @param room   the room involved in the event
     */
    private static void printLog(String header, SocketIOClient client, String room) {
        if (room == null)
            return;
        int size = 0;
        try {
            size = client.getNamespace().getRoomOperations(room).getClients().size();
        } catch (Exception e) {
            log.error("Error ", e);
        }
        log.info("#ConnectedClients - {} => room: {}, count: {}", header, room, size);
    }
}
