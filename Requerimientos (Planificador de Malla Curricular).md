**

Este documento detalla los requerimientos que el sistema debe cumplir para implementar las Reglas de Negocio y asegurar el correcto funcionamiento técnico de la aplicación. Se dividen en Requerimientos Funcionales (el "qué" hace el sistema operativamente) y Requerimientos No Funcionales (el "cómo" a nivel de arquitectura y rendimiento).

**
## Requerimientos Funcionales (RF)

- RF01 (Ingesta de Datos): El sistema debe leer y procesar un archivo XLSX subido por el usuario, extrayendo la información de la malla curricular y reconociendo cada curso de forma individual.
    
- RF02 (Gestión UI): El sistema debe permitir al usuario reubicar cursos entre diferentes ciclos académicos utilizando la funcionalidad de drag-and-drop (arrastrar y soltar).
    
- RF03 (Identificación de Cursos): El sistema debe identificar y etiquetar visualmente los cursos según su tipo: "Curso obligatorio" o "Curso electivo".
    
- RF04 (Motor de Estado Académico): El sistema debe clasificar los cursos en los estados: "Aprobado", "Convalidado", "Pendiente" y "En curso".
    
- RF05 (Bloqueo de Modificación): El sistema debe bloquear en la interfaz cualquier intento de eliminar o mover de ciclo los cursos que se encuentren en estado "Aprobado", "En curso" o "Convalidado". Solo los cursos en estado "Pendiente" pueden ser reubicados libremente.
    
- RF06 (Motor de Prerrequisitos - Validación): El sistema debe impedir algorítmicamente que un usuario programe un curso en un ciclo si no ha posicionado previamente sus cursos prerrequisito en ciclos anteriores.
    
- RF07 (Motor de Prerrequisitos - Alerta): El sistema debe emitir una advertencia visible si el usuario intenta retirar o mover un curso que funge como prerrequisito de otro curso que ya está planificado en un ciclo posterior.
    
- RF08 (Motor Financiero): El sistema debe calcular automáticamente el costo total de la cuota de un ciclo sumando las horas de cada curso planificado y aplicando la escala tarifaria correspondiente a la facultad.
    
- RF09 (Motor Financiero - Descuentos): El sistema debe aplicar automáticamente al cálculo total los descuentos por pago al contado (7.5%) o por pronto pago en cuotas (5% o 2.5%) según el banco o método seleccionado por el usuario, exceptuando los ciclos de verano.
    
- RF10 (Motor Financiero - Verano): Si el ciclo proyectado se marca como "Verano", el sistema debe duplicar internamente el valor de horas semanales de cada curso seleccionado para determinar en qué rango de la tabla tarifaria cae el usuario, y no debe aplicar ningún descuento de la RF09. Adicionalmente, debe bloquear la matrícula si los créditos exceden 11.
    
- RF11 (Validación de Créditos Electivos): El sistema debe alertar al usuario, sin bloquear sus acciones, si la sumatoria final de sus cursos proyectados no cumple con el mínimo de 3 créditos de cursos electivos o si falta algún crédito obligatorio.
    
- RF12 (Asistente IA): El asistente de IA integrado debe leer el estado actual de la malla proyectada (cursos aprobados vs. pendientes) y devolver una recomendación de cursos viables para los siguientes ciclos, ajustándose a las necesidades o carga horaria requerida por el alumno.
    
- RF13 (Exportación de Reportes): La aplicación debe generar un reporte consolidado con la proyección de cursos por ciclo y el presupuesto de gastos, y permitir su descarga en el dispositivo del usuario en formatos PNG y PDF.
    

## Requerimientos No Funcionales (RNF)

- RNF01 (Independencia Operativa): La aplicación debe funcionar operativamente basándose de manera esencial en la información extraída del tarifario cargado en el sistema, permitiendo actualizaciones de tarifas sin tocar el código fuente.
    
- RNF02 (Rendimiento Crítico): El cálculo algorítmico de la ruta crítica y la actualización visual de los costos totales en pantalla, generados tras arrastrar y soltar un curso (drag-and-drop), no debe exceder los 200 milisegundos de tiempo de respuesta.
    
- RNF03 (Usabilidad UI/UX): La interfaz gráfica de la malla curricular debe ser completamente responsive, asegurando que la visualización y la gestión táctil (arrastrar y soltar) de los ciclos funcionen correctamente en dispositivos móviles y tablets.
    

**