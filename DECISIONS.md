# Architecture & Ingestion Decisions

*Note regarding environment constraints: The prompt requested a Django REST + React stack. Due to the constraint of my AI Studio Node.js environment, I have implemented an equivalent full-stack REST API and React dashboard using Express, SQLite, and React. The architectural concepts translate 1:1.*

## Resolved Ambiguities

### 1. Ingestion Mechanism Selection
*   **Decision**: Opted for **File Upload (CSV/JSON)** as the standard mechanism across all three prototype interfaces rather than active API polling or email scraping.
*   **Why**: File uplods perfectly emulate the data payload of API responses without requiring complex webhook setups, fake API mocking, or OAuth proxy setups for the assignment. It accurately mimics portal scraping (Utility) and manual flat-file extracts (SAP).
*   **Future Question for PM**: "At what volume do we anticipate API ingestion vs File ingestion? Will clients agree to automated API pushes, or is their standard operating procedure currently manual CSV exports?"

### 2. Handling Missing Master Data (e.g., SAP Plant Codes)
*   **Decision**: During normalization, if a plant code or location string does not map to our (stubbed) internal lookup table, the row is flagged with a `validation_error` and assigned the `PENDING_REVIEW` status.
*   **Why**: We cannot halt the entire file ingestion for one bad row. Analysts need to see the errors in context and choose to fix the reference data or override the row.

### 3. Asymmetric Billing Periods for Utilities
*   **Decision**: The utility normalization standardizes the metric into a "daily run rate" internally, but surfaces the raw invoice block (Start Date -> End Date) for the analyst.
*   **Why**: Utility bills do not cleanly align with calendar months. Emitting daily averaged values downstream allows for accurate calendar-month rollups later in the pipeline.

### 4. Subset Selection for SAP
*   **Decision**: Given SAP's immense complexity, I focused on a standard flat-file ALV Material document extract. I explicitly am only targeting Scope 1 "Fuel" equivalents and Scope 3 "Procured Materials." I am ignoring cost-centers, internal order mapping, and transport orders for now.
*   **Why**: Scope is strictly limited in a 4-day prototype; targeting simple quantity-material mappings shows the ingestion architecture effectively.
