# OCR Lab — Garmin Engine V4.3.1

Hotfix del error:

`Cannot read properties of undefined (reading 'parse')`

Causa:
el detector podía identificar una pantalla opcional, pero si su archivo de
parser no estaba cargado o no se había subido correctamente, el registro
devolvía `undefined`.

Solución:

- El registro comprueba que cada parser existe y tiene función `parse`.
- Si falta un parser opcional, utiliza Estadísticas como respaldo.
- El motor muestra errores concretos si falta un componente esencial.
- La extracción estable de V4.2 no se modifica.
