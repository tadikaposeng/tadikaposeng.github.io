// ============================================================
// api.js — API wrapper for Google Apps Script
// Note: Sends body as plain text (no Content-Type header)
//       to avoid CORS preflight on GAS endpoints.
// ============================================================

const API = (() => {
  async function call(action, payload = {}) {
    const session = Auth.getSession();
    const body = JSON.stringify({ action, payload, token: session?.token || '' });
    try {
      const res = await fetch(CONFIG.API_URL, { method: 'POST', body });
      const json = await res.json();
      return json;
    } catch (e) {
      return { success: false, message: 'เชื่อมต่อ API ไม่ได้: ' + e.message, data: null };
    }
  }

  return {
    // Auth
    register:      (p) => call('register',       p),
    login:         (p) => call('login',          p),
    logout:        ()  => call('logout',         {}),
    // Person
    searchPerson:  (q) => call('searchPerson',   { q }),
    getPerson:     (id)=> call('getPerson',      { personId: id }),
    addPerson:     (p) => call('addPerson',      p),
    updatePerson:  (p) => call('updatePerson',   p),
    // Relation
    addRelation:   (p) => call('addRelation',    p),
    getRelations:  (id)=> call('getRelations',   { personId: id }),
    deleteRelation:(id)=> call('deleteRelation', { relationId: id }),
    updateRelation:(p) => call('updateRelation', p),
    // Merge
    mergePerson:   (s,t)=> call('mergePerson',   { sourcePersonId: s, targetPersonId: t }),
    getMergeHistory:(id)=> call('getMergeHistory',{ personId: id }),
    // Upload
    uploadImage:   (p) => call('uploadImage',    p),
    // Admin
    adminGetUsers: ()  => call('adminGetUsers',  {}),
    adminAction:   (p) => call('adminAction',    p),
    getLogs:       ()  => call('getLogs',        {}),
    // Init
    init:          ()  => call('init',           {}),
  };
})();
