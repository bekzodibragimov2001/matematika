const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const userId = payload.sub;

  const userRows = await sql`SELECT * FROM users WHERE id = ${userId};`;
  if (userRows.rows.length === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const user = userRows.rows[0];

  const recentResults = await sql`
    SELECT ta.id, t.title AS test_title, ta.score, ta.total_questions, ta.finished_at, ta.status
    FROM test_attempts ta
    JOIN tests t ON t.id = ta.test_id
    WHERE ta.user_id = ${userId} AND ta.status = 'completed'
    ORDER BY ta.finished_at DESC
    LIMIT 5;
  `;

  const weakTopics = await sql`
    SELECT q.topic,
           COUNT(*)::int AS total,
           SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::int AS correct
    FROM answer_attempts aa
    JOIN questions q ON q.id = aa.question_id
    JOIN test_attempts ta ON ta.id = aa.attempt_id
    WHERE ta.user_id = ${userId}
    GROUP BY q.topic
    HAVING COUNT(*) > 0
    ORDER BY (SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::float / COUNT(*)) ASC
    LIMIT 3;
  `;

  const rankRows = await sql`
    SELECT username,
           RANK() OVER (ORDER BY total_score DESC) AS rnk,
           COUNT(*) OVER () AS total_users
    FROM users
    WHERE status = 'active';
  `;
  const myRank = rankRows.rows.find(r => r.username === user.username) || null;

  const availableTests = await sql`
    SELECT t.id, t.title, t.time_limit_minutes, COUNT(q.id)::int AS question_count
    FROM tests t LEFT JOIN questions q ON q.test_id = t.id
    WHERE t.is_active = true
    GROUP BY t.id HAVING COUNT(q.id) > 0
    ORDER BY t.created_at DESC LIMIT 4;
  `;

  return res.status(200).json({
    user: {
      fullName: user.full_name,
      username: user.username,
      totalScore: user.total_score
    },
    rank: myRank,
    recentResults: recentResults.rows,
    weakTopics: weakTopics.rows,
    availableTests: availableTests.rows
  });
};
