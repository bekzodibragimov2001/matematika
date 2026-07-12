const TOKEN_KEY = 'mp_token';
const USER_KEY = 'mp_user';
const ADMIN_TOKEN_KEY = 'mp_admin_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }
function setAdminToken(t) { localStorage.setItem(ADMIN_TOKEN_KEY, t); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function api(path, { method = 'GET', body, admin = false } = {}) {
    const token = admin ? getAdminToken() : getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    let data = {};
    try { data = await resp.json(); } catch { data = {}; }

    if (!resp.ok) {
        const err = new Error(data.message || data.error || 'Xatolik yuz berdi');
        err.status = resp.status;
        err.data = data;
        throw err;
    }
    return data;
}

function showToast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerText = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}
