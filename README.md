# VEXDYN FORGE

Browser IDE for VEXDYN — edit locally, deploy for real.

## v1.6 — Real project deployment

Static HTML/CSS/JS → VEXDYN deploy Worker → Cloudflare Pages → live `.pages.dev` URL.

### Frontend

```bash
npm install
cp .env.example .env   # set VITE_DEPLOY_API_URL
npm run dev
```

### Deployment backend (`deploy-api/`)

```bash
cd deploy-api
npx wrangler secret put CF_API_TOKEN    # Pages:Edit
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler deploy
```

Put the Worker URL in `VITE_DEPLOY_API_URL`.

**Cloudflare tokens never enter the browser.**

### Supported now

- Static HTML / CSS / JS projects with an HTML entry

### Not yet

- React / Vite build-then-deploy (architecture ready; runtime not connected)
- Custom `*.vexdyn.app` domains

### Flow

CREATE → EDIT → PREVIEW → DEPLOY → VALIDATE → PACKAGE → UPLOAD → LIVE
