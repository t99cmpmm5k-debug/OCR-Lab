# OCR Lab — Garmin Engine V5

Arquitectura:

1. OCR por captura.
2. Detección de pantalla.
3. Parser de identidad.
4. Extracción de todos los candidatos posibles.
5. Validación por tipo.
6. Resolución de conflictos.
7. JSON final.

Novedades:

- Cada captura genera sus propios candidatos.
- El resolver compara prioridad, confianza y consenso.
- La pantalla Resumen conserva la propiedad de título, lugar, actividad, fecha y hora.
- Las capturas Estadísticas compiten por FC máxima, calorías, cadencia y desnivel.
- Calorías totales tiene más prioridad que calorías activas.
- FC media y FC máxima se resuelven como campos independientes.
