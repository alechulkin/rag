# =========================================================
# Build artifacts
# =========================================================

dist/
build/
target/
out/
.next/
.vite/
dev-dist/

# Java / Kotlin / Spring Boot build output
**/target/
**/build/
*.class
*.jar
*.war
*.ear

# Frontend build output
frontend/dist/
frontend/build/
frontend/.next/
frontend/.vite/

# Node.js build output
backend-node/dist/
backend-node/build/

# Python build output
__pycache__/
*.py[cod]
*.pyo
*.pyd
.pytest_cache/
.mypy_cache/
.ruff_cache/
.tox/
htmlcov/
dist/
*.egg-info/


# =========================================================
# Dependencies
# =========================================================

node_modules/
**/node_modules/

# Java / Gradle / Maven dependency caches if local
.gradle/
.m2/

# Python virtual environments
.venv/
venv/
env/
ENV/


# =========================================================
# Generated AI / RAG / vector-search data
# =========================================================

# Uploaded source documents - often large and not useful as code context
uploads/
uploaded-documents/
documents/raw/
documents/uploads/

# Parsed / chunked / embedded outputs
data/processed/
data/chunks/
data/embeddings/
data/vector-index/
data/generated/

# Local vector DB / search indexes
vector-db/
pgvector-data/
chroma/
.chroma/
qdrant_storage/
weaviate-data/
opensearch-data/
elasticsearch-data/

# Model / tokenizer / cache artifacts
models/
.model-cache/
.cache/huggingface/
.cache/torch/
.cache/sentence-transformers/

# Evaluation output - keep specs/golden sets, ignore generated reports
eval-results/
evaluation-results/
ragas-results/
*.eval.json
*.metrics.json


# =========================================================
# Large documents and binary assets
# =========================================================

*.pdf
*.doc
*.docx
*.ppt
*.pptx
*.xls
*.xlsx
*.zip
*.tar
*.tar.gz
*.gz
*.7z

# Keep small markdown specs visible to Cursor, but ignore exported/generated HTML
html/


# =========================================================
# Logs, reports, coverage
# =========================================================

logs/
*.log
*.out
*.err

coverage/
.nyc_output/
jacoco/
site/
surefire-reports/
failsafe-reports/

# Test snapshots can be large / low signal
*.snap


# =========================================================
# Local runtime state
# =========================================================

tmp/
temp/
.local/
.localstack/
docker-data/
postgres-data/
mongo-data/
redis-data/
kafka-data/
zookeeper-data/

# Docker Compose local volumes
.volumes/
volumes/


# =========================================================
# Environment files and secrets
# =========================================================

.env
.env.*
!.env.example
!.env.template

*.pem
*.key
*.p12
*.jks
*.keystore
*.crt
*.csr

secrets/
credentials/
service-account*.json


# =========================================================
# Package manager lock files
# Optional: ignore if you want lower-noise AI context.
# Keep them in Git, but usually not needed for Cursor reasoning.
# =========================================================

package-lock.json
yarn.lock
pnpm-lock.yaml

# Maven/Gradle lock metadata, if generated
gradle.lockfile


# =========================================================
# Generated API clients / OpenAPI output
# =========================================================

generated/
**/generated/
openapi/generated/
api-client/generated/

# Keep source OpenAPI specs visible, ignore generated JSON copies if needed
*.generated.json
*.generated.yaml


# =========================================================
# IDE, VCS, OS noise
# =========================================================

.git/
.vscode/
.idea/

.DS_Store
Thumbs.db


# =========================================================
# Deployment / local tooling
# =========================================================

.vercel/
.netlify/
.firebase/
firebase/

terraform/.terraform/
*.tfstate
*.tfstate.*

serverless/.serverless/
.aws-sam/