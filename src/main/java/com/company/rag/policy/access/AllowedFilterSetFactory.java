package com.company.rag.policy.access;

import com.company.rag.shared.model.AllowedFilterSet;
import com.company.rag.shared.model.Classification;
import java.util.Set;
import java.util.UUID;

/** Sole intended construction site for {@link AllowedFilterSet} (Shared_Abstractions §S01). */
public final class AllowedFilterSetFactory {

    private AllowedFilterSetFactory() {}

    public static AllowedFilterSet create(
            UUID tenantId,
            UUID workspaceId,
            Set<UUID> allowedCollectionIds,
            Set<UUID> explicitDocGrantIds,
            Set<UUID> explicitDocDenyIds,
            Classification workspaceClassification) {
        return AllowedFilterSet.create(
                tenantId,
                workspaceId,
                allowedCollectionIds,
                explicitDocGrantIds,
                explicitDocDenyIds,
                workspaceClassification);
    }
}
