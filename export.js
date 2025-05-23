// export.js - Version with embedded font data

document.addEventListener('DOMContentLoaded', function() {
  console.log('export.js loaded');

  // Function to try loading the Ardeco font and convert to base64
  async function loadArdecoFont() {
    const fontPaths = [
      'fonts/Ardeco.ttf',
      './fonts/Ardeco.ttf',
      'Ardeco.ttf'
    ];

    for (const path of fontPaths) {
      try {
        console.log(`Trying to load font from: ${path}`);
        const response = await fetch(path);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          console.log(`✓ Successfully loaded Ardeco font from: ${path}`);
          return base64;
        }
      } catch (error) {
        console.log(`✗ Failed to load font from ${path}:`, error.message);
      }
    }
    
    console.warn('Could not load Ardeco font - will use system fallback');
    return null;
  }

  // Create CSS with embedded font
  function createExportCSS(fontBase64 = null) {
    let css = '';
    
    if (fontBase64) {
      css += `
        @font-face {
          font-family: 'Ardeco';
          src: url('data:font/truetype;base64,${fontBase64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `;
    }

    css += `
      text {
        font-family: ${fontBase64 ? "'Ardeco', " : ""}'Arial', sans-serif !important;
        font-size: 12px;
        pointer-events: none;
        user-select: none;
      }

      text.name {
        font-weight: bold;
        fill: #333;
        font-family: ${fontBase64 ? "'Ardeco', " : ""}'Arial', sans-serif !important;
      }

      text.dob {
        font-size: 10px;
        fill: #666;
        font-family: ${fontBase64 ? "'Ardeco', " : ""}'Arial', sans-serif !important;
      }

      circle.person {
        stroke: none;
      }

      circle.person.selected {
        stroke: #e74c3c;
        stroke-width: 4px;
      }

      line.relation {
        stroke: #555;
        stroke-width: 3;
        stroke-linecap: round;
      }

      line.relation:hover {
        stroke: #e74c3c;
        stroke-width: 4;
      }
    `;

    return css;
  }

  // Helper function to download files
  function downloadFile(filename, blob) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Get bounding box of all person nodes
  function getContentBounds(svg) {
    const circles = svg.querySelectorAll('circle.person');
    if (circles.length === 0) {
      return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    circles.forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      const r = parseFloat(circle.getAttribute('r'));
      
      minX = Math.min(minX, cx - r - 50);
      minY = Math.min(minY, cy - r - 50);
      maxX = Math.max(maxX, cx + r + 50);
      maxY = Math.max(maxY, cy + r + 50);
    });

    const padding = 50;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + (padding * 2),
      height: maxY - minY + (padding * 2)
    };
  }

  // Create clean SVG for export
  async function createExportSVG() {
    const originalSVG = document.getElementById('svgArea');
    const bounds = getContentBounds(originalSVG);
    
    if (!bounds) {
      alert('No family tree content to export');
      return null;
    }

    // Load font data
    console.log('Loading Ardeco font for export...');
    const fontBase64 = await loadArdecoFont();
    
    // Clone the SVG
    const clonedSVG = originalSVG.cloneNode(true);
    
    // Remove background elements (grid and background rect)
    const backgroundElements = clonedSVG.querySelectorAll('rect, line:not(.relation)');
    backgroundElements.forEach(el => el.remove());
    
    // Remove selection styling
    const selectedElements = clonedSVG.querySelectorAll('.selected');
    selectedElements.forEach(el => el.classList.remove('selected'));
    
    // Set proper viewBox and dimensions
    clonedSVG.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    clonedSVG.setAttribute('width', bounds.width);
    clonedSVG.setAttribute('height', bounds.height);
    clonedSVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Create CSS with embedded font
    const css = createExportCSS(fontBase64);
    
    // Add styles to SVG using proper SVG elements
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('type', 'text/css');
    style.textContent = css;
    defs.appendChild(style);
    clonedSVG.insertBefore(defs, clonedSVG.firstChild);
    
    return {
      svg: clonedSVG,
      bounds: bounds,
      hasFont: !!fontBase64
    };
  }

  // Export as SVG
  async function exportSVG() {
    console.log('Exporting SVG...');
    try {
      const exportData = await createExportSVG();
      if (!exportData) return;

      if (exportData.hasFont) {
        console.log('✓ Ardeco font embedded in SVG export');
      } else {
        console.log('⚠ SVG export using system fonts only');
      }

      const svgString = new XMLSerializer().serializeToString(exportData.svg);
      const finalSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
      
      const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' });
      downloadFile('family-tree.svg', blob);
      console.log('✓ SVG export completed');
    } catch (error) {
      console.error('SVG export failed:', error);
      alert('SVG export failed. Check console for details.');
    }
  }

  // Export as PNG
  async function exportPNG() {
    console.log('Exporting PNG...');
    try {
      const exportData = await createExportSVG();
      if (!exportData) return;

      if (exportData.hasFont) {
        console.log('✓ Ardeco font embedded in PNG export');
      } else {
        console.log('⚠ PNG export using system fonts only');
      }

      const svgString = new XMLSerializer().serializeToString(exportData.svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size (2x for better quality)
          const scale = 2;
          canvas.width = exportData.bounds.width * scale;
          canvas.height = exportData.bounds.height * scale;
          ctx.scale(scale, scale);
          
          // White background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, exportData.bounds.width, exportData.bounds.height);
          
          // Draw the SVG
          ctx.drawImage(img, 0, 0, exportData.bounds.width, exportData.bounds.height);
          
          // Convert to blob and download
          canvas.toBlob(function(blob) {
            downloadFile('family-tree.png', blob);
            console.log('✓ PNG export completed');
          }, 'image/png', 1.0);
          
        } catch (canvasError) {
          console.error('Canvas drawing failed:', canvasError);
          alert('PNG export failed during canvas rendering.');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      
      img.onerror = function() {
        console.error('Failed to load SVG image');
        alert('PNG export failed - could not load SVG image.');
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
      
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('PNG export failed. Check console for details.');
    }
  }

  // Export as PDF
  async function exportPDF() {
    console.log('Exporting PDF...');
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
      alert('PDF export functionality is not available. jsPDF library not found.');
      return;
    }

    try {
      const exportData = await createExportSVG();
      if (!exportData) return;

      if (exportData.hasFont) {
        console.log('✓ Ardeco font embedded in PDF export');
      } else {
        console.log('⚠ PDF export using system fonts only');
      }

      const svgString = new XMLSerializer().serializeToString(exportData.svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size for PDF
          const scale = 2;
          canvas.width = exportData.bounds.width * scale;
          canvas.height = exportData.bounds.height * scale;
          ctx.scale(scale, scale);
          
          // White background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, exportData.bounds.width, exportData.bounds.height);
          
          // Draw the SVG
          ctx.drawImage(img, 0, 0, exportData.bounds.width, exportData.bounds.height);
          
          // Create PDF
          const { jsPDF } = window.jspdf;
          
          // Simple PDF creation
          const isLandscape = exportData.bounds.width > exportData.bounds.height;
          const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: [exportData.bounds.width, exportData.bounds.height]
          });
          
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', 0, 0, exportData.bounds.width, exportData.bounds.height);
          pdf.save('family-tree.pdf');
          
          console.log('✓ PDF export completed');
          
        } catch (pdfError) {
          console.error('PDF creation failed:', pdfError);
          alert('PDF export failed during PDF creation.');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      
      img.onerror = function() {
        console.error('Failed to load SVG for PDF');
        alert('PDF export failed - could not load SVG image.');
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
      
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Check console for details.');
    }
  }

  // Attach event listeners to buttons
  try {
    const exportSvgBtn = document.getElementById('exportSvgBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    if (exportSvgBtn) {
      exportSvgBtn.addEventListener('click', exportSVG);
      console.log('✓ SVG export button connected');
    } else {
      console.error('✗ SVG export button not found');
    }

    if (exportPngBtn) {
      exportPngBtn.addEventListener('click', exportPNG);
      console.log('✓ PNG export button connected');
    } else {
      console.error('✗ PNG export button not found');
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', exportPDF);
      console.log('✓ PDF export button connected');
    } else {
      console.error('✗ PDF export button not found');
    }

    console.log('✓ Export functionality ready');
    
  } catch (error) {
    console.error('Failed to attach export button listeners:', error);
  }
});
