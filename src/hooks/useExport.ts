// Hook de exportación de imagen PNG y documento PDF
// Garantiza la captura fidedigna de la malla y descarga de archivos binarios válidos

import { useCallback, useState } from 'react';
async function capturarCanvasMalla(): Promise<HTMLCanvasElement | null> {
  const html2canvas = (await import('html2canvas')).default;
  const mallaContainer = document.getElementById('malla-container');
  if (!mallaContainer) {
    console.error('[useExport] No se encontró #malla-container.');
    return null;
  }

  const veranoMaster = document.getElementById('contenedor-verano-master');

  // Guardar posición de scroll actual
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Crear wrapper de exportación ubicado exactamente en la posición del viewport
  // con z-index negativo detrás del layout de la app (para que no haya flash visual)
  // manteniendo opacity: 1 para que html2canvas capture todos los colores y texto al 100%
  const wrapper = document.createElement('div');
  wrapper.id = 'export-capture-wrapper';
  wrapper.style.cssText = `
    position: absolute;
    left: ${scrollX}px;
    top: ${scrollY}px;
    z-index: -99999;
    width: 1240px;
    background: #F8FAFC;
    padding: 24px 28px;
    box-sizing: border-box;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #0F172A;
    pointer-events: none;
  `;

  // Cabecera institucional nítida y moderna
  const header = document.createElement('div');
  header.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid rgba(15,23,42,0.12);';
  header.innerHTML = `
    <div>
      <h1 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 4px 0;letter-spacing:-0.3px;">
        UTP Malla Óptima · Planificación Curricular
      </h1>
      <p style="font-size:12px;color:#475569;margin:0;font-weight:500;">
        Simulador de Avance y Proyección Curricular · Fecha: ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
    <div style="text-align:right;">
      <span style="display:inline-block;background:#EF233C;color:#FFFFFF;font-size:11px;font-weight:800;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">
        UTP 2026
      </span>
    </div>
  `;
  wrapper.appendChild(header);

  // Clonar la malla regular (incluyendo todos los ciclos seleccionados)
  const cloneMalla = mallaContainer.cloneNode(true) as HTMLElement;
  cloneMalla.style.width = '100%';
  cloneMalla.style.height = 'auto';
  cloneMalla.style.overflow = 'visible';
  cloneMalla.querySelectorAll('.curso-card-quitar-btn, .btn-info-flotante, .tap-move-target').forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });
  wrapper.appendChild(cloneMalla);

  // Clonar ciclos de verano si existen y están activos
  if (veranoMaster && veranoMaster.style.display !== 'none') {
    const cloneVerano = veranoMaster.cloneNode(true) as HTMLElement;
    cloneVerano.style.width = '100%';
    cloneVerano.style.height = 'auto';
    cloneVerano.style.overflow = 'visible';
    cloneVerano.style.marginTop = '20px';
    cloneVerano.querySelectorAll('.curso-card-quitar-btn, .btn-info-flotante, .tap-move-target').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
    wrapper.appendChild(cloneVerano);
  }

  document.body.appendChild(wrapper);

  try {
    // Pausa breve para reflow completo
    await new Promise((resolve) => setTimeout(resolve, 80));

    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#F8FAFC',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1300,
      windowHeight: Math.max(document.documentElement.clientHeight, wrapper.offsetHeight + 100),
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas generado con dimensiones nulas');
    }

    return canvas;
  } catch (err) {
    console.error('[useExport] Error generando captura:', err);
    return null;
  } finally {
    if (wrapper.parentNode) {
      document.body.removeChild(wrapper);
    }
  }
}

export function useExport() {
  const [exportando, setExportando] = useState(false);

  const exportarPNG = useCallback(async (): Promise<boolean> => {
    setExportando(true);
    try {
      const canvas = await capturarCanvasMalla();
      if (!canvas) return false;

      // Usar dataURL directo para que Edge y Chrome descarguen con extensión .png y no como UUID
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.download = `Malla_Proyectada_UTP_${timestamp}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Error exportando PNG:', err);
      return false;
    } finally {
      setExportando(false);
    }
  }, []);

  const exportarPDF = useCallback(async (): Promise<boolean> => {
    setExportando(true);
    try {
      const canvas = await capturarCanvasMalla();
      if (!canvas) return false;

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = (canvas.height * printableWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      if (printableHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, printableHeight);
      } else {
        const scaleFactor = (pageHeight - margin * 2) / printableHeight;
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin,
          printableWidth * scaleFactor,
          pageHeight - margin * 2
        );
      }

      // Usar datauristring directo en vez de blob para forzar extensión .pdf en Edge
      const timestamp = new Date().toISOString().slice(0, 10);
      const pdfDataUri = pdf.output('datauristring', { filename: `Plan_Malla_UTP_${timestamp}.pdf` });
      const link = document.createElement('a');
      link.download = `Plan_Malla_UTP_${timestamp}.pdf`;
      link.href = pdfDataUri;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Error exportando PDF:', err);
      return false;
    } finally {
      setExportando(false);
    }
  }, []);

  return { exportarPNG, exportarPDF, exportando };
}