const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res, 'admin');
  if (!payload) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const totals = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE status = 'active') AS active_users,
      (SELECT COUNT(*)::int FROM users WHERE status = 'pending') AS pending_users,
      (SELECT COUNT(*)::int FROM users WHERE status = 'blocked') AS blocked_users,
      (SELECT COUNT(*)::int FROM test_attempts) AS total_attempts,
      (SELECT COUNT(*)::int FROM test_attempts WHERE status = 'completed') AS completed_attempts,
      (SELECT COUNT(*)::int FROM tests WHERE is_active = true) AS active_tests;
  `;

  const todayAttempts = await sql`
    SELECT COUNT(*)::int AS c FROM test_attempts
    WHERE started_at >= date_trunc('day', now());
  `;

  const avgScore = await sql`
    SELECT COALESCE(AVG(score::float / NULLIF(total_questions,0) * 100), 0) AS avg_percent
    FROM test_attempts WHERE status = 'completed';
  `;

  const topUsers = await sql`
    SELECT full_name, username, total_score
    FROM users
    WHERE status = 'active'
    ORDER BY total_score DESC
    LIMIT 10;
  `;

  const weakestTopicsOverall = await sql`
    SELECT q.topic,
           COUNT(*)::int AS total,
           SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::int AS correct
    FROM answer_attempts aa
    JOIN questions q ON q.id = aa.question_id
    GROUP BY q.topic
    ORDER BY (SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0)) ASC
    LIMIT 5;
  `;

  const recentActivity = await sql`
    SELECT u.full_name, u.username, ta.score, ta.total_questions, ta.status, ta.started_at, t.title AS test_title
    FROM test_attempts ta
    JOIN users u ON u.id = ta.user_id
    JOIN tests t ON t.id = ta.test_id
    ORDER BY ta.started_at DESC
    LIMIT 15;
  `;

  return res.status(200).json({
    totals: totals.rows[0],
    attemptsToday: todayAttempts.rows[0].c,
    avgScorePercent: avgScore.rows[0].avg_percent,
    topUsers: topUsers.rows,
    weakestTopicsOverall: weakestTopicsOverall.rows,
    recentActivity: recentActivity.rows
  });
};
