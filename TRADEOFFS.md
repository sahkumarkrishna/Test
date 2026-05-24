# Tradeoffs

Here are three significant components deliberately omitted from this prototype, and the rationales behind each decision.

### 1. No Asynchronous Worker Queue (Celery / BullMQ)
*   **What was omitted**: Background job processing. When a user uploads a file, the parsing, validation, and insertion happen synchronously during the HTTP request cycle.
*   **Why**: For a prototype, introducing Redis and a worker process adds infrastructure overhead without demonstrating more domain knowledge. 
*   **Tradeoff Impact**: In a production environment with a 2-million-row SAP export, the HTTP connection would timeout. For real deployments, the upload would write the file to S3, submit a job ID to an async queue, and return a 202 Accepted.

### 2. OCR and PDF Extraction
*   **What was omitted**: Building computer vision or LLM-based text extraction for Utility Bill PDFs.
*   **Why**: PDF extraction is a massive domain itself. It introduces indeterminism. By substituting the PDF requirement with a structured CSV portal export, I focused my time strictly on the deterministic Data Model, normalizer logic, and the analyst UX.
*   **Tradeoff Impact**: The system assumes the client facilities team has access to a modern utility portal offering CSV data, which is not true for all (specifically smaller municipal) grids.

### 3. Granular RBAC (Role-Based Access Control)
*   **What was omitted**: Distinct authenticated roles for "Client Uploader", "Internal Analyst", and "Auditor".
*   **Why**: Adding an Auth layer (JWTs, session cookies, user management UI) dilutes the focus on the data pipeline. 
*   **Tradeoff Impact**: Multi-tenancy is structured at the database level (`organization_id`), but the UI hardcodes the interaction as a generic "Analyst" working on a default tenant. A real app requires tenant isolation using middleware or row-level security.
