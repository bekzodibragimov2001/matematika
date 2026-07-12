const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function getTokenFromReq(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Muvaffaqiyatli bo'lsa payload qaytaradi, aks holda null
function requireAuth(req, res, role) {
  const token = getTokenFromReq(req);
  if (!token) {
    res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (role && payload.role !== role) {
      res.status(403).json({ error: 'Ruxsat yo\'q' });
      return null;
    }
    return payload;
  } catch (e) {
    res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan' });
    return null;
  }
}

function readJsonBody(req) {
  // Vercel Node runtime odatda req.body ni avtomatik parse qiladi,
  // lekin xavfsizlik uchun fallback qo'shamiz.
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  readJsonBody
};
