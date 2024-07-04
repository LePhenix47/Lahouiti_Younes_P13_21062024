package com.openclassrooms.p13.payload.request;

import java.util.Set;

import com.openclassrooms.p13.utils.enums.MessageType;

public record JoinLeaveMessage(
        String sender,
        MessageType type,
        Set<String> users) {
}