# Evaluación del asistente · 2026-10-23 18:13 (Lima)


- Modelo: `deepseek-flash` · repeticiones por caso: 1 · tope: US$ 1.00
- Precios: deepseek-flash, consultados el 2026-10-23.

## Resumen

```
Evaluación · modelo deepseek-flash · 1 repeticiones por caso
Casos aprobados (todas sus repeticiones): 1/1 (100 %)
Repeticiones aprobadas: 1/1 (100 %)
Fallos por severidad: CRITICO 0 · MAYOR 0 · MENOR 0
Latencia: p50 8278 ms · p95 8278 ms
Tokens: entrada 8346 (con caché 1664, sin caché 6682) · salida 1513
Costo estimado: US$ 0.0019 (tope US$ 1.00)
```

## Casos

| Caso | Grupo | Aprobadas | Fallos |
| --- | --- | --- | --- |
| ✅ `contrato-analisis-plan1` | Contrato | 1/1 | — |

Global: 1/1 casos (100 %).

## Respuestas

### `contrato-analisis-plan1` · Contrato

Fixture `contexto-plan1` · modo analisis

**Repetición 1** · 8278 ms · 1 intento(s) · US$ 0.001915

```
Tu Ciclo 8 está en nivel de riesgo: 25 h y 21 créditos, por encima de las 24 h recomendadas y con 5 cursos de 4 h o más. Con S/ 900 al mes, la cuota más baja es S/ 861.57 con pago único, así que sí te alcanza. La ruta te deja 3 ciclos restantes hasta el Ciclo 10, pero te faltan 3 electivos.

## carga · riesgo · Carga del Ciclo 8: 25 h, nivel riesgo
Llevas 7 cursos que suman 25 h y 21 créditos. Superas las 24 h recomendadas y tienes 5 cursos de 4 h o más. El tope de planificación es 22 h, así que estás 3 h por encima.
- Considera mover un curso de 4 h a otro ciclo para bajar a 21 h.
- Si trabajas, prioriza los cursos con impacto 2: Arquitectura Empresarial e Inteligencia de Negocios.
- Revisa el orden en la sección de ruta para no recargar un solo periodo.
[cursos: 100000S06I, 100000S72T, 100000S73T, 100000H01C, 100000TD09, 100000I62N, 100000S71T]

## financiero · ok · Presupuesto: S/ 900 alcanza con pago único
La cuota más baja es S/ 861.57 con pago único (7.5 % de descuento), total S/ 4,705.86, y te deja S/ 38.43 de margen. Con Interbank/Scotiabank la cuota es S/ 884.86 (margen S/ 15.14). Sin descuento la cuota es S/ 931.43 y te faltarían S/ 31.43. La matrícula es S/ 398 en todos los casos. Son montos referenciales del tarifario 2026: verifícalos en el portal oficial de la UTP antes de pagar.
- Elige pago único si puedes asumir el total de S/ 4,705.86.
- Si prefieres cuotas, Interbank/Scotiabank es la opción que entra en tu presupuesto.
- Bajar 3 h de carga también reduce el recargo por horas adicionales (S/ 38.81 por hora).

## ruta · atencion · Ruta propuesta: 3 ciclos hasta el Ciclo 10
La ruta sugiere Ciclo 8 con Arquitectura Empresarial, Comunicación Efectiva, Innovación y Transformación Digital, Inteligencia de Negocios, Formación para la Investigación y Sistemas de Información Empresarial. Ciclo 9 con Gestión del Servicio TI, Herramientas de Prototipado, Negociación y Narrativa, Gestión del Conocimiento, Interacción Hombre Máquina, Formación para la Empleabilidad y Herramientas de Desarrollo Profesional TIC. Ciclo 10 con Curso Integrador II, Planeamiento Estratégico de las TICs, Ética Profesional, Ingeniería Económica, Servicios Cloud y Taller de Investigación. Queda sin planificar Formación Profesional con Enfoque en Discapacidad e Inclusión.
- Sigue el orden de la ruta para no dejar cursos sin prerrequisitos resueltos.
- Ubica el curso sin planificar en un ciclo con menos carga.
- Revisa los cursos con impacto 2 antes de moverlos de periodo.
[cursos: 100000S06I, 100000H01C, 100000TD09, 100000I62N, 100000SI82, 100000SI86, 100000S72T, 100000S73T, 100000S71T, 100000S02I, 100000SI87, 100000N11I, 10000096SI, 100000S09I, 100000S07I, 100000N25I, 100000NI24, 100000SI97, 100000SI95]

## electivos · atencion · Electivos: te faltan 3
Tienes 0 de 3 electivos cubiertos. En el banco hay Calidad de Software, Contabilidad General, Elementary Business English y Formación Profesional con Enfoque en Discapacidad e Inclusión. El área de cada uno no está confirmada.
- Elige 3 electivos y ubícalos en ciclos con menos horas.
- Confirma con tu tutor que el área de cada electivo cuente para tu malla.
- Ojo: Elementary Business English suma 4 h, el más pesado de los electivos.
[cursos: 100000I64M, 100000RI07, 100000ZZ28, 100000CN47]

## whatIf · atencion · Si jalas un curso del Ciclo 8
Si jalas Arquitectura Empresarial, tu ventana es Verano 8 o Ciclo 9, y se bloquean Planeamiento Estratégico de las TICs y Curso Integrador II. Si jalas Inteligencia de Negocios, ventana Verano 8 o Ciclo 9, y se bloquean Gestión del Conocimiento y Curso Integrador II. Si jalas Comunicación Efectiva, se bloquea Formación para la Empleabilidad; si jalas Innovación y Transformación Digital, se bloquea Herramientas de Desarrollo Profesional TIC. Gestión del Servicio TI, Herramientas de Prototipado y Negociación y Narrativa no bloquean cursos.
- Prioriza Arquitectura Empresarial e Inteligencia de Negocios: son las que más bloquean.
- Si sientes que un curso se complica, no lo postergues: va en su ventana.
- Pide tutoría antes de la matrícula si ves riesgo en algún curso.
[cursos: 100000S06I, 100000I62N, 100000H01C, 100000TD09]
```

