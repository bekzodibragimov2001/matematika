const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const body = readJsonBody(req);
  const testId = Number(body.testId);
  if (!testId) return res.status(400).json({ error: 'testId kerak' });

  const testRows = await sql`SELECT * FROM tests WHERE id = ${testId} AND is_active = true;`;
  if (testRows.rows.length === 0) return res.status(404).json({ error: 'Test topilmadi' });
  const test = testRows.rows[0];

  const questionRows = await sql`
    SELECT id, topic, question_text, question_math, options, order_index
    FROM questions WHERE test_id = ${testId} ORDER BY order_index ASC;
  `;
  if (questionRows.rows.length === 0) return res.status(400).json({ error: "Testda savollar yo'q" });

  const attempt = await sql`
    INSERT INTO test_attempts (user_id, test_id, total_questions, status)
    VALUES (${payload.sub}, ${testId}, ${questionRows.rows.length}, 'in_progress')
    RETURNING id, started_at;
  `;

  return res.status(201).json({
    attemptId: attempt.rows[0].id,
    startedAt: attempt.rows[0].started_at,
    test: {
      id: test.id,
      title: test.title,
      timeLimitMinutes: test.time_limit_minutes
    },
    questions: questionRows.rows.map(q => ({
      id: q.id,
      topic: q.topic,
      text: q.question_text,
      math: q.question_math,
      options: q.options
    }))
  });
};
