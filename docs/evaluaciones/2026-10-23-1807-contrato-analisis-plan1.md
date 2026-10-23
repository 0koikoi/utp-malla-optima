# Evaluación del asistente · 2026-10-23 18:07 (Lima)


- Modelo: `deepseek-flash` · repeticiones por caso: 2 · tope: US$ 1.00
- Precios: deepseek-flash, consultados el 2026-10-23.

## Resumen

```
Evaluación · modelo deepseek-flash · 2 repeticiones por caso
Casos aprobados (todas sus repeticiones): 0/1 (0 %)
Repeticiones aprobadas: 0/2 (0 %)
Fallos por severidad: CRITICO 2 · MAYOR 0 · MENOR 0
Latencia: p50 14584 ms · p95 14751 ms
Tokens: entrada 33484 (con caché 32768, sin caché 716) · salida 4800
Costo estimado: US$ 0.0031 (tope US$ 1.00)
```

## Casos

| Caso | Grupo | Aprobadas | Fallos |
| --- | --- | --- | --- |
| ❌ `contrato-analisis-plan1` | Contrato | 0/2 | CRITICO json-invalido |

Global: 0/1 casos (0 %).

## Respuestas

### `contrato-analisis-plan1` · Contrato

Fixture `contexto-plan1` · modo analisis

**Repetición 1** · 14584 ms · 2 intento(s) · US$ 0.001543 · error RESPUESTA_INVALIDA

```

```

- **CRITICO** `json-invalido`: La respuesta no fue JSON válido según el esquema (tras el reintento).

<details><summary>Intentos</summary>

Intento 1 · finish_reason `length` · reasoning_content: sí · 1538 caracteres

usage: `{"prompt_tokens":8371,"completion_tokens":1200,"total_tokens":9571,"prompt_tokens_details":{"cached_tokens":8192},"completion_tokens_details":{"reasoning_tokens":670},"prompt_cache_hit_tokens":8192,"prompt_cache_miss_tokens":179}`

```
{"resumen":"Te doy el panorama de tu Ciclo 8 antes de que matricules. Tres cosas saltan: llevas 25 h (3 más de lo que permite la escala de pensión de 22 h, así que pagarías recargo por horas adicionales), con el método sin descuento la cuota de S/ 931.43 no te alcanza para tu presupuesto de S/ 900, y tu ruta sí cierra en 3 ciclos (hasta el Ciclo 10). La buena noticia: con un ajuste de un curso arreglas carga y presupuesto a la vez.","secciones":[{"tipo":"carga","nivel":"riesgo","titulo":"25 h: estás 3 h por encima del tope","detalle":"Tu plan del Ciclo 8 suma 25 h y 21 créditos, con 5 cursos de 4 h o más. Superas las 24 h recomendadas y, sobre todo, las 22 h de la escala de pensión: esas 3 h de exceso se cobran como hora adicional a S/ 38.81.","acciones":["Saca un curso de 4 h del Ciclo 8 y bajas a 21 h: quedas dentro de la escala y sin recargo por horas adicionales.","Si trabajas o tienes poco tiempo esta temporada, deja ese curso para el Ciclo 9 en lugar de cargarte ahora.","Antes de matricular, confirma en el portal cómo se reflejan las 21 h en tu cuota."],"cursos":["100000S06I","100000S72T","100000S73T","100000H01C","100000TD09","100000I62N","100000S71T"]},{"tipo":"financiero","nivel":"atencion","titulo":"Con S/ 900 te falta S/ 31.43 al mes","detalle":"Con el método sin descuento, la cuota del Ciclo 8 es S/ 931.43 (matrícula S/ 398 + 5 cuotas, total S/ 5,055.15). Con Interbank o Scotiabank por pronto pago baja a S/ 884.86 (total S/ 4,822.30), que sí entra en tu presupuesto con S/ 15.14 de margen. Con BCP o BB
```

Intento 2 · finish_reason `length` · reasoning_content: sí · 0 caracteres

usage: `{"prompt_tokens":8371,"completion_tokens":1200,"total_tokens":9571,"prompt_tokens_details":{"cached_tokens":8192},"completion_tokens_details":{"reasoning_tokens":1200},"prompt_cache_hit_tokens":8192,"prompt_cache_miss_tokens":179}`

```
(vacío)
```

</details>

**Repetición 2** · 14751 ms · 2 intento(s) · US$ 0.001543 · error RESPUESTA_INVALIDA

