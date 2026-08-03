# Módulo Training — Modelo de datos y plan de integración

> Propuesta para aprobación. Criterio rector: reutilizar lo que ya funciona en Sales Arena y construir el módulo nuevo como datos-primero (cero contenido en código).

## 1. Qué se reutiliza del repo

| Existente | Se reutiliza para | Cómo |
|---|---|---|
| Auth + `SubscriptionContext` + `SubscriptionGate` | Acceso multi-usuario | El módulo entra detrás del mismo gate; cada usuario ve solo su subtree |
| Patrón `library.js` (CRUD RTDB por usuario con `onValue`) | Todo el CRUD de la base de conocimiento | Mismo patrón: `users/{uid}/training/...` |
| `roleplay-turn.js` (proxy IA server-side, system+messages) | Simulador nuevo | Misma forma de función, pero contra la API de Anthropic (`ANTHROPIC_API_KEY`), función nueva — no se toca la existente |
| `analyze-session.js` (análisis post-sesión server-side) | Patrón del feedback del simulador | Función nueva `training-feedback` con las 5 métricas propias |
| `transcribe.js` / `tts.js` | Roleplay por voz (fase 2) | Sin cambios: el simulador de texto anda primero, voz se enchufa después |
| `StagesEditor` / `defaultStages.js` | Concepto de fases editables | La entidad `fases` del training nace del seed (las 6 fases del guion); se puede ofrecer "importar a sala" más adelante |
| `stats.streak` + History | Referencia de UX | La racha del training se calcula del `log` propio (ver §3), sin depender de suscripción ni del server |
| Módulo `modules/proposals/` | Patrón de módulo autocontenido | `src/modules/training/` con la misma estructura, ruta lazy `/training` en `App.jsx` |

Lo que **no** se toca: rooms, cohorts, leaderboard, pagos, scouting. El training es aditivo.

## 2. Principios de diseño

1. **Datos-primero:** el código no conoce ninguna objeción, principio ni ejercicio. Todo vive en RTDB bajo el usuario; `content/seed/*.json` se importa en el primer uso (botón "Importar contenido inicial") y desde ahí todo es CRUD en la UI.
2. **Contenido y progreso separados:** el estado SRS de una carta vive en otro nodo que la carta. Editar o re-importar contenido nunca destruye el progreso de estudio.
3. **Los principios son la entidad pivote:** todo (`objeciones`, `cartas`, `guion`, feedback del simulador) referencia `principioId`. La respuesta nunca viaja sin su porqué.
4. **Ejercicios generados, no predefinidos:** el plan semanal y las sesiones de práctica se generan combinando el contenido disponible (cartas vencidas según FSRS + perfiles no dominados + fases débiles según métricas). Un ejercicio es una consulta, no un registro.

## 3. Árbol RTDB

Todo bajo `users/{uid}/training/` (dueño único, lectura/escritura solo del dueño):

```
users/{uid}/training/
  kb/                              ← base de conocimiento (CRUD completo en UI)
    principios/{pid}               nombre, resumen, explicacionReferencia, puntosClave[],
                                   comoAplicarlo, errorTipico, updatedAt
    objeciones/{oid}               frente, categoria, tipo, dorso (respuesta modelo),
                                   porQue, principioId, dificultad, tags[]
    ofertas/{ofertaId}             producto, avatar, mecanismo, entregables[], precio{},
                                   garantia, pruebaSocial[], descalificadores[]
    fases/{ofertaId}/{faseId}      orden, nombre, duracionMin, objetivo, preguntas[],
                                   queDar, queReservar, erroresTipicos[], transicion
    perfiles/{perfilId}            (la forma de perfiles-prospecto.json: arquetipo,
                                   resistencia, objecionOculta, pantallas, disparadores,
                                   señalesCompra, notaParaElModelo, dificultad)

  cards/{cardId}                   mazo, tipo (clasica|feynman), frente, dorso, porQue,
                                   principioId, dificultad, tags[], sourceRef?, origen
                                   (seed | manual | auto-patron)
  srs/{cardId}                     estado FSRS: due, stability, difficulty, reps, lapses,
                                   lastReview, state — separado de la carta (principio 2)

  plan/
    config                         diasDisponibles[], horasPorDia{lun..vie}, fechaObjetivo,
                                   nivelActual, rapidCycle (on/off)
    semanas/{aaaa-Wnn}             generado: [{dia, bloques:[{tipo, min, refs, hecho}]}]
                                   — regenerable cuando cambia la disponibilidad real

  sesiones/{sessionId}             tipo (roleplay|drill-fase|flashcards|feynman),
                                   perfilId?, ofertaId?, faseFoco?, transcript?,
                                   metricas{...§5}, feedback{}, duracionMin, ts
  auditorias/{auditId}             la plantilla de auditoría digitalizada (por sesión IA
                                   o llamada real manual), sesionId?, respuestas{}
  patrones/{patternId}             error recurrente detectado: descripcion, principioId,
                                   ocurrencias[], cardId? (carta generada), estado
  log/{aaaa-mm-dd}                 bloquesHechos, minutos, autoevaluacion (1-10), notas
  stats                            racha, minutosAcumulados, distribucion por tipo
                                   (derivable del log; se cachea acá para el dashboard)
```

### Reglas de seguridad (extensión de `database.rules.json`)

