import React, { useEffect, useState } from 'react';
import { useAcademicStore } from './store/useAcademicStore';
import { CicloRow } from './components/CicloRow';
import { BancoPendientes } from './components/BancoPendientes';
import { PlanificadorPanel } from './components/PlanificadorPanel';
import { FileUpload } from './components/FileUpLoad';
import defaultCostos from './data/universidades/pe-utp/costos.json';
import type { Tarifario } from './types/academic';
import { Upload, GraduationCap, Calculator } from 'lucide-react';

export const App: React.FC = () => {
  const { 
    cursos, 
    tarifario, 
    setTarifario, 
    cargarDesdeDB,
    cursosSeleccionadosParaMatricula,
    setPanelPlanificadorAbierto 
  } = useAcademicStore();

  const [mostrarModalCarga, setMostrarModalCarga] = useState<boolean>(false);
  const ciclos = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => {
    const inicializar = async () => {
      await cargarDesdeDB();
      if (!tarifario) {
        await setTarifario(defaultCostos as unknown as Tarifario);
      }
    };
    inicializar();
  }, []);

  const cursosPendientes = cursos.filter((c) => c.estado === 'PENDIENTE');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra de Navegación Superior */}
      <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/60 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 border border-indigo-800/80 rounded-xl text-indigo-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">Organizador Curricular UTP</h1>
            <p className="text-[11px] text-slate-400">{cursos.length} cursos en plan de estudios</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMostrarModalCarga(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Actualizar Excel</span>
          </button>

          {/* Botón para abrir el panel plegable */}
          <button
            onClick={() => setPanelPlanificadorAbierto(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>Planificador ({cursosSeleccionadosParaMatricula.length})</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {cursos.length === 0 ? (
          <div className="max-w-xl mx-auto py-16 text-center">
            <h2 className="text-2xl font-bold mb-2">Comienza cargando tu malla curricular</h2>
            <p className="text-xs text-slate-400 mb-8">
              Sube tu archivo .xlsx del portal estudiantil para ordenar tus ciclos y calcular tu presupuesto.
            </p>
            <FileUpload />
          </div>
        ) : (
          <>
            {/* Banco de Cursos Pendientes */}
            <BancoPendientes cursosPendientes={cursosPendientes} />

            {/* Listado Vertical de Ciclos (1 al 10) */}
            <div className="space-y-4">
              {ciclos.map((numCiclo) => {
                const cursosCiclo = cursos.filter((c) => c.ciclo === numCiclo);
                return (
                  <CicloRow
                    key={numCiclo}
                    numCiclo={numCiclo}
                    cursos={cursosCiclo}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Panel Plegable */}
      <PlanificadorPanel />

      {/* Modal de Reemplazo de Excel */}
      {mostrarModalCarga && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Actualizar Plan de Estudios</h3>
            <p className="text-xs text-slate-400 mb-6">
              Sube un nuevo archivo .xlsx para actualizar tu avance académico.
            </p>
            <FileUpload onSuccess={() => setMostrarModalCarga(false)} />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setMostrarModalCarga(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;