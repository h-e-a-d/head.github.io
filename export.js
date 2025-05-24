// export.js
window.addEventListener('DOMContentLoaded', () => {
  async function inlineCssAndFont() {
    try {
      const link    = document.querySelector('link[href$="style.css"]');
      const [cssText, fontBuf] = await Promise.all([
        fetch(link.href).then(r => r.text()),
        fetch('Ardeco.ttf').then(r => r.arrayBuffer())
      ]);
      let bin = '', b64;
      new Uint8Array(fontBuf).forEach(b => bin += String.fromCharCode(b));
      b64 = btoa(bin);

      const fontFace = `
@font-face {
  font-family: 'Ardeco';
  src: url('data:font/ttf;base64,${b64}') format('truetype');
}
`;
      return fontFace + cssText.replace(/@font-face[\s\S]*?\}/, '');
    } catch {
      return '';
    }
  }
  const cssPromise = inlineCssAndFont();

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function getBounds(svg) {
    const C = svg.querySelectorAll('circle.person');
    if (!C.length) return null;
    let [minX,minY,maxX,maxY] = [Infinity,Infinity,-Infinity,-Infinity];
    C.forEach(c => {
      const cx = +c.getAttribute('cx'),
            cy = +c.getAttribute('cy'),
            r  = +c.getAttribute('r');
      minX = Math.min(minX, cx-r);
      minY = Math.min(minY, cy-r);
      maxX = Math.max(maxX, cx+r);
      maxY = Math.max(maxY, cy+r);
    });
    const m = 20;
    return { x: minX-m, y: minY-m, w: maxX-minX+2*m, h: maxY-minY+2*m };
  }

  async function exportTree(fmt) {
    const svg = document.getElementById('svgArea');
    let b = getBounds(svg);
    if (!b) {
      const vb = svg.viewBox.baseVal;
      b = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    }

    const clone = svg.cloneNode(true);
    clone.querySelectorAll('rect, line:not(.relation)').forEach(e => e.remove());
    clone.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);

    const defs = document.createElementNS(svg.namespaceURI, 'defs');
    const styleEl = document.createElementNS(svg.namespaceURI, 'style');
    styleEl.setAttribute('type','text/css');
    styleEl.appendChild(document.createCDATASection(await cssPromise));
    defs.appendChild(styleEl);
    clone.insertBefore(defs, clone.firstChild);

    const str = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([str], { type: 'image/svg+xml' });
    if (fmt === 'svg') return download('family-tree.svg', blob);

    const img = new Image();
    const url = URL.createObjectURL(blob);
    await new Promise(r => { img.onload = r; img.src = url; });
    const cnv = document.createElement('canvas');
    cnv.width  = b.w; cnv.height = b.h;
    cnv.getContext('2d').drawImage(img, 0, 0, b.w, b.h);
    URL.revokeObjectURL(url);

    if (fmt === 'png') return cnv.toBlob(blb => download('family-tree.png', blb));
    if (fmt === 'pdf') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit:'pt', format:[b.w,b.h] });
      pdf.addImage(cnv.toDataURL(), 'PNG', 0, 0, b.w, b.h);
      pdf.save('family-tree.pdf');
    }
  }

  document.getElementById('exportSvgBtn').addEventListener('click', () => exportTree('svg'));
  document.getElementById('exportPngBtn').addEventListener('click', () => exportTree('png'));
  document.getElementById('exportPdfBtn').addEventListener('click', () => exportTree('pdf'));
});
