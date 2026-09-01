import React from 'react';
import { useAcademicStore } from '../store/useAcademicStore';
import { DisciplineSelector } from './DisciplineSelector';
import { calcularPresupuesto } from '../utils/budgetEngine';
import { X, BookOpen, Calculator } from 'lucide-react';

export const PlanificadorPanel: React.FC = () => {
  const { 
    cursos, 
    cursosSeleccionadosParaMatricula, 
    toggleSeleccionMatricula, 
    tarifario, 
    disciplinaActiva,
    panelPlanificadorAbierto,
    setPanelPlanificadorAbierto
  } = useAcademicStore();

  const cursosEnPlanificador = cursos.filter((c) =>
    cursosSeleccionadosParaMatricula.includes(c.codigo)
  );

  const resumen = tarifario
    ? calcularPresupuesto(cursosEnPlanificador, tarifario, disciplinaActiva)
    : null;

  return (
    <>
      {/* Fondo oscuro al abrir en móviles o pantallas medianas */}
      {panelPlanificadorAbierto && (
        <div 
          onClick={() => setPanelPlanificadorAbierto(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Menú Plegable Deslizante */}
      <aside
        className={`fixed top-0 right-0 h-full w-88 max-w-[90vw] bg-slate-900 border-l border-slate-800 p-5 flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out
          ${panelPlanificadorAbierto ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <span>Planificador de Matrícula</span>
          </div>
          <button
            onClick={() => setPanelPlanificadorAbierto(false)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Especialidad */}
        <div className="py-4 border-b border-slate-800">
          <DisciplineSelector />
        </div>

        {/* Lista de Cursos Seleccionados */}
        <div className="flex items-center justify-between py-3">
          <h4 className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Materias Seleccionadas ({cursosEnPlanificador.length})
          </h4>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {cursosEnPlanificador.length === 0 ? (
            <p className="text-xs text-slate-500 text-center mt-8">
              Haz clic en los cursos disponibles para simular tu presupuesto.
            </p>
          ) : (
            cursosEnPlanificador.map((curso) => (
              <div
                key={curso.codigo}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200 line-clamp-1">{curso.nombre}</p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    {curso.codigo} • {curso.creditos} cr • {curso.horasSemanales} hrs
                  </p>
                </div>
                <button
                  onClick={() => toggleSeleccionMatricula(curso.codigo)}
                  className="p-1 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded transition-colors"
                  title="Quitar materia"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Resumen Financiero */}
        {resumen && tarifario && (
          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Total Carga:</span>
              <span className="text-slate-200 font-mono font-semibold">
                {resumen.totalCreditos} cr / {resumen.totalHorasSemanales} hrs
              </span>
            </div>
            
            <div className="flex justify-between text-slate-400">
              <span>Matrícula regular:</span>
              <span className="text-slate-200 font-mono">{tarifario.moneda} {resumen.costoMatricula.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Cuota mensual ({tarifario.cuotasPorCiclo} cuotas):</span>
              <span className="text-indigo-400 font-bold font-mono text-sm">
                {tarifario.moneda} {resumen.montoPorCuota.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-slate-200">
              <span>Total Ciclo:</span>
              <span className="text-emerald-400 font-mono text-sm">
                {tarifario.moneda} {resumen.costoTotalCiclo.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};