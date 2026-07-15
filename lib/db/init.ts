import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

interface Migration {
  id: string;
  description: string;
  up: () => void;
}

const migrations: Migration[] = [
  {
    id: '001_add_sync_queue_retry_count',
    description: 'Add retry_count column to sync_queue',
    up: () => {
      if (!db) return;
      try {
        db.runSync('ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER DEFAULT 0');
      } catch {}
    },
  },
];

function runMigrations(database: SQLite.SQLiteDatabase): void {
  database.execSync(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set(
    (database.getAllSync('SELECT id FROM _migrations ORDER BY id') as any[]).map(r => r.id)
  );

  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    try {
      console.debug(`[Migration] ${m.id} — ${m.description}`);
      m.up();
      database.runSync('INSERT INTO _migrations (id, description) VALUES (?, ?)', [m.id, m.description]);
      console.debug(`[Migration] ✅ ${m.id} applied.`);
    } catch (err) {
      console.error(`[Migration] ❌ ${m.id} failed:`, err);
    }
  }
}

export const initDatabase = () => {
  if (!db) {
    try {
      db = SQLite.openDatabaseSync('alhudhud_platform.db');
    } catch (error) {
      console.error('FATAL: Cannot open database:', error);
      return;
    }
  }

  try {
    db.execSync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS connectors (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        platform_type TEXT NOT NULL,
        protocol TEXT NOT NULL DEFAULT 'REST',
        endpoint_url TEXT NOT NULL,
        http_method TEXT DEFAULT 'POST',
        headers TEXT,
        auth_type TEXT DEFAULT 'NONE',
        auth_config TEXT,
        data_mapping TEXT,
        is_active INTEGER DEFAULT 1,
        last_status TEXT DEFAULT 'UNKNOWN',
        last_connected_at TEXT,
        sync_interval INTEGER,
        last_synced_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platforms (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY NOT NULL,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        status TEXT DEFAULT 'PENDING',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS message_logs (
        id TEXT PRIMARY KEY NOT NULL,
        connector_id TEXT,
        direction TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        payload TEXT,
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (connector_id) REFERENCES connectors (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS subscription_info (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS local_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_connectors_platform_type ON connectors(platform_type);
      CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON connectors(is_active);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_message_logs_connector_id ON message_logs(connector_id);
      CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);
      CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at);
    `);

    const version = db.getFirstSync('SELECT value FROM local_settings WHERE key = "schema_version"') as any;
    const currentVersion = version?.value ? parseInt(version.value) : 0;

    if (currentVersion < 1) {
      // Future migrations go here:
      // db.runSync('ALTER TABLE connectors ADD COLUMN new_column TEXT');
      db.runSync('INSERT OR REPLACE INTO local_settings (key, value) VALUES ("schema_version", "1")');
    }

    runMigrations(db!);

    cleanupMessageLogs();

    console.debug('Platform Database Initialized Successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

export const cleanupMessageLogs = (daysToKeep = 30) => {
  if (!db) return;
  try {
    const result = db.runSync(
      `DELETE FROM message_logs WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [daysToKeep]
    );
    if (result.changes > 0) {
      console.debug(`[DB] Cleaned up ${result.changes} message logs older than ${daysToKeep} days`);
    }
  } catch (error) {
    console.error('[DB] Failed to cleanup message logs:', error);
  }
};

export const getDB = () => db;

export default db;
