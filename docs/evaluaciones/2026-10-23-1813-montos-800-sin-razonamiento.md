# Evaluación del asistente · 2026-10-23 18:13 (Lima)


- Modelo: `deepseek-flash` · repeticiones por caso: 2 · tope: US$ 1.00
- Precios: deepseek-flash, consultados el 2026-10-23.

## Resumen

```
Evaluación · modelo deepseek-flash · 2 repeticiones por caso
Casos aprobados (todas sus repeticiones): 0/1 (0 %)
Repeticiones aprobadas: 0/2 (0 %)
Fallos por severidad: CRITICO 2 · MAYOR 0 · MENOR 0
Latencia: p50 1996 ms · p95 2302 ms
Tokens: entrada 16454 (con caché 8064, sin caché 8390) · salida 479
Costo estimado: US$ 0.0016 (tope US$ 1.00)
```

## Casos

| Caso | Grupo | Aprobadas | Fallos |
| --- | --- | --- | --- |
| ❌ `montos-800` | Montos | 0/2 | CRITICO monto-inexistente |

Global: 0/1 casos (0 %).

## Respuestas

### `montos-800` · Montos

Fixture `contexto-plan1` · modo chat

> **Alumno:** ¿me alcanza con 800 al mes?

**Repetición 1** · 2302 ms · 1 intento(s) · US$ 0.001382

```
Con tu plan del Ciclo 8 (21 créditos, 25 h), la cuota más baja es S/ 861.57 con pago único (7.5 % de descuento), así que con S/ 800 te faltarían S/ 61.57 al mes. Con Interbank/Scotiabank pronto pago sería S/ 884.86 y sin descuento S/ 931.43. Ojo: tu carga está en nivel riesgo (25 h, por encima de las 24 h recomendadas y con 5 cursos de 4 h o más), así que si sacas un curso de 4 h bajas a 21 h y dejas de pagar el recargo por horas adicionales (S/ 38.81 por hora). Los montos son referenciales del tarifario 2026: verifícalos en el portal oficial de la UTP antes de pagar.
```

- **CRITICO** `monto-inexistente`: Montos que no están en el contexto: S/ 61.57.

<details><summary>Intentos</summary>

Intento 1 · finish_reason `stop` · reasoning_content: no · 707 caracteres

usage: `{"prompt_tokens":8227,"completion_tokens":247,"total_tokens":8474,"prompt_tokens_details":{"cached_tokens":0},"prompt_cache_hit_tokens":0,"prompt_cache_miss_tokens":8227}`

```
{"texto":"Con tu plan del Ciclo 8 (21 créditos, 25 h), la cuota más baja es S/ 861.57 con pago único (7.5 % de descuento), así que con S/ 800 te faltarían S/ 61.57 al mes. Con Interbank/Scotiabank pronto pago sería S/ 884.86 y sin descuento S/ 931.43. Ojo: tu carga está en nivel riesgo (25 h, por encima de las 24 h recomendadas y con 5 cursos de 4 h o más), así que si sacas un curso de 4 h bajas a 21 h y dejas de pagar el recargo por horas adicionales (S/ 38.81 por hora). Los montos son referenciales del tarifario 2026: verifícalos en el portal oficial de la UTP antes de pagar.","cursos":[],"preguntasSugeridas":["¿Qué curso me conviene sacar para bajar la carga?","¿Cuánto pagaría con pago único?"]}
```

</details>

**Repetición 2** · 1996 ms · 1 intento(s) · US$ 0.000188

```
Con tu plan del Ciclo 8 (21 créditos, 25 h), la cuota más baja es S/ 861.57 con pago único (7.5 % de descuento), así que con S/ 800 te faltarían S/ 61.57 al mes. Ojo: tu plan está en nivel de carga "riesgo" porque pasa las 24 h recomendadas (25 h) y tiene 5 cursos de 4 h o más. Si sacas un curso de 4 h, bajas a 21 h y dejas de pagar el recargo por horas adicionales (S/ 38.81 por hora). Los montos son referenciales del tarifario 2026: confírmalos en el portal oficial de la UTP antes de pagar.
```

- **CRITICO** `monto-inexistente`: Montos que no están en el contexto: S/ 61.57.

<details><summary>Intentos</summary>

Intento 1 · finish_reason `stop` · reasoning_content: no · 671 caracteres

usage: `{"prompt_tokens":8227,"completion_tokens":232,"total_tokens":8459,"prompt_tokens_details":{"cached_tokens":8064},"prompt_cache_hit_tokens":8064,"prompt_cache_miss_tokens":163}`

```
{"texto":"Con tu plan del Ciclo 8 (21 créditos, 25 h), la cuota más baja es S/ 861.57 con pago único (7.5 % de descuento), así que con S/ 800 te faltarían S/ 61.57 al mes. Ojo: tu plan está en nivel de carga \"riesgo\" porque pasa las 24 h recomendadas (25 h) y tiene 5 cursos de 4 h o más. Si sacas un curso de 4 h, bajas a 21 h y dejas de pagar el recargo por horas adicionales (S/ 38.81 por hora). Los montos son referenciales del tarifario 2026: confírmalos en el portal oficial de la UTP antes de pagar.","cursos":[],"preguntasSugeridas":["¿Qué curso me conviene sacar para bajar la carga?","¿Cuánto pagaría con pago único?","¿Cómo queda mi ruta si saco un curso?"]}
```

</details>
