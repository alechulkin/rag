package com.company.rag.shared.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuditEventTest {

    @Test
    void constructsWithRequiredFields() {
        UUID id = UUID.randomUUID();
        Instant ts = Instant.parse("2026-08-27T12:00:00Z");
        AuditEvent event =
                new AuditEvent(
                        id,
                        "tenant.created",
                        UUID.randomUUID(),
                        "ADMIN",
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "tenant",
                        null,
                        new EmptyAuditPayload("bootstrap"),
                        SeverityLevel.INFO,
                        ts,
                        "127.0.0.1",
                        "abc");
        assertThat(event.eventType()).isEqualTo("tenant.created");
        assertThat(event.payload()).isInstanceOf(EmptyAuditPayload.class);
        assertThat(event.severity()).isEqualTo(SeverityLevel.INFO);
    }

    @Test
    void rejectsNullEventType() {
        assertThatThrownBy(
                        () ->
                                new AuditEvent(
                                        UUID.randomUUID(),
                                        null,
                                        UUID.randomUUID(),
                                        "ADMIN",
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        "tenant",
                                        null,
                                        new EmptyAuditPayload(""),
                                        SeverityLevel.WARN,
                                        Instant.now(),
                                        "127.0.0.1",
                                        "abc"))
                .isInstanceOf(NullPointerException.class);
    }
}
