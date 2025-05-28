// script.js - Family Tree Builder with Mother/Father/Gender dropdowns and font color controls
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
  const modalCancel = document.getElementById('modalCancel');

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

  // Undo history
  let history       = [];
  let isRestoring   = false;

  // Initialize
  updateViewBox();
  createGrid();
  setupPanAndZoom();
  updateGlobalFontCSS();

  // Helper function to populate parent dropdowns
  function populateParentDropdowns() {
    const mothers = modalMother;
    const fathers = modalFatherSelect;
    
    // Clear existing options (except the first "Select" option)
    mothers.innerHTML = '<option value="">Select Mother</option>';
    fathers.innerHTML = '<option value="">Select Father</option>';
    
    // Get all people and populate dropdowns based on gender
    svg.querySelectorAll('g[data-id]').forEach(g => {
      const name = g.getAttribute('data-name');
      const surname = g.getAttribute('data-surname');
      const gender = g.getAttribute('data-gender');
      const id = g.getAttribute('data-id');
      
      const displayName = [name, surname].filter(Boolean).join(' ');
      
      if (gender === 'female') {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = displayName;
        mothers.appendChild(option);
      } else if (gender === 'male') {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = displayName;
        fathers.appendChild(option);
      }
    });
  }

  // Modal functions
  function showAddModal() {
    modalMode = 'add';
    editingCircle = null;
    modalTitle.textContent = 'Add Person';
    personForm.reset();
    populateParentDropdowns();
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
    
    populateParentDropdowns();
    modalMother.value = g.getAttribute('data-mother-id') || '';
    modalFatherSelect.value = g.getAttribute('data-father-id') || '';
    
    personModal.style.display = 'flex';
  }

  function hideModal() {
    personModal.style.display = 'none';
  }

  modalCancel.addEventListener('click', hideModal);

  personForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = modalName.value.trim();
    const father = modalFather.value.trim();
    const surname = modalSurname.value.trim();
    const dob = modalDob.value;
    const birthName = modalBirth.value.trim();
    const gender = modalGender.value;
    const motherId = modalMother.value;
    const fatherId = modalFatherSelect.value;
    
    if (!name || !gender) {
      alert('Name and Gender are required');
      return;
    }

    pushHistory();
    if (modalMode === 'add') {
      personCount++;
      const cx = viewBox.x + viewBox.w/2;
      const cy = viewBox.y + viewBox.h/2;
      const color = '#3498db'; // Default blue color for all new people
      createPerson(`p${personCount}`, name, father, surname, dob, birthName, gender, motherId, fatherId, cx, cy, 40, color);
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
      
      // Keep existing color when editing
      c.className.baseVal = `person ${gender}`;
      
      updatePersonDisplay(c);
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
  });
  connectBtn.addEventListener('click', toggleConnectMode);
  centerBtn.addEventListener('click', centerView);
  saveBtn.addEventListener('click',   saveTree);
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

  function pushHistory() {
    if (isRestoring) return;
    history.push(JSON.stringify(getCurrentState()));
    undoBtn.disabled = false;
  }

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

  function createPerson(id, name, father, surname, dob, birth, gender, motherId, fatherId, cx, cy, r, fill) {
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
    
    // Auto-connect to parents if they exist
    if (motherId) {
      const motherCircle = findPersonById(motherId);
      if (motherCircle) {
        drawLine(motherCircle, c);
      }
    }
    if (fatherId) {
      const fatherCircle = findPersonById(fatherId);
      if (fatherCircle) {
        drawLine(fatherCircle, c);
      }
    }
    
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
        cx:+c.getAttribute('cx'),
        cy:+c.getAttribute('cy'),
        r:+c.getAttribute('r'),
        fill:c.getAttribute('fill')
      });
    });
    svg.querySelectorAll('line.relation').forEach(l=>{
      data.relations.push({
        source:l.getAttribute('data-source'),
        target:l.getAttribute('data-target')
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
        gender, p.mother_id, p.father_id, p.cx, p.cy, p.r, color
      );
      map[p.id]=c;
    });
    (data.relations||[]).forEach(r=>{
      const a=map[r.source], b=map[r.target];
      if(a&&b) drawLine(a,b);
    });
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
          cx:+c.getAttribute('cx'),
          cy:+c.getAttribute('cy'),
          r:+c.getAttribute('r'),
          fill:c.getAttribute('fill')
        };
      }),
      relations:[...svg.querySelectorAll('line.relation')].map(l=>({
        source:l.getAttribute('data-source'),
        target:l.getAttribute('data-target')
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

});