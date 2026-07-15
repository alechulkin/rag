# ADR-016: PostgreSQL RLS Deferred to Production Launch

## Status
Accepted

## Decision
- MVP: enforce tenant isolation in application layer (`policy` + hard-walled search path + canary checks).
- Production-launch hardening: enable PostgreSQL RLS as defense-in-depth.

## Consequences
- MVP delivery stays within team/cost constraints.
- Clear hardening path retained for pilot-to-production transition.
