const { sql, ensureSchema } = require('../../lib/db');
const { hashPassword, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensureSchema();
  const body = readJsonBody(req);
  const fullName = (body.fullName || '').trim();
  const username = (body.username || '').trim().toLowerCase();
  const email = (body.email || '').trim();
  const password = body.password || '';

  if (!fullName || !username || !password) {
    return res.status(400).json({ error: "Ism, login va parolni to'ldiring" });
  }
  if (username === 'mathadmin') {
    return res.status(400).json({ error: "Bu login band" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
  }

  const existing = await sql`SELECT id FROM users WHERE username = ${username};`;
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Bu login allaqachon mavjud' });
  }

  const passwordHash = await hashPassword(password);

  const inserted = await sql`
    INSERT INTO users (full_name, username, email, password_hash, status)
    VALUES (${fullName}, ${username}, ${email}, ${passwordHash}, 'pending')
    RETURNING id;
  `;
  const userId = inserted.rows[0].id;

  await sql`
    INSERT INTO access_requests (user_id, type, message)
    VALUES (${userId}, 'new_registration', 'Yangi foydalanuvchi ro''yxatdan o''tdi va tasdiqlashni kutmoqda');
  `;

  return res.status(201).json({
    message: "Ro'yxatdan o'tish so'rovi yuborildi. Administrator tasdig'idan so'ng tizimga kira olasiz."
  });
};
