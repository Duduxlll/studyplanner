import { createClient, type Client } from '@libsql/client';

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!_client) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('TURSO_DATABASE_URL não configurado no .env.local');
    }
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

/** Chame no início de cada API route. Inicializa tabelas uma vez e retorna o client. */
export async function ensureInit(): Promise<Client> {
  const db = getDb();
  if (!_initPromise) {
    _initPromise = runInit(db);
  }
  await _initPromise;
  return db;
}

async function runInit(db: Client): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      thumbnail TEXT,
      description TEXT,
      is_playlist INTEGER DEFAULT 0,
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      topics TEXT NOT NULL,
      hours_per_day REAL NOT NULL,
      total_days INTEGER NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS plan_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      day INTEGER NOT NULL,
      day_theme TEXT,
      title TEXT NOT NULL,
      youtube_url TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      description TEXT,
      channel_name TEXT,
      level TEXT DEFAULT 'básico',
      watched INTEGER DEFAULT 0,
      notes TEXT,
      order_in_day INTEGER DEFAULT 0,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS channel_videos_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      thumbnail TEXT,
      fetched_at TEXT DEFAULT (datetime('now')),
      UNIQUE(channel_id, video_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await runMigrations(db);
}

async function runMigrations(db: Client): Promise<void> {
  // users: bio e avatar_url
  const usInfo = await db.execute('PRAGMA table_info(users)');
  const usCols = usInfo.rows.map((r) => String(r.name));
  if (!usCols.includes('bio')) {
    await db.execute("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
  }
  if (!usCols.includes('avatar_url')) {
    await db.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''");
  }

  const pvInfo = await db.execute('PRAGMA table_info(plan_videos)');
  const pvCols = pvInfo.rows.map((r) => String(r.name));
  if (!pvCols.includes('notes')) {
    await db.execute('ALTER TABLE plan_videos ADD COLUMN notes TEXT');
  }
  if (!pvCols.includes('day_theme')) {
    await db.execute('ALTER TABLE plan_videos ADD COLUMN day_theme TEXT');
  }

  const chInfo = await db.execute('PRAGMA table_info(channels)');
  const chCols = chInfo.rows.map((r) => String(r.name));
  if (!chCols.includes('is_playlist')) {
    await db.execute('ALTER TABLE channels ADD COLUMN is_playlist INTEGER DEFAULT 0');
  }
  if (!chCols.includes('user_id')) {
    await db.execute("ALTER TABLE channels ADD COLUMN user_id TEXT NOT NULL DEFAULT ''");
  }

  const plInfo = await db.execute('PRAGMA table_info(plans)');
  const plCols = plInfo.rows.map((r) => String(r.name));
  if (!plCols.includes('user_id')) {
    await db.execute("ALTER TABLE plans ADD COLUMN user_id TEXT NOT NULL DEFAULT ''");
  }
}
