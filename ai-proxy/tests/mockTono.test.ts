import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AIContext } from '../src/contracts.js';
import { mockAnalisis, mockChat, usaJerga } from '../src/mockRespuestas.js';

const leer = (nombre: string): AIContext => JSON.parse(readFileSync(new URL(`./fixtures/${nombre}`, import.meta.url), 'utf8'));
const contexto: AIContext = { ...leer('contexto.json'), foco: null };
const contextoJalado = leer('contextoJalado.json');

/** Todos los números del contexto (en valor absoluto): un "S/ x" del texto debe ser uno de ellos. */
const numerosDe = (valor: unknown): number[] => typeof valor === 'number' ? [Math.abs(valor)]
  : Array.isArray(valor) ? valor.flatMap(numerosDe)
    : valor && typeof valor === 'object' ? Object.values(valor).flatMap(numerosDe) : [];
const montosDe = (texto: string) => [...texto.matchAll(/S\/ ([\d,]+\.\d{2})/g)].map((m) => Number(m[1].replace(/,/g, '')));
const codigosDe = (texto: string) => [...texto.matchAll(/\b100000[A-Z0-9]{4}\b/g)].map((m) => m[0]);

const verificarDatos = (ctx: AIContext, texto: string) => {
  const numeros = numerosDe(ctx);
  for (const monto of montosDe(texto)) expect(numeros.some((n) => Math.abs(n - monto) <= 0.01), `S/ ${monto}`).toBe(true);
  const codigos = new Set(ctx.catalogo.map((curso) => curso.codigo));
  for (const codigo of codigosDe(texto)) expect(codigos.has(codigo), codigo).toBe(true);
};

const SIN_DATOS_INVENTADOS = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b|\b\d{1,2}:\d{2}\b|\b(te[oó]rico|pr[aá]ctico|dif[ií]cil)\b|\b(profesor|profesora|ing\.|dr\.|mg\.)\s+[A-ZÁÉÍÓÚ]/i;

