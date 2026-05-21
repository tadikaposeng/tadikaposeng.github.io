// ============================================================
// Relation.gs — Add / Get / Delete / Update Relations
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

    // ── Auto-sibling: หา parent และ child จาก relation ที่เพิ่ม ──
    // parentId = คนที่เป็นพ่อ/แม่, newChildId = ลูกใหม่
    var parentId   = null;
    var newChildId = null;
    if (rtype === 'child') {
      // fromId เป็นพ่อ/แม่, toId เป็นลูกใหม่
      parentId   = fromId;
      newChildId = toId;
    } else if (rtype === 'parent') {
      // fromId เป็นลูกใหม่, toId เป็นพ่อ/แม่
      parentId   = toId;
      newChildId = fromId;
    }

    if (parentId && newChildId) {
      // โหลดข้อมูลล่าสุดหลังเพิ่ม forward+reverse แล้ว
      var freshData = sheet.getDataRange().getValues();
      // หาลูกคนอื่นทั้งหมดของ parentId
      var siblings = [];
      for (var s = 1; s < freshData.length; s++) {
        if (String(freshData[s][6]) !== 'active') continue;
        if (String(freshData[s][1]) === parentId && String(freshData[s][3]) === 'child') {
          var sibId = String(freshData[s][2]);
          if (sibId !== newChildId) siblings.push(sibId);
        }
      }
      // สร้าง sibling ระหว่าง newChildId กับทุกคนใน siblings
      for (var k = 0; k < siblings.length; k++) {
        _ensureSibling(sheet, newChildId, siblings[k], user.userId, now);
      }
    }

    logActivity('add_relation', fromId + ' → ' + rtype + ' → ' + toId, user.userId);
    return ok(null, 'เพิ่มความสัมพันธ์สำเร็จ');
  } catch(e) { return fail(e.message); }
}

// Helper: สร้าง sibling สองทิศทางหากยังไม่มี
function _ensureSibling(sheet, aId, bId, userId, now) {
  var existing = sheet.getDataRange().getValues();
  var hasAB = false, hasBA = false;
  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][6]) !== 'active') continue;
    if (String(existing[i][1]) === aId && String(existing[i][2]) === bId && String(existing[i][3]) === 'sibling') hasAB = true;
    if (String(existing[i][1]) === bId && String(existing[i][2]) === aId && String(existing[i][3]) === 'sibling') hasBA = true;
  }
  if (!hasAB) sheet.appendRow([generateId(), aId, bId, 'sibling', userId, now, 'active']);
  if (!hasBA) sheet.appendRow([generateId(), bId, aId, 'sibling', userId, now, 'active']);
}



function getRelations(payload) {
  try {
    var personId = String(payload.personId || '');
    if (!personId) return fail('ไม่พบ personId');

    var relSheet    = getSheet('RELATIONS');
    var personSheet = getSheet('PERSONS');
    var relData     = relSheet.getDataRange().getValues();
    var personData  = personSheet.getDataRange().getValues();

    // Build person lookup map (with displayName)
    var usersMap  = getUsersMap();
    var personMap = {};
    for (var p = 1; p < personData.length; p++) {
      personMap[String(personData[p][0])] = rowToPerson(personData[p], usersMap);
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

// ── Delete a relation (soft-delete forward + reverse) ──────
function deleteRelation(payload, user) {
  try {
    requireAuth(user);
    var relationId = String(payload.relationId || '');
    if (!relationId) return fail('ไม่พบ relationId');

    var sheet = getSheet('RELATIONS');
    var data  = sheet.getDataRange().getValues();

    var fromId = null, toId = null, rtype = null, targetRow = -1;

    // Find the forward relation row
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === relationId) {
        fromId     = String(data[i][1]);
        toId       = String(data[i][2]);
        rtype      = String(data[i][3]);
        targetRow  = i + 1; // 1-indexed for sheet
        break;
      }
    }
    if (targetRow < 0) return fail('ไม่พบความสัมพันธ์');

    // Soft-delete forward row
    sheet.getRange(targetRow, 7).setValue('deleted');

    // Soft-delete reverse row
    var reverseType = REVERSE_MAP[rtype];
    for (var j = 1; j < data.length; j++) {
      if (
        String(data[j][1]) === toId &&
        String(data[j][2]) === fromId &&
        String(data[j][3]) === reverseType &&
        String(data[j][6]) === 'active'
      ) {
        sheet.getRange(j + 1, 7).setValue('deleted');
        break;
      }
    }

    logActivity('delete_relation', fromId + ' → ' + rtype + ' → ' + toId, user.userId);
    return ok(null, 'ลบความสัมพันธ์สำเร็จ');
  } catch(e) { return fail(e.message); }
}

// ── Update a relation type ─────────────────────────────────
function updateRelation(payload, user) {
  try {
    requireAuth(user);
    var relationId = String(payload.relationId  || '');
    var newType    = String(payload.relationType || '');
    if (!relationId || !newType) return fail('ข้อมูลไม่ครบ');
    if (!REVERSE_MAP[newType]) return fail('ประเภทความสัมพันธ์ไม่ถูกต้อง');

    var sheet = getSheet('RELATIONS');
    var data  = sheet.getDataRange().getValues();

    var fromId = null, toId = null, oldType = null, targetRow = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === relationId && String(data[i][6]) === 'active') {
        fromId    = String(data[i][1]);
        toId      = String(data[i][2]);
        oldType   = String(data[i][3]);
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow < 0) return fail('ไม่พบความสัมพันธ์ หรือถูกลบแล้ว');
    if (oldType === newType) return ok(null, 'ไม่มีการเปลี่ยนแปลง');

    // Update forward type
    sheet.getRange(targetRow, 4).setValue(newType);

    // Update reverse type
    var oldReverse = REVERSE_MAP[oldType];
    var newReverse = REVERSE_MAP[newType];
    for (var j = 1; j < data.length; j++) {
      if (
        String(data[j][1]) === toId &&
        String(data[j][2]) === fromId &&
        String(data[j][3]) === oldReverse &&
        String(data[j][6]) === 'active'
      ) {
        sheet.getRange(j + 1, 4).setValue(newReverse);
        break;
      }
    }

    logActivity('update_relation', fromId + ' → ' + oldType + ' → ' + newType + ' (with ' + toId + ')', user.userId);
    return ok(null, 'แก้ไขความสัมพันธ์สำเร็จ');
  } catch(e) { return fail(e.message); }
}
