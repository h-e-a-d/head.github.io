// script.js
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM references ---
  const svg             = document.getElementById('svgArea');
  const addBtn          = document.getElementById('addPersonBtn');
  const connectBtn      = document.getElementById('connectBtn');
  const centerBtn       = document.getElementById('centerBtn');
  const colorPicker     = document.getElementById('colorPicker');
  const sizeInput       = document.getElementById('sizeInput');
  const applyBtn        = document.getElementById('applyBtn');
  const bringBtn        = document.getElementById('bringToFrontBtn');
  const undoBtn         = document.getElementById('undoBtn');
  const saveBtn         = document.getElementById('saveBtn');
  const loadInput       = document.getElementById('loadInput');

  const fontSelect      = document.getElementById('fontSelect');
  const fontSizeInput   = document.getElementById('fontSizeInput');

  // --- Global state & history ---
  let globalFontFamily  = fontSelect.value;
  let globalFontSize    = +fontSizeInput.value;

  let personCount   = 0;
  let connectMode   = false;
  let selected      = null;
  let initialCircle = null;
  let viewBox       = { x: 0, y: 0, w: 800, h: 600 };

  let history       = [];
  let isRestoring   = false;

  // --- Initialization ---
  updateViewBox();
  createGrid();
  setupPanAndZoom();
  applyGlobalFont();

  // --- Event bindings ---
  addBtn.onclick      = () => { pushHistory(); addPerson(); };
  applyBtn.onclick    = () => { pushHistory(); applyChanges(); };
  bringBtn.onclick    = () => { if (selected) { pushHistory(); svg.appendChild(selected._group); } };
  undoBtn.onclick     = () => {
    if (!history.length) return;
    const prev = history.pop();
    isRestoring = true;
    loadTree(JSON.parse(prev));
    isRestoring = false;
    undoBtn.disabled = !history.length;
  };
  connectBtn.onclick  = toggleConnectMode;
  centerBtn.onclick   = centerView;
  saveBtn.onclick     = saveTree;
  loadInput.onchange  = e => { history = []; undoBtn.disabled = true; loadTreeFromFile(e); };
  svg.onclick         = () => {
    if (selected) {
      selected.classList.remove('selected');
      selected = null;
      bringBtn.disabled = true;
    }
  };

  fontSelect.onchange = () => {
    globalFontFamily = fontSelect.value;
    document.body.style.fontFamily = globalFontFamily;
    pushHistory();
    applyGlobalFont();
  };
  fontSizeInput.onchange = () => {
    globalFontSize = +fontSizeInput.value;
    document.documentElement.style.setProperty('--control-font-size', `${globalFontSize}px`);
    pushHistory();
    applyGlobalFont();
  };

  // --- History helper ---
  function pushHistory() {
    if (isRestoring) return;
    history.push(JSON.stringify(getCurrentState()));
    undoBtn.disabled = false;
  }

  // --- Apply font to SVG text & controls ---
  function applyGlobalFont() {
    document.body.style.fontFamily = globalFontFamily;
    svg.querySelectorAll('text').forEach(t => {
      t.setAttribute('font-family', globalFontFamily);
      t.setAttribute('font-size',   globalFontSize);
    });
  }

  // --- ViewBox & grid ---
  function updateViewBox() {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }
  function createGrid() {
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', -10000);
    rect.setAttribute('y', -10000);
    rect.setAttribute('width', 20000);
    rect.setAttribute('height', 20000);
    rect.setAttribute('fill', '#f0f0f0');
    svg.appendChild(rect);

    const step = 100, ext = 5000;
    for (let x = -ext; x <= ext; x += step) {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', -ext);
      line.setAttribute('x2', x); line.setAttribute('y2', ext);
      line.setAttribute('stroke', '#ddd'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    for (let y = -ext; y <= ext; y += step) {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', -ext); line.setAttribute('y1', y);
      line.setAttribute('x2', ext);  line.setAttribute('y2', y);
      line.setAttribute('stroke', '#ddd'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
  }

  // --- Pan & Zoom (unchanged) ---
  function setupPanAndZoom() {
    let panning = false, start = null, lastDist = 0;
    // … existing wheel & mouse/touch handlers …
    // (See your previous implementation; just ensure it’s here once.)
  }

  // --- Add & create person ---
  function addPerson() {
    const name    = prompt('Enter given name:');  if (!name) return;
    const father  = prompt("Enter father's name:", ''); if (father === null) return;
    const surname = prompt('Enter surname:', '');  if (surname === null) return;
    const dob     = prompt('Enter DOB (YYYY-MM-DD):', ''); if (dob === null) return;
    const birth   = prompt('Enter birth name:', '');   if (birth === null) return;

    personCount++;
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    createPerson(
      `p${personCount}`, name, father, surname, dob, birth,
      cx, cy, +sizeInput.value || 40, colorPicker.value || '#3498db'
    );
  }

  function createPerson(id,name,father,surname,dob,birth,cx,cy,r,fill) {
    const gap = 0.3 * r;
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.setAttribute('data-id', id);
    g.setAttribute('data-name', name);
    g.setAttribute('data-father-name', father);
    g.setAttribute('data-surname', surname);
    g.setAttribute('data-dob', dob);
    g.setAttribute('data-birth-name', birth);

    // Circle
    const c = document.createElementNS(svg.namespaceURI, 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r',  r);
    c.setAttribute('fill', fill);
    c.setAttribute('class', 'person');

    // Four lines of text
    const makeLine = (yOff, txt, cls) => {
      const t = document.createElementNS(svg.namespaceURI, 'text');
      t.setAttribute('x', cx);
      t.setAttribute('y', cy + yOff);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', cls);
      t.setAttribute('font-family', globalFontFamily);
      t.setAttribute('font-size',   globalFontSize);
      t.textContent = txt;
      return t;
    };

    const line1 = makeLine(-gap, [name,father].filter(Boolean).join(' '), 'name');
    const line2 = makeLine(0,     surname, 'name');
    const line3 = makeLine(gap,   birth,   'name');
    const line4 = makeLine(gap*2, dob,     'dob');

    g.append(c, line1, line2, line3, line4);
    svg.appendChild(g);

    // Store references
    c._group = g;
    c._line1 = line1; c._line2 = line2;
    c._line3 = line3; c._line4 = line4;
    if (!initialCircle) initialCircle = c;

    // Node events
    g.addEventListener('click',    e => nodeClick(e,c));
    g.addEventListener('dblclick', e => { pushHistory(); editPerson(e,c); });
    setupDrag(c);

    return c;
  }

  // --- Node interaction (connect/edit) ---
  function nodeClick(e,c) {
    e.stopPropagation();
    // … your existing connect vs select logic …
  }
  function toggleConnectMode() { /* … */ }
  function applyChanges()    { /* … */ }
  function editPerson(e,c)   { /* … */ }

  // --- Save / Load JSON ---
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
        r:  +c.getAttribute('r'),
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
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'family-tree.json';
    a.click();
  }
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
  function loadTree(data) {
    svg.innerHTML = '';
    personCount = 0; selected = null; initialCircle = null;
    createGrid();
    const map = {};
    (data.people || []).forEach(p => {
      personCount = Math.max(personCount, +p.id.replace('p',''));
      map[p.id] = createPerson(
        p.id, p.name, p.father_name, p.surname, p.dob, p.birth_name,
        p.cx, p.cy, p.r, p.fill
      );
    });
    (data.relations || []).forEach(r => {
      const a = map[r.source], b = map[r.target];
      if (a && b) drawLine(a,b);
    });
    if (initialCircle) centerView();
  }

  // --- Utility & connections omitted for brevity ---
  // drawLine(), setupDrag(), centerView(), getCurrentState() remain as before.

});
