# Organizador Curricular y Presupuestario Universitario

Una aplicación web progresiva (**PWA**) de código abierto y ejecución 100% en el cliente (*zero-backend*), diseñada para que los estudiantes universitarios puedan organizar su avance académico, simular matrículas, validar prerrequisitos y calcular el presupuesto semestral de forma interactiva y privada.

---

## ¿De qué trata el proyecto?

El sistema resuelve la falta de herramientas accesibles para la planificación de matrículas universitarias. Permite cargar el plan de estudios oficial directamente desde un archivo Excel (`.xlsx`)[cite: 2], visualizando el progreso en los 10 ciclos académicos (cursos aprobados, convalidados, en curso y pendientes)[cite: 2]. 

A partir de este registro, los estudiantes pueden reorganizar sus asignaturas mediante *drag & drop*, verificar materias desbloqueadas según sus prerrequisitos y proyectar el costo exacto de sus cuotas mensuales según la disciplina o facultad seleccionada[cite: 2].

---

## Características Principales

* **Lectura Automática de Excel:** Procesa archivos `.xlsx` del portal universitario extrayendo códigos, créditos, horas lectivas, prerrequisitos y estados académicos en memoria[cite: 2].
* **Tablero Interactivo por Ciclos:** Malla visual organizada verticalmente con asignaturas distribuidas de forma horizontal y soporte para arrastrar y soltar (*drag & drop*) materias entre ciclos o desde el banco de cursos pendientes.
* **Calculadora Financiera por Disciplinas:** Cálculo dinámico de costos por crédito, hora, curso o matrícula regular con soporte para tarifas diferenciadas por carrera/facultad.
* **Persistencia Local (Zero-Backend):** Todos los datos se almacenan localmente en el navegador mediante `IndexedDB` (Dexie.js), garantizando privacidad total y funcionamiento *offline*.
* **Motor de Prerrequisitos:** Identificación automática de materias habilitadas y rutas críticas para evitar cuellos de botella en la graduación.
* **Extensible para Múltiples Universidades:** Arquitectura basada en esquemas JSON desacoplados para que la comunidad agregue nuevas mallas y tarifarios fácilmente.

---

## Stack Tecnológico

* **Core:** [React 18+](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
* **Gestor de Estado:** [Zustand](https://zustand-demo.pmnd.rs/)
* **Base de Datos Local:** [Dexie.js](https://dexie.org/) (`IndexedDB`)
* **Procesamiento de Archivos:** [SheetJS (xlsx)](https://docs.sheetjs.com/)
* **Generación de Reportes:** [@react-pdf/renderer](https://react-pdf.org/)
* **Gestor de Paquetes:** [pnpm](https://pnpm.io/)
* **Despliegue Continuo:** GitHub Actions & GitHub Pages

---

## Guía de Instalación y Ejecución Local

Sigue estos pasos para clonar y correr el proyecto en tu entorno local:

### Prerrequisitos

* Tener instalado **Node.js** (versión 18 o superior).
* Tener instalado **pnpm**:
  ```bash
  npm install -g pnpm
### Pasos para ejecutar (para que copies y pegues nomas vag@)
1)
git clone [https://github.com/TU_USUARIO/academic-planner.git](https://github.com/TU_USUARIO/academic-planner.git)
cd academic-planner
2)
pnpm install
3)
pnpm install
4)
pnpm dev
