package com.company.rag.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * worker JVM component scan. Includes pipeline / evaluation / runtime; excludes
 * HTTP and IdP-facing packages ({@code web}, {@code adapters.identity}).
 */
@Configuration
@Profile("worker")
@ComponentScan(
        basePackages = {
            "com.company.rag.shared",
            "com.company.rag.policy",
            "com.company.rag.audit",
            "com.company.rag.search",
            "com.company.rag.ai.provider",
            "com.company.rag.documents.pipeline",
            "com.company.rag.documents.connector",
            "com.company.rag.evaluation",
            "com.company.rag.worker.runtime",
            "com.company.rag.adapters.objectstorage",
            "com.company.rag.metrics"
        })
public class WorkerProfileConfiguration {}
