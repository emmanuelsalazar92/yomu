# Informe de estado de Yomu para evaluar próximas mejoras

## Instrucción para ChatGPT

Actúa como especialista en producto educativo infantil, alfabetización inicial en español, accesibilidad y desarrollo de aplicaciones web. Analiza el estado actual de Yomu descrito abajo y propone las próximas mejoras.

La aplicación está dirigida principalmente a un niño de 5 años que comienza a reconocer letras, sonidos, vocales, consonantes, sílabas y palabras. Las propuestas deben mantener una experiencia tranquila, táctil, fácil de entender, sin presión de tiempo y con intervención mínima del adulto durante el juego.

No propongas como novedad algo que ya esté implementado. Para cada recomendación indica:

1. Problema u oportunidad que resuelve.
2. Beneficio pedagógico para un niño de 5 años.
3. Experiencia concreta del niño y del adulto.
4. Prioridad: alta, media o baja.
5. Esfuerzo técnico aproximado: pequeño, medio o grande.
6. Riesgos, dependencias o decisiones necesarias.
7. Cómo medir si la mejora funciona sin recopilar datos personales innecesarios.

Entrega al final:

- Un ranking de las 10 mejores mejoras.
- Las 3 mejores mejoras para implementar inmediatamente.
- Un plan sugerido en tres etapas: corto, mediano y largo plazo.
- Una lista separada de mejoras pedagógicas, de experiencia de usuario, administrativas y técnicas.

## 1. Propósito del producto

Yomu es una aplicación web privada de alfabetización inicial en español. Busca que el niño practique mediante sesiones cortas y amables, con botones grandes, pistas visuales y auditivas, retroalimentación clara y ausencia de publicidad, cronómetros o estímulos excesivos.

La experiencia se divide en:

- Una zona infantil para jugar y practicar.
- Un panel autenticado para que el adulto prepare contenido, configure ejercicios y consulte el progreso.

Los perfiles infantiles solamente requieren apodo y avatar opcional. La aplicación no solicita nombre completo, voz, cámara, ubicación ni otros datos personales.

## 2. Experiencia infantil disponible

### Selección de perfil

- Pantalla inicial con perfiles infantiles activos.
- Cada perfil contiene un apodo y un avatar.
- La configuración y el progreso se asocian al perfil seleccionado.

### Rutas guiadas prearmadas

Existen tres rutas listas para jugar:

- 5 minutos: 5 actividades.
- 10 minutos: 10 actividades.
- 15 minutos: 15 actividades.

Las rutas combinan proporcionalmente:

- Reconocimiento del sonido inicial.
- Construcción de palabras por sílabas.
- Trazado de letras.

Cada duración conserva su propio avance diario. Si el niño termina más de una ruta el mismo día, la recompensa del jardín no se incrementa artificialmente varias veces.

Las rutas incluyen:

- Progreso visual por actividad.
- Ayuda y opción de omitir.
- Reanudación del avance guardado.
- Recompensa tranquila con crecimiento de jardín.
- Resumen final para el adulto con fortalezas, elementos para reforzar y recomendación.

### Práctica libre de trazado

- Incluye las 27 letras mayúsculas del alfabeto español, incluida la Ñ.
- Permite repetir una letra 3, 5, 10 o una cantidad personalizada entre 1 y 50 veces.
- No utiliza cronómetro.
- Muestra una guía punteada, contador de repeticiones y progreso visual.
- Permite borrar el dibujo, repetir la serie o elegir otra letra.
- Presenta una celebración tranquila al completar la serie.

Limitación actual importante: el trazado considera terminado un intento después de una cantidad mínima de movimientos del puntero. Todavía no evalúa si el trazo sigue correctamente la forma, dirección u orden de la letra, y la práctica libre no guarda historial ni progreso.

### Sesiones configurables de palabras

El adulto o el niño puede preparar sesiones de 10, 20 o 30 palabras, sujetas a la disponibilidad real de palabras únicas.

Modalidades de ayuda:

