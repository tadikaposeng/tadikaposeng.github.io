// ============================================================
// Auth.gs — Register / Login / Logout
// ============================================================

function register(payload) {
  try {
    var username  = sanitize(payload.username);
    var password  = String(payload.password || '');
    var displayName = sanitize(payload.displayName);

    if (!username || !password || !displayName) return fail('กรุณากรอกข้อมูลให้ครบ');
    if (username.length < 3) return fail('username ต้องมีอย่างน้อย 3 ตัวอักษร');
    if (password.length < 6) return fail('password ต้องมีอย่างน้อย 6 ตัวอักษร');

    var sheet = getSheet('USERS');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === username.toLowerCase()) return fail('username นี้ถูกใช้แล้ว');
    }

    var userId = generateId();
    var now    = new Date().toISOString();
    sheet.appendRow([userId, username, hashPassword(password), displayName, 'member', 'active', now, '']);
    logActivity('register', 'สมัครสมาชิก: ' + username, userId);
    return ok({ userId, username, displayName, role: 'member' }, 'สมัครสมาชิกสำเร็จ');
  } catch(e) { return fail(e.message); }
}

function login(payload) {
  try {
    var username = sanitize(payload.username);
    var password = String(payload.password || '');
    if (!username || !password) return fail('กรุณากรอก username และ password');

    var sheet = getSheet('USERS');
    var data  = sheet.getDataRange().getValues();
    var hashed = hashPassword(password);

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase() === username.toLowerCase() && String(data[i][2]) === hashed) {
        if (String(data[i][5]) !== 'active') return fail('บัญชีนี้ถูกระงับการใช้งาน');
        var token = generateId();
        sheet.getRange(i + 1, 8).setValue(token); // col H = token
        logActivity('login', 'เข้าสู่ระบบ: ' + username, String(data[i][0]));
        return ok({ userId: String(data[i][0]), username: String(data[i][1]), displayName: String(data[i][3]), role: String(data[i][4]), token }, 'เข้าสู่ระบบสำเร็จ');
      }
    }
    return fail('username หรือ password ไม่ถูกต้อง');
  } catch(e) { return fail(e.message); }
}

function logout(payload, user) {
  try {
    if (!user) return ok(null, 'ออกจากระบบแล้ว');
    var sheet = getSheet('USERS');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === user.userId) {
        sheet.getRange(i + 1, 8).setValue('');
        break;
      }
    }
    logActivity('logout', 'ออกจากระบบ', user.userId);
    return ok(null, 'ออกจากระบบสำเร็จ');
  } catch(e) { return fail(e.message); }
}
