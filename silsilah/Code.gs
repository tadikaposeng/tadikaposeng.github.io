// ============================================================
// Code.gs — Main entry point for Google Apps Script Web App
// ============================================================
// Deploy as: Execute as ME, Who has access: ANYONE
// ============================================================

function doGet(e) {
  var param = e ? (e.parameter || {}) : {};
  if (param.init === 'true') return jsonOut(initSheets());
  return jsonOut({ success: true, message: 'Family Graph API is running', data: null });
}

function doPost(e) {
  try {
    var request = JSON.parse(e.postData.contents);
    var action  = String(request.action  || '');
    var payload = request.payload || {};
    var token   = String(request.token   || '');
    var user    = validateToken(token);
    return jsonOut(handleRequest(action, payload, user));
  } catch(err) {
    return jsonOut({ success: false, message: err.message, data: null });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(action, payload, user) {
  switch(action) {
    // ─── Auth ───────────────────────────────────
    case 'register':       return register(payload);
    case 'login':          return login(payload);
    case 'logout':         return logout(payload, user);

    // ─── Person ─────────────────────────────────
    case 'searchPerson':   return searchPerson(payload);
    case 'getPerson':      return getPerson(payload);
    case 'addPerson':      return addPerson(payload, user);
    case 'updatePerson':   return updatePerson(payload, user);

    // ─── Relation ───────────────────────────────
    case 'addRelation':    return addRelation(payload, user);
    case 'getRelations':   return getRelations(payload);
    case 'deleteRelation': return deleteRelation(payload, user);
    case 'updateRelation': return updateRelation(payload, user);

    // ─── Merge ──────────────────────────────────
    case 'mergePerson':    return mergePerson(payload, user);
    case 'getMergeHistory':return getMergeHistory(payload);

    // ─── Upload ─────────────────────────────────
    case 'uploadImage':    return uploadImage(payload, user);

    // ─── Admin ──────────────────────────────────
    case 'adminGetUsers':  return adminGetUsers(user);
    case 'adminAction':    return adminAction(payload, user);
    case 'getLogs':        return getLogs(user);

    // ─── Init ───────────────────────────────────
    case 'init':           return initSheets();

    default: return fail('Unknown action: ' + action);
  }
}
