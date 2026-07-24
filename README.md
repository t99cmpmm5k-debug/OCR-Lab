# OCR Lab — Garmin Engine V4

Motor basado en:

1. Detección de pantalla.
2. Etiqueta Garmin.
3. Valor asociado antes o después de la etiqueta.
4. Validación por tipo de dato.
5. Fusión multicaptura.

Validaciones:

- Distancia: 0,05–500 km.
- FC: 35–240 ppm.
- Ritmo: 1:00–30:59 /km.
- Cadencia: 80–260 ppm.
- Calorías: 1–10.000 kcal.
- Temperatura: −40–65 °C.
- Desnivel: 0–20.000 m.

Esto evita errores como:

- 153 km al confundir FC con distancia.
- 8:24 como tiempo total.
- 153 kcal al confundir FC con calorías.
