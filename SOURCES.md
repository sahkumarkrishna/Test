# Source Profiles

## 1. SAP (Fuel and Procurement)
*   **Research**: Real-world SAP exports for material consumption generally use `MB51` or `MB52` (Material Documents list). These are usually extracted as Excel/CSV (ALV grid exports) or consumed via OData APIs. Columns are dense and localized. Headers often lack strict typing (e.g., "Menge" for Quantity).
*   **Subset Handled**: Flat CSV export representing material movements.
*   **Sample Data Logic**: Includes `Plant` (Werks), `Material Number` (MATNR), `Quantity` (Menge), `Base Unit` (Meins). I have intentionally injected mismatched units and unknown plant codes to trigger the validation logic.
*   **What breaks in real life**: Custom SAP implementation codes where units are local jargon (e.g., 'BTL' instead of 'EA' or 'L'). The mapping engine would need NLP or a dense client-specific mapping table.

## 2. Utility Data (Electricity)
*   **Research**: Enterprise facility teams use portals like Energy Star Portfolio Manager or direct utility portals (e.g., PG&E). Exports are typically CSV or Excel containing Meter Reference, Service Start, Service End, kWh, and cost.
*   **Subset Handled**: CSV portal export containing structured interval readings.
*   **Sample Data Logic**: Includes Meter ID, Start Date, End Date, Energy (kWh). I injected overlapping dates and negative consumption values (representing solar feed-in tariffs or errors) to trigger warnings.
*   **What breaks in real life**: Estimated readings vs actual readings. Some utilities send preliminary bills and true-up later. Our model doesn't currently handle retroactively mutating past months based on true-up bills.

## 3. Corporate Travel
*   **Research**: Concur/Navan provide APIs returning itineraries. The data is usually a JSON payload structuring trips, segments, origins, destinations, and cabin class. Distance is rarely provided cleanly—it normally provides IATA airport codes.
*   **Subset Handled**: JSON schema modeling a flight segment extract.
*   **Sample Data Logic**: JSON array containing `employee_id`, `origin_iata`, `destination_iata`, and `cabin_class` (Economy, Business). I injected invalid IATA codes to flag for analyst review.
*   **What breaks in real life**: Multi-segment layovers where the specific equipment (plane type) changes. Calculating precise CO2 requires knowing the actual aircraft model, not just great-circle distance between IATAs, which these APIs generally omit or obscure.