describe('mocks - tono del asesor', () => {
  it.each([
    'Buenas tardes, ¿qué electivo me recomienda?',
    'Buenas tardes, ¿me alcanza mi presupuesto?',
    'Disculpe, ¿estoy sobrecargado?',
    '¿Cuál es mi ruta para egresar?',
  ])('formal → sin jerga del glosario: "%s"', (pregunta) => {
    const { texto } = mockChat(contexto, pregunta);
    expect(usaJerga(texto), texto).toBe(false);
    verificarDatos(contexto, texto);
  });

  it.each([
    'estoy full chamba, ¿me cargo mucho?',
    '¿cuál es la yuca?',
    'soy cachimbo, ¿qué llevo?',
  ])('con jerga → la puede usar, pero nunca en la misma frase que un monto: "%s"', (pregunta) => {
    const { texto } = mockChat(contexto, pregunta);
    for (const frase of texto.split(/(?<=[.!?])\s+|\n/)) {
      if (/S\/ /.test(frase)) expect(usaJerga(frase), frase).toBe(false);
    }
    verificarDatos(contexto, texto);
  });

  it('"full chamba" matiza el consejo con menos horas, sin cambiar los números', () => {
    const { texto } = mockChat(contexto, 'estoy full chamba, ¿me cargo mucho?');
    expect(texto).toContain(`${contexto.carga.horas} h`);
    expect(texto).toContain('menos horas');
  });

  it('si el alumno trabaja pero escribe formal, el consejo no usa jerga', () => {
    const { texto } = mockChat(contexto, 'Trabajo por las tardes, ¿mi carga está bien?');
    expect(texto).toContain('Si trabajas');
    expect(usaJerga(texto)).toBe(false);
  });

  it.each([
    ['arma mi horario sin huecos', 'los horarios ni las secciones'],
    ['¿cuál es la tranca del 8vo?', 'datos de la dificultad real de los cursos'],
    ['¿con qué nota aprobé base de datos?', 'tus notas'],
    ['¿qué profe es bueno para inteligencia de negocios?', 'información de los profesores'],
  ])('datos que no existen: "%s" → lo dice y ofrece la carga en horas', (pregunta, falta) => {
    const { texto } = mockChat(contexto, pregunta);
    expect(texto).toContain(`MallaU no tiene ${falta}`);
    expect(texto).not.toMatch(SIN_DATOS_INVENTADOS);
    expect(texto).toContain(`${contexto.carga.horas} h`);
    verificarDatos(contexto, texto);
  });

  it('bika: prioriza, menos carga, tutoría y el riesgo de una tercera vez según la Ley 30220', () => {
    const { texto, cursos } = mockChat(contexto, 'hice bika en inteligencia de negocios');
    expect(texto).toContain('INTELIGENCIA DE NEGOCIOS (100000I62N)');
    expect(texto).toContain('Ley Universitaria 30220 (art. 102)');
    expect(texto).toContain('tercera vez');
    expect(texto).toMatch(/menos carga/);
    expect(texto).toMatch(/tutoría/);
    expect(texto).toContain('en el Verano 8 o en el Ciclo 9');
    expect(cursos).toEqual(['100000I62N']);
    // La regla y el riesgo van sin jerga.
    expect(usaJerga(texto)).toBe(false);
  });

  it('trika: separación temporal según la ley, tutor o Servicios Académicos, sin inventar el reglamento', () => {
    const { texto } = mockChat(contexto, 'hice trika en cálculo, ¿me botan?');
    expect(texto).toContain('separación temporal de un año');
    expect(texto).toContain('retiro definitivo');
    expect(texto).toContain('Servicios Académicos');
    expect(texto).toContain('La UTP puede tener reglas propias');
    expect(texto).not.toMatch(/reglamento de la UTP (dice|establece)/i);
  });

  it('"jalé un curso" sin decir cuántas veces: no asume bika y pregunta', () => {
    const { texto } = mockChat(contexto, 'jalé un curso');
    expect(texto).not.toMatch(/bika|segunda vez|tercera vez/i);
    expect(texto).toContain('es la primera vez que lo jalas?');
  });

  it('identidad: responde que es una IA', () => {
    for (const pregunta of ['¿eres una persona?', '¿eres profe de la UTP?']) {
      expect(mockChat(contexto, pregunta).texto).toMatch(/^Soy una IA/);
    }
  });

  it('bienestar: lo reconoce primero y sugiere tutoría o bienestar universitario', () => {
    for (const pregunta of ['ya no puedo más, quiero dejar la u', 'estoy muy estresado con la chamba y la u']) {
      const { texto } = mockChat(contexto, pregunta);
      expect(texto).toMatch(/^Lo que sientes es válido/);
      expect(texto).toContain('tutoría o en bienestar universitario de la UTP');
    }
  });

  it('fuera de tema: una frase y redirige', () => {
    const { texto } = mockChat(contexto, '¿quién ganará las elecciones?');
    expect(texto).toMatch(/^Solo puedo ayudarte/);
    expect(texto).toContain('?');
  });

  it('cachimbo con contexto de ciclo 7: lo nota con amabilidad', () => {
    const { texto } = mockChat(contexto, 'soy cachimbo, ¿qué llevo?');
    expect(texto).toContain('vas en el Ciclo 7');
  });

  it('jalado: no se puede postergar y se nombra su ventana', () => {
    const { texto, cursos } = mockChat(contextoJalado, '¿puedo dejar herramientas de desarrollo para el ciclo 10?');
    expect(texto).toMatch(/^No: HERRAMIENTAS DE DESARROLLO \(100000S61T\)/);
    expect(texto).toContain('en el Ciclo 8');
    expect(cursos).toEqual(['100000S61T']);
  });

  it('jalado: en "¿qué llevo el próximo ciclo?" el jalado va primero', () => {
    const { texto, cursos } = mockChat(contextoJalado, '¿qué llevo el próximo ciclo?');
    expect(texto).toMatch(/^Primero va HERRAMIENTAS DE DESARROLLO \(100000S61T\)/);
    expect(cursos[0]).toBe('100000S61T');
  });

  it('foco en un ciclo: "¿cuánto me cuesta este ciclo?" usa los escenarios de ese ciclo', () => {
    const conFoco = leer('contexto.json');
    const escenarios = [{ ...contexto.financiero!.proximoPeriodo[0] }];
    const foco = { tipo: 'ciclo' as const, periodo: contexto.periodosPlanificados[0], cursos: [], carga: contexto.carga, escenarios, jaladosEnVentana: [] };
    const { texto } = mockChat({ ...conFoco, foco }, '¿cuánto me cuesta este ciclo?');
    expect(texto).toContain(`El ${foco.periodo.etiqueta} cuesta`);
    verificarDatos(contexto, texto);
  });

  it('el análisis mock solo usa montos y códigos del contexto, con máximo 3 acciones por sección', () => {
    for (const ctx of [contexto, contextoJalado]) {
      const analisis = mockAnalisis(ctx);
      verificarDatos(ctx, JSON.stringify(analisis));
      expect(analisis.secciones.every((seccion) => seccion.acciones.length <= 3)).toBe(true);
      expect(usaJerga(JSON.stringify(analisis))).toBe(false);
    }
  });
});

describe('mocks - snapshot del tono', () => {
  it('respuestas de chat a las preguntas de la evaluación (para revisar el tono a mano)', () => {
    const preguntas = [
      '¿me alcanza con 800 al mes?', '¿cuánto pago si hago pago único?', '¿cuánto es la matrícula?',
      'arma mi horario sin huecos', 'hice bika en inteligencia de negocios', 'hice trika en cálculo, ¿me botan?',
      'jalé un curso', '¿eres una persona?', 'ya no puedo más, quiero dejar la u', 'hazme mi tarea de cálculo',
      'estoy full chamba, ¿me cargo mucho?', 'Buenas tardes, ¿qué electivo me recomienda?',
    ];
    expect(Object.fromEntries(preguntas.map((pregunta) => [pregunta, mockChat(contexto, pregunta).texto]))).toMatchSnapshot();
  });
});
