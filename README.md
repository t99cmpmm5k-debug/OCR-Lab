# OCR Lab V3 — Plantillas Garmin

Versión experimental basada en zonas visuales.

Cada captura se divide en:

- Cabecera
- Cuerpo
- Métricas
- Vista completa de apoyo

Después:

1. Se aplica OCR a cada zona por separado.
2. Se clasifica la pantalla Garmin.
3. Se extraen únicamente los campos adecuados.
4. Se fusionan los resultados de todas las capturas.
5. Se conservan los valores con mayor confianza.

Mejoras:

- Excluye la barra de estado del teléfono.
- Evita aceptar «< Carrera :» como título.
- No acepta una hora sin fecha.
- Indica la zona de la que procede cada dato.
- Reduce falsos positivos de navegación.
- Mantiene avisos para datos sospechosos.

No modifica ni guarda datos en Corredor Sólido.
