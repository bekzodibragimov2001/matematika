const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res, 'admin');
  if (!payload) return;

  await ensureSchema();

  if (req.method === 'GET') {
    const status = (req.query && req.query.status) || 'pending';
    const { rows } = await sql`
      SELECT ar.id, ar.type, ar.message, ar.status, ar.created_at, ar.reviewed_at,
             u.id AS user_id, u.full_name, u.username, u.email, u.status AS user_status
      FROM access_requests ar
      JOIN users u ON u.id = ar.user_id
      WHERE ar.status = ${status}
      ORDER BY ar.created_at DESC;
    `;
    return res.status(200).json({ requests: rows });
  }

  if (req.method === 'POST') {
    const body = readJsonBody(req);
    const requestId = Number(body.requestId);
    const action = body.action; // 'approve' | 'reject'

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "requestId va to'g'ri action kerak" });
    }

    const { rows } = await sql`SELECT * FROM access_requests WHERE id = ${requestId};`;
    if (rows.length === 0) {
      return res.status(404).json({ error: "So'rov topilmadi" });
    }
    const request = rows[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Bu so'rov allaqachon ko'rib chiqilgan" });
    }

    const newRequestStatus = action === 'approve' ? 'approved' : 'rejected';
    await sql`
      UPDATE access_requests SET status = ${newRequestStatus}, reviewed_at = now()
      WHERE id = ${requestId};
    `;

    if (action === 'approve') {
      await sql`UPDATE users SET status = 'active' WHERE id = ${request.user_id};`;
    } else if (request.type === 'new_registration') {
      // Yangi ro'yxatdan o'tish rad etilsa, foydalanuvchi bloklangan holatda qoladi
      await sql`UPDATE users SET status = 'blocked' WHERE id = ${request.user_id};`;
    }

    return res.status(200).json({ message: 'Amal bajarildi' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
