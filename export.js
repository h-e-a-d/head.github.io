// export.js
(async () => {
  // inline your CSS + Ardeco font from same-folder TTF
  async function inlineCssFont() {
    try {
      const link = document.querySelector('link[rel="stylesheet"][href$="style.css"]');
      const [cssText, fontBuf] = await Promise.all([
        fetch(link.href).then(r => r.text()),
        fetch('Ardeco.ttf').then(r => r.arrayBuffer())
      ]);
      let bin=''; new Uint8Array(fontBuf).forEach(b=>bin+=String.fromCharCode(b));
      const b64 = btoa(bin);
      const face = `
@font-face {
  font-family:'Ardeco';
  src:url('data:font/ttf;base64,${b64}') format('truetype');
  font-weight:normal;font-style:normal;
}
`;
      return face + '\n' + cssText.replace(/@font-face[\s\S]*?\}/,'');
    } catch(e){
      console.warn('inlineCssFont err',e);
      return '';
    }
  }
  const cssPromise = inlineCssFont();

  function download(name,blob){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }
  function getBounds(svg){
    const C=svg.querySelectorAll('circle.person');
    if(!C.length)return null;
    let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    C.forEach(c=>{
      const cx=+c.getAttribute('cx'),cy=+c.getAttribute('cy'),r=+c.getAttribute('r');
      minX=Math.min(minX,cx-r);minY=Math.min(minY,cy-r);
      maxX=Math.max(maxX,cx+r);maxY=Math.max(maxY,cy+r);
    });
    const m=20;
    return {x:minX-m,y:minY-m,w:maxX-minX+2*m,h:maxY-minY+2*m};
  }
  async function exportTree(fmt){
    const svgArea=document.getElementById('svgArea');
    const b=getBounds(svgArea);
    if(!b){ alert('Nothing to export'); return; }
    const clone=svgArea.cloneNode(true);
    clone.querySelectorAll('rect, line:not(.relation)').forEach(e=>e.remove());
    clone.setAttribute('viewBox',`${b.x} ${b.y} ${b.w} ${b.h}`);
    const defs=document.createElementNS(clone.namespaceURI,'defs');
    const styleEl=document.createElementNS(clone.namespaceURI,'style');
    styleEl.setAttribute('type','text/css');
    const css=await cssPromise;
    styleEl.appendChild(document.createCDATASection(css));
    defs.appendChild(styleEl);
    clone.insertBefore(defs,clone.firstChild);
    const svgStr=new XMLSerializer().serializeToString(clone);
    const svgBlob=new Blob([svgStr],{type:'image/svg+xml;charset=utf-8'});
    if(fmt==='svg'){ download('family-tree.svg',svgBlob); return; }
    const img=new Image();
    const url=URL.createObjectURL(svgBlob);
    await new Promise(r=>{img.onload=r;img.src=url;});
    const cnv=document.createElement('canvas');
    cnv.width=b.w;cnv.height=b.h;
    cnv.getContext('2d').drawImage(img,0,0,b.w,b.h);
    URL.revokeObjectURL(url);
    if(fmt==='png'){cnv.toBlob(blob=>download('family-tree.png',blob));return;}
    if(fmt==='pdf'){
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:b.w>b.h?'landscape':'portrait',unit:'pt',format:[b.w,b.h]});
      const dataUrl=cnv.toDataURL('image/png');
      pdf.addImage(dataUrl,'PNG',0,0,b.w,b.h);
      pdf.save('family-tree.pdf');
    }
  }

  // catch all clicks on those ids
  document.addEventListener('click',e=>{
    if(e.target.id==='exportSvgBtn') exportTree('svg');
    if(e.target.id==='exportPngBtn') exportTree('png');
    if(e.target.id==='exportPdfBtn') exportTree('pdf');
  });
})();
