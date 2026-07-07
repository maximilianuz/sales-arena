// Stripe prices deben crearse en el dashboard de Stripe y pegarse acá como env vars.
// STRIPE_PRICE_CLOSER_MONTHLY, STRIPE_PRICE_CLOSER_YEARLY, etc.
const PLAN_PRICE_ENV = {
  closer_monthly:  'STRIPE_PRICE_CLOSER_MONTHLY',
  closer_yearly:   'STRIPE_PRICE_CLOSER_YEARLY',
  trainer_monthly: 'STRIPE_PRICE_TRAINER_MONTHLY',
  trainer_yearly:  'STRIPE_PRICE_TRAINER_YEARLY'
};

const PLAN_DAYS = {
  closer_monthly: 30, closer_yearly: 365,
  trainer_monthly: 30, trainer_yearly: 365
};

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

  const { planId, uid, email } = body;
  const priceEnvKey = PLAN_PRICE_ENV[planId];
  if (!priceEnvKey || !uid || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "planId, uid y email son requeridos." }) };
  }

  const priceId = process.env[priceEnvKey];
  if (!priceId) return { statusCode: 500, headers, body: JSON.stringify({ error: `Variable ${priceEnvKey} no configurada.` }) };

  const appUrl = process.env.APP_URL || "https://sales-arena.netlify.app";
  const days = PLAN_DAYS[planId];

  const params = new URLSearchParams({
    "payment_method_types[]": "card",
    "mode": "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "customer_email": email,
    "metadata[uid]": uid,
    "metadata[planId]": planId,
    "metadata[days]": String(days),
    "success_url": `${appUrl}/?payment=success`,
    "cancel_url": `${appUrl}/?payment=cancelled`
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.error?.message || "Error en Stripe" }) };
    return { statusCode: 200, headers, body: JSON.stringify({ checkoutUrl: data.url }) };
  } catch (err) {
    console.error("create-stripe-session error:", err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Error conectando con Stripe." }) };
  }
};