```json
"users": { "$uid": { "training": {
  ".read": "$uid === auth.uid",
  ".write": "$uid === auth.uid",
  "sesiones": { "$sid": { ".validate": "newData.hasChildren(['tipo','ts'])" } },
  "log": { "$day": { ".validate": "newData.hasChildren(['minutos'])" } }
} } }
```

Nota: acá no hace falta el patrón `.write: false` + admin del historial existente (eso protege comisiones/leaderboard compartidos). El training es privado del usuario y no alimenta ranking: no hay incentivo de trampa, y reglas simples = menos fricción. Las funciones Netlify escriben igual vía Admin SDK cuando conviene (feedback post-sesión).

## 4. Funciones Netlify nuevas (API de Anthropic, key server-side)

| Función | Rol | Modelo (env-overrideable) |
|---|---|---|
| `training-roleplay.js` | Un turno del prospecto. System prompt construido server-side desde perfil + oferta + dificultad. Devuelve JSON `{reply, emocion, corte?, motivoCorte?}` — `corte` implementa el rapid-cycle (configurable on/off desde `plan/config`) | `claude-sonnet-5` |
| `training-feedback.js` | Análisis post-sesión: métricas de juicio (§5) + feedback por fase anclado a `principioId`s + detección de patrón recurrente (compara con `patrones/`) | `claude-sonnet-5` |
| `training-feynman.js` | Compara la explicación escrita del usuario contra `explicacionReferencia` + `puntosClave`; devuelve puntos cubiertos/faltantes/incorrectos | `claude-haiku-4-5` (barato y rápido: es una comparación, no generación) |

Redirects `/api/training-*` en `netlify.toml`, mismo esquema que las existentes. Presupuesto de timeout (10 s Netlify): respuestas JSON cortas y `max_tokens` acotado, igual que resuelve hoy `roleplay-turn.js`.

## 5. Las 5 métricas — quién mide qué

| Métrica | Cómo se mide |
|---|---|
| Ratio de habla | Determinístico en código (chars/palabras por rol del transcript). En voz: duración de audio por turno |
| Preguntas abiertas vs afirmaciones | Determinístico (heurística `¿…?` + arranque interrogativo) con corrección del modelo en el feedback |
| Precio antes de cuantificar dolor | Modelo (requiere juicio: detectar mención de precio y si hubo número de dolor antes) |
| Palabras exactas del prospecto reusadas | Determinístico (n-gramas del prospecto que reaparecen en turnos del closer) + validación del modelo |
| Silencios sostenidos | Solo medible en modo voz (timestamps de `transcribe`). En texto: se auto-reporta en la auditoría — la UI lo deja claro para no inventar datos |

Todo se persiste en `sesiones/{id}/metricas` → dashboard de evolución + si un error se repite 3+ veces, `training-feedback` crea el patrón y la carta automática (origen `auto-patron`) que entra al ciclo FSRS.

## 6. SRS: FSRS, implementación propia

`src/modules/training/srs/fsrs.js` — puro, sin dependencias (~80 líneas: scheduler FSRS-4.5 con pesos default). Rating de 4 botones (Otra vez / Difícil / Bien / Fácil). Las cartas Feynman toman el rating del resultado de `training-feynman` (faltaron 0 puntos → Bien/Fácil; faltaron ≥2 → Otra vez) con override manual.

## 7. Generador de plan

`src/modules/training/planner.js` — función pura: `(config, estado) → semana`. Reglas embebidas como parámetros con defaults (bloques 50', ≥50 % práctica hablada, interleaving, repaso liviano al final del día, rampa de dificultad según semanas restantes a `fechaObjetivo`). "Estado" = cartas vencidas, perfiles por dificultad no superados, fases con métricas débiles → los bloques referencian contenido real. Si un día cambia la disponibilidad, se regenera el resto de la semana sin tocar lo ya hecho.

## 8. Estructura frontend

```
src/modules/training/
  TrainingHome.jsx        dashboard: racha, plan de hoy, métricas
  kb/                     CRUD (principios, objeciones, ofertas+guion, perfiles)
  flashcards/             sesión de repaso FSRS + modo Feynman
  roleplay/               simulador (texto primero; voz reutiliza transcribe/tts)
  audit/                  auditoría por sesión + dashboard de evolución
  planner/                config de disponibilidad + vista semanal
  log/                    registro diario + racha
  seedImport.js           importa content/seed/* al subtree del usuario (primera vez)
  srs/fsrs.js  planner.js
```

Ruta `/training` lazy en `App.jsx` (mismo patrón que Room/Lobby) + tarjeta de acceso en el Lobby.

## 9. Orden de implementación

1. **Base de conocimiento + import del seed** (CRUD completo) → reglas RTDB
2. **Flashcards FSRS + modo Feynman** (`training-feynman.js`) → *acá ya se puede practicar a diario*
3. **Registro de práctica + racha** (log, barato y motivador temprano)
4. **Simulador de roleplay** (`training-roleplay.js`, texto) + rapid-cycle
5. **Auditoría + métricas + dashboard** (`training-feedback.js`, patrones → cartas auto)
6. **Generador de plan** (usa los datos de todo lo anterior)
7. Fase 2 (post-MVP): voz en roleplay, importar fases del training a las salas multiplayer
```
