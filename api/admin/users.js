const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res, 'admin');
  if (!payload) return;

  await ensureSchema();

  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT u.id, u.full_name, u.username, u.email, u.status, u.total_score,
             u.created_at, u.last_active_at,
             COUNT(ta.id)::int AS attempts_count,
             COALESCE(AVG(CASE WHEN ta.status = 'completed' AND ta.total_questions > 0
                          THEN ta.score::float / ta.total_questions * 100 END), 0) AS avg_percent
      FROM users u
      LEFT JOIN test_attempts ta ON ta.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC;
    `;
    return res.status(200).json({ users: rows });
  }

  if (req.method === 'POST') {
    const body = readJsonBody(req);
    const userId = Number(body.userId);
    const action = body.action; // 'block' | 'unblock' | 'delete'

    if (!userId || !['block', 'unblock', 'delete'].includes(action)) {
      return res.status(400).json({ error: "userId va to'g'ri action kerak" });
    }

    if (action === 'block') {
      await sql`UPDATE users SET status = 'blocked' WHERE id = ${userId};`;
    } else if (action === 'unblock') {
      await sql`UPDATE users SET status = 'active' WHERE id = ${userId};`;
    } else if (action === 'delete') {
      await sql`DELETE FROM users WHERE id = ${userId};`;
    }

    return res.status(200).json({ message: 'Bajarildi' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
