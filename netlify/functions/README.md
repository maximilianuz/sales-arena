# Netlify Functions (stubs)

This folder contains lightweight stub implementations for the serverless endpoints referenced by netlify.toml. They return simple JSON responses so the frontend can run without 404s while you implement production logic.

How to use

- Local development (recommended):
  1. Install netlify-cli: `npm install`
  2. Run `npm run dev:functions` to start the Netlify dev environment which will serve functions and the frontend together.

- Production: implement your real handlers in these files and deploy. Keep secrets in Netlify environment variables.