- Con imagen.
- Sin imagen.
- Escuchar la palabra.

Ejercicios de vocales:

- Completar una vocal.
- Completar todas las vocales.
- Reconocer la vocal inicial.
- Modo mixto.

Ejercicios de consonantes:

- Completar una consonante faltante.
- Se presentan tres consonantes únicas como opciones.
- El conjunto de consonantes activas lo configura el adulto.

Filtros disponibles:

- Categoría o tema.
- Nivel de dificultad.
- Cantidad de palabras.

### Reglas de respuesta y retroalimentación

- Cada espacio acepta una sola respuesta registrada.
- Una respuesta incorrecta no puede convertirse posteriormente en acierto por descarte.
- Se distinguen resultados correctos, incorrectos, realizados con ayuda y omitidos.
- Después de un error se revela la respuesta correcta y se reproduce la palabra cuando es posible.
- El tiempo de retroalimentación correcta e incorrecta es configurable por el adulto.
- Existen botones de ayuda y omisión.
- Al finalizar se puede iniciar un repaso específico con las palabras que costaron.

### Selección adaptativa y dominio

- No se repiten palabras dentro de una misma sesión.
- El motor prioriza palabras con errores recientes, palabras en aprendizaje y contenido nuevo.
- Las palabras aprendidas se excluyen normalmente, salvo cuando se solicita incluirlas.
- Los estados de aprendizaje son: nueva, aprendiendo, casi aprendida y aprendida.
- El dominio considera precisión reciente, respuestas correctas al primer intento, práctica en sesiones distintas y éxito sin imagen.

## 3. Audio e imágenes

### Audio

- Cada palabra puede usar un MP3 personalizado.
- Si no tiene MP3, se utiliza Text-to-Speech del navegador.
- Si falla el audio personalizado, existe fallback a voz automática cuando está disponible.
- El volumen es configurable y se conserva en el dispositivo.
- El audio puede escucharse directamente desde la tabla administrativa de palabras.
- Los MP3 se validan por contenido, extensión, MIME y tamaño máximo de 5 MB.

Limitación actual: la calidad y disponibilidad de la voz automática dependen del navegador y del sistema operativo.

### Imágenes

- Las palabras pueden tener imágenes JPG, PNG o WebP de hasta 5 MB.
- El adulto ve claramente cuáles palabras tienen o no tienen imagen.
- La tabla muestra miniaturas.
- Se puede subir, cambiar o quitar la imagen directamente desde cada fila.
- El modo con imagen usa un placeholder tranquilo cuando no existe una imagen.

## 4. Panel administrativo

### Biblioteca de palabras

- Crear y editar palabras individualmente.
- Activar, pausar o eliminar palabras.
- Seleccionar visualmente las posiciones de vocales y consonantes que pueden ocultarse.
- Configurar uno o varios tipos de ejercicio por palabra.
- Asignar categoría y nivel.
- Subir imagen y MP3.
- Probar voz automática y reproducir MP3.
- Escuchar el audio desde la tabla.

### Carga múltiple

- Permite agregar hasta 100 palabras por operación.
- Acepta una palabra por línea o palabras separadas por coma o punto y coma.
- Aplica categoría, nivel y ejercicios comunes.
- Detecta automáticamente las posiciones de vocales y consonantes.
- Normaliza mayúsculas y elimina repetidas dentro de la carga.
- Omite palabras existentes en la categoría.
- Devuelve un reporte de creadas, omitidas y rechazadas con el motivo.

### Perfiles, categorías y ajustes

- Gestión de perfiles infantiles.
- Gestión de categorías.
- Configuración de consonantes activas.
- Configuración del tiempo de retroalimentación.
- Cambio de contraseña administrativa.

### Seguimiento

El panel muestra:

- Cantidad de palabras activas.
- Cantidad de perfiles.
- Palabras aprendidas.
- Precisión general.
- Distribución entre nuevas, aprendiendo y aprendidas.
- Sesiones recientes.
- Progreso por perfil, palabra, modalidad y ejercicio.
- Precisión reciente y estado de aprendizaje.
- Acciones para reactivar o reiniciar una habilidad.

