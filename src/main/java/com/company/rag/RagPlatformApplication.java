package com.company.rag;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Single modular-monolith entrypoint. Profile-specific packages are scanned from
 * {@code com.company.rag.config} ({@code api} / {@code worker}).
 */
@SpringBootApplication(scanBasePackages = "com.company.rag.config")
public class RagPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(RagPlatformApplication.class, args);
    }
}
