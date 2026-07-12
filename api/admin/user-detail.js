const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res, 'admin');
  if (!payload) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const userId = Number(req.query.userId);
  if (!userId) return res.status(400).json({ error: 'userId kerak' });

  const userRows = await sql`SELECT * FROM users WHERE id = ${userId};`;
  if (userRows.rows.length === 0) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const user = userRows.rows[0];

  const attempts = await sql`
    SELECT ta.id, ta.test_id, t.title AS test_title, ta.score, ta.total_questions,
           ta.started_at, ta.finished_at, ta.status
    FROM test_attempts ta
    JOIN tests t ON t.id = ta.test_id
    WHERE ta.user_id = ${userId}
    ORDER BY ta.started_at DESC;
  `;

  // Har bir savolga sarflangan o'rtacha vaqt va tezlik
  const timing = await sql`
    SELECT AVG(aa.time_spent_seconds)::int AS avg_time_seconds,
           COUNT(*)::int AS answered_count,
           SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::int AS correct_count
    FROM answer_attempts aa
    JOIN test_attempts ta ON ta.id = aa.attempt_id
    WHERE ta.user_id = ${userId};
  `;

  // Zaif mavzular: mavzu bo'yicha noto'g'ri javoblar ulushi
  const weakTopics = await sql`
    SELECT q.topic,
           COUNT(*)::int AS total,
           SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::int AS correct
    FROM answer_attempts aa
    JOIN questions q ON q.id = aa.question_id
    JOIN test_attempts ta ON ta.id = aa.attempt_id
    WHERE ta.user_id = ${userId}
    GROUP BY q.topic
    ORDER BY (SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0)) ASC;
  `;

  // Boshqa faol foydalanuvchilar orasida reyting (umumiy ball bo'yicha)
  const rankRows = await sql`
    SELECT username, total_score,
           RANK() OVER (ORDER BY total_score DESC) AS rnk,
           COUNT(*) OVER () AS total_users
    FROM users
    WHERE status = 'active';
  `;
  const myRank = rankRows.rows.find(r => r.username === user.username) || null;

  return res.status(200).json({
    user: {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      email: user.email,
      status: user.status,
      totalScore: user.total_score,
      createdAt: user.created_at,
      lastActiveAt: user.last_active_at
    },
    attempts: attempts.rows,
    timing: timing.rows[0],
    weakTopics: weakTopics.rows,
    rank: myRank
  });
};