## 5. Persistencia y modelo de aprendizaje

Se guardan de forma estructurada:

- Sesiones y ejercicios asignados.
- Primera respuesta de cada espacio.
- Resultado correcto, incorrecto, asistido u omitido.
- Errores, reproducciones de audio y tiempo de respuesta.
- Progreso por palabra, ejercicio y modalidad.
- Progreso por letra.
- Rutas diarias, actividades, objetivos y recompensas.

La práctica libre de trazado es actualmente recreativa y no se persiste.

## 6. Tecnología y operación

- Next.js App Router.
- React y TypeScript estricto.
- PostgreSQL.
- Prisma ORM y migraciones versionadas.
- Docker Compose para aplicación y base de datos.
- Volúmenes persistentes separados para PostgreSQL y archivos multimedia.
- Ruta de salud en `/api/health`.
- Seed idempotente con administrador, perfil y palabras de demostración.
- Compatibilidad de despliegue local y Apple Silicon.

Seguridad actual:

- Panel administrativo autenticado.
- Contraseñas con bcrypt.
- Cookie firmada, `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Validación del contenido real de archivos multimedia.
- Rutas controladas para servir archivos.
- Eliminación segura de archivos reemplazados o sin referencias.

Pruebas:

- Vitest para reglas de dominio y componentes lógicos.
- Playwright para flujos completos.
- Pruebas responsive en 390×844, 412×915, 768×1024, 1024×768 y 1440×900.
- Actualmente existen 70 pruebas unitarias aprobadas, además de pruebas E2E para administración, audio, sesiones, rutas guiadas y trazado.

## 7. Principios que deben conservarse

- Adecuado para un niño de aproximadamente 5 años.
- Interfaz táctil, simple y con objetivos visibles.
- Botones y áreas interactivas grandes.
- Sin presión de tiempo para el niño.
- Sin aciertos artificiales por descarte.
- Una respuesta registrada por objetivo.
- Retroalimentación calmada y comprensible.
- Ayuda disponible sin convertirla en acierto autónomo.
- Privacidad por diseño y recopilación mínima de datos.
- El adulto controla contenido y configuración; el niño puede jugar con poca asistencia.
- Mantener español como idioma principal y respetar tildes, Ü y Ñ.

## 8. Limitaciones y oportunidades conocidas

- El trazado no valida geometría, dirección ni orden de los trazos.
- La práctica libre de trazado no alimenta el progreso del perfil.
- No existen ejercicios explícitos de minúsculas.
- No hay reconocimiento de escritura manuscrita.
- No hay actividades de conciencia fonológica más allá de sonido inicial y sílabas.
- No hay ejercicios de rimas, segmentación fonémica, unión de sonidos o lectura de frases breves.
- La voz TTS varía según dispositivo.
- Los medios se almacenan en un volumen local; no hay almacenamiento de objetos.
- El límite de intentos de acceso funciona por proceso; varias réplicas requerirían almacenamiento compartido.
- No hay modo offline ni aplicación instalable PWA.
- No hay importación de imágenes o audio en lote.
- No existe exportación de informes para el adulto.
- No existe un sistema formal de objetivos semanales o recomendaciones configurables por perfil.
- No se recopila analítica externa, lo cual es deliberado por privacidad; cualquier medición futura debería ser local o agregada.

## 9. Pregunta principal

Con este estado actual, ¿cuáles deberían ser las próximas mejoras de Yomu para maximizar el aprendizaje, la motivación saludable y la autonomía de un niño de 5 años, sin aumentar innecesariamente la complejidad para el adulto ni comprometer la privacidad?

Prioriza primero mejoras con alto beneficio pedagógico y bajo o mediano esfuerzo. Señala expresamente cuáles requieren validación con un especialista en alfabetización inicial, terapeuta, docente o familia antes de implementarse.
