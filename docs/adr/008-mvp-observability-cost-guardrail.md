# ADR-008: MVP Observability Uses PostgreSQL + Stdout (No SaaS)

## Status
Accepted

## Context
MVP observability must stay within €0 dedicated SaaS spend.

## Decision
- Operational logs: structured JSON to stdout with runtime retention.
- Metrics: PostgreSQL `metrics_aggregates`.
- Dashboard: in-app admin UI.
- No managed Prometheus/Grafana/Loki/APM/SIEM in MVP.

## Consequences
- Cost ceiling protected.
- Lower tooling depth accepted until production launch.
