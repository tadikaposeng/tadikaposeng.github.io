// ============================================================
// Relation.gs — Add / Get Relations
// ============================================================

var REVERSE_MAP = {
  'parent':         'child',
  'child':          'parent',
  'spouse':         'spouse',
  'sibling':        'sibling',
  'adopted_parent': 'adopted_child',
  'adopted_child':  'adopted_parent'
};

function addRelation(payload, user) {
  try {
    requireAuth(user);
    var fromId = String(payload.fromPersonId || '');
    var toId   = String(payload.toPersonId   || '');
    var rtype  = String(payload.relationType || '');

    if (!fromId || !toId || !rtype) return fail('ข้อมูลไม่ครบ');
    if (fromId === toId) return fail('ไม่สามารถเพิ่มความสัมพันธ์กับตัวเองได้');
    if (!REVERSE_MAP[rtype]) return fail('ประเภทความสัมพันธ์ไม่ถูกต้อง');

    var sheet = getSheet('RELATIONS');
    var data  = sheet.getDataRange().getValues();

    // Check duplicate
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === fromId && String(data[i][2]) === toId && String(data[i][3]) === rtype && String(data[i][6]) === 'active') {
        return fail('ความสัมพันธ์นี้มีอยู่แล้ว');
      }
    }

    var now = new Date().toISOString();

    // Forward relation
    sheet.appendRow([generateId(), fromId, toId, rtype, user.userId, now, 'active']);

    // Reverse relation
    var reverseType = REVERSE_MAP[rtype];
    var hasReverse = false;
    for (var j = 1; j < data.length; j++) {
      if (String(data[j][1]) === toId && String(data[j][2]) === fromId && String(data[j][3]) === reverseType && String(data[j][6]) === 'active') {
        hasReverse = true; break;
      }
    }
    if (!hasReverse) {
      sheet.appendRow([generateId(), toId, fromId, reverseType, user.userId, now, 'active']);
    }

    logActivity('add_relation', fromId + ' → ' + rtype + ' → ' + toId, user.userId);
    return ok(null, 'เพิ่มความสัมพันธ์สำเร็จ');
  } catch(e) { return fail(e.message); }
}

function getRelations(payload) {
  try {
    var personId = String(payload.personId || '');
    if (!personId) return fail('ไม่พบ personId');

    var relSheet    = getSheet('RELATIONS');
    var personSheet = getSheet('PERSONS');
    var relData     = relSheet.getDataRange().getValues();
    var personData  = personSheet.getDataRange().getValues();

    // Build person lookup map
    var personMap = {};
    for (var p = 1; p < personData.length; p++) {
      personMap[String(personData[p][0])] = rowToPerson(personData[p]);
    }

    var results = [];
    for (var i = 1; i < relData.length; i++) {
      if (String(relData[i][1]) === personId && String(relData[i][6]) === 'active') {
        var toId = String(relData[i][2]);
        var toPerson = personMap[toId] || null;
        // Skip merged persons
        if (toPerson && toPerson.isMerged === 'true') {
          toId = toPerson.mergedTo;
          toPerson = personMap[toId] || null;
        }
        if (toPerson) {
          results.push({
            relationId:   String(relData[i][0]),
            fromPersonId: String(relData[i][1]),
            toPersonId:   toId,
            relationType: String(relData[i][3]),
            createdBy:    String(relData[i][4]),
            createdAt:    String(relData[i][5]),
            person:       toPerson
          });
        }
      }
    }
    return ok(results);
  } catch(e) { return fail(e.message); }
}
