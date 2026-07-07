# ♞ Sales Arena AI ♞

[🇺🇸 Read in English](#english) | [🇪🇸 Leer en Español](#español)

---

<a name="english"></a>
## 🇺🇸 English

**Sales Arena AI** is a real-time multiplayer web application designed to simulate High Ticket Sales scenarios. It leverages advanced AI models (NVIDIA NIM, OpenAI, Groq, OpenRouter, or local Olla...) and is built with **React, Vite, and Firebase**.

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
