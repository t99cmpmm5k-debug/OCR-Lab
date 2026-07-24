# OCR Lab V2.4

Laboratorio independiente para procesar varias capturas Garmin de una misma actividad.

## Cambios
- Selección múltiple.
- OCR secuencial para evitar saturar el iPhone.
- Preprocesado automático: escalado, escala de grises, contraste e inversión.
- Segunda pasada binaria solo cuando la primera lectura es débil.
- Parser por captura.
- Fusión por confianza sin sobrescribir datos válidos con vacíos.
- Panel de depuración por captura.
- JSON único.

No guarda datos ni modifica Corredor Sólido.
