# OCR Lab — Garmin Engine V6

Arquitectura:

1. Cada captura se procesa por separado.
2. Cada captura genera un JSON estructurado propio.
3. El fusionador solo combina JSON válidos.
4. Los conflictos se resuelven por confianza, prioridad y consenso.

Ejemplo por captura:

```json
{
  "screen_type": "statistics",
  "metrics": {
    "avg_heart_rate_bpm": 153,
    "max_heart_rate_bpm": 188,
    "avg_pace_min_km": "8:24",
    "total_time": "33:17"
  }
}
```

La captura Resumen conserva título, lugar, actividad, fecha y hora.
Las capturas Estadísticas completan FC máxima, calorías, cadencia, desnivel y temperatura.
