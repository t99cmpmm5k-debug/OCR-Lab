# OCR Lab V2

Base independiente para probar OCR y parser Garmin antes de integrarlos en Corredor Sólido.

## Instalación en GitHub Pages

1. Borra los archivos antiguos del repositorio `OCR-Lab`.
2. Descomprime este ZIP.
3. Sube **el contenido** de la carpeta, no el ZIP.
4. La raíz del repositorio debe contener `index.html`, `styles.css`, `app.js`, `README.md` y las carpetas `parser`, `ocr` y `assets`.
5. En Settings → Pages selecciona la rama principal y `/root`.

La pantalla correcta muestra arriba `OCR LAB · V2.0.0`.

## Estructura

- `index.html`: pantalla.
- `styles.css`: diseño.
- `app.js`: flujo y renderizado.
- `ocr/worker.js`: conexión con Tesseract.
- `parser/garmin.js`: parser Garmin contextual.
- `CHANGELOG.md`: cambios verificables.

No guarda entrenamientos y no modifica Corredor Sólido.
