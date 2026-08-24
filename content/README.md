# /content — Contenido de entrenamiento (closing high ticket)

Contenido del sistema de entrenamiento. **Nada de esto vive en el código de la app**: estos archivos son el seed inicial de la base de datos por usuario; una vez importados, todo se edita desde la interfaz (CRUD).

## Estructura

```
content/
  seed/    ← fuente de verdad, formato listo para importar a Firebase
    principios.json            15 principios con explicación de referencia (modo Feynman)
    flashcards.objeciones.json      24 cartas
    flashcards.preguntas-fase.json  18 cartas (3 por cada una de las 6 fases)
    flashcards.principios.json      15 cartas Feynman (referencian principios.json por principioId)
    flashcards.perfiles.json        13 cartas de detección de perfiles
    oferta.metodo-reinicio.json     oferta ficticia + guion completo por 6 fases
    perfiles-prospecto.json         7 perfiles parametrizados para el simulador
  print/   ← generado, para imprimir. NO editar a mano
    mazo-inicial.md            las 70 cartas (Feynman con puntos clave como checklist)
    guion-metodo-reinicio.md   guion por fases + oferta en una página
    plantilla-auditoria.md     plantilla de auditoría por llamada (esta SÍ se edita a mano)
```

## Reglas

- **Única fuente de verdad: `seed/`.** Para editar una carta, el guion o un perfil, editá el JSON y regenerá lo imprimible:

  ```
  node scripts/render-content-print.mjs
  ```

- **Los principios son la entidad central.** Toda carta lleva `principioId`: la respuesta correcta nunca viene sola, viene con el porqué. Las cartas Feynman no duplican la explicación: la toman de `principios.json` por join.
- **Todo es agregable sin tocar código**: una objeción nueva es un objeto más en el array; una oferta real nueva copia la estructura de `oferta.metodo-reinicio.json`.

## Cómo practicar en papel (mientras la app no está)

1. **Mazo** (`print/mazo-inicial.md`): leé el frente, respondé **en voz alta** (no mentalmente — el objetivo es entrenar la boca, no el ojo), después mirá el dorso. En las Feynman, explicá completo y marcá qué puntos clave te faltaron.
2. **Guion** (`print/guion-metodo-reinicio.md`): no lo memorices palabra por palabra; memorizá el objetivo de cada fase, el checklist de transición y el *porqué* de cada pregunta. Practicá fases sueltas en voz alta.
3. **Auditoría** (`print/plantilla-auditoria.md`): imprimí una copia por roleplay (aunque sea contra un espejo o grabándote) y completala al terminar. El punto 4 (patrón recurrente → flashcard nueva) es el que más te va a hacer mejorar.
