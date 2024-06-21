package com.openclassrooms.p13.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openclassrooms.p13.exceptions.ApiException;
import com.openclassrooms.p13.exceptions.GlobalExceptionHandler;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/test")
public class TestController {

    /**
     * Registers a new user.
     *
     * @param request The registration request containing user details.
     * @return ResponseEntity<AuthResponse> A JWT if registration is successful.
     */
    @GetMapping()
    public ResponseEntity<Object> sendTest() {
        try {
            return ResponseEntity.status(HttpStatus.OK).body("Spring Boot API works !");
        } catch (ApiException e) {
            return GlobalExceptionHandler.handleApiException(e);
        }
    }
}
