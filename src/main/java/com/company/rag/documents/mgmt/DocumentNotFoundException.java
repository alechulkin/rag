package com.company.rag.documents.mgmt;

import com.company.rag.shared.exception.DomainException;

public final class DocumentNotFoundException extends DomainException {

    public DocumentNotFoundException(String message) {
        super("documents.not_found", message);
    }
}
