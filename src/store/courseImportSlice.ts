import type { AcademicRepositories } from '../application/ports/AcademicRepositories';
import { cursoBloqueado, normalizarCurso, ordenarCursos } from '../domain/rules/courseRules';
import { ubicarAvanceEnCicloActual } from '../domain/rules/academicContextRules';
import { CICLOS_INICIALES, determinarTotalCiclos, normalizarCiclosExcluidos, normalizarTotalCiclos } from '../domain/rules/cycleRules';
import { migrateLegacyFinancialRulesReference } from '../financial/rules/financialRulesCompatibility';
import type { AcademicSlice, AcademicStore } from './types';

type CourseImportSlice = Pick<AcademicStore,
  'cursos' | 'nombreArchivoCargado' | 'setCursos' | 'importarRespaldo' | 'cargarDesdeDB'>;

export const createCourseImportSlice = (repos: AcademicRepositories): AcademicSlice<CourseImportSlice> => (set, get) => ({
  cursos: [],
  nombreArchivoCargado: null,

  setCursos: async (cursos, nombreArchivo) => {
    const state = get();
    const base = ordenarCursos(cursos.map((curso) => {
      const normalizado = normalizarCurso(curso);
      return {
        ...normalizado,
        ciclo: normalizado.cicloOrigen,
        tipoPeriodo: 'REGULAR' as const,
        ubicacion: cursoBloqueado(normalizado) ? 'periodo' as const : 'banco' as const,
      };
    }));
    const cursosNormalizados = state.cicloActual
      ? ordenarCursos(ubicarAvanceEnCicloActual(base, state.cicloActual, state.periodoIngreso))
      : base;
    const totalCiclos = normalizarTotalCiclos(Math.max(CICLOS_INICIALES, state.cicloActual ?? 1));

    await repos.transaction(async () => {
      await repos.courses.replaceAll(cursosNormalizados);
      await repos.profile.save({
        ...(state.tarifario ? { universidadId: state.tarifario.universidadId } : {}),
        disciplinaActiva: state.disciplinaActiva,
        nombreArchivoCargado: nombreArchivo,
        totalCiclos,
        ciclosExcluidos: [],
      });
    });
    set({ cursos: cursosNormalizados, totalCiclos, ciclosExcluidos: [],
      cursosSeleccionadosParaMatricula: [], cursoAMover: null,
      notificacionMovimiento: null, nombreArchivoCargado: nombreArchivo ?? null });
  },

  importarRespaldo: async (cursosImportados, tarifarioImportado) => {
    const state = get();
    const cursosNormalizados = ordenarCursos(state.cicloActual
      ? ubicarAvanceEnCicloActual(cursosImportados.map(normalizarCurso), state.cicloActual, state.periodoIngreso)
      : cursosImportados.map(normalizarCurso));
    const tarifario = tarifarioImportado
      ? migrateLegacyFinancialRulesReference(tarifarioImportado)
      : state.tarifario;
    const disciplinas = tarifario ? Object.keys(tarifario.disciplinas) : [];
    const disciplinaActiva = disciplinas.includes(state.disciplinaActiva)
      ? state.disciplinaActiva
      : (disciplinas[0] ?? state.disciplinaActiva);
    const nombreArchivoCargado = state.nombreArchivoCargado ?? 'Respaldo académico';
    const totalCiclos = determinarTotalCiclos(cursosNormalizados, state.totalCiclos);

    await repos.transaction(async () => {
      await repos.courses.replaceAll(cursosNormalizados);
      if (tarifarioImportado && tarifario) await repos.financial.replace(tarifario);
      await repos.profile.save({
        ...(tarifario ? { universidadId: tarifario.universidadId } : {}),
        disciplinaActiva, nombreArchivoCargado, totalCiclos, ciclosExcluidos: [],
      });
    });
    set({ cursos: cursosNormalizados, tarifario, disciplinaActiva, totalCiclos,
      ciclosExcluidos: [], cursoAMover: null, nombreArchivoCargado });
  },

  cargarDesdeDB: async () => {
    const [cursosDB, tarifarioPersistido, profileDB] = await Promise.all([
      repos.courses.getAll(), repos.financial.get(), repos.profile.get(),
    ]);
    const cursos = ordenarCursos(profileDB?.cicloActual
      ? ubicarAvanceEnCicloActual(cursosDB.map(normalizarCurso), profileDB.cicloActual, profileDB.periodoIngreso)
      : cursosDB.map(normalizarCurso));
    const tarifario = tarifarioPersistido
      ? migrateLegacyFinancialRulesReference(tarifarioPersistido) : null;
    const cicloActual = profileDB?.cicloActual ?? null;
    const totalCiclos = normalizarTotalCiclos(Math.max(
      profileDB?.totalCiclos ?? CICLOS_INICIALES, cicloActual ?? 1
    ));
    const ciclosExcluidos = normalizarCiclosExcluidos(profileDB?.ciclosExcluidos).filter((ciclo) =>
      ciclo > (cicloActual ?? 0) && !cursos.some((curso) =>
        curso.ubicacion === 'periodo' && curso.tipoPeriodo === 'REGULAR' && curso.ciclo === ciclo));
    set({ cursos, tarifario,
      disciplinaActiva: profileDB?.disciplinaActiva ?? get().disciplinaActiva,
      nombreArchivoCargado: profileDB?.nombreArchivoCargado ?? null,
      periodoIngreso: profileDB?.periodoIngreso ?? null, cicloActual,
      totalCiclos, ciclosExcluidos, perfilCargado: true });
  },
});
