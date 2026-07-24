# OCR Lab V3.1 — Arquitectura modular Garmin

La aplicación se divide en módulos:

- `garmin-utils.js`: funciones compartidas.
- `screen-detector.js`: identifica Resumen o Estadísticas.
- `parser-summary.js`: extrae identidad y métricas principales.
- `parser-statistics.js`: extrae métricas avanzadas.
- `fusion.js`: combina todas las capturas.
- `garmin.js`: fachada compatible con `app.js`.

Reglas principales:

- La captura Resumen es la única que aporta título, lugar, actividad, fecha y hora.
- Las capturas Estadísticas completan FC máxima, cadencia, desnivel y otras métricas.
- `Calorías totales` tiene prioridad sobre `Calorías activas`.
- `Calorías en reposo` nunca se usa como total.
- La fusión conserva el dato de mayor confianza.
