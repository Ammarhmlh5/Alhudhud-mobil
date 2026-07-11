import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data', 'alhudhud.db');

let db: Database;

function toSqlite(sql: string): string {
  let s = sql.replace(/NOW\(\)/gi, "datetime('now')");
  s = s.replace(/=\s*true\b/gi, '= 1');
  s = s.replace(/=\s*false\b/gi, '= 0');
  return s;
}

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

  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function runQuery(sql: string, params: any[] = []): any[] {
  const translated = toSqlite(sql);
  try {
    const stmt = db.prepare(translated);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (err: any) {
    throw new Error(`Query error: ${err.message}\nSQL: ${translated}`);
  }
}

export function queryAll(sql: string, params: any[] = []): any[] {
  return runQuery(sql, params);
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = runQuery(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(
  sql: string,
  params: any[] = [],
  autoSave = true
): { changes: number; lastInsertRowid: number } {
  const translated = toSqlite(sql);
  try {
    db.run(translated, params);
    const changes = db.getRowsModified();
    let lastInsertRowid = 0;
    try {
      const row = db.exec('SELECT last_insert_rowid() as id');
      if (row.length > 0 && row[0].values.length > 0) {
        lastInsertRowid = row[0].values[0][0] as number;
      }
    } catch {}
    if (autoSave) saveDb();
    return { changes, lastInsertRowid };
  } catch (err: any) {
    throw new Error(`Execute error: ${err.message}\nSQL: ${translated}`);
  }
}

export function executeBatch(
  statements: Array<{ sql: string; params?: any[] }>
): void {
  try {
    for (const stmt of statements) {
      execute(stmt.sql, stmt.params || [], false);
    }
    saveDb();
  } catch (err: any) {
    throw new Error(`Batch error: ${err.message}`);
  }
}
