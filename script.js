// script.js
document.addEventListener('DOMContentLoaded', () => {
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

  // global font settings
  let globalFontFamily = fontSelect.value;
  let globalFontSize   = +fontSizeInput.value;

  let personCount = 0, connectMode = false, selected = null, initialCircle = null;
  let viewBox = { x:0, y:0, w:800, h:600 };
  let history = [], isRestoring = false;

  // Init
  updateViewBox(); createGrid(); setupPanAndZoom(); applyGlobalFont();

  // Font controls
  fontSelect.onchange = () => {
    globalFontFamily = fontSelect.value;
    pushHistory();
    applyGlobalFont();
  };
  fontSizeInput.onchange = () => {
    globalFontSize = +fontSizeInput.value;
    pushHistory();
    applyGlobalFont();
  };

  // Other controls
  addBtn.onclick          = ()=>{ pushHistory(); addPerson(); };
  applyBtn.onclick        = ()=>{ pushHistory(); applyChanges(); };
  bringBtn.onclick        = ()=>{ if(selected){ pushHistory(); svg.appendChild(selected._group); } };
  undoBtn.onclick         = () => {
    if(!history.length) return;
    const prev = history.pop();
    isRestoring = true;
    loadTree(JSON.parse(prev));
    isRestoring = false;
    undoBtn.disabled = !history.length;
  };
  connectBtn.onclick      = toggleConnectMode;
  centerBtn.onclick       = centerView;
  saveBtn.onclick         = saveTree;
  loadInput.onchange      = e => { history=[]; undoBtn.disabled=true; loadTreeFromFile(e); };
  svg.onclick             = () => {
    if(selected){ selected.classList.remove('selected'); selected = null; bringBtn.disabled=true; }
  };

  function pushHistory(){
    if(isRestoring) return;
    history.push(JSON.stringify(getCurrentState()));
    undoBtn.disabled = false;
  }
  function applyGlobalFont(){
    svg.querySelectorAll('text').forEach(t=>{
      t.setAttribute('font-family', globalFontFamily);
      t.setAttribute('font-size',   globalFontSize);
    });
  }
  function updateViewBox(){
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }
  function createGrid(){
    const rect = document.createElementNS(svg.namespaceURI,'rect');
    rect.setAttribute('x',-1e4); rect.setAttribute('y',-1e4);
    rect.setAttribute('width',2e4); rect.setAttribute('height',2e4);
    rect.setAttribute('fill','#f0f0f0');
    svg.appendChild(rect);
    const step=100, ext=5000;
    for(let x=-ext;x<=ext;x+=step){
      const l=document.createElementNS(svg.namespaceURI,'line');
      l.setAttribute('x1',x); l.setAttribute('y1',-ext);
      l.setAttribute('x2',x); l.setAttribute('y2',ext);
      l.setAttribute('stroke','#ddd'); l.setAttribute('stroke-width','1');
      svg.appendChild(l);
    }
    for(let y=-ext;y<=ext;y+=step){
      const l=document.createElementNS(svg.namespaceURI,'line');
      l.setAttribute('x1',-ext); l.setAttribute('y1',y);
      l.setAttribute('x2',ext);  l.setAttribute('y2',y);
      l.setAttribute('stroke','#ddd'); l.setAttribute('stroke-width','1');
      svg.appendChild(l);
    }
  }
  function setupPanAndZoom(){
    let panning=false, start=null, lastDist=0;
    svg.addEventListener('wheel', e=>{
      e.preventDefault();
      const scale = e.deltaY<0?0.9:1.1;
      const mx=(e.clientX/svg.clientWidth)*viewBox.w+viewBox.x;
      const my=(e.clientY/svg.clientHeight)*viewBox.h+viewBox.y;
      let nw=viewBox.w*scale, nh=viewBox.h*scale;
      if(nw<100){ nw=100; nh=viewBox.h*(100/viewBox.w);}
      if(nw>2e4){nw=2e4; nh=viewBox.h*(2e4/viewBox.w);}
      viewBox.x = mx - (mx-viewBox.x)*(nw/viewBox.w);
      viewBox.y = my - (my-viewBox.y)*(nh/viewBox.h);
      viewBox.w=nw; viewBox.h=nh;
      updateViewBox();
    },{passive:false});
    const startPan = e=>{
      if(e.target.tagName==='g'||(e.target.tagName==='line'&&e.target.classList.contains('relation'))) return;
      panning=true; start={x:e.clientX,y:e.clientY}; svg.style.cursor='grabbing';
    };
    const doPan = e=>{
      if(!panning) return;
      const dx=(start.x-e.clientX)*(viewBox.w/svg.clientWidth);
      const dy=(start.y-e.clientY)*(viewBox.h/svg.clientHeight);
      viewBox.x+=dx; viewBox.y+=dy;
      start={x:e.clientX,y:e.clientY};
      updateViewBox();
    };
    const endPan = ()=>{ panning=false; svg.style.cursor='default'; };
    svg.addEventListener('mousedown',startPan);
    svg.addEventListener('mousemove',doPan);
    svg.addEventListener('mouseup',endPan);
    svg.addEventListener('mouseleave',endPan);
    // touch handlers omitted for brevity but remain unchanged...
  }

  function addPerson(){
    const name=prompt('Enter given name:'); if(!name)return;
    const father=prompt("Enter father's name:",''); if(father===null)return;
    const surname=prompt('Enter surname:',''); if(surname===null)return;
    const dob=prompt('Enter DOB (YYYY-MM-DD):',''); if(dob===null)return;
    const birth=prompt('Enter birth name:',''); if(birth===null)return;
    personCount++;
    const cx=viewBox.x+viewBox.w/2, cy=viewBox.y+viewBox.h/2;
    createPerson(`p${personCount}`,name,father,surname,dob,birth,cx,cy,+sizeInput.value||40,colorPicker.value||'#3498db');
  }
  function createPerson(id,name,father,surname,dob,birth,cx,cy,r,fill){
    const gap=0.3*r;
    const g=document.createElementNS(svg.namespaceURI,'g');
    g.setAttribute('data-id',id);
    ['name','father-name','surname','dob','birth-name'].forEach(k=>{}); // omit
    const c=document.createElementNS(svg.namespaceURI,'circle');
    c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r',r); c.setAttribute('fill',fill); c.setAttribute('class','person');
    function mk(y,txt,cls){
      const t=document.createElementNS(svg.namespaceURI,'text');
      t.setAttribute('x',cx); t.setAttribute('y',cy+y);
      t.setAttribute('text-anchor','middle'); t.setAttribute('class',cls);
      t.setAttribute('font-family',globalFontFamily);
      t.setAttribute('font-size',  globalFontSize);
      t.textContent=txt;
      return t;
    }
    const l1=mk(-gap,[name,father].filter(Boolean).join(' '),'name');
    const l2=mk(0,   surname,'name');
    const l3=mk(gap, birth,'name');
    const l4=mk(gap*2,dob,  'dob');
    g.append(c,l1,l2,l3,l4);
    svg.appendChild(g);
    c._group=g; c._line1=l1; c._line2=l2; c._line3=l3; c._line4=l4;
    if(!initialCircle) initialCircle=c;
    g.addEventListener('click', e=>nodeClick(e,c));
    g.addEventListener('dblclick', e=>{ pushHistory(); editPerson(e,c); });
    // touch & drag omitted for brevity...
    return c;
  }
  // applyChanges, editPerson, drawLine, setupDrag, saveTree, loadTree, centerView, getCurrentState omitted for brevity
});
