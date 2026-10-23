import type { ReactNode } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeftRight, ArrowRight, CalendarDays, ChevronDown,
  CircleCheck, CircleHelp, Clock3, Download, FileDown, FileSpreadsheet, GraduationCap,
  GripVertical, Info, Layers, ListFilter, LockKeyhole, Moon, MousePointer2,
  Plus, RotateCcw, Settings2, Sparkles, Sun, Upload,
} from 'lucide-react';
import { MAXIMO_CICLOS } from '../domain/rules/cycleRules';
import {
  FACTOR_HORAS_VERANO, LIMITE_CREDITOS_VERANO, LIMITE_HORAS_PERIODO,
  LIMITE_HORAS_PLANIFICACION, MINIMO_CREDITOS_ELECTIVOS,
} from '../domain/rules/planningRules';
import { useAcademicStore } from '../store/useAcademicStore';
import { calcularPresupuesto } from '../financial/engine/budgetCalculator';
import type { Curso } from '../types/academic';

function Aviso({ children }: { children: ReactNode }) {
  return <div className="help-notice"><Info size={19} aria-hidden="true" /><div>{children}</div></div>;
}

function CursoEjemplo({ nombre = 'Curso pendiente' }: { nombre?: string }) {
  return <div className="help-mini-course">
    <GripVertical size={16} aria-hidden="true" /><div><strong>{nombre}</strong><span>Origen C8 <b>4h</b></span></div>
  </div>;
}

function DescargaPaso() {
  return <>
    <ol className="help-download-steps">
      <li><span>Ingresa a tu portal <b>UTP+</b>.</span><span className="help-instruction-icon"><Layers size={23} aria-hidden="true" /></span></li>
      <li><span>Ve a <b>Cursos</b> → <b>Avance de plan de estudio</b>.</span></li>
      <li><span>Selecciona <b>Avance por cursos</b>.</span></li>
      <li><span>Descarga el archivo <b className="help-file-name">Plan_de_Estudio.xlsx</b>.</span><span className="help-instruction-icon"><Download size={23} aria-hidden="true" /></span></li>
      <li><span>Vuelve a MallaU y pulsa <b>Subir Excel</b> para cargarlo.</span><span className="help-upload-preview"><Upload size={18} aria-hidden="true" /> Subir Excel</span></li>
    </ol>
    <p className="help-tip"><FileSpreadsheet size={19} aria-hidden="true" /><span>Si ya cargaste una malla, el botón se llamará <b>Actualizar Excel</b>.</span></p>
  </>;
}

function EspaciosPaso() {
  return <>
    <div className="help-space-grid">
      <section className="help-space-card bank">
        <h4><Layers size={21} aria-hidden="true" /> Banco de pendientes</h4>
        <p>Contiene los cursos pendientes que aún no has ubicado en un periodo. Están agrupados por su ciclo de origen.</p>
        <div className="help-bank-preview"><small>CICLO DE ORIGEN 8</small><CursoEjemplo nombre="Curso por organizar" /><CursoEjemplo nombre="Otra materia pendiente" /></div>
        <p className="help-tip-text">Al asignar un curso, sale del banco. Si lo devuelves, reaparece aquí.</p>
      </section>
      <section className="help-space-card projection">
        <h4><CalendarDays size={21} aria-hidden="true" /> Malla proyectada</h4>
        <p>Muestra tus cursos por ciclo: lo que ya llevaste, lo que está en curso y lo que planeas llevar después.</p>
        <div className="help-projection-preview">
          <div className="history"><span><LockKeyhole size={14} aria-hidden="true" /> Ciclo 6</span><b><CircleCheck size={14} aria-hidden="true" /> Historial</b></div>
          <div className="current"><span><LockKeyhole size={14} aria-hidden="true" /> Ciclo 7</span><b><Clock3 size={14} aria-hidden="true" /> En curso</b></div>
          <div><span>Ciclo 8</span><b>Cursos por planificar</b></div>
        </div>
        <p className="help-tip-text">En este ejemplo estás en el ciclo 7: puedes organizar los ciclos regulares desde el 8 y el siguiente verano habilitado.</p>
      </section>
    </div>
    <h4 className="help-subheading"><Sun size={20} aria-hidden="true" /> ¿Dónde aparecen los veranos?</h4>
    <div className="help-summer-grid">
      <div className="help-summer-card"><strong>Si ingresaste en marzo</strong><p>Después de los ciclos pares: 2, 4, 6…</p><div className="help-route">C1 → C2 → <b>Verano 2</b> → C3</div></div>
      <div className="help-summer-card"><strong>Si ingresaste en agosto</strong><p>Después de los ciclos impares: 1, 3, 5…</p><div className="help-route">C1 → <b>Verano 1</b> → C2 → C3</div></div>
    </div>
    <p className="help-tip"><Settings2 size={19} aria-hidden="true" /><span>Indica tu mes de ingreso y ciclo actual en <b>Configuración</b> para ver los periodos que te corresponden.</span></p>
  </>;
}

