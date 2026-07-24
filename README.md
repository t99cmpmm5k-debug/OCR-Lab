# OCR Lab — Garmin Engine V4.3 modular estable

Esta versión parte de la V4.2 estable, que ya reconoce correctamente:

- título, lugar, actividad, fecha y hora;
- distancia;
- FC media y máxima;
- ritmo y tiempo;
- calorías;
- cadencia;
- desnivel.

La extracción estable no se ha sustituido.

## Arquitectura modular

- `screen-detector.js`: identifica la pantalla.
- `parser-summary.js`: pantalla Resumen.
- `parser-statistics.js`: pantalla Estadísticas.
- `parser-training-effect.js`: Training Effect, Stamina y potencia.
- `parser-splits.js`: Vueltas.
- `parser-registry.js`: registro y selección de parsers.
- `fusion.js`: fusión de métricas principales.
- `garmin.js`: API pública compatible con la aplicación.

Los datos adicionales de Training Effect y Vueltas se conservan dentro de
`extras` en el JSON final, sin alterar las métricas estables visibles.
