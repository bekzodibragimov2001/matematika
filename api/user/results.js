const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const { rows } = await sql`
    SELECT ta.id, t.title AS test_title, ta.score, ta.total_questions,
           ta.started_at, ta.finished_at, ta.status
    FROM test_attempts ta
    JOIN tests t ON t.id = ta.test_id
    WHERE ta.user_id = ${payload.sub}
    ORDER BY ta.started_at DESC;
  `;

  return res.status(200).json({ results: rows });
};
