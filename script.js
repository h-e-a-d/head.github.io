document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const svg = document.getElementById('svgArea');
  const addBtn = document.getElementById('addPersonBtn');
  const connectBtn = document.getElementById('connectBtn');
  const colorPicker = document.getElementById('colorPicker');
  const sizeInput = document.getElementById('sizeInput');
  const applyBtn = document.getElementById('applyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadInput = document.getElementById('loadInput');
  const centerBtn = document.getElementById('centerBtn');

  // Global state
  let personCount = 0;
  let connectMode = false;
  let selected = null;
  let initialCircle = null;
  let viewBox = { x: 0, y: 0, w: 800, h: 600 };

  updateViewBox();
  createGrid();
  setupPanAndZoom();

  addBtn.addEventListener('click', addPerson);
  connectBtn.addEventListener('click', toggleConnectMode);
  applyBtn.addEventListener('click', applyChanges);
  saveBtn.addEventListener('click', saveTree);
  loadInput.addEventListener('change', loadTreeFromFile);
  centerBtn.addEventListener('click', centerView);

  function updateViewBox() {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }

  // Background grid creation
  function createGrid() {
    // Background rect
    const rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', -10000);
    rect.setAttribute('y', -10000);
    rect.setAttribute('width', 20000);
    rect.setAttribute('height', 20000);
    rect.setAttribute('fill', '#f0f0f0');
    svg.appendChild(rect);

    // Grid lines
    const gridSize = 100;
    const gridExtent = 5000;
    for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', -gridExtent);
      line.setAttribute('x2', x);
      line.setAttribute('y2', gridExtent);
      line.setAttribute('stroke', '#ddd');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', -gridExtent);
      line.setAttribute('y1', y);
      line.setAttribute('x2', gridExtent);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#ddd');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
  }

  // Pan and zoom setup (fixed & improved)
  function setupPanAndZoom() {
    let isPanning = false;
    let startPoint = null;
    let lastTouchDistance = 0;

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      // Gentle, reliable scaling
      let scale = e.deltaY < 0 ? 0.9 : 1.1;
      let mx = (e.clientX / svg.clientWidth) * viewBox.w + viewBox.x;
      let my = (e.clientY / svg.clientHeight) * viewBox.h + viewBox.y;

      let newW = viewBox.w * scale;
      let newH = viewBox.h * scale;
      if (newW < 100) { newW = 100; newH = viewBox.h * (100 / viewBox.w); }
      if (newW > 20000) { newW = 20000; newH = viewBox.h * (20000 / viewBox.w); }

      viewBox.x = mx - (mx - viewBox.x) * (newW / viewBox.w);
      viewBox.y = my - (my - viewBox.y) * (newH / viewBox.h);
      viewBox.w = newW;
      viewBox.h = newH;
      updateViewBox();
    }, { passive: false });

    svg.addEventListener('mousedown', startPan);
    svg.addEventListener('mousemove', pan);
    svg.addEventListener('mouseup', endPan);
    svg.addEventListener('mouseleave', endPan);
    svg.addEventListener('touchstart', startTouch, { passive: false });
    svg.addEventListener('touchmove', touchPan, { passive: false });
    svg.addEventListener('touchend', endTouch, { passive: false });

    function startPan(e) {
      // Only ignore if user clicked a person node group <g> or relation <line.relation>
      if (
        e.target.tagName === 'g' ||
        (e.target.tagName === 'line' && e.target.classList.contains('relation'))
      ) {
        return;
      }
      isPanning = true;
      startPoint = { x: e.clientX, y: e.clientY };
      svg.style.cursor = 'grabbing';
    }

    function pan(e) {
      if (!isPanning) return;
      const dx = (startPoint.x - e.clientX) * (viewBox.w / svg.clientWidth);
      const dy = (startPoint.y - e.clientY) * (viewBox.h / svg.clientHeight);
      viewBox.x += dx;
      viewBox.y += dy;
      startPoint = { x: e.clientX, y: e.clientY };
      updateViewBox();
    }

    function endPan() {
      isPanning = false;
      svg.style.cursor = 'default';
    }

    function startTouch(e) {
      if (e.touches.length === 1) {
        // For panning, only allow if not on a person or relation
        const t = e.touches[0];
        const touchedElem = document.elementFromPoint(t.clientX, t.clientY);
        if (
          touchedElem.tagName === 'g' ||
          (touchedElem.tagName === 'line' && touchedElem.classList.contains('relation'))
        ) {
          return;
        }
        isPanning = true;
        startPoint = { x: t.clientX, y: t.clientY };
      } else if (e.touches.length === 2) {
        lastTouchDistance = getTouchDistance(e.touches);
      }
    }

    function touchPan(e) {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning) {
        const dx = (startPoint.x - e.touches[0].clientX) * (viewBox.w / svg.clientWidth);
        const dy = (startPoint.y - e.touches[0].clientY) * (viewBox.h / svg.clientHeight);
        viewBox.x += dx;
        viewBox.y += dy;
        startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        updateViewBox();
      } else if (e.touches.length === 2) {
        const newDist = getTouchDistance(e.touches);
        // Calculate pinch scale
        let scale = lastTouchDistance / newDist;
        let newW = viewBox.w * scale;
        let newH = viewBox.h * scale;
        if (newW < 100) { newW = 100; newH = viewBox.h * (100 / viewBox.w); }
        if (newW > 20000) { newW = 20000; newH = viewBox.h * (20000 / viewBox.w); }
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const mx = (centerX / svg.clientWidth) * viewBox.w + viewBox.x;
        const my = (centerY / svg.clientHeight) * viewBox.h + viewBox.y;
        viewBox.x = mx - (mx - viewBox.x) * (newW / viewBox.w);
        viewBox.y = my - (my - viewBox.y) * (newH / viewBox.h);
        viewBox.w = newW;
        viewBox.h = newH;
        lastTouchDistance = newDist;
        updateViewBox();
      }
    }

    function endTouch(e) {
      isPanning = false;
    }

    function getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }

  // Add a new person node
  function addPerson() {
    const name = prompt('Enter given name:');
    if (name === null) return;
    const fatherName = prompt("Enter father's name:", '');
    if (fatherName === null) return;
    const surname = prompt('Enter surname:', '');
    if (surname === null) return;
    const dob = prompt('Enter date of birth (YYYY-MM-DD):', '');
    if (dob === null) return;
    const birthName = prompt('Enter birth name:', '');
    if (birthName === null) return;

    personCount++;
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;

    createPerson(
      `p${personCount}`,
      name,
      fatherName,
      surname,
      dob,
      birthName,
      cx,
      cy,
      +sizeInput.value || 40,
      colorPicker.value || '#3498db'
    );
  }

  // Create a person node
  function createPerson(id, name, fatherName, surname, dob, birthName, cx, cy, r, fill) {
    // Create the group
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.setAttribute('data-id', id);
    g.setAttribute('data-name', name || '');
    g.setAttribute('data-father-name', fatherName || '');
    g.setAttribute('data-surname', surname || '');
    g.setAttribute('data-dob', dob || '');
    g.setAttribute('data-birth-name', birthName || '');

    // Create circle
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', '#2980b9');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('class', 'person');

    // Create name text
    const fullName = [name, fatherName, surname].filter(Boolean).join(' ');
    const nameText = document.createElementNS(svg.namespaceURI, 'text');
    nameText.setAttribute('x', cx);
    nameText.setAttribute('y', cy - 10);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('class', 'name');
    nameText.textContent = fullName;

    // Create DOB text
    const dobText = document.createElementNS(svg.namespaceURI, 'text');
    dobText.setAttribute('x', cx);
    dobText.setAttribute('y', cy + 15);
    dobText.setAttribute('text-anchor', 'middle');
    dobText.setAttribute('class', 'dob');
    dobText.textContent = dob || '';

    // Append elements to group
    g.appendChild(circle);
    g.appendChild(nameText);
    g.appendChild(dobText);
    svg.appendChild(g);

    // Store references for updates
    circle._group = g;
    circle._nameText = nameText;
    circle._dobText = dobText;
    if (!initialCircle) initialCircle = circle;

    // Event listeners for click and edit
    g.addEventListener('click', e => handleNodeClick(e, circle));
    g.addEventListener('dblclick', e => editPerson(e, circle));

    // Touch support for double tap
    let lastTap = 0;
    g.addEventListener('touchend', e => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      if (tapLength < 500 && tapLength > 0) {
        // Double tap
        editPerson(e, circle);
        e.preventDefault();
      } else {
        // Single tap
        handleNodeClick(e, circle);
      }
      lastTap = currentTime;
    });

    // Setup drag functionality
    setupDrag(circle);

    return circle;
  }

  // Handle node click
  function handleNodeClick(e, circle) {
    e.stopPropagation();
    if (connectMode) {
      if (!selected) {
        selected = circle;
        circle.classList.add('selected');
      } else if (selected !== circle) {
        drawLine(selected, circle);
        selected.classList.remove('selected');
        selected = null;
        connectMode = false;
        connectBtn.textContent = 'Connect';
        svg.style.cursor = 'default';
      }
    } else {
      const g = circle._group;
      colorPicker.disabled = false;
      sizeInput.disabled = false;
      applyBtn.disabled = false;
      colorPicker.value = circle.getAttribute('fill');
      sizeInput.value = circle.getAttribute('r');
      selected = circle;
    }
  }

  function toggleConnectMode() {
    connectMode = !connectMode;
    connectBtn.textContent = connectMode ? 'Cancel' : 'Connect';
    svg.style.cursor = connectMode ? 'crosshair' : 'default';
    if (selected) {
      selected.classList.remove('selected');
      selected = null;
    }
  }

  function applyChanges() {
    if (!selected) return;
    const newColor = colorPicker.value;
    const newSize = +sizeInput.value;
    const g = selected._group;
    g.setAttribute('data-fill', newColor);
    g.setAttribute('data-r', newSize);
    selected.setAttribute('fill', newColor);
    selected.setAttribute('r', newSize);
    selected._nameText.setAttribute('x', selected.getAttribute('cx'));
    selected._nameText.setAttribute('y', +selected.getAttribute('cy') - 10);
    selected._dobText.setAttribute('x', selected.getAttribute('cx'));
    selected._dobText.setAttribute('y', +selected.getAttribute('cy') + 15);
  }

  // Connection lines (ALWAYS insert after grid, before first <g> node)
  function drawLine(c1, c2) {
    const l = document.createElementNS(svg.namespaceURI, 'line');
    l.setAttribute('x1', c1.getAttribute('cx'));
    l.setAttribute('y1', c1.getAttribute('cy'));
    l.setAttribute('x2', c2.getAttribute('cx'));
    l.setAttribute('y2', c2.getAttribute('cy'));
    l.setAttribute('stroke', '#555');
    l.setAttribute('stroke-width', '3');
    l.setAttribute('class', 'relation');
    l.setAttribute('data-source', c1._group.getAttribute('data-id'));
    l.setAttribute('data-target', c2._group.getAttribute('data-id'));

    // Insert AFTER all grid elements but BEFORE any person nodes
    // Find first <g> node, insert before that. If none, append.
    const firstPerson = Array.from(svg.childNodes).find(
      el => el.nodeType === 1 && el.tagName === 'g'
    );
    if (firstPerson) {
      svg.insertBefore(l, firstPerson);
    } else {
      svg.appendChild(l);
    }

    l.addEventListener('click', () => l.remove());
    c1._group._lines = c1._group._lines || [];
    c2._group._lines = c2._group._lines || [];
    c1._group._lines.push(l);
    c2._group._lines.push(l);
  }

  // Drag & move nodes, updating connection lines
  function setupDrag(circle) {
    let start, offset;
    circle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    circle.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);

    function startDrag(e) {
      e.stopPropagation();
      start = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
      const cx = +circle.getAttribute('cx');
      const cy = +circle.getAttribute('cy');
      offset = { x: cx * (svg.clientWidth / viewBox.w) - start.x, y: cy * (svg.clientHeight / viewBox.h) - start.y };
      svg.style.cursor = 'grabbing';
    }

    function drag(e) {
      if (!start) return;
      e.preventDefault();
      const move = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
      const x = (move.x + offset.x) * (viewBox.w / svg.clientWidth);
      const y = (move.y + offset.y) * (viewBox.h / svg.clientHeight);
      const snappedX = Math.round(x / 10) * 10;
      const snappedY = Math.round(y / 10) * 10;
      circle.setAttribute('cx', snappedX);
      circle.setAttribute('cy', snappedY);
      circle._nameText.setAttribute('x', snappedX);
      circle._nameText.setAttribute('y', snappedY - 10);
      circle._dobText.setAttribute('x', snappedX);
      circle._dobText.setAttribute('y', snappedY + 15);
      if (circle._group._lines) {
        circle._group._lines.forEach(l => {
          if (l.getAttribute('data-source') === circle._group.getAttribute('data-id')) {
            l.setAttribute('x1', snappedX);
            l.setAttribute('y1', snappedY);
          } else {
            l.setAttribute('x2', snappedX);
            l.setAttribute('y2', snappedY);
          }
        });
      }
    }

    function endDrag() {
      start = null;
      svg.style.cursor = 'default';
    }
  }

  function saveTree() {
    const data = getCurrentState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    URL.revokeObjectURL(url);
  }

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

  function loadTreeFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        loadTree(data);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function loadTree(data) {
    svg.innerHTML = '';
    createGrid();
    personCount = 0; selected = null; initialCircle = null;

    const circleMap = {};
    (data.people || []).forEach(p => {
      personCount = Math.max(personCount, +p.id.replace('p',''));
      const c = createPerson(
        p.id,
        p.name || '',
        p.father_name || '',
        p.surname || '',
        p.dob || '',
        p.birth_name || '',
        p.cx,
        p.cy,
        p.r,
        p.fill
      );
      circleMap[p.id] = c;
    });

    (data.relations || []).forEach(r => {
      const s = circleMap[r.source], t = circleMap[r.target];
      if (s && t) drawLine(s, t);
    });

    if (initialCircle) centerView();
  }

  function centerView() {
    if (!initialCircle) return;
    const cx = +initialCircle.getAttribute('cx');
    const cy = +initialCircle.getAttribute('cy');
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    updateViewBox();
  }

  function editPerson(e, circle) {
    e.stopPropagation();
    const g = circle._group;
    const newName = prompt('Edit given name:', g.getAttribute('data-name'));
    const newFatherName = prompt("Edit father's name:", g.getAttribute('data-father-name'));
    const newSurname = prompt('Edit surname:', g.getAttribute('data-surname'));
    const newDob = prompt('Edit DOB (YYYY-MM-DD):', g.getAttribute('data-dob'));
    const newBirthName = prompt('Edit birth name:', g.getAttribute('data-birth-name'));
    if (newName !== null) g.setAttribute('data-name', newName);
    if (newFatherName !== null) g.setAttribute('data-father-name', newFatherName);
    if (newSurname !== null) g.setAttribute('data-surname', newSurname);
    if (newDob !== null) g.setAttribute('data-dob', newDob);
    if (newBirthName !== null) g.setAttribute('data-birth-name', newBirthName);

    const fullName = [
      g.getAttribute('data-name'),
      g.getAttribute('data-father-name'),
      g.getAttribute('data-surname')
    ].filter(Boolean).join(' ');
    circle._nameText.textContent = fullName;
    circle._dobText.textContent = g.getAttribute('data-dob');
  }

  // Debugging connections (Ctrl+D)
  function debugConnections() {
    const lines = svg.querySelectorAll('line.relation');
    lines.forEach((line, index) => {
      const sourceId = line.getAttribute('data-source');
      const targetId = line.getAttribute('data-target');
      const sourceElem = svg.querySelector(`g[data-id="${sourceId}"]`);
      const targetElem = svg.querySelector(`g[data-id="${targetId}"]`);
      console.log(`Connection ${index + 1}: ${sourceId} -> ${targetId}`);
      console.log(`  Source exists: ${!!sourceElem}, Target exists: ${!!targetElem}`);
      console.log(`  Line coordinates: (${line.getAttribute('x1')},${line.getAttribute('y1')}) -> (${line.getAttribute('x2')},${line.getAttribute('y2')})`);
    });
  }

  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      debugConnections();
    }
  });
});
