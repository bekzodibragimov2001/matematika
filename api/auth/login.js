const { sql, ensureSchema } = require('../../lib/db');
const { verifyPassword, signToken, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensureSchema();
  const body = readJsonBody(req);
  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Login va parolni kiriting' });
  }

  const { rows } = await sql`SELECT * FROM users WHERE username = ${username};`;
  if (rows.length === 0) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  const user = rows[0];
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'PENDING',
      message: "Hisobingiz hali administrator tomonidan tasdiqlanmagan. Iltimos, kuting."
    });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({
      error: 'BLOCKED',
      message: "Hisobingiz bloklangan. Qayta faollashtirish uchun so'rov yuborishingiz mumkin.",
      userId: user.id
    });
  }

  await sql`UPDATE users SET last_active_at = now() WHERE id = ${user.id};`;

  const token = signToken({ sub: user.id, role: 'student', username: user.username });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      totalScore: user.total_score
    }
  });
};
