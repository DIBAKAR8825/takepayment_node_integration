// db.js (WASM SQLite with sql.js)
import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const DB_PATH = process.env.DB_PATH || "./payments.db";

// Load / create DB from file
async function openDb() {
  const SQL = await initSqlJs({
    // sql.js ships a wasm; leaving locateFile default works from node_modules
  });

  let db;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Schema (same logical tables)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderRef TEXT NOT NULL,
      transactionUnique TEXT NOT NULL,
      amount INTEGER NOT NULL,
      customerEmail TEXT,
      customerAddress TEXT,
      customerPostCode TEXT,
      customerPhone TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(transactionUnique)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS callbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL,
      signature_valid INTEGER NOT NULL,
      response_code TEXT,
      response_message TEXT,
      body_json TEXT NOT NULL,
      received_at TEXT NOT NULL,
      UNIQUE(ref)
    );
  `);

  return { SQL, db };
}

// Persist DB to disk (call after each write for durability)
function persistDb(SQL, db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Simple helpers mirroring previous API
export async function insertPayment(row) {
  const { SQL, db } = await openDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO payments
    (orderRef, transactionUnique, amount, customerEmail, customerAddress, customerPostCode, customerPhone, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    row.orderRef,
    row.transactionUnique,
    row.amount,
    row.customerEmail,
    row.customerAddress,
    row.customerPostCode,
    row.customerPhone,
    row.payload_json,
    row.created_at
  ]);
  stmt.free();
  persistDb(SQL, db);
  db.close();
}

// db.js (WASM SQLite with sql.js)

export async function upsertCallback(row) {
  const { SQL, db } = await openDb(); // Open the SQLite DB
  let stmt = db.prepare(`SELECT id FROM callbacks WHERE ref = ? LIMIT 1`);

  // Check if the callback with the given ref already exists
  const exists = stmt.getAsObject([row.ref]);
  stmt.free(); // Free the prepared statement

  if (exists && exists.id) {
    // Update the existing callback record
    console.log("[DB] Updating callback with ref:", row.ref);
    stmt = db.prepare(`
      UPDATE callbacks
      SET signature_valid=?, response_code=?, response_message=?, body_json=?, received_at=?
      WHERE ref=?
    `);
    stmt.run([
      row.signature_valid,
      row.response_code,
      row.response_message,
      row.body_json,
      row.received_at,
      row.ref
    ]);
    stmt.free();
  } else {
    // Insert a new callback record
    console.log("[DB] Inserting new callback with ref:", row.ref);
    stmt = db.prepare(`
      INSERT INTO callbacks (ref, signature_valid, response_code, response_message, body_json, received_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      row.ref,
      row.signature_valid,
      row.response_code,
      row.response_message,
      row.body_json,
      row.received_at
    ]);
    stmt.free();
  }

  // Persist changes to the database
  persistDb(SQL, db);
  db.close();
}



export async function listCallbacks(limit = 100) {
  const { db } = await openDb();
  const res = [];
  const stmt = db.prepare(`
    SELECT ref, signature_valid, response_code, response_message, received_at
    FROM callbacks
    ORDER BY id DESC
    LIMIT ?
  `);
  stmt.bind([limit]);
  while (stmt.step()) res.push(stmt.getAsObject());
  stmt.free();
  db.close();
  return res;
}
