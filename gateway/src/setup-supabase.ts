import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('\n❌ SUPABASE_DB_URL not set in gateway/.env');
    console.error('\nGet your connection string from:');
    console.error('  Supabase Dashboard → Project Settings → Database → Connection string → URI (Direct)');
    console.error('\nThen add to gateway/.env:');
    console.error('  SUPABASE_DB_URL=postgresql://postgres.xxxx:your-password@db.xxx.supabase.co:5432/postgres\n');
    process.exit(1);
  }

  console.log('Connecting to Supabase PostgreSQL...');

  // Parse connection URL to check for SSL
  const isRemoteHost = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

  const client = new Client({
    connectionString: dbUrl,
    ssl: isRemoteHost
      ? { rejectUnauthorized: process.env.NODE_ENV !== 'development' }
      : false,
  });

  try {
    await client.connect();
    console.log('Connected!\n');

    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error(`\n❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Running schema.sql...');
    await client.query(sql);
    console.log('All tables created successfully!\n');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
  } catch (err: any) {
    console.error('Error:', err.message);
    if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      console.error('\nHint: Make sure the Supabase database is running and accessible.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
