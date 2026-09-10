package com.company.rag.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * api JVM component scan. Excludes worker-only packages ({@code documents.pipeline},
 * {@code evaluation}, {@code worker.runtime}).
 */
@Configuration
@Profile("api")
@ComponentScan(
        basePackages = {
            "com.company.rag.shared",
            "com.company.rag.policy",
            "com.company.rag.audit",
            "com.company.rag.search",
            "com.company.rag.ai.provider",
            "com.company.rag.documents.mgmt",
            "com.company.rag.documents.connector",
            "com.company.rag.admin",
            "com.company.rag.web",
            "com.company.rag.rag",
            "com.company.rag.chat",
            "com.company.rag.adapters.identity",
            "com.company.rag.adapters.objectstorage",
            "com.company.rag.metrics"
        })
public class ApiProfileConfiguration {}
