# ♞ Sales Arena AI ♞

[🇺🇸 Read in English](#english) | [🇪🇸 Leer en Español](#español)

---

<a name="english"></a>
## 🇺🇸 English

**Sales Arena AI** is a real-time multiplayer web application designed to simulate High Ticket Sales scenarios. It leverages advanced AI models (NVIDIA NIM, OpenAI, Groq, OpenRouter, Flowise, or local Ollama...) and is built with **React, Vite, and Firebase**.

### Supported AI Providers

- **Cerebras** - Ultra-fast inference
- **Gemini** - Google's generative model
- **Groq** - High-throughput LLM
- **OpenRouter** - Multi-model aggregator
- **GitHub Models** - Microsoft's inference
- **Flowise** - Self-hosted or cloud AI workflows
- **Custom OpenAI-compatible APIs** (LLM2, LLM3, LLM4 slots)

### Flowise Integration

Sales Arena supports **Flowise** as an LLM provider. Flowise allows you to build custom AI workflows visually.

#### Setup Flowise

1. **Deploy Flowise** (choose one):
   - **Self-hosted**: Follow [Flowise docs](https://docs.flowiseai.com/) to deploy on your infrastructure
   - **Cloud**: Use [Flowise Cloud](https://flowiseai.com/)

2. **Get Flowise API Credentials**:
   - Flowise URL: `https://flowise.your-domain.com` (self-hosted) or `https://cloud.flowise.ai` (cloud)
   - API Key: Generate from Flowise dashboard (Settings → API Keys)
   - Chatflow ID: From your chatflow's ID field in Flowise

3. **Configure Sales Arena**:
   - Add to `.env.local`:
     ```
     FLOWISE_URL=https://flowise.your-domain.com
     FLOWISE_API_KEY=your_api_key
     FLOWISE_CHATFLOW_ID=your_chatflow_id
     ```
   - Flowise will automatically be added to the provider chain and used when available

#### BYOK (Bring Your Own Key)

Users can also provide their own Flowise credentials via the Settings panel:
1. Open Settings in the app
2. Enter Flowise endpoint and API key
3. The app will call your Flowise instance directly

Local development

1. Copy `.env.example` to `.env.local` and fill in your Firebase / provider credentials (do not commit secrets).
2. Install dependencies: `npm install`
3. Start the dev server and Netlify functions (local emulation):

   npm run dev
   npm run dev:functions

Notes about changes made in the `fix/stub-functions-and-sharp` branch

- `sharp` was moved from the top-level `package.json` into `netlify/functions/package.json` so native binaries are installed only for server-side functions. This avoids bundling native modules into the frontend build and prevents install/build failures.
- Lightweight stub Netlify functions were added under `netlify/functions/` so the frontend can call `/api/*` endpoints without receiving 404s during development. Implement production handlers in those files or replace them with your own.
- `.env.example` added with common VITE_ variables for local configuration.
- `netlify-cli` was added to devDependencies and a `dev:functions` script was added to help run Netlify dev locally.

---

<a name="español"></a>
## 🇪🇸 Español

**Sales Arena AI** es una aplicación web multijugador en tiempo real diseñada para simular escenarios de Ventas High Ticket. Utiliza modelos de IA avanzados y está construida con **React, Vite y Firebase**.

### Proveedores de IA Soportados

- **Cerebras** - Inferencia ultra-rápida
- **Gemini** - Modelo generativo de Google
- **Groq** - LLM de alto rendimiento
- **OpenRouter** - Agregador multi-modelo
- **GitHub Models** - Inferencia de Microsoft
- **Flowise** - Flujos de trabajo IA auto-hospedados o en la nube
- **APIs compatibles con OpenAI** (ranuras LLM2, LLM3, LLM4)

### Integración con Flowise

Sales Arena soporta **Flowise** como proveedor de IA. Flowise te permite construir flujos de trabajo IA personalizados visualmente.

#### Configurar Flowise

1. **Desplegar Flowise** (elige uno):
   - **Auto-hospedado**: Sigue la [documentación de Flowise](https://docs.flowiseai.com/) para desplegar en tu infraestructura
   - **Cloud**: Usa [Flowise Cloud](https://flowiseai.com/)

2. **Obtener Credenciales de Flowise**:
   - URL de Flowise: `https://flowise.tu-dominio.com` (auto-hospedado) o `https://cloud.flowise.ai` (cloud)
   - API Key: Genera desde el panel de Flowise (Settings → API Keys)
   - Chatflow ID: Del campo ID de tu chatflow en Flowise

3. **Configurar Sales Arena**:
   - Agrega a `.env.local`:
     ```
     FLOWISE_URL=https://flowise.tu-dominio.com
     FLOWISE_API_KEY=tu_api_key
     FLOWISE_CHATFLOW_ID=tu_chatflow_id
     ```
   - Flowise se agregará automáticamente a la cadena de proveedores

#### BYOK (Trae Tu Propia Clave)

Los usuarios también pueden proporcionar sus propias credenciales de Flowise via el panel de Configuración:
1. Abre Configuración en la aplicación
2. Ingresa el endpoint y API key de Flowise
3. La aplicación llamará directamente a tu instancia de Flowise

Desarrollo local

1. Copiá `.env.example` a `.env.local` y completá las credenciales de Firebase / proveedores (no comites secretos).
2. Instalá dependencias: `npm install`
3. Iniciá el servidor de desarrollo y las funciones Netlify (emulación local):

   npm run dev
   npm run dev:functions

Cambios realizados en la rama `fix/stub-functions-and-sharp`

- `sharp` fue movido desde `package.json` del frontend a `netlify/functions/package.json` para que los binarios nativos se instalen solo en el código del servidor y no rompan la compilación del cliente.
- Se agregaron funciones Netlify stub en `netlify/functions/` para que el frontend deje de recibir 404s en `/api/*` durante el desarrollo. Implementá la lógica de producción en esos archivos.
- Se agregó `.env.example` con variables comunes VITE_.
- `netlify-cli` se agregó a devDependencies y se añadió el script `dev:functions` para facilitar la emulación local de funciones.
