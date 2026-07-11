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

  const adminId = crypto.randomUUID();
  const adminPassword = await bcrypt.hash('AlHudhud@Admin#2024', 12);

  await execute('INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)',
    [adminId, 'admin@alhudhud.com', 'Admin', adminPassword, 'admin']);

  await execute('INSERT INTO subscriptions (user_id, plan, status) VALUES (?, ?, ?)',
    [adminId, 'business', 'active']);

  console.log('\n  ✅ Admin user created:');
  console.log('     Email: admin@alhudhud.com');
  console.log('     Password: AlHudhud@Admin#2024\n');
}

seed().catch(console.error);
