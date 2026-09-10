package com.company.rag.policy.access;

import com.company.rag.shared.exception.DomainException;

public final class PermissionDeniedException extends DomainException {

    public PermissionDeniedException(String message) {
        super("policy.permission_denied", message);
    }
}
