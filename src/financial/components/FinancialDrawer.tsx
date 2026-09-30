// src/financial/components/FinancialDrawer.tsx
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  Info,
  Sparkles,
  TrendingUp,
  X,
  Send,
  Loader2,
  Bot,
} from "lucide-react";

// Importaciones del nuevo módulo IA
import { AIManager } from "@/services/ai-service";
import { MockAIProvider } from "@/infrastructure/providers/MockAIProvider";
import { buildAIContext } from "@/services/ai-context-builder";
import type { AIResponseV1 } from "@/domain/ai/ai-contracts";

import type { ResultadoPlanificacionAutomatica } from "@/domain/services/automaticPlanningService";
import { calcularRutaCritica } from "@/domain/services/recommendationService";
import { useAcademicStore } from "@/store/useAcademicStore";
import { usePlannerStore } from "@/store/plannerStore";
import { DisciplineSelector } from "@/components/controls/DisciplineSelector";
import { FinancialPlanningService } from "../services/FinancialPlanningService";
import { PeriodFinancialCard } from "./PeriodFinancialCard";
import { FinancialTotalCard } from "./FinancialTotalCard";

// 1. Inicialización del Servicio de IA (Singleton fuera del render)
const aiManager = new AIManager(new MockAIProvider());

export const FinancialDrawer = () => {
  const {
    cursos,
    tarifario,
    disciplinaActiva,
    panelPlanificadorAbierto,
    setPanelPlanificadorAbierto,
    generarPlanificacionOptima,
  } = useAcademicStore();

  const pestanaEstrategia = usePlannerStore((s) => s.pestanaEstrategia);
  const setPestanaEstrategia = usePlannerStore((s) => s.setPestanaEstrategia);

  const [metodoPago, setMetodoPago] = useState("sin_descuento");
  const [confirmarAutomatico, setConfirmarAutomatico] = useState(false);
  const [resultadoAutomatico, setResultadoAutomatico] =
    useState<ResultadoPlanificacionAutomatica | null>(null);
  const [generandoAutomatico, setGenerandoAutomatico] = useState(false);
  const [pagoUnicoPorPeriodo, setPagoUnicoPorPeriodo] = useState<
    Record<string, boolean>
  >({});

  // 2. Nuevos Estados Locales para el módulo IA
  const [iaConsentimiento, setIaConsentimiento] = useState(false);
  const [iaMensaje, setIaMensaje] = useState("");
  const [iaCargando, setIaCargando] = useState(false);
  const [iaHistorial, setIaHistorial] = useState<
    Array<{ role: "ai" | "user"; text: string; responseData?: AIResponseV1 }>
  >([]);

  const metodoPagoActivo = tarifario?.metodosPago?.[metodoPago];

  // Top cursos críticos (mayor cantidad de cursos posteriores que desbloquean)
  const cursosCriticos = useMemo(() => {
    return calcularRutaCritica(cursos).slice(0, 6);
  }, [cursos]);

  // Créditos pendientes totales por cursar
  const creditosPendientes = useMemo(() => {
    return cursos
      .filter((c) => c.estado === "PENDIENTE")
      .reduce((acc, c) => acc + (c.creditos || 0), 0);
  }, [cursos]);

  const descripcionTarifario = useMemo(() => {
    if (!tarifario) return null;
    return [tarifario.sede, tarifario.modalidadEstudio, tarifario.vigencia]
      .filter(Boolean)
      .join(" · ");
  }, [tarifario]);

  const resumen = useMemo(() => {
    if (!tarifario) return null;

    return FinancialPlanningService.calcular(
      cursos,
      tarifario,
      disciplinaActiva,
      {
        metodoPago,
        pagoUnicoPorPeriodo,
      },
    );
  }, [cursos, tarifario, disciplinaActiva, metodoPago, pagoUnicoPorPeriodo]);

  const alternarPagoUnico = (periodoId: string) => {
    setPagoUnicoPorPeriodo((actual) => ({
      ...actual,
      [periodoId]: !actual[periodoId],
    }));
  };

  const handleGenerarPlan = async () => {
    setGenerandoAutomatico(true);
    try {
      const res = await generarPlanificacionOptima();
      setResultadoAutomatico(res);
    } finally {
      setGenerandoAutomatico(false);
    }
  };

  const handleAplicarPlanAMalla = () => {
    if (!resultadoAutomatico) return;
    usePlannerStore.getState().aplicarPlanAcademico(resultadoAutomatico.cursos);
    setConfirmarAutomatico(false);
  };

  // 3. Lógica de Envío a la IA (Aislamiento de Zustand y generación de instantánea)
  const handleEnviarMensajeIA = async () => {
    if (!iaMensaje.trim() || iaCargando) return;

    const preguntaUsuario = iaMensaje.trim();
    setIaMensaje("");
    setIaHistorial((prev) => [
      ...prev,
      { role: "user", text: preguntaUsuario },
    ]);
    setIaCargando(true);

    try {
      const estadoActual = useAcademicStore.getState();

      const snapshot = buildAIContext(
        {
          settings: {
            periodoIngreso: "marzo",
            cicloActual: 1,
            totalCiclos: 10,
            veranosPermitidosTras: [],
            periodosBloqueados: [],
          },
          cursos: estadoActual.cursos.map((c) => ({
            id: c.codigo,
            codigo: c.codigo,
            nombre: c.nombre,
            estado: c.estado as
              | "APROBADO"
              | "CONVALIDADO"
              | "EN_CURSO"
              | "PENDIENTE",
            cicloDeMalla: 1,
            cicloProgramado: 1,
            esVerano: false,
            enBanco: c.estado === "PENDIENTE",
            creditos: c.creditos || 0,
            horasSemanales: 4,
            prerrequisitos: c.prerrequisitos || [],
          })),
        },
        Date.now().toString(),
        new Date(),
      );

      const respuestaValidada = await aiManager.processRequest({
        version: 1,
        requestId: Date.now().toString(),
        intent: "interpret_preferences",
        question: preguntaUsuario,
        context: snapshot,
      });

      setIaHistorial((prev) => [
        ...prev,
        {
          role: "ai",
          text: respuestaValidada.answer,
          responseData: respuestaValidada,
        },
      ]);
    } catch (error) {
      console.error("Error en IA:", error);
      setIaHistorial((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Ocurrió un error al consultar al asesor. Por favor, intenta nuevamente.",
        },
      ]);
    } finally {
      setIaCargando(false);
    }
  };

  if (!panelPlanificadorAbierto) return null;

  return (
    <>
      <button
        type="button"
        className="drawer-backdrop"
        onClick={() => setPanelPlanificadorAbierto(false)}
        aria-label="Cerrar panel de estrategia"
      />

      <aside
        className="budget-drawer strategy-drawer open"
        aria-label="Estrategia de Matrícula"
      >
        <div className="budget-drawer-head">
          <div className="strategy-head-info">
            <span className="budget-kicker">Estrategia de Matrícula UTP</span>
            <div
              className="strategy-drawer-tabs"
              role="tablist"
              aria-label="Secciones de estrategia"
            >
              <button
                type="button"
                role="tab"
                id="tab-academico"
                aria-selected={pestanaEstrategia === "academico"}
                aria-controls="panel-tab-academico"
                className={`strategy-tab-btn ${pestanaEstrategia === "academico" ? "active" : ""}`}
                onClick={() => setPestanaEstrategia("academico")}
              >
                <Sparkles size={14} className="tab-icon-sparkle" /> Asesor
                Curricular (IA)
              </button>
              <button
                type="button"
                role="tab"
                id="tab-financiero"
                aria-selected={pestanaEstrategia === "financiero"}
                aria-controls="panel-tab-financiero"
                className={`strategy-tab-btn ${pestanaEstrategia === "financiero" ? "active" : ""}`}
                onClick={() => setPestanaEstrategia("financiero")}
              >
                <CreditCard size={14} /> Simulación de Cuotas
              </button>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={() => setPanelPlanificadorAbierto(false)}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── PESTAÑA 1: ASESOR CURRICULAR (IA) ── */}
        {pestanaEstrategia === "academico" && (
          <div
            id="panel-tab-academico"
            role="tabpanel"
            aria-labelledby="tab-academico"
            className="strategy-tab-content"
          >
            {/* Tarjeta de Asistente IA (Roadmap hacia IA) */}
            <div className="advisor-ai-card">
              <div className="advisor-ai-header">
                <span className="advisor-ai-chip">
                  <Sparkles size={11} /> Motor Algorítmico & IA
                </span>
                <span className="advisor-status-badge">UTP 2026</span>
              </div>
              <h3 className="advisor-ai-title">
                Asistente Curricular Inteligente
              </h3>
              <p className="advisor-ai-desc">
                Analiza las cadenas de prerrequisitos de tu plan de estudios,
                detecta cursos cuello de botella y calcula una distribución
                equilibrada respetando los límites de horas y créditos.
              </p>
            </div>

            {/* 4. Bloque Condicional del Chat y Consentimiento de IA */}
            {!iaConsentimiento ? (
              <div
                className="strategy-block mt-4"
                style={{
                  borderLeft: "3px solid #3b82f6",
                  padding: "16px",
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <Bot color="#3b82f6" size={24} />
                  <div>
                    <h4
                      style={{
                        color: "#fff",
                        fontSize: "14px",
                        marginBottom: "6px",
                      }}
                    >
                      Activar Asistente de IA
                    </h4>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        marginBottom: "12px",
                        lineHeight: "1.4",
                      }}
                    >
                      El asesor analizará tu progreso actual para sugerir
                      límites de créditos o rutas óptimas. Los datos académicos
                      se enviarán temporalmente al proveedor configurado para
                      generar respuestas.
                    </p>
                    <button
                      onClick={() => setIaConsentimiento(true)}
                      className="strategy-apply-btn"
                      style={{
                        width: "auto",
                        padding: "6px 12px",
                        fontSize: "12px",
                      }}
                    >
                      Acepto y deseo continuar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="strategy-block mt-4"
                style={{
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  height: "380px",
                  overflow: "hidden",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                }}
              >
                {/* Historial de Chat */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {iaHistorial.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#64748b",
                        fontSize: "12px",
                        marginTop: "20px",
                      }}
                    >
                      <Bot
                        size={32}
                        style={{ margin: "0 auto 8px", opacity: 0.5 }}
                      />
                      Escribe "hola" para probar el simulador.
                    </div>
                  ) : (
                    iaHistorial.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems:
                            msg.role === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            fontWeight: "bold",
                            marginBottom: "4px",
                            color: msg.role === "user" ? "#3b82f6" : "#a855f7",
                          }}
                        >
                          {msg.role === "user" ? "Tú" : "Asesor IA"}
                        </span>
                        <div
                          style={{
                            fontSize: "13px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            maxWidth: "90%",
                            backgroundColor:
                              msg.role === "user"
                                ? "#3b82f6"
                                : "rgba(255, 255, 255, 0.05)",
                            color: "#fff",
                            border:
                              msg.role === "user"
                                ? "none"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {iaCargando && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#a855f7",
                        fontSize: "12px",
                      }}
                    >
                      <Loader2 className="animate-spin" size={14} /> Analizando
                      tu malla...
                    </div>
                  )}
                </div>

                {/* Input de Chat */}
                <div
                  style={{
                    padding: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    gap: "8px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  <input
                    type="text"
                    value={iaMensaje}
                    onChange={(e) => setIaMensaje(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleEnviarMensajeIA()
                    }
                    placeholder="Ej: Quiero pocos créditos..."
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      outline: "none",
                    }}
                    disabled={iaCargando}
                  />
                  <button
                    onClick={handleEnviarMensajeIA}
                    disabled={!iaMensaje.trim() || iaCargando}
                    style={{
                      backgroundColor: "#9333ea",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor:
                        !iaMensaje.trim() || iaCargando
                          ? "not-allowed"
                          : "pointer",
                      opacity: !iaMensaje.trim() || iaCargando ? 0.5 : 1,
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}

            {cursosCriticos.length > 0 && (
              <div className="strategy-block">
                <div className="strategy-block-title">
                  <AlertCircle size={13} className="text-amber" />
                  <span>Cursos Críticos (Mayor Desbloqueo)</span>
                </div>
                <p className="strategy-block-desc">
                  Materias pendientes con mayor cantidad de cursos dependientes
                  aguas abajo:
                </p>
                <div className="critical-courses-grid">
                  {cursosCriticos.map((c) => (
                    <div key={c.codigo} className="critical-course-pill">
                      <span className="critical-course-code">{c.codigo}</span>
                      <span className="critical-course-name" title={c.nombre}>
                        {c.nombre}
                      </span>
                      <span
                        className="critical-course-unlock"
                        title={`Desbloquea ${c.desbloquea} materias en la malla`}
                      >
                        🔓 {c.desbloquea}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generador de Ruta Curricular */}
            <div className="strategy-block">
              <div className="strategy-action-header">
                <div className="strategy-block-title">
                  <TrendingUp size={13} className="text-blue" />
                  <span>Optimización Curricular</span>
                </div>
                <button
                  type="button"
                  className="planning-generate-btn"
                  disabled={generandoAutomatico}
                  onClick={handleGenerarPlan}
                >
                  <Sparkles size={14} />
                  <span>
                    {generandoAutomatico
                      ? "Calculando ruta..."
                      : "Generar Propuesta Óptima"}
                  </span>
                </button>
              </div>

              {resultadoAutomatico && (
                <div className="strategy-result-box">
                  <div className="strategy-result-meta-row">
                    <span className="strategy-meta-chip">
                      <CheckCircle2 size={13} className="text-emerald" />
                      <b>{resultadoAutomatico.totalPlanificados}</b> cursos
                      organizados
                    </span>
                    <span className="strategy-meta-chip">
                      <b>{resultadoAutomatico.ciclos.length}</b> ciclos
                      regulares
                    </span>
                  </div>

                  <div className="strategy-explanation-list">
                    {resultadoAutomatico.explicacion.map((exp, idx) => (
                      <div key={idx} className="strategy-explanation-item">
                        <Info size={13} className="explanation-icon" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>

                  {resultadoAutomatico.noPlanificados.length > 0 && (
                    <div className="strategy-unplaced-alert">
                      <AlertTriangle size={14} className="text-amber" />
                      <div>
                        <strong>Cursos no ubicados en ciclos regulares:</strong>
                        {resultadoAutomatico.noPlanificados.map((np) => (
                          <div key={np.codigo} className="unplaced-item">
                            • <em>{np.nombre}</em>: {np.motivos.join(" ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="strategy-apply-btn"
                    onClick={() => setConfirmarAutomatico(true)}
                  >
                    <Check size={16} /> Aplicar esta propuesta a mi Malla
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PESTAÑA 2: SIMULACIÓN DE CUOTAS (FINANZAS) ── */}
        {pestanaEstrategia === "financiero" && (
          <div
            id="panel-tab-financiero"
            role="tabpanel"
            aria-labelledby="tab-financiero"
            className="strategy-tab-content"
          >
            <div className="budget-control-block">
              <label htmlFor="disciplina-select">Facultad / tarifario</label>
              <DisciplineSelector />
              {descripcionTarifario && (
                <small className="budget-config-note">
                  {descripcionTarifario}
                </small>
              )}
            </div>

            {tarifario?.metodosPago && (
              <div className="budget-control-block">
                <label htmlFor="metodo-pago-select">
                  <CreditCard size={14} /> Pronto pago
                </label>
                <div className="budget-select-control">
                  <CreditCard size={14} />
                  <select
                    id="metodo-pago-select"
                    value={metodoPago}
                    onChange={(event) => setMetodoPago(event.target.value)}
                  >
                    {Object.entries(tarifario.metodosPago).map(
                      ([clave, metodo]) => (
                        <option key={clave} value={clave}>
                          {metodo.nombre}
                          {metodo.descuentoPorcentaje > 0
                            ? ` (${metodo.descuentoPorcentaje}%)`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                {metodoPagoActivo?.requiereProntoPago && (
                  <small className="budget-config-note">
                    El descuento bancario se mantiene donde está configurado y
                    solo aplica a ciclos regulares pagados antes del
                    vencimiento.
                  </small>
                )}
              </div>
            )}

            <div className="financial-scroll-panel">
              {resumen?.periodos.length ? (
                resumen.periodos.map((periodo) => (
                  <PeriodFinancialCard
                    key={periodo.id}
                    periodo={periodo}
                    pagoUnicoActivo={Boolean(pagoUnicoPorPeriodo[periodo.id])}
                    onTogglePagoUnico={() => alternarPagoUnico(periodo.id)}
                  />
                ))
              ) : (
                <div className="budget-empty">
                  No existen cursos planificados.
                </div>
              )}
            </div>

            {resumen && <FinancialTotalCard total={resumen.totalGeneral} />}
          </div>
        )}

        {/* ── FOOTER PERSISTENTE COMPARTIDO (VINCULACIÓN CURRICULAR + FINANCIERA) ── */}
        <div className="strategy-shared-footer">
          <div className="footer-kpi-item">
            <span className="footer-kpi-label">Ciclos Restantes</span>
            <span className="footer-kpi-value">
              {resumen?.periodos.length ?? 0}
            </span>
          </div>
          <div className="footer-kpi-divider" />
          <div className="footer-kpi-item">
            <span className="footer-kpi-label">Créditos Pendientes</span>
            <span className="footer-kpi-value">{creditosPendientes} crd</span>
          </div>
          <div className="footer-kpi-divider" />
          <div className="footer-kpi-item">
            <span className="footer-kpi-label">Total Inversión Estimada</span>
            <span className="footer-kpi-value highlight">
              {resumen?.totalGeneral !== undefined
                ? `S/ ${resumen.totalGeneral.toLocaleString("es-PE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "S/ 0.00"}
            </span>
          </div>
        </div>
      </aside>

      {/* Modal de confirmación antes de volcar la propuesta a la malla */}
      {confirmarAutomatico && (
        <div className="planning-confirm-backdrop">
          <div className="planning-confirm-modal">
            <AlertTriangle size={28} className="confirm-icon-warning" />
            <h2>Se reorganizará tu planificación</h2>
            <p>
              Al aplicar esta ruta sugerida por el asistente, los cursos
              pendientes de tu malla se reubicarán según la secuencia curricular
              óptima. Puedes descargar un respaldo JSON previamente desde el
              menú de acciones si deseas conservar tu distribución manual.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-btn-primary"
                onClick={handleAplicarPlanAMalla}
              >
                Continuar y Aplicar
              </button>
              <button
                type="button"
                className="confirm-btn-secondary"
                onClick={() => setConfirmarAutomatico(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
