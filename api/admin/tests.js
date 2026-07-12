const { sql, ensureSchema } = require('../../lib/db');
const { requireAuth, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res, 'admin');
  if (!payload) return;

  await ensureSchema();

  if (req.method === 'GET') {
    const { rows } = await sql`
      SELECT t.id, t.title, t.description, t.time_limit_minutes, t.is_active, t.created_at,
             COUNT(q.id)::int AS question_count
      FROM tests t
      LEFT JOIN questions q ON q.test_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC;
    `;
    return res.status(200).json({ tests: rows });
  }

  if (req.method === 'POST') {
    const body = readJsonBody(req);
    const action = body.action; // 'create_test' | 'add_question' | 'toggle_active' | 'delete_test'

    if (action === 'create_test') {
      const { title, description, timeLimitMinutes } = body;
      if (!title) return res.status(400).json({ error: 'Test nomi kerak' });
      const result = await sql`
        INSERT INTO tests (title, description, time_limit_minutes)
        VALUES (${title}, ${description || ''}, ${timeLimitMinutes || 20})
        RETURNING id;
      `;
      return res.status(201).json({ testId: result.rows[0].id });
    }

    if (action === 'add_question') {
      const { testId, topic, questionText, questionMath, options, correctIndex, orderIndex } = body;
      if (!testId || !questionText || !Array.isArray(options) || options.length < 2 || correctIndex === undefined) {
        return res.status(400).json({ error: "Savol ma'lumotlari to'liq emas" });
      }
      const result = await sql`
        INSERT INTO questions (test_id, topic, question_text, question_math, options, correct_index, order_index)
        VALUES (${testId}, ${topic || 'Umumiy'}, ${questionText}, ${questionMath || ''}, ${JSON.stringify(options)}, ${correctIndex}, ${orderIndex || 0})
        RETURNING id;
      `;
      return res.status(201).json({ questionId: result.rows[0].id });
    }

    if (action === 'toggle_active') {
      const { testId } = body;
      if (!testId) return res.status(400).json({ error: 'testId kerak' });
      await sql`UPDATE tests SET is_active = NOT is_active WHERE id = ${testId};`;
      return res.status(200).json({ message: 'Bajarildi' });
    }

    if (action === 'delete_test') {
      const { testId } = body;
      if (!testId) return res.status(400).json({ error: 'testId kerak' });
      await sql`DELETE FROM tests WHERE id = ${testId};`;
      return res.status(200).json({ message: "O'chirildi" });
    }

    return res.status(400).json({ error: "Noma'lum action" });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