<details><summary>Intentos</summary>

Intento 1 · finish_reason `stop` · reasoning_content: no · 4666 caracteres

usage: `{"prompt_tokens":8346,"completion_tokens":1513,"total_tokens":9859,"prompt_tokens_details":{"cached_tokens":1664},"prompt_cache_hit_tokens":1664,"prompt_cache_miss_tokens":6682}`

```
{"resumen":"Tu Ciclo 8 está en nivel de riesgo: 25 h y 21 créditos, por encima de las 24 h recomendadas y con 5 cursos de 4 h o más. Con S/ 900 al mes, la cuota más baja es S/ 861.57 con pago único, así que sí te alcanza. La ruta te deja 3 ciclos restantes hasta el Ciclo 10, pero te faltan 3 electivos.","secciones":[{"tipo":"carga","nivel":"riesgo","titulo":"Carga del Ciclo 8: 25 h, nivel riesgo","detalle":"Llevas 7 cursos que suman 25 h y 21 créditos. Superas las 24 h recomendadas y tienes 5 cursos de 4 h o más. El tope de planificación es 22 h, así que estás 3 h por encima.","acciones":["Considera mover un curso de 4 h a otro ciclo para bajar a 21 h.","Si trabajas, prioriza los cursos con impacto 2: Arquitectura Empresarial e Inteligencia de Negocios.","Revisa el orden en la sección de ruta para no recargar un solo periodo."],"cursos":["100000S06I","100000S72T","100000S73T","100000H01C","100000TD09","100000I62N","100000S71T"]},{"tipo":"financiero","nivel":"ok","titulo":"Presupuesto: S/ 900 alcanza con pago único","detalle":"La cuota más baja es S/ 861.57 con pago único (7.5 % de descuento), total S/ 4,705.86, y te deja S/ 38.43 de margen. Con Interbank/Scotiabank la cuota es S/ 884.86 (margen S/ 15.14). Sin descuento la cuota es S/ 931.43 y te faltarían S/ 31.43. La matrícula es S/ 398 en todos los casos. Son montos referenciales del tarifario 2026: verifícalos en el portal oficial de la UTP antes de pagar.","acciones":["Elige pago único si puedes asumir el total de S/ 4,705.86.","Si prefieres cuotas, Interbank/Scotiabank es la opción que entra en tu presupuesto.","Bajar 3 h de carga también reduce el recargo por horas adicionales (S/ 38.81 por hora)."],"cursos":[]},{"tipo":"ruta","nivel":"atencion","titulo":"Ruta propuesta: 3 ciclos hasta el Ciclo 10","detalle":"La ruta sugiere Ciclo 8 con Arquitectura Empresarial, Comunicación Efectiva, Innovación y Transformación Digital, Inteligencia de Negocios, Formación para la Investigación y Sistemas de Información Empresarial. Ciclo 9 con Gestión del Servicio TI, Herramientas de Prototipado, Negociación y Narrativa, Gestión del Conocimiento, Interacción Hombre Máquina, Formación para la Empleabilidad y Herramientas de Desarrollo Profesional TIC. Ciclo 10 con Curso Integrador II, Planeamiento Estratégico de las TICs, Ética Profesional, Ingeniería Económica, Servicios Cloud y Taller de Investigación. Queda sin planificar Formación Profesional con Enfoque en Discapacidad e Inclusión.","acciones":["Sigue el orden de la ruta para no dejar cursos sin prerrequisitos resueltos.","Ubica el curso sin planificar en un ciclo con menos carga.","Revisa los cursos con impacto 2 antes de moverlos de periodo."],"cursos":["100000S06I","100000H01C","100000TD09","100000I62N","100000SI82","100000SI86","100000S72T","100000S73T","100000S71T","100000S02I","100000SI87","100000N11I","10000096SI","100000S09I","100000S07I","100000N25I","100000NI24","100000SI97","100000SI95"]},{"tipo":"electivos","nivel":"atencion","titulo":"Electivos: te faltan 3","detalle":"Tienes 0 de 3 electivos cubiertos. En el banco hay Calidad de Software, Contabilidad General, Elementary Business English y Formación Profesional con Enfoque en Discapacidad e Inclusión. El área de cada uno no está confirmada.","acciones":["Elige 3 electivos y ubícalos en ciclos con menos horas.","Confirma con tu tutor que el área de cada electivo cuente para tu malla.","Ojo: Elementary Business English suma 4 h, el más pesado de los electivos."],"cursos":["100000I64M","100000RI07","100000ZZ28","100000CN47"]},{"tipo":"whatIf","nivel":"atencion","titulo":"Si jalas un curso del Ciclo 8","detalle":"Si jalas Arquitectura Empresarial, tu ventana es Verano 8 o Ciclo 9, y se bloquean Planeamiento Estratégico de las TICs y Curso Integrador II. Si jalas Inteligencia de Negocios, ventana Verano 8 o Ciclo 9, y se bloquean Gestión del Conocimiento y Curso Integrador II. Si jalas Comunicación Efectiva, se bloquea Formación para la Empleabilidad; si jalas Innovación y Transformación Digital, se bloquea Herramientas de Desarrollo Profesional TIC. Gestión del Servicio TI, Herramientas de Prototipado y Negociación y Narrativa no bloquean cursos.","acciones":["Prioriza Arquitectura Empresarial e Inteligencia de Negocios: son las que más bloquean.","Si sientes que un curso se complica, no lo postergues: va en su ventana.","Pide tutoría antes de la matrícula si ves riesgo en algún curso."],"cursos":["100000S06I","100000I62N","100000H01C","100000TD09"]}],"preguntasSugeridas":["¿Qué curso me conviene mover para bajar a 21 h?","¿Cómo quedaría mi ruta si jalo Inteligencia de Negocios?","¿Qué electivos me convienen según mi área?"]}
```

</details>
