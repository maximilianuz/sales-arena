import { getUserData, getPath, setPath, patchPath } from './lib/firebaseAdmin.js';

const DEFAULT_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, scenario, debriefNotes, votingResults, rubric, listeningLog, stages, sessionDurationMinutes, language = 'es', productPrice, commissionPct, closed, closerUid, closerName, leadUid, observers, transcript, soloMode } = body;

  if (!uid || !scenario) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "uid y scenario son requeridos." }) };
  }

  // Verificar suscripción (solo closer/trainer pueden guardar historial)
  let userData;
  try {
    userData = await getUserData(uid);
    if (userData.subscriptionStatus !== 'active') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Se requiere plan pago para guardar historial." }) };
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error verificando suscripción." }) };
  }

  // La comisión y el progreso se acreditan al CLOSER (quien practicó), no a quien
  // analiza (que puede ser el Trainer/dueño). Si no hay closer registrado, cae al
  // que llama (caso: el propio closer analiza su sesión).
  const creditUid = closerUid || uid;
  let creditData = userData;
  if (creditUid !== uid) {
    try { creditData = await getUserData(creditUid); } catch { creditData = {}; }
  }

  const lang = language.startsWith('en') ? 'en' : 'es';
  const isEn = lang === 'en';

  const debriefText = Object.entries(debriefNotes || {})
    .map(([stage, note]) => `${stage}: ${note}`)
    .join('\n') || (isEn ? 'No notes recorded.' : 'Sin notas registradas.');

  const votingText = (votingResults || [])
    .map(q => `${q.question}: ${q.options?.map(o => `${o.text}(${o.votes})`).join(', ')}`)
    .join('\n') || (isEn ? 'No votes.' : 'Sin votaciones.');

  // Rúbrica estructurada del Observador (1-5). Es observación humana directa →
  // el prompt le pide al modelo que la pondere fuerte.
  const RUBRIC_LABELS = {
    rapport: isEn ? 'Rapport' : 'Rapport',
    real_pain: isEn ? 'Real vs. surface pain' : 'Dolor real vs. superficial',
    value_gap: isEn ? 'Value gap' : 'Brecha de valor',
    recap: isEn ? 'Recap' : 'Recapitulación',
    objection_isolation: isEn ? 'Objection isolation' : 'Aislamiento de objeción',
  };
  const rubricText = rubric && Object.keys(rubric).length
    ? Object.entries(rubric).map(([k, v]) => `${RUBRIC_LABELS[k] || k}: ${v}/5`).join('\n')
    : (isEn ? 'No rubric scores.' : 'Sin puntajes de rúbrica.');

  // Bitácora de escucha activa del Observador (señales reales de la llamada).
  const LL_LABELS = {
    quote: isEn ? 'Key quote' : 'Cita clave',
    realPain: isEn ? 'Real pain' : 'Dolor real',
    realObjection: isEn ? 'Real objection' : 'Objeción real',
    keyMoment: isEn ? 'Decisive moment' : 'Momento decisivo',
  };
  const listeningText = listeningLog
    ? Object.entries(listeningLog).filter(([, v]) => v && String(v).trim()).map(([k, v]) => `${LL_LABELS[k] || k}: ${v}`).join('\n')
    : '';
  const listeningBlock = listeningText || (isEn ? 'No listening notes.' : 'Sin notas de escucha.');

  // Transcript real de la conversación (modo práctica solo contra el comprador
  // IA). Cuando existe es la FUENTE PRIMARIA de verdad: se scorea lo que
  // realmente se dijo, no opiniones de terceros. Se recorta por las dudas.
  const transcriptText = typeof transcript === 'string' && transcript.trim()
    ? transcript.trim().slice(0, 6000)
    : '';
  const transcriptBlock = transcriptText
    ? (isEn
        ? `\n\nFULL CALL TRANSCRIPT (primary source of truth — base your scores on what was ACTUALLY said here):\n${transcriptText}`
        : `\n\nTRANSCRIPT COMPLETO DE LA LLAMADA (fuente primaria de verdad — basá tus puntajes en lo que REALMENTE se dijo acá):\n${transcriptText}`)
    : '';

  // Metodología del coach (DESTILADA y anónima — venta consultiva de alto valor).
  // Fundamenta el feedback en ESTE método, no en consejos genéricos.
  const methodologyEn = `COACH METHODOLOGY (ground your feedback in these principles; this is high-value consultative selling):
- Diagnose before prescribing: never present price or solution until the prospect's trust and commitment are high (9-10/10).
- Isolate the REAL objection vs. the excuse (be Exact, Concrete, Specific). The first objection is usually a smokescreen.
- "Tennis" technique: return objections with a counter-question, without justifying or over-explaining; use tactical silence.
- Detachment and relaxed confidence: lead the frame without anxiety to close ("we are the prize").
- Continuous micro-closes and self-concluding questions that yield initiative to the prospect.
- Facing complacency or low motivation, use reverse psychology / soft disqualification so the prospect defends their interest.
- Appeal to the prospect's vision/emotion, not features/logic. Adapt to their profile (Driver / Enthusiast / Relator / Analyst).`;
  const methodologyEs = `METODOLOGÍA DEL COACH (fundamentá el feedback en estos principios; es venta consultiva de alto valor):
- Diagnosticar antes de recetar: no se presenta precio ni solución hasta que la confianza y el compromiso del prospecto son altos (9-10/10).
- Aislar la objeción REAL vs. la excusa (Exacto, Concreto, Específico). La primera objeción suele ser humo.
- Técnica de "tenis": devolver las objeciones con una contrapregunta, sin justificar ni sobre-explicar; usar silencio táctico.
- Desapego y confianza relajada: liderar el marco sin ansiedad por cerrar ("el premio somos nosotros").
- Micro-cierres continuos y preguntas auto-concluyentes que ceden la iniciativa al prospecto.
- Ante complacencia o baja motivación, psicología inversa / descalificación suave para que el prospecto defienda su interés.
- Apelar a la visión/emoción del prospecto, no a características/lógica. Adaptar al perfil (Directivo / Entusiasta / Empático / Analítico).`;

  const prompt = isEn
    ? `You are an expert sales coach. Analyze this sales roleplay session and provide structured feedback.

${methodologyEn}

LEAD PROFILE:
- Name: ${scenario.demographics?.name || 'Unknown'}
- Industry: ${scenario.demographics?.industry || 'Unknown'}
- Main objection: ${scenario.visibleObjection || 'None'}

SESSION DATA:
- Duration: ${sessionDurationMinutes || 'Unknown'} minutes
- Stages completed: ${stages?.map(s => s.label).join(', ') || 'Unknown'}

DEBRIEF NOTES:
${debriefText}

VOTING RESULTS:
${votingText}

OBSERVER RUBRIC (1-5, structured human scoring — weigh this heavily; it is direct observation of the roleplay):
${rubricText}

OBSERVER ACTIVE-LISTENING LOG (real signals captured from the call — use to ground your feedback):
${listeningBlock}
${transcriptBlock}

Respond ONLY in valid JSON with this exact structure:
{
  "scores": {
    "rapport": <1-10>,
    "objectionHandling": <1-10>,
    "closing": <1-10>,
    "activeListening": <1-10>
  },
  "overallScore": <1-10>,
  "methodScores": {
    "frameControl": <0-10>,
    "painDepth": <0-10>,
    "objectionIsolation": <0-10>,
    "detachment": <0-10>,
    "microCommitments": <0-10>
  },
  "wentWell": ["point 1", "point 2", "point 3"],
  "toImprove": ["point 1", "point 2", "point 3"],
  "nextSessionTip": "One specific, actionable tip for the next session, tied to the methodology above."
}
methodScores meaning: frameControl = led the frame with detachment (not needy); painDepth = reached the real/emotional pain, not the surface excuse; objectionIsolation = isolated the true objection with counter-questions instead of justifying; detachment = relaxed confidence without anxiety to close; microCommitments = embedded micro-closes and self-concluding questions.`
    : `Eres un coach experto en ventas consultivas. Analizá esta sesión de roleplay de ventas y dá feedback estructurado.

${methodologyEs}

PERFIL DEL LEAD:
- Nombre: ${scenario.demographics?.name || 'Desconocido'}
- Industria: ${scenario.demographics?.industry || 'Desconocida'}
- Objeción principal: ${scenario.visibleObjection || 'Ninguna'}

DATOS DE SESIÓN:
- Duración: ${sessionDurationMinutes || 'Desconocida'} minutos
- Etapas completadas: ${stages?.map(s => s.label).join(', ') || 'Desconocidas'}

NOTAS DEL DEBRIEF:
${debriefText}

RESULTADOS DE VOTACIÓN:
${votingText}

RÚBRICA DEL OBSERVADOR (1-5, puntaje humano estructurado — ponderála fuerte; es observación directa del roleplay):
${rubricText}

BITÁCORA DE ESCUCHA ACTIVA DEL OBSERVADOR (señales reales capturadas de la llamada — usalas para fundamentar tu feedback):
${listeningBlock}
${transcriptBlock}

Respondé ÚNICAMENTE en JSON válido con esta estructura exacta:
{
  "scores": {
    "rapport": <1-10>,
    "objectionHandling": <1-10>,
    "closing": <1-10>,
    "activeListening": <1-10>
  },
  "overallScore": <1-10>,
  "methodScores": {
    "frameControl": <0-10>,
    "painDepth": <0-10>,
    "objectionIsolation": <0-10>,
    "detachment": <0-10>,
    "microCommitments": <0-10>
  },
  "wentWell": ["punto 1", "punto 2", "punto 3"],
  "toImprove": ["punto 1", "punto 2", "punto 3"],
  "nextSessionTip": "Un tip específico y accionable para la próxima sesión, atado a la metodología de arriba."
}
Significado de methodScores: frameControl = lideró el marco con desapego (sin necesidad); painDepth = llegó al dolor real/emocional, no a la excusa de superficie; objectionIsolation = aisló la objeción verdadera con contrapreguntas en vez de justificar; detachment = confianza relajada sin ansiedad por cerrar; microCommitments = metió micro-cierres y preguntas auto-concluyentes.`;

  try {
    const apiUrl = process.env.AI_API_URL || DEFAULT_API_URL;
    const model = process.env.AI_DEFAULT_MODEL || DEFAULT_MODEL;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: "json_object" }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Error en IA");

    const content = data.choices[0].message.content;
    const analysis = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);

    // Guardar en Firebase vía REST
    const sessionId = `session_${Date.now()}`;
    const historyEntry = {
      sessionId,
      savedAt: Date.now(),
      sessionDurationMinutes: sessionDurationMinutes || 0,
      scenario: {
        name: scenario.demographics?.name,
        industry: scenario.demographics?.industry,
        objection: scenario.visibleObjection
      },
      rubric: rubric || null,
      analysis
    };

    await setPath(`/users/${creditUid}/history/${sessionId}`, historyEntry);

    // Gamificación: acumular comisión, racha y stats del CLOSER. El servicio (REST
    // con service account) bypassea las reglas, así que puede escribir en /stats.
    let newTotalEarnings = null; // comisión acumulada tras esta sesión (para el cohorte)
    let sessionEarned = 0;       // comisión de esta sesión puntual
    let closerStats = null;      // stats resultantes del Closer (para el leaderboard)
    let teamSpirit = 'neutral';  // bonus/penalty por ayudar (o no) como Lead/Observador
    try {
      const prev = (creditData && creditData.stats) || {};
      const rubricVals = rubric ? Object.values(rubric).filter(v => typeof v === 'number' && v > 0) : [];
      const rubricAvg = rubricVals.length ? rubricVals.reduce((a, b) => a + b, 0) / rubricVals.length : 0;
      // Comisión USD (cuenta bancaria del Closer): si el trato CERRÓ, gana
      // precio * comisión% (como paga el dueño, configurado en la sala). Si no
      // cerró, un crédito de práctica chico para que el esfuerzo igual cuente.
      const price = Number(productPrice) || 0;
      const pct = Number(commissionPct) || 0;
      let earned;
      if (closed && price > 0) {
        earned = Math.round(price * (pct > 0 ? pct : 10) / 100); // % configurado o 10% por defecto
      } else {
        earned = 50 + Math.round((analysis.overallScore || 0) * 20); // crédito de práctica
      }

      // La práctica SOLO contra la IA vale MENOS que una sesión real con otras
      // personas (lead/observador humanos): entrenás, pero no reemplaza la
      // presión de una llamada real. Se acredita la mitad.
      if (soloMode) earned = Math.round(earned * 0.5);

      const today = new Date().toISOString().slice(0, 10);

      // Espíritu de equipo: acá no hay lobos solitarios. Tras 3 sesiones de
      // gracia (los novatos no se penalizan), si el Closer ayudó como Lead u
      // Observador en los últimos 7 días → +10% de comisión; si hace más de
      // una semana que no ayuda → -15%. Camaradería win-win: para subir en la
      // tabla también hay que entrenar a los demás.
      if ((prev.sessionsCompleted || 0) >= 3) {
        const last = prev.lastSupportDate;
        const daysSince = last ? Math.round((new Date(today) - new Date(last)) / 86400000) : Infinity;
        if (daysSince <= 7) {
          earned = Math.round(earned * 1.10);
          teamSpirit = 'bonus';
        } else {
          earned = Math.round(earned * 0.85);
          teamSpirit = 'penalty';
        }
      }

      let streak = 1;
      if (prev.lastSessionDate) {
        const diffDays = Math.round((new Date(today) - new Date(prev.lastSessionDate)) / 86400000);
        if (diffDays === 0) streak = prev.streak || 1;        // misma fecha
        else if (diffDays === 1) streak = (prev.streak || 0) + 1; // día consecutivo
        else streak = 1;                                       // se cortó la racha
      }

      newTotalEarnings = (prev.totalEarnings || 0) + earned;
      sessionEarned = earned;

      closerStats = {
        totalEarnings: newTotalEarnings,
        sessionsCompleted: (prev.sessionsCompleted || 0) + 1,
        closesCount: (prev.closesCount || 0) + (closed ? 1 : 0),
        bestScore: Math.max(prev.bestScore || 0, analysis.overallScore || 0),
        streak,
        lastSessionDate: today,
        updatedAt: Date.now(),
      };
      // patch (no set) para no pisar campos que no manejamos acá (supportPoints, badges).
      await patchPath(`/users/${creditUid}/stats`, closerStats);
    } catch (e) {
      console.error("No se pudo actualizar stats de gamificación:", e.message);
    }

    // ── Puntos de soporte: Lead y Observadores también suman ─────────────────
    // Menos que la comisión del Closer, pero el rol se reconoce (sin lead no
    // hay práctica; sin observador no hay rúbrica ni bitácora).
    try {
      const hasRubric = !!(rubric && Object.keys(rubric).length);
      const hasListeningLog = !!(listeningLog && Object.values(listeningLog).some(v => v && String(v).trim()));
      const score = analysis.overallScore || 0;

      const supportCredits = [];
      if (leadUid && leadUid !== creditUid) {
        supportCredits.push({ uid: leadUid, role: 'lead', pts: 100 + Math.round(score * 10) });
      }
      const obsPts = 80 + (hasRubric ? 60 : 0) + (hasListeningLog ? 60 : 0);
      for (const ouid of Object.keys(observers || {})) {
        if (ouid !== creditUid && ouid !== leadUid) {
          supportCredits.push({ uid: ouid, role: 'observer', pts: obsPts });
        }
      }

      // En paralelo: cada crédito son 2 llamadas REST y el límite de Netlify es 10s.
      await Promise.all(supportCredits.map(async (c) => {
        try {
          const prevStats = (await getPath(`/users/${c.uid}/stats`)) || {};
          const sessKey = c.role === 'lead' ? 'sessionsAsLead' : 'sessionsAsObserver';
          await patchPath(`/users/${c.uid}/stats`, {
            supportPoints: (prevStats.supportPoints || 0) + c.pts,
            [sessKey]: (prevStats[sessKey] || 0) + 1,
            // Marca de "ayudó hoy": activa el bonus de espíritu de equipo la
            // próxima vez que ese usuario cierre como Closer.
            lastSupportDate: new Date().toISOString().slice(0, 10),
            updatedAt: Date.now(),
          });
        } catch (e) {
          console.error(`No se pudo acreditar soporte a ${c.uid}:`, e.message);
        }
      }));
    } catch (e) {
      console.error("No se pudo acreditar puntos de soporte:", e.message);
    }

    // ── Leaderboard mundial + torneo mensual ─────────────────────────────────
    // El servidor (bypassa rules) mantiene un nodo liviano y público de ranking:
    // global acumulado + temporada YYYY-MM (el "torneo": cada mes arranca de 0).
    if (newTotalEarnings !== null) {
      try {
        const displayName = closerName || scenario?.closerName || 'Closer';
        const country = (creditData && creditData.country) || null; // ISO-2 para la bandera
        const season = new Date().toISOString().slice(0, 7); // YYYY-MM
        await setPath(`/leaderboard/global/${creditUid}`, {
          name: displayName,
          country,
          totalEarnings: newTotalEarnings,
          sessions: closerStats?.sessionsCompleted || 0,
          closes: closerStats?.closesCount || 0,
          updatedAt: Date.now(),
        });
        const prevSeason = (await getPath(`/leaderboard/seasons/${season}/${creditUid}`)) || {};
        await setPath(`/leaderboard/seasons/${season}/${creditUid}`, {
          name: displayName,
          country,
          earnings: (prevSeason.earnings || 0) + sessionEarned,
          closes: (prevSeason.closes || 0) + (closed ? 1 : 0),
          sessions: (prevSeason.sessions || 0) + 1,
          totalEarnings: newTotalEarnings, // para mostrar el rango real en el torneo
          updatedAt: Date.now(),
        });
        // Bucket diario → alimenta las tablas rodantes 7/30 días (estilo Skool).
        const day = new Date().toISOString().slice(0, 10);
        const prevDaily = (await getPath(`/leaderboard/daily/${day}/${creditUid}`)) || {};
        await setPath(`/leaderboard/daily/${day}/${creditUid}`, {
          name: displayName,
          country,
          earnings: (prevDaily.earnings || 0) + sessionEarned,
          closes: (prevDaily.closes || 0) + (closed ? 1 : 0),
          totalEarnings: newTotalEarnings, // para el rango real en la tabla
          updatedAt: Date.now(),
        });
        // Auto-purga: borra el bucket de hace 35 días (solo usamos ventanas de
        // 7/30 → el nodo se mantiene liviano sin cron).
        const cutoff = new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10);
        await setPath(`/leaderboard/daily/${cutoff}`, null);
      } catch (e) {
        console.error("No se pudo actualizar el leaderboard:", e.message);
      }
    }

    // Si el Closer está en un cohorte, propagar un resumen liviano al Trainer
    if (creditData && creditData.joinedTrainerUid) {
      const studentBase = `/cohorts/${creditData.joinedTrainerUid}/students/${creditUid}`;
      try {
        await setPath(`${studentBase}/sessions/${sessionId}`, {
          savedAt: historyEntry.savedAt,
          overallScore: analysis.overallScore || 0,
          scores: analysis.scores || {},
          rubric: rubric || null,
          earned: sessionEarned,
          scenario: historyEntry.scenario
        });
        // Comisión acumulada del alumno → alimenta el leaderboard del cohorte.
        // patch (no set) para no pisar profile/sessions. Solo si la gamificación
        // se calculó bien (si falló, newTotalEarnings queda null).
        if (newTotalEarnings !== null) {
          await patchPath(studentBase, {
            totalEarnings: newTotalEarnings,
            earningsUpdatedAt: Date.now(),
          });
        }
      } catch (e) {
        console.error("No se pudo propagar sesión al cohorte:", e.message);
        // No bloqueamos la respuesta al alumno si esto falla
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId,
        analysis,
        // Info de gamificación para que la UI muestre lo ganado y el estado
        // de espíritu de equipo (bonus/penalty/neutral).
        gamification: { earned: sessionEarned, teamSpirit, solo: !!soloMode }
      })
    };
  } catch (err) {
    console.error("analyze-session error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error generando análisis." }) };
  }
};
