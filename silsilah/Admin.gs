// ============================================================
// Admin.gs — Admin management functions
// ============================================================

function adminGetUsers(user) {
  try {
    requireRole(user, 'admin');
    var sheet = getSheet('USERS');
    var data  = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) {
      results.push({
        userId:      String(data[i][0]),
        username:    String(data[i][1]),
        displayName: String(data[i][3]),
        role:        String(data[i][4]),
        status:      String(data[i][5]),
        createdAt:   String(data[i][6])
      });
    }
    return ok(results);
  } catch(e) { return fail(e.message); }
}

function adminAction(payload, user) {
  try {
    requireRole(user, 'admin');
    var targetUserId = String(payload.targetUserId || '');
    var action       = String(payload.action || '');
    if (!targetUserId || !action) return fail('ข้อมูลไม่ครบ');

    var sheet = getSheet('USERS');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === targetUserId) {
        switch(action) {
          case 'suspend':  sheet.getRange(i+1,6).setValue('suspended');  break;
          case 'activate': sheet.getRange(i+1,6).setValue('active');     break;
          case 'makeAdmin':sheet.getRange(i+1,5).setValue('admin');      break;
          case 'makeMember':sheet.getRange(i+1,5).setValue('member');    break;
          default: return fail('action ไม่ถูกต้อง');
        }
        logActivity('admin_action', action + ' → ' + targetUserId, user.userId);
        return ok(null, 'ดำเนินการสำเร็จ');
      }
    }
    return fail('ไม่พบผู้ใช้');
  } catch(e) { return fail(e.message); }
}

function getLogs(user) {
  try {
    requireRole(user, 'admin');
    var sheet = getSheet('LOGS');
    var data  = sheet.getDataRange().getValues();
    var results = [];
    // Return latest 200 logs (reversed)
    var start = Math.max(1, data.length - 200);
    for (var i = data.length - 1; i >= start; i--) {
      results.push({ logId: String(data[i][0]), action: String(data[i][1]), detail: String(data[i][2]), userId: String(data[i][3]), createdAt: String(data[i][4]) });
    }
    return ok(results);
  } catch(e) { return fail(e.message); }
}
