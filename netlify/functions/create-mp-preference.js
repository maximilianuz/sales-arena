const PLANS = {
  closer_monthly:  { label: 'Closer — Monthly',  price: 19,  currency: 'USD', days: 30 },
  closer_yearly:   { label: 'Closer — Annual',   price: 149, currency: 'USD', days: 365 },
  trainer_monthly: { label: 'Trainer — Monthly', price: 97,  currency: 'USD', days: 30 },
  trainer_yearly:  { label: 'Trainer — Annual',  price: 797, currency: 'USD', days: 365 }
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
  const plan = PLANS[planId];
  if (!plan || !uid || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "planId, uid y email son requeridos." }) };
  }

  const appUrl = process.env.APP_URL || "https://sales-arena.netlify.app";

  const preference = {
    items: [{
      title: `Sales Arena — ${plan.label}`,
      quantity: 1,
      unit_price: plan.price,
      currency_id: plan.currency
    }],
    payer: { email },
    external_reference: JSON.stringify({ uid, planId, days: plan.days }),
    back_urls: {
      success: `${appUrl}/?payment=success`,
      failure: `${appUrl}/?payment=failure`,
      pending: `${appUrl}/?payment=pending`
    },
    auto_return: "approved",
    notification_url: `${appUrl}/.netlify/functions/webhook-mp`
  };

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preference)
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.message || "Error en MercadoPago" }) };
    return { statusCode: 200, headers, body: JSON.stringify({ checkoutUrl: data.init_point }) };
  } catch (err) {
    console.error("create-mp-preference error:", err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Error conectando con MercadoPago." }) };
  }
};
