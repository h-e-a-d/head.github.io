// export.js - Fixed version with dynamic font support
(async () => {
  // 1) Get current font settings from the application
  function getCurrentFontSettings() {
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeInput = document.getElementById('fontSizeInput');
    
    return {
      fontFamily: fontSelect ? fontSelect.value : 'Arial, sans-serif',
      fontSize: fontSizeInput ? parseInt(fontSizeInput.value) || 12 : 12
    };
  }

  // 2) Generate CSS with current font settings
  async function getExportCSS() {
    const { fontFamily, fontSize } = getCurrentFontSettings();
    
    try {
      // Try to get base CSS from the link element
      const link = document.querySelector('link[rel="stylesheet"][href$="style.css"]');
      let baseCss = '';
      
      if (link) {
        try {
          const response = await fetch(link.href);
          baseCss = await response.text();
        } catch (fetchError) {
          console.warn('Could not fetch external CSS, using built-in styles');
        }
      }
      
      // Create comprehensive CSS with current font settings
      const exportCSS = `
        /* Base styles */
        text {
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          pointer-events: none;
          user-select: none;
        }
        
        text.name {
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: #333;
        }
        
        text.dob {
          font-family: ${fontFamily};
          font-size: ${Math.max(6, fontSize - 2)}px;
          fill: #666;
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
      
      // Handle font embedding for custom fonts
      let fontFaceCSS = '';
      
      // For Google Fonts, include import in CSS
      const googleFonts = [
        'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
        'Source Sans Pro', 'Merriweather', 'PT Serif', 'Poppins', 'Fira Code'
      ];
      
      const fontFamilyName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      
      if (googleFonts.includes(fontFamilyName)) {
        // For Google Fonts, add import statement
        const fontImport = `@import url('https://fonts.googleapis.com/css2?family=${fontFamilyName.replace(/ /g, '+')}:wght@400;700&display=swap');`;
        fontFaceCSS = fontImport + '\n';
      } else if (fontFamilyName === 'Ardeco') {
        // Handle custom Ardeco font
        try {
          const fontResponse = await fetch('Ardeco.ttf');
          const fontBuf = await fontResponse.arrayBuffer();
          
          // base64-encode font
          let bin = '';
          new Uint8Array(fontBuf).forEach(b => bin += String.fromCharCode(b));
          const b64 = btoa(bin);
          
          fontFaceCSS = `
@font-face {
  font-family: 'Ardeco';
  src: url('data:font/ttf;base64,${b64}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
`;
        } catch (fontError) {
          console.warn('Could not load Ardeco font for export, using fallback');
          // Fallback to Inter
          return exportCSS.replace(/Ardeco/g, 'Inter, sans-serif');
        }
      }
      
      return fontFaceCSS + exportCSS;
      
    } catch (err) {
      console.warn('Failed to generate export CSS:', err);
      // Return minimal fallback CSS with current font settings
      return `
        text { 
          font-family: ${fontFamily.includes('Inter') ? fontFamily : 'Inter, ' + fontFamily}; 
          font-size: ${fontSize}px; 
          fill: #333; 
        }
        text.dob { 
          font-family: ${fontFamily.includes('Inter') ? fontFamily : 'Inter, ' + fontFamily}; 
          font-size: ${Math.max(6, fontSize - 2)}px; 
          fill: #666; 
        }
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

  // 3) Apply current font settings to cloned SVG text elements
  function applyCurrentFontsToClone(clonedSvg) {
    const { fontFamily, fontSize } = getCurrentFontSettings();
    
    // Update all text elements in the clone to match current settings
    clonedSvg.querySelectorAll('text').forEach(textEl => {
      textEl.setAttribute('font-family', fontFamily);
      
      if (textEl.classList.contains('dob')) {
        textEl.setAttribute('font-size', Math.max(6, fontSize - 2));
      } else {
        textEl.setAttribute('font-size', fontSize);
      }
    });
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
      // Show current font settings in console for debugging
      const currentFonts = getCurrentFontSettings();
      console.log('Exporting with font settings:', currentFonts);

      // Clone the SVG
      const clonedSvg = originalSvg.cloneNode(true);
      
      // Remove grid elements (background rect and grid lines)
      clonedSvg.querySelectorAll('rect').forEach(el => el.remove());
      clonedSvg.querySelectorAll('line:not(.relation)').forEach(el => el.remove());
      
      // Apply current font settings to all text elements in the clone
      applyCurrentFontsToClone(clonedSvg);
      
      // Set proper viewBox and dimensions
      clonedSvg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`);
      clonedSvg.setAttribute('width', bounds.w);
      clonedSvg.setAttribute('height', bounds.h);
      
      // Add CSS styles with current font settings
      const css = await getExportCSS();
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
      const scale = 2; // Higher resolution for better quality
      canvas.width = bounds.w * scale;
      canvas.height = bounds.h * scale;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      
      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, bounds.w, bounds.h);
      
      // Draw the SVG
      ctx.drawImage(img, 0, 0, bounds.w, bounds.h);
      
      URL.revokeObjectURL(svgUrl);

      if (format === 'png') {
        canvas.toBlob((blob) => {
          if (blob) {
            download('family-tree.png', blob);
            if (window.showMessage) {
              window.showMessage('PNG exported successfully with current font settings!', 'success');
            }
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
        
        if (window.showMessage) {
          window.showMessage('PDF exported successfully with current font settings!', 'success');
        }
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

  // Enhanced debug function
  window.debugExport = function() {
    const svg = document.getElementById('svgArea');
    const bounds = getBounds(svg);
    const fontSettings = getCurrentFontSettings();
    
    console.log('=== Export Debug Info ===');
    console.log('SVG bounds:', bounds);
    console.log('People count:', svg.querySelectorAll('circle.person').length);
    console.log('Relations count:', svg.querySelectorAll('line.relation').length);
    console.log('Current font settings:', fontSettings);
    console.log('Sample text elements:');
    svg.querySelectorAll('text').forEach((t, i) => {
      if (i < 3) { // Show first 3 text elements
        console.log(`  Text ${i + 1}:`, {
          content: t.textContent,
          fontFamily: t.getAttribute('font-family'),
          fontSize: t.getAttribute('font-size'),
          class: t.getAttribute('class')
        });
      }
    });
  };

  // Test function to preview export CSS
  window.previewExportCSS = async function() {
    const css = await getExportCSS();
    console.log('Generated export CSS:', css);
  };

})();