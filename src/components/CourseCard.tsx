import { formatCredits } from '../utils/formatCredits';
import type { DragEvent } from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createPortal } from 'react-dom';
import type { Curso } from '../types/academic';
import { useAcademicStore } from '../store/useAcademicStore';
import { isCursoDesbloqueado, motivoPlanificadoInvalido } from '../domain/services/prerequisiteService';
import { etiquetaVentana, ubicacionOriginalJalado, ventanaJalado } from '../domain/rules/jaladoRules';
import { esJaladoSinReplanificar } from '../domain/rules/courseRules';
import { obtenerPeriodoCurso } from '../domain/rules/academicPeriodRules';
import { periodoBloqueadoPorCicloActual } from '../domain/rules/academicContextRules';
import { etiquetaPrerrequisito, puedeRetirarCursoRapido } from '../presentation/selectors/plannerCardRules';
import { AlertTriangle, ArrowRight, CircleCheck, Clock3, Info, LockKeyhole, RotateCcw, X } from 'lucide-react';
import { JaladoModal } from './JaladoModal';
import { CourseInfoPopover } from './CourseInfoPopover';

interface Props {
  curso: Curso;
  compacto?: boolean;
}

const CourseCardBase = ({ curso, compacto = false }: Props) => {
  const estaSeleccionado = useAcademicStore((state) =>
    state.cursosSeleccionadosParaMatricula.includes(curso.codigo));
  const desbloqueado = useAcademicStore((state) => isCursoDesbloqueado(curso, state.cursos, state));
  const motivoInvalido = useAcademicStore((state) => motivoPlanificadoInvalido(curso, state.cursos, state));
  const invalido = motivoInvalido !== null;
  const moverCursoAPeriodo = useAcademicStore((state) => state.moverCursoAPeriodo);
  const requisitos = useAcademicStore(useShallow((state) => curso.prerrequisitos.map((codigo) =>
    etiquetaPrerrequisito(codigo, state.cursos))));
  const habilitaA = useAcademicStore(useShallow((state) => state.cursos
    .filter((item) => item.prerrequisitos.includes(curso.codigo))
    .map((item) => item.nombre)));
  const toggleSeleccionMatricula = useAcademicStore((state) => state.toggleSeleccionMatricula);
  const esSeleccionMovil = useAcademicStore((state) => state.cursoAMover === curso.codigo);
  const setCursoAMover = useAcademicStore((state) => state.setCursoAMover);
  const moverCursoABanco = useAcademicStore((state) => state.moverCursoABanco);
  const cicloActual = useAcademicStore((state) => state.cicloActual);
  const ventanaRecuperacion = useAcademicStore((state) => curso.jalado
    ? etiquetaVentana(ventanaJalado(curso, state.cursos, state)) : '');

  const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null);
  const [retirando, setRetirando] = useState(false);
  const [confirmarJalado, setConfirmarJalado] = useState(false);
  // En tarjetas EN_CURSO el (i) abre un menú fijo con la acción "Marcar como jalado".
  const [menuInfo, setMenuInfo] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const infoBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuInfo) return;
    const cerrarFuera = (event: MouseEvent) => {
      const destino = event.target as Node;
      if (!popoverRef.current?.contains(destino) && !infoBtnRef.current?.contains(destino)) setMenuInfo(null);
    };
    const cerrarConEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuInfo(null); };
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [menuInfo]);
  const esAprobado = curso.estado === 'APROBADO' || curso.estado === 'CONVALIDADO';
  // Un jalado en su ciclo original es la excepción: se puede arrastrar a un periodo futuro.
  const esFijoMovimiento = esAprobado || curso.estado === 'EN_CURSO' ||
    Boolean(cicloActual && curso.ubicacion === 'periodo' && !esJaladoSinReplanificar(curso, cicloActual) &&
      periodoBloqueadoPorCicloActual(obtenerPeriodoCurso(curso), cicloActual));
  const permiteRetiroRapido = puedeRetirarCursoRapido(curso, cicloActual);

  const retirarAlBanco = async () => {
    if (retirando) return;
    setRetirando(true);
    try {
      // Un jalado no va al banco: vuelve a su lugar original.
      const original = curso.jalado && cicloActual ? ubicacionOriginalJalado(curso, cicloActual) : 'banco';
      await (original === 'banco' ? moverCursoABanco(curso.codigo) : moverCursoAPeriodo(curso.codigo, original));
    } finally {
      setRetirando(false);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (esFijoMovimiento) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', curso.codigo);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCardClick = () => {
    const esPantallaTactil = window.matchMedia('(pointer: coarse)').matches;
    if (esPantallaTactil) {
      if (esFijoMovimiento) return;
      setCursoAMover(esSeleccionMovil ? null : curso.codigo);
      return;
    }
    toggleSeleccionMatricula(curso.codigo);
  };

  const posicionPopover = (element: HTMLButtonElement) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.bottom + 7, left: Math.max(8, Math.min(rect.left - 130, window.innerWidth - 292)) };
  };
  const mostrarTooltip = (element: HTMLButtonElement) => setTooltip(posicionPopover(element));
  const esEnCurso = curso.estado === 'EN_CURSO';
  const tieneEstado = curso.estado === 'CONVALIDADO' || esEnCurso || Boolean(curso.jalado) || invalido;

  const clases = [
    'curso-card',
    curso.tipo === 'OBLIGATORIO' ? 'obligatorio' : 'electivo',
    esAprobado ? 'curso-bloqueado' : '',
    curso.estado === 'EN_CURSO' ? 'en-curso' : '',
    curso.estado === 'PENDIENTE' && !desbloqueado && !invalido ? 'con-prerrequisitos' : '',
    curso.jalado ? 'curso-jalado' : '',
    invalido ? 'curso-invalido' : '',
    estaSeleccionado ? 'seleccionado-presupuesto' : '',
    esSeleccionMovil ? 'seleccionado-mover' : '',
    curso.tipoPeriodo === 'VERANO' && curso.ubicacion === 'periodo' ? 'curso-verano' : '',
    permiteRetiroRapido ? 'con-retiro-rapido' : '',
    compacto ? 'compacto' : '',
    tieneEstado ? 'con-estado' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        draggable={!esFijoMovimiento}
        onDragStart={handleDragStart}
        onClick={handleCardClick}
        className={clases}
        title={esFijoMovimiento ? 'Curso fijo: no se puede mover' : undefined}
      >
        {permiteRetiroRapido && <button
          type="button"
          className="curso-card-quitar-btn"
          disabled={retirando}
          draggable={false}
          onPointerDown={(event) => event.stopPropagation()}
          onDragStart={(event) => { event.preventDefault(); event.stopPropagation(); }}
          onClick={(event) => { event.stopPropagation(); void retirarAlBanco(); }}
          aria-label={curso.jalado ? `Devolver ${curso.nombre} a su ciclo original` : `Retirar ${curso.nombre} al banco de pendientes`}
          title={curso.jalado ? 'Devolver a su ciclo original' : 'Retirar al banco de pendientes'}
        ><X size={14} aria-hidden="true" /></button>}
        <div className="curso-card-head">
          <span className="curso-codigo">{curso.codigo}</span>
          <div className="curso-card-actions">
            {esFijoMovimiento && <LockKeyhole size={13} className="curso-lock" />}
            <span className={`curso-dependientes ${habilitaA.length > 0 ? 'habilita' : 'sin-dependientes'}`}
              role="img" aria-label={habilitaA.length > 0 ? 'Habilita otros cursos' : 'No habilita otros cursos'}
              title={habilitaA.length > 0 ? `Habilita ${habilitaA.length} curso(s)` : 'No habilita otros cursos de la malla'}>
              <ArrowRight size={15} aria-hidden="true" />
            </span>
            <button
              ref={infoBtnRef}
              type="button"
              className="curso-info-btn"
              aria-haspopup={esEnCurso ? 'menu' : undefined}
              aria-expanded={esEnCurso ? Boolean(menuInfo) : undefined}
              onMouseEnter={(event) => mostrarTooltip(event.currentTarget)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => mostrarTooltip(event.currentTarget)}
              onBlur={() => setTooltip(null)}
              onClick={(event) => {
                event.stopPropagation();
                if (!esEnCurso) return;
                const posicion = posicionPopover(event.currentTarget);
                setTooltip(null);
                setMenuInfo((actual) => actual ? null : posicion);
              }}
              aria-label={`Ver requisitos de ${curso.nombre}`}
              title={`Información de ${curso.nombre}`}
            >
              <Info size={14} />
            </button>
          </div>
        </div>

        <div className="curso-titulo" title={curso.nombre}>{curso.nombre}</div>

        <div className="curso-tags">
          <span className="ctag">Origen C{curso.cicloOrigen}</span>
          {curso.tipoPeriodo === 'VERANO' && curso.ubicacion === 'periodo' && (
            <span className="ctag ctag-verano">Verano {curso.ciclo}</span>
          )}
          <span className="ctag ctag-horas">{curso.horasSemanales}h</span>
          <span className="ctag">{formatCredits(curso.creditos)} cr</span>
          <span className={`ctag ${curso.tipo === 'OBLIGATORIO' ? 'obl' : 'ele'}`}>
            {curso.tipo === 'OBLIGATORIO' ? 'Obligatorio' : 'Electivo'}
          </span>
        </div>

        {/* Etiquetas de estado: línea propia entre los chips y la fila de íconos. */}
        {tieneEstado && <div className="curso-estados">
          {curso.estado === 'CONVALIDADO' && (
            <div className="curso-estado-chip">
              <CircleCheck size={11} /> Convalidado
            </div>
          )}
          {curso.estado === 'EN_CURSO' && (
            <div className="curso-estado-chip en-curso-chip"><Clock3 size={11} /> En curso</div>
          )}
          {curso.jalado && (
            <div className="curso-estado-chip jalado-chip"><RotateCcw size={11} /><span>Jalado
              {ventanaRecuperacion && esJaladoSinReplanificar(curso, cicloActual) && ` · llevar en ${ventanaRecuperacion}`}</span></div>
          )}
          {invalido && (
            motivoInvalido === 'JALADO_PENDIENTE'
              ? <div className="curso-estado-chip invalido-chip" title="Primero debes llevar tus cursos jalados en su ventana de recuperación.">
                <AlertTriangle size={11} /><span>Falta llevar curso jalado</span>
              </div>
              : <div className="curso-estado-chip invalido-chip" title="Sus prerrequisitos no se cumplen en este periodo. Muévelo o replanifica el prerrequisito.">
                <AlertTriangle size={11} /><span>Prerrequisito sin cumplir</span>
              </div>
          )}
        </div>}
      </div>
      {confirmarJalado && <JaladoModal curso={curso} onClose={() => setConfirmarJalado(false)} />}

      {(menuInfo ?? tooltip) && createPortal(
        <CourseInfoPopover ref={popoverRef} curso={curso} requisitos={requisitos} habilitaA={habilitaA}
          posicion={(menuInfo ?? tooltip)!}
          onMarcarJalado={menuInfo && esEnCurso
            ? () => { setMenuInfo(null); setConfirmarJalado(true); } : undefined} />,
        document.body
      )}
    </>
  );
};

export const CourseCard = memo(CourseCardBase);
