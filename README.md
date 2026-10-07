# Sistema Huellas del Valle

Interfaz propia para el Parcial 1: agendamiento de citas de la Clínica Veterinaria Huellas del Valle S.A.S.

## Archivos
- `index.html`: vistas de Agendar cita y Agenda del día.
- `styles.css`: diseño visual.
- `app.js`: envío del formulario al webhook de Make y lectura de la hoja Citas.

## Conexiones pendientes
En `app.js`, cambiar:

- `MAKE_WEBHOOK_URL`: URL del Custom Webhook del Escenario 1 de Make.
- `CITAS_CSV_URL`: URL pública CSV de la hoja `Citas`.

No guardar tokens, contraseñas o claves en este repositorio.

## Campos enviados al webhook
`propietario`, `correo`, `mascota`, `especie`, `servicio`, `fecha`, `hora`.

## Respuesta esperada del escenario 1
La interfaz acepta respuestas JSON con nombres como:

- `resultado`
- `mensaje`
- `titulo`
- `fecha`
- `hora`
- `libres`

El escenario puede devolver, por ejemplo: `CONFIRMADA`, `CONFIRMADA CON ALERTA`, `RECHAZADA`, o `RUTA DE RESPALDO`.
