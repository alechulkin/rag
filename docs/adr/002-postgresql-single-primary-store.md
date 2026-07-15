# ADR-002: PostgreSQL Is Single Primary Store

## Status
Accepted

## Context
MVP cost ceiling and operational simplicity require minimal infrastructure.

## Decision
Use PostgreSQL 16 as single primary store for relational data, pgvector, and PostgreSQL FTS.

## Consequences
- One backup/restore domain.
- Lower infrastructure and operations cost.
- Migration to specialized stores remains roadmap-only, gated by benchmark/evaluation regressions.
