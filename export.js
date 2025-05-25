// export.js - Fixed version
(async () => {
  // 1) Get CSS styles with fallback handling
  async function getInlineCSS() {
    try {
      // Try to get CSS from the link element
      const link = document.querySelector('link[rel="stylesheet"][href$="style.css"]');
      let cssText = '';
      
      if (link) {
        try {
          const response = await fetch(link.href);
          cssText = await response.text();
        } catch (fetchError) {
          console.warn('Could not fetch external CSS, using computed styles fallback');
        }
      }
      
      // Fallback: create essential CSS for export
      if (!cssText) {
        cssText = `
          text {
            font-family: Arial, sans-serif;
            font-size: 12px;
            pointer-events: none;
            user-select: none;
          }
          text.name {
            font-weight: bold;
            fill: #333;
          }
          text.dob {
            font-size: 10px;
            fill: #666;
          }
          circle.person {
            stroke: none;
          }
          line.relation {
            stroke: #555;
            stroke-width: 3;
            stroke-linecap: round;
          }
        `;
      }
      
      // Try to inline font if available, but don't fail if it's not
      try {
        const fontResponse = await fetch('Ardeco.ttf');
        const fontBuf = await fontResponse.arrayBuffer();
        
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
        
        // Remove existing @font-face rules more carefully
        const cssNoFace = cssText.replace(/@font-face\s*\{[^}]*\}/g, '');
        return fontFace + '\n' + cssNoFace;
      } catch (fontError) {
        console.warn('Could not load custom font for export, using fallback');
        // Just use CSS without custom font
        return cssText.replace(/'Ardeco',?\s*/g, '');
      }
    } catch (err) {
      console.warn('Failed to get CSS for export:', err);
      // Return minimal fallback CSS
      return `
        text { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
        text.dob { font-size: 10px; fill: #666; }
        circle.person { stroke: none; }
        line.relation { stroke: #555; stroke-width: 3; }
      `;
    }
  }

  // Helper functions
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function getBounds(svg) {
    const circles = svg.querySelectorAll('circle.person');
    if (!circles.length) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    circles.forEach(c => {
      const cx = parseFloat(c.getAttribute('cx')) || 0;
      const cy = parseFloat(c.getAttribute('cy')) || 0;
      const r = parseFloat(c.getAttribute('r')) || 20;
      
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    });
    
    // Add margin
    const margin = 50;
    return { 
      x: minX - margin, 
      y: minY - margin, 
      w: maxX - minX + 2 * margin, 
      h: maxY - minY + 2 * margin 
    };
  }

  async function exportTree(format) {
    const originalSvg = document.getElementById('svgArea');
    if (!originalSvg) {
      alert('SVG area not found');
      return;
    }

    const bounds = getBounds(originalSvg);
    if (!bounds) {
      alert('No family tree data to export. Please add some people first.');
      return;
    }

    try {
      // Clone the SVG
      const clonedSvg = originalSvg.cloneNode(true);
      
      // Remove grid elements (background rect and grid lines)
      clonedSvg.querySelectorAll('rect').forEach(el => el.remove());
      clonedSvg.querySelectorAll('line:not(.relation)').forEach(el => el.remove());
      
      // Set proper viewBox
      clonedSvg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);
      clonedSvg.setAttribute('width', bounds.w);
      clonedSvg.setAttribute('height', bounds.h);
      
      // Add CSS styles
      const css = await getInlineCSS();
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.setAttribute('type', 'text/css');
      style.textContent = css;
      defs.appendChild(style);
      clonedSvg.insertBefore(defs, clonedSvg.firstChild);

      // Serialize SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

      if (format === 'svg') {
        download('family-tree.svg', svgBlob);
        return;
      }

      // For PNG and PDF, we need to render to canvas
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load SVG image'));
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      const scale = 2; // Higher resolution
      canvas.width = bounds.w * scale;
      canvas.height = bounds.h * scale;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, bounds.w, bounds.h);
      ctx.drawImage(img, 0, 0, bounds.w, bounds.h);
      
      URL.revokeObjectURL(svgUrl);

      if (format === 'png') {
        canvas.toBlob((blob) => {
          if (blob) {
            download('family-tree.png', blob);
          } else {
            alert('Failed to create PNG');
          }
        }, 'image/png');
        return;
      }

      if (format === 'pdf') {
        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
          alert('PDF export not available. Please ensure jsPDF library is loaded.');
          return;
        }

        const { jsPDF } = window.jspdf;
        const orientation = bounds.w > bounds.h ? 'landscape' : 'portrait';
        
        // Convert to points (72 DPI)
        const pdfWidth = bounds.w * 0.75;
        const pdfHeight = bounds.h * 0.75;
        
        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'pt',
          format: [pdfWidth, pdfHeight]
        });

        const dataUrl = canvas.toDataURL('image/png');
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('family-tree.pdf');
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }
  }

  // Add event listeners for export buttons
  function addExportListeners() {
    document.addEventListener('click', (e) => {
      switch (e.target.id) {
        case 'exportSvgBtn':
          e.preventDefault();
          exportTree('svg');
          break;
        case 'exportPngBtn':
          e.preventDefault();
          exportTree('png');
          break;
        case 'exportPdfBtn':
          e.preventDefault();
          exportTree('pdf');
          break;
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExportListeners);
  } else {
    addExportListeners();
  }

  // Debug function
  window.debugExport = function() {
    const svg = document.getElementById('svgArea');
    const bounds = getBounds(svg);
    console.log('SVG bounds:', bounds);
    console.log('People count:', svg.querySelectorAll('circle.person').length);
    console.log('Relations count:', svg.querySelectorAll('line.relation').length);
  };

})();