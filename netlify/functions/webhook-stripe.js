import { activateSubscription } from './lib/firebaseAdmin.js';
import crypto from 'crypto';

function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const signed = `${parts.t}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 || ''));
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const sig = event.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) return { statusCode: 400, body: "Missing signature" };

  try {
    if (!verifyStripeSignature(event.body, sig, secret)) {
      return { statusCode: 400, body: "Invalid signature" };
    }
  } catch {
    return { statusCode: 400, body: "Signature verification failed" };
  }

  let stripeEvent;
  try { stripeEvent = JSON.parse(event.body); } catch { return { statusCode: 400, body: "Invalid JSON" }; }

  if (stripeEvent.type !== "checkout.session.completed") {
    return { statusCode: 200, body: "ignored" };
  }

  const session = stripeEvent.data.object;
  if (session.payment_status !== "paid") return { statusCode: 200, body: "not paid" };

  const { uid, planId, days } = session.metadata || {};
  if (!uid || !planId || !days) return { statusCode: 400, body: "Missing metadata" };

  try {
    await activateSubscription(uid, planId, "stripe", Number(days));
    console.log(`Suscripción activada: ${uid} → ${planId} (Stripe)`);
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("webhook-stripe error:", err);
    return { statusCode: 500, body: "internal error" };
  }
};
