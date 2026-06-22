# Sales Arena AI 🚀

[🇺🇸 Read in English](#english) | [🇪🇸 Leer en Español](#español)

---

<a name="english"></a>
## 🇺🇸 English

**Sales Arena Sandbox AI** is a real-time multiplayer web application designed to simulate High Ticket Sales scenarios. It leverages advanced AI models (NVIDIA NIM, OpenAI, Groq, OpenRouter, or local Ollama) to generate dynamic "Buyer Personas" and objections on the fly. 

Built with **React, Vite, and Firebase**, it allows multiple participants to join the same room with different roles:
- **Closer (Salesperson):** Tries to close the deal with a minimalist UI.
- **Lead (Client):** Plays the role of the buyer, receiving dynamic AI instructions on what objections to raise.
- **Observer:** Evaluates the Closer's performance using a real-time voting system.
- **Facilitator:** Controls the simulation, changes pipeline stages, manages the AI generation, and triggers "Surprise Events" to test the Closer's adaptability.

### Key Features
- **Real-Time Multiplayer:** Synchronized state across all clients using Firebase Realtime Database.
- **Dynamic AI Generation:** Generates comprehensive Buyer Personas including demographics, current situation, psychological profiles, and hidden objections.
- **Role-Based UI:** The interface adapts seamlessly hiding or showing sensitive information depending on the user's selected role.
- **Synchronized Timer:** A global server-timestamp-based countdown timer.
- **Collaborative Debriefing:** A shared workspace for Observers and Facilitators to type evaluation notes that sync in real time.
- **Surprise Events:** Facilitators can throw random, unexpected curveballs to the Closer (e.g., "Budget frozen!") that pop up instantly on everyone's screen.
- **BYOK (Bring Your Own Key):** Connect directly to your preferred AI provider without vendor lock-in.

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

---

<a name="español"></a>
## 🇪🇸 Español

**Sales Arena Sandbox AI** es una aplicación web multijugador en tiempo real diseñada para simular escenarios de Ventas High Ticket. Utiliza modelos de IA avanzados (NVIDIA NIM, OpenAI, Groq, OpenRouter o Ollama local) para generar "Buyer Personas" y objeciones dinámicas sobre la marcha.

Construida con **React, Vite y Firebase**, permite que múltiples participantes se unan a la misma sala con diferentes roles:
- **Closer (Vendedor):** Intenta cerrar el trato con una interfaz minimalista.
- **Lead (Cliente):** Interpreta al comprador, recibiendo instrucciones dinámicas de la IA sobre qué objeciones plantear.
- **Observador:** Evalúa el desempeño del Closer mediante un sistema de votación en tiempo real.
- **Facilitador:** Controla la simulación, cambia las etapas del embudo, administra la generación de IA y desencadena "Eventos Sorpresa" para probar la adaptabilidad del Closer.

### Características Principales
- **Multijugador en Tiempo Real:** Estado sincronizado en todos los clientes usando Firebase Realtime Database.
- **Generación Dinámica por IA:** Genera perfiles completos de Buyer Persona incluyendo demografía, situación actual, perfil psicológico y objeciones ocultas.
- **Interfaz Basada en Roles:** La interfaz se adapta dinámicamente ocultando o mostrando información sensible dependiendo del rol seleccionado por el usuario.
- **Cronómetro Sincronizado:** Un temporizador global basado en la marca de tiempo del servidor.
- **Debriefing Colaborativo:** Un espacio de trabajo compartido para que Observadores y Facilitadores escriban notas de evaluación que se sincronizan en tiempo real.
- **Eventos Sorpresa:** Los Facilitadores pueden lanzar eventos aleatorios e inesperados al Closer (ej. "¡Presupuesto congelado!") que aparecen instantáneamente en la pantalla de todos.
- **BYOK (Trae tu propia clave):** Conéctate directamente a tu proveedor de IA preferido.

### Desarrollo Local
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```
