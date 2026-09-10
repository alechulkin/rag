package com.company.rag.evaluation;

import com.company.rag.shared.exception.DomainException;

public final class StaleEvalCaseException extends DomainException {

    public StaleEvalCaseException(String message) {
        super("evaluation.stale_case", message);
    }
}
