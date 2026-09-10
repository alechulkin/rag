package com.company.rag.policy.providergate;

import com.company.rag.shared.exception.DomainException;

public final class ProviderDeniedException extends DomainException {

    public ProviderDeniedException(String message) {
        super("policy.provider_denied", message);
    }
}
