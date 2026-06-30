// Proxy server-side hacia el proveedor de IA. La API key vive solo acá (env vars),
// nunca se envía al cliente.

const DEFAULT_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI_API_KEY no configurada en el servidor." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Body inválido, se esperaba JSON." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { prompt, temperature, max_tokens } = body || {};
  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Falta 'prompt' (string) en el body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiUrl = process.env.AI_API_URL || DEFAULT_API_URL;
  const model = process.env.AI_DEFAULT_MODEL || DEFAULT_MODEL;

  try {
    const upstreamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: typeof temperature === "number" ? temperature : 0.7,
        max_tokens: typeof max_tokens === "number" ? max_tokens : 1500,
        response_format: { type: "json_object" }
      })
    });

    const data = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      const message = data?.error?.message || data?.message || "Error en la API de IA.";
      return new Response(JSON.stringify({ error: message }), {
        status: upstreamResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("generate.js proxy error:", error);
    return new Response(JSON.stringify({ error: "Error al contactar al proveedor de IA." }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/generate"
};
