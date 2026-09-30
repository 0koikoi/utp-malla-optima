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
  const [cursosCriticosExpandido, setCursosCriticosExpandido] = useState(false);

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
        style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}
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
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              paddingBottom: "16px",
            }}
          >
            {/* Banner introductorio — solo visible si el chat está vacío (Modo Enfoque) */}
            {(!iaConsentimiento || iaHistorial.length === 0) && (
              <div className="advisor-ai-card" style={{ flexShrink: 0 }}>
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
            )}

            {/* Bloque Condicional del Chat y Consentimiento de IA */}
            {!iaConsentimiento ? (
              /* ── Pantalla de consentimiento ── */
              <div
                className="strategy-block"
                style={{
                  flexShrink: 0,
                  borderLeft: "3px solid #3b82f6",
                  padding: "16px",
                  backgroundColor: "rgba(59, 130, 246, 0.06)",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <Bot color="#3b82f6" size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <h4 style={{ color: "#fff", fontSize: "14px", marginBottom: "6px", fontWeight: 600 }}>
                      Activar Asistente de IA
                    </h4>
                    <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "14px", lineHeight: "1.5" }}>
                      El asesor analizará tu progreso académico para sugerir
                      límites de créditos o rutas óptimas. Los datos se enviarán
                      temporalmente al proveedor configurado.
                    </p>
                    <button
                      onClick={() => setIaConsentimiento(true)}
                      className="strategy-apply-btn"
                      style={{ width: "auto", padding: "7px 16px", fontSize: "12px", borderRadius: "8px" }}
                    >
                      Acepto y deseo continuar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Contenedor de Chat con altura controlada ── */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                {/* Historial de mensajes — altura fija con scroll propio */}
                <div
                  style={{
                    height: "40vh",
                    minHeight: "300px",
                    overflowY: "auto",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(148,163,184,0.2) transparent",
                  }}
                >
                  {iaHistorial.length === 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        color: "#64748b",
                        fontSize: "12px",
                        paddingTop: "24px",
                      }}
                    >
                      <Bot size={30} style={{ opacity: 0.4 }} />
                      <span>Escribe un mensaje para iniciar la consulta.</span>
                    </div>
                  ) : (
                    iaHistorial.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                          gap: "4px",
                        }}
                      >
                        {/* Etiqueta del emisor */}
                        <span
                          style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            color: msg.role === "user" ? "#60a5fa" : "#c084fc",
                          }}
                        >
                          {msg.role === "user" ? "Tú" : "Asesor IA"}
                        </span>

                        {/* Burbuja del mensaje */}
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: "1.55",
                            padding: "10px 14px",
                            borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                            maxWidth: "88%",
                            backgroundColor:
                              msg.role === "user"
                                ? "#2563eb"
                                : "rgba(139, 92, 246, 0.12)",
                            color: "#f1f5f9",
                            border:
                              msg.role === "user"
                                ? "1px solid rgba(96,165,250,0.3)"
                                : "1px solid rgba(192,132,252,0.2)",
                            boxShadow:
                              msg.role === "user"
                                ? "0 2px 8px rgba(37,99,235,0.25)"
                                : "0 2px 8px rgba(0,0,0,0.2)",
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Indicador de carga */}
                  {iaCargando && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#c084fc",
                        fontSize: "12px",
                        paddingLeft: "4px",
                      }}
                    >
                      <Loader2 className="animate-spin" size={14} />
                      <span>Analizando tu malla...</span>
                    </div>
                  )}
                </div>

                {/* Input de Chat — siempre visible en la parte inferior del chat */}
                <div
                  style={{
                    padding: "12px",
                    borderTop: "1px solid rgba(148,163,184,0.1)",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    backgroundColor: "rgba(2,6,23,0.4)",
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="text"
                    value={iaMensaje}
                    onChange={(e) => setIaMensaje(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEnviarMensajeIA()}
                    placeholder="Ej: Quiero pocos créditos este ciclo..."
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(100, 116, 139, 0.5)",
                      color: "#f1f5f9",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      outline: "none",
                      transition: "border-color 0.15s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(147,51,234,0.7)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(100,116,139,0.5)";
                    }}
                    disabled={iaCargando}
                  />
                  <button
                    onClick={handleEnviarMensajeIA}
                    disabled={!iaMensaje.trim() || iaCargando}
                    title="Enviar mensaje"
                    style={{
                      backgroundColor: !iaMensaje.trim() || iaCargando ? "rgba(147,51,234,0.35)" : "#9333ea",
                      color: "#fff",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: !iaMensaje.trim() || iaCargando ? "not-allowed" : "pointer",
                      transition: "background-color 0.15s ease, transform 0.1s ease",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Cursos Críticos — Accordion colapsado cuando hay mensajes en el chat ── */}
            {cursosCriticos.length > 0 && (
              <div
                className="strategy-block"
                style={{ flexShrink: 0, padding: 0, border: "1px solid rgba(148,163,184,0.1)", borderRadius: "10px", overflow: "hidden" }}
              >
                {/* Cabecera del accordion */}
                <button
                  type="button"
                  onClick={() => setCursosCriticosExpandido((v) => !v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "none",
                    cursor: "pointer",
                    color: "#cbd5e1",
                  }}
                  aria-expanded={cursosCriticosExpandido}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
                    <AlertCircle size={13} className="text-amber" />
                    <span>Cursos Críticos</span>
                    <span
                      style={{
                        fontSize: "11px",
                        backgroundColor: "rgba(245,158,11,0.15)",
                        color: "#fbbf24",
                        padding: "1px 7px",
                        borderRadius: "20px",
                        fontWeight: 500,
                      }}
                    >
                      {cursosCriticos.length}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      transition: "transform 0.2s ease",
                      display: "inline-block",
                      transform: cursosCriticosExpandido ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {/* Contenido colapsable */}
                {cursosCriticosExpandido && (
                  <div style={{ padding: "12px 14px 14px" }}>
                    <p className="strategy-block-desc" style={{ marginBottom: "10px" }}>
                      Materias pendientes con mayor cantidad de cursos dependientes aguas abajo:
                    </p>
                    <div className="critical-courses-grid">
                      {cursosCriticos.map((c) => (
                        <div key={c.codigo} className="critical-course-pill">
                          <span className="critical-course-code">{c.codigo}</span>
                          <span className="critical-course-name" title={c.nombre}>{c.nombre}</span>
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
              </div>
            )}

            {/* ── Generador de Ruta Curricular ── */}
            <div className="strategy-block" style={{ flexShrink: 0 }}>
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
                    {generandoAutomatico ? "Calculando ruta..." : "Generar Propuesta Óptima"}
                  </span>
                </button>
              </div>

              {resultadoAutomatico && (
                <div className="strategy-result-box">
                  <div className="strategy-result-meta-row">
                    <span className="strategy-meta-chip">
                      <CheckCircle2 size={13} className="text-emerald" />
                      <b>{resultadoAutomatico.totalPlanificados}</b> cursos organizados
                    </span>
                    <span className="strategy-meta-chip">
                      <b>{resultadoAutomatico.ciclos.length}</b> ciclos regulares
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
