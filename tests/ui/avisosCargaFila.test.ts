import { describe, expect, it } from 'vitest';
import { avisosCargaFila } from '../../src/presentation/selectors/plannerCardRules';

const avisos = (pasado: boolean, bloqueado: boolean, totalHoras: number) =>
  avisosCargaFila({ pasado, bloqueado, totalHoras, horasRecomendadas: 24, horasSinRecargo: 22 });

describe('Aviso de recargo solo en periodos no bloqueados', () => {
  it('ciclo actual con 23 h: sin aviso de recargo', () => {
    expect(avisos(false, true, 23)).toEqual({ excesoHoras: false, recargo: false });
  });

  it('ciclo actual con 25 h: queda el de 24 h, sin recargo', () => {
    expect(avisos(false, true, 25)).toEqual({ excesoHoras: true, recargo: false });
  });

  it('ciclo pasado: ningún aviso', () => {
    expect(avisos(true, true, 25)).toEqual({ excesoHoras: false, recargo: false });
  });

  it('periodo futuro: 23 h solo recargo, 25 h ambos, 22 h ninguno', () => {
    expect(avisos(false, false, 22)).toEqual({ excesoHoras: false, recargo: false });
    expect(avisos(false, false, 23)).toEqual({ excesoHoras: false, recargo: true });
    expect(avisos(false, false, 25)).toEqual({ excesoHoras: true, recargo: true });
  });
});
