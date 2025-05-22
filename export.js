// export.js
(function() {
  // Download helper
  function download(filename, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  // Compute tight bounds around all circles, with a fixed margin
  function getBounds(svg) {
    const circles = svg.querySelectorAll('circle.person');
    if (!circles.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    circles.forEach(c => {
      const cx = parseFloat(c.getAttribute('cx'));
      const cy = parseFloat(c.getAttribute('cy'));
      const r  = parseFloat(c.getAttribute('r'));
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    });
    const margin = 20;  // px
    return {
      x:   minX - margin,
      y:   minY - margin,
      w:  (maxX - minX) + margin * 2,
      h:  (maxY - minY) + margin * 2
    };
  }

  // Main export function
  async function exportTree(format) {
    const orig = document.getElementById('svgArea');
    const bounds = getBounds(orig);
    if (!bounds) {
      alert('Nothing to export');
      return;
    }

    // 1) Clone SVG and strip out background/grid
    const clone = orig.cloneNode(true);
    // remove <rect> (background) and grid lines (non-relation <line>)
    clone.querySelectorAll('rect, line:not(.relation)').forEach(el => el.remove());
    // set tight viewBox
    clone.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);

    // serialize
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    if (format === 'svg') {
      download('family-tree.svg', svgBlob);
      return;
    }

    // 2) Draw to canvas
    const img = new Image();
    const url = URL.createObjectURL(svgBlob);
    await new Promise(resolve => {
      img.onload = resolve;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width  = bounds.w;
    canvas.height = bounds.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    if (format === 'png') {
      canvas.toBlob(blob => download('family-tree.png', blob));
      return;
    }

    if (format === 'pdf') {
      // requires jsPDF loaded as window.jspdf.jsPDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: bounds.w > bounds.h ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [bounds.w, bounds.h]
      });
      const dataUrl = canvas.toDataURL('image/png');
      pdf.addImage(dataUrl, 'PNG', 0, 0, bounds.w, bounds.h);
      pdf.save('family-tree.pdf');
    }
  }

  // Wire up buttons
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('exportSvgBtn').addEventListener('click', () => exportTree('svg'));
    document.getElementById('exportPngBtn').addEventListener('click', () => exportTree('png'));
    document.getElementById('exportPdfBtn').addEventListener('click', () => exportTree('pdf'));
  });
})();
