// ============================================================
// Utils.gs — Shared utility functions
// ============================================================

var DRIVE_FOLDER_ID = '1QP0-DjZYAbIKRmU7ShhR_L7claOGjZ_I';

function generateId() {
  return Utilities.getUuid();
}

function hashPassword(password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function logActivity(action, detail, userId) {
  try {
    var sheet = getSheet('LOGS');
    sheet.appendRow([generateId(), action, String(detail || ''), String(userId || ''), new Date().toISOString()]);
  } catch(e) {}
}

// Validate token → return user object or null
function validateToken(token) {
  if (!token) return null;
  var sheet = getSheet('USERS');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][7]) === String(token) && String(data[i][5]) === 'active') {
      return { userId: String(data[i][0]), username: String(data[i][1]), displayName: String(data[i][3]), role: String(data[i][4]) };
    }
  }
  return null;
}

function requireAuth(user) {
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน');
}

function requireRole(user, role) {
  requireAuth(user);
  if (user.role !== role) throw new Error('ไม่มีสิทธิ์เข้าถึง');
}

function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
}

// Build object map from sheet: col[keyIndex] → row array
function sheetToMap(sheet, keyIndex) {
  var map = {};
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][keyIndex]);
    if (key) map[key] = data[i];
  }
  return map;
}

function ok(data, message) {
  return { success: true, message: message || '', data: data || null };
}

function fail(message) {
  return { success: false, message: message || 'เกิดข้อผิดพลาด', data: null };
}

// Initialize all sheets with headers + default admin
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schemas = {
    'USERS':    ['userId','username','passwordHash','displayName','role','status','createdAt','token'],
    'PERSONS':  ['personId','firstName','lastName','nickName','gender','birthDate','deathDate','phone','address','latitude','longitude','photoUrl','description','createdBy','createdAt','updatedAt','isMerged','mergedTo'],
    'RELATIONS':['relationId','fromPersonId','toPersonId','relationType','createdBy','createdAt','status'],
    'MERGES':   ['mergeId','sourcePersonId','targetPersonId','mergedBy','mergedAt'],
    'LOGS':     ['logId','action','detail','userId','createdAt'],
    'SETTINGS': ['key','value']
  };
  for (var name in schemas) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(schemas[name]);
      sheet.getRange(1,1,1,schemas[name].length).setBackground('#1a1a2e').setFontColor('#ffffff').setFontWeight('bold');
    }
  }
  // Default admin
  var userSheet = ss.getSheetByName('USERS');
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow([generateId(),'admin',hashPassword('admin123'),'ผู้ดูแลระบบ','admin','active',new Date().toISOString(),'']);
  }
  return ok(null, 'เริ่มต้นระบบสำเร็จ');
}
