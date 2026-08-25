// Modo de operación de la app.
//
// GROUP_ONLY_MODE = true  → La app funciona 100% GRATIS y únicamente con la
//   sección de EQUIPOS (grupal). Queda bloqueado/opacado:
//     • El "Trabajo Individual" (práctica solo, herramientas, historial, etc.)
//     • Los cobros / pantalla de planes de pago (todos entran gratis al registrarse)
//
//   Para REACTIVAR todo (trabajo individual + planes de pago) poné esto en false.
//   Ningún código de pagos ni de individual se borró: solo se saltea con este flag.
export const GROUP_ONLY_MODE = false;

// FREE_ACCESS_MODE = true → Toda la app es GRATIS, sin gate de suscripción ni
//   pantalla de planes: todos entran con acceso completo y las funciones "Pro"
//   quedan desbloqueadas. A diferencia de GROUP_ONLY_MODE, el TRABAJO INDIVIDUAL
//   sigue visible y operativo (no se oculta nada).
//
//   Poné esto en false para volver a cobrar por los planes Pro (el gate de
//   suscripción y la pantalla de pagos se reactivan). Ningún código de pagos se
//   borró: solo se saltea con este flag.
export const FREE_ACCESS_MODE = false;

// TRAINING_MODULE_ENABLED = false → Oculta el botón "Entrenamiento Closer" del
//   Lobby. El módulo Training (currículum, sesiones de adquisición, roleplay
//   de práctica) llama a las MISMAS API keys de NVIDIA/Groq que usa la
//   generación de escenarios de Sales Arena (netlify/functions/lib/llm.js) —
//   con ambos activos compiten por la misma cuota compartida y gatillan el
//   cartel de "servicio de IA saturado" más seguido.
//
//   Mientras no se use el módulo Training, se apaga acá para dejar toda la
//   cuota disponible para Práctica Solo / generación de escenarios. Nada del
//   código de Training se borró: poné esto en true para reactivarlo (o
//   conseguí API keys separadas para Training y reactivalo sin este problema).
export const TRAINING_MODULE_ENABLED = false;
