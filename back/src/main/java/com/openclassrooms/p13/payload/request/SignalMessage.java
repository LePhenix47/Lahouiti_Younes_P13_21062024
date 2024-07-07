package com.openclassrooms.p13.payload.request;

import java.util.Set;

public record SignalMessage(
                String type,
                String fromUsername,
                String sdp,
                Set<String> toUsernames) {
}
