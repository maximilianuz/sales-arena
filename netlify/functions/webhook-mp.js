import { activateSubscription } from './lib/firebaseAdmin.js';

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Invalid JSON" }; }

  // MercadoPago envía notificaciones de tipo "payment"
  if (body.type !== "payment" || !body.data?.id) {
    return { statusCode: 200, body: "ignored" };
  }

  try {
    // Obtenemos el detalle del pago para verificar que sea aprobado
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
      headers: { "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    const payment = await res.json();

    if (payment.status !== "approved") return { statusCode: 200, body: "not approved" };

    const ref = JSON.parse(payment.external_reference || "{}");
    const { uid, planId, days } = ref;
    if (!uid || !planId || !days) return { statusCode: 400, body: "Missing external_reference fields" };

    await activateSubscription(uid, planId, "mercadopago", Number(days));
    console.log(`Suscripción activada: ${uid} → ${planId} (MP)`);
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("webhook-mp error:", err);
    return { statusCode: 500, body: "internal error" };
  }
};
