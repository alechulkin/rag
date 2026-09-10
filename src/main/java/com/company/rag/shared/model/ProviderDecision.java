package com.company.rag.shared.model;

import java.time.Instant;
import java.util.Objects;

/** Result of pre-call provider validation (Shared_Abstractions §S02). */
public record ProviderDecision(
        boolean allowed, String denyReason, String provider, String region, Instant validatedAt) {

    public ProviderDecision {
        Objects.requireNonNull(provider, "provider");
        Objects.requireNonNull(region, "region");
        Objects.requireNonNull(validatedAt, "validatedAt");
        if (allowed && denyReason != null) {
            throw new IllegalArgumentException("allowed decision must not carry denyReason");
        }
        if (!allowed && (denyReason == null || denyReason.isBlank())) {
            throw new IllegalArgumentException("denied decision requires denyReason");
        }
    }

    public static ProviderDecision allow(String provider, String region, Instant validatedAt) {
        return new ProviderDecision(true, null, provider, region, validatedAt);
    }

    public static ProviderDecision deny(
            String denyReason, String provider, String region, Instant validatedAt) {
        return new ProviderDecision(false, denyReason, provider, region, validatedAt);
    }
}
