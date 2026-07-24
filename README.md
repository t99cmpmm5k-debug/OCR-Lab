# OCR Lab — Garmin Engine V7

V7 elimina las heurísticas de fusión.

Regla central:

- `avg_heart_rate_bpm` solo se fusiona con `avg_heart_rate_bpm`.
- `max_heart_rate_bpm` solo se fusiona con `max_heart_rate_bpm`.
- `calories_kcal` solo se fusiona con `calories_kcal`.
- Cada campo final usa únicamente la misma clave de los JSON por captura.

Además, el parser por captura empareja etiquetas exactas con sus valores:

- Frecuencia cardiaca media
- Frec. cardiaca máx.
- Calorías totales
- Total de calorías quemadas
- Ritmo medio
- Tiempo total
- Cadencia media de carrera
- Ascenso total

No existe inferencia entre campos.
