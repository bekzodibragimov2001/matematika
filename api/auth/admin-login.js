const { signToken, readJsonBody } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = readJsonBody(req);
  const username = (body.username || '').trim();
  const password = body.password || '';

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'mathadmin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mathadminpassword';

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }

  const token = signToken({ sub: 'admin', role: 'admin', username });

  return res.status(200).json({ token, admin: { username } });
};
