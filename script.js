(() => {
  const svg = document.getElementById('svgArea');
  const controls = document.getElementById('controls');
  const addBtn = document.getElementById('addPersonBtn');
  const connectBtn = document.getElementById('connectBtn');
  const colorPicker = document.getElementById('colorPicker');
  const sizeInput = document.getElementById('sizeInput');
  const applyBtn = document.getElementById('applyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadInput = document.getElementById('loadInput');

  // Center Button
  const centerBtn = document.createElement('button');
  centerBtn.id = 'centerBtn';
  centerBtn.textContent = 'Center';
  controls.appendChild(centerBtn);

  let personCount = 0;
  let connectMode = false;
  let selected = null;
  let initialCircle = null;

  // Setup viewBox
  let viewBox = { x: 0, y: 0, w: 800, h: 600 };  // Fixed default size
  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);

  // Zoom
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const scale = e.deltaY < 0 ? 0.9 : 1.1;
    const cx = viewBox.x + mx * viewBox.w;
    const cy = viewBox.y + my * viewBox.h;
    viewBox.w *= scale;
    viewBox.h *= scale;
    viewBox.x = cx - mx * viewBox.w;
    viewBox.y = cy - my * viewBox.h;
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }, { passive: false });

  // Pan
  let panning = false;
  let panStart = { x: 0, y: 0 };
  svg.addEventListener('mousedown', e => {
    if (e.target === svg) {
      panning = true;
      panStart = { x: e.clientX, y: e.clientY };
      svg.style.cursor = 'move';
    }
  });
  
  window.addEventListener('mousemove', e => {
    if (!panning) return;
    const dx = (panStart.x - e.clientX) * (viewBox.w / svg.clientWidth);
    const dy = (panStart.y - e.clientY) * (viewBox.h / svg.clientHeight);
    viewBox.x += dx;
    viewBox.y += dy;
    panStart = { x: e.clientX, y: e.clientY };
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  });
  
  window.addEventListener('mouseup', () => {
    if (panning) {
      panning = false;
      svg.style.cursor = 'default';
    }
  });

  // Add keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (e.key === 'a' || e.key === 'A') {
      addBtn.click();
    } else if (e.key === 'c' || e.key === 'C') {
      connectBtn.click();
    }
  });

  // Add Person
  addBtn.addEventListener('click', () => {
    const name = prompt('Enter name:'); 
    if (!name) return;
    const dob = prompt('Enter date of birth (YYYY-MM-DD):', '');
    personCount++;
    const id = `p${personCount}`;
    
    // Calculate position based on viewBox to place in view
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    
    createPerson(id, name, dob, cx, cy, 40, '#3498db');
  });

  // Connect toggle
  connectBtn.addEventListener('click', () => {
    connectMode = !connectMode;
    connectBtn.textContent = connectMode ? 'Cancel Connect' : 'Connect (C)';
    svg.style.cursor = connectMode ? 'crosshair' : 'default';
    clearSelection();
  });

  // Apply
  applyBtn.addEventListener('click', () => {
    if (!selected) return;
    selected.setAttribute('fill', colorPicker.value);
    selected.setAttribute('r', sizeInput.value);
    reposition(selected);
  });

  // Save/Load
  saveBtn.addEventListener('click', () => downloadJSON(getCurrentState(), 'family-tree.json'));
  loadInput.addEventListener('change', loadTreeFromFile);

  // Center
  centerBtn.addEventListener('click', () => {
    if (!initialCircle) return;
    const cx = +initialCircle.getAttribute('cx');
    const cy = +initialCircle.getAttribute('cy');
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  });

  // Helpers
  function createPerson(id, name, dob, cx, cy, r, fill) {
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.dataset.id = id;
    svg.appendChild(g);
    
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', '#2980b9');
    circle.setAttribute('stroke-width', '2');
    circle.style.cursor = 'grab';
    circle.classList.add('person');
    g.appendChild(circle);
    
    if (!initialCircle) initialCircle = circle;

    const nameText = document.createElementNS(svg.namespaceURI, 'text');
    nameText.setAttribute('x', cx);
    nameText.setAttribute('y', cy - 5);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.textContent = name;
    nameText.classList.add('name');
    g.appendChild(nameText);

    const dobText = document.createElementNS(svg.namespaceURI, 'text');
    dobText.setAttribute('x', cx);
    dobText.setAttribute('y', cy + 15);
    dobText.setAttribute('text-anchor', 'middle');
    dobText.classList.add('dob');
    dobText.textContent = dob || '';
    g.appendChild(dobText);

    // Store data
    g.dataset.name = name;
    g.dataset.dob = dob || '';
    circle._nameText = nameText;
    circle._dobText = dobText;
    circle._group = g;
    
    g.addEventListener('click', e => pickOrConnect(e, circle));
    g.addEventListener('dblclick', e => editPerson(e, circle));
    enableDrag(circle);
    
    return circle;
  }
  
  function pickOrConnect(e, circle) {
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
        connectBtn.textContent = 'Connect (C)';
        svg.style.cursor = 'default';
      }
    } else {
      if (selected) selected.classList.remove('selected');
      selected = circle;
      circle.classList.add('selected');
      enableHeader(circle);
    }
  }
  
  function editPerson(e, circle) {
    e.stopPropagation();
    const g = circle._group;
    const newName = prompt('Edit name:', g.dataset.name);
    
    if (newName !== null) {
      g.dataset.name = newName;
      circle._nameText.textContent = newName;
    }
    
    const newDob = prompt('Edit DOB:', g.dataset.dob);
    if (newDob !== null) {
      g.dataset.dob = newDob;
      circle._dobText.textContent = newDob;
    }
  }
  
  function drawLine(a, b) {
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', a.getAttribute('cx'));
    line.setAttribute('y1', a.getAttribute('cy'));
    line.setAttribute('x2', b.getAttribute('cx'));
    line.setAttribute('y2', b.getAttribute('cy'));
    line.setAttribute('stroke', '#555');
    line.setAttribute('stroke-width', '2');
    line.classList.add('relation');
    line.dataset.source = a._group.dataset.id;
    line.dataset.target = b._group.dataset.id;
    
    svg.insertBefore(line, svg.firstChild);
    
    line.addEventListener('click', ev => {
      ev.stopPropagation();
      if (confirm('Delete connection?')) line.remove();
    });
  }
  
  function clearSelection() {
    svg.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    selected = null;
    colorPicker.disabled = true;
    sizeInput.disabled = true;
    applyBtn.disabled = true;
  }
  
  function enableHeader(circle) {
    colorPicker.disabled = false;
    sizeInput.disabled = false;
    applyBtn.disabled = false;
    colorPicker.value = rgbToHex(circle.getAttribute('fill'));
    sizeInput.value = circle.getAttribute('r');
  }
  
  function enableDrag(circle) {
    let dragging = false;
    let offset = { x: 0, y: 0 };
    
    circle._group.addEventListener('mousedown', e => {
      if(connectMode) return;
      e.stopPropagation();
      dragging = true;
      const point = getPoint(e.clientX, e.clientY);
      offset.x = point.x - +circle.getAttribute('cx');
      offset.y = point.y - +circle.getAttribute('cy');
      circle.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mousemove', e => {
      if(!dragging) return;
      const point = getPoint(e.clientX, e.clientY);
      circle.setAttribute('cx', Math.round((point.x - offset.x)/10)*10);
      circle.setAttribute('cy', Math.round((point.y - offset.y)/10)*10);
      reposition(circle);
    });
    
    window.addEventListener('mouseup', () => {
      if(dragging) {
        dragging = false;
        circle.style.cursor = 'grab';
      }
    });
  }
  
  function getPoint(x, y) {
    const point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }
  
  function reposition(circle) {
    const cx = +circle.getAttribute('cx');
    const cy = +circle.getAttribute('cy');
    
    circle._nameText.setAttribute('x', cx);
    circle._nameText.setAttribute('y', cy - 5);
    circle._dobText.setAttribute('x', cx);
    circle._dobText.setAttribute('y', cy + 15);
    
    updateLines(circle);
  }
  
  function updateLines(circle) {
    const id = circle._group.dataset.id;
    svg.querySelectorAll('line').forEach(line => {
      if(line.dataset.source === id) {
        line.setAttribute('x1', circle.getAttribute('cx'));
        line.setAttribute('y1', circle.getAttribute('cy'));
      }
      if(line.dataset.target === id) {
        line.setAttribute('x2', circle.getAttribute('cx'));
        line.setAttribute('y2', circle.getAttribute('cy'));
      }
    });
  }
  
  function getCurrentState() {
    return {
      people: [...svg.querySelectorAll('g[data-id]')].map(g => {
        const circle = g.querySelector('circle');
        return {
          id: g.dataset.id,
          name: g.dataset.name,
          dob: g.dataset.dob,
          cx: +circle.getAttribute('cx'),
          cy: +circle.getAttribute('cy'),
          r: +circle.getAttribute('r'),
          fill: circle.getAttribute('fill')
        };
      }),
      relations: [...svg.querySelectorAll('line')].map(l => ({
        source: l.dataset.source,
        target: l.dataset.target
      }))
    };
  }
  
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function loadTreeFromFile(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        loadTree(data);
      } catch(err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  
  function loadTree(data) {
    // Clear all existing elements
    svg.innerHTML = '';
    personCount = 0;
    selected = null;
    initialCircle = null;
    
    // Create all people first
    const circleMap = {};
    
    data.people.forEach(p => {
      personCount = Math.max(personCount, parseInt(p.id.replace('p', ''), 10) || 0);
      const circle = createPerson(p.id, p.name, p.dob, p.cx, p.cy, p.r, p.fill);
      circleMap[p.id] = circle;
    });
    
    // Then create all relations
    data.relations.forEach(r => {
      const sourceCircle = circleMap[r.source];
      const targetCircle = circleMap[r.target];
      
      if(sourceCircle && targetCircle) {
        drawLine(sourceCircle, targetCircle);
      }
    });
  }
  
  function rgbToHex(rgb) {
    // Handle if it's already hex
    if(rgb && rgb.startsWith('#')) {
      return rgb;
    }
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.fillStyle = rgb;
    return context.fillStyle;
  }
})();
