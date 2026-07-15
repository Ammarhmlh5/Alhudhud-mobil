import 'dotenv/config';
import { initDb, queryOne, execute } from './db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

async function seed() {
  await initDb();

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', ['admin@alhudhud.com']);
  if (existing) {
    console.log('\n  ℹ️  Admin user already exists.\n');
    return;
  }

  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!adminPassword) {
    console.error('\n  ❌ ADMIN_DEFAULT_PASSWORD environment variable is not set.');
    console.error('  Set it in your .env file or pass it as an environment variable.\n');
    process.exit(1);
  }

  const adminId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await execute('INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)',
    [adminId, 'admin@alhudhud.com', 'Admin', hashedPassword, 'admin']);

  await execute('INSERT INTO subscriptions (user_id, plan, status) VALUES (?, ?, ?)',
    [adminId, 'business', 'active']);

  console.log('\n  ✅ Admin user created:');
  console.log('     Email: admin@alhudhud.com');
  console.log('     Password: [set via ADMIN_DEFAULT_PASSWORD]\n');
}

seed().catch(console.error);
