import { getUserData, isSoloAuthorized } from './lib/firebaseAdmin.js';

// Modo Feynman del módulo Training: compara la explicación escrita por el
// usuario contra la explicación de referencia de un principio y devuelve qué
// puntos clave cubrió, cuáles le faltaron y qué dijo mal. Es una comparación
// corta y frecuente (una por carta de principio) → modelo económico (Llama 3.1 8B).
// Usa Nvidia API en lugar de Anthropic.

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

// NVIDIA no tiene structured outputs por json_schema como Anthropic: solo
// response_format json_object. El contrato de la respuesta va en el prompt y se
// valida en el cliente de esta función (abajo), porque StudySession espera estas
// claves exactas para pintar ✓/✗/⚠ y sugerir el rating.

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

  const { uid, explicacion, principio } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof explicacion !== 'string' || !explicacion.trim() || !principio?.explicacionReferencia || !Array.isArray(principio?.puntosClave)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "explicacion y principio {explicacionReferencia, puntosClave} son requeridos." }) };
  }

  // Igual que roleplay-turn: usuario autenticado y registrado, sin exigir plan.
  try {
    await getUserData(uid);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) };
  }

  // El candado real de tokens. `getUserData` solo confirmaba que el usuario
  // EXISTE, así que cualquier cuenta logueada podía consumir la API de NVIDIA
  // por acá. El Entrenamiento Closer va por la misma whitelist que la práctica
  // solo: una sola aprobación del admin habilita las dos, y así no hay que
  // validar a la misma persona dos veces.
  try {
    if (!(await isSoloAuthorized(uid))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Tu cuenta todavía no tiene acceso al Entrenamiento Closer." }) };
    }
  } catch {
    // Ante un fallo de verificación, se niega: proteger los tokens es lo que
    // este chequeo viene a hacer.
    return { statusCode: 403, headers, body: JSON.stringify({ error: "No se pudo verificar el acceso." }) };
  }

  const system = `Sos un evaluador de comprensión para un closer de ventas high ticket en entrenamiento (método Feynman: si no lo podés explicar simple, no lo entendiste).

Recibís un PRINCIPIO con su explicación de referencia y sus puntos clave, y la EXPLICACIÓN que escribió el estudiante con sus palabras.

Evaluá COMPRENSIÓN, no redacción ni parecido textual: si el estudiante expresa la misma idea con otras palabras o ejemplos propios, el punto está cubierto. Un punto está faltante si la idea no aparece o quedó tan vaga que no demuestra entenderla. Sé exigente pero justo: esto entrena para llamadas reales donde recitar no sirve.

En "cubiertos" y "faltantes" usá el texto EXACTO de cada punto clave (para que el sistema los marque). Cada punto clave va en una sola de las dos listas.

Respondé SOLO con este JSON, sin texto alrededor:
{"cubiertos":["punto clave textual que SÍ cubrió"],"faltantes":["punto clave textual que faltó"],"imprecisiones":["afirmación incorrecta del estudiante + corrección en una frase"],"comentario":"feedback breve de 2-3 frases, directo, en voseo","ratingSugerido":1-4}

ratingSugerido: 1=no entendió el principio, 2=idea general pero faltó la mitad, 3=cubrió casi todo, 4=completo y con palabras propias.`;

  const userMsg = `PRINCIPIO: ${principio.nombre || ''}

EXPLICACIÓN DE REFERENCIA:
${principio.explicacionReferencia}

PUNTOS CLAVE:
${principio.puntosClave.map((p, i) => `${i + 1}. ${p}`).join('\n')}

EXPLICACIÓN DEL ESTUDIANTE:
${explicacion.trim().slice(0, 4000)}`;

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.FEYNMAN_MODEL || DEFAULT_MODEL,
        max_tokens: 1000,
        temperature: 0.5,
        top_p: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Nvidia API error:", resp.status, errText.slice(0, 500));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Error del modelo evaluador." }) };
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "";

    if (!text) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Respuesta vacía del modelo." }) };
    }

    // Parsea JSON de la respuesta (Nvidia no tiene structured outputs nativo)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from response:", text.slice(0, 200));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "No se pudo parsear la evaluación." }) };
    }

    const raw = JSON.parse(jsonMatch[0]);
    // Blindaje del shape: sin json_schema el modelo puede omitir claves o cambiar
    // tipos, y el cliente pinta listas directamente. Normalizamos acá.
    // Si manda un string donde el contrato pide array, lo envolvemos en vez de
    // perder el contenido.
    const lista = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v] : [])
      .filter(x => typeof x === 'string' && x.trim()).slice(0, 12);
    const rating = Math.min(4, Math.max(1, Math.round(Number(raw.ratingSugerido)) || 2));
    const result = {
      cubiertos: lista(raw.cubiertos),
      faltantes: lista(raw.faltantes),
      imprecisiones: lista(raw.imprecisiones),
      comentario: typeof raw.comentario === 'string' ? raw.comentario.slice(0, 800) : '',
      ratingSugerido: rating,
    };
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (e) {
    console.error("training-feynman error:", e?.message || e);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "No se pudo evaluar la explicación. Probá de nuevo." }) };
  }
};
