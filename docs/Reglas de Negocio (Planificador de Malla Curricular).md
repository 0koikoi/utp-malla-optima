**

Este documento define las reglas de negocio (RN) inmutables que el sistema debe respetar para el cálculo de costos y validación de matrícula, basándose en la normativa vigente (Agosto 2026). Estas reglas dictan el "qué" debe cumplirse a nivel lógico y contable.

## RN01: Categorización por Facultad y Tarifario Base

El cálculo del costo base por ciclo se determina mediante rangos escalonados de horas lectivas semanales, dependiendo de la facultad a la que pertenece la carrera del usuario. (Aplica para alumnos ingresantes a partir del ciclo Agosto 2018).

  

1. Ciencias de la salud, Gestión y Humanidades (Excepto Farmacia y Bioquímica)

  

- Rango 1 – 6 horas: S/ 385.00
    
- Rango 7 – 11 horas: S/ 539.00
    
- Rango 12 – 15 horas: S/ 685.30
    
- Rango 16 – 22 horas: S/ 770.00
    
- Penalidad por exceso: S/ 36.67 por cada hora adicional (> 22 horas).
    

  

2. Farmacia y Bioquímica / Otras Carreras (Ingenierías, Arquitectura, etc.)

  

- Rango 1 – 6 horas: S/ 407.50
    
- Rango 7 – 11 horas: S/ 570.50
    
- Rango 12 – 15 horas: S/ 725.35
    
- Rango 16 – 22 horas: S/ 815.00
    
- Penalidad por exceso: S/ 38.81 por cada hora adicional (> 22 horas).
    

## RN02: Costo de Matrícula

A los costos base del rango de horas se les debe sumar un monto fijo correspondiente a la matrícula regular (S/ 398.00), el cual se cobra de forma independiente.

## RN03: Estructura y Calendario de Pagos

El costo total del rango de horas se divide en 5 cuotas exactas. El calendario referencial de vencimiento para el ciclo de Agosto 2026 es el siguiente:

  

- 1ra cuota: 14 de agosto del 2026
    
- 2da cuota: 12 de setiembre del 2026
    
- 3ra cuota: 12 de octubre del 2026
    
- 4ta cuota: 12 de noviembre del 2026
    
- 5ta cuota: 12 de diciembre del 2026
    

## RN04: Descuento por Pago Adelantado (Ciclo Completo)

Si el usuario simula el pago al contado de todas las cuotas del ciclo antes de la fecha de vencimiento de la primera cuota, se aplica un descuento único del 7.5% sobre el costo total del ciclo (excluyendo la matrícula). Este descuento es aplicable en Scotiabank, BBVA Continental, Interbank y Banco de Crédito.

## RN05: Descuento por Pronto Pago (Cuotas Fraccionadas)

Si el usuario simula el pago en 5 cuotas, puede acceder a un descuento por pronto pago si abona hasta un día hábil antes del vencimiento (sin contar domingos ni feriados):

  

- 5% de descuento: Pagando en Interbank o Scotiabank.
    
- 2.5% de descuento: Pagando en Banco de Crédito o BBVA Continental.
    
- 0% de descuento (Tarifa Plena): Si el pago se simula en la fecha de vencimiento o posterior.
    

## RN06: Restricciones de Verano

En los ciclos de verano se aplican condiciones especiales que sobreescriben las reglas regulares:

  

- Anulación de descuentos: No aplican los descuentos de la RN04 ni de la RN05.
    
- Límite de créditos: El límite máximo permitido es de 11 créditos.
    
- Duplicación de horas lectivas: Las horas semanales de un curso se duplican matemáticamente respecto a un ciclo regular (ej. un curso de 4h regulares pasa a 8h en verano). El costo se reevalúa según el total de horas duplicadas ingresando nuevamente a la tabla tarifaria de la RN01.
    

## RN07: Validación Académica (Prerrequisitos)

El sistema prohíbe la matriculación de un curso si sus prerrequisitos no figuran con estado "Aprobado" o "Convalidado" en ciclos anteriores.

## RN08: Requisitos de Titulación

El alumno debe completar el 100% de créditos obligatorios y un mínimo de 3 créditos electivos para que el planificador valide la proyección como "Completa".

**