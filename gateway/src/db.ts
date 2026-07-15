import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data', 'alhudhud.db');

let db: Database;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let isSaving = false;

// ─── Simple Mutex for write operations ─────────────────────

class WriteLock {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

const writeLock = new WriteLock();

// ─── SQL Translation (safe) ────────────────────────────────

function toSqlite(sql: string): string {
  // Only replace NOW() — avoid touching column values
  return sql.replace(/NOW\(\)/gi, "datetime('now')");
}

// ─── Database Initialization ───────────────────────────────

export async function initDb(): Promise<Database> {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // ─── Schema ─────────────────────────────────────────────

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      auth_provider TEXT DEFAULT 'email',
      google_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'free',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      platform_type TEXT DEFAULT 'custom',
      protocol TEXT DEFAULT 'HTTP',
      endpoint_url TEXT,
      http_method TEXT DEFAULT 'POST',
      headers TEXT DEFAULT '{}',
      auth_type TEXT DEFAULT 'NONE',
      auth_config TEXT DEFAULT '{}',
      data_mapping TEXT,
      sync_interval INTEGER,
      is_active INTEGER DEFAULT 1,
      last_status TEXT DEFAULT 'UNKNOWN',
      last_synced_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      connector_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      method TEXT DEFAULT 'POST',
      headers TEXT,
      body TEXT,
      source_ip TEXT,
      status TEXT DEFAULT 'received',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (connector_id) REFERENCES connectors(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      connector_id TEXT,
      direction TEXT DEFAULT 'SENT',
      status TEXT DEFAULT 'SUCCESS',
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      table_name TEXT,
      row_id TEXT,
      operation TEXT,
      data TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      serial_number TEXT,
      ip_address TEXT,
      device_name TEXT,
      device_model TEXT,
      os_name TEXT,
      os_version TEXT,
      app_version TEXT,
      is_active INTEGER DEFAULT 1,
      last_active_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_devices_api_key ON devices(api_key)');
  db.run('CREATE INDEX IF NOT EXISTS idx_connectors_user_id ON connectors(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_webhook_events_connector_id ON webhook_events(connector_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_message_logs_connector_id ON message_logs(connector_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sync_queue_user_id ON sync_queue(user_id)');

  db.run(`
    CREATE TABLE IF NOT EXISTS pairing_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      gateway_url TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_pairing_tokens_code ON pairing_tokens(code)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pairing_tokens_user_id ON pairing_tokens(user_id)');

  // Initial save
  saveDbSync();
  return db;
}

// ─── Database Save (with debounce) ────────────────────────

function saveDbSync(): void {
  if (!db) return;
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (error) {
    console.error('[DB] Failed to save database:', error);
  }
}

function scheduleSave(): void {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveDbSync();
  }, 200); // Save 200ms after last write
}

// ─── Database Access ──────────────────────────────────────

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function runQuery(sql: string, params: any[] = []): any[] {
  const translated = toSqlite(sql);
  let stmt;
  try {
    stmt = db.prepare(translated);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } catch (err: any) {
    throw new Error(`Query error: ${err.message}`);
  } finally {
    if (stmt) stmt.free();
  }
}

export function queryAll(sql: string, params: any[] = []): any[] {
  return runQuery(sql, params);
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = runQuery(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(
  sql: string,
  params: any[] = [],
  autoSave = true
): Promise<{ changes: number; lastInsertRowid: number }> {
  const translated = toSqlite(sql);
  await writeLock.acquire();
  try {
    db.run(translated, params);
    const changes = db.getRowsModified();
    let lastInsertRowid = 0;
    try {
      const row = db.exec('SELECT last_insert_rowid() as id');
      if (row.length > 0 && row[0].values.length > 0) {
        lastInsertRowid = row[0].values[0][0] as number;
      }
    } catch {
      // last_insert_rowid not available
    }
    if (autoSave) scheduleSave();
    return { changes, lastInsertRowid };
  } catch (err: any) {
    throw new Error(`Execute error: ${err.message}`);
  } finally {
    writeLock.release();
  }
}

export async function executeBatch(
  statements: Array<{ sql: string; params?: any[] }>
): Promise<void> {
  await writeLock.acquire();
  try {
    // Use transaction for atomicity
    db.run('BEGIN TRANSACTION');
    try {
      for (const stmt of statements) {
        const translated = toSqlite(stmt.sql);
        db.run(translated, stmt.params || []);
      }
      db.run('COMMIT');
      scheduleSave();
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  } catch (err: any) {
    throw new Error(`Batch error: ${err.message}`);
  } finally {
    writeLock.release();
  }
}

// ─── Cleanup ──────────────────────────────────────────────

export function closeDb(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  saveDbSync();
  if (db) {
    db.close();
  }
}
