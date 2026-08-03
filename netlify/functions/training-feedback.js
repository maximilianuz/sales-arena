import { getUserData } from './lib/firebaseAdmin.js';

// Auditoría de una sesión de roleplay del módulo Training.
//
// División de trabajo deliberada: las 5 MÉTRICAS se calculan en el cliente
// (audit/metrics.js) con reglas deterministas y llegan acá ya resueltas. El
// modelo NO las recalcula ni las discute — las recibe como hechos y solo aporta
// lo que una regla no puede: interpretación cualitativa y los errores de método
// anclados a un principio. Un número inventado por un LLM no sirve para medir
// progreso entre sesiones.

// Mismo motivo que en training-roleplay: el 70B tarda 9-17s con prompts de este
// tamaño y Netlify corta a los 10s. Acá el prompt es AÚN más grande (transcript
// completo), así que el 8B es la única opción que entra. Override: FEEDBACK_MODEL.
const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
const FALLBACK_MODEL = "meta/llama-3.1-8b-instruct";

const resumenMetricas = (m) => {
  if (!m) return 'Sin métricas.';
  const lineas = [];
  if (m.ratioHabla) lineas.push(`- Ratio de habla: el closer habló ${m.ratioHabla.porcentajeCloser}% (objetivo ${m.ratioHabla.objetivo}) → ${m.ratioHabla.ok ? 'OK' : 'FUERA DE RANGO'}`);
  if (m.preguntas) lineas.push(`- Preguntas: ${m.preguntas.abiertas} abiertas / ${m.preguntas.cerradas} cerradas (${m.preguntas.porcentajeAbiertas}% abiertas) → ${m.preguntas.ok ? 'OK' : 'FUERA DE RANGO'}${m.preguntas.ejemplosCerradas?.length ? `. Cerradas de ejemplo: ${m.preguntas.ejemplosCerradas.join(' / ')}` : ''}`);
  if (m.precioAntesDeDolor) lineas.push(`- Orden precio/dolor: ${m.precioAntesDeDolor.detalle} → ${m.precioAntesDeDolor.ok ? 'OK' : 'ERROR DE ORDEN'}`);
  if (m.palabrasReusadas) lineas.push(`- Palabras exactas del prospecto reusadas: ${m.palabrasReusadas.cantidad} (objetivo ${m.palabrasReusadas.objetivo})${m.palabrasReusadas.ejemplos?.length ? `. Ejemplos: ${m.palabrasReusadas.ejemplos.join(', ')}` : ''}`);
  if (m.silencios && m.silencios.cantidad != null) lineas.push(`- Silencios sostenidos: ${m.silencios.cantidad} (${m.silencios.fuente})`);
  return lineas.join('\n');
};

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "NVIDIA_API_KEY no configurada." }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { uid, transcript, principios, metricas, perfil, erroresEnVivo } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (!Array.isArray(transcript) || !transcript.length || !Array.isArray(principios)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "transcript y principios son requeridos." }) };
  }

  try {
    await getUserData(uid);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) };
  }

  const system = `Sos un auditor de llamadas de venta high ticket que entrena a un closer principiante. Tu trabajo NO es motivar: es señalar con precisión qué falló y por qué, anclando cada error a un principio del método.

PRINCIPIOS DISPONIBLES (usá el id EXACTO en principioId):
${principios.map(p => `- ${p.id} — ${p.nombre}: ${p.resumen}${p.errorTipico ? ` (error típico: ${p.errorTipico})` : ''}`).join('\n')}

REGLAS
- Las métricas que te paso ya están calculadas y son correctas. NO las recalcules ni las contradigas: interpretalas.
- Máximo 3 errores, ordenados por gravedad. Si la llamada estuvo bien, devolvé menos (o ninguno). No inventes errores para llenar.
- Cada error DEBE tener un principioId de la lista. Si un error no encaja en ningún principio, no lo reportes.
- "comoRehacerlo" tiene que ser una frase que el closer pueda DECIR, no un consejo abstracto.
- "focoProximo" es UNA sola cosa a practicar en la próxima llamada. Una. La más rentable.
- Español rioplatense (voseo), directo, sin relleno motivacional.

Respondé SOLO JSON:
{"resumen":"2-3 frases sobre cómo fue la llamada","loQueHizoBien":["..."],"errores":[{"principioId":"id","que":"qué hizo mal","comoRehacerlo":"qué decir en su lugar","gravedad":1-3}],"focoProximo":"una sola cosa","puntaje":1-10}`;

  const dialogo = transcript
    .map(m => `${m.role === 'closer' ? 'CLOSER' : 'PROSPECTO'}: ${String(m.content || '').slice(0, 800)}`)
    .join('\n');

  const userMsg = `PERFIL DEL PROSPECTO: ${perfil?.nombre || '?'} (${perfil?.arquetipo || '?'}). Objeción real oculta: ${perfil?.objecionOculta || '?'}

MÉTRICAS DE LA LLAMADA (ya calculadas, son hechos):
${resumenMetricas(metricas)}
${erroresEnVivo?.length ? `\nERRORES YA DETECTADOS EN VIVO (rapid-cycle) — tenelos en cuenta, no los repitas idénticos:\n${erroresEnVivo.map(e => `- ${e.que}`).join('\n')}` : ''}

TRANSCRIPT:
${dialogo.slice(0, 12000)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  const call = async (model) => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!res.ok) { const e = new Error(`upstream_${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('empty_response');
    return JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
  };

  try {
    let out;
    try {
      out = await call(process.env.FEEDBACK_MODEL || DEFAULT_MODEL);
    } catch (e) {
      if (e.status === 503 || e.status === 429) out = await call(FALLBACK_MODEL);
      else throw e;
    }

    // El 8B a veces manda un string donde el contrato pide un array. En vez de
    // descartarlo (perdiendo feedback real), lo envolvemos.
    const comoLista = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v] : [])
      .filter(x => typeof x === 'string' && x.trim());

    // Blindaje: solo dejamos pasar errores con un principioId que exista de verdad.
    const idsValidos = new Set(principios.map(p => p.id));
    const errores = (Array.isArray(out.errores) ? out.errores : [])
      .filter(e => e && idsValidos.has(e.principioId))
      .slice(0, 3)
      .map(e => ({
        principioId: e.principioId,
        que: String(e.que || '').slice(0, 300),
        comoRehacerlo: String(e.comoRehacerlo || '').slice(0, 300),
        gravedad: Math.min(3, Math.max(1, Number(e.gravedad) || 1)),
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        resumen: String(out.resumen || '').slice(0, 800),
        loQueHizoBien: comoLista(out.loQueHizoBien).slice(0, 4).map(s => String(s).slice(0, 200)),
        errores,
        focoProximo: String(out.focoProximo || '').slice(0, 300),
        puntaje: Math.min(10, Math.max(1, Number(out.puntaje) || 5)),
      })
    };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return { statusCode: isTimeout ? 504 : 502, headers, body: JSON.stringify({ error: isTimeout ? "timeout_upstream" : "No se pudo auditar la sesión." }) };
  } finally {
    clearTimeout(timer);
  }
};
