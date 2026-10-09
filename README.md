# MallaU

Un proyecto web modular, extensible y de código abierto diseñado para ayudar a los estudiantes universitarios a gestionar y simular su carga académica y costos financieros.

Esta herramienta permite a los estudiantes planificar su avance hasta el décimo ciclo, optimizando su ruta crítica y controlando su presupuesto sin depender de servidores externos, garantizando la privacidad de sus datos.

## 🚀 Características Principales

- Gestión Académica Interactiva: Interfaz minimalista con gestión táctil de cursos (usando SortableJS) para simular ciclos regulares y de verano.
    
- Procesamiento Local: Los planes de estudio en Excel se procesan directamente en el navegador mediante SheetJS, sin enviar información a ningún servidor.
    
- Privacidad Total (Persistencia Local): Todo el progreso y la configuración se guardan en el dispositivo del usuario utilizando IndexedDB (mediante Dexie.js).
    
- Motor Financiero Parametrizable: Calcula penalidades por horas excedentes, costos por rango de horas (Ej. escalas 1-6h, 7-11h, etc.) y ajusta valores con o sin descuentos por convenios bancarios o pronto pago, adaptándose a múltiples esquemas universitarios.
    
- Exportación a PDF: Generación de reportes detallados en PDF desde el cliente, incluyendo resúmenes financieros, ruta crítica y detalle de cursos seleccionados.
    
- Asesoría Académica con IA Local (WebGPU): Integración con WebLLM para correr modelos de lenguaje (como SmolLM2 o Qwen) directamente en el navegador, ofreciendo recomendaciones de matrícula basadas en prerrequisitos y presupuesto sin consumo de datos ni APIs externas.
    
- Diseño Modular Multiversidad: Arquitectura preparada para soportar mallas curriculares y esquemas de costos de cualquier universidad mediante contribuciones JSON.
    

## 🛠️ Stack Tecnológico

- Frontend: React, TypeScript, Vite
    
- Almacenamiento Local: Dexie.js (IndexedDB)
    
- Procesamiento de Datos: SheetJS (xlsx)
    
- UI/Interacciones: SortableJS
    
- Generación de PDF: jsPDF, jspdf-autotable (o @react-pdf/renderer)
    
- IA Local: WebLLM (@mlc-ai/web-llm)
    
- Despliegue (CI/CD): GitHub Actions, GitHub Pages
    

## 🏗️ Arquitectura de Datos

### Persistencia y Flujo

La aplicación opera 100% en el cliente. La estructura básica de almacenamiento (IndexedDB) incluye:

  

- universidad_seleccionada: ID de la institución.
    
- carrera: Identificador de la carrera.
    
- cursos_progreso: Estado actual de los cursos (APROBADO, CONVALIDADO, EN_CURSO o PENDIENTE).
    
- configuracion_costos: Parámetros financieros personalizados (incluyendo tipo de carrera para tarifa y preferencias bancarias de pago).
    

### Normalización de Datos

Cualquier malla curricular se transforma al siguiente contrato de datos estándar:

  

export interface CursoNormalizado {

  

  id: string; // Código único (ej. "SIS101")

  

  nombre: string;

  

  ciclo: number;

  

  creditos: number;

  

  horasSemanales: number;

  

  tipo: 'OBLIGATORIO' | 'ELECTIVO';

  

  prerrequisitos: string[]; // IDs de cursos requeridos

  

  estado?: 'APROBADO' | 'CONVALIDADO' | 'EN_CURSO' | 'PENDIENTE';

  

}

## ⚙️ Reglas de Negocio Centrales

El sistema obedece a las siguientes directivas fundamentales parametrizables por universidad:

  

- RN01 (Estructura de Pagos Regular): El ciclo regular incluye el pago de matrícula y se divide en 5 cuotas de pensión.
    
- RN02 (Tarifario Escalonado): El costo de la cuota se calcula sumando las horas semanales de los cursos matriculados y ubicando el total en rangos predefinidos (Ej: 1-6, 7-11, 12-15, 16-22) que varían según la carrera o facultad. Superar el límite superior conlleva un costo fijo por hora adicional.
    
- RN03 (Sistema de Descuentos Regulares):
    

- Pago adelantado de ciclo completo: Descuento de 7.5% sobre las cuotas si se activa y paga antes de la primera fecha de vencimiento (no incluye la matrícula).
    
- Pronto Pago: Descuentos del 5% o 2.5% aplicables por pagar antes del vencimiento, dependiendo de la entidad bancaria elegida.
    

- RN04 (Excepción Ciclo Verano): Durante el ciclo de verano se anulan todos los descuentos regulares, las horas de los cursos computan el doble para el cálculo del tarifario y se establece un límite estricto de matrícula (ej. máximo 11 créditos).
    
- RN05 (Cadena de Correquisitos): Un curso no puede ser cursado sin haber completado previamente sus prerrequisitos y el retiro de un prerrequisito ya planificado lanza una advertencia en cadena.
    

## 💻 Instalación y Desarrollo Local

1. Clonar el repositorio:
    

  

git clone <URL_DEL_REPOSITORIO>

  

cd planificador-malla-curricular

  

2. Instalar dependencias:
    

  

npm install

  

3. Ejecutar el servidor de desarrollo:
    

  

npm run dev

  

4. Construir para producción:
    

  

npm run build

## 🤝 Cómo Contribuir (¡Agrega tu Universidad!)

El proyecto está diseñado para ser extensible. Para agregar una nueva universidad o carrera, no necesitas tocar la lógica central, solo definir los datos.

### Estructura de Contribución

Los datos de las universidades se organizan en /src/data/universidades/.

  

1. Crea un directorio para la universidad (ej. /pe-utp/).
    
2. Añade el JSON de la malla curricular (malla-[carrera]-[año].json) siguiendo la interfaz CursoNormalizado.
    
3. Añade el archivo de configuración de costos (costos.json) definiendo las tarifas escalonadas por facultad, costos adicionales y fechas.
    
4. (Opcional) Si tu universidad provee la malla en un formato Excel específico, puedes aportar un parser adaptado en la carpeta del proyecto.
    

  

Lee nuestra guía completa de contribución en CONTRIBUTING.md (próximamente) para más detalles.

## 🚀 Despliegue Automático

El proyecto está configurado con GitHub Actions. Cualquier merge o Pull Request aprobado hacia la rama principal compilará automáticamente el proyecto (npm run build) y desplegará la carpeta dist/ en la rama gh-pages, actualizando el sitio en vivo sin intervención manual.

**