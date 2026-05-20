// ============================================================
// graph.js — SVG/HTML hybrid Family Graph renderer
// ============================================================
const FamilyGraph = (() => {

  const CARD_W   = 130, CARD_H = 170;
  const H_SPACE  = 190, V_SPACE = 240;
  const REL_COLORS = { parent:'#f59e0b', child:'#10b981', spouse:'#f43f5e', sibling:'#8b5cf6', adopted_parent:'#f97316', adopted_child:'#06b6d4' };
  const REL_TH    = { parent:'พ่อ/แม่', child:'ลูก', spouse:'คู่สมรส', sibling:'พี่/น้อง', adopted_parent:'พ่อ/แม่อุปถัมภ์', adopted_child:'ลูกบุญธรรม' };

  class Graph {
    constructor(containerId) {
      this.containerId = containerId;
      this.container   = null;
      this.viewport    = null;
      this.svgEl       = null;
      this.edgeGroup   = null;
      this.nodeContainer = null;

      this.nodes    = new Map();   // personId → {person,row,col,el}
      this.grid     = new Map();   // "row,col" → personId
      this.nodeGrid = new Map();   // personId → {row,col}
      this.expanded = new Set();   // "personId-direction"
      this.edges    = new Set();   // "fromId→toId"

      this.scale = 1; this.panX = 0; this.panY = 0;
      this.dragging = false; this.lastMouse = null;
      this.onSelectPerson = null;
    }

    init() {
      this.container = document.getElementById(this.containerId);
      this.container.innerHTML = `
        <div id="graph-viewport" style="position:absolute;width:0;height:0;transform-origin:0 0;will-change:transform;">
          <svg id="graph-svg" style="position:absolute;overflow:visible;pointer-events:none;" width="0" height="0">
            <defs>
              <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#ffffff44"/>
              </marker>
            </defs>
            <g id="graph-edges"></g>
          </svg>
          <div id="graph-nodes" style="position:absolute;top:0;left:0;"></div>
        </div>`;

      this.viewport      = document.getElementById('graph-viewport');
      this.svgEl         = document.getElementById('graph-svg');
      this.edgeGroup     = document.getElementById('graph-edges');
      this.nodeContainer = document.getElementById('graph-nodes');

      this._initDragZoom();
      this._centerViewport();
    }

    _centerViewport() {
      const rect = this.container.getBoundingClientRect();
      this.panX = rect.width  / 2;
      this.panY = rect.height / 2;
      this._applyTransform();
    }

    _applyTransform() {
      this.viewport.style.transform = `translate(${this.panX}px,${this.panY}px) scale(${this.scale})`;
    }

    _initDragZoom() {
      const c = this.container;
      c.addEventListener('mousedown',  e => { if (e.button !== 0) return; this.dragging = true; this.lastMouse = { x: e.clientX, y: e.clientY }; c.style.cursor = 'grabbing'; });
      window.addEventListener('mouseup', () => { this.dragging = false; c.style.cursor = 'grab'; });
      window.addEventListener('mousemove', e => {
        if (!this.dragging) return;
        this.panX += e.clientX - this.lastMouse.x;
        this.panY += e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this._applyTransform();
      });
      c.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        const rect  = c.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        this.panX = mx - (mx - this.panX) * delta;
        this.panY = my - (my - this.panY) * delta;
        this.scale = Math.min(3, Math.max(0.2, this.scale * delta));
        this._applyTransform();
      }, { passive: false });
      c.style.cursor = 'grab';

      // Touch support
      let lastDist = 0;
      c.addEventListener('touchstart', e => { if (e.touches.length === 2) lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); });
      c.addEventListener('touchmove',  e => {
        if (e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          if (lastDist) { const d = dist / lastDist; this.scale = Math.min(3, Math.max(0.2, this.scale * d)); this._applyTransform(); }
          lastDist = dist;
        }
      });
    }

    // ── Grid helpers ──────────────────────────────────────
    gridPos(row, col) { return { x: col * H_SPACE, y: row * V_SPACE }; }

    freeCol(row, preferCol, dir = 1) {
      let col = preferCol;
      while (this.grid.has(`${row},${col}`)) col += dir;
      return col;
    }

    // ── Add/render node ───────────────────────────────────
    addRootNode(person) {
      this.nodes.clear(); this.grid.clear(); this.nodeGrid.clear();
      this.edges.clear(); this.expanded.clear();
      this.edgeGroup.innerHTML = ''; this.nodeContainer.innerHTML = '';
      this._placeNode(person, 0, 0);
    }

    _placeNode(person, row, col) {
      if (this.nodes.has(person.personId)) return;
      const actualCol = this.freeCol(row, col);
      this.grid.set(`${row},${actualCol}`, person.personId);
      this.nodeGrid.set(person.personId, { row, col: actualCol });
      this.nodes.set(person.personId, { person, row, col: actualCol, el: null });
      this._renderNode(person, row, actualCol);
    }

    _renderNode(person, row, col) {
      const { x, y } = this.gridPos(row, col);
      const el = document.createElement('div');
      el.id = 'node-' + person.personId;
      el.className = 'person-node';
      el.style.cssText = `position:absolute;left:${x - CARD_W/2}px;top:${y - CARD_H/2}px;width:${CARD_W}px;height:${CARD_H}px;animation:nodeAppear .4s ease;`;

      const photoHTML = person.photoUrl
        ? `<img src="${person.photoUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'">`
        : UI.genderIcon(person.gender);
      const isAlive = !person.deathDate;

      el.innerHTML = `
        <div class="node-card ${!isAlive ? 'node-deceased' : ''}">
          <div class="node-photo" data-pid="${person.personId}">${photoHTML}</div>
          <div class="node-name">${person.firstName}</div>
          ${person.nickName ? `<div class="node-nick">"${person.nickName}"</div>` : ''}
          <div class="node-controls">
            <button class="nbtn nbtn-up"   data-pid="${person.personId}" data-dir="parent"  title="พ่อ/แม่">↑</button>
            <button class="nbtn nbtn-left" data-pid="${person.personId}" data-dir="spouse"  title="คู่สมรส">←</button>
            <button class="nbtn nbtn-plus" data-pid="${person.personId}" data-dir="add"     title="เพิ่มความสัมพันธ์">+</button>
            <button class="nbtn nbtn-right"data-pid="${person.personId}" data-dir="sibling" title="พี่/น้อง">→</button>
            <button class="nbtn nbtn-down" data-pid="${person.personId}" data-dir="child"   title="ลูก">↓</button>
          </div>
        </div>`;

      el.querySelector('.node-photo').addEventListener('click', () => {
        if (this._selectPersonCallback) this._selectPersonCallback(person);
      });
      el.querySelectorAll('.nbtn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const pid = btn.dataset.pid;
          const dir = btn.dataset.dir;
          if (dir === 'add') { this._onAddRelation(pid); }
          else { this._expandDirection(pid, dir); }
        });
      });

      this.nodeContainer.appendChild(el);
      this.nodes.get(person.personId).el = el;
    }

    // ── Expand direction ──────────────────────────────────
    async _expandDirection(personId, direction) {
      const key = `${personId}-${direction}`;
      const nodeData = this.nodeGrid.get(personId);
      if (!nodeData) return;
      const { row, col } = nodeData;

      // Toggle collapse
      if (this.expanded.has(key)) {
        this.expanded.delete(key);
        return; // TODO: implement collapse
      }
      this.expanded.add(key);

      const btn = this.nodeContainer.querySelector(`.nbtn[data-pid="${personId}"][data-dir="${direction}"]`);
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin inline-block">⟳</span>'; }

      const res = await API.getRelations(personId);
      if (!res.success) { UI.toast(res.message, 'error'); }
      else {
        const filtered = res.data.filter(r => r.relationType === direction);
        let targetRow = row, startCol = col;
        if      (direction === 'parent')  { targetRow = row - 1; startCol = col - Math.floor(filtered.length / 2); }
        else if (direction === 'child')   { targetRow = row + 1; startCol = col - Math.floor(filtered.length / 2); }
        else if (direction === 'spouse')  { targetRow = row;     startCol = col - 1; }
        else if (direction === 'sibling') { targetRow = row;     startCol = col + 1; }

        filtered.forEach((rel, i) => {
          const toPerson = rel.person;
          if (!toPerson) return;
          if (!this.nodes.has(toPerson.personId)) {
            this._placeNode(toPerson, targetRow, startCol + i);
          }
          this._drawEdge(personId, toPerson.personId, rel.relationType);
        });

        if (filtered.length === 0) UI.toast('ไม่พบข้อมูล' + REL_TH[direction], 'info', 2000);
      }

      if (btn) { btn.disabled = false; btn.innerHTML = { parent:'↑', child:'↓', spouse:'←', sibling:'→' }[direction]; }
    }

    // ── Draw SVG edge ─────────────────────────────────────
    _drawEdge(fromId, toId, relType) {
      const edgeKey = [fromId, toId].sort().join('→');
      if (this.edges.has(edgeKey)) return;
      this.edges.add(edgeKey);

      const fromData = this.nodeGrid.get(fromId);
      const toData   = this.nodeGrid.get(toId);
      if (!fromData || !toData) return;

      const fp = this.gridPos(fromData.row, fromData.col);
      const tp = this.gridPos(toData.row,   toData.col);

      const color = REL_COLORS[relType] || '#fff';
      const mx = (fp.x + tp.x) / 2;
      const my = (fp.y + tp.y) / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${fp.x},${fp.y} C${fp.x},${my} ${tp.x},${my} ${tp.x},${tp.y}`);
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-dasharray', '0');
      path.setAttribute('opacity', '0.7');
      path.style.animation = 'edgeDraw .5s ease forwards';
      this.edgeGroup.appendChild(path);

      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', mx); text.setAttribute('y', my - 6);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', color);
      text.setAttribute('font-size', '11');
      text.setAttribute('font-family', 'Noto Sans Thai, sans-serif');
      text.textContent = REL_TH[relType] || relType;
      this.edgeGroup.appendChild(text);
    }

    _onAddRelation(personId) {
      if (this._addRelationCallback) this._addRelationCallback(personId);
    }

    onSelectPerson(cb) { this._selectPersonCallback = cb; }
    onAddRelation(cb)  { this._addRelationCallback = cb; }

    resetView() { this.scale = 1; this._centerViewport(); }
    zoomIn()    { this.scale = Math.min(3, this.scale * 1.2); this._applyTransform(); }
    zoomOut()   { this.scale = Math.max(0.2, this.scale / 1.2); this._applyTransform(); }
  }

  return { Graph };
})();
