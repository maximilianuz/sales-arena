const PLANS = {
  closer_monthly:  { label: 'Sales Arena Closer — Monthly',  amount: '19',  days: 30 },
  closer_yearly:   { label: 'Sales Arena Closer — Annual',   amount: '149', days: 365 },
  trainer_monthly: { label: 'Sales Arena Trainer — Monthly', amount: '97',  days: 30 },
  trainer_yearly:  { label: 'Sales Arena Trainer — Annual',  amount: '797', days: 365 }
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

  try {
    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        price_amount: plan.amount,
        price_currency: "usd",
        pay_currency: "usdtbsc", // USDT en BSC por defecto; NOWPayments permite elegir en el checkout
        order_id: `${uid}_${planId}_${Date.now()}`,
        order_description: plan.label,
        ipn_callback_url: `${appUrl}/.netlify/functions/webhook-nowpayments`,
        success_url: `${appUrl}/?payment=success`,
        cancel_url: `${appUrl}/?payment=cancelled`,
        customer_email: email,
        // Metadatos para recuperar en el webhook
        is_fixed_rate: true,
        is_fee_paid_by_user: false
      })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.message || "Error en NOWPayments" }) };

    // Guardamos uid y planId en Firebase para recuperarlos en el webhook por order_id
    return { statusCode: 200, headers, body: JSON.stringify({ checkoutUrl: data.invoice_url, orderId: data.id }) };
  } catch (err) {
    console.error("create-crypto-charge error:", err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Error conectando con NOWPayments." }) };
  }
};
