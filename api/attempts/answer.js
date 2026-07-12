const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const body = readJsonBody(req);
  const attemptId = Number(body.attemptId);
  const questionId = Number(body.questionId);
  const selectedIndex = Number(body.selectedIndex);
  const timeSpentSeconds = Math.max(0, Number(body.timeSpentSeconds) || 0);

  if (!attemptId || !questionId || Number.isNaN(selectedIndex)) {
    return res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
  }

  const attemptRows = await sql`
    SELECT * FROM test_attempts WHERE id = ${attemptId} AND user_id = ${payload.sub};
  `;
  if (attemptRows.rows.length === 0) return res.status(404).json({ error: 'Urinish topilmadi' });
  const attempt = attemptRows.rows[0];
  if (attempt.status !== 'in_progress') {
    return res.status(400).json({ error: 'Bu urinish allaqachon yakunlangan' });
  }

  const qRows = await sql`SELECT * FROM questions WHERE id = ${questionId} AND test_id = ${attempt.test_id};`;
  if (qRows.rows.length === 0) return res.status(404).json({ error: 'Savol topilmadi' });
  const question = qRows.rows[0];

  const isCorrect = selectedIndex === question.correct_index;

  await sql`
    INSERT INTO answer_attempts (attempt_id, question_id, selected_index, is_correct, time_spent_seconds)
    VALUES (${attemptId}, ${questionId}, ${selectedIndex}, ${isCorrect}, ${timeSpentSeconds})
    ON CONFLICT (attempt_id, question_id)
    DO UPDATE SET selected_index = ${selectedIndex}, is_correct = ${isCorrect},
                  time_spent_seconds = ${timeSpentSeconds}, answered_at = now();
  `;

  return res.status(200).json({
    isCorrect,
    correctIndex: question.correct_index
  });
};
