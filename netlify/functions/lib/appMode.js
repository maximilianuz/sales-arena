// Espejo SERVIDOR del flag de src/config/appMode.js — mantener ambos en sincronía.
//
// GROUP_ONLY_MODE = true → la app corre 100% gratis y solo con la sección grupal:
//   • generate.js NO aplica el límite de sesiones del plan free (uso ilimitado)
//   • analyze-session.js NO exige plan pago para analizar/guardar historial
//
// Para volver al modelo de planes pagos, poner false acá Y en src/config/appMode.js.
export const GROUP_ONLY_MODE = false;
