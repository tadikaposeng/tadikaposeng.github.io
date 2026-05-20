// ============================================================
// Person.gs — Add / Get / Search / Update Person
// ============================================================

// Columns: 0=personId 1=firstName 2=lastName 3=nickName 4=gender
//          5=birthDate 6=deathDate 7=phone 8=address 9=latitude
//          10=longitude 11=photoUrl 12=description 13=createdBy
//          14=createdAt 15=updatedAt 16=isMerged 17=mergedTo

function rowToPerson(row) {
  return {
    personId:    String(row[0]),
    firstName:   String(row[1]),
    lastName:    String(row[2]),
    nickName:    String(row[3]),
    gender:      String(row[4]),
    birthDate:   String(row[5]),
    deathDate:   String(row[6]),
    phone:       String(row[7]),
    address:     String(row[8]),
    latitude:    String(row[9]),
    longitude:   String(row[10]),
    photoUrl:    String(row[11]),
    description: String(row[12]),
    createdBy:   String(row[13]),
    createdAt:   String(row[14]),
    updatedAt:   String(row[15]),
    isMerged:    String(row[16]),
    mergedTo:    String(row[17])
  };
}

function searchPerson(payload) {
  try {
    var q = sanitize(payload.q || '').toLowerCase();
    if (!q) return ok([], 'กรุณาใส่คำค้นหา');
    var sheet = getSheet('PERSONS');
    var data  = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][16]) === 'true') continue; // skip merged
      var fn = String(data[i][1]).toLowerCase();
      var ln = String(data[i][2]).toLowerCase();
      var nn = String(data[i][3]).toLowerCase();
      if (fn.includes(q) || ln.includes(q) || nn.includes(q)) {
        results.push(rowToPerson(data[i]));
        if (results.length >= 50) break;
      }
    }
    return ok(results);
  } catch(e) { return fail(e.message); }
}

function getPerson(payload) {
  try {
    var personId = String(payload.personId || '');
    if (!personId) return fail('ไม่พบ personId');
    var sheet = getSheet('PERSONS');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === personId) {
        // Follow merge redirect
        if (String(data[i][16]) === 'true' && data[i][17]) {
          return getPerson({ personId: String(data[i][17]) });
        }
        return ok(rowToPerson(data[i]));
      }
    }
    return fail('ไม่พบข้อมูลบุคคล');
  } catch(e) { return fail(e.message); }
}

function addPerson(payload, user) {
  try {
    requireAuth(user);
    var firstName = sanitize(payload.firstName || '');
    if (!firstName) return fail('กรุณาใส่ชื่อ');
    var sheet = getSheet('PERSONS');
    var personId = generateId();
    var now = new Date().toISOString();
    sheet.appendRow([
      personId,
      firstName,
      sanitize(payload.lastName   || ''),
      sanitize(payload.nickName   || ''),
      sanitize(payload.gender     || ''),
      sanitize(payload.birthDate  || ''),
      sanitize(payload.deathDate  || ''),
      String(payload.phone        || ''),  // phone as string
      sanitize(payload.address    || ''),
      sanitize(payload.latitude   || ''),
      sanitize(payload.longitude  || ''),
      sanitize(payload.photoUrl   || ''),
      sanitize(payload.description|| ''),
      user.userId,
      now, now, 'false', ''
    ]);
    logActivity('add_person', 'เพิ่มบุคคล: ' + firstName, user.userId);
    return ok({ personId, firstName }, 'เพิ่มข้อมูลสำเร็จ');
  } catch(e) { return fail(e.message); }
}

function updatePerson(payload, user) {
  try {
    requireAuth(user);
    var personId = String(payload.personId || '');
    if (!personId) return fail('ไม่พบ personId');
    var sheet = getSheet('PERSONS');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === personId) {
        var now = new Date().toISOString();
        var fields = ['firstName','lastName','nickName','gender','birthDate','deathDate','phone','address','latitude','longitude','photoUrl','description'];
        var cols   = [2,3,4,5,6,7,8,9,10,11,12,13]; // 1-indexed col numbers
        for (var k = 0; k < fields.length; k++) {
          if (payload[fields[k]] !== undefined) {
            var val = fields[k] === 'phone' ? String(payload[fields[k]]) : sanitize(payload[fields[k]]);
            sheet.getRange(i + 1, cols[k]).setValue(val);
          }
        }
        sheet.getRange(i + 1, 16).setValue(now); // updatedAt
        logActivity('update_person', 'แก้ไขบุคคล: ' + personId, user.userId);
        return ok({ personId }, 'อัปเดตสำเร็จ');
      }
    }
    return fail('ไม่พบข้อมูลบุคคล');
  } catch(e) { return fail(e.message); }
}
