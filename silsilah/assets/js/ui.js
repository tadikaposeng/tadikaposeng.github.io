// ============================================================
// ui.js — Toast, Modal, Loading, Person Card renderer
// ============================================================

const UI = (() => {

  // ── Toast ────────────────────────────────────────────────
  function toast(message, type = 'info', duration = 3500) {
    const colors = { success: 'bg-emerald-500', error: 'bg-rose-500', info: 'bg-sky-500', warning: 'bg-amber-500' };
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const el = document.createElement('div');
    el.className = `fixed z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium
                    transition-all duration-500 translate-y-0 opacity-100 ${colors[type] || colors.info}`;
    el.style.cssText = 'bottom:24px;right:24px;min-width:220px;max-width:380px;animation:slideInToast .35s ease;';
    el.innerHTML = `<span class="text-base">${icons[type]}</span><span>${message}</span>`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; setTimeout(() => el.remove(), 500); }, duration);
  }

  // ── Loading overlay ──────────────────────────────────────
  let loadingEl = null;
  function showLoading(msg = 'กำลังโหลด...') {
    if (loadingEl) return;
    loadingEl = document.createElement('div');
    loadingEl.className = 'fixed inset-0 z-[8888] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm';
    loadingEl.innerHTML = `<div class="w-14 h-14 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin"></div>
      <p class="mt-4 text-white font-medium">${msg}</p>`;
    document.body.appendChild(loadingEl);
  }
  function hideLoading() { if (loadingEl) { loadingEl.remove(); loadingEl = null; } }

  // ── Modal ────────────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('modal-visible'));
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('modal-visible');
    setTimeout(() => el.classList.add('hidden'), 300);
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => closeModal(m.id));
  }

  // ── Gender Icon ──────────────────────────────────────────
  function genderIcon(gender, large = false) {
    const size = large ? 'w-24 h-24 text-5xl' : 'w-full h-full text-3xl';
    const bg = gender === 'female'
      ? 'from-pink-400 to-rose-500'
      : gender === 'male'
        ? 'from-sky-400 to-blue-600'
        : 'from-slate-400 to-slate-600';
    const ic = gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?';
    return `<div class="${size} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-white font-bold">${ic}</div>`;
  }

  // ── Person avatar (photo or icon) ────────────────────────
  function avatar(person, size = 'w-16 h-16') {
    if (person.photoUrl) {
      return `<img src="${person.photoUrl}" class="${size} rounded-full object-cover border-2 border-white/30" 
                   onerror="this.outerHTML='${genderIcon(person.gender).replace(/"/g, "'")}'">`;
    }
    return `<div class="${size}">${genderIcon(person.gender)}</div>`;
  }

  // ── Search result card ───────────────────────────────────
  function searchCard(person, onClick) {
    const card = document.createElement('div');
    card.className = 'search-card flex items-center gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg';
    card.innerHTML = `
      <div class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-amber-400/40">${avatar(person, 'w-14 h-14')}</div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-white truncate">${person.firstName} ${person.lastName || ''}</p>
        ${person.nickName ? `<p class="text-sm text-amber-300">ชื่อเล่น: ${person.nickName}</p>` : ''}
        <p class="text-xs text-white/50">${person.gender === 'male' ? 'ชาย' : person.gender === 'female' ? 'หญิง' : ''}</p>
      </div>
      <svg class="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>`;
    card.addEventListener('click', () => onClick(person));
    return card;
  }

  // ── Person Detail Modal content ──────────────────────────
  function renderPersonDetail(person) {
    const el = document.getElementById('detail-content');
    if (!el) return;
    el.innerHTML = `
      <div class="flex flex-col items-center gap-3 mb-6">
        <div class="w-28 h-28 rounded-full overflow-hidden border-4 border-amber-400/50 shadow-lg">${avatar(person, 'w-28 h-28')}</div>
        <div class="text-center">
          <h2 class="text-2xl font-bold text-white">${person.firstName} ${person.lastName || ''}</h2>
          ${person.nickName ? `<p class="text-amber-300 mt-1">ชื่อเล่น: ${person.nickName}</p>` : ''}
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        ${detailRow('เพศ', person.gender === 'male' ? 'ชาย' : person.gender === 'female' ? 'หญิง' : '-')}
        ${detailRow('วันเกิด', person.birthDate || '-')}
        ${detailRow('วันเสียชีวิต', person.deathDate || '-')}
        ${detailRow('โทรศัพท์', person.phone || '-')}
        ${detailRow('ที่อยู่', person.address || '-', true)}
        ${person.latitude ? detailRow('พิกัด', person.latitude + ', ' + person.longitude) : ''}
        ${detailRow('รายละเอียด', person.description || '-', true)}
      </div>
      <div class="mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
        <p>สร้างโดย: ${person.createdByName || person.createdBy || '-'} | ${fmtDate(person.createdAt)}</p>
        <p>แก้ไขล่าสุด: ${fmtDate(person.updatedAt)}</p>
      </div>`;
  }

  function detailRow(label, value, full = false) {
    const span = full ? 'col-span-2' : '';
    return `<div class="${span} bg-white/5 rounded-xl p-3">
      <p class="text-white/50 text-xs mb-1">${label}</p>
      <p class="text-white font-medium break-words">${value}</p>
    </div>`;
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return iso; }
  }

  return { toast, showLoading, hideLoading, openModal, closeModal, closeAllModals, genderIcon, avatar, searchCard, renderPersonDetail };
})();
