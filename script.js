// script.js - Family Tree Builder with Mother/Father/Gender dropdowns, font color controls, and updated DOB format
document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const svg             = document.getElementById('svgArea');
  const addBtn          = document.getElementById('addPersonBtn');
  const connectBtn      = document.getElementById('connectBtn');
  const generateConnectionsBtn = document.getElementById('generateConnectionsBtn');
  const centerBtn       = document.getElementById('centerBtn');
  const colorPicker     = document.getElementById('colorPicker');
  const sizeInput       = document.getElementById('sizeInput');
  const applyBtn        = document.getElementById('applyBtn');
  const bringToFrontBtn = document.getElementById('bringToFrontBtn');
  const undoBtn         = document.getElementById('undoBtn');
  const saveBtn         = document.getElementById('saveBtn');
  const loadInput       = document.getElementById('loadInput');
  const fontSelect      = document.getElementById('fontSelect');
  const fontSizeInput   = document.getElementById('fontSizeInput');
  
  // NEW: Font color controls
  const nameColorPicker = document.getElementById('nameColorPicker');
  const dateColorPicker = document.getElementById('dateColorPicker');
  
  // Modal elements
  const personModal = document.getElementById('personModal');
  const modalTitle = document.getElementById('modalTitle');
  const personForm = document.getElementById('personForm');
  const modalName = document.getElementById('modalName');
  const modalFather = document.getElementById('modalFather');
  const modalSurname = document.getElementById('modalSurname');
  const modalDob = document.getElementById('modalDob');
  const modalBirth = document.getElementById('modalBirth');
  const modalGender = document.getElementById('modalGender');
  const modalMother = document.getElementById('modalMother');
  const modalFatherSelect = document.getElementById('modalFatherSelect');
  const modalSpouse = document.getElementById('modalSpouse');
  const modalCancel = document.getElementById('modalCancel');
  const peopleCounter = document.getElementById('peopleCounter');
  
  // View mode elements
  const viewModeToggle = document.getElementById('viewModeToggle');
  const graphicView = document.getElementById('graphicView');
  const tableView = document.getElementById('tableView');
  const tableSearch = document.getElementById('tableSearch');
  const tableSortBy = document.getElementById('tableSortBy');
  const familyTableBody = document.getElementById('familyTableBody');

  let modalMode = ''; // 'add' or 'edit'
  let editingCircle = null;

  // Global font settings - UPDATED with color controls
  let globalFontFamily = fontSelect.value;
  let globalFontSize   = +fontSizeInput.value;
  let globalNameColor  = nameColorPicker.value; // NEW
  let globalDateColor  = dateColorPicker.value; // NEW

  // State
  let personCount   = 0;
  let connectMode   = false;
  let selected      = null;
  let initialCircle = null;
  let viewBox       = { x: 0, y: 0, w: 800, h: 600 };
  let isTableView   = false; // Track current view mode

  // Undo history
  let history       = [];
  let isRestoring   = false;

  // Initialize
  updateViewBox();
  createGrid();
  setupPanAndZoom();
  updateGlobalFontCSS();
  updatePeopleCounter();
  
  // Setup view toggle and table view after DOM is ready
  setTimeout(() => {
    console.log('Initializing view toggle...');
    console.log('Toggle element:', viewModeToggle);
    console.log('Graphic view element:', graphicView);
    console.log('Table view element:', tableView);
    console.log('Table search element:', tableSearch);
    console.log('Table sort element:', tableSortBy);
    
    setupViewToggle();
    setupTableView();
  }, 100);

  // View mode toggle functionality
  function setupViewToggle() {
    if (!viewModeToggle) {
      console.error('View mode toggle not found');
      return;
    }
    
    console.log('Setting up view toggle');
    
    viewModeToggle.addEventListener('change', function() {
      console.log('Toggle changed:', this.checked);
      isTableView = this.checked;
      
      if (isTableView) {
        console.log('Switching to table view');
        if (graphicView) graphicView.style.display = 'none';
        if (tableView) tableView.style.display = 'block';
        updateTableView();
        
        // Disable graphic-specific controls in table mode
        if (connectBtn) connectBtn.disabled = true;
        if (generateConnectionsBtn) generateConnectionsBtn.disabled = true;
        if (centerBtn) centerBtn.disabled = true;
        if (colorPicker) colorPicker.disabled = true;
        if (sizeInput) sizeInput.disabled = true;
        if (applyBtn) applyBtn.disabled = true;
        if (bringToFrontBtn) bringToFrontBtn.disabled = true;
      } else {
        console.log('Switching to graphic view');
        if (graphicView) graphicView.style.display = 'block';
        if (tableView) tableView.style.display = 'none';
        
        // Re-enable graphic controls
        if (connectBtn) connectBtn.disabled = false;
        if (generateConnectionsBtn) generateConnectionsBtn.disabled = false;
        if (centerBtn) centerBtn.disabled = false;
        updateControlsState();
      }
    });
  }

  // Table view functions
  function updateTableView() {
    if (!familyTableBody) {
      console.error('Table body not found');
      return;
    }

    console.log('Updating table view...');
    
    const searchTerm = tableSearch ? tableSearch.value.toLowerCase() : '';
    const sortBy = tableSortBy ? tableSortBy.value : 'name';
    
    // Get all people data
    const people = [];
    svg.querySelectorAll('g[data-id]').forEach(g => {
      const data = {
        id: g.getAttribute('data-id'),
        name: g.getAttribute('data-name') || '',
        fatherName: g.getAttribute('data-father-name') || '',
        surname: g.getAttribute('data-surname') || '',
        birthName: g.getAttribute('data-birth-name') || '',
        dob: g.getAttribute('data-dob') || '',
        gender: g.getAttribute('data-gender') || '',
        motherId: g.getAttribute('data-mother-id') || '',
        fatherId: g.getAttribute('data-father-id') || '',
        spouseId: g.getAttribute('data-spouse-id') || ''
      };
      people.push(data);
    });

    console.log('Found people:', people.length);

    // Filter people based on search
    const filteredPeople = people.filter(person => {
      const searchableText = [
        person.name,
        person.fatherName,
        person.surname,
        person.birthName,
        person.dob,
        person.gender
      ].join(' ').toLowerCase();
      return searchableText.includes(searchTerm);
    });

    console.log('Filtered people:', filteredPeople.length);

    // Sort people
    filteredPeople.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      // Special handling for DOB sorting
      if (sortBy === 'dob') {
        // Convert DOB to comparable format
        aVal = convertDOBForSorting(aVal);
        bVal = convertDOBForSorting(bVal);
      }
      
      return aVal.localeCompare(bVal);
    });

    // Clear table body
    familyTableBody.innerHTML = '';

    // Populate table
    filteredPeople.forEach(person => {
      const row = createTableRow(person);
      familyTableBody.appendChild(row);
    });
    
    console.log('Table updated with', filteredPeople.length, 'rows');
  }

  function convertDOBForSorting(dob) {
    if (!dob) return '';
    
    // If it's just a year (yyyy), pad it for sorting
    if (/^\d{4}$/.test(dob)) {
      return dob + '-01-01';
    }
    
    // If it's dd.mm.yyyy, convert to yyyy-mm-dd for proper sorting
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dob)) {
      const parts = dob.split('.');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    
    return dob;
  }

  function createTableRow(person) {
    const row = document.createElement('tr');
    
    // Helper function to get person name by ID
    function getPersonName(id) {
      if (!id) return '';
      const g = svg.querySelector(`g[data-id="${id}"]`);
      if (!g) return '';
      const name = g.getAttribute('data-name') || '';
      const surname = g.getAttribute('data-surname') || '';
      return [name, surname].filter(Boolean).join(' ');
    }

    row.innerHTML = `
      <td>${person.name}</td>
      <td>${person.fatherName}</td>
      <td>${person.surname}</td>
      <td>${person.birthName}</td>
      <td>${person.dob}</td>
      <td><span class="gender-${person.gender}">${person.gender}</span></td>
      <td>${getPersonName(person.motherId)}</td>
      <td>${getPersonName(person.fatherId)}</td>
      <td>${getPersonName(person.spouseId)}</td>
      <td class="table-actions">
        <button class="table-btn edit-btn" onclick="editPersonFromTable('${person.id}')">Edit</button>
        <button class="table-btn delete-btn" onclick="deletePersonFromTable('${person.id}')">Delete</button>
      </td>
    `;

    return row;
  }

  // Global functions for table actions
  window.editPersonFromTable = function(personId) {
    const g = svg.querySelector(`g[data-id="${personId}"]`);
    if (g) {
      const circle = g.querySelector('circle');
      if (circle) {
        console.log('Editing person from table:', personId);
        showEditModal(circle);
      }
    }
  };

  window.deletePersonFromTable = function(personId) {
    if (confirm('Are you sure you want to delete this person? This will also remove all their relationships.')) {
      console.log('Deleting person from table:', personId);
      pushHistory();
      const g = svg.querySelector(`g[data-id="${personId}"]`);
      if (g) {
        const circle = g.querySelector('circle');
        if (circle && circle._group._lines) {
          // Remove all relationship lines
          circle._group._lines.forEach(line => line.remove());
        }
        // Remove the person
        g.remove();
        updatePeopleCounter();
        if (isTableView) {
          updateTableView();
        }
      }
    }
  };

  // Update control states based on selection
  function updateControlsState() {
    if (!isTableView) {
      colorPicker.disabled = !selected;
      sizeInput.disabled = !selected;
      applyBtn.disabled = !selected;
      bringToFrontBtn.disabled = !selected;
    }
  }

  // Setup table view functionality
  function setupTableView() {
    if (!tableSearch || !tableSortBy) {
      console.error('Table controls not found');
      return;
    }
    
    console.log('Setting up table view');
    
    // Search functionality
    tableSearch.addEventListener('input', function() {
      console.log('Search input:', this.value);
      updateTableView();
    });

    // Sort functionality
    tableSortBy.addEventListener('change', function() {
      console.log('Sort changed:', this.value);
      updateTableView();
    });
  }

  // Helper function to update people counter
  function updatePeopleCounter() {
    const count = svg.querySelectorAll('circle.person').length;
    if (peopleCounter) {
      peopleCounter.textContent = `People: ${count}`;
    }
    // Update table view if it's currently active
    if (isTableView) {
      updateTableView();
    }
  }

  // Helper function to populate parent and spouse dropdowns
  function populateParentAndSpouseDropdowns() {
    const mothers = modalMother;
    const fathers = modalFatherSelect;
    const spouses = modalSpouse;
    
    // Clear existing options (except the first "Select" option)
    mothers.innerHTML = '<option value="">Select Mother</option>';
    fathers.innerHTML = '<option value="">Select Father</option>';
    spouses.innerHTML = '<option value="">Select Spouse</option>';
    
    // Get all people and populate dropdowns based on gender
    svg.querySelectorAll('g[data-id]').forEach(g => {
      const name = g.getAttribute('data-name');
      const surname = g.getAttribute('data-surname');
      const gender = g.getAttribute('data-gender');
      const id = g.getAttribute('data-id');
      
      const displayName = [name, surname].filter(Boolean).join(' ');
      
      // Populate mothers (females only)
      if (gender === 'female') {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = displayName;
        mothers.appendChild(option);
      }
      
      // Populate fathers (males only)
      if (gender === 'male') {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = displayName;
        fathers.appendChild(option);
      }
      
      // Populate spouses (all people)
      const spouseOption = document.createElement('option');
      spouseOption.value = id;
      spouseOption.textContent = displayName;
      spouses.appendChild(spouseOption);
    });
  }

  // Modal functions
  function showAddModal() {
    modalMode = 'add';
    editingCircle = null;
    modalTitle.textContent = 'Add Person';
    personForm.reset();
    populateParentAndSpouseDropdowns();
    personModal.style.display = 'flex';
  }

  function showEditModal(c) {
    modalMode = 'edit';
    editingCircle = c;
    const g = c._group;
    modalTitle.textContent = 'Edit Person';
    modalName.value = g.getAttribute('data-name') || '';
    modalFather.value = g.getAttribute('data-father-name') || '';
    modalSurname.value = g.getAttribute('data-surname') || '';
    modalDob.value = g.getAttribute('data-dob') || '';
    modalBirth.value = g.getAttribute('data-birth-name') || '';
    modalGender.value = g.getAttribute('data-gender') || '';
    
    populateParentAndSpouseDropdowns();
    modalMother.value = g.getAttribute('data-mother-id') || '';
    modalFatherSelect.value = g.getAttribute('data-father-id') || '';
    modalSpouse.value = g.getAttribute('data-spouse-id') || '';
    
    personModal.style.display = 'flex';
  }

  function hideModal() {
    personModal.style.display = 'none';
    // Update table view if we're in table mode and changes were made
    if (isTableView) {
      updateTableView();
    }
  }

  modalCancel.addEventListener('click', hideModal);

  // DOB validation function
  function validateDOB(value) {
    if (!value) return true; // Empty is OK
    
    // Allow just year (4 digits)
    if (/^\d{4}$/.test(value)) {
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      return year >= 1800 && year <= currentYear + 50;
    }
    
    // Allow full date dd.mm.yyyy
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
      const parts = value.split('.');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      // Basic validation
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear + 50) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      
      // Check if date is valid
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && 
             date.getMonth() === month - 1 && 
             date.getDate() === day;
    }
    
    return false;
  }

  personForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = modalName.value.trim();
    const father = modalFather.value.trim();
    const surname = modalSurname.value.trim();
    const dob = modalDob.value.trim();
    const birthName = modalBirth.value.trim();
    const gender = modalGender.value;
    const motherId = modalMother.value;
    const fatherId = modalFatherSelect.value;
    const spouseId = modalSpouse.value;
    
    if (!name || !gender) {
      alert('Name and Gender are required');
      return;
    }

    // Validate DOB format
    if (dob && !validateDOB(dob)) {
      alert('Please enter a valid date in format dd.mm.yyyy or just the year (yyyy)');
      return;
    }

    pushHistory();
    if (modalMode === 'add') {
      personCount++;
      const cx = viewBox.x + viewBox.w/2;
      const cy = viewBox.y + viewBox.h/2;
      const color = '#3498db'; // Default blue color for all new people
      createPerson(`p${personCount}`, name, father, surname, dob, birthName, gender, motherId, fatherId, spouseId, cx, cy, 40, color);
      updatePeopleCounter();
    } else if (modalMode === 'edit' && editingCircle) {
      const c = editingCircle;
      const g = c._group;
      
      g.setAttribute('data-name', name);
      g.setAttribute('data-father-name', father);
      g.setAttribute('data-surname', surname);
      g.setAttribute('data-dob', dob);
      g.setAttribute('data-birth-name', birthName);
      g.setAttribute('data-gender', gender);
      g.setAttribute('data-mother-id', motherId);
      g.setAttribute('data-father-id', fatherId);
      g.setAttribute('data-spouse-id', spouseId);
      
      // Keep existing color when editing
      c.className.baseVal = `person ${gender}`;
      
      updatePersonDisplay(c);
      
      // Update table view if we're in table mode
      if (isTableView) {
        updateTableView();
      }
    }
    hideModal();
  });

  // Font controls - UPDATED with color controls
  fontSelect.addEventListener('change', () => {
    globalFontFamily = fontSelect.value;
    pushHistory();
    updateGlobalFontCSS();
    applyGlobalFontToAllText();
  });
  
  fontSizeInput.addEventListener('change', () => {
    globalFontSize = +fontSizeInput.value;
    pushHistory();
    updateGlobalFontCSS();
    applyGlobalFontToAllText();
  });

  // NEW: Color control event listeners
  nameColorPicker.addEventListener('change', () => {
    globalNameColor = nameColorPicker.value;
    pushHistory();
    updateGlobalFontCSS();
    applyGlobalFontToAllText();
  });

  dateColorPicker.addEventListener('change', () => {
    globalDateColor = dateColorPicker.value;
    pushHistory();
    updateGlobalFontCSS();
    applyGlobalFontToAllText();
  });

  // CSS-based font management - UPDATED with color support
  function updateGlobalFontCSS() {
    let fontStyle = document.getElementById('dynamicFontStyle');
    if (fontStyle) {
      fontStyle.remove();
    }

    fontStyle = document.createElement('style');
    fontStyle.id = 'dynamicFontStyle';
    fontStyle.textContent = `
      #svgArea text {
        font-family: ${globalFontFamily} !important;
        font-size: ${globalFontSize}px !important;
      }
      #svgArea text.name {
        font-family: ${globalFontFamily} !important;
        font-size: ${globalFontSize}px !important;
        font-weight: bold;
        fill: ${globalNameColor} !important;
      }
      #svgArea text.dob {
        font-family: ${globalFontFamily} !important;
        font-size: ${Math.max(6, globalFontSize - 2)}px !important;
        fill: ${globalDateColor} !important;
      }
    `;
    document.head.appendChild(fontStyle);
  }

  function applyGlobalFontToAllText() {
    svg.querySelectorAll('text').forEach(t => {
      t.setAttribute('font-family', globalFontFamily);
      if (t.classList.contains('dob')) {
        t.setAttribute('font-size', Math.max(6, globalFontSize - 2));
        t.setAttribute('fill', globalDateColor); // NEW: Apply date color
      } else {
        t.setAttribute('font-size', globalFontSize);
        t.setAttribute('fill', globalNameColor); // NEW: Apply name color
      }
    });
  }

  function createTextElement(x, y, textContent, className = 'name') {
    const t = document.createElementNS(svg.namespaceURI, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('class', className);
    t.setAttribute('font-family', globalFontFamily);
    
    if (className === 'dob') {
      t.setAttribute('font-size', Math.max(6, globalFontSize - 2));
      t.setAttribute('fill', globalDateColor); // NEW: Apply date color
    } else {
      t.setAttribute('font-size', globalFontSize);
      t.setAttribute('fill', globalNameColor); // NEW: Apply name color
    }
    
    t.textContent = textContent;
    return t;
  }

  // Other controls
  addBtn.addEventListener('click', showAddModal);
  applyBtn.addEventListener('click',  () => { pushHistory(); applyChanges(); });
  bringToFrontBtn.addEventListener('click', () => {
    if (selected) {
      pushHistory();
      svg.appendChild(selected._group);
    }
  });
  undoBtn.addEventListener('click',   () => {
    if (!history.length) return;
    const prev = history.pop();
    isRestoring = true;
    loadTree(JSON.parse(prev));
    isRestoring = false;
    undoBtn.disabled = !history.length;
    updatePeopleCounter();
  });
  connectBtn.addEventListener('click', toggleConnectMode);
  generateConnectionsBtn.addEventListener('click', generateAllConnections);
  centerBtn.addEventListener('click', centerView);
  saveBtn.addEventListener('click',   saveTree);
  loadInput.addEventListener('change', e => {
    history = [];
    undoBtn.disabled = true;
    loadTreeFromFile(e);
    updatePeopleCounter();
  });
  svg.addEventListener('click', () => {
    if (selected) {
      selected.classList.remove('selected');
      selected = null;
      bringToFrontBtn.disabled = true;
      updateControlsState();
    }
  });

  // Update people counter when people are removed via undo
  function pushHistory() {
    if (isRestoring) return;
    history.push(JSON.stringify(getCurrentState()));
    undoBtn.disabled = false;
  }

  // Override undo to update counter
  undoBtn.addEventListener('click', () => {
    if (!history.length) return;
    const prev = history.pop();
    isRestoring = true;
    loadTree(JSON.parse(prev));
    isRestoring = false;
    undoBtn.disabled = !history.length;
    updatePeopleCounter();
  });

  function updateViewBox() {
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }

  function createGrid() {
    const rect = document.createElementNS(svg.namespaceURI,'rect');
    rect.setAttribute('x', -10000);
    rect.setAttribute('y', -10000);
    rect.setAttribute('width', 20000);
    rect.setAttribute('height', 20000);
    rect.setAttribute('fill', '#f0f0f0');
    svg.appendChild(rect);

    const gridSize = 100, gridExtent = 5000;
    for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
      const line = document.createElementNS(svg.namespaceURI,'line');
      line.setAttribute('x1', x); line.setAttribute('y1', -gridExtent);
      line.setAttribute('x2', x); line.setAttribute('y2', gridExtent);
      line.setAttribute('stroke', '#ddd'); line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
    for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
      const line = document.createElementNS(svg.namespaceURI,'line');
      line.setAttribute('x1', -gridExtent); line.setAttribute('y1', y);
      line.setAttribute('x2', gridExtent);  line.setAttribute('y2', y);
      line.setAttribute('stroke', '#ddd');   line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
    }
  }

  function setupPanAndZoom() {
    let isPanning=false, startPt=null, lastDist=0;
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const scale = e.deltaY < 0 ? 0.9 : 1.1;
      const mx = (e.clientX/svg.clientWidth)*viewBox.w + viewBox.x;
      const my = (e.clientY/svg.clientHeight)*viewBox.h + viewBox.y;
      let nw = viewBox.w*scale, nh = viewBox.h*scale;
      if (nw<100) { nw=100; nh=viewBox.h*(100/viewBox.w); }
      if (nw>20000){ nw=20000; nh=viewBox.h*(20000/viewBox.w); }
      viewBox.x = mx - (mx-viewBox.x)*(nw/viewBox.w);
      viewBox.y = my - (my-viewBox.y)*(nh/viewBox.h);
      viewBox.w=nw; viewBox.h=nh;
      updateViewBox();
    },{ passive:false});

    svg.addEventListener('mousedown', startPan);
    svg.addEventListener('mousemove', doPan);
    svg.addEventListener('mouseup',   endPan);
    svg.addEventListener('mouseleave',endPan);
    svg.addEventListener('touchstart',startTouch,{passive:false});
    svg.addEventListener('touchmove', touchPan,{passive:false});
    svg.addEventListener('touchend',  endTouch);

    function startPan(e) {
      if (e.target.tagName==='g'|| (e.target.tagName==='line'&&e.target.classList.contains('relation'))) return;
      isPanning=true; startPt={x:e.clientX,y:e.clientY}; svg.style.cursor='grabbing';
    }
    function doPan(e) {
      if (!isPanning) return;
      const dx=(startPt.x-e.clientX)*(viewBox.w/svg.clientWidth);
      const dy=(startPt.y-e.clientY)*(viewBox.h/svg.clientHeight);
      viewBox.x+=dx; viewBox.y+=dy; startPt={x:e.clientX,y:e.clientY};
      updateViewBox();
    }
    function endPan(){ isPanning=false; svg.style.cursor='default'; }
    function startTouch(e){
      if (e.touches.length===1){
        const t=e.touches[0];
        const el=document.elementFromPoint(t.clientX,t.clientY);
        if(el.tagName==='g'||(el.tagName==='line'&&el.classList.contains('relation'))) return;
        isPanning=true; startPt={x:t.clientX,y:t.clientY};
      } else lastDist=getDist(e.touches);
    }
    function touchPan(e){
      e.preventDefault();
      if(e.touches.length===1&&isPanning){
        const t=e.touches[0];
        const dx=(startPt.x-t.clientX)*(viewBox.w/svg.clientWidth);
        const dy=(startPt.y-t.clientY)*(viewBox.h/svg.clientHeight);
        viewBox.x+=dx; viewBox.y+=dy; startPt={x:t.clientX,y:t.clientY};
        updateViewBox();
      } else if(e.touches.length===2){
        const nd=getDist(e.touches), scale=lastDist/nd;
        let nw=viewBox.w*scale, nh=viewBox.h*scale;
        if(nw<100){nw=100; nh=viewBox.h*(100/viewBox.w);} 
        if(nw>20000){nw=20000; nh=viewBox.h*(20000/viewBox.w);}
        const cx=(e.touches[0].clientX+e.touches[1].clientX)/2;
        const cy=(e.touches[0].clientY+e.touches[1].clientY)/2;
        const mx=(cx/svg.clientWidth)*viewBox.w+viewBox.x;
        const my=(cy/svg.clientHeight)*viewBox.h+viewBox.y;
        viewBox.x=mx-(mx-viewBox.x)*(nw/viewBox.w);
        viewBox.y=my-(my-viewBox.y)*(nh/viewBox.h);
        viewBox.w=nw; viewBox.h=nh; lastDist=nd;
        updateViewBox();
      }
    }
    function endTouch(){ isPanning=false; }
    function getDist(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}
  }

  function createPerson(id, name, father, surname, dob, birth, gender, motherId, fatherId, spouseId, cx, cy, r, fill) {
    const gap = 0.3 * r;
    const g = document.createElementNS(svg.namespaceURI,'g');
    g.setAttribute('data-id', id);
    g.setAttribute('data-name', name);
    g.setAttribute('data-father-name', father);
    g.setAttribute('data-surname', surname);
    g.setAttribute('data-dob', dob);
    g.setAttribute('data-birth-name', birth);
    g.setAttribute('data-gender', gender);
    g.setAttribute('data-mother-id', motherId || '');
    g.setAttribute('data-father-id', fatherId || '');
    g.setAttribute('data-spouse-id', spouseId || '');

    const c = document.createElementNS(svg.namespaceURI,'circle');
    c.setAttribute('cx', cx); 
    c.setAttribute('cy', cy);
    c.setAttribute('r', r);   
    c.setAttribute('fill', fill);
    c.style.fill = fill; // Use inline style to ensure color is applied
    c.setAttribute('class', `person ${gender}`);

    const line1 = createTextElement(cx, cy - gap, [name,father].filter(Boolean).join(' '), 'name');
    const line2 = createTextElement(cx, cy,       surname,                                  'name');
    const line3 = createTextElement(cx, cy + gap, birth,                                   'name');
    const line4 = createTextElement(cx, cy + gap * 2, dob,                               'dob');

    g.append(c, line1, line2, line3, line4);
    svg.appendChild(g);

    c._group=g; c._line1=line1; c._line2=line2; c._line3=line3; c._line4=line4;
    if(!initialCircle) initialCircle=c;

    g.addEventListener('click', e=>nodeClick(e,c));
    g.addEventListener('dblclick', e=>{ e.stopPropagation(); showEditModal(c); });

    let lastTap=0;
    g.addEventListener('touchend', e=>{
      const now=Date.now(), dt=now-lastTap;
      if(dt<500 && dt>0){ e.preventDefault(); showEditModal(c); }
      else nodeClick(e,c);
      lastTap=now;
    });

    setupDrag(c);
    
    // No automatic connections - only manual connections now
    
    return c;
  }

  function findPersonById(id) {
    const group = svg.querySelector(`g[data-id="${id}"]`);
    return group ? group.querySelector('circle') : null;
  }

  function updatePersonDisplay(c) {
    const g = c._group;
    const cx = +c.getAttribute('cx');
    const cy = +c.getAttribute('cy');
    const r = +c.getAttribute('r');
    const gap = 0.3 * r;
    
    const name = g.getAttribute('data-name');
    const father = g.getAttribute('data-father-name');
    const surname = g.getAttribute('data-surname');
    const birth = g.getAttribute('data-birth-name');
    const dob = g.getAttribute('data-dob');

    [c._line1, c._line2, c._line3, c._line4].forEach(t => {
      t.setAttribute('font-family', globalFontFamily);
      if (t.classList.contains('dob')) {
        t.setAttribute('font-size', Math.max(6, globalFontSize - 2));
        t.setAttribute('fill', globalDateColor); // NEW: Apply date color
      } else {
        t.setAttribute('font-size', globalFontSize);
        t.setAttribute('fill', globalNameColor); // NEW: Apply name color
      }
    });

    c._line1.textContent = [name, father].filter(Boolean).join(' ');
    c._line2.textContent = surname;
    c._line3.textContent = birth;
    c._line4.textContent = dob;
    c._line1.setAttribute('x', cx); c._line1.setAttribute('y', cy - gap);
    c._line2.setAttribute('x', cx); c._line2.setAttribute('y', cy);
    c._line3.setAttribute('x', cx); c._line3.setAttribute('y', cy + gap);
    c._line4.setAttribute('x', cx); c._line4.setAttribute('y', cy + gap * 2);
  }

  function nodeClick(e,c){
    e.stopPropagation();
    if(connectMode){
      if(!selected){ selected=c; c.classList.add('selected'); }
      else if(selected!==c){
        pushHistory();
        drawLine(selected,c);
        undoBtn.disabled=false;
        selected.classList.remove('selected');
        selected=null;
        connectMode=false;
        connectBtn.textContent='Connect';
        svg.style.cursor='default';
      }
    } else {
      if(selected) selected.classList.remove('selected');
      selected=c; c.classList.add('selected');
      colorPicker.disabled=false;
      sizeInput.disabled=false;
      applyBtn.disabled=false;
      bringToFrontBtn.disabled=false;
      undoBtn.disabled=false;
      colorPicker.value=c.getAttribute('fill');
      sizeInput.value=c.getAttribute('r');
      updateControlsState();
    }
  }

  function toggleConnectMode(){
    connectMode=!connectMode;
    connectBtn.textContent=connectMode?'Cancel':'Connect';
    svg.style.cursor=connectMode?'crosshair':'default';
    if(selected){ selected.classList.remove('selected'); selected=null; bringToFrontBtn.disabled=true;}
  }

  function applyChanges(){
    if(!selected) return;
    const nc=colorPicker.value, nr=+sizeInput.value;
    selected.setAttribute('fill',nc);
    selected.setAttribute('r',nr);
    selected.style.fill = nc; // Use inline style to override CSS
    selected._group.setAttribute('data-fill',nc);
    selected._group.setAttribute('data-r',nr);

    updatePersonDisplay(selected);
  }

  function drawLine(a,b){
    const l=document.createElementNS(svg.namespaceURI,'line');
    l.setAttribute('x1',a.getAttribute('cx')); l.setAttribute('y1',a.getAttribute('cy'));
    l.setAttribute('x2',b.getAttribute('cx')); l.setAttribute('y2',b.getAttribute('cy'));
    l.setAttribute('stroke','#555'); l.setAttribute('stroke-width','3');
    l.setAttribute('class','relation');
    l.setAttribute('data-source',a._group.getAttribute('data-id'));
    l.setAttribute('data-target',b._group.getAttribute('data-id'));
    const g0=svg.querySelector('g');
    if(g0) svg.insertBefore(l,g0); else svg.appendChild(l);
    l.addEventListener('click', ()=>{ pushHistory(); l.remove(); });
    a._group._lines=a._group._lines||[]; b._group._lines=b._group._lines||[];
    a._group._lines.push(l); b._group._lines.push(l);
  }

  function generateAllConnections() {
    console.log('Generating all family connections...');
    pushHistory();
    
    let connectionsAdded = 0;
    const existingConnections = new Set();
    
    // Track existing connections to avoid duplicates
    svg.querySelectorAll('line.relation').forEach(line => {
      const source = line.getAttribute('data-source');
      const target = line.getAttribute('data-target');
      const relationship = line.getAttribute('data-relationship') || 'family';
      existingConnections.add(`${source}-${target}-${relationship}`);
      existingConnections.add(`${target}-${source}-${relationship}`); // bidirectional
    });
    
    // Generate parent-child connections
    svg.querySelectorAll('g[data-id]').forEach(g => {
      const childId = g.getAttribute('data-id');
      const motherId = g.getAttribute('data-mother-id');
      const fatherId = g.getAttribute('data-father-id');
      const spouseId = g.getAttribute('data-spouse-id');
      
      const childCircle = findPersonById(childId);
      
      // Connect to mother
      if (motherId && childCircle) {
        const motherCircle = findPersonById(motherId);
        if (motherCircle) {
          const connectionKey = `${motherId}-${childId}-family`;
          if (!existingConnections.has(connectionKey)) {
            drawLine(motherCircle, childCircle);
            existingConnections.add(connectionKey);
            existingConnections.add(`${childId}-${motherId}-family`);
            connectionsAdded++;
            console.log(`Connected mother ${motherId} to child ${childId}`);
          }
        }
      }
      
      // Connect to father
      if (fatherId && childCircle) {
        const fatherCircle = findPersonById(fatherId);
        if (fatherCircle) {
          const connectionKey = `${fatherId}-${childId}-family`;
          if (!existingConnections.has(connectionKey)) {
            drawLine(fatherCircle, childCircle);
            existingConnections.add(connectionKey);
            existingConnections.add(`${childId}-${fatherId}-family`);
            connectionsAdded++;
            console.log(`Connected father ${fatherId} to child ${childId}`);
          }
        }
      }
      
      // Connect to spouse
      if (spouseId && childCircle) {
        const spouseCircle = findPersonById(spouseId);
        if (spouseCircle) {
          const connectionKey = `${childId}-${spouseId}-spouse`;
          if (!existingConnections.has(connectionKey)) {
            drawSpouseLine(childCircle, spouseCircle);
            existingConnections.add(connectionKey);
            existingConnections.add(`${spouseId}-${childId}-spouse`);
            connectionsAdded++;
            console.log(`Connected spouses ${childId} and ${spouseId}`);
          }
        }
      }
    });
    
    if (connectionsAdded > 0) {
      if (window.showMessage) {
        window.showMessage(`Generated ${connectionsAdded} family connections!`, 'success');
      }
      console.log(`Generated ${connectionsAdded} total connections`);
    } else {
      if (window.showMessage) {
        window.showMessage('No new connections to generate. All relationships are already connected!', 'success');
      }
      console.log('No new connections needed');
    }
  }

  function drawSpouseLine(a,b){
    const l=document.createElementNS(svg.namespaceURI,'line');
    l.setAttribute('x1',a.getAttribute('cx')); l.setAttribute('y1',a.getAttribute('cy'));
    l.setAttribute('x2',b.getAttribute('cx')); l.setAttribute('y2',b.getAttribute('cy'));
    l.setAttribute('stroke','#e74c3c'); l.setAttribute('stroke-width','3');
    l.setAttribute('stroke-dasharray','5,5'); // Dashed line for spouse relationships
    l.setAttribute('class','relation spouse');
    l.setAttribute('data-source',a._group.getAttribute('data-id'));
    l.setAttribute('data-target',b._group.getAttribute('data-id'));
    l.setAttribute('data-relationship','spouse');
    const g0=svg.querySelector('g');
    if(g0) svg.insertBefore(l,g0); else svg.appendChild(l);
    l.addEventListener('click', ()=>{ pushHistory(); l.remove(); });
    a._group._lines=a._group._lines||[]; b._group._lines=b._group._lines||[];
    a._group._lines.push(l); b._group._lines.push(l);
  }

  function setupDrag(c){
    let start=null, off=null;
    c.addEventListener('mousedown', sD);
    document.addEventListener('mousemove', dD);
    document.addEventListener('mouseup',   eD);
    c.addEventListener('touchstart', sD,{passive:false});
    document.addEventListener('touchmove', dD,{passive:false});
    document.addEventListener('touchend',   eD);

    function sD(e){
      e.stopPropagation();
      start=e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};
      const cx=+c.getAttribute('cx'), cy=+c.getAttribute('cy');
      off={ x:cx*(svg.clientWidth/viewBox.w)-start.x, y:cy*(svg.clientHeight/viewBox.h)-start.y };
      svg.style.cursor='grabbing';
    }
    function dD(e){
      if(!start) return;
      e.preventDefault();
      const mv=e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};
      let x=(mv.x+off.x)*(viewBox.w/svg.clientWidth),
          y=(mv.y+off.y)*(viewBox.h/svg.clientHeight);
      x=Math.round(x/10)*10; y=Math.round(y/10)*10;
      c.setAttribute('cx',x); c.setAttribute('cy',y);

      updatePersonDisplay(c);

      if(c._group._lines){
        c._group._lines.forEach(l=>{
          if(l.getAttribute('data-source')===c._group.getAttribute('data-id')){
            l.setAttribute('x1',x); l.setAttribute('y1',y);
          } else {
            l.setAttribute('x2',x); l.setAttribute('y2',y);
          }
        });
      }
    }
    function eD(){
      if(start) pushHistory();
      start=null; svg.style.cursor='default';
    }
  }

  function saveTree(){
    const data={
      people:[],
      relations:[],
      fontSettings: {
        fontFamily: globalFontFamily,
        fontSize: globalFontSize,
        nameColor: globalNameColor, // NEW: Save name color
        dateColor: globalDateColor  // NEW: Save date color
      }
    };
    
    svg.querySelectorAll('g[data-id]').forEach(g=>{
      const c=g.querySelector('circle');
      data.people.push({
        id:g.getAttribute('data-id'),
        name:g.getAttribute('data-name'),
        father_name:g.getAttribute('data-father-name'),
        surname:g.getAttribute('data-surname'),
        dob:g.getAttribute('data-dob'),
        birth_name:g.getAttribute('data-birth-name'),
        gender:g.getAttribute('data-gender'),
        mother_id:g.getAttribute('data-mother-id'),
        father_id:g.getAttribute('data-father-id'),
        spouse_id:g.getAttribute('data-spouse-id'),
        cx:+c.getAttribute('cx'),
        cy:+c.getAttribute('cy'),
        r:+c.getAttribute('r'),
        fill:c.getAttribute('fill')
      });
    });
    svg.querySelectorAll('line.relation').forEach(l=>{
      data.relations.push({
        source:l.getAttribute('data-source'),
        target:l.getAttribute('data-target'),
        relationship:l.getAttribute('data-relationship') || 'family'
      });
    });
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='family-tree.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function loadTreeFromFile(e){
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=evt=>{
      try{ loadTree(JSON.parse(evt.target.result)); }
      catch{ alert('Invalid JSON file.'); }
    };
    reader.readAsText(file);
  }

  function loadTree(data){
    svg.innerHTML=''; personCount=0; selected=null; initialCircle=null;
    
    if (data.fontSettings) {
      globalFontFamily = data.fontSettings.fontFamily;
      globalFontSize = data.fontSettings.fontSize;
      // NEW: Load color settings with fallbacks
      globalNameColor = data.fontSettings.nameColor || '#333333';
      globalDateColor = data.fontSettings.dateColor || '#666666';
      
      fontSelect.value = globalFontFamily;
      fontSizeInput.value = globalFontSize;
      nameColorPicker.value = globalNameColor; // NEW
      dateColorPicker.value = globalDateColor; // NEW
      
      updateGlobalFontCSS();
    }
    
    createGrid();
    const map={};
    (data.people||[]).forEach(p=>{
      personCount=Math.max(personCount,+p.id.replace('p',''));
      const gender = p.gender || 'male';
      const color = p.fill || '#3498db'; // Use saved color or default blue
      const c=createPerson(
        p.id, p.name, p.father_name, p.surname, p.dob, p.birth_name,
        gender, p.mother_id, p.father_id, p.spouse_id, p.cx, p.cy, p.r, color
      );
      map[p.id]=c;
    });
    (data.relations||[]).forEach(r=>{
      const a=map[r.source], b=map[r.target];
      if(a&&b) {
        if(r.relationship === 'spouse') {
          drawSpouseLine(a,b);
        } else {
          drawLine(a,b);
        }
      }
    });
    updatePeopleCounter();
    if(initialCircle) centerView();
  }

  function centerView(){
    if(!initialCircle) return;
    const cx=+initialCircle.getAttribute('cx'), cy=+initialCircle.getAttribute('cy');
    viewBox.x=cx-viewBox.w/2; viewBox.y=cy-viewBox.h/2;
    updateViewBox();
  }

  function getCurrentState(){
    return {
      people:[...svg.querySelectorAll('g[data-id]')].map(g=>{
        const c=g.querySelector('circle');
        return {
          id:g.getAttribute('data-id'),
          name:g.getAttribute('data-name'),
          father_name:g.getAttribute('data-father-name'),
          surname:g.getAttribute('data-surname'),
          dob:g.getAttribute('data-dob'),
          birth_name:g.getAttribute('data-birth-name'),
          gender:g.getAttribute('data-gender'),
          mother_id:g.getAttribute('data-mother-id'),
          father_id:g.getAttribute('data-father-id'),
          spouse_id:g.getAttribute('data-spouse-id'),
          cx:+c.getAttribute('cx'),
          cy:+c.getAttribute('cy'),
          r:+c.getAttribute('r'),
          fill:c.getAttribute('fill')
        };
      }),
      relations:[...svg.querySelectorAll('line.relation')].map(l=>({
        source:l.getAttribute('data-source'),
        target:l.getAttribute('data-target'),
        relationship:l.getAttribute('data-relationship') || 'family'
      })),
      fontSettings: {
        fontFamily: globalFontFamily,
        fontSize: globalFontSize,
        nameColor: globalNameColor, // NEW
        dateColor: globalDateColor  // NEW
      }
    };
  }

  // Debug function for connections
  function debugConnections(){
    svg.querySelectorAll('line.relation').forEach((l,i)=>{
      console.log(`Connection ${i+1}: ${l.getAttribute('data-source')} -> ${l.getAttribute('data-target')}`);
    });
  }

  // Keyboard shortcut for debugging
  window.addEventListener('keydown', e=>{
    if(e.ctrlKey&&e.key==='d'){ e.preventDefault(); debugConnections(); }
  });

  // Debug function for view toggle
  window.testViewToggle = function() {
    console.log('=== View Toggle Debug ===');
    console.log('Toggle element:', document.getElementById('viewModeToggle'));
    console.log('Graphic view:', document.getElementById('graphicView'));
    console.log('Table view:', document.getElementById('tableView'));
    console.log('Current isTableView:', isTableView);
    
    // Manual toggle test
    const toggle = document.getElementById('viewModeToggle');
    if (toggle) {
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change'));
    }
  };

  // Manual view switch function
  window.switchToTableView = function() {
    console.log('Manual switch to table view');
    isTableView = true;
    const graphicView = document.getElementById('graphicView');
    const tableView = document.getElementById('tableView');
    if (graphicView) graphicView.style.display = 'none';
    if (tableView) tableView.style.display = 'block';
    updateTableView();
  };

  window.switchToGraphicView = function() {
    console.log('Manual switch to graphic view');
    isTableView = false;
    const graphicView = document.getElementById('graphicView');
    const tableView = document.getElementById('tableView');
    if (graphicView) graphicView.style.display = 'block';
    if (tableView) tableView.style.display = 'none';
  };

});