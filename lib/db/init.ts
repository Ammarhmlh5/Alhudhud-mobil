import * as SQLite from 'expo-sqlite';

// Open the database synchronously
let db: SQLite.SQLiteDatabase | null = null;
try {
  db = SQLite.openDatabaseSync('kingdom_of_bees.db');
} catch (error) {
  console.error("Error opening database:", error);
}

export const initDatabase = () => {
  if (!db) return;

  try {
    db.execSync(`
      PRAGMA foreign_keys = ON;

      -- Apiaries Table
      CREATE TABLE IF NOT EXISTS apiaries (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT,
        is_synced INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Hives Table
      CREATE TABLE IF NOT EXISTS hives (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        apiary_id TEXT NOT NULL,
        hive_number TEXT NOT NULL,
        type TEXT NOT NULL,
        dimensions TEXT, -- JSON: {width, height, length}
        frame_count INTEGER,
        frame_orientation TEXT, -- 'longitudinal' | 'transverse'
        queen_details TEXT, -- JSON: {age, breed, status}
        is_synced INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (apiary_id) REFERENCES apiaries (id) ON DELETE CASCADE
      );

      -- Inspections Table (Simplified for now)
      CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        hive_id TEXT NOT NULL,
        inspection_date TEXT NOT NULL,
        details TEXT, -- JSON: Entire inspection data including frames
        is_synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE CASCADE
      );

      -- Sync Queue Table (Critical for Offline-First)
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
        data TEXT, -- JSON content of the change
        status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SYNCED', 'FAILED'
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Feeding Records Table
      CREATE TABLE IF NOT EXISTS feeding_records (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        hive_id TEXT NOT NULL,
        apiary_id TEXT,
        feeding_date TEXT NOT NULL,
        feeding_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT DEFAULT 'KG',
        content TEXT,
        notes TEXT,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE CASCADE
      );

      -- Harvest Records Table
      CREATE TABLE IF NOT EXISTS harvest_records (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        hive_id TEXT NOT NULL,
        apiary_id TEXT,
        harvest_date TEXT NOT NULL,
        harvest_type TEXT DEFAULT 'HONEY',
        quantity REAL NOT NULL,
        unit TEXT DEFAULT 'KG',
        quality_rating INTEGER,
        notes TEXT,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE CASCADE
      );

      -- Disease Records Table
      CREATE TABLE IF NOT EXISTS disease_records (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        hive_id TEXT NOT NULL,
        disease_id TEXT NOT NULL,
        apiary_id TEXT,
        detected_date TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        treatment_notes TEXT,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (hive_id) REFERENCES hives (id) ON DELETE CASCADE
      );

      -- Products Table (Local Catalog)
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT
      );

      -- Listings Table (Marketplace)
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY NOT NULL,
        catalog_id TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        merchant_name TEXT,
        is_mine INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (catalog_id) REFERENCES products (id)
      );

      -- Disease Library (Synced from Server)
      CREATE TABLE IF NOT EXISTS disease_library (
        id TEXT PRIMARY KEY NOT NULL,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        symptoms TEXT,
        treatments TEXT,
        severity TEXT
      );

      -- Local Settings (Auth Tokens, etc)
      CREATE TABLE IF NOT EXISTS local_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
    `);
    console.log('Local Database Initialized Successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

export const getDB = () => db;

export default db;
