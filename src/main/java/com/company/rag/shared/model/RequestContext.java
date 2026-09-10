package com.company.rag.shared.model;

import java.util.UUID;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

/**
 * Request-scoped identity/tenant context for the api JVM only (Shared_Abstractions §S07 /
 * RequestContext). Worker uses explicit {@code WorkerJobContext} instead.
 */
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
@org.springframework.context.annotation.Profile("api")
public class RequestContext {

    private UUID tenantId;
    private UUID workspaceId;
    private UUID userId;

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(UUID workspaceId) {
        this.workspaceId = workspaceId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }
}
