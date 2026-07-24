# Changelog

## 2.0.0 — Base definitiva

- Proyecto reconstruido con estructura fija y archivos separados.
- Versión visible `OCR LAB · V2.0.0` para comprobar que GitHub publica el archivo correcto.
- OCR aislado en `ocr/worker.js`.
- Parser Garmin contextual aislado en `parser/garmin.js`.
- Autoprueba interna del parser al cargar.
- Vista previa, progreso, confianza, tiempo, texto bruto y JSON normalizado.
- Métricas ausentes quedan como `null`; no se inventan datos.
- Compatible con etiquetas y valores situados antes o después en el texto OCR.
