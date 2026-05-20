// ============================================================
// Merge.gs — Merge duplicate persons
// ============================================================

function mergePerson(payload, user) {
  try {
    requireAuth(user);
    var sourceId = String(payload.sourcePersonId || '');
    var targetId = String(payload.targetPersonId || '');
    if (!sourceId || !targetId) return fail('ข้อมูลไม่ครบ');
    if (sourceId === targetId) return fail('ไม่สามารถ merge กับตัวเองได้');

    var personSheet = getSheet('PERSONS');
    var relSheet    = getSheet('RELATIONS');
    var mergeSheet  = getSheet('MERGES');
    var personData  = personSheet.getDataRange().getValues();
    var relData     = relSheet.getDataRange().getValues();
    var now         = new Date().toISOString();

    // Mark source as merged
    for (var i = 1; i < personData.length; i++) {
      if (String(personData[i][0]) === sourceId) {
        personSheet.getRange(i + 1, 17).setValue('true');   // isMerged
        personSheet.getRange(i + 1, 18).setValue(targetId); // mergedTo
        break;
      }
    }

    // Redirect relations from source → target
    for (var j = 1; j < relData.length; j++) {
      if (String(relData[j][1]) === sourceId) {
        relSheet.getRange(j + 1, 2).setValue(targetId);
      }
      if (String(relData[j][2]) === sourceId) {
        relSheet.getRange(j + 1, 3).setValue(targetId);
      }
    }

    // Log merge
    mergeSheet.appendRow([generateId(), sourceId, targetId, user.userId, now]);
    logActivity('merge_person', sourceId + ' → ' + targetId, user.userId);
    return ok({ targetPersonId: targetId }, 'รวมข้อมูลสำเร็จ');
  } catch(e) { return fail(e.message); }
}

function getMergeHistory(payload) {
  try {
    var personId = String(payload.personId || '');
    var sheet = getSheet('MERGES');
    var data  = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) {
      if (!personId || String(data[i][1]) === personId || String(data[i][2]) === personId) {
        results.push({ mergeId: String(data[i][0]), sourcePersonId: String(data[i][1]), targetPersonId: String(data[i][2]), mergedBy: String(data[i][3]), mergedAt: String(data[i][4]) });
      }
    }
    return ok(results);
  } catch(e) { return fail(e.message); }
}
