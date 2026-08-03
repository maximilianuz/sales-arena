// Espejo SERVIDOR de los flags de src/config/appMode.js — mantener en sincronía.
//
// GROUP_ONLY_MODE = true → la app corre 100% gratis y solo con la sección grupal:
//   • generate.js NO aplica el límite de sesiones del plan free (uso ilimitado)
//   • analyze-session.js NO exige plan pago para analizar/guardar historial
//
// Para volver al modelo de planes pagos, poner false acá Y en src/config/appMode.js.
export const GROUP_ONLY_MODE = false;

// FREE_ACCESS_MODE = true → toda la app es gratis (sin cobros), pero el trabajo
//   individual sigue visible. En el servidor se comporta igual que GROUP_ONLY_MODE
//   para lo que hace a suscripciones: no se exige plan pago ni se aplican límites
//   del plan free. Poner false para volver a cobrar por los planes Pro.
export const FREE_ACCESS_MODE = true;
