package com.company.rag.shared.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class RequestContextTest {

    @Test
    void storesTenantWorkspaceAndUser() {
        RequestContext ctx = new RequestContext();
        UUID tenantId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        ctx.setTenantId(tenantId);
        ctx.setWorkspaceId(workspaceId);
        ctx.setUserId(userId);
        assertThat(ctx.getTenantId()).isEqualTo(tenantId);
        assertThat(ctx.getWorkspaceId()).isEqualTo(workspaceId);
        assertThat(ctx.getUserId()).isEqualTo(userId);
    }
}
