# Data Model

The data model is implemented in a relational SQL structuture via SQLite (in standard production, this would be PostgreSQL). The focus is on multi-tenancy, clear boundaries between raw and normalized data, deterministic conversion, and an immutable audit trail.

## Schema Overview

### 1. `Organization` (Multi-Tenancy)
Represents the client company or tenant. Every downstream record requires an `organization_id`.
*   `id`: Primary key
*   `name`: Company Name
*   `created_at`: Timestamp

### 2. `DataSource` (Source of Truth Tracking)
Tracks every payload/file brought into the system. Allows us to drop, replay, or inspect specific ingestions.
*   `id`: Primary key
*   `organization_id`: Foreign key -> Organization
*   `source_type`: Enum ('SAP_EXPORT', 'UTILITY_PORTAL_CSV', 'TRAVEL_API_JSON')
*   `original_filename`: (if applicable) Name of the source file
*   `upload_timestamp`: When the data entered our system
*   `uploaded_by`: The user who triggered the ingestion (hardcoded analyst ID for prototype)
*   `status`: 'PROCESSING', 'READY_FOR_REVIEW', 'COMPLETED', 'FAILED'

### 3. `RawEmissionData` (Verbatim Storage)
Immutable record of EXACTLY what the source provided. This handles the ambiguity of different shapes. The raw payload is stored as JSON to handle column drifts and missing elements without schema migrations.
*   `id`: Primary key
*   `source_id`: Foreign key -> DataSource
*   `raw_payload`: JSON object containing the exact row parsed from the source
*   `created_at`: Timestamp

### 4. `NormalizedEmissionData` (The Analyst View)
This table takes the chaotic `RawEmissionData`, aligns the units, assigns the Scope, and surfaces validation errors.
*   `id`: Primary key
*   `raw_data_id`: Foreign key -> RawEmissionData (Direct linkage to truth)
*   `organization_id`: Foreign key -> Organization
*   `scope`: Enum ('Scope 1', 'Scope 2', 'Scope 3')
*   `activity_type`: Enum ('FUEL_COMBUSTION', 'PURCHASED_ELECTRICITY', 'BUSINESS_TRAVEL')
*   `original_value`: Numeric (The number observed in raw data)
*   `original_unit`: VARCHAR (e.g. 'Gal', 'Litres', 'kWh')
*   `normalized_value`: Numeric (Always mapped to a standardized base, e.g., kgCO2e or base unit)
*   `normalized_unit`: VARCHAR
*   `status`: Enum ('PENDING_REVIEW', 'APPROVED', 'REJECTED')
*   `validation_errors`: JSON array of issues (e.g., "Unknown Plant Code", "Missing Unit")

### 5. `AuditLog`
Tracking state changes to `NormalizedEmissionData`. Required for auditors to trace who approved what and when.
*   `id`: Primary pk
*   `normalized_data_id`: Foreign key -> NormalizedEmissionData
*   `action`: 'STATUS_CHANGE', 'VALUE_EDIT'
*   `previous_state`: JSON
*   `new_state`: JSON
*   `actor`: User ID of analyst
*   `timestamp`: Timestamp

## How It Solves the Core Problems
*   **Multi-tenancy**: Every read operation requires a `WHERE organization_id = ?`.
*   **Source of Truth**: The original, unaltered row is permanently frozen in `RawEmissionData`. Normalized records map 1:1 back to it. If the normalization logic is flawed, we can just re-run calculation logic directly atop the source of truth.
*   **Auditability**: Edits and approvals insert rows into `AuditLog` so we know the state transitions leading up to the "locked for audit" status.