function MovimientoPaso() {
  return <>
    <div className="help-drag-demo" aria-label="Ejemplo: arrastra un curso del banco al ciclo 8, después al verano o de vuelta al banco">
      <div className="help-drag-bank"><span className="help-demo-label">BANCO DE PENDIENTES</span><div className="help-picked-course"><CursoEjemplo /><MousePointer2 className="help-drag-pointer" size={27} aria-hidden="true" /></div><small>1. Mantén pulsado el curso</small></div>
      <div className="help-drag-connector"><ArrowLeftRight size={32} aria-hidden="true" /><span>Arrastra<br />y suelta</span></div>
      <div className="help-drag-destinations">
        <div><span><CalendarDays size={18} aria-hidden="true" /> Ciclo 8</span><div className="help-drop-preview">2. Suelta aquí tu curso</div></div>
        <div className="summer"><span><Sun size={18} aria-hidden="true" /> Verano habilitado</span><div className="help-drop-preview">También puedes moverlo aquí</div></div>
      </div>
    </div>
    <div className="help-move-routes">
      <span>Banco <ArrowLeftRight size={17} aria-hidden="true" /> Ciclo</span>
      <span>Ciclo <ArrowLeftRight size={17} aria-hidden="true" /> Otro ciclo</span>
      <span>Ciclo <ArrowLeftRight size={17} aria-hidden="true" /> Verano</span>
    </div>
    <p className="help-body-text">Puedes probar distintas ubicaciones y devolver el curso al <b>Banco de pendientes</b> arrastrándolo hasta ese panel o pulsando la <b>X</b> de su tarjeta. Solo se mueven cursos pendientes hacia periodos futuros habilitados.</p>
    <div className="help-touch-tip"><MousePointer2 size={24} aria-hidden="true" /><div><strong>En una pantalla táctil</strong><p>Toca un curso y pulsa <b>Mover aquí</b> en el periodo de destino. Para devolverlo, usa la <b>X</b> de la tarjeta o <b>Mover seleccionado al banco</b>. Puedes cancelar la selección.</p></div></div>
    <Aviso><b>Respeta el orden de los cursos.</b> Los cursos aprobados y los cursos en curso están bloqueados. Los prerrequisitos existentes deben quedar en un periodo anterior. En verano puedes planificar hasta <b>{LIMITE_CREDITOS_VERANO} créditos</b>; superar {LIMITE_HORAS_PERIODO} h muestra una advertencia, pero permite el movimiento.</Aviso>
  </>;
}

function Marca({ numero }: { numero: number }) {
  return <span className="help-marker" aria-hidden="true">{numero}</span>;
}

