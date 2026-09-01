import { create } from 'zustand';
import type { Curso, Tarifario, EstadoCurso } from '../types/academic';
import { db } from '../services/db';

interface AcademicStore {
  cursos: Curso[];
  tarifario: Tarifario | null;
  disciplinaActiva: string;
  cursosSeleccionadosParaMatricula: string[];
  panelPlanificadorAbierto: boolean;
  setCursos: (cursos: Curso[]) => Promise<void>;
  updateEstadoCurso: (codigo: string, estado: EstadoCurso) => Promise<void>;
  moverCursoACiclo: (codigo: string, nuevoCiclo: number) => Promise<void>;
  toggleSeleccionMatricula: (codigo: string) => void;
  setTarifario: (tarifario: Tarifario) => Promise<void>;
  setDisciplinaActiva: (disciplina: string) => Promise<void>;
  setPanelPlanificadorAbierto: (abierto: boolean) => void;
  cargarDesdeDB: () => Promise<void>;
}

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  cursos: [],
  tarifario: null,
  disciplinaActiva: 'Ingeniería y Tecnología',
  cursosSeleccionadosParaMatricula: [],
  panelPlanificadorAbierto: false,

  setCursos: async (cursos) => {
    set({ cursos });
    await db.courses.clear();
    await db.courses.bulkPut(cursos);
  },

  updateEstadoCurso: async (codigo, nuevoEstado) => {
    const cursosActualizados = get().cursos.map((c) =>
      c.codigo === codigo ? { ...c, estado: nuevoEstado } : c
    );
    set({ cursos: cursosActualizados });
    await db.courses.update(codigo, { estado: nuevoEstado });
  },

  moverCursoACiclo: async (codigo, nuevoCiclo) => {
    const cursosActualizados = get().cursos.map((c) =>
      c.codigo === codigo ? { ...c, ciclo: nuevoCiclo } : c
    );
    set({ cursos: cursosActualizados });
    await db.courses.update(codigo, { ciclo: nuevoCiclo });
  },

  toggleSeleccionMatricula: (codigo) => {
    const actual = get().cursosSeleccionadosParaMatricula;
    const existe = actual.includes(codigo);
    set({
      cursosSeleccionadosParaMatricula: existe
        ? actual.filter((c) => c !== codigo)
        : [...actual, codigo]
    });
  },

  setTarifario: async (tarifario) => {
    set({ tarifario });
    await db.customCosts.put(tarifario);
  },

  setDisciplinaActiva: async (disciplinaActiva) => {
    set({ disciplinaActiva });
    await db.profile.put({
      id: 'current_profile',
      universidadId: get().tarifario?.universidadId || 'pe-utp',
      carrera: 'Ingeniería de Sistemas e Informática',
      disciplinaActiva,
      fechaActualizacion: new Date().toISOString()
    });
  },

  setPanelPlanificadorAbierto: (panelPlanificadorAbierto) => set({ panelPlanificadorAbierto }),

  cargarDesdeDB: async () => {
    const cursosDB = await db.courses.toArray();
    const tarifariosDB = await db.customCosts.toArray();
    const profileDB = await db.profile.get('current_profile');

    if (cursosDB.length > 0) set({ cursos: cursosDB });
    if (tarifariosDB.length > 0) set({ tarifario: tarifariosDB[0] });
    if (profileDB) set({ disciplinaActiva: profileDB.disciplinaActiva });
  }
}));