package com.company.rag.shared.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.company.rag.policy.access.AllowedFilterSetFactory;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SharedValueObjectTest {

    @Test
    void allowedFilterSetFactoryCreatesImmutableSets() {
        UUID tenantId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        UUID collectionId = UUID.randomUUID();
        UUID grantId = UUID.randomUUID();
        UUID denyId = UUID.randomUUID();

        AllowedFilterSet filter =
                AllowedFilterSetFactory.create(
                        tenantId,
                        workspaceId,
                        Set.of(collectionId),
                        Set.of(grantId),
                        Set.of(denyId),
                        Classification.RESTRICTED);

        assertThat(filter.tenantId()).isEqualTo(tenantId);
        assertThat(filter.workspaceId()).isEqualTo(workspaceId);
        assertThat(filter.allowedCollectionIds()).containsExactly(collectionId);
        assertThat(filter.explicitDocGrantIds()).containsExactly(grantId);
        assertThat(filter.explicitDocDenyIds()).containsExactly(denyId);
        assertThat(filter.workspaceClassification()).isEqualTo(Classification.RESTRICTED);
        assertThatThrownBy(() -> filter.allowedCollectionIds().add(UUID.randomUUID()))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void allowedFilterSetRejectsNullTenant() {
        assertThatThrownBy(
                        () ->
                                AllowedFilterSetFactory.create(
                                        null,
                                        UUID.randomUUID(),
                                        Set.of(),
                                        Set.of(),
                                        Set.of(),
                                        Classification.STANDARD))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void allowedFilterSetCreateRejectedOutsidePolicy() {
        assertThatThrownBy(
                        () ->
                                AllowedFilterSet.create(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        Set.of(),
                                        Set.of(),
                                        Set.of(),
                                        Classification.STANDARD))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("com.company.rag.policy");
    }

    @Test
    void providerDecisionEnforcesDenyReasonInvariant() {
        Instant now = Instant.parse("2026-08-27T00:00:00Z");
        assertThat(ProviderDecision.allow("local", "eu-west", now).allowed()).isTrue();
        assertThat(ProviderDecision.deny("no residency", "local", "eu-west", now).denyReason())
                .isEqualTo("no residency");
        assertThatThrownBy(() -> new ProviderDecision(false, null, "local", "eu-west", now))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ProviderDecision(true, "x", "local", "eu-west", now))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void scopeFactories() {
        UUID workspaceId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();
        UUID collectionId = UUID.randomUUID();
        assertThat(Scope.workspace(workspaceId).documentId()).isNull();
        assertThat(Scope.document(workspaceId, documentId).documentId()).isEqualTo(documentId);
        assertThat(Scope.collections(workspaceId, Set.of(collectionId)).collectionIds())
                .containsExactly(collectionId);
    }
}
