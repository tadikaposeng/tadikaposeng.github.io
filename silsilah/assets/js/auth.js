// ============================================================
// auth.js — Session management via localStorage
// ============================================================

const Auth = (() => {
  const KEY = 'fg_session';

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch { return null; }
  }

  function setSession(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('auth-change', { detail: data }));
  }

  function clearSession() {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent('auth-change', { detail: null }));
  }

  async function login(username, password) {
    const res = await API.login({ username, password });
    if (res.success) setSession(res.data);
    return res;
  }

  async function register(username, password, displayName) {
    const res = await API.register({ username, password, displayName });
    if (res.success) setSession(res.data);
    return res;
  }

  async function logout() {
    await API.logout();
    clearSession();
  }

  function isLoggedIn()  { return !!getSession(); }
  function isAdmin()     { return getSession()?.role === 'admin'; }
  function isMember()    { return !!getSession(); }
  function getUser()     { return getSession(); }
  function displayName() { return getSession()?.displayName || ''; }

  return { getSession, login, register, logout, isLoggedIn, isAdmin, isMember, getUser, displayName };
})();
