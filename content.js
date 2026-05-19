if (!window.hasScrollPdfListener) {
  window.hasScrollPdfListener = true;
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action === "activate_selection") {
      const overlayStyle = document.createElement('style');
      overlayStyle.id = 'roi-selection-style';
      overlayStyle.textContent = `
        .roi-hover {
          outline: 3px solid #2b78e4 !important;
          outline-offset: -3px !important;
          background-color: rgba(43, 120, 228, 0.1) !important;
          cursor: crosshair !important;
        }
      `;
      document.head.appendChild(overlayStyle);

      const handleMouseOver = (e) => {
        e.stopPropagation();
        e.target.classList.add('roi-hover');
      };

      const handleMouseOut = (e) => {
        e.target.classList.remove('roi-hover');
      };

      const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.target.classList.remove('roi-hover');
        
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('mouseout', handleMouseOut, true);
        document.removeEventListener('click', handleClick, true);
        if (overlayStyle.parentNode) document.head.removeChild(overlayStyle);

        window.selectedRoiElement = e.target;
        alert('Region selected! You can now open the extension popup and click "Save Page as PDF".');
      };

      document.addEventListener('mouseover', handleMouseOver, true);
      document.addEventListener('mouseout', handleMouseOut, true);
      document.addEventListener('click', handleClick, true);
      
      sendResponse({ success: true });
      return false;
    }

    if (message.action === "cleanup_capture") {
      document.querySelectorAll('.scroll-pdf-target, .scroll-pdf-ancestor').forEach(el => {
        el.classList.remove('scroll-pdf-target', 'scroll-pdf-ancestor');
      });
      const styleEl = document.getElementById('scroll-pdf-print-style');
      if (styleEl) styleEl.remove();
      
      sendResponse({ success: true });
      return false;
    }

    if (message.action === "prepare_capture") {
      let scrollEl;
      let isWindow = true;
      
      if (window.selectedRoiElement) {
        scrollEl = window.selectedRoiElement;
        isWindow = (scrollEl === document.scrollingElement || scrollEl === document.body);
      } else {
        scrollEl = document.scrollingElement || document.body;
        if (scrollEl.scrollHeight - scrollEl.clientHeight < 50) {
          const all = document.querySelectorAll('*');
          let maxArea = 0;
          for (const el of all) {
            if (el.scrollHeight > el.clientHeight + 10) {
              const style = window.getComputedStyle(el);
              if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                const area = el.clientWidth * el.clientHeight;
                if (area > maxArea) {
                  maxArea = area;
                  scrollEl = el;
                  isWindow = false;
                }
              }
            }
          }
        }
      }

      document.querySelectorAll('.scroll-pdf-target, .scroll-pdf-ancestor').forEach(el => {
        el.classList.remove('scroll-pdf-target', 'scroll-pdf-ancestor');
      });

      if (!isWindow) {
         scrollEl.classList.add('scroll-pdf-target');
         let curr = scrollEl.parentElement;
         while (curr && curr !== document.body && curr !== document.documentElement) {
            curr.classList.add('scroll-pdf-ancestor');
            curr = curr.parentElement;
         }
      }

      const width = isWindow ? window.innerWidth : scrollEl.clientWidth;
      
      let captureHeight = 0;
      let offsetTop = 0;

      if (isWindow) {
        const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        offsetTop = window.scrollY;
        captureHeight = totalHeight - offsetTop;
      } else {
        const totalHeight = scrollEl.scrollHeight;
        offsetTop = scrollEl.scrollTop;
        captureHeight = totalHeight - offsetTop;
      }

      // Add a small buffer to prevent arbitrary CSS clipping at the very bottom
      captureHeight += 50;

      let styleEl = document.getElementById('scroll-pdf-print-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'scroll-pdf-print-style';
        document.head.appendChild(styleEl);
      }

      const innerCSS = !isWindow ? `
        body > *:not(.scroll-pdf-ancestor):not(.scroll-pdf-target) { display: none !important; }
        .scroll-pdf-ancestor > *:not(.scroll-pdf-ancestor):not(.scroll-pdf-target) { display: none !important; }
        .scroll-pdf-ancestor { 
          margin: 0 !important; 
          padding: 0 !important; 
          border: none !important; 
          transform: none !important; 
          height: auto !important; 
          overflow: visible !important; 
        }
        .scroll-pdf-target { 
          margin: 0 !important; 
          border: none !important; 
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          transform: translateY(-${offsetTop}px) !important;
        }
      ` : `
        body { 
          transform: translateY(-${offsetTop}px) !important; 
          height: auto !important; 
          overflow: visible !important; 
        }
      `;

      styleEl.textContent = `
        @media print {
          @page {
            margin: 0 !important;
            size: ${width}px ${captureHeight}px !important;
          }
          html, body {
            width: ${width}px !important;
            height: auto !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          ${innerCSS}
        }
      `;

      sendResponse({ width, height: captureHeight });
      return false;
    }
  });
}
