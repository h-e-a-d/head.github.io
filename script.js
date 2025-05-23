// script.js
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const svg             = document.getElementById('svgArea');
  const addBtn          = document.getElementById('addPersonBtn');
  const connectBtn      = document.getElementById('connectBtn');
  const centerBtn       = document.getElementById('centerBtn');
  const colorPicker     = document.getElementById('colorPicker');
  const sizeInput       = document.getElementById('sizeInput');
  const applyBtn        = document.getElementById('applyBtn');
  const bringToFrontBtn = document.getElementById('bringToFrontBtn');
  const undoBtn         = document.getElementById('undoBtn');
  const saveBtn         = document.getElementById('saveBtn');
  const loadInput       = document.getElementById('loadInput');

  // State
  let personCount   = 0;
  let connectMode   = false;
  let selected      = null;
  let initialCircle = null;
  let viewBox       = { x: 0, y: 0, w: 800, h: 600 };

  // History for Undo
  let history       = [];
  let isRestoring   = false;

  // Initialize
  updateViewBox();
  createGrid();
  setupPanAndZoom();

  // Event listeners
  addBtn.addEventListener('click', () => { pushHistory(); addPerson(); });
  applyBtn.addEventListener('click', () => { pushHistory(); applyChanges(); });
  bringToFrontBtn.addEventListener('click', () => {
    if (!selected) return;
    pushHistory();
    svg.appendChild(selected._group);
  });
  undoBtn.addEventListener('click', () => {
    if (!history.length) return;
    const prev = history.pop();
    isRestoring = true;
    loadTree(JSON.parse(prev));
    isRestoring = false;
    undoBtn.disabled = !history.length;
  });
  connectBtn.addEventListener('click', toggleConnectMode);
  centerBtn.addEventListener('click', centerView);
  saveBtn.addEventListener('click', saveTree);
  loadInput.addEventListener('change', e => {
    history = [];
    undoBtn.disabled = true;
    loadTreeFromFile(e);
  });
  svg.addEventListener('click', () => {
    if (selected) {
      selected.classList.remove('selected');
      selected = null;
      bringToFrontBtn.disabled = true;
    }
  });

  // Push current state to history
  function pushHistory() {
    if (isRestoring) return;
    history.push(JSON.stringify(getCurrentState()));
    undoBtn.disabled = false;
  }

  // Update SVG viewBox
  function updateViewBox() {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }

  // Draw background grid
  function createGrid() {
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', -10000);
    rect.setAttribute('y', -10000);
    rect.setAttribute('width', 20000);
    rect.setAttribute('height', 20000);
    rect.setAttribute('fill', '#f0f0f0');
    svg.appendChild(rect);

    const gridSize = 100, gridExtent = 5000;
    for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', -gridExtent);
      line.setAttribute('x2', x); line.setAttribute('y2', gridExtent);
      line.setAttribute('stroke', '#ddd'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', -gridExtent); line.setAttribute('y1', y);
      line.setAttribute('x2', gridExtent);  line.setAttribute('y2', y);
      line.setAttribute('stroke', '#ddd');   line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
  }

  // Pan & zoom setup
  function setupPanAndZoom() {
    let isPanning = false, startPt = null, lastDist = 0;

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const scale = e.deltaY < 0 ? 0.9 : 1.1;
      const mx = (e.clientX / svg.clientWidth) * viewBox.w + viewBox.x;
      const my = (e.clientY / svg.clientHeight) * viewBox.h + viewBox.y;
      let nw = viewBox.w * scale, nh = viewBox.h * scale;
      if (nw < 100) { nw = 100; nh = viewBox.h * (100 / viewBox.w); }
      if (nw > 20000) { nw = 20000; nh = viewBox.h * (20000 / viewBox.w); }
      viewBox.x = mx - (mx - viewBox.x) * (nw / viewBox.w);
      viewBox.y = my - (my - viewBox.y) * (nh / viewBox.h);
      viewBox.w = nw; viewBox.h = nh;
      updateViewBox();
    }, { passive: false });

    svg.addEventListener('mousedown', startPan);
    svg.addEventListener('mousemove', doPan);
    svg.addEventListener('mouseup',   endPan);
    svg.addEventListener('mouseleave',endPan);
    svg.addEventListener('touchstart',startTouch,{passive:false});
    svg.addEventListener('touchmove', touchPan,{passive:false});
    svg.addEventListener('touchend',  endTouch);

    function startPan(e) {
      if (e.target.tagName === 'g' ||
          (e.target.tagName === 'line' && e.target.classList.contains('relation'))
      ) return;
      isPanning = true;
      startPt = { x: e.clientX, y: e.clientY };
      svg.style.cursor = 'grabbing';
    }
    function doPan(e) {
      if (!isPanning) return;
      const dx = (startPt.x - e.clientX) * (viewBox.w / svg.clientWidth);
      const dy = (startPt.y - e.clientY) * (viewBox.h / svg.clientHeight);
      viewBox.x += dx; viewBox.y += dy;
      startPt = { x: e.clientX, y: e.clientY };
      updateViewBox();
    }
    function endPan() {
      isPanning = false;
      svg.style.cursor = 'default';
    }

    function startTouch(e) {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el.tagName === 'g' ||
            (el.tagName === 'line' && el.classList.contains('relation'))
        ) return;
        isPanning = true;
        startPt = { x: t.clientX, y: t.clientY };
      } else {
        lastDist = getDist(e.touches);
      }
    }
    function touchPan(e) {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning) {
        const t = e.touches[0];
        const dx = (startPt.x - t.clientX) * (viewBox.w / svg.clientWidth);
        const dy = (startPt.y - t.clientY) * (viewBox.h / svg.clientHeight);
        viewBox.x += dx; viewBox.y += dy;
        startPt = { x: t.clientX, y: t.clientY };
        updateViewBox();
      } else if (e.touches.length === 2) {
        const nd = getDist(e.touches);
        const scale = lastDist / nd;
        let nw = viewBox.w * scale, nh = viewBox.h * scale;
        if (nw < 100) { nw = 100; nh = viewBox.h * (100 / viewBox.w); }
        if (nw > 20000) { nw = 20000; nh = viewBox.h * (20000 / viewBox.w); }
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const mx = (cx / svg.clientWidth) * viewBox.w + viewBox.x;
        const my = (cy / svg.clientHeight) * viewBox.h + viewBox.y;
        viewBox.x = mx - (mx - viewBox.x) * (nw / viewBox.w);
        viewBox.y = my - (my - viewBox.y) * (nh / viewBox.h);
        viewBox.w = nw; viewBox.h = nh;
        lastDist = nd;
        updateViewBox();
      }
    }
    function endTouch() { isPanning = false; }
    function getDist(t) {
      return Math.hypot(
        t[0].clientX - t[1].clientX,
        t[0].clientY - t[1].clientY
      );
    }
  }

  // Add a person
  function addPerson() {
    const name   = prompt('Enter given name:');  if (!name)    return;
    const father = prompt("Enter father's name:", ''); if (father===null) return;
    const surname= prompt('Enter surname:', '');   if (surname===null) return;
    const dob    = prompt('Enter DOB (YYYY-MM-DD):', ''); if (dob===null) return;
    const birth  = prompt('Enter birth name:', '');    if (birth===null) return;
    personCount++;
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    createPerson(
      `p${personCount}`, name, father, surname, dob, birth,
      cx, cy, +sizeInput.value || 40, colorPicker.value || '#3498db'
    );
  }

  // Create person node (4 lines: name, surname, birth_name, dob)
  function createPerson(id, name, father, surname, dob, birth, cx, cy, r, fill) {
    const gap = 0.3 * r;
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.setAttribute('data-id', id);
    g.setAttribute('data-name', name);
    g.setAttribute('data-father-name', father);
    g.setAttribute('data-surname', surname);
    g.setAttribute('data-dob', dob);
    g.setAttribute('data-birth-name', birth);

    const c = document.createElementNS(svg.namespaceURI, 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', r);
    c.setAttribute('fill', fill);
    c.setAttribute('class', 'person');

    // Line 1: given + father
    const line1 = document.createElementNS(svg.namespaceURI, 'text');
    line1.setAttribute('x', cx);
    line1.setAttribute('y', cy - gap);
    line1.setAttribute('text-anchor', 'middle');
    line1.setAttribute('class', 'name');
    line1.textContent = [name, father].filter(Boolean).join(' ');

    // Line 2: surname
    const line2 = document.createElementNS(svg.namespaceURI, 'text');
    line2.setAttribute('x', cx);
    line2.setAttribute('y', cy);
    line2.setAttribute('text-anchor', 'middle');
    line2.setAttribute('class', 'name');
    line2.textContent = surname;

    // Line 3: birth_name
    const line3 = document.createElementNS(svg.namespaceURI, 'text');
    line3.setAttribute('x', cx);
    line3.setAttribute('y', cy + gap);
    line3.setAttribute('text-anchor', 'middle');
    line3.setAttribute('class', 'name');
    line3.textContent = birth;

    // Line 4: DOB
    const line4 = document.createElementNS(svg.namespaceURI, 'text');
    line4.setAttribute('x', cx);
    line4.setAttribute('y', cy + gap * 2);
    line4.setAttribute('text-anchor', 'middle');
    line4.setAttribute('class', 'dob');
    line4.textContent = dob;

    g.append(c, line1, line2, line3, line4);
    svg.appendChild(g);

    // Store references
    c._group = g;
    c._line1 = line1;
    c._line2 = line2;
    c._line3 = line3;
    c._line4 = line4;
    if (!initialCircle) initialCircle = c;

    // Event listeners
    g.addEventListener('click', e => nodeClick(e, c));
    g.addEventListener('dblclick', e => { pushHistory(); editPerson(e, c); });

    let lastTap = 0;
    g.addEventListener('touchend', e => {
      const now = Date.now(), len = now - lastTap;
      if (len < 500 && len > 0) {
        pushHistory();
        editPerson(e, c);
        e.preventDefault();
      } else {
        nodeClick(e, c);
      }
      lastTap = now;
    });

    setupDrag(c);
    return c;
  }

  // Node click (select/connect)
  function nodeClick(e, c) {
    e.stopPropagation();
    if (connectMode) {
      if (!selected) {
        selected = c;
        c.classList.add('selected');
      } else if (selected !== c) {
        pushHistory();
        drawLine(selected, c);
        undoBtn.disabled = false;
        selected.classList.remove('selected');
        selected = null;
        connectMode = false;
        connectBtn.textContent = 'Connect';
        svg.style.cursor = 'default';
      }
    } else {
      if (selected) selected._group.classList.remove('selected');
      selected = c;
      c.classList.add('selected');
      colorPicker.disabled = false;
      sizeInput.disabled = false;
      applyBtn.disabled = false;
      bringToFrontBtn.disabled = false;
      undoBtn.disabled = false;
      colorPicker.value = c.getAttribute('fill');
      sizeInput.value = c.getAttribute('r');
    }
  }

  // Toggle connect mode
  function toggleConnectMode() {
    connectMode = !connectMode;
    connectBtn.textContent = connectMode ? 'Cancel' : 'Connect';
    svg.style.cursor = connectMode ? 'crosshair' : 'default';
    if (selected) {
      selected.classList.remove('selected');
      selected = null;
      bringToFrontBtn.disabled = true;
    }
  }

  // Apply color/size changes
  function applyChanges() {
    if (!selected) return;
    const g = selected._group;
    const nc = colorPicker.value, nr = +sizeInput.value;
    selected.setAttribute('fill', nc);
    selected.setAttribute('r', nr);
    g.setAttribute('data-fill', nc);
    g.setAttribute('data-r', nr);

    const cx = +selected.getAttribute('cx'),
          cy = +selected.getAttribute('cy'),
          gap = 0.3 * nr;

    selected._line1.setAttribute('x', cx);
    selected._line1.setAttribute('y', cy - gap);
    selected._line2.setAttribute('x', cx);
    selected._line2.setAttribute('y', cy);
    selected._line3.setAttribute('x', cx);
    selected._line3.setAttribute('y', cy + gap);
    selected._line4.setAttribute('x', cx);
    selected._line4.setAttribute('y', cy + gap * 2);
  }

  // Draw connection line
  function drawLine(a, b) {
    const l = document.createElementNS(svg.namespaceURI, 'line');
    l.setAttribute('x1', a.getAttribute('cx'));
    l.setAttribute('y1', a.getAttribute('cy'));
    l.setAttribute('x2', b.getAttribute('cx'));
    l.setAttribute('y2', b.getAttribute('cy'));
    l.setAttribute('stroke', '#555');
    l.setAttribute('stroke-width', '3');
    l.setAttribute('class', 'relation');
    l.setAttribute('data-source', a._group.getAttribute('data-id'));
    l.setAttribute('data-target', b._group.getAttribute('data-id'));

    const firstG = Array.from(svg.childNodes).find(n => n.tagName === 'g');
    if (firstG) svg.insertBefore(l, firstG);
    else svg.appendChild(l);

    l.addEventListener('click', () => { pushHistory(); l.remove(); });

    a._group._lines = a._group._lines || [];
    b._group._lines = b._group._lines || [];
    a._group._lines.push(l);
    b._group._lines.push(l);
  }

  // Drag & drop
  function setupDrag(c) {
    let start = null, off = null;
    c.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', endDrag);
    c.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', doDrag, { passive: false });
    document.addEventListener('touchend', endDrag);

    function startDrag(e) {
      e.stopPropagation();
      start = e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };
      const cx = +c.getAttribute('cx'),
            cy = +c.getAttribute('cy');
      off = {
        x: cx * (svg.clientWidth / viewBox.w) - start.x,
        y: cy * (svg.clientHeight / viewBox.h) - start.y
      };
      svg.style.cursor = 'grabbing';
    }
    function doDrag(e) {
      if (!start) return;
      e.preventDefault();
      const mv = e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };
      let x = (mv.x + off.x) * (viewBox.w / svg.clientWidth),
          y = (mv.y + off.y) * (viewBox.h / svg.clientHeight);
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);

      const r = +c.getAttribute('r'),
            gap = 0.3 * r;
      c._line1.setAttribute('x', x);
      c._line1.setAttribute('y', y - gap);
      c._line2.setAttribute('x', x);
      c._line2.setAttribute('y', y);
      c._line3.setAttribute('x', x);
      c._line3.setAttribute('y', y + gap);
      c._line4.setAttribute('x', x);
      c._line4.setAttribute('y', y + gap * 2);

      if (c._group._lines) {
        c._group._lines.forEach(l => {
          if (l.getAttribute('data-source') === c._group.getAttribute('data-id')) {
            l.setAttribute('x1', x);
            l.setAttribute('y1', y);
          } else {
            l.setAttribute('x2', x);
            l.setAttribute('y2', y);
          }
        });
      }
    }
    function endDrag() {
      if (start) pushHistory();
      start = null;
      svg.style.cursor = 'default';
    }
  }

  // Save tree to JSON
  function saveTree() {
    const data = { people: [], relations: [] };
    svg.querySelectorAll('g[data-id]').forEach(g => {
      const c = g.querySelector('circle');
      data.people.push({
        id: g.getAttribute('data-id'),
        name: g.getAttribute('data-name'),
        father_name: g.getAttribute('data-father-name'),
        surname: g.getAttribute('data-surname'),
        dob: g.getAttribute('data-dob'),
        birth_name: g.getAttribute('data-birth-name'),
        cx: +c.getAttribute('cx'),
        cy: +c.getAttribute('cy'),
        r: +c.getAttribute('r'),
        fill: c.getAttribute('fill')
      });
    });
    svg.querySelectorAll('line.relation').forEach(l => {
      data.relations.push({
        source: l.getAttribute('data-source'),
        target: l.getAttribute('data-target')
      });
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load tree from JSON file
  function loadTreeFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        loadTree(JSON.parse(evt.target.result));
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  // Load tree data into SVG
  function loadTree(data) {
    svg.innerHTML = '';
    personCount = 0; selected = null; initialCircle = null;
    createGrid();
    const map = {};
    (data.people || []).forEach(p => {
      personCount = Math.max(personCount, +p.id.replace('p', ''));
      const c = createPerson(
        p.id, p.name, p.father_name, p.surname, p.dob, p.birth_name,
        p.cx, p.cy, p.r, p.fill
      );
      map[p.id] = c;
    });
    (data.relations || []).forEach(r => {
      const a = map[r.source], b = map[r.target];
      if (a && b) drawLine(a, b);
    });
    if (initialCircle) centerView();
  }

  // Center view on first circle
  function centerView() {
    if (!initialCircle) return;
    const cx = +initialCircle.getAttribute('cx'),
          cy = +initialCircle.getAttribute('cy');
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    updateViewBox();
  }

  // Edit existing person
  function editPerson(e, c) {
    e.stopPropagation();
    const g = c._group;
    const n = prompt('Edit given name:', g.getAttribute('data-name'));
    const f = prompt("Edit father's name:", g.getAttribute('data-father-name'));
    const s = prompt('Edit surname:', g.getAttribute('data-surname'));
    const d = prompt('Edit DOB (YYYY-MM-DD):', g.getAttribute('data-dob'));
    const b = prompt('Edit birth name:', g.getAttribute('data-birth-name'));
    if (n !== null) g.setAttribute('data-name', n);
    if (f !== null) g.setAttribute('data-father-name', f);
    if (s !== null) g.setAttribute('data-surname', s);
    if (d !== null) g.setAttribute('data-dob', d);
    if (b !== null) g.setAttribute('data-birth-name', b);

    const r = +c.getAttribute('r'),
          gap = 0.3 * r,
          cx = +c.getAttribute('cx'),
          cy = +c.getAttribute('cy');
    c._line1.textContent = [g.getAttribute('data-name'), g.getAttribute('data-father-name')].filter(Boolean).join(' ');
    c._line2.textContent = g.getAttribute('data-surname');
    c._line3.textContent = g.getAttribute('data-birth-name');
    c._line4.textContent = g.getAttribute('data-dob');
    c._line1.setAttribute('y', cy - gap);
    c._line2.setAttribute('y', cy);
    c._line3.setAttribute('y', cy + gap);
    c._line4.setAttribute('y', cy + gap * 2);
  }

  // Debug connections
  function debugConnections() {
    svg.querySelectorAll('line.relation').forEach((l, i) => {
      console.log(`Connection ${i+1}: ${l.getAttribute('data-source')} -> ${l.getAttribute('data-target')}`);
    });
  }
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      debugConnections();
    }
  });

  // Serialize current state
  function getCurrentState() {
    return {
      people: [...svg.querySelectorAll('g[data-id]')].map(g => {
        const c = g.querySelector('circle');
        return {
          id: g.getAttribute('data-id'),
          name: g.getAttribute('data-name'),
          father_name: g.getAttribute('data-father-name'),
          surname: g.getAttribute('data-surname'),
          dob: g.getAttribute('data-dob'),
          birth_name: g.getAttribute('data-birth-name'),
          cx: +c.getAttribute('cx'),
          cy: +c.getAttribute('cy'),
          r: +c.getAttribute('r'),
          fill: c.getAttribute('fill')
        };
      }),
      relations: [...svg.querySelectorAll('line.relation')].map(l => ({
        source: l.getAttribute('data-source'),
        target: l.getAttribute('data-target')
      }))
    };
  }
});
