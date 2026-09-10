package com.company.rag.shared.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable security/compliance event carrier. Persist only via {@code audit.record()}
 * (Shared_Abstractions §S06).
 */
public record AuditEvent(
        UUID eventId,
        String eventType,
        UUID actorUserId,
        String actorRole,
        UUID tenantId,
        UUID workspaceId,
        String subjectType,
        UUID subjectId,
        AuditPayload payload,
        SeverityLevel severity,
        Instant timestamp,
        String ip,
        String userAgentHash) {

    public AuditEvent {
        Objects.requireNonNull(eventId, "eventId");
        Objects.requireNonNull(eventType, "eventType");
        Objects.requireNonNull(actorUserId, "actorUserId");
        Objects.requireNonNull(actorRole, "actorRole");
        Objects.requireNonNull(tenantId, "tenantId");
        Objects.requireNonNull(workspaceId, "workspaceId");
        Objects.requireNonNull(subjectType, "subjectType");
        Objects.requireNonNull(payload, "payload");
        Objects.requireNonNull(severity, "severity");
        Objects.requireNonNull(timestamp, "timestamp");
        Objects.requireNonNull(ip, "ip");
        Objects.requireNonNull(userAgentHash, "userAgentHash");
    }
}
