import { getUserData, setPath } from './lib/firebaseAdmin.js';

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

  const { uid, scenario, debriefNotes, votingResults, rubric, stages, sessionDurationMinutes, language = 'es' } = body;

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

  const prompt = isEn
    ? `You are an expert sales coach. Analyze this sales roleplay session and provide structured feedback.

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

Respond ONLY in valid JSON with this exact structure:
{
  "scores": {
    "rapport": <1-10>,
    "objectionHandling": <1-10>,
    "closing": <1-10>,
    "activeListening": <1-10>
  },
  "overallScore": <1-10>,
  "wentWell": ["point 1", "point 2", "point 3"],
  "toImprove": ["point 1", "point 2", "point 3"],
  "nextSessionTip": "One specific, actionable tip for the next session."
}`
    : `Eres un coach experto en ventas consultivas. Analizá esta sesión de roleplay de ventas y dá feedback estructurado.

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

Respondé ÚNICAMENTE en JSON válido con esta estructura exacta:
{
  "scores": {
    "rapport": <1-10>,
    "objectionHandling": <1-10>,
    "closing": <1-10>,
    "activeListening": <1-10>
  },
  "overallScore": <1-10>,
  "wentWell": ["punto 1", "punto 2", "punto 3"],
  "toImprove": ["punto 1", "punto 2", "punto 3"],
  "nextSessionTip": "Un tip específico y accionable para la próxima sesión."
}`;

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

    await setPath(`/users/${uid}/history/${sessionId}`, historyEntry);

    // Si el alumno está en un cohorte, propagar un resumen liviano al Trainer
    if (userData.joinedTrainerUid) {
      try {
        await setPath(`/cohorts/${userData.joinedTrainerUid}/students/${uid}/sessions/${sessionId}`, {
          savedAt: historyEntry.savedAt,
          overallScore: analysis.overallScore || 0,
          scores: analysis.scores || {},
          rubric: rubric || null,
          scenario: historyEntry.scenario
        });
      } catch (e) {
        console.error("No se pudo propagar sesión al cohorte:", e.message);
        // No bloqueamos la respuesta al alumno si esto falla
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ sessionId, analysis }) };
  } catch (err) {
    console.error("analyze-session error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error generando análisis." }) };
  }
};
