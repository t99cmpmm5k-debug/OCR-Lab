# OCR Lab V3.2 — Parser semántico Garmin

Parte de la arquitectura modular V3.1.

Mejoras:

- Cada dato se extrae por relación `etiqueta → valor`.
- `Tiempo total` ya no puede confundirse con `Ritmo medio`.
- `Calorías totales` no se confunden con FC media ni con calorías en reposo.
- Título y lugar limpian fragmentos OCR finales como `ZA`.
- Las métricas de Resumen y Estadísticas usan etiquetas Garmin exactas.
- Se mantiene la fusión multicaptura y la prioridad de Resumen para identidad.

Archivos principales:

- `parser-summary.js`
- `parser-statistics.js`
- `garmin-utils.js`
- `fusion.js`
