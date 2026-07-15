# ADR-018: Node BFF Is Rejected by Default (Adoption Requires New ADR)

## Status
Accepted

## Decision
Node BFF is **rejected by default**. The MVP baseline topology has **no BFF**.

If one of the triggers below persists, raise a **new ADR** to explicitly adopt a BFF:
1. Repeated SSE maintenance pain in Java delivery.
2. Multiple frontend screens require stable composite endpoints.
3. Tenant edge-routing requirement cannot be met cleanly without BFF.

## Consequences
- MVP remains simpler and cheaper.
- BFF adoption becomes evidence-based, not preference-based.
- Documentation baseline assumes no BFF.
