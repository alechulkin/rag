package com.company.rag.shared.exception;

import static org.assertj.core.api.Assertions.assertThat;

import com.company.rag.documents.mgmt.AvBlockedException;
import com.company.rag.documents.mgmt.DocumentNotFoundException;
import com.company.rag.evaluation.StaleEvalCaseException;
import org.junit.jupiter.api.Test;

class DomainExceptionHierarchyTest {

    @Test
    void documentAndEvalExceptionsCarryNamespacedCodes() {
        assertThat(new DocumentNotFoundException("missing").getCode())
                .isEqualTo("documents.not_found");
        assertThat(new AvBlockedException("malware").getCode()).isEqualTo("documents.av_blocked");
        assertThat(new StaleEvalCaseException("stale").getCode())
                .isEqualTo("evaluation.stale_case");
    }
}
