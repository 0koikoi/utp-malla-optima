import type { Curso, PeriodoIngreso } from '../types/academic';
import { permiteVeranoDespuesDe } from '../domain/rules/academicContextRules';
import { downloadBlob } from './backupService';

/** Exporta una representación legible de la malla sin depender de la captura del DOM. */
export async function exportPlanPNG(
  cursos: Curso[],
  totalCiclos: number,
  cicloActual: number | null,
  ingreso: PeriodoIngreso | null
): Promise<void> {
  const periodos = Array.from({ length: totalCiclos }, (_, index) => index + 1)
    .flatMap((ciclo) => [
      { ciclo, verano: false },
      ...(ingreso && permiteVeranoDespuesDe(ciclo, ingreso) ? [{ ciclo, verano: true }] : []),
    ]);
  const escala = 2;
  const ancho = 1100;
  const altoFila = 154;
  const alto = 150 + periodos.length * altoFila + 50;
  const canvas = document.createElement('canvas');
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la imagen PNG.');
  ctx.scale(escala, escala);
  ctx.fillStyle = '#f7f8fb';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = '#2b2d42';
  ctx.fillRect(0, 0, ancho, 112);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 31px Arial, sans-serif';
  ctx.fillText('MallaU · Planificación académica', 38, 56);
  ctx.font = '17px Arial, sans-serif';
  ctx.fillStyle = '#cbd1e2';
  ctx.fillText(`Inicio: ${ingreso ?? 'sin configurar'}   ·   Ciclo actual: ${cicloActual ?? 'sin configurar'}`, 38, 86);

  periodos.forEach(({ ciclo, verano }, index) => {
    const y = 133 + index * altoFila;
    const lista = cursos.filter((curso) =>
      curso.ubicacion === 'periodo' && curso.ciclo === ciclo &&
      curso.tipoPeriodo === (verano ? 'VERANO' : 'REGULAR'));
    ctx.fillStyle = cicloActual === ciclo && !verano ? '#fff3ee' : '#ffffff';
    ctx.fillRect(28, y, ancho - 56, altoFila - 12);
    ctx.strokeStyle = verano ? '#f5bc5b' : '#dfe3ec';
    ctx.strokeRect(28, y, ancho - 56, altoFila - 12);
    ctx.fillStyle = verano ? '#a45d00' : '#2b2d42';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText(verano ? `Verano tras ciclo ${ciclo}` : `Ciclo ${ciclo}${cicloActual === ciclo ? ' · actual' : ''}`, 46, y + 32);
    if (lista.length === 0) {
      ctx.fillStyle = '#8d99ae';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillText('Sin cursos asignados', 46, y + 66);
      return;
    }
    ctx.font = '14px Arial, sans-serif';
    lista.slice(0, 8).forEach((curso, itemIndex) => {
      const col = itemIndex % 2;
      const row = Math.floor(itemIndex / 2);
      const x = 46 + col * 505;
      const cy = y + 60 + row * 22;
      ctx.fillStyle = curso.estado === 'APROBADO' ? '#177c72' :
        curso.estado === 'EN_CURSO' ? '#7953bd' : '#36445f';
      const nombre = curso.nombre.length > 43 ? `${curso.nombre.slice(0, 40)}…` : curso.nombre;
      ctx.fillText(`${curso.codigo} · ${nombre}`, x, cy);
    });
    if (lista.length > 8) {
      ctx.fillStyle = '#6e7789';
      ctx.fillText(`+ ${lista.length - 8} cursos más`, 46, y + 139);
    }
  });

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo generar el PNG.')), 'image/png'));
  downloadBlob(blob, 'malla_academica.png');
}
