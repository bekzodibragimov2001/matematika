const { sql, ensureSchema } = require('../../lib/db');
const { readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensureSchema();
  const body = readJsonBody(req);
  const userId = Number(body.userId);
  const message = (body.message || "Bloklangan foydalanuvchi qayta faollashtirishni so'ramoqda").trim();

  if (!userId) {
    return res.status(400).json({ error: 'Foydalanuvchi aniqlanmadi' });
  }

  const { rows } = await sql`SELECT id, status FROM users WHERE id = ${userId};`;
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  }
  if (rows[0].status !== 'blocked') {
    return res.status(400).json({ error: 'Faqat bloklangan foydalanuvchilar so\'rov yubora oladi' });
  }

  const pending = await sql`
    SELECT id FROM access_requests
    WHERE user_id = ${userId} AND type = 'unblock_request' AND status = 'pending';
  `;
  if (pending.rows.length > 0) {
    return res.status(200).json({ message: "So'rovingiz allaqachon yuborilgan, javobni kuting." });
  }

  await sql`
    INSERT INTO access_requests (user_id, type, message)
    VALUES (${userId}, 'unblock_request', ${message});
  `;

  return res.status(201).json({ message: "So'rovingiz administratorga yuborildi." });
};