function CursosPaso() {
  return <>
    <div className="help-course-reading">
      <div className="help-course-example-wrap">
        <span className="help-demo-label">TARJETA DE EJEMPLO</span>
        <div className="help-course-example">
          <small>100000E01</small><strong>CURSO DE EJEMPLO</strong>
          <div className="help-example-tags">
            <span className="help-badge origin"><Marca numero={1} /> Origen C7</span>
            <span className="help-badge hours"><Marca numero={2} /> 4h</span>
            <span className="help-badge credits"><Marca numero={3} /> 3 cr</span>
            <span className="help-badge mandatory"><Marca numero={4} /> Obligatorio</span>
          </div>
          <div className="help-course-state"><Marca numero={5} /><Clock3 size={16} aria-hidden="true" /> En curso</div>
          <div className="help-example-icons">
            <span><Marca numero={6} /><LockKeyhole size={20} aria-hidden="true" /></span>
            <span><Marca numero={7} /><ArrowRight size={20} aria-hidden="true" /></span>
            <span><Marca numero={8} /><Info size={20} aria-hidden="true" /></span>
          </div>
        </div>
        <p className="help-tip-text">Los símbolos de este ejemplo están ampliados para que puedas reconocerlos en tu malla.</p>
      </div>
      <dl className="help-legend">
        <div><dt><Marca numero={1} /> Origen</dt><dd>Ciclo al que pertenece en la malla original. No cambia al moverlo.</dd></div>
        <div><dt><Marca numero={2} /> Horas</dt><dd>Horas semanales del curso; se suman a la carga del periodo.</dd></div>
        <div><dt><Marca numero={3} /> Créditos</dt><dd>Valor académico del curso. No son las horas ni el precio.</dd></div>
        <div><dt><Marca numero={4} /> Tipo</dt><dd><b>Obligatorio:</b> parte requerida del plan. <b>Electivo:</b> una alternativa para completar tus electivos.</dd></div>
        <div><dt><Marca numero={5} /> Estado</dt><dd><b>Aprobado</b>: se identifica por el color de la tarjeta. <b>Convalidado</b>: se distingue con su etiqueta. <b>En curso</b>: lo estás llevando. <b>Pendiente</b>: falta llevarlo; no tiene etiqueta de estado.</dd></div>
        <div><dt><Marca numero={6} /> Candado</dt><dd>El curso es fijo: ya fue llevado, está en curso o pertenece a un periodo cerrado. No se puede mover.</dd></div>
        <div><dt><Marca numero={7} /> Flecha</dt><dd>Verde si habilita otros cursos; roja si no habilita ninguno. La X de la esquina superior derecha retira un pendiente futuro al banco.</dd></div>
        <div><dt><Marca numero={8} /> Información ⓘ</dt><dd>Pasa el puntero o enfoca el botón para consultar el nombre completo, sus prerrequisitos y qué cursos habilita.</dd></div>
      </dl>
    </div>
    <div className="help-state-key"><span><CircleCheck size={16} aria-hidden="true" /> Aprobado / Convalidado</span><span><Clock3 size={16} aria-hidden="true" /> En curso</span><span className="help-badge elective">Electivo</span><span className="help-badge mandatory">Obligatorio</span></div>
  </>;
}

