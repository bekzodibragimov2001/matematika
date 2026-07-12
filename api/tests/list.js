const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const { rows } = await sql`
    SELECT t.id, t.title, t.description, t.time_limit_minutes,
           COUNT(q.id)::int AS question_count
    FROM tests t
    LEFT JOIN questions q ON q.test_id = t.id
    WHERE t.is_active = true
    GROUP BY t.id
    HAVING COUNT(q.id) > 0
    ORDER BY t.created_at DESC;
  `;

  return res.status(200).json({ tests: rows });
};
