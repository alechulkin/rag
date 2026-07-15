# ADR-006: Trigger-Based Graduation from DB Queue to Broker

## Status
Accepted

## Context
Broker is out of MVP scope but may become necessary under sustained scale.

## Decision
Adopt broker only when one trigger persists for 3 consecutive weeks:
- `ingestion_job_queue_wait` p95 > 30s.
- Queue write contention regresses chat/search p95 SLOs.
- Connector throughput requires sustained >100 jobs/min/tenant.

## Consequences
- Prevents premature Kafka/Service Bus adoption.
- Adds objective, measurable migration criteria.
