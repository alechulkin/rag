package com.company.rag.shared.model;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Target boundary for search / chat / eval (Shared_Abstractions §S07). */
public record Scope(UUID workspaceId, Set<UUID> collectionIds, UUID documentId) {

    public Scope {
        Objects.requireNonNull(workspaceId, "workspaceId");
        collectionIds = collectionIds == null ? null : Set.copyOf(collectionIds);
    }

    public static Scope workspace(UUID workspaceId) {
        return new Scope(workspaceId, null, null);
    }

    public static Scope collections(UUID workspaceId, Set<UUID> collectionIds) {
        return new Scope(workspaceId, collectionIds, null);
    }

    public static Scope document(UUID workspaceId, UUID documentId) {
        return new Scope(workspaceId, null, Objects.requireNonNull(documentId, "documentId"));
    }
}
