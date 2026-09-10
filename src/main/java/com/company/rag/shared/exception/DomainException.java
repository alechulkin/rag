package com.company.rag.shared.exception;

import java.util.Objects;

/** Base type for expected domain failures (no shared {@code DomainResult}). */
public abstract class DomainException extends Exception {

    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = Objects.requireNonNull(code, "code");
    }

    protected DomainException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = Objects.requireNonNull(code, "code");
    }

    public String getCode() {
        return code;
    }
}
