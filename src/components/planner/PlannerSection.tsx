// PlannerSection — sección de ciclos regulares con ciclos de verano intercalados cronológicamente
import { useMallaStore } from '@/store/mallaStore';
import { CicloRow } from './CicloRow';
import { CalendarCheck } from 'lucide-react';

export function PlannerSection() {
  const {
    cicloInicio,
    cicloFin,
    veranoActivo,
    cantVeranos,
    veranoUbicaciones,
    periodoIngreso,
  } = useMallaStore();

  const ciclos = [];
  for (let i = cicloInicio; i <= cicloFin; i++) {
    ciclos.push(i);
  }

  // Lista de números de verano activos (1..cantVeranos)
  const veranosActivos = veranoActivo
    ? Array.from({ length: cantVeranos }, (_, idx) => idx + 1)
    : [];

  // Función para determinar tras qué ciclo va cada verano
  const getTrasCiclo = (v: number) => {
    if (veranoUbicaciones[v] !== undefined) return veranoUbicaciones[v];
    return periodoIngreso === 'agosto' ? (v * 2 - 1) : (v * 2);
  };

  // Rastrear qué veranos ya fueron renderizados intercalados
  const veranosRenderizados = new Set<number>();

  return (
    <section id="panel-planificador" aria-label="Planificador de ciclos">
      <p className="planner-section-title">
        <CalendarCheck size={14} className="inline-icon" />
        {' '}Planificador de Avance Curricular
        <span className="title-note">
          Ciclos {cicloInicio} al {cicloFin}
          {veranoActivo ? ` · Veranos en Enero (${periodoIngreso === 'marzo' ? 'post ciclo par' : 'post ciclo impar'})` : ''}
        </span>
      </p>

      <div id="malla-container">
        {ciclos.map((n) => {
          // Buscar si algún verano activo se cursa inmediatamente tras este ciclo n
          const veranosTrasEsteCiclo = veranosActivos.filter((v) => getTrasCiclo(v) === n);
          veranosTrasEsteCiclo.forEach((v) => veranosRenderizados.add(v));

          return (
            <div key={`seccion-ciclo-${n}`} className="ciclo-bloque-grupo">
              <CicloRow cicloNum={n} tipo="regular" />

              {veranosTrasEsteCiclo.map((v) => (
                <CicloRow key={`verano-${v}`} cicloNum={v} tipo="verano" />
              ))}
            </div>
          );
        })}

        {/* Si algún verano quedó configurado fuera del rango cicloInicio..cicloFin, mostrarlo al final */}
        {veranosActivos
          .filter((v) => !veranosRenderizados.has(v))
          .map((v) => (
            <CicloRow key={`verano-extra-${v}`} cicloNum={v} tipo="verano" />
          ))}
      </div>
    </section>
  );
}