```
{"resumen":"Estás en Ciclo 7, con 19 créditos en curso y 70 pendientes para cerrar en 3 ciclos (8, 9 y 10). Lo que más te conviene revisar: tu plan de Ciclo 8 suma 25 h, por encima del tope de 22 h de la escala de pensión y de las 24 h recomendadas, y además te faltan 3 electivos que la ruta propuesta todavía no coloca. En plata, con S/ 900 de presupuesto sí te alcanza si eliges pronto pago o pago único.","secciones":[{"tipo":"carga","nivel":"riesgo","titulo":"Ciclo 8: 25 h y 5 cursos de 4 h o más","detalle":"Tu plan de Ciclo 8 tiene 7 cursos, 21 créditos y 25 h: 3 h por encima del tope de 22 h de la escala de pensión y 1 h sobre las 24 h recomendadas. El sistema marca 2 motivos: superas las 24 h y llevas 5 cursos de 4 h o más (DISEÑO E IMPLEMENTACIÓN DE ARQUITECTURA EMPRESARIAL, GESTIÓN DEL SERVICIO TI, HERRAMIENTAS DE PROTOTIPADO, INNOVACIÓN Y TRANSFORMACIÓN DIGITAL e INTELIGENCIA DE NEGOCIOS). Ojo: si trabajas, 25 h semanales de clase se sienten distinto que si solo estudias.","acciones":["Saca uno de los cursos de 4 h del Ciclo 8 para bajar a 21 h y quedar dentro del tope de 22 h.","Si trabajas, apunta a 3 o 4 cursos ese ciclo en vez de 7.","Deja los cursos de menos horas (NEGOCIACIÓN Y NARRATIVA, HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA) para equilibrar la semana."],"cursos":["100000S72T","100000S73T","100000TD09","100000I62N","100000S
```

- **CRITICO** `json-invalido`: La respuesta no fue JSON válido según el esquema (tras el reintento).

<details><summary>Intentos</summary>

Intento 1 · finish_reason `length` · reasoning_content: sí · 0 caracteres

usage: `{"prompt_tokens":8371,"completion_tokens":1200,"total_tokens":9571,"prompt_tokens_details":{"cached_tokens":8192},"completion_tokens_details":{"reasoning_tokens":1200},"prompt_cache_hit_tokens":8192,"prompt_cache_miss_tokens":179}`

```
(vacío)
```

Intento 2 · finish_reason `length` · reasoning_content: sí · 1364 caracteres

usage: `{"prompt_tokens":8371,"completion_tokens":1200,"total_tokens":9571,"prompt_tokens_details":{"cached_tokens":8192},"completion_tokens_details":{"reasoning_tokens":721},"prompt_cache_hit_tokens":8192,"prompt_cache_miss_tokens":179}`

```
{"resumen":"Estás en Ciclo 7, con 19 créditos en curso y 70 pendientes para cerrar en 3 ciclos (8, 9 y 10). Lo que más te conviene revisar: tu plan de Ciclo 8 suma 25 h, por encima del tope de 22 h de la escala de pensión y de las 24 h recomendadas, y además te faltan 3 electivos que la ruta propuesta todavía no coloca. En plata, con S/ 900 de presupuesto sí te alcanza si eliges pronto pago o pago único.","secciones":[{"tipo":"carga","nivel":"riesgo","titulo":"Ciclo 8: 25 h y 5 cursos de 4 h o más","detalle":"Tu plan de Ciclo 8 tiene 7 cursos, 21 créditos y 25 h: 3 h por encima del tope de 22 h de la escala de pensión y 1 h sobre las 24 h recomendadas. El sistema marca 2 motivos: superas las 24 h y llevas 5 cursos de 4 h o más (DISEÑO E IMPLEMENTACIÓN DE ARQUITECTURA EMPRESARIAL, GESTIÓN DEL SERVICIO TI, HERRAMIENTAS DE PROTOTIPADO, INNOVACIÓN Y TRANSFORMACIÓN DIGITAL e INTELIGENCIA DE NEGOCIOS). Ojo: si trabajas, 25 h semanales de clase se sienten distinto que si solo estudias.","acciones":["Saca uno de los cursos de 4 h del Ciclo 8 para bajar a 21 h y quedar dentro del tope de 22 h.","Si trabajas, apunta a 3 o 4 cursos ese ciclo en vez de 7.","Deja los cursos de menos horas (NEGOCIACIÓN Y NARRATIVA, HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA) para equilibrar la semana."],"cursos":["100000S72T","100000S73T","100000TD09","100000I62N","100000S
```

</details>
