import { getUserData, isSoloAuthorized } from './lib/firebaseAdmin.js';

// Evaluador de las respuestas de estudio en las cartas CLÁSICAS.
//
// Hasta acá la carta clásica era: leés el frente, lo decís en voz alta, mirás el
// dorso y te autocalificás. El problema es que "decilo en voz alta" no deja
// rastro: nadie te corrige lo que dijiste mal, y la autocalificación con el
// dorso a la vista tiende a ser generosa — mirar la respuesta y pensar "sí, más
// o menos eso dije" es reconocimiento, no recuperación.
//
// Acá se escribe la respuesta ANTES de ver el dorso y el modelo la compara
// contra la respuesta de referencia. La devolución es sobre lo que ESCRIBISTE:
// qué cubriste, qué te faltó, y qué dijiste que está mal.
//
// Devuelve exactamente la misma forma que training-feynman (cubiertos,
// faltantes, imprecisiones, comentario, ratingSugerido) a propósito: la sesión
// de estudio ya sabe pintar eso, así que no hace falta una segunda vista ni un
// segundo formato que mantener.
//
// Modelo 8B como el resto del módulo: el 70B tarda 9-17 s y Netlify corta las
// functions a 10.

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

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

  const { uid, respuesta, carta, principio } = body;
  if (!uid) return { statusCode: 401, headers, body: JSON.stringify({ error: "Se requiere autenticación." }) };
  if (typeof respuesta !== 'string' || !respuesta.trim() || !carta?.frente || !carta?.dorso) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "respuesta y carta {frente, dorso} son requeridos." }) };
  }

  try {
    await getUserData(uid);
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Usuario no encontrado." }) };
  }

  // Mismo candado que el resto del entrenamiento individual.
  try {
    if (!(await isSoloAuthorized(uid))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Tu cuenta no tiene acceso a la práctica individual." }) };
    }
  } catch {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "No se pudo verificar el acceso." }) };
  }

  const system = `Sos el entrenador de un closer de ventas high ticket. Recibís una PREGUNTA de práctica, su RESPUESTA DE REFERENCIA y la RESPUESTA QUE ESCRIBIÓ el estudiante de memoria, sin ver la referencia.

Tu trabajo es corregir LO QUE ESCRIBIÓ ÉL, no explicar el tema de nuevo. La devolución tiene que servirle para la próxima llamada real, así que:

· Evaluá el FONDO, no el fraseo. Si dice lo mismo con otras palabras o con un ejemplo propio, está cubierto. Salvo que la referencia marque que algo va literal (una transición, una frase exacta): ahí sí importa el fraseo y hay que decírselo.
· En "faltantes" nombrá la idea concreta que no apareció, no "faltó profundidad".
· En "imprecisiones" va lo que dijo MAL, con la corrección en una frase. Si no dijo nada incorrecto, dejalo vacío — no inventes errores para parecer exigente.
· El comentario es lo más importante: dos o tres frases sobre SU respuesta, en voseo, directo. Si se apoyó en algo que le sale bien, decíselo; si repite un vicio (adornar el precio, adelantarse al pitch, hablar de más), marcáselo por nombre.

Respondé SOLO con este JSON, sin texto alrededor:
{"cubiertos":["idea de la referencia que SÍ dijo"],"faltantes":["idea de la referencia que NO dijo"],"imprecisiones":["lo que dijo mal + corrección en una frase"],"comentario":"2-3 frases sobre su respuesta, en voseo","ratingSugerido":1-4}

ratingSugerido: 1=no le salió, 2=la idea general pero le faltó la mitad, 3=casi completa, 4=completa y con criterio propio.`;

  const partes = [
    `PREGUNTA:\n${String(carta.frente).slice(0, 1500)}`,
    `RESPUESTA DE REFERENCIA:\n${String(carta.dorso).slice(0, 2000)}`,
  ];
  if (carta.porQue) partes.push(`POR QUÉ FUNCIONA:\n${String(carta.porQue).slice(0, 1000)}`);
  if (principio?.nombre) {
    partes.push(`PRINCIPIO DETRÁS: ${principio.nombre}${principio.resumen ? ` — ${principio.resumen}` : ''}`);
  }
  partes.push(`RESPUESTA DEL ESTUDIANTE:\n${respuesta.trim().slice(0, 4000)}`);

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.FEYNMAN_MODEL || DEFAULT_MODEL,
        max_tokens: 900,
        temperature: 0.5,
        top_p: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: partes.join('\n\n') }
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
    if (!text) return { statusCode: 502, headers, body: JSON.stringify({ error: "Respuesta vacía del modelo." }) };

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from response:", text.slice(0, 200));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "No se pudo parsear la evaluación." }) };
    }

    // Mismo blindaje de shape que training-feynman: sin json_schema el modelo
    // puede omitir claves o mandar un string donde el contrato pide array, y el
    // cliente pinta las listas directamente.
    const raw = JSON.parse(jsonMatch[0]);
    const lista = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? [v] : [])
      .filter(x => typeof x === 'string' && x.trim()).slice(0, 12);
    const rating = Math.min(4, Math.max(1, Math.round(Number(raw.ratingSugerido)) || 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        cubiertos: lista(raw.cubiertos),
        faltantes: lista(raw.faltantes),
        imprecisiones: lista(raw.imprecisiones),
        comentario: typeof raw.comentario === 'string' ? raw.comentario.slice(0, 800) : '',
        ratingSugerido: rating,
      })
    };
  } catch (e) {
    console.error("[training-respuesta] error:", e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Error evaluando la respuesta." }) };
  }
};
