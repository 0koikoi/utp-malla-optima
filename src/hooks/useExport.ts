// Hook de exportación de imagen PNG
// Migrado de app-script.js → btn-export handler

import { useCallback } from 'react';
import html2canvas from 'html2canvas';

export function useExport() {
  const exportarPNG = useCallback(() => {
    const mallaContainer = document.getElementById('malla-container');
    const veranoContainer = document.getElementById('contenedor-verano-master');
    if (!mallaContainer) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'background:#EDEEF1;padding:20px;display:inline-block;min-width:600px;font-family:Inter,sans-serif;';

    wrapper.appendChild(mallaContainer.cloneNode(true));

    if (veranoContainer) {
      wrapper.appendChild(veranoContainer.cloneNode(true));
    }

    document.body.appendChild(wrapper);
    html2canvas(wrapper, { backgroundColor: '#EDEEF1', scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = 'Malla_Proyectada_UTP.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      document.body.removeChild(wrapper);
    });
  }, []);

  return { exportarPNG };
}
