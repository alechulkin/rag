package com.company.rag.shared.model;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Pre-resolved permission filter for retrieval (Shared_Abstractions §S01).
 *
 * <p>Constructor is private. Callers outside {@code com.company.rag.policy..} are rejected at
 * runtime. Prefer {@link com.company.rag.policy.access.AllowedFilterSetFactory}. ArchUnit wall 4.5
 * will add compile-time enforcement.
 */
public final class AllowedFilterSet {

    private static final String POLICY_PACKAGE_PREFIX = "com.company.rag.policy";

    private final UUID tenantId;
    private final UUID workspaceId;
    private final Set<UUID> allowedCollectionIds;
    private final Set<UUID> explicitDocGrantIds;
    private final Set<UUID> explicitDocDenyIds;
    private final Classification workspaceClassification;

    private AllowedFilterSet(
            UUID tenantId,
            UUID workspaceId,
            Set<UUID> allowedCollectionIds,
            Set<UUID> explicitDocGrantIds,
            Set<UUID> explicitDocDenyIds,
            Classification workspaceClassification) {
        this.tenantId = Objects.requireNonNull(tenantId, "tenantId");
        this.workspaceId = Objects.requireNonNull(workspaceId, "workspaceId");
        this.allowedCollectionIds =
                Set.copyOf(Objects.requireNonNull(allowedCollectionIds, "allowedCollectionIds"));
        this.explicitDocGrantIds =
                Set.copyOf(Objects.requireNonNull(explicitDocGrantIds, "explicitDocGrantIds"));
        this.explicitDocDenyIds =
                Set.copyOf(Objects.requireNonNull(explicitDocDenyIds, "explicitDocDenyIds"));
        this.workspaceClassification =
                Objects.requireNonNull(workspaceClassification, "workspaceClassification");
    }

    /**
     * Constructs a filter. Invocable only from {@code com.company.rag.policy..} (enforced via
     * {@link StackWalker}).
     */
    public static AllowedFilterSet create(
            UUID tenantId,
            UUID workspaceId,
            Set<UUID> allowedCollectionIds,
            Set<UUID> explicitDocGrantIds,
            Set<UUID> explicitDocDenyIds,
            Classification workspaceClassification) {
        assertCallerIsPolicy();
        return new AllowedFilterSet(
                tenantId,
                workspaceId,
                allowedCollectionIds,
                explicitDocGrantIds,
                explicitDocDenyIds,
                workspaceClassification);
    }

    private static void assertCallerIsPolicy() {
        Class<?> caller =
                StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE)
                        .walk(
                                frames ->
                                        frames.map(StackWalker.StackFrame::getDeclaringClass)
                                                .filter(type -> type != AllowedFilterSet.class)
                                                .findFirst()
                                                .orElseThrow(
                                                        () ->
                                                                new IllegalStateException(
                                                                        "AllowedFilterSet.create"
                                                                            + " has no caller"
                                                                            + " frame")));
        String packageName = caller.getPackageName();
        if (!packageName.equals(POLICY_PACKAGE_PREFIX)
                && !packageName.startsWith(POLICY_PACKAGE_PREFIX + ".")) {
            throw new SecurityException(
                    "AllowedFilterSet may only be constructed from com.company.rag.policy..;"
                            + " caller package="
                            + packageName);
        }
    }

    public UUID tenantId() {
        return tenantId;
    }

    public UUID workspaceId() {
        return workspaceId;
    }

    public Set<UUID> allowedCollectionIds() {
        return Set.copyOf(allowedCollectionIds);
    }

    public Set<UUID> explicitDocGrantIds() {
        return Set.copyOf(explicitDocGrantIds);
    }

    public Set<UUID> explicitDocDenyIds() {
        return Set.copyOf(explicitDocDenyIds);
    }

    public Classification workspaceClassification() {
        return workspaceClassification;
    }
}
