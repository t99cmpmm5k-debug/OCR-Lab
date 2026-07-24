# OCR Lab — Garmin Engine V4.2 estable

Esta versión vuelve a la base V4.1, que era la que recuperaba más campos.

Solo corrige dos fallos:

- `Frec. cardiaca máx.` / `Frecuencia cardiaca máxima` → FC máxima.
- `Calorías totales` / `Total de calorías quemadas` → calorías.

Causa del fallo:
las etiquetas contienen acentos (`máx.`, `Calorías`) y el extractor anterior
aplicaba las expresiones sobre texto sin normalizar.

No se ha cambiado:

- OCR multicaptura.
- Diseño.
- Clasificación de pantallas.
- Título, lugar, actividad, fecha y hora.
- Distancia, FC media, ritmo, tiempo, cadencia y desnivel.
- Sistema de fusión.
