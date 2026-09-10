package com.company.rag.documents.mgmt;

import com.company.rag.shared.exception.DomainException;

public final class AvBlockedException extends DomainException {

    public AvBlockedException(String message) {
        super("documents.av_blocked", message);
    }
}
