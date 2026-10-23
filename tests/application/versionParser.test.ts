import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseUTPExcel } from '../../src/adapters/utpExcelAdapter';
import { VERSION_PARSER } from '../../src/config/parserVersion';
import { createAcademicStore } from '../../src/store/createAcademicStore';
import { crearRepositoriosEnMemoria } from '../helpers/memoryRepositories';

const leerCursos = () => parseUTPExcel(new File(
  [readFileSync(fileURLToPath(new URL('../fixtures/Plan_de_Estudio_1.xlsx', import.meta.url)))], 'Plan_de_Estudio_1.xlsx'));

describe('Versión del parser en el perfil', () => {
  it('al importar el Excel se guarda la versión actual y no hay aviso al recargar', async () => {
    const { repos } = crearRepositoriosEnMemoria();
    const store = createAcademicStore(repos);
    await store.getState().setCursos(await leerCursos(), 'Plan_de_Estudio_1.xlsx');
    expect((await repos.profile.get())?.versionParser).toBe(VERSION_PARSER);

    const recargado = createAcademicStore(repos);
    await recargado.getState().cargarDesdeDB();
    expect(recargado.getState().notificacionMovimiento).toBeNull();
  });

  it('datos de un parser anterior muestran el aviso una sola vez', async () => {
    const { repos } = crearRepositoriosEnMemoria();
    await repos.courses.replaceAll(await leerCursos());
    await repos.profile.save({ nombreArchivoCargado: 'Plan_de_Estudio_1.xlsx' });

    const primero = createAcademicStore(repos);
    await primero.getState().cargarDesdeDB();
    expect(primero.getState().notificacionMovimiento).toMatchObject({
      tipo: 'DATOS_DESACTUALIZADOS', cursoNombre: 'Plan_de_Estudio_1.xlsx',
    });
    expect(primero.getState().notificacionMovimiento?.mensaje).toContain('Vuelve a subir tu Excel');
    expect((await repos.profile.get())?.avisoVersionParser).toBe(VERSION_PARSER);

    const segundo = createAcademicStore(repos);
    await segundo.getState().cargarDesdeDB();
    expect(segundo.getState().notificacionMovimiento).toBeNull();
  });

  it('sin malla guardada no hay aviso', async () => {
    const store = createAcademicStore(crearRepositoriosEnMemoria().repos);
    await store.getState().cargarDesdeDB();
    expect(store.getState().notificacionMovimiento).toBeNull();
  });
});
