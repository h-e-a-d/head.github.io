(() => {
  const svg = document.getElementById('svgArea');
  const addBtn = document.getElementById('addPersonBtn');
  const connectBtn = document.getElementById('connectBtn');
  const colorPicker = document.getElementById('colorPicker');
  const sizeInput = document.getElementById('sizeInput');
  const applyBtn = document.getElementById('applyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const loadInput = document.getElementById('loadInput');

  let personCount = 0;
  let connectMode = false;
  let selected = null;

  // Add / Connect shortcuts
  window.addEventListener('keydown', e => {
    if (e.target !== document.body) return;
    if (e.key.toLowerCase() === 'a') addBtn.click();
    if (e.key.toLowerCase() === 'c') connectBtn.click();
  });

  // Add person
  addBtn.addEventListener('click', () => {
    const name = prompt('Enter name:');
    if (!name) return;
    personCount++;
    const id = 'p' + personCount;
    const cx = 100 + personCount * 30;
    const cy = 100 + personCount * 30;

    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', 30);
    circle.setAttribute('fill', '#3498db');
    circle.setAttribute('stroke', '#2980b9');
    circle.setAttribute('stroke-width', 2);
    circle.classList.add('person');
    circle.dataset.id = id;
    circle.dataset.name = name;
    svg.appendChild(circle);

    const text = document.createElementNS(svg.namespaceURI, 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy + 5);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = name;
    text.style.pointerEvents = 'none';
    svg.appendChild(text);

    circle._text = text;
    circle.addEventListener('click', pickOrConnect);
    circle.addEventListener('dblclick', editName);

    enableDrag(circle);
  });

  // Toggle connect mode
  connectBtn.addEventListener('click', () => {
    connectMode = !connectMode;
    connectBtn.textContent = connectMode ? 'Cancel Connect' : 'Connect';
    clearSelection();
  });

  // Apply color/size to selected
  applyBtn.addEventListener('click', () => {
    if (!selected) return;
    selected.setAttribute('fill', colorPicker.value);
    selected.setAttribute('r', sizeInput.value);
    // reposition text and lines
    const cy = +selected.getAttribute('cy');
    selected._text.setAttribute('y', cy + 5);
    updateLines(selected);
  });

  // Save JSON
  saveBtn.addEventListener('click', () => {
    const data = {
      people: [...svg.querySelectorAll('circle')].map(c => ({
        id: c.dataset.id,
        name: c.dataset.name,
        cx: +c.getAttribute('cx'),
        cy: +c.getAttribute('cy'),
        r: +c.getAttribute('r'),
        fill: c.getAttribute('fill')
      })),
      relations: [...svg.querySelectorAll('line')].map(l => ({
        source: l.dataset.source,
        target: l.dataset.target
      }))
    };
    const blob = new Blob([JSON.stringify(data, null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Load JSON
  loadInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        loadTree(data);
      } catch(err) {
        alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function pickOrConnect(e) {
    const circle = e.currentTarget;
    if (connectMode) {
      if (!selected) {
        selected = circle;
        circle.classList.add('selected');
      } else if (selected !== circle) {
        drawLine(selected, circle);
        clearSelection();
        connectMode = false;
        connectBtn.textContent = 'Connect';
      }
    } else {
      clearSelection();
      selected = circle;
      circle.classList.add('selected');
      // enable header controls
      colorPicker.disabled = false;
      sizeInput.disabled = false;
      applyBtn.disabled = false;
      colorPicker.value = rgbToHex(circle.getAttribute('fill'));
      sizeInput.value = circle.getAttribute('r');
    }
  }

  function editName(e) {
    const c = e.currentTarget;
    const newName = prompt('Edit name:', c.dataset.name);
    if (newName) {
      c.dataset.name = newName;
      c._text.textContent = newName;
    }
  }

  function drawLine(a, b) {
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', a.getAttribute('cx'));
    line.setAttribute('y1', a.getAttribute('cy'));
    line.setAttribute('x2', b.getAttribute('cx'));
    line.setAttribute('y2', b.getAttribute('cy'));
    line.classList.add('relation');
    line.dataset.source = a.dataset.id;
    line.dataset.target = b.dataset.id;
    line.addEventListener('click', () => {
      if (confirm('Delete this connection?')) line.remove();
    });
    svg.insertBefore(line, svg.firstChild);
  }

  function clearSelection() {
    svg.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    selected = null;
    colorPicker.disabled = true;
    sizeInput.disabled = true;
    applyBtn.disabled = true;
  }

  function enableDrag(circle) {
    let dx, dy, dragging = false;
    circle.addEventListener('mousedown', e => {
      if (connectMode) return;
      clearSelection();
      dragging = true;
      dx = e.clientX - +circle.getAttribute('cx');
      dy = e.clientY - +circle.getAttribute('cy');
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      let cx = Math.round((e.clientX - dx)/10)*10;
      let cy = Math.round((e.clientY - dy)/10)*10;
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle._text.setAttribute('x', cx);
      circle._text.setAttribute('y', cy + 5);
      updateLines(circle);
    });
    window.addEventListener('mouseup', () => dragging = false);
  }

  function updateLines(circle) {
    svg.querySelectorAll('line').forEach(l => {
      if (l.dataset.source === circle.dataset.id) {
        l.setAttribute('x1', circle.getAttribute('cx'));
        l.setAttribute('y1', circle.getAttribute('cy'));
      }
      if (l.dataset.target === circle.dataset.id) {
        l.setAttribute('x2', circle.getAttribute('cx'));
        l.setAttribute('y2', circle.getAttribute('cy'));
      }
    });
  }

  function loadTree(data) {
    // clear
    svg.innerHTML = '';
    personCount = 0;
    // create circles
    data.people.forEach(p => {
      personCount++;
      const circle = document.createElementNS(svg.namespaceURI, 'circle');
      circle.setAttribute('cx', p.cx);
      circle.setAttribute('cy', p.cy);
      circle.setAttribute('r', p.r);
      circle.setAttribute('fill', p.fill);
      circle.setAttribute('stroke', '#2980b9');
      circle.setAttribute('stroke-width', 2);
      circle.classList.add('person');
      circle.dataset.id = p.id;
      circle.dataset.name = p.name;
      svg.appendChild(circle);
      const text = document.createElementNS(svg.namespaceURI, 'text');
      text.setAttribute('x', p.cx);
      text.setAttribute('y', p.cy + 5);
      text.setAttribute('text-anchor', 'middle');
      text.textContent = p.name;
      text.style.pointerEvents = 'none';
      svg.appendChild(text);
      circle._text = text;
      circle.addEventListener('click', pickOrConnect);
      circle.addEventListener('dblclick', editName);
      enableDrag(circle);
    });
    // create lines
    data.relations.forEach(r => {
      const a = svg.querySelector(`[data-id="${r.source}"]`);
      const b = svg.querySelector(`[data-id="${r.target}"]`);
      if (a && b) drawLine(a, b);
    });
  }

  // helper
  function rgbToHex(rgb) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = rgb;
    return ctx.fillStyle;
  }
})();
