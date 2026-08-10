# Audio de palabras

Yomu pronuncia cada palabra con una única fuente activa. La prioridad es:

1. MP3 personalizado válido.
2. Text-to-Speech del navegador (`es-CR`, velocidad 0.8, tono 1 y volumen 1).
3. Aviso no bloqueante; el ejercicio continúa en silencio.

El panel de palabras permite crear y editar sin audio, subir un MP3 opcional, escucharlo antes de
guardar, reemplazarlo o retirarlo. Las nuevas cargas deben tener extensión `.mp3`, MIME
`audio/mpeg` y un máximo de 5 MB. El servidor verifica MIME declarado, extensión y contenido real,
genera un UUID y guarda solo la ruta y el MIME en PostgreSQL.

## Persistencia, respaldo y restauración

Los MP3 se guardan junto con los demás medios en `MEDIA_ROOT`. Docker Compose monta el volumen
nombrado `yomu_media` en `/app/uploads`, por lo que sobrevive a `docker compose down`, despliegues y
recreaciones del contenedor. El respaldo y la restauración del volumen documentados en el README
incluyen automáticamente estos archivos. No use `docker compose down -v` salvo que quiera eliminar
deliberadamente todos los datos persistentes.

Al reemplazar un archivo, Yomu escribe primero el nuevo, actualiza la referencia dentro de una
transacción y luego retira el anterior si ya no tiene referencias. Al retirar el audio o eliminar
lógicamente la palabra, se limpia el archivo sin alterar intentos ni resultados históricos.

## Matriz de validación manual

Las pruebas automatizadas mockean las APIs multimedia y verifican decisiones, cancelación,
fallback y layout. No demuestran la calidad ni la disponibilidad de una voz física.

| Dispositivo | Navegador      |       TTS |       MP3 | Repetición | Cambio de ejercicio |
| ----------- | -------------- | --------: | --------: | ---------: | ------------------: |
| iPhone      | Safari         | Pendiente | Pendiente |  Pendiente |           Pendiente |
| iPad        | Safari         | Pendiente | Pendiente |  Pendiente |           Pendiente |
| Android     | Chrome         | Pendiente | Pendiente |  Pendiente |           Pendiente |
| Escritorio  | Chrome         | Pendiente | Pendiente |  Pendiente |           Pendiente |
| Escritorio  | Safari/Firefox | Pendiente | Pendiente |  Pendiente |           Pendiente |

Pruebe en cada dispositivo: primer toque sobre **Escuchar**, varios toques rápidos, MP3 válido,
fallback al impedir su carga, respuesta correcta, cambio de pregunta, cambio de pestaña y
bloqueo/desbloqueo de pantalla. Safari y Android pueden ofrecer voces distintas o ignorar ajustes
finos de velocidad y tono; Yomu usa detección de capacidades y permite continuar si ambas fuentes
fallan.
