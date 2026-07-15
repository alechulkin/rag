# ADR-001: MVP Runtime Uses Modular Monolith + Worker

## Status
Accepted

## Context
MVP must stay small-team-friendly, cost-bounded, and avoid Kubernetes/microservices overhead.

## Decision
Use one Spring Boot codebase with two runtime profiles:
- `api` profile for REST/SSE.
- `worker` profile for ingestion/evaluation/retention jobs.

## Consequences
- Clean isolation of API latency from heavy background work.
- No second backend codebase.
- Scales by adding replicas, not redesigning architecture.
