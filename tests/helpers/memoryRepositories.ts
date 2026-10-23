import type { AcademicRepositories } from '../../src/application/ports/AcademicRepositories';
import type { Curso } from '../../src/types/academic';
import type { Tarifario } from '../../src/types/financial';
import type { UserAcademicProfile } from '../../src/types/profile';

/** Repositorios en memoria para probar el store sin IndexedDB. */
export const crearRepositoriosEnMemoria = () => {
  const cursos = new Map<string, Curso>();
  let perfil: Partial<UserAcademicProfile> = {};
  let tarifario: Tarifario | undefined;
  const repos: AcademicRepositories = {
    courses: {
      getAll: async () => [...cursos.values()],
      replaceAll: async (lista) => { cursos.clear(); lista.forEach((curso) => cursos.set(curso.codigo, { ...curso })); },
      saveMany: async (lista) => { lista.forEach((curso) => cursos.set(curso.codigo, { ...curso })); },
      update: async (codigo, cambios) => {
        const actual = cursos.get(codigo);
        if (!actual) throw new Error(`No existe ${codigo}`);
        cursos.set(codigo, { ...actual, ...cambios });
      },
    },
    profile: {
      get: async () => perfil as UserAcademicProfile,
      save: async (cambios) => { perfil = { ...perfil, ...cambios }; return perfil as UserAcademicProfile; },
    },
    financial: {
      get: async () => tarifario,
      save: async (valor) => { tarifario = valor; },
      replace: async (valor) => { tarifario = valor; },
    },
    transaction: (accion) => accion(),
  };
  return { repos, cursosPersistidos: cursos };
};
