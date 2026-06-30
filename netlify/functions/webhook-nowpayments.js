import { activateSubscription } from './lib/firebaseAdmin.js';
import crypto from 'crypto';

function verifyNowpaymentsSignature(payload, sigHeader, secret) {
  const sorted = JSON.parse(payload);
  const sortedStr = JSON.stringify(sorted, Object.keys(sorted).sort());
  const expected = crypto.createHmac('sha512', secret).update(sortedStr).digest('hex');
  return expected === sigHeader;
}

const PLAN_DAYS = {
  closer_monthly: 30, closer_yearly: 365,
  trainer_monthly: 30, trainer_yearly: 365
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const sig = event.headers['x-nowpayments-sig'];
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (sig && secret && !verifyNowpaymentsSignature(event.body, sig, secret)) {
    return { statusCode: 400, body: "Invalid signature" };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Invalid JSON" }; }

  // Solo procesamos pagos confirmados o completados
  if (!["finished", "confirmed"].includes(body.payment_status)) {
    return { statusCode: 200, body: "ignored" };
  }

  // order_id tiene formato: {uid}_{planId}_{timestamp}
  const parts = (body.order_id || "").split("_");
  const uid = parts[0];
  const planId = parts.slice(1, -1).join("_"); // maneja guiones bajos en planId
  const days = PLAN_DAYS[planId];

  if (!uid || !planId || !days) return { statusCode: 400, body: "Missing order_id fields" };

  try {
    await activateSubscription(uid, planId, "nowpayments", days);
    console.log(`Suscripción activada: ${uid} → ${planId} (NOWPayments)`);
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("webhook-nowpayments error:", err);
    return { statusCode: 500, body: "internal error" };
  }
};
