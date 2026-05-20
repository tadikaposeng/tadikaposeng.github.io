// ============================================================
// Upload.gs — Upload image to Google Drive
// ============================================================

function uploadImage(payload, user) {
  try {
    requireAuth(user);
    var base64Data = String(payload.base64 || '');
    var filename   = sanitize(payload.filename || 'photo.jpg');
    var mimeType   = String(payload.mimeType || 'image/jpeg');

    if (!base64Data) return fail('ไม่พบข้อมูลรูปภาพ');

    // Strip data URL prefix if present
    var parts = base64Data.split(',');
    var raw   = parts.length > 1 ? parts[1] : parts[0];

    var blob   = Utilities.newBlob(Utilities.base64Decode(raw), mimeType, filename);
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId  = file.getId();
    var photoUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';

    logActivity('upload_image', filename, user.userId);
    return ok({ photoUrl, fileId }, 'อัปโหลดรูปภาพสำเร็จ');
  } catch(e) { return fail(e.message); }
}
