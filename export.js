// export.js
(async () => {
  // 1) Preload & inline CSS + Ardeco font
  async function inlineCssAndFont() {
    try {
      const link    = document.querySelector('link[rel="stylesheet"][href$="style.css"]');
      const [cssText, fontBuf] = await Promise.all([
        fetch(link.href).then(r => r.text()),
        fetch('Ardeco.ttf').then(r => r.arrayBuffer())
      ]);
      // base64-encode font
      let bin = '';
      new Uint8Array(fontBuf).forEach(b => bin += String.fromCharCode(b));
      const b64 = btoa(bin);
      const fontFace = `
@font-face {
  font-family: 'Ardeco';
  src: url('data:font/ttf;base64,${b64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
`;
      const cssNoFace = cssText.replace(/@font-face[\s\S]*?\}/, '');
      return fontFace + '\n' + cssNoFace;
    } catch (err) {
      console.warn('Failed to inline CSS/font for export:', err);
      return '';
    }
  }
  const cssPromise = inlineCssAndFont();

  // Helpers
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }
  function getBounds(svg) {
    const C = svg.querySelectorAll('circle.person');
    if (!C.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    C.forEach(c => {
      const cx = +c.getAttribute('cx'),
            cy = +c.getAttribute('cy'),
            r  = +c.getAttribute('r');
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    });
    const m = 20;
    return { x: minX - m, y: minY - m, w: maxX - minX + 2*m, h: maxY - minY + 2*m };
  }

  async function exportTree(fmt) {
    const orig = document.getElementById('svgArea');
    const b = getBounds(orig);
    if (!b) { alert('Nothing to export'); return; }

    const clone = orig.cloneNode(true);
    clone.querySelectorAll('rect, line:not(.relation)').forEach(el => el.remove());
    clone.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);

    const defs = document.createElementNS(clone.namespaceURI, 'defs');
    const s    = document.createElementNS(clone.namespaceURI, 'style');
    s.setAttribute('type','text/css');
    const css  = await cssPromise;
    s.appendChild(document.createCDATASection(css));
    defs.appendChild(s);
    clone.insertBefore(defs, clone.firstChild);

    const svgStr  = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });

    if (fmt === 'svg') {
      download('family-tree.svg', svgBlob);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(svgBlob);
    await new Promise(r => { img.onload = r; img.src = url; });
    const cnv = document.createElement('canvas');
    cnv.width  = b.w; cnv.height = b.h;
    cnv.getContext('2d').drawImage(img, 0, 0, b.w, b.h);
    URL.revokeObjectURL(url);

    if (fmt === 'png') {
      cnv.toBlob(blob => download('family-tree.png', blob));
      return;
    }
    if (fmt === 'pdf') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: b.w > b.h ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [b.w, b.h]
      });
      const dataUrl = cnv.toDataURL('image/png');
      pdf.addImage(dataUrl, 'PNG', 0, 0, b.w, b.h);
      pdf.save('family-tree.pdf');
    }
  }

  // Delegate clicks
  document.addEventListener('click', e => {
    if (e.target.id === 'exportSvgBtn') exportTree('svg');
    if (e.target.id === 'exportPngBtn') exportTree('png');
    if (e.target.id === 'exportPdfBtn') exportTree('pdf');
  });
})();
