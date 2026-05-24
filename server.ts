import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import multer from "multer";
import { parse } from "csv-parse/sync";

const db = new Database("esg.db");

// --- Initialization & Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER,
    source_type TEXT,
    original_filename TEXT,
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT
  );

  CREATE TABLE IF NOT EXISTS raw_emission_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER,
    raw_payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS normalized_emission_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_data_id INTEGER,
    organization_id INTEGER,
    scope TEXT,
    activity_type TEXT,
    original_value REAL,
    original_unit TEXT,
    normalized_value REAL,
    normalized_unit TEXT,
    status TEXT,
    validation_errors TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_data_id INTEGER,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Org
db.exec(`INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Acme Corp Default Tenant')`);

// Helper dictionary for SAP Plants
const VALID_SAP_PLANTS = ['P001', 'P002', 'P003', 'P100', 'P200'];
const VALID_UNITS = ['kWh', 'Litres', 'Gal', 'L', 'EA'];

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // --- API Routes ---

  // Dashboard endpoint
  app.get("/api/dashboard", (req, res) => {
    const stmt = db.prepare(`
      SELECT n.*, r.raw_payload, d.source_type, d.original_filename
      FROM normalized_emission_data n
      JOIN raw_emission_data r ON n.raw_data_id = r.id
      JOIN data_sources d ON r.source_id = d.id
      ORDER BY n.id DESC
    `);
    const records = stmt.all().map((r: any) => ({
      ...r,
      validation_errors: r.validation_errors ? JSON.parse(r.validation_errors) : [],
      raw_payload: JSON.parse(r.raw_payload)
    }));
    res.json(records);
  });

  // Action: Approve or Reject
  app.post("/api/review/:id", (req, res) => {
    const { action } = req.body; // 'APPROVED' or 'REJECTED'
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    
    // Update normalized
    db.prepare("UPDATE normalized_emission_data SET status = ? WHERE id = ?").run(action, req.params.id);
    // Audit log
    db.prepare("INSERT INTO audit_logs (normalized_data_id, action) VALUES (?, ?)").run(req.params.id, `STATUS_CHANGED_TO_${action}`);

    res.json({ success: true });
  });

  // Action: Reset Data
  app.post("/api/admin/reset", (req, res) => {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM normalized_emission_data;
      DELETE FROM raw_emission_data;
      DELETE FROM data_sources;
    `);
    res.json({ success: true });
  });

  // SAP Ingestion Endpoints (ALV Export CSV)
  app.post("/api/ingest/sap", upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });

    const insertSource = db.prepare("INSERT INTO data_sources (organization_id, source_type, original_filename, status) VALUES (1, 'SAP_EXPORT', ?, 'COMPLETED')");
    const sourceInfo = insertSource.run(req.file.originalname);
    const sourceId = sourceInfo.lastInsertRowid;

    const insertRaw = db.prepare("INSERT INTO raw_emission_data (source_id, raw_payload) VALUES (?, ?)");
    const insertNorm = db.prepare("INSERT INTO normalized_emission_data (raw_data_id, organization_id, scope, activity_type, original_value, original_unit, normalized_value, normalized_unit, status, validation_errors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        // Assume dict keys depend on actual CSV - expecting Plant, Material, Quantity, Unit
        const rawId = insertRaw.run(sourceId, JSON.stringify(row)).lastInsertRowid;
        
        let valErrors = [];
        let pCode = row['WERKS'] || row['Plant'] || row['Werks'];
        if (!pCode || !VALID_SAP_PLANTS.includes(pCode)) {
           valErrors.push(`Unknown SAP Plant (WERKS): ${pCode}`);
        }
        let qty = parseFloat(row['ERFMG'] || row['Quantity'] || row['Menge']);
        if (isNaN(qty)) valErrors.push(`Invalid Quantity (ERFMG): ${row['ERFMG'] || row['Quantity']}`);
        
        let unit = row['ERFME'] || row['Unit'] || row['Meins'];
        if (!unit || !VALID_UNITS.includes(unit)) {
          valErrors.push(`Unmapped Unit of Measure (ERFME): ${unit}`);
        }

        const isError = valErrors.length > 0;
        
        insertNorm.run(
          rawId, 
          1, 
          'Scope 3', 
          'PROCURED_MATERIALS', 
          isNaN(qty) ? null : qty, 
          unit || 'UNKNOWN', 
          isNaN(qty) ? null : qty * 1.0, // dummy multiplier
          unit || 'UNKNOWN',
          isError ? 'PENDING_REVIEW' : 'PENDING_REVIEW', // Everything requires review per prompt
          JSON.stringify(valErrors)
        );
      }
    });

    insertMany(records);
    res.json({ success: true, rowsIngested: records.length });
  });

  // Utility Ingestion Endpoint
  app.post("/api/ingest/utility", upload.single('file'), (req, res) => {
     if (!req.file) return res.status(400).json({ error: "No file provided" });
    
    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });

    const insertSource = db.prepare("INSERT INTO data_sources (organization_id, source_type, original_filename, status) VALUES (1, 'UTILITY_PORTAL', ?, 'COMPLETED')");
    const sourceInfo = insertSource.run(req.file.originalname);
    const sourceId = sourceInfo.lastInsertRowid;

    const insertRaw = db.prepare("INSERT INTO raw_emission_data (source_id, raw_payload) VALUES (?, ?)");
    const insertNorm = db.prepare("INSERT INTO normalized_emission_data (raw_data_id, organization_id, scope, activity_type, original_value, original_unit, normalized_value, normalized_unit, status, validation_errors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const rawId = insertRaw.run(sourceId, JSON.stringify(row)).lastInsertRowid;
        
        let valErrors = [];
        let val = parseFloat(row['kWh Consumed']);
        if (isNaN(val)) valErrors.push("Missing or invalid kWh consumption");
        if (val < 0) valErrors.push("Negative consumption reported (solar export?) - requires review");
        
        insertNorm.run(
          rawId, 
          1, 
          'Scope 2', 
          'PURCHASED_ELECTRICITY', 
          val || 0, 
          'kWh', 
          val || 0, 
          'kWh',
          valErrors.length > 0 ? 'PENDING_REVIEW' : 'PENDING_REVIEW',
          JSON.stringify(valErrors)
        );
      }
    });

    insertMany(records);
    res.json({ success: true, rowsIngested: records.length });
  });

  // Travel API Mock Interface 
  app.post("/api/ingest/travel", (req, res) => {
    // Navan/Concur mock JSON body
    const trips = req.body.trips || [];
    
    if (!trips.length) return res.status(400).json({ error: "No trips found in payload" });

    const insertSource = db.prepare("INSERT INTO data_sources (organization_id, source_type, original_filename, status) VALUES (1, 'TRAVEL_API_JSON', 'WEBHOOK_PUSH', 'COMPLETED')");
    const sourceInfo = insertSource.run();
    const sourceId = sourceInfo.lastInsertRowid;

    const insertRaw = db.prepare("INSERT INTO raw_emission_data (source_id, raw_payload) VALUES (?, ?)");
    const insertNorm = db.prepare("INSERT INTO normalized_emission_data (raw_data_id, organization_id, scope, activity_type, original_value, original_unit, normalized_value, normalized_unit, status, validation_errors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const insertMany = db.transaction((tripsArray) => {
      for (const trip of tripsArray) {
        if (!trip.segments) continue;
        for (const segment of trip.segments) {
          const rawId = insertRaw.run(sourceId, JSON.stringify({ employeeId: trip.employee_id, ...segment })).lastInsertRowid;
          
          let valErrors = [];
          if (!segment.origin || segment.origin.length !== 3) valErrors.push(`Invalid Origin IATA: ${segment.origin}`);
          if (!segment.destination || segment.destination.length !== 3) valErrors.push(`Invalid Dest IATA: ${segment.destination}`);
          if (!['Economy', 'Business', 'First'].includes(segment.cabin_class)) valErrors.push(`Unknown cabin class factor: ${segment.cabin_class}`);
          
          insertNorm.run(
            rawId, 
            1, 
            'Scope 3', 
            'BUSINESS_TRAVEL', 
            1, // 1 segment
            'flight_segment', 
            segment.cabin_class === 'Business' ? 2.5 : 1.0, // mock EF multiplier
            'flight_segment',
            valErrors.length > 0 ? 'PENDING_REVIEW' : 'PENDING_REVIEW',
            JSON.stringify(valErrors)
          );
        }
      }
    });

    insertMany(trips);
    res.json({ success: true, rowsIngested: trips.length });
  });

  // --- Vite Dev Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
