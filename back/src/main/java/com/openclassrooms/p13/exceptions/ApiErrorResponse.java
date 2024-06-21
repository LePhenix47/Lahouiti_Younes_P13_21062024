package com.openclassrooms.p13.exceptions;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;

public record ApiErrorResponse(String message, List<String> errors, HttpStatus httpStatus,
        LocalDateTime date) {
}