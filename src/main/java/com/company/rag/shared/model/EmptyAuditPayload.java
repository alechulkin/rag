package com.company.rag.shared.model;

/** Minimal payload for bootstrap / structural audit events. */
public record EmptyAuditPayload(String note) implements AuditPayload {

    public EmptyAuditPayload {
        if (note == null) {
            note = "";
        }
    }
}
