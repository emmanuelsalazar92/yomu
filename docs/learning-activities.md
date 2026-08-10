# Actividades independientes de lectoescritura

Yomu incorpora `CASE_MATCH`, `NAME_TILES` y `SYLLABLE_COUNT` como tarjetas independientes. No forman parte de las rutas guiadas; esas rutas mantienen su distribución pedagógica actual.

## Arquitectura compartida

Las tres actividades reutilizan un único motor:

- `LearningActivitySession` conserva perfil, tipo, modo, orden, cantidad solicitada/real, estado y relación de repaso.
- `LearningActivityItem` conserva el objetivo, opciones estables, primera respuesta comprobada, respuesta correcta, resultado, ayuda, tiempo y motivo de salto técnico.
- `ActivitySkillProgress` separa el progreso por perfil, actividad, habilidad y modo.

Los campos JSON tienen contratos validados en TypeScript. Para pares se guardan letra y dirección; para nombre se guardan fichas con identificadores únicos y el orden enviado; para sílabas se guardan conteo, separación revisada y referencia a la palabra. El servidor evalúa toda respuesta. Una actualización condicional sobre `outcome IS NULL` garantiza que solo la primera comprobación tenga efecto.

## Migración 20260810000500

La migración agrega:

- `practiceName` opcional y `nameActivityEnabled=false` a perfiles.
- `syllables=[]` a palabras.
- el enum `LearningActivityType` y las tres tablas compartidas.

No cambia ni elimina columnas, sesiones o progreso existentes. Los defaults mantienen desactivada la práctica del nombre y dejan las palabras existentes fuera del conteo hasta que un adulto revise sus sílabas.

## Configuración manual

En **Admin → Perfiles**, edita un perfil, escribe “Nombre para practicar”, revisa la vista previa y activa la actividad. El apodo solo se copia mediante el botón explícito.

En **Admin → Palabras**, edita una palabra y escribe una separación como `MAN-ZA-NA`. Yomu valida que tenga de una a cuatro partes y que, al unirlas preservando tildes y diéresis, forme exactamente la palabra. La carga múltiple nunca inventa sílabas.

## Audio y privacidad

El conteo reproduce el MP3 personalizado cuando existe y usa el TTS local como respaldo. Los pares y el nombre usan TTS local para la retroalimentación. No se envían nombres a servicios externos, no se graba voz y solo se almacena la respuesta comprobada, no cada movimiento de ficha.

## Umbrales y límites

El modo mixto del nombre comienza con modelo. Pasa a sin modelo a partir de tres aciertos sin ayuda y 80 % de precisión; ambos valores están centralizados en `lib/learning-activities.ts`. Las sesiones de pares y sílabas ofrecen 5 o 10 como máximo y reducen la cantidad cuando hay menos objetivos elegibles. Las palabras marcadas como aprendidas no entran en sesiones normales de sílabas, pero sí pueden aparecer en un repaso explícito ya creado.
