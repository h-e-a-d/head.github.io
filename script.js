// Family Tree Builder
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
  
  // Set initial viewBox
  updateViewBox();

  // Create background grid
  createGrid();
  
  // Add event listeners
  addBtn.addEventListener('click', addPerson);
  connectBtn.addEventListener('click', toggleConnectMode);
  applyBtn.addEventListener('click', applyChanges);
  saveBtn.addEventListener('click', saveTree);
  loadInput.addEventListener('change', loadTreeFromFile);
  centerBtn.addEventListener('click', centerView);
  
  // Setup SVG mouse events
  setupPanAndZoom();
  
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
  
  // Set up pan and zoom
  function setupPanAndZoom() {
    // Mouse wheel zoom
    svg.addEventListener('wheel', handleWheel, { passive: false });
    
    // Mouse pan
    svg.addEventListener('mousedown', startPan);
    window.addEventListener('mousemove', movePan);
    window.addEventListener('mouseup', endPan);
    
    // Touch events for panning
    svg.addEventListener('touchstart', startTouch, { passive: false });
    svg.addEventListener('touchmove', moveTouch, { passive: false });
    svg.addEventListener('touchend', endTouch, { passive: false });
  }
  
  // Panning state
  let isPanning = false;
  let startPoint = null;
  let lastTouchDistance = 0;
  
  function startPan(e) {
    // Only start panning if clicking on the SVG background or grid
    if (e.target === svg || e.target.tagName === 'rect' || e.target.tagName === 'line') {
      isPanning = true;
      startPoint = { x: e.clientX, y: e.clientY };
      svg.style.cursor = 'move';
    }
  }
  
  function movePan(e) {
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
    // Check if touching background elements
    const target = e.target;
    if (target === svg || target.tagName === 'rect' || target.tagName === 'line') {
      // Prevent default to avoid scrolling
      e.preventDefault();
      
      if (e.touches.length === 1) {
        // Single touch - panning
        isPanning = true;
        startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } 
      else if (e.touches.length === 2) {
        // Two touches - pinch zoom
        isPanning = false;
        lastTouchDistance = getTouchDistance(e.touches);
      }
    }
  }
  
  function moveTouch(e) {
    if (e.touches.length === 1 && isPanning) {
      // Process pan
      e.preventDefault();
      
      const touch = e.touches[0];
      const dx = (startPoint.x - touch.clientX) * (viewBox.w / svg.clientWidth);
      const dy = (startPoint.y - touch.clientY) * (viewBox.h / svg.clientHeight);
      
      viewBox.x += dx;
      viewBox.y += dy;
      startPoint = { x: touch.clientX, y: touch.clientY };
      
      updateViewBox();
    } 
    else if (e.touches.length === 2) {
      // Process pinch zoom
      e.preventDefault();
      
      const currentDistance = getTouchDistance(e.touches);
      
      if (lastTouchDistance > 0) {
        const rect = svg.getBoundingClientRect();
        const center = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
        
        // Convert to relative coordinates (0-1)
        const mx = (center.x - rect.left) / rect.width;
        const my = (center.y - rect.top) / rect.height;
        
        // Calculate scale factor (pinch in = zoom out)
        const scale = lastTouchDistance / currentDistance;
        
        // Apply zoom
        const cx = viewBox.x + mx * viewBox.w;
        const cy = viewBox.y + my * viewBox.h;
        
        viewBox.w *= scale;
        viewBox.h *= scale;
        viewBox.x = cx - mx * viewBox.w;
        viewBox.y = cy - my * viewBox.h;
        
        updateViewBox();
      }
      
      lastTouchDistance = currentDistance;
    }
  }
  
  function endTouch() {
    isPanning = false;
    lastTouchDistance = 0;
  }
  
  function getTouchDistance(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }
  
  function handleWheel(e) {
    e.preventDefault();
    
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    
    // Determine zoom direction
    const scale = e.deltaY < 0 ? 0.8 : 1.25;
    
    // Calculate zoom center
    const cx = viewBox.x + mx * viewBox.w;
    const cy = viewBox.y + my * viewBox.h;
    
    // Apply zoom
    viewBox.w *= scale;
    viewBox.h *= scale;
    viewBox.x = cx - mx * viewBox.w;
    viewBox.y = cy - my * viewBox.h;
    
    updateViewBox();
  }
  
  function updateViewBox() {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }
  
  // Add a new person node
  function addPerson() {
    const name = prompt('Enter name:');
    if (!name) return;
    
    const dob = prompt('Enter date of birth (YYYY-MM-DD):', '');
    personCount++;
    
    // Place in center of current view
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    
    createPerson(`p${personCount}`, name, dob, cx, cy, 40, '#3498db');
  }
  
  // Toggle connect mode
  function toggleConnectMode() {
    connectMode = !connectMode;
    connectBtn.textContent = connectMode ? 'Cancel Connect' : 'Connect';
    svg.style.cursor = connectMode ? 'crosshair' : 'default';
    
    if (selected) {
      selected.classList.remove('selected');
      selected = null;
      updateControls();
    }
  }
  
  // Apply changes to selected person
  function applyChanges() {
    if (!selected) return;
    
    selected.setAttribute('fill', colorPicker.value);
    selected.setAttribute('r', sizeInput.value);
    reposition(selected);
  }
  
  // Save tree
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
  
  // Load tree from uploaded file
  function loadTreeFromFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        // Parse the JSON data
        const data = JSON.parse(reader.result);
        
        // Validate data structure
        if (!data.people || !Array.isArray(data.people)) {
          throw new Error("Invalid file format: 'people' array is missing");
        }
        
        // Load the tree
        loadTree(data);
        
        // Notify success
        console.log(`Loaded family tree with ${data.people.length} people and ${data.relations ? data.relations.length : 0} connections`);
      } catch(err) {
        alert(`Error loading file: ${err.message}`);
        console.error("Error loading family tree:", err);
      }
    };
    
    reader.onerror = () => {
      alert("Error reading file");
    };
    
    reader.readAsText(file);
    e.target.value = '';
  }
  
  // Center view
  function centerView() {
    if (!initialCircle) return;
    
    const cx = +initialCircle.getAttribute('cx');
    const cy = +initialCircle.getAttribute('cy');
    
    viewBox.x = cx - viewBox.w / 2;
    viewBox.y = cy - viewBox.h / 2;
    
    updateViewBox();
  }
  
  // Create a person node
  function createPerson(id, name, dob, cx, cy, r, fill) {
    // Create the group
    const g = document.createElementNS(svg.namespaceURI, 'g');
    g.setAttribute('data-id', id);
    g.setAttribute('data-name', name || '');
    g.setAttribute('data-dob', dob || '');
    
    // Create circle
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', '#2980b9');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('class', 'person');
    
    // Create text elements
    const nameText = document.createElementNS(svg.namespaceURI, 'text');
    nameText.setAttribute('x', cx);
    nameText.setAttribute('y', cy - 5);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('class', 'name');
    nameText.textContent = name || '';
    
    const dobText = document.createElementNS(svg.namespaceURI, 'text');
    dobText.setAttribute('x', cx);
    dobText.setAttribute('y', cy + 15);
    dobText.setAttribute('text-anchor', 'middle');
    dobText.setAttribute('class', 'dob');
    dobText.textContent = dob || '';
    
    // Add elements to group
    g.appendChild(circle);
    g.appendChild(nameText);
    g.appendChild(dobText);
    
    // Add group to SVG
    svg.appendChild(g);
    
    // Store references
    circle._group = g;
    circle._nameText = nameText;
    circle._dobText = dobText;
    
    // Set initial circle if this is the first one
    if (!initialCircle) initialCircle = circle;
    
    // Add event listeners
    g.addEventListener('click', e => handleNodeClick(e, circle));
    g.addEventListener('dblclick', e => editPerson(e, circle));
    
    // Add touch support for double tap
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
        // First node in connection
        selected = circle;
        circle.classList.add('selected');
      } else if (selected !== circle) {
        // Second node - create connection
        drawLine(selected, circle);
        selected.classList.remove('selected');
        selected = null;
        
        // Exit connect mode
        connectMode = false;
        connectBtn.textContent = 'Connect';
        svg.style.cursor = 'default';
      }
    } else {
      // Regular selection
      if (selected) selected.classList.remove('selected');
      selected = circle;
      circle.classList.add('selected');
      
      // Update controls
      updateControls(circle);
    }
  }
  
  // Edit person
  function editPerson(e, circle) {
    e.stopPropagation();
    
    const g = circle._group;
    const newName = prompt('Edit name:', g.getAttribute('data-name'));
    
    if (newName !== null) {
      g.setAttribute('data-name', newName);
      circle._nameText.textContent = newName;
    }
    
    const newDob = prompt('Edit DOB:', g.getAttribute('data-dob'));
    if (newDob !== null) {
      g.setAttribute('data-dob', newDob);
      circle._dobText.textContent = newDob;
    }
  }
  
  // Update control panel
  function updateControls(circle) {
    if (circle) {
      colorPicker.disabled = false;
      sizeInput.disabled = false;
      applyBtn.disabled = false;
      
      colorPicker.value = rgbToHex(circle.getAttribute('fill'));
      sizeInput.value = circle.getAttribute('r');
    } else {
      colorPicker.disabled = true;
      sizeInput.disabled = true;
      applyBtn.disabled = true;
    }
  }
  
  // Draw a connection line
  function drawLine(source, target) {
    const line = document.createElementNS(svg.namespaceURI, 'line');
    line.setAttribute('x1', source.getAttribute('cx'));
    line.setAttribute('y1', source.getAttribute('cy'));
    line.setAttribute('x2', target.getAttribute('cx'));
    line.setAttribute('y2', target.getAttribute('cy'));
    line.setAttribute('stroke', '#555');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('class', 'relation');
    
    line.setAttribute('data-source', source._group.getAttribute('data-id'));
    line.setAttribute('data-target', target._group.getAttribute('data-id'));
    
    // Insert line before the first node to ensure proper layering
    const firstGroup = svg.querySelector('g');
    if (firstGroup) {
      svg.insertBefore(line, firstGroup);
    } else {
      svg.appendChild(line);
    }
    
    // Add delete functionality
    line.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Delete connection?')) {
        line.remove();
      }
    });
    
    return line;
  }
  
  // Setup drag functionality
  function setupDrag(circle) {
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    
    // Setup mouse drag
    circle._group.addEventListener('mousedown', e => {
      if (connectMode) return;
      
      e.stopPropagation();
      isDragging = true;
      
      const point = getPoint(e.clientX, e.clientY);
      offset.x = point.x - +circle.getAttribute('cx');
      offset.y = point.y - +circle.getAttribute('cy');
      
      circle.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      
      const point = getPoint(e.clientX, e.clientY);
      moveCircle(circle, point.x - offset.x, point.y - offset.y);
    });
    
    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        circle.style.cursor = 'grab';
      }
    });
    
    // Setup touch drag
    circle._group.addEventListener('touchstart', e => {
      if (connectMode) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = true;
      
      const touch = e.touches[0];
      const point = getPoint(touch.clientX, touch.clientY);
      
      offset.x = point.x - +circle.getAttribute('cx');
      offset.y = point.y - +circle.getAttribute('cy');
      
      circle.style.cursor = 'grabbing';
    }, { passive: false });
    
    window.addEventListener('touchmove', e => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const touch = e.touches[0];
      const point = getPoint(touch.clientX, touch.clientY);
      
      moveCircle(circle, point.x - offset.x, point.y - offset.y);
    }, { passive: false });
    
    window.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;
        circle.style.cursor = 'grab';
      }
    });
  }
  
  // Move circle to new position
  function moveCircle(circle, x, y) {
    // Snap to grid (10px)
    const snapX = Math.round(x / 10) * 10;
    const snapY = Math.round(y / 10) * 10;
    
    circle.setAttribute('cx', snapX);
    circle.setAttribute('cy', snapY);
    
    reposition(circle);
  }
  
  // Reposition circle and update connections
  function reposition(circle) {
    const cx = +circle.getAttribute('cx');
    const cy = +circle.getAttribute('cy');
    
    // Update text positions
    circle._nameText.setAttribute('x', cx);
    circle._nameText.setAttribute('y', cy - 5);
    circle._dobText.setAttribute('x', cx);
    circle._dobText.setAttribute('y', cy + 15);
    
    // Update connected lines
    updateLines(circle);
  }
  
  // Update connected lines
  function updateLines(circle) {
    const id = circle._group.getAttribute('data-id');
    
    svg.querySelectorAll('line.relation').forEach(line => {
      if (line.getAttribute('data-source') === id) {
        line.setAttribute('x1', circle.getAttribute('cx'));
        line.setAttribute('y1', circle.getAttribute('cy'));
      }
      if (line.getAttribute('data-target') === id) {
        line.setAttribute('x2', circle.getAttribute('cx'));
        line.setAttribute('y2', circle.getAttribute('cy'));
      }
    });
  }
  
  // Convert coordinates from screen to SVG
  function getPoint(clientX, clientY) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }
  
  // Get current tree state
  function getCurrentState() {
    return {
      people: [...svg.querySelectorAll('g[data-id]')].map(g => {
        const circle = g.querySelector('circle');
        return {
          id: g.getAttribute('data-id'),
          name: g.getAttribute('data-name'),
          dob: g.getAttribute('data-dob'),
          cx: +circle.getAttribute('cx'),
          cy: +circle.getAttribute('cy'),
          r: +circle.getAttribute('r'),
          fill: circle.getAttribute('fill')
        };
      }),
      relations: [...svg.querySelectorAll('line.relation')].map(line => ({
        source: line.getAttribute('data-source'),
        target: line.getAttribute('data-target')
      }))
    };
  }
  
  // Function to load tree from JSON data
  function loadTree(data) {
    // Clear the SVG
    svg.innerHTML = '';
    
    // Recreate the background grid
    createGrid();
    
    // Reset state
    personCount = 0;
    selected = null;
    initialCircle = null;
    
    // Store the current viewBox values
    const currentView = {
      x: viewBox.x,
      y: viewBox.y,
      w: viewBox.w,
      h: viewBox.h
    };
    
    // Create people first
    const circleMap = {};
    
    // First pass - create all person nodes
    if (data.people && Array.isArray(data.people)) {
      data.people.forEach(p => {
        personCount = Math.max(personCount, parseInt(p.id.replace('p', ''), 10) || 0);
        const circle = createPerson(p.id, p.name, p.dob, p.cx, p.cy, p.r, p.fill);
        circleMap[p.id] = circle;
      });
    } else {
      console.error("No people array found in data");
      return;
    }
    
    // Second pass - create all relations
    if (data.relations && Array.isArray(data.relations)) {
      console.log(`Creating ${data.relations.length} connections...`);
      
      data.relations.forEach(r => {
        // Get the source and target circles
        const sourceCircle = circleMap[r.source];
        const targetCircle = circleMap[r.target];
        
        if (sourceCircle && targetCircle) {
          // Create the connection line
          const line = document.createElementNS(svg.namespaceURI, 'line');
          line.setAttribute('x1', sourceCircle.getAttribute('cx'));
          line.setAttribute('y1', sourceCircle.getAttribute('cy'));
          line.setAttribute('x2', targetCircle.getAttribute('cx'));
          line.setAttribute('y2', targetCircle.getAttribute('cy'));
          line.setAttribute('stroke', '#555');
          line.setAttribute('stroke-width', '3');
          line.setAttribute('class', 'relation');
          
          // Set the data attributes for source and target
          line.setAttribute('data-source', r.source);
          line.setAttribute('data-target', r.target);
          
          // Insert line before the first person node
          const firstNode = svg.querySelector('g');
          if (firstNode) {
            svg.insertBefore(line, firstNode);
          } else {
            svg.appendChild(line);
          }
          
          // Add delete functionality
          line.addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Delete connection?')) {
              line.remove();
            }
          });
        } else {
          console.warn(`Connection between ${r.source} and ${r.target} could not be created - nodes not found`);
        }
      });
    } else {
      console.warn("No relations array found in the loaded data");
    }
    
    // Debug count of connections
    const lines = svg.querySelectorAll('line.relation');
    console.log(`Created ${lines.length} connection lines`);
    
    // Center the view on the first person if available
    if (initialCircle) {
      centerView();
    }
  }
  
  // Convert RGB to HEX
  function rgbToHex(color) {
    // Handle if already hex
    if (color && color.startsWith('#')) {
      return color;
    }
    
    // Use canvas to convert
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    return context.fillStyle;
  }
  
  // Debug function to log connection data
  function debugConnections() {
    const relations = svg.querySelectorAll('line.relation');
    
    console.log(`Found ${relations.length} connections:`);
    
    relations.forEach((line, index) => {
      const sourceId = line.getAttribute('data-source');
      const targetId = line.getAttribute('data-target');
      const sourceElem = svg.querySelector(`g[data-id="${sourceId}"]`);
      const targetElem = svg.querySelector(`g[data-id="${targetId}"]`);
      
      console.log(`Connection ${index + 1}: ${sourceId} -> ${targetId}`);
      console.log(`  Source exists: ${!!sourceElem}, Target exists: ${!!targetElem}`);
      console.log(`  Line coordinates: (${line.getAttribute('x1')},${line.getAttribute('y1')}) -> (${line.getAttribute('x2')},${line.getAttribute('y2')})`);
    });
  }
  
  // Add keyboard shortcut for debugging (Ctrl+D)
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      debugConnections();
    }
  });
});
