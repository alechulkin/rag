package com.company.rag.policy.providergate;

import com.company.rag.shared.exception.DomainException;

public final class BudgetExhaustedException extends DomainException {

    public BudgetExhaustedException(String message) {
        super("policy.budget_exhausted", message);
    }
}
