# Deploying To Railway

This app is a static Vite build with client-side Gemini calls. Railway only needs to build the assets and serve the generated `dist/` output through Vite preview or another static file server.

## Environment

- `PORT`: Railway runtime port.
- `VITE_APP_MODE=production`
- User Gemini API keys are entered in-app and stored in IndexedDB. No server proxy or secret injection is required for runtime requests.

## Build And Start

1. `npm install`
2. `npm run build`
3. `npm run preview -- --host 0.0.0.0 --port ${PORT:-4173}`

## Review Checklist

- `railway.json` points Railway at `npm install && npm run build`.
- The deploy command serves the built app from the generated `dist/` output.
- No live deployment commands are required for verification in this repository.
- The app is frontend-only and safe for GitHub -> Railway handoff once repository variables are set.
