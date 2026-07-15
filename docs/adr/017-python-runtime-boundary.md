# ADR-017: Python Boundary Is Dev/CI Tooling, Not Runtime Service

## Status
Accepted

## Decision
- Runtime RAG pipeline stays in Java (`api`/`worker`).
- Python is used for offline experimentation, evaluation scripts, and CI tooling.
- Python tooling must call platform REST APIs, never provider SDKs directly.

## Consequences
- Single production pipeline for chat and evaluation correctness.
- No parallel runtime behavior drift between Java and Python services.
