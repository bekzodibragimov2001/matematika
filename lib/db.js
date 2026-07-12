const { sql } = require('@vercel/postgres');

let schemaReady = false;

// Barcha jadvallarni birinchi so'rovda avtomatik yaratadi (agar mavjud bo'lmasa).
// Bu Vercel serverless muhitida alohida migratsiya skriptisiz ishlashni osonlashtiradi.
async function ensureSchema() {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | active | blocked
      total_score INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_active_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS access_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- new_registration | unblock_request
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed_at TIMESTAMPTZ
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      time_limit_minutes INTEGER NOT NULL DEFAULT 20,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      topic TEXT NOT NULL DEFAULT 'Umumiy',
      question_text TEXT NOT NULL,
      question_math TEXT,
      options JSONB NOT NULL,
      correct_index INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS test_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      score INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress' -- in_progress | completed
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS answer_attempts (
      id SERIAL PRIMARY KEY,
      attempt_id INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_index INTEGER,
      is_correct BOOLEAN NOT NULL DEFAULT false,
      time_spent_seconds INTEGER NOT NULL DEFAULT 0,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(attempt_id, question_id)
    );
  `;

  // Agar hali hech qanday test bo'lmasa, namuna sifatida bitta test va savollarni qo'shamiz
  const { rows } = await sql`SELECT COUNT(*)::int AS c FROM tests;`;
  if (rows[0].c === 0) {
    const test = await sql`
      INSERT INTO tests (title, description, time_limit_minutes)
      VALUES ('Boshlang''ich algebra asoslari', 'Kasrlar, tenglamalar va asosiy amallar bo''yicha test', 20)
      RETURNING id;
    `;
    const testId = test.rows[0].id;

    const seed = [
      {
        topic: 'Kasrlar',
        text: "Doira 8 ta teng qismga bo'linib, undan 3 tasi bo'yalgan. Bo'yalgan qismning ulushi qancha?",
        math: 'S_{bo\'yalgan} = ?',
        options: ['\\frac{3}{8}', '\\frac{5}{8}', '\\frac{1}{4}', '0.38'],
        correct: 0
      },
      {
        topic: 'Integral',
        text: 'Quyidagi aniq integralni hisoblang:',
        math: '\\int_{0}^{\\pi/2} \\cos(x)\\,dx',
        options: ['0', '1', '\\pi', '-1'],
        correct: 1
      },
      {
        topic: 'Kvadrat tenglamalar',
        text: 'Kvadrat tenglamaning ildizlarini toping:',
        math: 'x^2 - 5x + 6 = 0',
        options: ['x_1=1, x_2=6', 'x_1=-2, x_2=-3', 'x_1=2, x_2=3', 'x_1=0, x_2=5'],
        correct: 2
      },
      {
        topic: 'Geometriya',
        text: "Muntazam to'rtburchakli piramidaning hajmi qanday formula bilan topiladi?",
        math: 'V = ?',
        options: ['V = a^2 h', 'V = \\frac{1}{3} a^2 h', 'V = \\frac{1}{2} a h', 'V = \\pi r^2 h'],
        correct: 1
      }
    ];

    for (let i = 0; i < seed.length; i++) {
      const q = seed[i];
      await sql`
        INSERT INTO questions (test_id, topic, question_text, question_math, options, correct_index, order_index)
        VALUES (${testId}, ${q.topic}, ${q.text}, ${q.math}, ${JSON.stringify(q.options)}, ${q.correct}, ${i});
      `;
    }
  }

  schemaReady = true;
}

module.exports = { sql, ensureSchema };
