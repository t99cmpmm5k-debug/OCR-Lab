# Changelog

## 2.1.0
- Panel de diagnóstico técnico visible.
- Muestra si cargan Tesseract, Web Workers, HTTPS, conexión y parser.
- Sustituye el error genérico por el mensaje exacto y su contexto.
- OCR inicializado con `createWorker` y español para reducir memoria en iPhone.
- Rutas CDN explícitas para worker, core y datos de idioma.
- El worker se cierra tras cada lectura.
- No modifica el parser Garmin ni guarda datos.
