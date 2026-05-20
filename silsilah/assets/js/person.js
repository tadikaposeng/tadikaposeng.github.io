// ============================================================
// person.js — Person form, image upload, duplicate detection
// ============================================================

const PersonManager = (() => {

  // ── Image compression ────────────────────────────────────
  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MAX = CONFIG.IMAGE_MAX_WIDTH;
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', CONFIG.IMAGE_QUALITY));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Upload image to Drive ────────────────────────────────
  async function uploadPhoto(file) {
    const base64 = await compressImage(file);
    const res = await API.uploadImage({ base64, filename: file.name, mimeType: 'image/jpeg' });
    return res;
  }

  // ── Fuzzy duplicate detection ────────────────────────────
  function similarity(a, b) {
    a = (a || '').toLowerCase().trim();
    b = (b || '').toLowerCase().trim();
    if (!a || !b) return 0;
    if (a === b) return 1;
    let matches = 0;
    const shorter = a.length < b.length ? a : b;
    const longer  = a.length < b.length ? b : a;
    for (const ch of shorter) { if (longer.includes(ch)) matches++; }
    return matches / longer.length;
  }

  function findDuplicates(newPerson, existingList) {
    return existingList.filter(p => {
      const scoreFirst = similarity(newPerson.firstName, p.firstName);
      const scoreLast  = similarity(newPerson.lastName,  p.lastName);
      const scoreNick  = similarity(newPerson.nickName,  p.nickName);
      const scorePhone = newPerson.phone && p.phone && newPerson.phone === p.phone ? 1 : 0;
      return (scoreFirst > 0.8 && scoreLast > 0.6) || (scoreFirst > 0.9) || scorePhone === 1 || scoreNick > 0.9;
    });
  }

  // ── Build add/edit person form ───────────────────────────
  function buildForm(person = {}) {
    return `
    <div class="grid grid-cols-1 gap-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">ชื่อ *</label>
          <input id="pf-firstName" class="form-input" value="${person.firstName||''}" placeholder="ชื่อ">
        </div>
        <div>
          <label class="form-label">นามสกุล</label>
          <input id="pf-lastName"  class="form-input" value="${person.lastName||''}"  placeholder="นามสกุล">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">ชื่อเล่น</label>
          <input id="pf-nickName"  class="form-input" value="${person.nickName||''}"  placeholder="ชื่อเล่น">
        </div>
        <div>
          <label class="form-label">เพศ</label>
          <select id="pf-gender" class="form-input">
            <option value="">-- เลือก --</option>
            <option value="male"   ${person.gender==='male'   ?'selected':''}>ชาย</option>
            <option value="female" ${person.gender==='female' ?'selected':''}>หญิง</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">วันเกิด</label>
          <input id="pf-birthDate" class="form-input" type="date" value="${person.birthDate||''}">
        </div>
        <div>
          <label class="form-label">วันเสียชีวิต</label>
          <input id="pf-deathDate" class="form-input" type="date" value="${person.deathDate||''}">
        </div>
      </div>
      <div>
        <label class="form-label">โทรศัพท์</label>
        <input id="pf-phone" class="form-input" inputmode="numeric" value="${person.phone||''}" placeholder="0xx-xxx-xxxx">
      </div>
      <div>
        <label class="form-label">ที่อยู่</label>
        <textarea id="pf-address" class="form-input h-20 resize-none" placeholder="ที่อยู่">${person.address||''}</textarea>
      </div>
      <div>
        <label class="form-label">รายละเอียดเพิ่มเติม</label>
        <textarea id="pf-description" class="form-input h-20 resize-none" placeholder="ข้อมูลอื่นๆ">${person.description||''}</textarea>
      </div>
      <div>
        <label class="form-label">รูปภาพ</label>
        <input id="pf-photo" class="form-input py-2" type="file" accept="image/*">
        ${person.photoUrl ? `<img src="${person.photoUrl}" class="mt-2 w-20 h-20 rounded-full object-cover border-2 border-amber-400/40">` : ''}
      </div>
    </div>`;
  }

  function getFormData() {
    const v = id => document.getElementById(id)?.value?.trim() || '';
    return {
      firstName:   v('pf-firstName'),
      lastName:    v('pf-lastName'),
      nickName:    v('pf-nickName'),
      gender:      v('pf-gender'),
      birthDate:   v('pf-birthDate'),
      deathDate:   v('pf-deathDate'),
      phone:       document.getElementById('pf-phone')?.value?.trim() || '',
      address:     v('pf-address'),
      description: v('pf-description'),
    };
  }

  return { compressImage, uploadPhoto, findDuplicates, buildForm, getFormData };
})();
