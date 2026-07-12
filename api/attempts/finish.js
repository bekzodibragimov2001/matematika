const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth, readJsonBody } = require('../../lib/auth');

const POINTS_PER_CORRECT = 5;

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const body = readJsonBody(req);
  const attemptId = Number(body.attemptId);
  if (!attemptId) return res.status(400).json({ error: 'attemptId kerak' });

  const attemptRows = await sql`
    SELECT * FROM test_attempts WHERE id = ${attemptId} AND user_id = ${payload.sub};
  `;
  if (attemptRows.rows.length === 0) return res.status(404).json({ error: 'Urinish topilmadi' });
  const attempt = attemptRows.rows[0];

  if (attempt.status === 'completed') {
    return res.status(200).json({ score: attempt.score, totalQuestions: attempt.total_questions });
  }

  const correctCount = await sql`
    SELECT COUNT(*)::int AS c FROM answer_attempts
    WHERE attempt_id = ${attemptId} AND is_correct = true;
  `;
  const score = correctCount.rows[0].c * POINTS_PER_CORRECT;

  await sql`
    UPDATE test_attempts SET status = 'completed', finished_at = now(), score = ${score}
    WHERE id = ${attemptId};
  `;

  await sql`
    UPDATE users SET total_score = total_score + ${score}, last_active_at = now()
    WHERE id = ${payload.sub};
  `;

  return res.status(200).json({ score, totalQuestions: attempt.total_questions });
};
