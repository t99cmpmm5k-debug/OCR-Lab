# OCR Lab V2.5 — Clasificador Garmin

Esta versión clasifica cada captura antes de extraer datos:

- Resumen
- Estadísticas
- Frecuencia cardíaca
- Running Dynamics
- Elevación
- Training Effect
- Stamina
- Desconocida

Mejoras principales:

- Bloquea textos de interfaz como «Detección de carrera/caminar – Ayuda».
- Solo intenta obtener el título en una pantalla de resumen.
- Evita tomar como hora del entrenamiento una hora aislada de la barra del móvil.
- Muestra el tipo de pantalla detectado en el panel por captura.
- Mantiene la fusión multicaptura y no sobrescribe datos válidos con vacíos.

No guarda datos y no modifica Corredor Sólido.
