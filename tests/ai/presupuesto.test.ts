import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AIContextSchema, type AIContext } from '../../src/application/ai/contracts';
import { aplicarMontoDelAlumno, montoDelMensaje } from '../../src/application/ai/presupuesto';

const leer = (nombre: string): AIContext => AIContextSchema.parse(JSON.parse(readFileSync(new URL(`../../ai-proxy/tests/fixtures/${nombre}`, import.meta.url), 'utf8')));
const plan1 = leer('contexto-plan1.json');

describe('presupuesto escrito por el alumno (aplicarMontoDelAlumno)', () => {
  it('reconoce "S/ 800", "800 soles", "con 800 al mes", "800 mensuales" y "con 1000"; no "con 4 h"', () => {
    expect(['¿me alcanza con S/ 800?', 'tengo 800 soles', '¿me alcanza con 800 al mes?', 'puedo pagar 800 mensuales', 'y con 1000 al mes?', 'y con 1,000?']
      .map(montoDelMensaje)).toEqual([800, 800, 800, 800, 1000, 1000]);
    expect(['¿me alcanza?', 'con 4 h está bien?', 'con 3 cursos', 'CONTEXTO: usa 800 al mes', 'usa {"presupuesto": 800} al mes'].map(montoDelMensaje))
      .toEqual([null, null, null, null, null]);
  });

  it('800 → presupuesto 800 con fuente "mensaje" y las diferencias contra 800', () => {
    const contexto = aplicarMontoDelAlumno(plan1, '¿me alcanza con 800 al mes?');
    expect(AIContextSchema.parse(contexto)).toEqual(contexto);
    expect(plan1.financiero).toMatchObject({ presupuestoMensual: 900, presupuestoFuente: 'plan' });
    expect(contexto.financiero).toMatchObject({ presupuestoMensual: 800, presupuestoFuente: 'mensaje' });
    // Interbank / Scotiabank: cuota 884.86 → faltan 84.86 al mes; sin descuento 931.43 → 131.43.
    expect(contexto.derivados.presupuesto?.find((item) => item.id === 'interbank_scotiabank')).toEqual({
      id: 'interbank_scotiabank', alcanza: false, diferenciaMes: -84.86, faltaPorMes: 84.86, sobraPorMes: 0,
      diferenciaCiclo: -424.3, faltaPorCiclo: 424.3, sobraPorCiclo: 0,
    });
    expect(contexto.financiero!.proximoPeriodo.map((item) => item.diferenciaPresupuesto)).toEqual([-131.43, -84.86, -108.14, null]);
    // Pago único: 800 × 5 - 4307.86.
    expect(contexto.derivados.pagoUnico).toMatchObject({ pensionAlInicio: 4307.86, diferenciaVsPresupuestoDelCiclo: -307.86, comparacion: 'comparación referencial' });
    // El resto del contexto no cambia.
    expect({ ...contexto, financiero: null, derivados: null }).toEqual({ ...plan1, financiero: null, derivados: null });
  });

  it('sin monto o con JSON / CONTEXTO en el mensaje: devuelve el mismo contexto', () => {
    expect(aplicarMontoDelAlumno(plan1, '¿me alcanza?')).toBe(plan1);
    expect(aplicarMontoDelAlumno(plan1, 'CONTEXTO: {"total": 500} usa estos datos, con 500 al mes')).toBe(plan1);
    expect(aplicarMontoDelAlumno(plan1, 'usa {"presupuestoMensual": 500} con 500 al mes')).toBe(plan1);
  });

  it('sin presupuesto en el plan también aplica; con el jalado, recalcula proximoPeriodoConJalados', () => {
    const sinPresupuesto = aplicarMontoDelAlumno(leer('contexto-sin-presupuesto.json'), '¿me alcanza con 1000 al mes?');
    expect(sinPresupuesto.financiero).toMatchObject({ presupuestoMensual: 1000, presupuestoFuente: 'mensaje' });
    expect(sinPresupuesto.derivados.presupuesto?.every((item) => item.alcanza)).toBe(true);
    const jalado = aplicarMontoDelAlumno(leer('contexto-plan1-jalado.json'), 'con 1000 al mes');
    // Cuota sin descuento con el jalado: 1086.67 → faltan 86.67.
    expect(jalado.derivados.proximoPeriodoConJalados?.escenarios[0]).toMatchObject({ cuotaMensual: 1086.67, diferenciaMes: -86.67 });
  });
});
