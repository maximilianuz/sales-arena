# 💼 Sales Arena: Simulador High Ticket Closer

Una aplicación interactiva para hacer Role-Plays de ventas B2B y High Ticket. Diseñada con una arquitectura de "Venta Consultiva Avanzada", permite simular escenarios reales, aislar objeciones y evaluar el desempeño de los "Closers" en vivo.

## ✨ Características Principales

- **Pipeline Personalizable:** Define tus propias etapas del embudo de ventas (Rapport, Calificación, Presentación, Cierre) con objetivos claros y tiempos estimados.
- **Generador de Buyer Persona (con IA):** Genera escenarios aleatorios con dolores, urgencias y objeciones ocultas basados en la industria que elijas.
- **Temporizador Interactivo:** Incluye una guía de tiempos sugerida basada en las etapas de tu pipeline.
- **Paneles de Observación:** Asigna roles (Closer, Lead, Observadores), lleva un "Debrief" en vivo y habilita votaciones grupales para dar feedback.
- **Motor de IA Flexible:** Puedes conectar la aplicación con el proveedor de IA de tu preferencia (Nvidia NIM, OpenAI, OpenRouter, o modelos locales con Ollama). Toda la configuración se guarda de forma segura y local en tu navegador.

---

## 🚀 Instalación y Uso Local

Para correr este proyecto en tu computadora, necesitas tener instalado [Node.js](https://nodejs.org/).

1. **Clona el repositorio** o descarga los archivos.
2. Abre una terminal en la carpeta del proyecto y ejecuta:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
4. Abre tu navegador en la URL que aparece en la terminal (por defecto `http://localhost:5173`).

---

## 🧠 Configuración del Motor de Inteligencia Artificial

Sales Arena utiliza IA para generar perfiles detallados de "Leads" o prospectos. Para proteger la privacidad, **la aplicación no tiene claves maestras codificadas**; cada usuario debe colocar su propia API Key desde la interfaz (botón ⚙️ Ajustes).

La aplicación es 100% compatible con el formato estándar de OpenAI, lo que te permite conectarte a casi cualquier proveedor:

### Opción 1: NVIDIA NIM (Recomendada / Por defecto)
Los modelos gratuitos y ultra rápidos de Nvidia (como Llama 3.1 70B).
- **API Base URL:** `/api/nvidia/v1/chat/completions` (Utilizamos un proxy local incluido en Vite para evitar bloqueos de CORS).
- **Modelo:** `meta/llama-3.1-70b-instruct`
- **API Key:** Consigue una clave gratuita en [build.nvidia.com](https://build.nvidia.com/).

### Opción 2: OpenAI (ChatGPT)
- **API Base URL:** `https://api.openai.com/v1/chat/completions`
- **Modelo:** `gpt-4o-mini` o `gpt-3.5-turbo`
- **API Key:** Tu clave privada de OpenAI.

### Opción 3: OpenRouter
Ideal si quieres usar modelos como Claude, Llama o Gemini con una sola cuenta.
- **API Base URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Modelo:** `anthropic/claude-3.5-sonnet` (o el que prefieras del catálogo).
- **API Key:** Tu token de OpenRouter.

### Opción 4: Ollama (100% Local y Privado)
Si tienes [Ollama](https://ollama.com/) corriendo en tu computadora, puedes usarlo sin necesidad de internet ni claves.
- **Importante:** Debes habilitar CORS en Ollama. Antes de iniciarlo, abre tu terminal y ejecuta `set OLLAMA_ORIGINS="*"`, y luego corre `ollama serve`.
- **API Base URL:** `http://localhost:11434/v1/chat/completions`
- **Modelo:** `llama3.1`, `phi3`, etc. (Asegúrate de haberlo descargado con `ollama run <modelo>`).
- **API Key:** (Puedes dejar el campo vacío o escribir cualquier cosa como "local").

---

## 🛠 Tecnologías Utilizadas
- **React 18** (Vite)
- **CSS Vanilla** (Estilos "Glassmorphism")
- **Lucide React** (Iconografía)
- Estado persistente local (sin base de datos requerida).

Hecho con ❤️ por [Maximiliano C.](https://maximilianoc.netlify.app/)