function CiclosPaso() {
  const tarifario = useAcademicStore((state) => state.tarifario);
  const disciplinaActiva = useAcademicStore((state) => state.disciplinaActiva);
  const disciplina = tarifario?.disciplinas[disciplinaActiva] ? disciplinaActiva : Object.keys(tarifario?.disciplinas ?? {})[0];
  const tarifas = tarifario && disciplina ? tarifario.disciplinas[disciplina] : null;
  const ultimoRango = [...(tarifas?.rangosPension ?? [])].sort((a, b) => b.maxHoras - a.maxHoras)[0];
  const dinero = (valor: number) => `S/ ${valor.toFixed(2)}`;
  const cuotaEjemplo = (horas: number) => {
    const curso: Curso = { codigo: 'ejemplo', nombre: 'Carga de ejemplo', ciclo: 8, cicloOrigen: 8,
      tipoPeriodo: 'REGULAR', ubicacion: 'periodo', horasSemanales: horas, creditos: 20,
      tipo: 'OBLIGATORIO', prerrequisitos: [], estado: 'PENDIENTE' };
    return tarifario && disciplina ? calcularPresupuesto([curso], tarifario, disciplina).cuotaBase : null;
  };
  const cuota22 = cuotaEjemplo(LIMITE_HORAS_PLANIFICACION);
  const cuota24 = cuotaEjemplo(LIMITE_HORAS_PERIODO);
  const cuota25 = cuotaEjemplo(LIMITE_HORAS_PERIODO + 1);
  const muestraTarifaUTP = tarifario?.reglasFinancierasId === 'utp' && tarifario.modalidadPrincipal === 'ESCALA_FIJA' && ultimoRango;
  const supera855 = muestraTarifaUTP && tarifario.sedeId === 'ate' && tarifario.tarifarioVersion === '2026' && cuota25 !== null && cuota25 > 855;

  return <>
    <div className="help-cycle-reading">
      <div className="help-cycle-example"><span>8</span><strong>CICLO 8</strong>
        <div className="help-badge hours"><Marca numero={1} /> {LIMITE_HORAS_PLANIFICACION}h sem.</div>
        <div className="help-badge credits"><Marca numero={2} /> 20 cr</div>
        {cuota22 !== null && <div className="help-badge price"><Marca numero={3} /> {dinero(cuota22)}</div>}
        <small>Ejemplo de ciclo futuro</small>
      </div>
      <dl className="help-legend">
        <div><dt><Marca numero={1} /> Horas semanales</dt><dd>Suma de las horas de los pendientes y cursos en curso del periodo. Los aprobados y convalidados no suman carga.</dd></div>
        <div><dt><Marca numero={2} /> Créditos</dt><dd>Suma de los créditos de esa misma carga. En ciclos regulares no hay un tope de créditos en el planificador.</dd></div>
        <div><dt><Marca numero={3} /> Importe en soles</dt><dd>La <b>cuota base referencial</b> de los pendientes asignados. No es el total del ciclo; no incluye matrícula ni descuentos. Si solo hay cursos en curso o ya llevados, no aparece este importe.</dd></div>
      </dl>
    </div>

    <div className="help-hours-warning"><AlertTriangle size={23} aria-hidden="true" /><div><strong>Recomendación: hasta {LIMITE_HORAS_PERIODO} h por periodo</strong><p>Al superar las {LIMITE_HORAS_PERIODO} h aparece <b>“Más de {LIMITE_HORAS_PERIODO} h”</b>. Es una advertencia: puedes conservar los cursos.
      {supera855 && <> Con el tarifario Ate 2026 mostrado, superar esa carga significa una <b>cuota base mayor a S/ 855</b>.</>}</p><p>La planificación automática usa un máximo de <b>{LIMITE_HORAS_PLANIFICACION} h</b> para mantener una carga y cuota más moderadas.</p></div></div>

    {muestraTarifaUTP && <section className="help-price-explanation">
      <h4 className="help-subheading">¿Cómo se calcula la cuota?</h4>
      <p>Se suman las horas de los pendientes del periodo y se busca su rango en el tarifario de la facultad. En este ejemplo se usa <b>{disciplina}</b>, sede {tarifario.sede}, {tarifario.tarifarioVersion}.</p>
      <div className="help-price-formula"><span>De {ultimoRango.minHoras} a {ultimoRango.maxHoras} h<br /><b>{dinero(ultimoRango.montoCuota)}</b></span><Plus size={20} aria-hidden="true" /><span>Cada hora sobre {ultimoRango.maxHoras} h<br /><b>{dinero(tarifas?.costoHoraAdicional ?? 0)}</b> por cuota</span></div>
      <div className="help-price-examples">
        <div><span>{LIMITE_HORAS_PLANIFICACION} h</span><b>{dinero(cuota22 ?? 0)}</b><small>por cuota</small></div>
        <div><span>{LIMITE_HORAS_PERIODO} h</span><b>{dinero(cuota24 ?? 0)}</b><small>por cuota · ya hay recargo</small></div>
        <div className="warning"><span>{LIMITE_HORAS_PERIODO + 1} h <AlertTriangle size={14} aria-hidden="true" /></span><b>{dinero(cuota25 ?? 0)}</b><small>por cuota · advertencia</small></div>
      </div>
      <p className="help-tip-text">El recargo empieza al pasar de {ultimoRango.maxHoras} h, antes de la advertencia de {LIMITE_HORAS_PERIODO} h. Un ciclo regular tiene {tarifario.cuotasPorCiclo} cuotas. Consulta matrícula, descuentos y total en <b>Estrategia → Simulación de cuotas</b>.</p>
    </section>}

    <div className="help-detail-grid">
      <div><h4><Sun size={18} aria-hidden="true" /> Veranos</h4><p>Son intensivos: las horas efectivas se multiplican por {FACTOR_HORAS_VERANO}. Un curso de 4 h cuenta como {4 * FACTOR_HORAS_VERANO} h efectivas. También se usan las horas multiplicadas para la cuota. El tope es {LIMITE_CREDITOS_VERANO} créditos y el tarifario UTP incluye {tarifario?.cuotasPorVerano ?? 2} cuotas de verano.</p></div>
      <div><h4><Plus size={18} aria-hidden="true" /> Añadir o retirar ciclos</h4><p><b>Añadir ciclo</b> amplía tu plan hasta el {MAXIMO_CICLOS}. Desde el 11, la <b>X</b> retira un ciclo futuro: sus pendientes vuelven al banco y el planificador deja de usarlo. Añadir recupera primero los ciclos retirados.</p></div>
    </div>
    <Aviso>Los ciclos regulares pasados y el actual tienen candado y no reciben cursos nuevos. El verano del ciclo actual puede usarse si te corresponde. Tampoco puedes retirar un ciclo con cursos fijos.</Aviso>
  </>;
}

function Herramienta({ icono, nombre, children }: { icono: ReactNode; nombre: string; children: ReactNode }) {
  return <div className="help-tool"><span className="help-tool-icon" aria-hidden="true">{icono}</span><div><h4>{nombre}</h4><p>{children}</p></div></div>;
}

