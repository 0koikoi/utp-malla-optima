// PlannerSection — sección de ciclos regulares con ciclos de verano intercalados cronológicamente
import { useMallaStore } from '@/store/mallaStore';
import { useCicloActual } from '@/store/selectors';
import { CicloRow } from './CicloRow';
import { CalendarCheck, Sun, Plus } from 'lucide-react';

export function PlannerSection() {
  const {
    cicloInicio,
    cicloFin,
    veranoActivo,
    cantVeranos,
    veranoUbicaciones,
    periodoIngreso,
    veranosHabilitados,
    toggleVeranoHabilitado,
  } = useMallaStore();

  const cicloActual = useCicloActual();

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
          // Buscar si algún verano se cursa inmediatamente tras este ciclo n
          const veranosTrasEsteCiclo = veranosActivos.filter((v) => getTrasCiclo(v) === n);
          veranosTrasEsteCiclo.forEach((v) => veranosRenderizados.add(v));

          // REGLA CLAVE: No mostrar veranos en ciclos concluidos del pasado; solo desde los ciclos que falten planificar
          const veranosVisibles = veranosTrasEsteCiclo.filter(() => n >= cicloActual);

          return (
            <div key={`seccion-ciclo-${n}`} className="ciclo-bloque-grupo">
              <CicloRow cicloNum={n} tipo="regular" />

              {veranosVisibles.map((v) => {
                const habilitado = veranosHabilitados?.[v] !== false;

                if (!habilitado) {
                  return (
                    <div key={`verano-disabled-${v}`} className="verano-disabled-strip">
                      <div className="verano-disabled-info">
                        <Sun size={15} className="verano-disabled-icon" />
                        <div className="verano-disabled-text">
                          <span className="verano-disabled-label">Periodo de Verano (Enero)</span>
                          <span className="verano-disabled-sub">Omitido tras Ciclo {n} · Clic para planificar cursos</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-verano-toggle-strip"
                        onClick={() => toggleVeranoHabilitado(v)}
                        title={`Habilitar periodo de verano en Enero tras el Ciclo ${n}`}
                        aria-label={`Habilitar periodo de verano en Enero tras el Ciclo ${n}`}
                      >
                        <Plus size={13} className="inline-icon" /> Habilitar Verano
                      </button>
                    </div>
                  );
                }

                return (
                  <CicloRow
                    key={`verano-${v}`}
                    cicloNum={v}
                    tipo="verano"
                    trasCiclo={n}
                    onToggleHabilitado={() => toggleVeranoHabilitado(v)}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Si algún verano futuro quedó configurado más allá de cicloFin, mostrarlo al final si es posterior al ciclo actual */}
        {veranosActivos
          .filter((v) => !veranosRenderizados.has(v) && getTrasCiclo(v) >= cicloActual)
          .map((v) => {
            const trasCiclo = getTrasCiclo(v);
            const habilitado = veranosHabilitados?.[v] !== false;

            if (!habilitado) {
              return (
                <div key={`verano-disabled-${v}`} className="verano-disabled-strip">
                  <div className="verano-disabled-info">
                    <Sun size={15} className="verano-disabled-icon" />
                    <div className="verano-disabled-text">
                      <span className="verano-disabled-label">Periodo de Verano (Enero)</span>
                      <span className="verano-disabled-sub">Omitido tras Ciclo {trasCiclo}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-verano-toggle-strip"
                    onClick={() => toggleVeranoHabilitado(v)}
                    title={`Habilitar periodo de verano en Enero tras el Ciclo ${trasCiclo}`}
                  >
                    <Plus size={13} className="inline-icon" /> Habilitar Verano
                  </button>
                </div>
              );
            }

            return (
              <CicloRow
                key={`verano-extra-${v}`}
                cicloNum={v}
                tipo="verano"
                trasCiclo={trasCiclo}
                onToggleHabilitado={() => toggleVeranoHabilitado(v)}
              />
            );
          })}
      </div>
    </section>
  );
}

