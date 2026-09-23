import type { FinancialPeriod } from '../models/FinancialPeriod';

const money = (value: number) => `S/ ${value.toFixed(2)}`;

interface PeriodFinancialCardProps {
  periodo: FinancialPeriod;
  pagoUnicoActivo?: boolean;
  onTogglePagoUnico?: () => void;
}

export function PeriodFinancialCard({
  periodo,
  pagoUnicoActivo = false,
  onTogglePagoUnico,
}: PeriodFinancialCardProps) {
  const resumen = periodo.resumen;
  const esVerano = resumen.tipoPeriodo === 'VERANO';
  const horasMostradas = esVerano
    ? resumen.horasTarifarias
    : resumen.totalHorasSemanales;
  const pensionBaseMostrada = !esVerano && !resumen.pagoUnico && resumen.descuentoPorcentaje > 0
    ? resumen.montoPorCuota
    : resumen.cuotaBase;

  return (
    <article
      className={`period-financial-card ${esVerano ? 'summer' : 'regular'} ${pagoUnicoActivo ? 'single-payment-active' : ''}`}
    >
      <h3>{periodo.etiqueta}</h3>

      <div className="period-course-names">
        {periodo.cursos.map((curso) => (
          <div key={curso.codigo} className="period-course-name">
            {curso.nombre}
          </div>
        ))}
      </div>

      <div className="period-financial-lines">
        <p>
          <span>Carga:</span> {resumen.totalCreditos} créditos · {horasMostradas} horas
        </p>
        <p>
          <span>Matrícula:</span> {money(resumen.costoMatricula)}
        </p>
        <p>
          <span>Pensión base:</span> {money(pensionBaseMostrada)}
        </p>
        <p>
          <span>Cuotas:</span> {resumen.numeroCuotas}
        </p>
        <p>
          <span>Enseñanza:</span> {money(resumen.costoEnsenanzaTotal)}
        </p>
        {!esVerano && resumen.descuentoPorcentaje > 0 && (
          <p className="period-discount-line">
            <span>{resumen.pagoUnico ? 'Pago único:' : 'Pronto pago:'}</span>{' '}
            {resumen.pagoUnico
              ? `-${resumen.descuentoPorcentaje}%`
              : `-${resumen.descuentoPorcentaje}% sobre pensión base`}
          </p>
        )}
        <p className="period-total-line">
          <span>Total periodo:</span> {money(resumen.costoTotalCiclo)}
        </p>
      </div>

      <div className="period-card-actions simple">
        <button
          type="button"
          className={`single-payment-btn ${pagoUnicoActivo ? 'active' : ''} ${esVerano ? 'disabled' : ''}`}
          onClick={onTogglePagoUnico}
          disabled={esVerano}
        >
          {esVerano
            ? 'Pago único no disponible en verano'
            : pagoUnicoActivo
              ? 'Quitar pago único'
              : 'Aplicar pago único (7.5%)'}
        </button>
      </div>
    </article>
  );
}