function HerramientasPaso() {
  return <>
    <div className="help-toolbar-preview" aria-label="Ejemplo de la barra: Subir Excel, Configuración, Guardar como, Facultad y Estrategia">
      <span><Upload size={17} aria-hidden="true" /> Subir Excel</span><span><Settings2 size={17} aria-hidden="true" /> Configuración</span><span><FileDown size={17} aria-hidden="true" /> Guardar como <ChevronDown size={14} aria-hidden="true" /></span><span><GraduationCap size={17} aria-hidden="true" /> Facultad</span><span className="primary"><Sparkles size={17} aria-hidden="true" /> Estrategia</span>
    </div>
    <div className="help-tools-grid">
      <Herramienta icono={<Upload size={22} />} nombre="Subir / Actualizar Excel">Carga el archivo de UTP+. Actualizarlo reinicia la planificación manual: guarda un respaldo antes si quieres conservarla.</Herramienta>
      <Herramienta icono={<CircleCheck size={22} />} nombre="Avance">“Llevados” son aprobados o convalidados; “en curso”, los del ciclo actual; “planificados”, pendientes ya ubicados; “pendientes”, los que siguen en el banco y los jalados aún no replanificados.</Herramienta>
      <Herramienta icono={<Layers size={22} />} nombre="Electivos">Compara tus créditos electivos llevados o ubicados con el mínimo de {MINIMO_CREDITOS_ELECTIVOS} cr. Las otras alternativas pueden quedarse en el banco.</Herramienta>
      <Herramienta icono={<Settings2 size={22} />} nombre="Configuración">Indica marzo o agosto como mes de ingreso y el ciclo que estás cursando. Así se ubican tu avance y los veranos disponibles.</Herramienta>
      <Herramienta icono={<RotateCcw size={22} />} nombre="Limpiar plan">Devuelve los pendientes de periodos futuros al banco. Conserva los cursos aprobados, los cursos en curso y los periodos cerrados.</Herramienta>
      <Herramienta icono={<Upload size={22} />} nombre="Importar">Recupera una planificación guardada con la opción Respaldo. Carga el archivo JSON, no el Excel de UTP+.</Herramienta>
      <Herramienta icono={<FileDown size={22} />} nombre="Guardar como">Abre tres opciones: <b>PDF</b> para imprimir o compartir, <b>PNG</b> como imagen y <b>Respaldo</b> para volver a importar tu avance.</Herramienta>
      <Herramienta icono={<GraduationCap size={22} />} nombre="Facultad">Elige la facultad para calcular las cuotas de los cursos planificados.</Herramienta>
      <Herramienta icono={<Sparkles size={22} />} nombre="Estrategia">Propone pendientes desde el ciclo siguiente, solo en ciclos regulares de hasta {LIMITE_HORAS_PLANIFICACION} h: primero obligatorios y un electivo al final. Revisa el resultado antes de aplicar. En “Simulación de cuotas”, abre la configuración para elegir el método de pago.</Herramienta>
      <Herramienta icono={<ListFilter size={22} />} nombre="Mostrar desde ciclo">Elige el primer ciclo visible. Los anteriores se ocultan de la pantalla; sus cursos y asignaciones se conservan.</Herramienta>
      <Herramienta icono={<Sun size={22} />} nombre="Mostrar veranos">Muestra los veranos desde el ciclo actual cuando corresponden a tu mes de ingreso. Al desmarcarlo se ocultan todos; los cursos asignados se conservan.</Herramienta>
      <Herramienta icono={<CalendarDays size={22} />} nombre="Inicio · Ciclo actual">Recuerda el mes de ingreso y el ciclo que estás llevando. Cámbialos desde Configuración.</Herramienta>
      <Herramienta icono={<Moon size={22} />} nombre="Modo claro / oscuro">Alterna los colores de la página. El botón indica el modo que se activará.</Herramienta>
      <Herramienta icono={<CircleHelp size={22} />} nombre="Ayuda (?)">Abre de nuevo este tutorial cuando lo necesites. Puedes avanzar, retroceder o elegir un paso arriba.</Herramienta>
    </div>
    <p className="help-tip"><ArrowDown size={19} aria-hidden="true" /><span>La barra y los filtros permanecen arriba mientras recorres la malla. En pantallas pequeñas, abre el menú de la cabecera para ver las herramientas.</span></p>
    <Aviso><b>Planificación y costos referenciales.</b> MallaU no está conectado a la matrícula de UTP y no comprueba cupos ni cruces de horario. Revisa esos datos antes de matricularte.</Aviso>
  </>;
}

export function AyudaPaso({ paso }: { paso: number }) {
  switch (paso) {
    case 0: return <DescargaPaso />;
    case 1: return <EspaciosPaso />;
    case 2: return <MovimientoPaso />;
    case 3: return <CursosPaso />;
    case 4: return <CiclosPaso />;
    case 5: return <HerramientasPaso />;
    default: return null;
  }
}
