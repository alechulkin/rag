# Spec-Generation Prompts (per slice)

One prompt per implementation track from `docs/Solution_Architecture.md` §8.
Each is self-contained: paste into an agent session in this repository.
Output of each prompt: `docs/specs/<NN>_<slice>_Spec.md`.

| # | Prompt | Slice | Key modules |
|---|---|---|---|
| 01 | `01_foundation-slice.md` | Foundation | `policy`, `audit`, `search`, `ai.provider` (stubs), `admin` (bootstrap), `web`, `adapters.identity` |
| 02 | `02_ingestion-slice.md` | Ingestion | `documents` (all sub-packages), `worker.runtime`, `adapters.objectstorage` |
| 03 | `03_chat-slice.md` | Chat / RAG | `rag`, `chat`, `search` (read path) |
| 04 | `04_admin-slice.md` | Admin | `admin` (full CRUD, audit viewer), `web` rate limiting |
| 05 | `05_evaluation-slice.md` | Evaluation | `evaluation`, `worker.runtime` (eval runs) |
| 06 | `06_hardening-slice.md` | Operational hardening | `audit`, retention purge, notifications, four-eyes |

Run in order — each slice assumes the previous one's spec exists.
Review each generated spec against `docs/` before implementation.
