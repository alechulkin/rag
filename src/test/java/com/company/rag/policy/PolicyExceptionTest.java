package com.company.rag.policy;

import static org.assertj.core.api.Assertions.assertThat;

import com.company.rag.policy.access.PermissionDeniedException;
import com.company.rag.policy.providergate.BudgetExhaustedException;
import com.company.rag.policy.providergate.ProviderDeniedException;
import org.junit.jupiter.api.Test;

class PolicyExceptionTest {

    @Test
    void permissionDeniedUsesNamespacedCode() throws Exception {
        PermissionDeniedException ex = new PermissionDeniedException("no access");
        assertThat(ex.getCode()).isEqualTo("policy.permission_denied");
        assertThat(ex.getMessage()).isEqualTo("no access");
    }

    @Test
    void providerAndBudgetExceptionsUseNamespacedCodes() {
        assertThat(new ProviderDeniedException("denied").getCode())
                .isEqualTo("policy.provider_denied");
        assertThat(new BudgetExhaustedException("over budget").getCode())
                .isEqualTo("policy.budget_exhausted");
    }
}
