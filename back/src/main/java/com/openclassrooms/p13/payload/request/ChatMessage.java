package com.openclassrooms.p13.payload.request;

import com.openclassrooms.p13.utils.enums.MessageType;

public record ChatMessage(
                String message,
                String sender,
                MessageType type) {
}
